import { createPublicClient, defineChain, http } from 'viem';

interface DelphiApiMarket {
  id: string;
  category?: string;
  status?: string;
  metadata?: unknown;
  [key: string]: unknown;
}

interface DelphiApiListMarketsResponse {
  markets: DelphiApiMarket[] | null;
}

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

const DEFAULT_API_BASE_URL = '/api/delphi';
const NETWORK_DEFAULTS = {
  mainnet: {
    marketBaseUrl: 'https://app.delphi.fyi/markets',
    rpcUrl: 'https://gensyn-mainnet.g.alchemy.com/public',
    gatewayAddress: '0x4e4e85c52E0F414cc67eE88d0C649Ec81698d700' as const,
  },
  testnet: {
    marketBaseUrl: 'https://testnet.delphi.fyi/markets',
    rpcUrl: 'https://gensyn-testnet.g.alchemy.com/public',
    gatewayAddress: '0x7b8FDBD187B0Be5e30e48B1995df574A62667147' as const,
  },
} as const;
const GENSYN_MAINNET = defineChain({
  id: 685689,
  name: 'Gensyn Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [NETWORK_DEFAULTS.mainnet.rpcUrl] } },
});
const GENSYN_TESTNET = defineChain({
  id: 685685,
  name: 'Gensyn Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [NETWORK_DEFAULTS.testnet.rpcUrl] } },
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
const SEARCH_PAGE_SIZE = 50;
const SEARCH_MAX_PAGES = 3;

function getDelphiNetwork(): 'testnet' | 'mainnet' {
  return import.meta.env.VITE_DELPHI_NETWORK === 'testnet' ? 'testnet' : 'mainnet';
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_DELPHI_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
}

function getMarketBaseUrl(): string {
  const network = getDelphiNetwork();
  return (import.meta.env.VITE_DELPHI_MARKET_BASE_URL ?? NETWORK_DEFAULTS[network].marketBaseUrl).replace(/\/+$/, '');
}

function getApiKey(): string {
  const network = getDelphiNetwork();
  const key = network === 'testnet'
    ? (import.meta.env.VITE_DELPHI_API_ACCESS_KEY_TESTNET ?? import.meta.env.VITE_DELPHI_API_ACCESS_KEY)
    : (import.meta.env.VITE_DELPHI_API_ACCESS_KEY_MAINNET ?? import.meta.env.VITE_DELPHI_API_ACCESS_KEY);
  if (!key) {
    throw new Error(
      network === 'testnet'
        ? 'Missing testnet API key. Add VITE_DELPHI_API_ACCESS_KEY_TESTNET (or VITE_DELPHI_API_ACCESS_KEY) and restart dev server.'
        : 'Missing mainnet API key. Add VITE_DELPHI_API_ACCESS_KEY_MAINNET (or VITE_DELPHI_API_ACCESS_KEY) and restart dev server.'
    );
  }
  return key;
}

async function apiGet<T>(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const apiBase = getApiBaseUrl();
  const base = /^https?:\/\//i.test(apiBase)
    ? apiBase
    : new URL(apiBase.replace(/^\//, ''), window.location.origin + '/').toString();
  const url = new URL(path.replace(/^\//, ''), `${base.replace(/\/+$/, '')}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'X-API-Key': getApiKey(),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 && getDelphiNetwork() === 'testnet' && !import.meta.env.VITE_DELPHI_API_ACCESS_KEY_TESTNET) {
      throw new Error('Delphi testnet API rejected this key (401). Add VITE_DELPHI_API_ACCESS_KEY_TESTNET from https://delphi-api-access.gensyn.ai/ and restart dev server.');
    }
    throw new Error(`Delphi API request failed (${res.status}): ${body || 'unknown error'}`);
  }
  return (await res.json()) as T;
}

function extractMetadata(market: DelphiApiMarket): Record<string, unknown> {
  const meta = market.metadata;
  if (!meta || typeof meta !== 'object') return {};
  return meta as Record<string, unknown>;
}

function normalizeTitle(market: DelphiApiMarket): string {
  const metadata = extractMetadata(market);
  const question = metadata.question;
  if (typeof question === 'string' && question.trim()) return question.trim();
  return market.id;
}

function normalizeSearchText(input: string): string {
  let mapped = '';
  for (const ch of input) mapped += CYRILLIC_TO_LATIN[ch] ?? ch;
  return mapped
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function marketSearchCorpus(market: DelphiApiMarket): string {
  const title = normalizeTitle(market);
  const metadata = extractMetadata(market);
  const outcomes = Array.isArray(metadata.outcomes) ? metadata.outcomes.filter((o): o is string => typeof o === 'string') : [];
  return normalizeSearchText([title, market.category ?? '', ...outcomes].join(' '));
}

function marketMatchesQuery(market: DelphiApiMarket, normalizedQuery: string): boolean {
  const corpus = marketSearchCorpus(market);
  if (!normalizedQuery || !corpus) return false;
  if (corpus.includes(normalizedQuery)) return true;
  const tokens = normalizedQuery.split(' ').filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  let hits = 0;
  for (const token of tokens) {
    if (corpus.includes(token)) hits += 1;
  }
  return hits >= Math.min(2, tokens.length);
}

function normalizeOutcomeLabels(market: DelphiApiMarket): string[] {
  const metadata = extractMetadata(market);
  const outcomes = metadata.outcomes;
  if (!Array.isArray(outcomes)) return [];
  return outcomes
    .map((o) => (typeof o === 'string' ? o.trim() : ''))
    .filter(Boolean);
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
  // 1e18 fixed-point values from chain reads.
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
  const network = getDelphiNetwork();
  const rpcUrl = import.meta.env.VITE_DELPHI_RPC_URL ?? NETWORK_DEFAULTS[network].rpcUrl;
  chainReader = createPublicClient({
    chain: network === 'testnet' ? GENSYN_TESTNET : GENSYN_MAINNET,
    transport: http(rpcUrl),
  });
  return chainReader;
}

async function fetchOnChainImpliedProbabilities(marketId: string, outcomeCount: number): Promise<number[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(marketId) || outcomeCount < 1) return [];
  const indices = Array.from({ length: outcomeCount }, (_, i) => BigInt(i));
  const network = getDelphiNetwork();
  const gateway = (import.meta.env.VITE_DELPHI_GATEWAY_ADDRESS ?? NETWORK_DEFAULTS[network].gatewayAddress) as `0x${string}`;
  const probs = await getChainReader().readContract({
    address: gateway,
    abi: DYNAMIC_PARIMUTUEL_GATEWAY_ABI,
    functionName: 'spotImpliedProbabilities',
    args: [marketId as `0x${string}`, indices],
  });
  return normalizeProbabilities(probs);
}

function buildSentiment(market: DelphiApiMarket): SentimentPoint[] {
  const metadata = extractMetadata(market);
  const labels = normalizeOutcomeLabels(market);
  const probabilityCandidates = [
    (metadata as Record<string, unknown>).impliedProbabilities,
    (metadata as Record<string, unknown>).probabilities,
    (metadata as Record<string, unknown>).outcomeProbabilities,
    (market as Record<string, unknown>).impliedProbabilities,
    (market as Record<string, unknown>).probabilities,
    (market as Record<string, unknown>).outcomeProbabilities,
  ];
  let probabilities: number[] = [];
  for (const candidate of probabilityCandidates) {
    probabilities = normalizeProbabilities(candidate);
    if (probabilities.length > 0) break;
  }

  if (probabilities.length === 0 && labels.length > 0) {
    const equalProb = 1 / labels.length;
    probabilities = labels.map(() => equalProb);
  }
  if (probabilities.length === 0) {
    probabilities = [0.5, 0.5];
  }

  const fallbackLabels = probabilities.length === 2
    ? ['Yes', 'No']
    : probabilities.map((_, idx) => `Option ${idx + 1}`);
  const finalLabels = labels.length === probabilities.length ? labels : fallbackLabels;

  return probabilities.map((probability, idx) => ({
    label: finalLabels[idx] ?? `Option ${idx + 1}`,
    probability: Math.min(1, Math.max(0, probability)),
  }));
}

function normalizeSearchResult(market: DelphiApiMarket): DelphiMarketSearchResult {
  return {
    id: market.id,
    title: normalizeTitle(market),
    category: typeof market.category === 'string' ? market.category : 'unknown',
    status: typeof market.status === 'string' ? market.status : 'unknown',
  };
}

async function toOverlayData(market: DelphiApiMarket): Promise<DelphiMarketOverlayData> {
  const labels = normalizeOutcomeLabels(market);
  let sentiment = buildSentiment(market);
  try {
    const onChainProbabilities = await fetchOnChainImpliedProbabilities(market.id, labels.length);
    if (onChainProbabilities.length === labels.length && labels.length > 0) {
      sentiment = onChainProbabilities.map((probability, idx) => ({
        label: labels[idx],
        probability,
      }));
    }
  } catch {
    // Keep REST/fallback sentiment when chain reads are unavailable.
  }
  return {
    id: market.id,
    title: normalizeTitle(market),
    url: `${getMarketBaseUrl()}/${encodeURIComponent(market.id)}`,
    category: typeof market.category === 'string' ? market.category : 'unknown',
    status: typeof market.status === 'string' ? market.status : 'unknown',
    sentiment,
  };
}

export async function searchDelphiMarkets(query: string): Promise<DelphiMarketSearchResult[]> {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  if (searchCache.has(normalizedQuery)) {
    return searchCache.get(normalizedQuery) ?? [];
  }

  const markets: DelphiApiMarket[] = [];
  const seenIds = new Set<string>();
  for (let page = 0; page < SEARCH_MAX_PAGES; page++) {
    const payload = await apiGet<DelphiApiListMarketsResponse>('/markets', {
      orderBy: 'liquidity',
      limit: SEARCH_PAGE_SIZE,
      skip: page * SEARCH_PAGE_SIZE,
    });
    const batch = payload.markets ?? [];
    for (const market of batch) {
      if (!seenIds.has(market.id)) {
        seenIds.add(market.id);
        markets.push(market);
      }
    }
    if (batch.length < SEARCH_PAGE_SIZE) break;
  }

  const matchedMarkets = markets.filter((market) => marketMatchesQuery(market, normalizedQuery));
  const results = matchedMarkets
    .map(normalizeSearchResult)
    .slice(0, 12);

  searchCache.set(normalizedQuery, results);
  return results;
}

export async function getDelphiMarketOverlayData(marketId: string): Promise<DelphiMarketOverlayData> {
  const key = marketId.trim();
  if (!key) throw new Error('Market ID is required.');
  if (marketCache.has(key)) return marketCache.get(key)!;

  const market = await apiGet<DelphiApiMarket>(`/markets/${encodeURIComponent(key)}`);
  const overlay = await toOverlayData(market);
  marketCache.set(key, overlay);
  return overlay;
}

