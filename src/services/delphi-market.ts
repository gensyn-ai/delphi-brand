import { createPublicClient, defineChain, http } from 'viem';

type SentimentPoint = { label: string; probability: number };

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm', т: 't', в: 'b', н: 'h',
  А: 'A', Е: 'E', О: 'O', Р: 'P', С: 'C', Х: 'X', У: 'Y', К: 'K', М: 'M', Т: 'T', В: 'B', Н: 'H',
};

export interface DelphiMarketSearchResult {
  id: string;
  title: string;
  category: string;
  status: string;
}

export interface DelphiMarketOverlayData {
  id: string;
  title: string;
  url: string;
  category: string;
  status: string;
  sentiment: SentimentPoint[];
}

// Response shapes returned by the delphi-creator-api Worker.
// Narrowed to the fields the overlay reads — the worker also returns
// modelIdentifier, deadlines, etc., which we don't need here.
interface CreatorApiMarket {
  marketAddress: string;
  question: string | null;
  outcomes: string[] | null;
  status: 'open' | 'awaiting_settlement' | 'settled' | 'expired';
  category: string | null;
  flagged: boolean | null;
}
interface PaginatedResponse<T> { data: T[] }
interface ApiResponse<T> { data: T }

const DEFAULT_CREATOR_API_BASE_URL = 'https://delphi-creator-api.gensyn.workers.dev';
const MARKET_BASE_URL = 'https://app.delphi.fyi/markets';
const MAINNET_RPC_URL = 'https://gensyn-mainnet.g.alchemy.com/public';
const MAINNET_GATEWAY_ADDRESS = '0x4e4e85c52E0F414cc67eE88d0C649Ec81698d700' as const;
const SEARCH_PAGE_SIZE = 12;

const GENSYN_MAINNET = defineChain({
  id: 685689,
  name: 'Gensyn Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [MAINNET_RPC_URL] } },
});

const DYNAMIC_PARIMUTUEL_GATEWAY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'marketProxy', type: 'address' },
      { internalType: 'uint256[]', name: 'outcomeIndices', type: 'uint256[]' },
    ],
    name: 'spotImpliedProbabilities',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const searchCache = new Map<string, DelphiMarketSearchResult[]>();
const marketCache = new Map<string, DelphiMarketOverlayData>();
let chainReader: ReturnType<typeof createPublicClient> | null = null;

function getCreatorApiBaseUrl(): string {
  // Dev: route through the Vite proxy so the worker host stays out of
  // browser same-origin checks. Prod: hit the Worker directly using the
  // CORS allowlist baked into workers/creator-api.
  if (import.meta.env.DEV) return '/api/creator-api';
  return (import.meta.env.VITE_DELPHI_CREATOR_API_URL ?? DEFAULT_CREATOR_API_BASE_URL).replace(/\/+$/, '');
}

async function fetchCreatorApi<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const base = getCreatorApiBaseUrl();
  const url = /^https?:\/\//i.test(base)
    ? new URL(path.replace(/^\//, ''), `${base}/`)
    : new URL(`${base.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Delphi creator API request failed (${res.status}): ${body || 'unknown error'}`);
  }
  return (await res.json()) as T;
}

function normalizeSearchText(input: string): string {
  let mapped = '';
  for (const ch of input) mapped += CYRILLIC_TO_LATIN[ch] ?? ch;
  return mapped
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFloat(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeProbabilities(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const values = raw.map(toFloat).filter((n): n is number => n !== null && n >= 0);
  if (values.length === 0) return [];
  const maxValue = Math.max(...values);
  // 1e18 fixed-point values come back from on-chain reads.
  if (maxValue > 1) {
    const scaled = values.map((n) => (n > 1_000_000 ? n / 1e18 : n));
    const sumScaled = scaled.reduce((a, b) => a + b, 0);
    if (sumScaled > 0) return scaled.map((n) => n / sumScaled);
  }
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return [];
  return values.map((n) => n / sum);
}

function getChainReader(): ReturnType<typeof createPublicClient> {
  if (chainReader) return chainReader;
  chainReader = createPublicClient({ chain: GENSYN_MAINNET, transport: http(MAINNET_RPC_URL) });
  return chainReader;
}

async function fetchOnChainImpliedProbabilities(marketAddress: string, outcomeCount: number): Promise<number[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(marketAddress) || outcomeCount < 1) return [];
  const indices = Array.from({ length: outcomeCount }, (_, i) => BigInt(i));
  const probs = await getChainReader().readContract({
    address: MAINNET_GATEWAY_ADDRESS,
    abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI,
    functionName: 'spotImpliedProbabilities',
    args: [marketAddress as `0x${string}`, indices],
  });
  return normalizeProbabilities(probs);
}

function buildFallbackSentiment(labels: string[]): SentimentPoint[] {
  if (labels.length === 0) {
    return [
      { label: 'Yes', probability: 0.5 },
      { label: 'No', probability: 0.5 },
    ];
  }
  const equalProb = 1 / labels.length;
  return labels.map((label) => ({ label, probability: equalProb }));
}

function toSearchResult(market: CreatorApiMarket): DelphiMarketSearchResult {
  return {
    id: market.marketAddress,
    title: market.question?.trim() || market.marketAddress,
    category: market.category ?? 'unknown',
    status: market.status,
  };
}

export async function searchDelphiMarkets(query: string): Promise<DelphiMarketSearchResult[]> {
  const transliterated = normalizeSearchText(query);
  if (!transliterated) return [];
  if (searchCache.has(transliterated)) return searchCache.get(transliterated) ?? [];

  const payload = await fetchCreatorApi<PaginatedResponse<CreatorApiMarket>>('/markets', {
    q: transliterated,
    status: 'open',
    pageSize: SEARCH_PAGE_SIZE,
  });
  const results = (payload.data ?? [])
    .filter((m) => m.flagged !== true) // hide flagged on top of the server-side status filter
    .map(toSearchResult);

  searchCache.set(transliterated, results);
  return results;
}

export async function getDelphiMarketOverlayData(marketId: string): Promise<DelphiMarketOverlayData> {
  const key = marketId.trim().toLowerCase();
  if (!key) throw new Error('Market ID is required.');
  if (marketCache.has(key)) return marketCache.get(key)!;

  const payload = await fetchCreatorApi<ApiResponse<CreatorApiMarket>>(
    `/markets/${encodeURIComponent(key)}`,
  );
  const detail = payload.data;
  const labels = Array.isArray(detail.outcomes) ? detail.outcomes.filter((s): s is string => typeof s === 'string' && !!s.trim()) : [];

  let sentiment = buildFallbackSentiment(labels);
  try {
    const onChainProbabilities = await fetchOnChainImpliedProbabilities(detail.marketAddress, labels.length);
    if (onChainProbabilities.length === labels.length && labels.length > 0) {
      sentiment = onChainProbabilities.map((probability, idx) => ({ label: labels[idx], probability }));
    }
  } catch {
    // Keep equal-probability fallback when the chain read is unavailable.
  }

  const overlay: DelphiMarketOverlayData = {
    id: detail.marketAddress,
    title: detail.question?.trim() || detail.marketAddress,
    url: `${MARKET_BASE_URL}/${encodeURIComponent(detail.marketAddress)}`,
    category: detail.category ?? 'unknown',
    status: detail.status,
    sentiment,
  };
  marketCache.set(key, overlay);
  return overlay;
}
