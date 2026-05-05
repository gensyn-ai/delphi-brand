import type { DelphiEffectConfig } from '../types/delphi-effect';
import {
  mergeWithDefaults,
  DEFAULT_DELPHI_CONFIG,
  type GraphicsLayers,
  createDefaultGraphicsLayers,
} from '../types/delphi-effect';
import { isMobile } from '../responsive';
import {
  searchDelphiMarkets,
  getDelphiMarketOverlayData,
  type DelphiMarketSearchResult,
} from '../services/delphi-market';

const MAX_PREVIEW_PX = 600;

/** Standard output sizes (cover-crop from master). w/h 0 = original upload dimensions. */
const OUTPUT_SIZE_PRESETS: Array<{ id: string; label: string; w: number; h: number }> = [
  { id: 'original', label: 'Original (upload size)', w: 0, h: 0 },
  { id: 'ig_square', label: 'Instagram / Facebook square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'ig_portrait', label: 'Instagram portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'ig_story', label: 'Instagram story / Reels · 1080 × 1920', w: 1080, h: 1920 },
  { id: 'fb_post', label: 'Facebook link preview · 1200 × 630', w: 1200, h: 630 },
  { id: 'opengraph', label: 'Open Graph (og:image) · 1200 × 630', w: 1200, h: 630 },
  { id: 'x_post', label: 'X (Twitter) post · 1200 × 675', w: 1200, h: 675 },
  { id: 'linkedin', label: 'LinkedIn share · 1200 × 627', w: 1200, h: 627 },
  { id: 'yt_thumb', label: 'YouTube thumbnail · 1280 × 720', w: 1280, h: 720 },
  { id: 'pinterest', label: 'Pinterest pin · 1000 × 1500', w: 1000, h: 1500 },
];

/**
 * Image library entries for the “view library” modal. Add `{ src, label }` URLs or
 * paths relative to the app base (e.g. `images/your-folder/photo.jpg`).
 */
const RAW_LIBRARY_FILENAME_RE = /^delphi-library-image-(\d{3})\.png$/i;

function parseRawLibraryIndex(file: string): number | null {
  const match = file.match(RAW_LIBRARY_FILENAME_RE);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortRawLibraryFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const aIdx = parseRawLibraryIndex(a) ?? Number.POSITIVE_INFINITY;
    const bIdx = parseRawLibraryIndex(b) ?? Number.POSITIVE_INFINITY;
    return aIdx - bIdx || a.localeCompare(b);
  });
}

function validateRawLibraryFiles(files: string[]): void {
  const invalid = files.filter((file) => !RAW_LIBRARY_FILENAME_RE.test(file));
  if (invalid.length > 0) {
    console.warn('[imagery-generator] Raw library files must use delphi-library-image-XXX.png naming:', invalid);
  }
}

const RAW_LIBRARY_FILES = sortRawLibraryFiles([
  'delphi-library-image-001.png',
  'delphi-library-image-002.png',
  'delphi-library-image-003.png',
  'delphi-library-image-004.png',
  'delphi-library-image-006.png',
  'delphi-library-image-007.png',
  'delphi-library-image-008.png',
  'delphi-library-image-009.png',
  'delphi-library-image-010.png',
  'delphi-library-image-011.png',
  'delphi-library-image-012.png',
  'delphi-library-image-013.png',
  'delphi-library-image-014.png',
  'delphi-library-image-015.png',
  'delphi-library-image-016.png',
  'delphi-library-image-017.png',
  'delphi-library-image-018.png',
  'delphi-library-image-019.png',
  'delphi-library-image-020.png',
  'delphi-library-image-021.png',
  'delphi-library-image-022.png',
]);

validateRawLibraryFiles(RAW_LIBRARY_FILES);

const IMAGERY_LIBRARY_ITEMS: Array<{ src: string; label: string }> = RAW_LIBRARY_FILES.map((file) => ({
  src: `images/library/${file}`,
  label: `Delphi library ${file.match(RAW_LIBRARY_FILENAME_RE)?.[1] ?? file}`,
}));

function resolvePublicAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = new URL(import.meta.env.BASE_URL ?? '/', window.location.origin);
  return new URL(path.replace(/^\//, ''), baseUrl).href;
}

/** Scale overlay positions/sizes when the preview canvas dimensions change (e.g. new upload at “original” size). */
function scaleGraphicsLayerLayout(
  layers: GraphicsLayers,
  oldW: number,
  oldH: number,
  newW: number,
  newH: number
): void {
  if (oldW <= 0 || oldH <= 0 || newW <= 0 || newH <= 0) return;
  const rx = newW / oldW;
  const ry = newH / oldH;
  const ru = Math.min(rx, ry);

  layers.headline.x = Math.round(layers.headline.x * rx);
  layers.headline.y = Math.round(layers.headline.y * ry);
  layers.headline.fontSize = Math.max(12, Math.min(72, Math.round(layers.headline.fontSize * ru)));

  layers.delphiLogo.x = Math.round(layers.delphiLogo.x * rx);
  layers.delphiLogo.y = Math.round(layers.delphiLogo.y * ry);
  layers.delphiLogo.width = Math.max(10, Math.round(layers.delphiLogo.width * ru));

  layers.delphiSymbol.x = Math.round(layers.delphiSymbol.x * rx);
  layers.delphiSymbol.y = Math.round(layers.delphiSymbol.y * ry);
  layers.delphiSymbol.width = Math.max(10, Math.round(layers.delphiSymbol.width * ru));

  layers.strapline.x = Math.round(layers.strapline.x * rx);
  layers.strapline.y = Math.round(layers.strapline.y * ry);
  layers.strapline.width = Math.max(10, Math.round(layers.strapline.width * ru));

  layers.userLogo.x = Math.round(layers.userLogo.x * rx);
  layers.userLogo.y = Math.round(layers.userLogo.y * ry);
  layers.userLogo.width = Math.max(10, Math.round(layers.userLogo.width * ru));

  layers.marketData.x = Math.round(layers.marketData.x * rx);
  layers.marketData.y = Math.round(layers.marketData.y * ry);
  layers.marketData.fontSize = Math.max(8, Math.min(24, Math.round(layers.marketData.fontSize * ru)));

  layers.cta.x = Math.round(layers.cta.x * rx);
  layers.cta.y = Math.round(layers.cta.y * ry);
  layers.cta.fontSize = Math.max(8, Math.min(36, Math.round(layers.cta.fontSize * ru)));
  layers.cta.paddingH = Math.max(4, Math.round(layers.cta.paddingH * ru));
  layers.cta.paddingV = Math.max(4, Math.round(layers.cta.paddingV * ru));
  layers.cta.borderRadius = Math.max(0, Math.round(layers.cta.borderRadius * ru));
}

/** Tight bitmap rect around strapline ink (excludes SVG viewBox padding). */
interface StraplineSourceTrim {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

interface BrandLayerImages {
  delphiLogo: HTMLImageElement | null;
  delphiSymbol: HTMLImageElement | null;
  strapline: HTMLImageElement | null;
  /** From alpha scan at load; null until computed. */
  straplineTrim: StraplineSourceTrim | null;
}

const STRAPLINE_TRIM_WORK = document.createElement('canvas');

/**
 * Bounding box of pixels with meaningful alpha so layout matches letterforms, not the full SVG frame.
 */
function computeStraplineSourceTrim(img: HTMLImageElement): StraplineSourceTrim {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw < 1 || ih < 1) return { sx: 0, sy: 0, sw: 1, sh: 1 };
  STRAPLINE_TRIM_WORK.width = iw;
  STRAPLINE_TRIM_WORK.height = ih;
  const tctx = STRAPLINE_TRIM_WORK.getContext('2d', { willReadFrequently: true })!;
  tctx.clearRect(0, 0, iw, ih);
  tctx.drawImage(img, 0, 0);
  const id = tctx.getImageData(0, 0, iw, ih);
  const d = id.data;
  const ALPHA = 10;
  let minX = iw;
  let minY = ih;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < ih; y++) {
    const row = y * iw * 4;
    for (let x = 0; x < iw; x++) {
      if (d[row + x * 4 + 3] > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { sx: 0, sy: 0, sw: iw, sh: ih };
  return { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
}

function straplineDrawMetrics(
  layer: GraphicsLayers['strapline'],
  img: HTMLImageElement,
  trim: StraplineSourceTrim | null
): { sx: number; sy: number; sw: number; sh: number; dw: number; dh: number } | null {
  if (!img || layer.width <= 0) return null;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (iw < 1 || ih < 1) return null;
  const t = trim ?? { sx: 0, sy: 0, sw: iw, sh: ih };
  const dw = layer.width;
  const dh = (t.sh / t.sw) * dw;
  return { sx: t.sx, sy: t.sy, sw: t.sw, sh: t.sh, dw, dh };
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  out.getContext('2d')!.drawImage(src, 0, 0);
  return out;
}

/** Scale source to fill target (center crop), letterboxing with black if needed is avoided by cover. */
function scaleCanvasCover(src: HTMLCanvasElement, targetW: number, targetH: number): HTMLCanvasElement {
  const sw = src.width;
  const sh = src.height;
  const scale = Math.max(targetW / sw, targetH / sh);
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);
  const ox = Math.round((targetW - dw) / 2);
  const oy = Math.round((targetH - dh) / 2);
  const out = document.createElement('canvas');
  out.width = targetW;
  out.height = targetH;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(src, ox, oy, dw, dh);
  return out;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Luma-preserving saturation; factor 1 = unchanged, 0 = grayscale. */
function applySaturationToBuffer(data: Uint8ClampedArray, factor: number): void {
  if (Math.abs(factor - 1) < 0.001) return;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = clampByte(y + (r - y) * factor);
    data[i + 1] = clampByte(y + (g - y) * factor);
    data[i + 2] = clampByte(y + (b - y) * factor);
  }
}

const BORDER = '1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';
const LABEL_STYLE = `
  font-family: 'Fragment Mono', monospace;
  font-size: 8pt;
  color: var(--fg);
  opacity: 0.5;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
`;

function parseHex(hex: string): [number, number, number] {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function lerpColor(
  hex1: string,
  hex2: string,
  t: number
): string {
  const [r1, g1, b1] = parseHex(hex1);
  const [r2, g2, b2] = parseHex(hex2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

interface RowSample {
  L: number;
  sw: number;
}

function rowSampleFromData(
  data: Uint8ClampedArray,
  imgW: number,
  x0: number,
  x1: number,
  y: number
): RowSample | null {
  const sw = x1 - x0;
  if (sw <= 0) return null;
  let sumL = 0;
  for (let x = x0; x < x1; x++) {
    const i = (y * imgW + x) * 4;
    sumL += (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return { L: sumL / sw, sw };
}

/**
 * Vertical blinds: optional saturation on work canvas, edge-aware mask, duotone or full photo, inner shadow.
 */
function renderVerticalBlindsDuotone(
  sourceCanvas: HTMLCanvasElement,
  destCtx: CanvasRenderingContext2D,
  config: typeof DEFAULT_DELPHI_CONFIG
): void {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const sat = Math.max(0.5, Math.min(1.6, config.sourceSaturation));

  let workCanvas = sourceCanvas;
  if (Math.abs(sat - 1) > 0.001) {
    const wc = document.createElement('canvas');
    wc.width = w;
    wc.height = h;
    const wctx = wc.getContext('2d')!;
    wctx.drawImage(sourceCanvas, 0, 0);
    const sid = wctx.getImageData(0, 0, w, h);
    applySaturationToBuffer(sid.data, sat);
    wctx.putImageData(sid, 0, 0);
    workCanvas = wc;
  }

  const wctx = workCanvas.getContext('2d');
  if (!wctx) return;

  const imageData = wctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const stripeW = Math.max(1, Math.round(config.halftoneCellSize));
  const gap = Math.max(0, Math.min(24, Math.round(config.stripeGap)));
  const pitch = stripeW + gap;
  const sensitivity = Math.max(0.15, Math.min(1, config.halftoneDotScale));
  const lumThreshold = Math.max(0.02, (1 - sensitivity) * 0.5);
  const fullColor = config.useOriginalColors;
  const endRadiusMax = Math.max(0, Math.min(16, Math.round(config.stripeEndRadius)));
  const lumContrast = Math.max(0.65, Math.min(1.65, config.luminanceContrast));
  const minRun = Math.max(0, Math.min(12, Math.round(config.minRunLength)));
  const edgeStr = Math.max(0, Math.min(1.2, config.edgeMaskStrength));
  const innerSh = Math.max(0, Math.min(1, config.stripeInnerShadow));

  destCtx.fillStyle = config.colorShadow;
  destCtx.fillRect(0, 0, w, h);

  const strokePath = (x: number, y: number, sw: number, rh: number, rCap: number): void => {
    destCtx.beginPath();
    if (rCap > 0.25) {
      destCtx.roundRect(x, y, sw, rh, rCap);
    } else {
      destCtx.rect(x, y, sw, rh);
    }
  };

  const paintInnerShadow = (x: number, y0: number, sw: number, rh: number, rCap: number): void => {
    if (innerSh <= 0.02) return;
    destCtx.save();
    strokePath(x, y0, sw, rh, rCap);
    destCtx.clip();
    const inward = Math.min(sw * 0.55, 14);
    const alpha = innerSh * 0.48;
    const gL = destCtx.createLinearGradient(x, 0, x + inward, 0);
    gL.addColorStop(0, `rgba(0,0,0,${alpha})`);
    gL.addColorStop(1, 'rgba(0,0,0,0)');
    destCtx.fillStyle = gL;
    destCtx.fillRect(x, y0, inward, rh);
    const gR = destCtx.createLinearGradient(x + sw, 0, x + sw - inward, 0);
    gR.addColorStop(0, `rgba(0,0,0,${alpha})`);
    gR.addColorStop(1, 'rgba(0,0,0,0)');
    destCtx.fillStyle = gR;
    destCtx.fillRect(x + sw - inward, y0, inward, rh);
    destCtx.restore();
  };

  for (let x0 = 0; x0 < w; x0 += pitch) {
    const x1 = Math.min(x0 + stripeW, w);
    const sw = x1 - x0;
    if (sw <= 0) continue;

    const colL = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      const sample = rowSampleFromData(data, w, x0, x1, y);
      colL[y] = sample ? sample.L : 0;
    }

    let runStart = -1;
    let runLumWeighted = 0;
    let runPx = 0;

    const endRun = (yEnd: number): void => {
      if (runStart < 0 || runPx <= 0) return;
      const rh = yEnd - runStart;
      if (minRun > 0 && rh < minRun) {
        runStart = -1;
        runLumWeighted = 0;
        runPx = 0;
        return;
      }
      const rCap =
        endRadiusMax > 0
          ? Math.min(endRadiusMax, sw / 2, rh / 2)
          : 0;

      if (fullColor) {
        destCtx.save();
        strokePath(x0, runStart, sw, rh, rCap);
        destCtx.clip();
        destCtx.drawImage(workCanvas, x0, runStart, sw, rh, x0, runStart, sw, rh);
        destCtx.restore();
      } else {
        strokePath(x0, runStart, sw, rh, rCap);
        const avgLum = runLumWeighted / runPx;
        destCtx.fillStyle = lerpColor(config.colorShadow, config.colorHighlight, avgLum);
        destCtx.fill();
      }

      paintInnerShadow(x0, runStart, sw, rh, rCap);

      runStart = -1;
      runLumWeighted = 0;
      runPx = 0;
    };

    for (let y = 0; y < h; y++) {
      let grad = 0;
      if (y > 0) grad += Math.abs(colL[y] - colL[y - 1]);
      if (y < h - 1) grad += Math.abs(colL[y] - colL[y + 1]);
      grad *= 0.5;
      const Lraw = colL[y];
      const Lmid = clamp01((Lraw - 0.5) * lumContrast + 0.5);
      const L = clamp01(Lmid + edgeStr * Math.min(1, grad * 1.25));

      const sample = rowSampleFromData(data, w, x0, x1, y);
      if (!sample) continue;
      if (L > lumThreshold) {
        if (runStart < 0) runStart = y;
        runLumWeighted += sample.L * sample.sw;
        runPx += sample.sw;
      } else {
        endRun(y);
      }
    }
    endRun(h);
  }
}

const INSTRUMENT_SERIF = '"Instrument Serif", serif';
const FRAGMENT_MONO = '"Fragment Mono", monospace';
const LAYER_PADDING = 16;
/** Matches `previewWrap` border-radius; inner padding keeps the canvas bitmap out of the curved clip. */
const PREVIEW_CORNER_RADIUS = 8;
const IS_TOUCH = 'ontouchstart' in window;
const HANDLE_SIZE = IS_TOUCH ? 16 : 8;
const HANDLE_HIT = IS_TOUCH ? 24 : 12;
/** Minimum bitmap px: magnet range grows with canvas size so large export presets still snap reliably. */
const CENTER_SNAP_THRESHOLD_PX = 14;
/** Minimum snap radius in CSS px (large exports are drawn small; bitmap-only thresholds were too tiny on-screen). */
const CENTER_SNAP_SCREEN_PX = 16;

function centerSnapMagnetThresholdPx(cw: number, ch: number): number {
  const ref = Math.max(1, cw, ch);
  return Math.min(120, Math.max(CENTER_SNAP_THRESHOLD_PX, Math.round(ref * 0.012)));
}

/**
 * Bitmap-space magnet radius: at least the scaled threshold, and at least ~CENTER_SNAP_SCREEN_PX
 * of on-screen movement (using current canvas layout box) so presets match Original feel.
 */
function effectiveCenterSnapMagnetPx(
  cw: number,
  ch: number,
  canvasEl: HTMLCanvasElement
): number {
  const base = centerSnapMagnetThresholdPx(cw, ch);
  const rect = canvasEl.getBoundingClientRect();
  const rw = Math.max(rect.width, 1e-6);
  const rh = Math.max(rect.height, 1e-6);
  const sx = cw / rw;
  const sy = ch / rh;
  const sMax = Math.max(sx, sy);
  const fromScreen = CENTER_SNAP_SCREEN_PX * sMax;
  return Math.min(200, Math.max(base, fromScreen));
}

/** Post-snap / post-clamp centre tolerance scales with canvas (avoids guides never showing on 1080+ outputs). */
function centerSnapAlignedEps(cw: number, ch: number): number {
  const ref = Math.max(1, cw, ch);
  return Math.max(2, Math.min(14, ref * 0.004));
}

let centerSnapClickAudioCtx: AudioContext | null = null;

function playCenterSnapClickSound(): void {
  try {
    if (!centerSnapClickAudioCtx) centerSnapClickAudioCtx = new AudioContext();
    const ac = centerSnapClickAudioCtx;
    if (ac.state === 'suspended') void ac.resume();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = 920;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.032);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.038);
  } catch {
    /* ignore */
  }
}

/** Short vibration on phones; quiet tick on desktop when Vibration API is unavailable. */
function centerSnapHaptic(): void {
  let vibrated = false;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      vibrated = navigator.vibrate(14) === true;
    }
  } catch {
    /* ignore */
  }
  if (!vibrated) playCenterSnapClickSound();
}

interface LayerRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MARKET_DISCLAIMER_LINES = [
  'Market active at time of publication.',
  'Sentiment reflects latest available data.',
];
const MARKET_TITLE_WRAP_CHARS = 40;

interface MarketOverlayLayout {
  fs: number;
  pad: number;
  totalW: number;
  totalH: number;
  contentW: number;
  titleLines: string[];
  titleLineH: number;
  titleH: number;
  chipH: number;
  chipW: number;
  sectionPad: number;
  sentimentTitleH: number;
  barH: number;
  legendLineH: number;
  sentimentBlockH: number;
  gapAfterTitle: number;
  gapAfterChip: number;
  gapBeforeDisclaimer: number;
  disclaimerLineH: number;
  disclaimerLines: string[];
  /** Normalized probabilities in API/original layer order (used for stacked bar when ≤2 outcomes). */
  points: Array<{ label: string; probability: number }>;
  /** Sorted by descending probability — only used when showing top-two rows + “+more”. */
  multiOutcomeMode: boolean;
  topTwoRanked: Array<{ label: string; probability: number }>;
  overflowMoreCount: number;
}

function wrapTextByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxCharsPerLine = Number.POSITIVE_INFINITY
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (
      !current ||
      (ctx.measureText(candidate).width <= maxWidth && candidate.length <= maxCharsPerLine)
    ) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    while (current.length > maxCharsPerLine) {
      lines.push(current.slice(0, maxCharsPerLine));
      current = current.slice(maxCharsPerLine);
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildMarketOverlayLayout(
  ctx: CanvasRenderingContext2D,
  md: GraphicsLayers['marketData']
): MarketOverlayLayout {
  const fs = md.fontSize;
  const pad = fs * 1.1;
  const sectionPad = fs * 0.85;
  const sentimentTitleH = fs * 1.1;
  const barH = fs * 0.56;
  const chipH = md.volume ? fs * 1.35 : 0;
  const titleLineH = fs * 1.24;
  const legendLineH = fs * 1.05;
  const disclaimerLineH = fs * 0.78;
  const disclaimerLines = MARKET_DISCLAIMER_LINES;
  const rawPoints = md.options.map((opt, idx) => ({
    label: opt.label.trim() || `Option ${idx + 1}`,
    probability: Number.isFinite(opt.probability) ? Math.max(0, opt.probability) : 0,
  }));
  const probabilitySum = rawPoints.reduce((sum, point) => sum + point.probability, 0);
  const points = rawPoints.map((point) => ({
    label: point.label,
    probability: probabilitySum > 0 ? point.probability / probabilitySum : 1 / Math.max(1, rawPoints.length),
  }));

  const multiOutcomeMode = points.length > 2;
  const sortedByProb = [...points].sort((a, b) => b.probability - a.probability);
  const topTwoRanked = multiOutcomeMode ? sortedByProb.slice(0, 2) : [];
  const overflowMoreCount = multiOutcomeMode ? Math.max(0, points.length - 2) : 0;

  const gapAfterTitle = md.title ? fs * 0.5 : 0;
  const gapAfterChip = md.volume ? fs * 0.7 : 0;
  const gapBeforeDisclaimer = fs * 0.55;

  let sentimentBlockH: number;
  if (multiOutcomeMode && topTwoRanked.length > 0) {
    const gapAfterSentimentHeader = fs * 0.45;
    const barToLabelGap = fs * 0.38;
    const gapBetweenOutcomeStacks = fs * 0.55;
    const rowStackH = barH + barToLabelGap + legendLineH;
    const stacks = Math.min(2, topTwoRanked.length);
    sentimentBlockH = sectionPad * 2
      + sentimentTitleH
      + gapAfterSentimentHeader
      + stacks * rowStackH
      + (stacks > 1 ? gapBetweenOutcomeStacks : 0);
  } else {
    const legendRows = Math.max(1, Math.ceil(points.length / 2));
    const legendH = legendRows * legendLineH;
    sentimentBlockH = sectionPad * 2 + sentimentTitleH + fs * 0.55 + barH + fs * 0.65 + legendH;
  }

  ctx.font = `${Math.round(fs * 0.82)}px ${FRAGMENT_MONO}`;
  const chipW = md.volume ? ctx.measureText(md.volume).width + fs * 1.1 : 0;

  const pct = (p: number) => `${Math.round(p * 100)}%`;

  let sentimentMinW = chipW;
  if (multiOutcomeMode) {
    ctx.font = `${Math.round(fs * 0.72)}px ${FRAGMENT_MONO}`;
    let headerW = ctx.measureText('SENTIMENT').width;
    if (overflowMoreCount > 0) {
      headerW += fs * 1.25 + ctx.measureText(`(+${overflowMoreCount} More)`).width;
    }
    sentimentMinW = Math.max(sentimentMinW, headerW);
    ctx.font = `${Math.round(fs * 0.82)}px ${FRAGMENT_MONO}`;
    for (const opt of topTwoRanked) {
      const pairW = ctx.measureText(opt.label).width + fs * 3.2 + ctx.measureText(pct(opt.probability)).width;
      sentimentMinW = Math.max(sentimentMinW, pairW);
    }
  } else if (points.length > 0) {
    const legendTexts = points.map((opt) => `${pct(opt.probability)} ${opt.label}`);
    let leftColW = 0;
    let rightColW = 0;
    for (let i = 0; i < legendTexts.length; i++) {
      const textW = ctx.measureText(legendTexts[i]).width;
      if (i % 2 === 0) leftColW = Math.max(leftColW, textW);
      else rightColW = Math.max(rightColW, textW);
    }
    const legendColGap = rightColW > 0 ? fs * 1.6 : 0;
    sentimentMinW = Math.max(chipW, leftColW + rightColW + legendColGap);
  }

  const minContentW = fs * 16;
  let contentW = Math.max(minContentW, sentimentMinW);

  ctx.font = `600 ${Math.round(fs * 1.25)}px 'Figtree', sans-serif`;
  let titleLines = md.title
    ? wrapTextByWidth(ctx, md.title, contentW, MARKET_TITLE_WRAP_CHARS)
    : [];
  if (titleLines.length === 0 && md.title) titleLines = [md.title.trim()];
  let titleMaxW = 0;
  for (const line of titleLines) titleMaxW = Math.max(titleMaxW, ctx.measureText(line).width);
  contentW = Math.max(contentW, titleMaxW);

  if (md.title) {
    titleLines = wrapTextByWidth(ctx, md.title, contentW, MARKET_TITLE_WRAP_CHARS);
    if (titleLines.length === 0) titleLines = [md.title.trim()];
  }

  const titleH = titleLines.length * titleLineH;
  const totalW = pad * 2 + contentW;
  const totalH = pad * 2
    + titleH
    + gapAfterTitle
    + chipH
    + gapAfterChip
    + sentimentBlockH
    + gapBeforeDisclaimer
    + disclaimerLines.length * disclaimerLineH;

  return {
    fs,
    pad,
    totalW,
    totalH,
    contentW,
    titleLines,
    titleLineH,
    titleH,
    chipH,
    chipW,
    sectionPad,
    sentimentTitleH,
    barH,
    legendLineH,
    sentimentBlockH,
    gapAfterTitle,
    gapAfterChip,
    gapBeforeDisclaimer,
    disclaimerLineH,
    disclaimerLines,
    points,
    multiOutcomeMode,
    topTwoRanked,
    overflowMoreCount,
  };
}

/**
 * Get bounding rects for visible layers (for hit-testing).
 */
function measureMarketDataRect(
  ctx: CanvasRenderingContext2D,
  layers: GraphicsLayers
): LayerRect | null {
  const md = layers.marketData;
  if (!md.enabled || md.options.length === 0) return null;
  const layout = buildMarketOverlayLayout(ctx, md);
  return { x: md.x, y: md.y, w: layout.totalW, h: layout.totalH };
}

type LayerRects = {
  headline: LayerRect | null;
  delphiLogo: LayerRect | null;
  delphiSymbol: LayerRect | null;
  strapline: LayerRect | null;
  userLogo: LayerRect | null;
  marketData: LayerRect | null;
  cta: LayerRect | null;
};

function measureCtaRect(ctx: CanvasRenderingContext2D, layers: GraphicsLayers): LayerRect | null {
  const c = layers.cta;
  if (!c.enabled || !c.text.trim()) return null;
  ctx.font = `bold ${c.fontSize}px ${FRAGMENT_MONO}`;
  const tw = ctx.measureText(c.text).width;
  return { x: c.x, y: c.y, w: tw + c.paddingH * 2, h: c.fontSize + c.paddingV * 2 };
}

function getLayerRects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layers: GraphicsLayers,
  brandImages: BrandLayerImages
): LayerRects {
  const result: LayerRects = {
    headline: null,
    delphiLogo: null,
    delphiSymbol: null,
    strapline: null,
    userLogo: null,
    marketData: null,
    cta: null,
  };
  if (layers.headline.enabled && layers.headline.text.trim()) {
    ctx.font = `${layers.headline.fontSize}px ${INSTRUMENT_SERIF}`;
    const lineHeight = layers.headline.fontSize * 1.3;
    const lines = layers.headline.text.split('\n').map((s) => s.trim());
    if (lines.length > 0) {
      let maxW = 0;
      for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width);
      const totalH = lines.length * lineHeight;
      const align = layers.headline.textAlign ?? 'left';
      // Bounding box always encloses the text regardless of alignment
      const left = align === 'left' ? layers.headline.x : align === 'center' ? layers.headline.x - maxW / 2 : layers.headline.x - maxW;
      result.headline = {
        x: left,
        y: layers.headline.y,
        w: maxW,
        h: totalH,
      };
    }
  }
  if (layers.delphiLogo.enabled && brandImages.delphiLogo && layers.delphiLogo.width > 0) {
    const img = brandImages.delphiLogo;
    const scale = layers.delphiLogo.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    result.delphiLogo = {
      x: layers.delphiLogo.x,
      y: layers.delphiLogo.y,
      w: layers.delphiLogo.width,
      h: dh,
    };
  }
  if (layers.delphiSymbol.enabled && brandImages.delphiSymbol && layers.delphiSymbol.width > 0) {
    const img = brandImages.delphiSymbol;
    const scale = layers.delphiSymbol.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    result.delphiSymbol = {
      x: layers.delphiSymbol.x,
      y: layers.delphiSymbol.y,
      w: layers.delphiSymbol.width,
      h: dh,
    };
  }
  if (layers.strapline.enabled && brandImages.strapline && layers.strapline.width > 0) {
    const m = straplineDrawMetrics(layers.strapline, brandImages.strapline, brandImages.straplineTrim);
    if (m) {
      result.strapline = {
        x: layers.strapline.x,
        y: layers.strapline.y,
        w: m.dw,
        h: m.dh,
      };
    }
  }
  if (layers.userLogo.enabled && layers.userLogo.image && layers.userLogo.width > 0) {
    const img = layers.userLogo.image;
    const scale = layers.userLogo.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    result.userLogo = {
      x: layers.userLogo.x,
      y: layers.userLogo.y,
      w: layers.userLogo.width,
      h: dh,
    };
  }
  result.marketData = measureMarketDataRect(ctx, layers);
  result.cta = measureCtaRect(ctx, layers);
  return result;
}

function pointInRect(x: number, y: number, r: LayerRect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/**
 * Set default position for a layer (headline top, strapline centre, Delphi bottom-right, etc.).
 */
function applyDefaultPosition(
  layerKey: 'headline' | 'delphiLogo' | 'delphiSymbol' | 'strapline' | 'userLogo' | 'marketData' | 'cta',
  w: number,
  h: number,
  layers: GraphicsLayers,
  brandImages: BrandLayerImages,
  ctx: CanvasRenderingContext2D
): void {
  if (layerKey === 'headline' && layers.headline.enabled && layers.headline.text.trim()) {
    ctx.font = `${layers.headline.fontSize}px ${INSTRUMENT_SERIF}`;
    const lineHeight = layers.headline.fontSize * 1.3;
    const lines = layers.headline.text.split('\n').map((s) => s.trim());
    if (lines.length > 0) {
      let maxW = 0;
      for (const line of lines) maxW = Math.max(maxW, ctx.measureText(line).width);
      const align = layers.headline.textAlign ?? 'left';
      if (align === 'left') {
        layers.headline.x = Math.round(LAYER_PADDING);
      } else if (align === 'center') {
        layers.headline.x = Math.round(w / 2);
      } else {
        layers.headline.x = Math.round(w - LAYER_PADDING);
      }
      layers.headline.y = Math.round(LAYER_PADDING);
    }
  } else if (layerKey === 'delphiLogo' && layers.delphiLogo.enabled && brandImages.delphiLogo && layers.delphiLogo.width > 0) {
    const img = brandImages.delphiLogo;
    const scale = layers.delphiLogo.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    layers.delphiLogo.x = Math.round(w - layers.delphiLogo.width - LAYER_PADDING);
    layers.delphiLogo.y = Math.round(h - dh - LAYER_PADDING);
  } else if (layerKey === 'delphiSymbol' && layers.delphiSymbol.enabled && brandImages.delphiSymbol && layers.delphiSymbol.width > 0) {
    const img = brandImages.delphiSymbol;
    const scale = layers.delphiSymbol.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    layers.delphiSymbol.x = Math.round(LAYER_PADDING);
    layers.delphiSymbol.y = Math.round(h - dh - LAYER_PADDING);
  } else if (layerKey === 'strapline' && layers.strapline.enabled && brandImages.strapline && layers.strapline.width > 0) {
    const m = straplineDrawMetrics(layers.strapline, brandImages.strapline, brandImages.straplineTrim);
    if (m) {
      layers.strapline.x = Math.round((w - m.dw) / 2);
      layers.strapline.y = Math.round((h - m.dh) / 2);
    }
  } else if (layerKey === 'userLogo' && layers.userLogo.enabled && layers.userLogo.image && layers.userLogo.width > 0) {
    const img = layers.userLogo.image;
    const scale = layers.userLogo.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    layers.userLogo.x = Math.round(w - layers.userLogo.width - LAYER_PADDING);
    layers.userLogo.y = Math.round(h - dh - LAYER_PADDING);
  } else if (layerKey === 'marketData' && layers.marketData.enabled && layers.marketData.options.length > 0) {
    // Use content-sized width (no forced 96% scale) so gap between labels and bars stays minimal
    const rect = measureMarketDataRect(ctx, layers);
    if (rect) {
      layers.marketData.x = Math.round((w - rect.w) / 2);
      layers.marketData.y = Math.round((h - rect.h) / 2);
    }
  } else if (layerKey === 'cta' && layers.cta.enabled && layers.cta.text.trim()) {
    const rect = measureCtaRect(ctx, layers);
    if (rect) {
      layers.cta.x = Math.round((w - rect.w) / 2);
      layers.cta.y = Math.round(h - rect.h - LAYER_PADDING * 2);
    }
  }
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

/**
 * Keep overlays inside the canvas: scale down logo widths if they cannot fit, then clamp x/y.
 * Returns true if any logo width changed (sliders should refresh).
 */
function clampGraphicsLayersToCanvasBounds(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  layers: GraphicsLayers,
  brandImages: BrandLayerImages
): boolean {
  const pad = LAYER_PADDING;
  if (cw < 8 || ch < 8) return false;
  let widthsChanged = false;

  const innerW = Math.max(8, cw - 2 * pad);
  const innerH = Math.max(8, ch - 2 * pad);

  function clampRasterLayer(
    lr: { x: number; y: number; width: number },
    natW: number,
    natH: number
  ): void {
    if (natW < 1 || natH < 1 || lr.width <= 0) return;
    let dw = lr.width;
    let dh = (natH / natW) * dw;
    let s = 1;
    if (dw > innerW) s = Math.min(s, innerW / dw);
    if (dh > innerH) s = Math.min(s, innerH / dh);
    if (s < 1) {
      const nw = Math.max(10, Math.round(lr.width * s));
      if (nw !== lr.width) widthsChanged = true;
      lr.width = nw;
      dw = lr.width;
      dh = (natH / natW) * dw;
    }
    lr.x = Math.round(clampNum(lr.x, pad, Math.max(pad, cw - pad - dw)));
    lr.y = Math.round(clampNum(lr.y, pad, Math.max(pad, ch - pad - dh)));
  }

  if (layers.delphiLogo.enabled && brandImages.delphiLogo && layers.delphiLogo.width > 0) {
    clampRasterLayer(layers.delphiLogo, brandImages.delphiLogo.naturalWidth, brandImages.delphiLogo.naturalHeight);
  }
  if (layers.delphiSymbol.enabled && brandImages.delphiSymbol && layers.delphiSymbol.width > 0) {
    clampRasterLayer(layers.delphiSymbol, brandImages.delphiSymbol.naturalWidth, brandImages.delphiSymbol.naturalHeight);
  }
  if (layers.userLogo.enabled && layers.userLogo.image && layers.userLogo.width > 0) {
    const im = layers.userLogo.image;
    clampRasterLayer(layers.userLogo, im.naturalWidth, im.naturalHeight);
  }
  if (layers.strapline.enabled && brandImages.strapline && layers.strapline.width > 0) {
    const m0 = straplineDrawMetrics(layers.strapline, brandImages.strapline, brandImages.straplineTrim);
    if (m0) {
      let dw = m0.dw;
      let dh = m0.dh;
      let s = 1;
      if (dw > innerW) s = Math.min(s, innerW / dw);
      if (dh > innerH) s = Math.min(s, innerH / dh);
      if (s < 1) {
        const nw = Math.max(10, Math.round(layers.strapline.width * s));
        if (nw !== layers.strapline.width) widthsChanged = true;
        layers.strapline.width = nw;
      }
      const m = straplineDrawMetrics(layers.strapline, brandImages.strapline, brandImages.straplineTrim);
      if (m) {
        layers.strapline.x = Math.round(clampNum(layers.strapline.x, pad, Math.max(pad, cw - pad - m.dw)));
        layers.strapline.y = Math.round(clampNum(layers.strapline.y, pad, Math.max(pad, ch - pad - m.dh)));
      }
    }
  }

  const brand = brandImages;
  if (layers.headline.enabled && layers.headline.text.trim()) {
    ctx.font = `${layers.headline.fontSize}px ${INSTRUMENT_SERIF}`;
    const rects = getLayerRects(ctx, cw, ch, layers, brand);
    const hr = rects.headline;
    if (hr) {
      const targetLeft = clampNum(hr.x, pad, Math.max(pad, cw - pad - hr.w));
      const targetTop = clampNum(hr.y, pad, Math.max(pad, ch - pad - hr.h));
      layers.headline.x += Math.round(targetLeft - hr.x);
      layers.headline.y += Math.round(targetTop - hr.y);
    }
  }

  if (layers.marketData.enabled && layers.marketData.options.length > 0) {
    const rect = measureMarketDataRect(ctx, layers);
    if (rect) {
      const nx = clampNum(rect.x, pad, Math.max(pad, cw - pad - rect.w));
      const ny = clampNum(rect.y, pad, Math.max(pad, ch - pad - rect.h));
      layers.marketData.x += Math.round(nx - rect.x);
      layers.marketData.y += Math.round(ny - rect.y);
    }
  }

  if (layers.cta.enabled && layers.cta.text.trim()) {
    const rect = measureCtaRect(ctx, layers);
    if (rect) {
      const nx = clampNum(rect.x, pad, Math.max(pad, cw - pad - rect.w));
      const ny = clampNum(rect.y, pad, Math.max(pad, ch - pad - rect.h));
      layers.cta.x += Math.round(nx - rect.x);
      layers.cta.y += Math.round(ny - rect.y);
    }
  }

  return widthsChanged;
}

/**
 * Draw optional graphics layers on top of the effect (user logo, strapline, Delphi logo, headline, …).
 */
function drawGraphicsLayers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layers: GraphicsLayers,
  brandImages: BrandLayerImages
): void {
  // User logo
  if (layers.userLogo.enabled && layers.userLogo.image && layers.userLogo.width > 0) {
    const img = layers.userLogo.image;
    const scale = layers.userLogo.width / img.naturalWidth;
    const dw = layers.userLogo.width;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, layers.userLogo.x, layers.userLogo.y, dw, dh);
  }
  if (layers.delphiSymbol.enabled && brandImages.delphiSymbol && layers.delphiSymbol.width > 0) {
    const img = brandImages.delphiSymbol;
    const scale = layers.delphiSymbol.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, layers.delphiSymbol.x, layers.delphiSymbol.y, layers.delphiSymbol.width, dh);
  }
  // Make Your Market strapline (cropped to letter alpha)
  if (layers.strapline.enabled && brandImages.strapline && layers.strapline.width > 0) {
    const img = brandImages.strapline;
    const m = straplineDrawMetrics(layers.strapline, img, brandImages.straplineTrim);
    if (m) {
      ctx.drawImage(img, m.sx, m.sy, m.sw, m.sh, layers.strapline.x, layers.strapline.y, m.dw, m.dh);
    }
  }
  // Delphi logo
  if (layers.delphiLogo.enabled && brandImages.delphiLogo && layers.delphiLogo.width > 0) {
    const img = brandImages.delphiLogo;
    const scale = layers.delphiLogo.width / img.naturalWidth;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, layers.delphiLogo.x, layers.delphiLogo.y, layers.delphiLogo.width, dh);
  }
  // Headline (Instrument Serif, multi-line: split on newline, blank lines add spacing)
  if (layers.headline.enabled && layers.headline.text.trim()) {
    const align = layers.headline.textAlign ?? 'left';
    ctx.font = `${layers.headline.fontSize}px ${INSTRUMENT_SERIF}`;
    ctx.fillStyle = layers.headline.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = align;
    const lineHeight = layers.headline.fontSize * 1.3;
    const lines = layers.headline.text.split('\n').map((s) => s.trim());
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) ctx.fillText(lines[i], layers.headline.x, layers.headline.y + i * lineHeight);
    }
    ctx.textAlign = 'left';
  }
  // Market data overlay
  if (layers.marketData.enabled && layers.marketData.options.length > 0) {
    drawMarketDataOverlay(ctx, layers.marketData);
  }
  // CTA button
  if (layers.cta.enabled && layers.cta.text.trim()) {
    drawCtaButton(ctx, layers.cta);
  }
}

function drawCtaButton(
  ctx: CanvasRenderingContext2D,
  cta: GraphicsLayers['cta']
): void {
  ctx.save();
  ctx.font = `bold ${cta.fontSize}px ${FRAGMENT_MONO}`;
  const tw = ctx.measureText(cta.text).width;
  const bw = tw + cta.paddingH * 2;
  const bh = cta.fontSize + cta.paddingV * 2;
  const r = Math.min(cta.borderRadius, bh / 2);

  ctx.fillStyle = cta.bgColor;
  ctx.beginPath();
  ctx.moveTo(cta.x + r, cta.y);
  ctx.lineTo(cta.x + bw - r, cta.y);
  ctx.quadraticCurveTo(cta.x + bw, cta.y, cta.x + bw, cta.y + r);
  ctx.lineTo(cta.x + bw, cta.y + bh - r);
  ctx.quadraticCurveTo(cta.x + bw, cta.y + bh, cta.x + bw - r, cta.y + bh);
  ctx.lineTo(cta.x + r, cta.y + bh);
  ctx.quadraticCurveTo(cta.x, cta.y + bh, cta.x, cta.y + bh - r);
  ctx.lineTo(cta.x, cta.y + r);
  ctx.quadraticCurveTo(cta.x, cta.y, cta.x + r, cta.y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = cta.textColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(cta.text, cta.x + cta.paddingH, cta.y + bh / 2);
  ctx.restore();
}

function drawMarketDataOverlay(
  ctx: CanvasRenderingContext2D,
  md: GraphicsLayers['marketData']
): void {
  const layout = buildMarketOverlayLayout(ctx, md);
  const { fs, pad, chipH, sectionPad, sentimentTitleH, barH, gapAfterTitle, gapAfterChip, gapBeforeDisclaimer } = layout;
  const totalW = layout.totalW;
  const totalH = layout.totalH;

  ctx.save();
  const radius = fs * 0.42;
  ctx.fillStyle = 'rgba(245, 245, 243, 0.95)';
  ctx.beginPath();
  ctx.roundRect(md.x, md.y, totalW, totalH, radius);
  ctx.fill();
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  let curY = md.y + pad;
  const leftX = md.x + pad;

  if (layout.titleLines.length > 0) {
    ctx.font = `600 ${Math.round(fs * 1.25)}px 'Figtree', sans-serif`;
    ctx.fillStyle = 'rgba(36, 36, 36, 0.96)';
    ctx.textBaseline = 'top';
    for (const line of layout.titleLines) {
      ctx.fillText(line, leftX, curY);
      curY += layout.titleLineH;
    }
    curY += gapAfterTitle;
  }

  if (md.volume) {
    ctx.font = `${Math.round(fs * 0.82)}px ${FRAGMENT_MONO}`;
    const chipText = md.volume;
    const chipWReal = ctx.measureText(chipText).width + fs * 1.1;
    const chipRadius = fs * 0.16;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.beginPath();
    ctx.roundRect(leftX, curY, chipWReal, chipH, chipRadius);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.55)';
    ctx.textBaseline = 'middle';
    ctx.fillText(chipText, leftX + fs * 0.55, curY + chipH / 2);
    curY += chipH + gapAfterChip;
  }

  const sentimentX = leftX;
  const sentimentY = curY;
  const sentimentW = totalW - pad * 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.beginPath();
  ctx.roundRect(sentimentX, sentimentY, sentimentW, layout.sentimentBlockH, fs * 0.26);
  ctx.fill();

  const contentX = sentimentX + sectionPad;
  let contentY = sentimentY + sectionPad;
  const barW = sentimentW - sectionPad * 2;
  const barX = contentX;
  const palette = ['#367CD6', '#45C38C', '#F05D67', '#F3B295'];
  const pctStr = (p: number): string => `${Math.round(p * 100)}%`;

  if (layout.multiOutcomeMode && layout.topTwoRanked.length > 0) {
    ctx.font = `${Math.round(fs * 0.72)}px ${FRAGMENT_MONO}`;
    ctx.fillStyle = 'rgba(30, 30, 30, 0.72)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('SENTIMENT', contentX, contentY);
    if (layout.overflowMoreCount > 0) {
      ctx.fillStyle = 'rgba(30, 30, 30, 0.45)';
      ctx.textAlign = 'right';
      ctx.fillText(`(+${layout.overflowMoreCount} More)`, contentX + barW, contentY);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(30, 30, 30, 0.72)';
    }

    contentY += sentimentTitleH + fs * 0.45;
    const gapBetweenStacks = fs * 0.55;

    const barRadius = barH / 2;
    for (let ti = 0; ti < layout.topTwoRanked.length; ti++) {
      const opt = layout.topTwoRanked[ti];
      const barY = contentY;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, barRadius);
      ctx.fill();

      const fillW = Math.max(0, Math.round(barW * opt.probability));
      if (fillW > 0) {
        ctx.fillStyle = palette[ti % palette.length];
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillW, barH, Math.min(barRadius, fillW / 2));
        ctx.fill();
      }

      contentY += barH + fs * 0.38;
      ctx.font = `${Math.round(fs * 0.82)}px ${FRAGMENT_MONO}`;
      ctx.fillStyle = 'rgba(28, 28, 28, 0.72)';
      const percentText = pctStr(opt.probability);
      ctx.textAlign = 'left';
      ctx.fillText(opt.label, contentX, contentY);
      ctx.textAlign = 'right';
      ctx.fillText(percentText, contentX + barW, contentY);
      ctx.textAlign = 'left';

      contentY += layout.legendLineH;
      if (ti === 0 && layout.topTwoRanked.length > 1) contentY += gapBetweenStacks;
    }
  } else {
    ctx.font = `${Math.round(fs * 0.72)}px ${FRAGMENT_MONO}`;
    ctx.fillStyle = 'rgba(30, 30, 30, 0.7)';
    ctx.textBaseline = 'top';
    ctx.fillText('SENTIMENT', contentX, contentY);
    contentY += sentimentTitleH + fs * 0.55;

    const barY = contentY;
    const barRadius = barH / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barRadius);
    ctx.fill();

    const points = layout.points;
    let cursor = 0;
    for (let i = 0; i < points.length; i++) {
      const opt = points[i];
      const segW = i === points.length - 1 ? Math.max(0, barW - cursor) : Math.max(0, Math.round(barW * opt.probability));
      if (segW <= 0) continue;
      ctx.fillStyle = palette[i % palette.length];
      ctx.beginPath();
      ctx.roundRect(barX + cursor, barY, segW, barH, Math.min(barRadius, segW / 2));
      ctx.fill();
      cursor += segW;
    }

    contentY += barH + fs * 0.65;
    ctx.font = `${Math.round(fs * 0.82)}px ${FRAGMENT_MONO}`;
    ctx.fillStyle = 'rgba(28, 28, 28, 0.72)';
    ctx.textBaseline = 'top';

    if (points.length === 2) {
      const left = points[0];
      const right = points[1];
      const leftText = `${pctStr(left.probability)} ${left.label}`;
      const rightText = `${pctStr(right.probability)} ${right.label}`;
      ctx.textAlign = 'left';
      ctx.fillText(leftText, contentX, contentY);
      ctx.textAlign = 'right';
      ctx.fillText(rightText, contentX + barW, contentY);
      ctx.textAlign = 'left';
    } else if (points.length === 1) {
      const only = points[0];
      ctx.fillText(`${pctStr(only.probability)} ${only.label}`, contentX, contentY);
    } else if (points.length === 0) {
      ctx.fillStyle = 'rgba(28, 28, 28, 0.52)';
      ctx.fillText('No sentiment data available', contentX, contentY);
    }
  }

  const disclaimerY = sentimentY + layout.sentimentBlockH + gapBeforeDisclaimer;
  ctx.font = `${Math.round(fs * 0.58)}px ${FRAGMENT_MONO}`;
  ctx.fillStyle = 'rgba(28, 28, 28, 0.42)';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (let i = 0; i < layout.disclaimerLines.length; i++) {
    ctx.fillText(layout.disclaimerLines[i], contentX, disclaimerY + i * layout.disclaimerLineH);
  }

  ctx.restore();
}

function drawSelectionUI(
  ctx: CanvasRenderingContext2D,
  rect: LayerRect,
  selectedLayer?: 'headline' | 'delphiLogo' | 'delphiSymbol' | 'strapline' | 'userLogo' | 'marketData' | 'cta' | null
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(54, 124, 214, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
  ctx.setLineDash([]);

  // Headline is resized only via the panel slider; no corner handles to avoid resizing the wrong layer
  if (selectedLayer !== 'headline') {
    const corners = [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x, y: rect.y + rect.h },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ];
    for (const c of corners) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeStyle = 'rgba(54, 124, 214, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }
  ctx.restore();
}

/** Full-span dotted blue guides when a dragged layer snaps to canvas centre (vertical / horizontal). */
function drawCenterAlignmentGuides(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  showVertical: boolean,
  showHorizontal: boolean
): void {
  if (!showVertical && !showHorizontal) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(54, 124, 214, 0.9)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  if (showVertical) {
    const x = Math.floor(w / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  if (showHorizontal) {
    const y = Math.floor(h / 2) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

type Corner = 'tl' | 'tr' | 'bl' | 'br';

function hitTestHandle(cx: number, cy: number, rect: LayerRect): Corner | null {
  const corners: { corner: Corner; x: number; y: number }[] = [
    { corner: 'tl', x: rect.x, y: rect.y },
    { corner: 'tr', x: rect.x + rect.w, y: rect.y },
    { corner: 'bl', x: rect.x, y: rect.y + rect.h },
    { corner: 'br', x: rect.x + rect.w, y: rect.y + rect.h },
  ];
  for (const c of corners) {
    if (Math.abs(cx - c.x) <= HANDLE_HIT && Math.abs(cy - c.y) <= HANDLE_HIT) {
      return c.corner;
    }
  }
  return null;
}

function getCornerCursor(corner: Corner): string {
  if (corner === 'tl' || corner === 'br') return 'nwse-resize';
  return 'nesw-resize';
}

/**
 * Load image from file, draw to canvas (full colour), return canvas.
 */
function loadImageToCanvas(
  file: File,
  maxSize: number
): Promise<{ canvas: HTMLCanvasElement; originalWidth: number; originalHeight: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxSize || h > maxSize) {
        const s = maxSize / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve({
        canvas,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

async function loadImageFromUrl(
  url: string,
  maxSize: number
): Promise<HTMLCanvasElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      let { width: w, height: h } = img;
      if (w > maxSize || h > maxSize) {
        const s = maxSize / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to decode image'));
    };
    img.src = blobUrl;
  });
}

/**
 * Create the Delphi duotone (vertical blinds) generator UI and append to container.
 * Optionally pass initial config (e.g. from JSON); otherwise uses defaults.
 */
const DELPHI_LOGO_PATH = `${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/images/logos/Delphi-Logos-Wht/Delphi-logo-set_delphi-logotype-wht.svg`;
const DELPHI_SYMBOL_PATH = `${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/images/logos/Delphi-Logos-Wht/Delphi-Symbol-Wht.svg`;
const STRAPLINE_PATH = `${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/images/logos/Delphi-Logos-Wht/Delphi-Strapline-Wht.svg`;

export function createDelphiImageryPanel(
  container: HTMLElement,
  initialConfig: DelphiEffectConfig | null = null
): void {
  const config = { ...mergeWithDefaults(initialConfig) };
  const graphicsLayers = createDefaultGraphicsLayers();
  let delphiLogoImage: HTMLImageElement | null = null;
  const delphiLogoImg = new Image();
  delphiLogoImg.onload = () => {
    void delphiLogoImg.decode().catch(() => undefined).finally(() => {
      delphiLogoImage = delphiLogoImg;
      drawPreview();
    });
  };
  delphiLogoImg.src = DELPHI_LOGO_PATH;

  let delphiSymbolImage: HTMLImageElement | null = null;
  const delphiSymbolImg = new Image();
  delphiSymbolImg.onload = () => {
    void delphiSymbolImg.decode().catch(() => undefined).finally(() => {
      delphiSymbolImage = delphiSymbolImg;
      drawPreview();
    });
  };
  delphiSymbolImg.src = DELPHI_SYMBOL_PATH;

  let straplineImage: HTMLImageElement | null = null;
  let straplineSourceTrim: StraplineSourceTrim | null = null;
  const straplineImg = new Image();
  straplineImg.onload = () => {
    void straplineImg.decode().catch(() => undefined).finally(() => {
      straplineImage = straplineImg;
      straplineSourceTrim = computeStraplineSourceTrim(straplineImg);
      drawPreview();
    });
  };
  straplineImg.src = STRAPLINE_PATH;

  if (!document.getElementById('delphi-slider-style')) {
    const style = document.createElement('style');
    style.id = 'delphi-slider-style';
    style.textContent = [
      'input[type="range"]::-webkit-slider-thumb { background: #FBA89D; }',
      'input[type="range"]::-moz-range-thumb { background: #FBA89D; }',
    ].join('\n');
    document.head.appendChild(style);
  }
  if (!document.getElementById('delphi-imagery-ui-style')) {
    const uiStyle = document.createElement('style');
    uiStyle.id = 'delphi-imagery-ui-style';
    uiStyle.textContent = `
      .delphi-controls-col {
        scrollbar-width: thin;
        scrollbar-color: rgba(90, 90, 90, 0.5) rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.06);
      }
      .delphi-controls-col::-webkit-scrollbar { width: 10px; }
      .delphi-controls-col::-webkit-scrollbar-thumb {
        background: rgba(90, 90, 90, 0.4);
        border-radius: 5px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      .delphi-controls-col::-webkit-scrollbar-track {
        background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.05);
        border-radius: 5px;
      }
    `;
    document.head.appendChild(uiStyle);
  }

  const mobileLayout = isMobile();
  const workshopRoot = document.createElement('div');
  /* Fill creator-tools shell: row stretches; only controls column scrolls. overflow:hidden avoids
   * nav chip overlapping canvas when flex would otherwise collapse this box. */
  workshopRoot.style.cssText = mobileLayout
    ? `
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 24px;
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `
    : `
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 28px;
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `;

  const canvasColumn = document.createElement('div');
  canvasColumn.style.cssText = mobileLayout
    ? `
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 0 auto;
    width: 100%;
    max-height: min(42vh, 480px);
    min-height: 0;
    overflow: hidden;
    flex-shrink: 0;
  `
    : `
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 1 auto;
    width: min(100%, 500px);
    max-width: 46%;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
    overflow: hidden;
    align-self: stretch;
  `;

  const placeholderMsg: { setPlain(text: string): void; setDefault(): void } = {
    setPlain() {},
    setDefault() {},
  };
  const libraryUI: { open(): void } = {
    open() {},
  };
  const graphicsControlSync: { refresh(): void } = {
    refresh() {},
  };

  const controlsColumn = document.createElement('div');
  controlsColumn.className = 'delphi-controls-col';
  controlsColumn.style.cssText = mobileLayout
    ? `
    display: flex;
    flex-direction: column;
    gap: 28px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    scrollbar-gutter: stable;
    position: relative;
    -webkit-overflow-scrolling: touch;
  `
    : `
    display: flex;
    flex-direction: column;
    gap: 28px;
    flex: 1;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
    scrollbar-gutter: stable;
    position: relative;
    -webkit-overflow-scrolling: touch;
  `;

  function isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Canvas preview = image upload drop zone (drag-and-drop or click to browse)
  const previewWrap = document.createElement('div');
  previewWrap.style.cssText = `
    border: 2px dashed rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.2);
    border-radius: ${PREVIEW_CORNER_RADIUS}px;
    overflow: hidden;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    flex: 1 1 0;
    min-height: 200px;
    max-height: ${mobileLayout ? 'min(38vh, 340px)' : 'min(56vh, 520px)'};
    position: relative;
    transition: border-color 0.2s ease, background 0.2s ease;
    cursor: pointer;
    max-width: 100%;
    box-sizing: border-box;
  `;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.cssText = 'position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;';
  const placeholder = document.createElement('div');
  placeholder.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  `;
  const placeholderInner = document.createElement('div');
  placeholderInner.style.cssText = 'text-align: center; max-width: min(100%, 320px);';
  const emptyStatePStyle = `
    font-family: 'Fragment Mono', monospace;
    font-size: 9pt;
    color: var(--fg);
    opacity: 0.5;
    text-align: center;
    margin: 0;
  `;
  placeholderMsg.setPlain = (text: string) => {
    placeholderInner.replaceChildren();
    const p = document.createElement('p');
    p.textContent = text;
    p.style.cssText = emptyStatePStyle;
    placeholderInner.appendChild(p);
  };
  placeholderMsg.setDefault = () => {
    placeholderInner.replaceChildren();
    const p = document.createElement('p');
    p.style.cssText = emptyStatePStyle;
    const t1 = document.createTextNode('Drop an image here, click to browse or ');
    const libBtn = document.createElement('button');
    libBtn.type = 'button';
    libBtn.textContent = 'click here';
    libBtn.setAttribute('aria-haspopup', 'dialog');
    libBtn.style.cssText = `
      font: inherit;
      color: inherit;
      opacity: inherit;
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 2px;
    `;
    libBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      libraryUI.open();
    });
    const t2 = document.createTextNode(' to view library.');
    p.append(t1, libBtn, t2);
    placeholderInner.appendChild(p);
  };
  placeholderMsg.setDefault();
  placeholder.appendChild(placeholderInner);
  const previewInner = document.createElement('div');
  previewInner.style.cssText = `
    padding: ${PREVIEW_CORNER_RADIUS}px;
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    flex: 1 1 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `;
  const previewCanvas = document.createElement('canvas');
  previewCanvas.style.cssText = 'max-width: 100%; display: block;';
  previewInner.appendChild(previewCanvas);
  previewWrap.appendChild(input);
  previewWrap.appendChild(placeholder);
  previewWrap.appendChild(previewInner);
  canvasColumn.appendChild(previewWrap);

  const previewControlsRow = document.createElement('div');
  previewControlsRow.style.cssText =
    'display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 4px; flex-shrink: 0;';
  previewControlsRow.style.display = 'none';

  const sizeLabel = document.createElement('span');
  sizeLabel.textContent = 'Output size';
  sizeLabel.style.cssText =
    'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.55;';
  const sizeSelect = document.createElement('select');
  sizeSelect.setAttribute('aria-label', 'Output canvas size');
  sizeSelect.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 8pt;
    color: var(--fg);
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.06);
    border: ${BORDER};
    border-radius: 4px;
    padding: 6px 8px;
    cursor: pointer;
    max-width: min(440px, 100%);
  `;
  for (const p of OUTPUT_SIZE_PRESETS) {
    const opt = document.createElement('option');
    opt.value = `${p.w}x${p.h}`;
    opt.textContent = p.label;
    sizeSelect.appendChild(opt);
  }
  sizeSelect.value = '0x0';
  sizeSelect.disabled = true;
  previewControlsRow.appendChild(sizeLabel);
  previewControlsRow.appendChild(sizeSelect);

  const replaceLink = document.createElement('button');
  replaceLink.type = 'button';
  replaceLink.textContent = 'Replace image';
  replaceLink.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 8pt;
    color: var(--fg);
    opacity: 0.6;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08);
    border: ${BORDER};
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
  `;
  previewControlsRow.appendChild(replaceLink);

  const viewLibraryBtn = document.createElement('button');
  viewLibraryBtn.type = 'button';
  viewLibraryBtn.textContent = 'View library';
  viewLibraryBtn.setAttribute('aria-haspopup', 'dialog');
  viewLibraryBtn.style.cssText = replaceLink.style.cssText;
  previewControlsRow.appendChild(viewLibraryBtn);

  const exportLink = document.createElement('button');
  exportLink.type = 'button';
  exportLink.textContent = 'Export PNG';
  exportLink.style.cssText = replaceLink.style.cssText;
  exportLink.addEventListener('click', () => {
    if (!exportCanvas) return;
    const link = document.createElement('a');
    link.download = 'delphi-duotone.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  });
  previewControlsRow.appendChild(exportLink);
  canvasColumn.appendChild(previewControlsRow);

  previewWrap.addEventListener('click', () => {
    if (!sourceCanvas) {
      input.click();
    }
  });

  replaceLink.addEventListener('click', () => {
    input.click();
  });

  viewLibraryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    libraryUI.open();
  });

  previewWrap.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    previewWrap.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.45)';
    previewWrap.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.06)';
  });
  previewWrap.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (!previewWrap.contains(e.relatedTarget as Node)) {
      previewWrap.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.2)';
      previewWrap.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02)';
    }
  });
  previewWrap.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    previewWrap.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.2)';
    previewWrap.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02)';
    const file = e.dataTransfer?.files?.[0];
    if (!file || !isImageFile(file)) return;
    handleImageFile(file);
  });

  sizeSelect.addEventListener('change', () => {
    if (!masterCanvas) return;
    const prevW = sourceCanvas?.width ?? 0;
    const prevH = sourceCanvas?.height ?? 0;
    const [tw, th] = sizeSelect.value.split('x').map((n) => parseInt(n, 10));
    if (tw === 0) {
      sourceCanvas = cloneCanvas(masterCanvas);
    } else {
      sourceCanvas = scaleCanvasCover(masterCanvas, tw, th);
    }
    const newW = sourceCanvas.width;
    const newH = sourceCanvas.height;
    if (prevW > 0 && prevH > 0 && (prevW !== newW || prevH !== newH)) {
      scaleGraphicsLayerLayout(graphicsLayers, prevW, prevH, newW, newH);
      graphicsControlSync.refresh();
    }
    drawPreview();
  });

  let sourceCanvas: HTMLCanvasElement | null = null;
  /** Unscaled upload; used to re-apply output size presets. */
  let masterCanvas: HTMLCanvasElement | null = null;
  let exportCanvas: HTMLCanvasElement | null = null;

  function syncPreviewCanvasDisplaySize(): void {
    if (!sourceCanvas) return;
    if (previewCanvas.style.display === 'none') return;
    const pw = sourceCanvas.width;
    const ph = sourceCanvas.height;
    if (pw < 1 || ph < 1) return;
    const innerPad = PREVIEW_CORNER_RADIUS * 2;
    const innerW = Math.max(1, Math.floor(previewInner.clientWidth - innerPad - 3));
    if (innerW < 8) return;
    const innerH = previewInner.clientHeight - innerPad;
    const scaleW = innerW / pw;
    const scaleH = innerH > 24 ? innerH / ph : Number.POSITIVE_INFINITY;
    const scale = Math.min(1, scaleW, scaleH);
    const dw = Math.max(1, Math.floor(pw * scale));
    const dh = Math.max(1, Math.floor(ph * scale));
    previewCanvas.style.width = `${dw}px`;
    previewCanvas.style.height = `${dh}px`;
  }

  const previewLayoutObserver = new ResizeObserver(() => {
    syncPreviewCanvasDisplaySize();
  });
  previewLayoutObserver.observe(previewInner);
  previewLayoutObserver.observe(previewWrap);

  async function handleImageFile(file: File): Promise<void> {
    try {
      const { canvas } = await loadImageToCanvas(file, MAX_PREVIEW_PX);
      applySourceCanvas(canvas);
    } catch {
      masterCanvas = null;
      sizeSelect.disabled = true;
      placeholderMsg.setPlain('Could not load image. Try another file.');
      placeholder.style.display = 'flex';
      previewCanvas.style.display = 'none';
      previewCanvas.style.width = '';
      previewCanvas.style.height = '';
      previewControlsRow.style.display = 'none';
      previewWrap.style.cursor = 'pointer';
      previewWrap.style.minHeight = '200px';
      previewWrap.style.borderStyle = 'dashed';
    }
  }

  type DraggingLayer = 'headline' | 'delphiLogo' | 'delphiSymbol' | 'strapline' | 'userLogo' | 'marketData' | 'cta' | null;
  let draggingLayer: DraggingLayer = null;
  let dragStartCanvas = { x: 0, y: 0 };
  let dragStartLayer = { x: 0, y: 0 };
  /** Active centre-alignment guides while dragging (after magnetic snap). */
  let centerSnapGuides = { v: false, h: false };
  /** Previous frame: which guides were on (for one-shot haptic on snap-in). */
  let centerSnapPrevEngaged = { v: false, h: false };

  let selectedLayer: DraggingLayer = null;
  let isResizing = false;
  let resizeCorner: Corner | null = null;
  let resizeStartRect: LayerRect | null = null;
  let resizeStartValue = 0;

  /** Map screen coords to bitmap pixels using layout box (handles subpixel / non-uniform CSS scale in Chrome). */
  function clientXYToBitmapXY(clientX: number, clientY: number): { x: number; y: number } {
    const rect = previewCanvas.getBoundingClientRect();
    const rw = rect.width;
    const rh = rect.height;
    if (rw < 1e-6 || rh < 1e-6) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rw) * previewCanvas.width,
      y: ((clientY - rect.top) / rh) * previewCanvas.height,
    };
  }

  function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    return clientXYToBitmapXY(e.clientX, e.clientY);
  }

  function hitTestLayer(canvasX: number, canvasY: number): DraggingLayer {
    const ctx = previewCanvas.getContext('2d');
    if (!ctx || !sourceCanvas) return null;
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const rects = getLayerRects(ctx, w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
    // Prefer headline over marketData when they overlap (headline is the main text control)
    if (rects.cta && pointInRect(canvasX, canvasY, rects.cta)) return 'cta';
    if (rects.headline && pointInRect(canvasX, canvasY, rects.headline)) return 'headline';
    if (rects.marketData && pointInRect(canvasX, canvasY, rects.marketData)) return 'marketData';
    if (rects.delphiLogo && pointInRect(canvasX, canvasY, rects.delphiLogo)) return 'delphiLogo';
    if (rects.delphiSymbol && pointInRect(canvasX, canvasY, rects.delphiSymbol)) return 'delphiSymbol';
    if (rects.strapline && pointInRect(canvasX, canvasY, rects.strapline)) return 'strapline';
    if (rects.userLogo && pointInRect(canvasX, canvasY, rects.userLogo)) return 'userLogo';
    return null;
  }

  function drawPreview(): void {
    if (!sourceCanvas) return;
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    previewCanvas.width = w;
    previewCanvas.height = h;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    renderVerticalBlindsDuotone(sourceCanvas, ctx, config);
    // Apply default positions for enabled layers still at (0,0)
    if (graphicsLayers.headline.enabled && graphicsLayers.headline.x === 0 && graphicsLayers.headline.y === 0) {
      applyDefaultPosition('headline', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.delphiLogo.enabled && graphicsLayers.delphiLogo.x === 0 && graphicsLayers.delphiLogo.y === 0) {
      applyDefaultPosition('delphiLogo', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.delphiSymbol.enabled && graphicsLayers.delphiSymbol.x === 0 && graphicsLayers.delphiSymbol.y === 0) {
      applyDefaultPosition('delphiSymbol', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.strapline.enabled && graphicsLayers.strapline.x === 0 && graphicsLayers.strapline.y === 0) {
      applyDefaultPosition('strapline', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.userLogo.enabled && graphicsLayers.userLogo.x === 0 && graphicsLayers.userLogo.y === 0) {
      applyDefaultPosition('userLogo', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.marketData.enabled && graphicsLayers.marketData.x === 0 && graphicsLayers.marketData.y === 0) {
      applyDefaultPosition('marketData', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    if (graphicsLayers.cta.enabled && graphicsLayers.cta.x === 0 && graphicsLayers.cta.y === 0) {
      applyDefaultPosition('cta', w, h, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim }, ctx);
    }
    const brandBundle = {
      delphiLogo: delphiLogoImage,
      delphiSymbol: delphiSymbolImage,
      strapline: straplineImage,
      straplineTrim: straplineSourceTrim,
    };
    if (clampGraphicsLayersToCanvasBounds(ctx, w, h, graphicsLayers, brandBundle)) {
      graphicsControlSync.refresh();
    }
    drawGraphicsLayers(ctx, w, h, graphicsLayers, brandBundle);
    if (selectedLayer) {
      const rects = getLayerRects(ctx, w, h, graphicsLayers, brandBundle);
      const selRect = rects[selectedLayer];
      if (selRect) drawSelectionUI(ctx, selRect, selectedLayer);
    }
    if (draggingLayer) {
      const rectsAlign = getLayerRects(ctx, w, h, graphicsLayers, brandBundle);
      const rAlign = rectsAlign[draggingLayer];
      let alignV = centerSnapGuides.v;
      let alignH = centerSnapGuides.h;
      if (rAlign) {
        const midX = w / 2;
        const midY = h / 2;
        const eps = centerSnapAlignedEps(w, h);
        const magnet = effectiveCenterSnapMagnetPx(w, h, previewCanvas);
        const loose = Math.max(eps, magnet * 0.35, 6);
        const postV = Math.abs(rAlign.x + rAlign.w / 2 - midX) <= loose;
        const postH = Math.abs(rAlign.y + rAlign.h / 2 - midY) <= loose;
        alignV = alignV || postV;
        alignH = alignH || postH;
      }
      if (alignV || alignH) {
        drawCenterAlignmentGuides(ctx, w, h, alignV, alignH);
      }
    }
    previewCanvas.style.display = 'block';
    placeholder.style.display = 'none';
    previewControlsRow.style.display = 'flex';
    previewWrap.style.cursor = 'default';
    previewWrap.style.minHeight = '0';
    previewWrap.style.borderStyle = 'solid';
    void previewInner.offsetWidth;
    syncPreviewCanvasDisplaySize();
    requestAnimationFrame(() => {
      syncPreviewCanvasDisplaySize();
    });
    exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const exportCtx = exportCanvas.getContext('2d')!;
    renderVerticalBlindsDuotone(sourceCanvas, exportCtx, config);
    drawGraphicsLayers(exportCtx, w, h, graphicsLayers, brandBundle);
  }

  function applySourceCanvas(canvas: HTMLCanvasElement): void {
    const prevSource = sourceCanvas;
    const oldW = prevSource?.width ?? 0;
    const oldH = prevSource?.height ?? 0;
    const replacing = prevSource !== null && masterCanvas !== null;

    masterCanvas = cloneCanvas(canvas);
    sizeSelect.disabled = false;
    if (!replacing) {
      sizeSelect.value = '0x0';
    }

    const [tw, th] = sizeSelect.value.split('x').map((n) => parseInt(n, 10));
    if (tw === 0) {
      sourceCanvas = canvas;
    } else {
      sourceCanvas = scaleCanvasCover(masterCanvas, tw, th);
    }

    let scaledLayout = false;
    if (replacing && oldW > 0 && oldH > 0) {
      const newW = sourceCanvas.width;
      const newH = sourceCanvas.height;
      if (oldW !== newW || oldH !== newH) {
        scaleGraphicsLayerLayout(graphicsLayers, oldW, oldH, newW, newH);
        scaledLayout = true;
      }
    }

    drawPreview();
    if (scaledLayout) {
      graphicsControlSync.refresh();
    }
  }

  const libraryModalRoot = document.createElement('div');
  libraryModalRoot.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    isolation: isolate;
    pointer-events: auto;
  `;
  libraryModalRoot.setAttribute('role', 'dialog');
  libraryModalRoot.setAttribute('aria-modal', 'true');
  libraryModalRoot.setAttribute('aria-label', 'Image library');

  const libraryModalBackdrop = document.createElement('div');
  libraryModalBackdrop.style.cssText = `
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 0;
  `;

  const libraryModalPanel = document.createElement('div');
  libraryModalPanel.style.cssText = `
    position: relative;
    z-index: 1;
    max-width: 640px;
    width: 100%;
    max-height: min(80vh, 560px);
    display: flex;
    flex-direction: column;
    background-color: var(--bg);
    border: ${BORDER};
    border-radius: 10px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    overflow: hidden;
  `;
  libraryModalPanel.addEventListener('click', (e) => e.stopPropagation());

  const libraryModalHeader = document.createElement('div');
  libraryModalHeader.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: ${BORDER};
    flex-shrink: 0;
    background-color: var(--bg);
  `;
  const libraryModalTitle = document.createElement('h2');
  libraryModalTitle.textContent = 'Image library';
  libraryModalTitle.style.cssText = `
    font-family: 'Instrument Serif', serif;
    font-size: 14pt;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.9;
    margin: 0;
  `;
  const libraryModalClose = document.createElement('button');
  libraryModalClose.type = 'button';
  libraryModalClose.textContent = 'Close';
  libraryModalClose.setAttribute('aria-label', 'Close image library');
  libraryModalClose.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 8pt;
    color: var(--fg);
    opacity: 0.65;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08);
    border: ${BORDER};
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
  `;

  const libraryModalScroll = document.createElement('div');
  libraryModalScroll.style.cssText = `
    padding: 16px 18px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    background-color: var(--bg);
  `;
  const libraryGrid = document.createElement('div');
  libraryGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
    gap: 12px;
  `;
  const libraryEmpty = document.createElement('p');
  libraryEmpty.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 8pt;
    color: var(--fg);
    opacity: 0.45;
    margin: 0;
    line-height: 1.5;
  `;
  libraryEmpty.textContent =
    'No library images yet. Add entries to IMAGERY_LIBRARY_ITEMS in imagery-delphi.ts (paths under public/ or full URLs), then rebuild.';

  libraryModalHeader.append(libraryModalTitle, libraryModalClose);
  libraryModalScroll.append(libraryGrid, libraryEmpty);
  libraryModalPanel.append(libraryModalHeader, libraryModalScroll);
  libraryModalRoot.append(libraryModalBackdrop, libraryModalPanel);
  document.body.appendChild(libraryModalRoot);

  let libraryModalKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  function closeImageryLibraryModal(): void {
    libraryModalRoot.style.display = 'none';
    if (libraryModalKeyHandler) {
      document.removeEventListener('keydown', libraryModalKeyHandler);
      libraryModalKeyHandler = null;
    }
  }

  function rebuildImageryLibraryGrid(): void {
    libraryGrid.replaceChildren();
    if (IMAGERY_LIBRARY_ITEMS.length === 0) {
      libraryEmpty.style.display = 'block';
      return;
    }
    libraryEmpty.style.display = 'none';
    for (const item of IMAGERY_LIBRARY_ITEMS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
        padding: 6px;
        background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.06);
        border: ${BORDER};
        border-radius: 6px;
        cursor: pointer;
        color: var(--fg);
      `;
      const thumb = document.createElement('div');
      thumb.style.cssText = `
        aspect-ratio: 1;
        border-radius: 4px;
        background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08);
        overflow: hidden;
      `;
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      img.src = resolvePublicAssetUrl(item.src);
      thumb.appendChild(img);
      const cap = document.createElement('span');
      cap.textContent = item.label;
      cap.style.cssText = `
        font-family: 'Fragment Mono', monospace;
        font-size: 7pt;
        opacity: 0.55;
        text-align: left;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      btn.append(thumb, cap);
      btn.addEventListener('click', async () => {
        closeImageryLibraryModal();
        placeholderMsg.setPlain('Loading...');
        try {
          const canvas = await loadImageFromUrl(resolvePublicAssetUrl(item.src), MAX_PREVIEW_PX);
          applySourceCanvas(canvas);
        } catch {
          masterCanvas = null;
          sizeSelect.disabled = true;
          placeholderMsg.setDefault();
          placeholder.style.display = 'flex';
          previewCanvas.style.display = 'none';
          previewControlsRow.style.display = 'none';
          previewWrap.style.cursor = 'pointer';
          previewWrap.style.minHeight = '200px';
          previewWrap.style.borderStyle = 'dashed';
        }
      });
      libraryGrid.appendChild(btn);
    }
  }

  libraryModalClose.addEventListener('click', () => closeImageryLibraryModal());
  libraryModalBackdrop.addEventListener('click', () => closeImageryLibraryModal());

  libraryUI.open = () => {
    rebuildImageryLibraryGrid();
    libraryModalRoot.style.display = 'flex';
    libraryModalKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImageryLibraryModal();
    };
    document.addEventListener('keydown', libraryModalKeyHandler);
  };

  function getLayerSizeValue(layer: DraggingLayer): number {
    if (layer === 'headline') return graphicsLayers.headline.fontSize;
    if (layer === 'delphiLogo') return graphicsLayers.delphiLogo.width;
    if (layer === 'delphiSymbol') return graphicsLayers.delphiSymbol.width;
    if (layer === 'strapline') return graphicsLayers.strapline.width;
    if (layer === 'userLogo') return graphicsLayers.userLogo.width;
    if (layer === 'marketData') return graphicsLayers.marketData.fontSize;
    if (layer === 'cta') return graphicsLayers.cta.fontSize;
    return 0;
  }

  function setLayerSizeValue(layer: DraggingLayer, value: number): void {
    if (layer === 'headline') {
      graphicsLayers.headline.fontSize = Math.max(8, Math.min(120, Math.round(value)));
      headlineSizeInput.value = String(graphicsLayers.headline.fontSize);
      headlineSizeValue.textContent = `${graphicsLayers.headline.fontSize}px`;
    } else if (layer === 'delphiLogo') {
      graphicsLayers.delphiLogo.width = Math.max(10, Math.round(value));
      delphiLogoWInput.value = String(graphicsLayers.delphiLogo.width);
    } else if (layer === 'delphiSymbol') {
      graphicsLayers.delphiSymbol.width = Math.max(10, Math.round(value));
      delphiSymbolWInput.value = String(graphicsLayers.delphiSymbol.width);
    } else if (layer === 'strapline') {
      graphicsLayers.strapline.width = Math.max(10, Math.round(value));
      straplineWInput.value = String(graphicsLayers.strapline.width);
    } else if (layer === 'userLogo') {
      graphicsLayers.userLogo.width = Math.max(10, Math.round(value));
      userLogoWInput.value = String(graphicsLayers.userLogo.width);
    } else if (layer === 'marketData') {
      graphicsLayers.marketData.fontSize = Math.max(6, Math.min(40, Math.round(value)));
      mdSizeInput.value = String(graphicsLayers.marketData.fontSize);
      mdSizeValue.textContent = `${graphicsLayers.marketData.fontSize}px`;
    } else if (layer === 'cta') {
      graphicsLayers.cta.fontSize = Math.max(8, Math.min(48, Math.round(value)));
      ctaSizeInput.value = String(graphicsLayers.cta.fontSize);
      ctaSizeValue.textContent = `${graphicsLayers.cta.fontSize}px`;
    }
  }

  function getLayerOrigin(layer: DraggingLayer): { x: number; y: number } {
    if (layer === 'headline') return { x: graphicsLayers.headline.x, y: graphicsLayers.headline.y };
    if (layer === 'delphiLogo') return { x: graphicsLayers.delphiLogo.x, y: graphicsLayers.delphiLogo.y };
    if (layer === 'delphiSymbol') return { x: graphicsLayers.delphiSymbol.x, y: graphicsLayers.delphiSymbol.y };
    if (layer === 'strapline') return { x: graphicsLayers.strapline.x, y: graphicsLayers.strapline.y };
    if (layer === 'userLogo') return { x: graphicsLayers.userLogo.x, y: graphicsLayers.userLogo.y };
    if (layer === 'marketData') return { x: graphicsLayers.marketData.x, y: graphicsLayers.marketData.y };
    if (layer === 'cta') return { x: graphicsLayers.cta.x, y: graphicsLayers.cta.y };
    return { x: 0, y: 0 };
  }

  function setLayerOrigin(layer: DraggingLayer, x: number, y: number): void {
    if (layer === 'headline') { graphicsLayers.headline.x = x; graphicsLayers.headline.y = y; }
    else if (layer === 'delphiLogo') { graphicsLayers.delphiLogo.x = x; graphicsLayers.delphiLogo.y = y; }
    else if (layer === 'delphiSymbol') { graphicsLayers.delphiSymbol.x = x; graphicsLayers.delphiSymbol.y = y; }
    else if (layer === 'strapline') { graphicsLayers.strapline.x = x; graphicsLayers.strapline.y = y; }
    else if (layer === 'userLogo') { graphicsLayers.userLogo.x = x; graphicsLayers.userLogo.y = y; }
    else if (layer === 'marketData') { graphicsLayers.marketData.x = x; graphicsLayers.marketData.y = y; }
    else if (layer === 'cta') { graphicsLayers.cta.x = x; graphicsLayers.cta.y = y; }
  }

  function brandBundleForRects(): BrandLayerImages {
    return {
      delphiLogo: delphiLogoImage,
      delphiSymbol: delphiSymbolImage,
      strapline: straplineImage,
      straplineTrim: straplineSourceTrim,
    };
  }

  /**
   * Magnetic snap of layer bounding box centre to canvas centre on each axis (independently).
   * Returns which guide lines should be drawn (only when snapped within tolerance after nudge).
   */
  function applyDragCenterSnap(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    layer: Exclude<DraggingLayer, null>,
    nx: number,
    ny: number,
    canvasEl: HTMLCanvasElement
  ): { guideV: boolean; guideH: boolean } {
    const bundle = brandBundleForRects();
    const midX = cw / 2;
    const midY = ch / 2;
    const magnet = effectiveCenterSnapMagnetPx(cw, ch, canvasEl);
    setLayerOrigin(layer, nx, ny);
    let rects = getLayerRects(ctx, cw, ch, graphicsLayers, bundle);
    let r = rects[layer];
    if (!r) return { guideV: false, guideH: false };

    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    let ddx = 0;
    let ddy = 0;
    if (Math.abs(cx - midX) <= magnet) ddx = Math.round(midX - cx);
    if (Math.abs(cy - midY) <= magnet) ddy = Math.round(midY - cy);

    const o = getLayerOrigin(layer);
    setLayerOrigin(layer, o.x + ddx, o.y + ddy);

    rects = getLayerRects(ctx, cw, ch, graphicsLayers, bundle);
    r = rects[layer];
    if (!r) return { guideV: false, guideH: false };

    const eps = centerSnapAlignedEps(cw, ch);
    const cx2 = r.x + r.w / 2;
    const cy2 = r.y + r.h / 2;
    const loose = Math.max(eps, magnet * 0.35, 6);
    return {
      guideV: ddx !== 0 ? Math.abs(cx2 - midX) <= loose : Math.abs(cx2 - midX) <= eps,
      guideH: ddy !== 0 ? Math.abs(cy2 - midY) <= loose : Math.abs(cy2 - midY) <= eps,
    };
  }

  function clearCenterSnapGuides(): void {
    centerSnapGuides = { v: false, h: false };
    centerSnapPrevEngaged = { v: false, h: false };
  }

  function handleLayerDragPointerMove(canvasX: number, canvasY: number): void {
    if (!draggingLayer || !sourceCanvas) return;
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    const cw = previewCanvas.width;
    const ch = previewCanvas.height;
    if (cw < 2 || ch < 2) return;
    const dx = canvasX - dragStartCanvas.x;
    const dy = canvasY - dragStartCanvas.y;
    const nx = Math.round(dragStartLayer.x + dx);
    const ny = Math.round(dragStartLayer.y + dy);
    const snap = applyDragCenterSnap(ctx, cw, ch, draggingLayer, nx, ny, previewCanvas);
    centerSnapGuides = { v: snap.guideV, h: snap.guideH };
    if (snap.guideV && !centerSnapPrevEngaged.v) centerSnapHaptic();
    if (snap.guideH && !centerSnapPrevEngaged.h) centerSnapHaptic();
    centerSnapPrevEngaged = { v: snap.guideV, h: snap.guideH };
    drawPreview();
  }

  previewCanvas.addEventListener('mousedown', (e) => {
    if (!sourceCanvas) return;
    const { x, y } = getCanvasCoords(e);
    const ctx = previewCanvas.getContext('2d');

    // Check handles of selected layer first (headline has no corner resize — use panel slider only)
    if (selectedLayer && selectedLayer !== 'headline' && ctx) {
      const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
      const selRect = rects[selectedLayer];
      if (selRect) {
        const corner = hitTestHandle(x, y, selRect);
        if (corner) {
          e.preventDefault();
          isResizing = true;
          resizeCorner = corner;
          resizeStartRect = { ...selRect };
          resizeStartValue = getLayerSizeValue(selectedLayer);
          dragStartCanvas = { x, y };
          previewCanvas.style.cursor = getCornerCursor(corner);
          return;
        }
      }
    }

    const layer = hitTestLayer(x, y);
    if (layer) {
      e.preventDefault();
      selectedLayer = layer;
      draggingLayer = layer;
      clearCenterSnapGuides();
      dragStartCanvas = { x, y };
      const origin = getLayerOrigin(layer);
      dragStartLayer = { x: origin.x, y: origin.y };
      previewCanvas.style.cursor = 'grabbing';
      drawPreview();
    } else {
      if (selectedLayer) {
        selectedLayer = null;
        drawPreview();
      }
    }
  });

  previewCanvas.addEventListener('mousemove', (e) => {
    if (!sourceCanvas) return;
    const { x, y } = getCanvasCoords(e);

    if (isResizing && resizeStartRect && resizeCorner && selectedLayer) {
      const origW = resizeStartRect.w;
      if (origW < 1) return;
      let newW: number;
      if (resizeCorner === 'br' || resizeCorner === 'tr') {
        newW = origW + (x - dragStartCanvas.x);
      } else {
        newW = origW - (x - dragStartCanvas.x);
      }
      const scale = Math.max(0.2, newW / origW);
      setLayerSizeValue(selectedLayer, resizeStartValue * scale);

      // Anchor the opposite corner; for headline, convert rect (x,y) to anchor from alignment
      const setOriginFromRect = (layer: DraggingLayer, rectX: number, rectY: number, rect: LayerRect) => {
        if (layer === 'headline') {
          const align = graphicsLayers.headline.textAlign ?? 'left';
          const ox = rectX + (align === 'left' ? 0 : align === 'center' ? rect.w / 2 : rect.w);
          setLayerOrigin(layer, Math.round(ox), Math.round(rectY));
        } else {
          setLayerOrigin(layer, Math.round(rectX), Math.round(rectY));
        }
      };
      if (resizeCorner === 'tl') {
        const anchorX = resizeStartRect.x + resizeStartRect.w;
        const anchorY = resizeStartRect.y + resizeStartRect.h;
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          drawPreview();
          const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
          const newRect = rects[selectedLayer];
          if (newRect) {
            setOriginFromRect(selectedLayer, anchorX - newRect.w, anchorY - newRect.h, newRect);
          }
        }
      } else if (resizeCorner === 'tr') {
        const anchorY = resizeStartRect.y + resizeStartRect.h;
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          drawPreview();
          const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
          const newRect = rects[selectedLayer];
          if (newRect) {
            setOriginFromRect(selectedLayer, resizeStartRect.x, anchorY - newRect.h, newRect);
          }
        }
      } else if (resizeCorner === 'bl') {
        const anchorX = resizeStartRect.x + resizeStartRect.w;
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
          drawPreview();
          const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
          const newRect = rects[selectedLayer];
          if (newRect) {
            setOriginFromRect(selectedLayer, anchorX - newRect.w, resizeStartRect.y, newRect);
          }
        }
      }

      drawPreview();
      return;
    }

    if (draggingLayer) {
      handleLayerDragPointerMove(x, y);
    } else {
      // Update cursor based on what's under the mouse
      const ctx = previewCanvas.getContext('2d');
      if (selectedLayer && selectedLayer !== 'headline' && ctx) {
        const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
        const selRect = rects[selectedLayer];
        if (selRect) {
          const corner = hitTestHandle(x, y, selRect);
          if (corner) {
            previewCanvas.style.cursor = getCornerCursor(corner);
            return;
          }
        }
      }
      const layer = hitTestLayer(x, y);
      previewCanvas.style.cursor = layer ? 'grab' : 'default';
    }
  });

  previewCanvas.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeCorner = null;
      resizeStartRect = null;
      previewCanvas.style.cursor = 'default';
      drawPreview();
      return;
    }
    if (draggingLayer) {
      draggingLayer = null;
      clearCenterSnapGuides();
      previewCanvas.style.cursor = 'grab';
      drawPreview();
    }
  });

  previewCanvas.addEventListener('mouseleave', () => {
    if (isResizing) {
      isResizing = false;
      resizeCorner = null;
      resizeStartRect = null;
    }
    if (draggingLayer) {
      draggingLayer = null;
      clearCenterSnapGuides();
      drawPreview();
    }
    previewCanvas.style.cursor = 'default';
  });

  // Touch events for canvas layer dragging (mirrors mouse handlers)
  previewCanvas.addEventListener('touchstart', (e: TouchEvent) => {
    if (!sourceCanvas || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { x, y } = clientXYToBitmapXY(touch.clientX, touch.clientY);

    if (selectedLayer && selectedLayer !== 'headline') {
      const ctx = previewCanvas.getContext('2d');
      if (ctx) {
        const rects = getLayerRects(ctx, sourceCanvas.width, sourceCanvas.height, graphicsLayers, { delphiLogo: delphiLogoImage, delphiSymbol: delphiSymbolImage, strapline: straplineImage, straplineTrim: straplineSourceTrim });
        const selRect = rects[selectedLayer];
        if (selRect) {
          const corner = hitTestHandle(x, y, selRect);
          if (corner) {
            e.preventDefault();
            isResizing = true;
            resizeCorner = corner;
            resizeStartRect = { ...selRect };
            resizeStartValue = getLayerSizeValue(selectedLayer);
            dragStartCanvas = { x, y };
            return;
          }
        }
      }
    }

    const layer = hitTestLayer(x, y);
    if (layer) {
      e.preventDefault();
      selectedLayer = layer;
      draggingLayer = layer;
      clearCenterSnapGuides();
      dragStartCanvas = { x, y };
      const origin = getLayerOrigin(layer);
      dragStartLayer = { x: origin.x, y: origin.y };
      drawPreview();
    }
  }, { passive: false });

  previewCanvas.addEventListener('touchmove', (e: TouchEvent) => {
    if (!sourceCanvas || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { x, y } = clientXYToBitmapXY(touch.clientX, touch.clientY);

    if (isResizing && resizeStartRect && resizeCorner && selectedLayer) {
      e.preventDefault();
      const origW = resizeStartRect.w;
      if (origW < 1) return;
      let newW: number;
      if (resizeCorner === 'br' || resizeCorner === 'tr') newW = origW + (x - dragStartCanvas.x);
      else newW = origW - (x - dragStartCanvas.x);
      const scale = Math.max(0.2, newW / origW);
      setLayerSizeValue(selectedLayer, resizeStartValue * scale);
      drawPreview();
      return;
    }

    if (draggingLayer) {
      e.preventDefault();
      handleLayerDragPointerMove(x, y);
    }
  }, { passive: false });

  previewCanvas.addEventListener('touchend', () => {
    if (isResizing) { isResizing = false; resizeCorner = null; resizeStartRect = null; drawPreview(); return; }
    if (draggingLayer) {
      draggingLayer = null;
      clearCenterSnapGuides();
      drawPreview();
    }
  });
  previewCanvas.addEventListener('touchcancel', () => {
    isResizing = false; resizeCorner = null; resizeStartRect = null;
    draggingLayer = null;
    clearCenterSnapGuides();
    drawPreview();
  });

  // IMAGE EFFECT CONTROLS
  const effectSection = document.createElement('div');
  effectSection.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
  
  const effectTitle = document.createElement('h3');
  effectTitle.textContent = 'Image effect';
  effectTitle.style.cssText = `
    font-family: 'Instrument Serif', serif;
    font-size: 14pt;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.85;
    margin: 0;
  `;
  effectSection.appendChild(effectTitle);

  const controlsGrid = document.createElement('div');
  controlsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 20px;
    align-items: start;
  `;

  // Vertical stripe width
  const densityWrap = document.createElement('div');
  densityWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const densityLabel = document.createElement('label');
  densityLabel.textContent = 'Stripe width';
  densityLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const densityInput = document.createElement('input');
  densityInput.type = 'range';
  densityInput.min = '1';
  densityInput.max = '16';
  densityInput.step = '1';
  densityInput.value = String(config.halftoneCellSize);
  densityInput.style.cssText = 'width: 100%;';
  const densityValue = document.createElement('span');
  densityValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  densityValue.textContent = `${config.halftoneCellSize}px`;
  densityWrap.appendChild(densityLabel);
  densityWrap.appendChild(densityInput);
  densityWrap.appendChild(densityValue);
  densityInput.addEventListener('input', () => {
    config.halftoneCellSize = Number(densityInput.value);
    densityValue.textContent = `${config.halftoneCellSize}px`;
    drawPreview();
  });
  controlsGrid.appendChild(densityWrap);

  // Brightness sensitivity (how much of the image forms strokes)
  const scaleWrap = document.createElement('div');
  scaleWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const scaleLabel = document.createElement('label');
  scaleLabel.textContent = 'Brightness fill';
  scaleLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const scaleInput = document.createElement('input');
  scaleInput.type = 'range';
  scaleInput.min = '0.15';
  scaleInput.max = '1';
  scaleInput.step = '0.05';
  scaleInput.value = String(config.halftoneDotScale);
  scaleInput.style.cssText = 'width: 100%;';
  const scaleValue = document.createElement('span');
  scaleValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  scaleValue.textContent = `${Math.round(config.halftoneDotScale * 100)}%`;
  scaleWrap.appendChild(scaleLabel);
  scaleWrap.appendChild(scaleInput);
  scaleWrap.appendChild(scaleValue);
  scaleInput.addEventListener('input', () => {
    config.halftoneDotScale = Number(scaleInput.value);
    scaleValue.textContent = `${Math.round(config.halftoneDotScale * 100)}%`;
    drawPreview();
  });
  controlsGrid.appendChild(scaleWrap);

  // Gap between stripes (fixed-width; shows background color)
  const gapWrap = document.createElement('div');
  gapWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const gapLabel = document.createElement('label');
  gapLabel.textContent = 'Stripe gap';
  gapLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const gapInput = document.createElement('input');
  gapInput.type = 'range';
  gapInput.min = '0';
  gapInput.max = '12';
  gapInput.step = '1';
  gapInput.value = String(config.stripeGap);
  gapInput.style.cssText = 'width: 100%;';
  const gapValue = document.createElement('span');
  gapValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  gapValue.textContent = `${config.stripeGap}px`;
  gapWrap.appendChild(gapLabel);
  gapWrap.appendChild(gapInput);
  gapWrap.appendChild(gapValue);
  gapInput.addEventListener('input', () => {
    config.stripeGap = Number(gapInput.value);
    gapValue.textContent = `${config.stripeGap}px`;
    drawPreview();
  });
  controlsGrid.appendChild(gapWrap);

  // Rounded ends (pill-shaped stripe segments)
  const capWrap = document.createElement('div');
  capWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const capLabel = document.createElement('label');
  capLabel.textContent = 'Round ends';
  capLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const capInput = document.createElement('input');
  capInput.type = 'range';
  capInput.min = '0';
  capInput.max = '12';
  capInput.step = '1';
  capInput.value = String(config.stripeEndRadius);
  capInput.style.cssText = 'width: 100%;';
  const capValue = document.createElement('span');
  capValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  capValue.textContent = config.stripeEndRadius === 0 ? 'Off' : `${config.stripeEndRadius}px`;
  capWrap.appendChild(capLabel);
  capWrap.appendChild(capInput);
  capWrap.appendChild(capValue);
  capInput.addEventListener('input', () => {
    config.stripeEndRadius = Number(capInput.value);
    capValue.textContent = config.stripeEndRadius === 0 ? 'Off' : `${config.stripeEndRadius}px`;
    drawPreview();
  });
  controlsGrid.appendChild(capWrap);

  // Luminance contrast (mask clarity)
  const lumWrap = document.createElement('div');
  lumWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const lumLabel = document.createElement('label');
  lumLabel.textContent = 'Tone contrast';
  lumLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const lumInput = document.createElement('input');
  lumInput.type = 'range';
  lumInput.min = '0.65';
  lumInput.max = '1.65';
  lumInput.step = '0.05';
  lumInput.value = String(config.luminanceContrast);
  lumInput.style.cssText = 'width: 100%;';
  const lumValue = document.createElement('span');
  lumValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  lumValue.textContent = `${Number(lumInput.value).toFixed(2)}×`;
  lumWrap.appendChild(lumLabel);
  lumWrap.appendChild(lumInput);
  lumWrap.appendChild(lumValue);
  lumInput.addEventListener('input', () => {
    config.luminanceContrast = Number(lumInput.value);
    lumValue.textContent = `${config.luminanceContrast.toFixed(2)}×`;
    drawPreview();
  });
  controlsGrid.appendChild(lumWrap);

  // Minimum stroke height (noise reduction)
  const minRunWrap = document.createElement('div');
  minRunWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const minRunLabel = document.createElement('label');
  minRunLabel.textContent = 'Min stroke height';
  minRunLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const minRunInput = document.createElement('input');
  minRunInput.type = 'range';
  minRunInput.min = '0';
  minRunInput.max = '12';
  minRunInput.step = '1';
  minRunInput.value = String(config.minRunLength);
  minRunInput.style.cssText = 'width: 100%;';
  const minRunValue = document.createElement('span');
  minRunValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  minRunValue.textContent = config.minRunLength === 0 ? 'Off' : `${config.minRunLength}px`;
  minRunWrap.appendChild(minRunLabel);
  minRunWrap.appendChild(minRunInput);
  minRunWrap.appendChild(minRunValue);
  minRunInput.addEventListener('input', () => {
    config.minRunLength = Number(minRunInput.value);
    minRunValue.textContent = config.minRunLength === 0 ? 'Off' : `${config.minRunLength}px`;
    drawPreview();
  });
  controlsGrid.appendChild(minRunWrap);

  // Edge-aware mask (vertical luminance change)
  const edgeWrap = document.createElement('div');
  edgeWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const edgeLabel = document.createElement('label');
  edgeLabel.textContent = 'Edge boost';
  edgeLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const edgeInput = document.createElement('input');
  edgeInput.type = 'range';
  edgeInput.min = '0';
  edgeInput.max = '1.2';
  edgeInput.step = '0.05';
  edgeInput.value = String(config.edgeMaskStrength);
  edgeInput.style.cssText = 'width: 100%;';
  const edgeValue = document.createElement('span');
  edgeValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  edgeValue.textContent = config.edgeMaskStrength === 0 ? 'Off' : `${config.edgeMaskStrength.toFixed(2)}×`;
  edgeWrap.appendChild(edgeLabel);
  edgeWrap.appendChild(edgeInput);
  edgeWrap.appendChild(edgeValue);
  edgeInput.addEventListener('input', () => {
    config.edgeMaskStrength = Number(edgeInput.value);
    edgeValue.textContent = config.edgeMaskStrength === 0 ? 'Off' : `${config.edgeMaskStrength.toFixed(2)}×`;
    drawPreview();
  });
  controlsGrid.appendChild(edgeWrap);

  // Source saturation (before mask)
  const satWrap = document.createElement('div');
  satWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const satLabel = document.createElement('label');
  satLabel.textContent = 'Saturation';
  satLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const satInput = document.createElement('input');
  satInput.type = 'range';
  satInput.min = '0.5';
  satInput.max = '1.6';
  satInput.step = '0.05';
  satInput.value = String(config.sourceSaturation);
  satInput.style.cssText = 'width: 100%;';
  const satValue = document.createElement('span');
  satValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  satValue.textContent = `${Number(satInput.value).toFixed(2)}×`;
  satWrap.appendChild(satLabel);
  satWrap.appendChild(satInput);
  satWrap.appendChild(satValue);
  satInput.addEventListener('input', () => {
    config.sourceSaturation = Number(satInput.value);
    satValue.textContent = `${config.sourceSaturation.toFixed(2)}×`;
    drawPreview();
  });
  controlsGrid.appendChild(satWrap);

  // Inner shadow on stripes
  const ishWrap = document.createElement('div');
  ishWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const ishLabel = document.createElement('label');
  ishLabel.textContent = 'Stripe depth';
  ishLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const ishInput = document.createElement('input');
  ishInput.type = 'range';
  ishInput.min = '0';
  ishInput.max = '1';
  ishInput.step = '0.05';
  ishInput.value = String(config.stripeInnerShadow);
  ishInput.style.cssText = 'width: 100%;';
  const ishValue = document.createElement('span');
  ishValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6;';
  ishValue.textContent = config.stripeInnerShadow === 0 ? 'Off' : `${Math.round(config.stripeInnerShadow * 100)}%`;
  ishWrap.appendChild(ishLabel);
  ishWrap.appendChild(ishInput);
  ishWrap.appendChild(ishValue);
  ishInput.addEventListener('input', () => {
    config.stripeInnerShadow = Number(ishInput.value);
    ishValue.textContent = config.stripeInnerShadow === 0 ? 'Off' : `${Math.round(config.stripeInnerShadow * 100)}%`;
    drawPreview();
  });
  controlsGrid.appendChild(ishWrap);

  effectSection.appendChild(controlsGrid);

  const originalRow = document.createElement('div');
  originalRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-top: 4px;';
  const originalCheck = document.createElement('input');
  originalCheck.type = 'checkbox';
  originalCheck.id = 'delphi-original-colors';
  originalCheck.checked = config.useOriginalColors;
  originalCheck.style.cssText = 'width: 16px; height: 16px; accent-color: #FBA89D; cursor: pointer;';
  const originalLabel = document.createElement('label');
  originalLabel.htmlFor = 'delphi-original-colors';
  originalLabel.textContent = 'Full colour (photo through stripes)';
  originalLabel.style.cssText =
    'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.65; cursor: pointer; text-transform: uppercase; letter-spacing: 0.06em;';
  originalRow.appendChild(originalCheck);
  originalRow.appendChild(originalLabel);
  effectSection.appendChild(originalRow);

  // Duotone palette (highlight ignored when using original colours)
  const paletteRow = document.createElement('div');
  paletteRow.style.cssText = 'display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; margin-top: 8px;';
  const shadowWrap = document.createElement('div');
  shadowWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const shadowLabel = document.createElement('label');
  shadowLabel.textContent = 'Background';
  shadowLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const shadowColor = document.createElement('input');
  shadowColor.type = 'color';
  shadowColor.value = config.colorShadow;
  shadowColor.style.cssText = 'width: 56px; height: 36px; border: none; border-radius: 6px; cursor: pointer; padding: 0;';
  shadowWrap.appendChild(shadowLabel);
  shadowWrap.appendChild(shadowColor);
  const highlightWrap = document.createElement('div');
  highlightWrap.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';
  const highlightLabel = document.createElement('label');
  highlightLabel.textContent = 'Highlight (light)';
  highlightLabel.style.cssText = LABEL_STYLE + ' display: block;';
  const highlightColor = document.createElement('input');
  highlightColor.type = 'color';
  highlightColor.value = config.colorHighlight;
  highlightColor.style.cssText = 'width: 56px; height: 36px; border: none; border-radius: 6px; cursor: pointer; padding: 0;';
  highlightWrap.appendChild(highlightLabel);
  highlightWrap.appendChild(highlightColor);
  paletteRow.appendChild(shadowWrap);
  paletteRow.appendChild(highlightWrap);

  const syncDuotoneControls = (): void => {
    const orig = config.useOriginalColors;
    highlightColor.disabled = orig;
    highlightWrap.style.opacity = orig ? '0.42' : '1';
    highlightLabel.style.opacity = orig ? '0.6' : '1';
    shadowLabel.textContent = orig ? 'Background (gaps)' : 'Background';
  };

  originalCheck.addEventListener('change', () => {
    config.useOriginalColors = originalCheck.checked;
    syncDuotoneControls();
    drawPreview();
  });

  shadowColor.addEventListener('input', () => {
    config.colorShadow = shadowColor.value;
    drawPreview();
  });
  highlightColor.addEventListener('input', () => {
    config.colorHighlight = highlightColor.value;
    drawPreview();
  });
  syncDuotoneControls();
  effectSection.appendChild(paletteRow);

  controlsColumn.appendChild(effectSection);

  // GRAPHICS OVERLAYS
  const graphicsSection = document.createElement('div');
  graphicsSection.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 12px;
    border-top: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.1);
  `;
  const graphicsTitle = document.createElement('h3');
  graphicsTitle.textContent = 'Add graphics';
  graphicsTitle.style.cssText = `
    font-family: 'Instrument Serif', serif;
    font-size: 14pt;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.85;
    margin: 0 0 8px 0;
  `;
  graphicsSection.appendChild(graphicsTitle);
  const dragHint = document.createElement('p');
  dragHint.textContent = 'Drag items on the preview above to reposition.';
  dragHint.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.5; margin: 0 0 16px 0;';
  graphicsSection.appendChild(dragHint);

  const inputNumStyle = `
    width: 64px;
    padding: 6px 8px;
    font-family: 'Fragment Mono', monospace;
    font-size: 9pt;
    color: var(--fg);
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.04);
    border: ${BORDER};
    border-radius: 4px;
    box-sizing: border-box;
  `;

  // Headline
  const headlineWrap = document.createElement('div');
  headlineWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;
  
  const headlineHeader = document.createElement('div');
  headlineHeader.style.cssText = 'display: flex; align-items: center; gap: 10px; flex-wrap: wrap;';
  const headlineCheck = document.createElement('input');
  headlineCheck.type = 'checkbox';
  headlineCheck.checked = graphicsLayers.headline.enabled;
  headlineCheck.id = 'delphi-headline-check';
  headlineCheck.style.cssText = 'cursor: pointer;';
  const headlineCheckLabel = document.createElement('label');
  headlineCheckLabel.htmlFor = 'delphi-headline-check';
  headlineCheckLabel.textContent = 'Headline';
  headlineCheckLabel.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;';
  headlineHeader.appendChild(headlineCheck);
  headlineHeader.appendChild(headlineCheckLabel);

  const alignBtnStyle = `width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08); border: ${BORDER}; border-radius: 4px; cursor: pointer; color: var(--fg); opacity: 0.7;`;
  const alignActiveStyle = 'background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.18); opacity: 1;';
  const alignLeftSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>';
  const alignCenterSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M5 18h14"/></svg>';
  const alignRightSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M6 18h14"/></svg>';
  const headlineAlign = (graphicsLayers.headline.textAlign ?? 'left') as 'left' | 'center' | 'right';
  const alignLeftBtn = document.createElement('button');
  alignLeftBtn.type = 'button';
  alignLeftBtn.title = 'Align left';
  alignLeftBtn.style.cssText = alignBtnStyle + (headlineAlign === 'left' ? '; ' + alignActiveStyle : '');
  alignLeftBtn.innerHTML = alignLeftSvg;
  const alignCenterBtn = document.createElement('button');
  alignCenterBtn.type = 'button';
  alignCenterBtn.title = 'Align center';
  alignCenterBtn.style.cssText = alignBtnStyle + (headlineAlign === 'center' ? '; ' + alignActiveStyle : '');
  alignCenterBtn.innerHTML = alignCenterSvg;
  const alignRightBtn = document.createElement('button');
  alignRightBtn.type = 'button';
  alignRightBtn.title = 'Align right';
  alignRightBtn.style.cssText = alignBtnStyle + (headlineAlign === 'right' ? '; ' + alignActiveStyle : '');
  alignRightBtn.innerHTML = alignRightSvg;
  const setHeadlineAlign = (align: 'left' | 'center' | 'right') => {
    graphicsLayers.headline.textAlign = align;
    [alignLeftBtn, alignCenterBtn, alignRightBtn].forEach((btn, i) => {
      const a: 'left' | 'center' | 'right' = ['left', 'center', 'right'][i] as 'left' | 'center' | 'right';
      btn.style.cssText = alignBtnStyle + (align === a ? '; ' + alignActiveStyle : '');
    });
    drawPreview();
  };
  alignLeftBtn.addEventListener('click', () => setHeadlineAlign('left'));
  alignCenterBtn.addEventListener('click', () => setHeadlineAlign('center'));
  alignRightBtn.addEventListener('click', () => setHeadlineAlign('right'));
  headlineHeader.appendChild(alignLeftBtn);
  headlineHeader.appendChild(alignCenterBtn);
  headlineHeader.appendChild(alignRightBtn);
  headlineWrap.appendChild(headlineHeader);
  
  const headlineTextInput = document.createElement('textarea');
  headlineTextInput.rows = 3;
  headlineTextInput.placeholder = 'Headline text (press Enter for new line)';
  headlineTextInput.value = graphicsLayers.headline.text;
  headlineTextInput.style.cssText = `
    width: 100%;
    padding: 10px 12px;
    font-family: 'Instrument Serif', serif;
    font-size: 11pt;
    color: var(--fg);
    background: var(--bg);
    border: ${BORDER};
    border-radius: 4px;
    resize: vertical;
    min-height: 64px;
    box-sizing: border-box;
  `;
  headlineWrap.appendChild(headlineTextInput);
  
  const headlineControls = document.createElement('div');
  headlineControls.style.cssText = 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap;';
  const headlineSizeGroup = document.createElement('div');
  headlineSizeGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const headlineSizeLabel = document.createElement('span');
  headlineSizeLabel.textContent = 'Size';
  headlineSizeLabel.style.cssText = LABEL_STYLE;
  const headlineSizeInput = document.createElement('input');
  headlineSizeInput.type = 'range';
  headlineSizeInput.min = '12';
  headlineSizeInput.max = '72';
  headlineSizeInput.step = '2';
  headlineSizeInput.value = String(graphicsLayers.headline.fontSize);
  headlineSizeInput.style.cssText = 'width: 100%; max-width: 120px;';
  const headlineSizeValue = document.createElement('span');
  headlineSizeValue.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6; min-width: 36px;';
  headlineSizeValue.textContent = `${graphicsLayers.headline.fontSize}px`;
  headlineSizeGroup.appendChild(headlineSizeLabel);
  headlineSizeGroup.appendChild(headlineSizeInput);
  headlineSizeGroup.appendChild(headlineSizeValue);
  const headlineColorGroup = document.createElement('div');
  headlineColorGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const headlineColorLabel = document.createElement('label');
  headlineColorLabel.textContent = 'Color';
  headlineColorLabel.style.cssText = LABEL_STYLE;
  const headlineColorInput = document.createElement('input');
  headlineColorInput.type = 'color';
  headlineColorInput.value = graphicsLayers.headline.color;
  headlineColorInput.style.cssText = 'width: 40px; height: 32px; border: none; border-radius: 4px; cursor: pointer; padding: 0;';
  headlineColorGroup.appendChild(headlineColorLabel);
  headlineColorGroup.appendChild(headlineColorInput);
  headlineControls.appendChild(headlineSizeGroup);
  headlineControls.appendChild(headlineColorGroup);
  headlineWrap.appendChild(headlineControls);
  graphicsSection.appendChild(headlineWrap);

  headlineCheck.addEventListener('change', () => {
    graphicsLayers.headline.enabled = headlineCheck.checked;
    drawPreview();
  });
  headlineTextInput.addEventListener('input', () => {
    graphicsLayers.headline.text = headlineTextInput.value;
    drawPreview();
  });
  headlineSizeInput.addEventListener('input', () => {
    graphicsLayers.headline.fontSize = Number(headlineSizeInput.value);
    headlineSizeValue.textContent = `${graphicsLayers.headline.fontSize}px`;
    drawPreview();
  });
  headlineColorInput.addEventListener('input', () => {
    graphicsLayers.headline.color = headlineColorInput.value;
    drawPreview();
  });

  // Delphi logo
  const delphiLogoWrap = document.createElement('div');
  delphiLogoWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;
  
  const delphiLogoHeader = document.createElement('div');
  delphiLogoHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const delphiLogoCheck = document.createElement('input');
  delphiLogoCheck.type = 'checkbox';
  delphiLogoCheck.checked = graphicsLayers.delphiLogo.enabled;
  delphiLogoCheck.id = 'delphi-logo-check';
  delphiLogoCheck.style.cssText = 'cursor: pointer;';
  const delphiLogoCheckLabel = document.createElement('label');
  delphiLogoCheckLabel.htmlFor = 'delphi-logo-check';
  delphiLogoCheckLabel.textContent = 'Delphi logo';
  delphiLogoCheckLabel.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;';
  delphiLogoHeader.appendChild(delphiLogoCheck);
  delphiLogoHeader.appendChild(delphiLogoCheckLabel);
  delphiLogoWrap.appendChild(delphiLogoHeader);
  
  const delphiLogoControls = document.createElement('div');
  delphiLogoControls.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const delphiLogoWLabel = document.createElement('label');
  delphiLogoWLabel.textContent = 'Width';
  delphiLogoWLabel.style.cssText = LABEL_STYLE;
  const delphiLogoWInput = document.createElement('input');
  delphiLogoWInput.type = 'number';
  delphiLogoWInput.value = String(graphicsLayers.delphiLogo.width);
  delphiLogoWInput.min = '10';
  delphiLogoWInput.style.cssText = inputNumStyle;
  delphiLogoControls.appendChild(delphiLogoWLabel);
  delphiLogoControls.appendChild(delphiLogoWInput);
  delphiLogoWrap.appendChild(delphiLogoControls);
  graphicsSection.appendChild(delphiLogoWrap);

  delphiLogoCheck.addEventListener('change', () => {
    graphicsLayers.delphiLogo.enabled = delphiLogoCheck.checked;
    drawPreview();
  });
  delphiLogoWInput.addEventListener('input', () => {
    graphicsLayers.delphiLogo.width = Math.max(10, Number(delphiLogoWInput.value) || 0);
    drawPreview();
  });

  // Delphi symbol (mark only; default bottom-left on canvas)
  const delphiSymbolWrap = document.createElement('div');
  delphiSymbolWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;
  const delphiSymbolHeader = document.createElement('div');
  delphiSymbolHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const delphiSymbolCheck = document.createElement('input');
  delphiSymbolCheck.type = 'checkbox';
  delphiSymbolCheck.checked = graphicsLayers.delphiSymbol.enabled;
  delphiSymbolCheck.id = 'delphi-symbol-check';
  delphiSymbolCheck.style.cssText = 'cursor: pointer;';
  const delphiSymbolCheckLabel = document.createElement('label');
  delphiSymbolCheckLabel.htmlFor = 'delphi-symbol-check';
  delphiSymbolCheckLabel.textContent = 'Delphi symbol';
  delphiSymbolCheckLabel.style.cssText =
    'font-family: \'Fragment Mono\', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;';
  delphiSymbolHeader.appendChild(delphiSymbolCheck);
  delphiSymbolHeader.appendChild(delphiSymbolCheckLabel);
  delphiSymbolWrap.appendChild(delphiSymbolHeader);
  const delphiSymbolHint = document.createElement('p');
  delphiSymbolHint.textContent = 'Default position: bottom left. Drag on preview to move.';
  delphiSymbolHint.style.cssText =
    'font-family: \'Fragment Mono\', monospace; font-size: 7pt; color: var(--fg); opacity: 0.45; margin: -4px 0 0 0;';
  delphiSymbolWrap.appendChild(delphiSymbolHint);
  const delphiSymbolControls = document.createElement('div');
  delphiSymbolControls.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const delphiSymbolWLabel = document.createElement('label');
  delphiSymbolWLabel.textContent = 'Width';
  delphiSymbolWLabel.style.cssText = LABEL_STYLE;
  const delphiSymbolWInput = document.createElement('input');
  delphiSymbolWInput.type = 'number';
  delphiSymbolWInput.value = String(graphicsLayers.delphiSymbol.width);
  delphiSymbolWInput.min = '10';
  delphiSymbolWInput.style.cssText = inputNumStyle;
  delphiSymbolControls.appendChild(delphiSymbolWLabel);
  delphiSymbolControls.appendChild(delphiSymbolWInput);
  delphiSymbolWrap.appendChild(delphiSymbolControls);
  graphicsSection.appendChild(delphiSymbolWrap);

  delphiSymbolCheck.addEventListener('change', () => {
    graphicsLayers.delphiSymbol.enabled = delphiSymbolCheck.checked;
    drawPreview();
  });
  delphiSymbolWInput.addEventListener('input', () => {
    graphicsLayers.delphiSymbol.width = Math.max(10, Number(delphiSymbolWInput.value) || 0);
    drawPreview();
  });

  // Make Your Market strapline (SVG asset)
  const straplineWrap = document.createElement('div');
  straplineWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;
  const straplineHeader = document.createElement('div');
  straplineHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const straplineCheck = document.createElement('input');
  straplineCheck.type = 'checkbox';
  straplineCheck.checked = graphicsLayers.strapline.enabled;
  straplineCheck.id = 'delphi-strapline-check';
  straplineCheck.style.cssText = 'cursor: pointer;';
  const straplineCheckLabel = document.createElement('label');
  straplineCheckLabel.htmlFor = 'delphi-strapline-check';
  straplineCheckLabel.textContent = 'Make Your Market strapline';
  straplineCheckLabel.style.cssText =
    'font-family: \'Fragment Mono\', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;';
  straplineHeader.appendChild(straplineCheck);
  straplineHeader.appendChild(straplineCheckLabel);
  straplineWrap.appendChild(straplineHeader);
  const straplineControls = document.createElement('div');
  straplineControls.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const straplineWLabel = document.createElement('label');
  straplineWLabel.textContent = 'Width';
  straplineWLabel.style.cssText = LABEL_STYLE;
  const straplineWInput = document.createElement('input');
  straplineWInput.type = 'number';
  straplineWInput.value = String(graphicsLayers.strapline.width);
  straplineWInput.min = '10';
  straplineWInput.style.cssText = inputNumStyle;
  straplineControls.appendChild(straplineWLabel);
  straplineControls.appendChild(straplineWInput);
  straplineWrap.appendChild(straplineControls);
  const straplineHint = document.createElement('p');
  straplineHint.textContent =
    'Default: centre of image. Drag on preview to move; release near centre snaps with blue guide lines.';
  straplineHint.style.cssText =
    'margin: 0; font-family: \'Fragment Mono\', monospace; font-size: 7pt; color: var(--fg); opacity: 0.5; line-height: 1.45;';
  straplineWrap.appendChild(straplineHint);
  graphicsSection.appendChild(straplineWrap);

  straplineCheck.addEventListener('change', () => {
    graphicsLayers.strapline.enabled = straplineCheck.checked;
    drawPreview();
  });
  straplineWInput.addEventListener('input', () => {
    graphicsLayers.strapline.width = Math.max(10, Number(straplineWInput.value) || 0);
    drawPreview();
  });

  // User logo
  const userLogoWrap = document.createElement('div');
  userLogoWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;
  
  const userLogoHeader = document.createElement('div');
  userLogoHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const userLogoCheck = document.createElement('input');
  userLogoCheck.type = 'checkbox';
  userLogoCheck.checked = graphicsLayers.userLogo.enabled;
  userLogoCheck.id = 'user-logo-check';
  userLogoCheck.style.cssText = 'cursor: pointer;';
  const userLogoCheckLabel = document.createElement('label');
  userLogoCheckLabel.htmlFor = 'user-logo-check';
  userLogoCheckLabel.textContent = 'Custom logo';
  userLogoCheckLabel.style.cssText = 'font-family: \'Fragment Mono\', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;';
  userLogoHeader.appendChild(userLogoCheck);
  userLogoHeader.appendChild(userLogoCheckLabel);
  userLogoWrap.appendChild(userLogoHeader);
  
  const userLogoBtn = document.createElement('button');
  userLogoBtn.textContent = 'Choose file...';
  userLogoBtn.style.cssText = `
    padding: 8px 14px;
    font-family: 'Fragment Mono', monospace;
    font-size: 9pt;
    color: var(--fg);
    background: var(--bg);
    border: ${BORDER};
    border-radius: 4px;
    cursor: pointer;
    align-self: flex-start;
  `;
  const userLogoFileInput = document.createElement('input');
  userLogoFileInput.type = 'file';
  userLogoFileInput.accept = 'image/*';
  userLogoFileInput.style.cssText = 'display: none;';
  userLogoWrap.appendChild(userLogoBtn);
  userLogoWrap.appendChild(userLogoFileInput);
  
  const userLogoControls = document.createElement('div');
  userLogoControls.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const userLogoWLabel = document.createElement('label');
  userLogoWLabel.textContent = 'Width';
  userLogoWLabel.style.cssText = LABEL_STYLE;
  const userLogoWInput = document.createElement('input');
  userLogoWInput.type = 'number';
  userLogoWInput.value = String(graphicsLayers.userLogo.width);
  userLogoWInput.min = '10';
  userLogoWInput.style.cssText = inputNumStyle;
  userLogoControls.appendChild(userLogoWLabel);
  userLogoControls.appendChild(userLogoWInput);
  userLogoWrap.appendChild(userLogoControls);
  graphicsSection.appendChild(userLogoWrap);

  userLogoCheck.addEventListener('change', () => {
    graphicsLayers.userLogo.enabled = userLogoCheck.checked;
    drawPreview();
  });
  userLogoBtn.addEventListener('click', () => userLogoFileInput.click());
  userLogoFileInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const img = new Image();
    img.onload = () => {
      graphicsLayers.userLogo.image = img;
      drawPreview();
    };
    img.src = URL.createObjectURL(file);
  });
  userLogoWInput.addEventListener('input', () => {
    graphicsLayers.userLogo.width = Math.max(10, Number(userLogoWInput.value) || 0);
    drawPreview();
  });

  // Market data layer
  const marketDataWrap = document.createElement('div');
  marketDataWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;

  const marketDataHeader = document.createElement('div');
  marketDataHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const marketDataCheck = document.createElement('input');
  marketDataCheck.type = 'checkbox';
  marketDataCheck.checked = graphicsLayers.marketData.enabled;
  marketDataCheck.id = 'market-data-check';
  marketDataCheck.style.cssText = 'cursor: pointer;';
  const marketDataCheckLabel = document.createElement('label');
  marketDataCheckLabel.htmlFor = 'market-data-check';
  marketDataCheckLabel.textContent = 'Market data overlay';
  marketDataCheckLabel.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;`;
  marketDataHeader.appendChild(marketDataCheck);
  marketDataHeader.appendChild(marketDataCheckLabel);
  marketDataWrap.appendChild(marketDataHeader);

  const marketDataHint = document.createElement('p');
  marketDataHint.textContent = 'Search Delphi.fyi markets to populate title and sentiment bars.';
  marketDataHint.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 8pt; color: var(--fg); opacity: 0.5; margin: 0;`;
  marketDataWrap.appendChild(marketDataHint);

  const hasDelphiApiKey = Boolean(
    import.meta.env.VITE_DELPHI_API_ACCESS_KEY
    || import.meta.env.VITE_DELPHI_API_ACCESS_KEY_MAINNET
  );
  const mdSettingsHint = document.createElement('div');
  mdSettingsHint.style.cssText = `
    display: ${hasDelphiApiKey ? 'none' : 'block'};
    border: 1px dashed rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.2);
    border-radius: 6px;
    padding: 10px 12px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.03);
    font-family: 'Fragment Mono', monospace;
    font-size: 7.5pt;
    color: var(--fg);
    opacity: 0.75;
    line-height: 1.5;
  `;
  mdSettingsHint.textContent = 'Market search is disabled. Add VITE_DELPHI_API_ACCESS_KEY (or VITE_DELPHI_API_ACCESS_KEY_MAINNET) to your .env file, then restart the dev server.';
  marketDataWrap.appendChild(mdSettingsHint);

  const mdSearchWrap = document.createElement('div');
  mdSearchWrap.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  const mdSearchInput = document.createElement('input');
  mdSearchInput.type = 'text';
  mdSearchInput.placeholder = 'Search market (e.g. BTC, ETH, election...)';
  mdSearchInput.disabled = !hasDelphiApiKey;
  mdSearchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    font-family: 'Fragment Mono', monospace;
    font-size: 8.5pt;
    color: var(--fg);
    background: var(--bg);
    border: ${BORDER};
    border-radius: 4px;
    box-sizing: border-box;
  `;
  mdSearchWrap.appendChild(mdSearchInput);

  const mdSearchStatus = document.createElement('p');
  mdSearchStatus.style.cssText = `margin: 0; font-family: 'Fragment Mono', monospace; font-size: 7.5pt; color: var(--fg); opacity: 0.55;`;
  mdSearchStatus.textContent = hasDelphiApiKey
    ? 'Type to search open Delphi markets.'
    : 'Search unavailable until a Delphi API key is configured.';
  mdSearchWrap.appendChild(mdSearchStatus);

  const mdResults = document.createElement('div');
  mdResults.style.cssText = `
    display: none;
    max-height: 170px;
    overflow-y: auto;
    border: ${BORDER};
    border-radius: 6px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.03);
  `;
  mdSearchWrap.appendChild(mdResults);
  marketDataWrap.appendChild(mdSearchWrap);

  const mdLinkRow = document.createElement('div');
  mdLinkRow.style.cssText = 'display: none; align-items: center; gap: 10px; flex-wrap: wrap;';
  const mdLinkLabel = document.createElement('span');
  mdLinkLabel.textContent = 'Market URL';
  mdLinkLabel.style.cssText = LABEL_STYLE;
  const mdLink = document.createElement('a');
  mdLink.href = '#';
  mdLink.target = '_blank';
  mdLink.rel = 'noopener noreferrer';
  mdLink.textContent = 'Open market';
  mdLink.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 8pt;
    color: var(--fg);
    opacity: 0.8;
    text-decoration: underline;
    text-underline-offset: 2px;
  `;
  const mdCopyLink = document.createElement('button');
  mdCopyLink.type = 'button';
  mdCopyLink.textContent = 'Copy URL';
  mdCopyLink.style.cssText = `
    font-family: 'Fragment Mono', monospace;
    font-size: 7.5pt;
    color: var(--fg);
    opacity: 0.7;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08);
    border: ${BORDER};
    border-radius: 999px;
    padding: 3px 10px;
    cursor: pointer;
  `;
  mdLinkRow.append(mdLinkLabel, mdLink, mdCopyLink);
  marketDataWrap.appendChild(mdLinkRow);

  const marketDataControls = document.createElement('div');
  marketDataControls.style.cssText = 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap;';

  const mdSizeGroup = document.createElement('div');
  mdSizeGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const mdSizeLabel = document.createElement('span');
  mdSizeLabel.textContent = 'Size';
  mdSizeLabel.style.cssText = LABEL_STYLE;
  const mdSizeInput = document.createElement('input');
  mdSizeInput.type = 'range';
  mdSizeInput.min = '8';
  mdSizeInput.max = '24';
  mdSizeInput.step = '1';
  mdSizeInput.value = String(graphicsLayers.marketData.fontSize);
  mdSizeInput.style.cssText = 'width: 100%; max-width: 100px;';
  const mdSizeValue = document.createElement('span');
  mdSizeValue.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6; min-width: 30px;`;
  mdSizeValue.textContent = `${graphicsLayers.marketData.fontSize}px`;
  mdSizeGroup.appendChild(mdSizeLabel);
  mdSizeGroup.appendChild(mdSizeInput);
  mdSizeGroup.appendChild(mdSizeValue);
  marketDataControls.appendChild(mdSizeGroup);

  const mdBarColorGroup = document.createElement('div');
  mdBarColorGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const mdBarColorLabel = document.createElement('label');
  mdBarColorLabel.textContent = 'Bar color';
  mdBarColorLabel.style.cssText = LABEL_STYLE;
  const mdBarColorInput = document.createElement('input');
  mdBarColorInput.type = 'color';
  mdBarColorInput.value = graphicsLayers.marketData.barColor;
  mdBarColorInput.style.cssText = 'width: 40px; height: 32px; border: none; border-radius: 4px; cursor: pointer; padding: 0;';
  mdBarColorGroup.appendChild(mdBarColorLabel);
  mdBarColorGroup.appendChild(mdBarColorInput);
  marketDataControls.appendChild(mdBarColorGroup);

  marketDataWrap.appendChild(marketDataControls);
  graphicsSection.appendChild(marketDataWrap);

  let marketSearchTimer: ReturnType<typeof setTimeout> | null = null;
  let marketSearchRequestId = 0;
  let activeMarketUrl = '';

  const renderMarketResults = (items: DelphiMarketSearchResult[]): void => {
    mdResults.innerHTML = '';
    if (items.length === 0) {
      mdResults.style.display = 'none';
      return;
    }
    mdResults.style.display = 'flex';
    mdResults.style.flexDirection = 'column';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = `
        text-align: left;
        border: none;
        border-bottom: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.1);
        background: transparent;
        color: var(--fg);
        cursor: pointer;
        padding: 9px 10px;
      `;
      const titleEl = document.createElement('div');
      titleEl.textContent = item.title;
      titleEl.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 8pt; opacity: 0.9;`;
      const metaEl = document.createElement('div');
      metaEl.textContent = `${item.category} · ${item.status}`;
      metaEl.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 7pt; opacity: 0.5; margin-top: 2px;`;
      btn.append(titleEl, metaEl);
      btn.addEventListener('click', async () => {
        mdSearchStatus.textContent = 'Loading market details...';
        try {
          const details = await getDelphiMarketOverlayData(item.id);
          graphicsLayers.marketData.enabled = true;
          marketDataCheck.checked = true;
          graphicsLayers.marketData.title = details.title;
          graphicsLayers.marketData.options = details.sentiment.map((point) => ({
            label: point.label,
            probability: point.probability,
          }));
          graphicsLayers.marketData.volume = details.category;
          graphicsLayers.marketData.x = 0;
          graphicsLayers.marketData.y = 0;
          activeMarketUrl = details.url;
          mdLink.href = details.url;
          mdLinkRow.style.display = 'flex';
          mdSearchInput.value = details.title;
          mdResults.style.display = 'none';
          mdSearchStatus.textContent = 'Market overlay loaded.';
          drawPreview();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not load market details.';
          mdSearchStatus.textContent = message;
        }
      });
      mdResults.appendChild(btn);
    }
  };

  marketDataCheck.addEventListener('change', () => {
    graphicsLayers.marketData.enabled = marketDataCheck.checked;
    drawPreview();
  });
  mdSizeInput.addEventListener('input', () => {
    graphicsLayers.marketData.fontSize = Number(mdSizeInput.value);
    mdSizeValue.textContent = `${graphicsLayers.marketData.fontSize}px`;
    drawPreview();
  });
  mdBarColorInput.addEventListener('input', () => {
    graphicsLayers.marketData.barColor = mdBarColorInput.value;
    drawPreview();
  });
  mdSearchInput.addEventListener('input', () => {
    const query = mdSearchInput.value.trim();
    if (marketSearchTimer) {
      clearTimeout(marketSearchTimer);
      marketSearchTimer = null;
    }
    if (!query) {
      mdSearchStatus.textContent = 'Type to search open Delphi markets.';
      renderMarketResults([]);
      return;
    }
    const requestId = ++marketSearchRequestId;
    mdSearchStatus.textContent = 'Searching markets...';
    marketSearchTimer = setTimeout(async () => {
      try {
        const results = await searchDelphiMarkets(query);
        if (requestId !== marketSearchRequestId) return;
        renderMarketResults(results);
        mdSearchStatus.textContent = results.length > 0
          ? `Found ${results.length} market${results.length === 1 ? '' : 's'}.`
          : 'No markets found for this query.';
      } catch (error) {
        if (requestId !== marketSearchRequestId) return;
        renderMarketResults([]);
        const message = error instanceof Error ? error.message : 'Search failed.';
        mdSearchStatus.textContent = message;
      }
    }, 300);
  });
  mdCopyLink.addEventListener('click', async () => {
    if (!activeMarketUrl) return;
    try {
      await navigator.clipboard.writeText(activeMarketUrl);
      mdSearchStatus.textContent = 'Market URL copied.';
    } catch {
      mdSearchStatus.textContent = 'Could not copy URL. You can still open it.';
    }
  });

  // CTA button layer
  const ctaWrap = document.createElement('div');
  ctaWrap.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
    border: ${BORDER};
    border-radius: 6px;
  `;

  const ctaHeader = document.createElement('div');
  ctaHeader.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  const ctaCheck = document.createElement('input');
  ctaCheck.type = 'checkbox';
  ctaCheck.checked = graphicsLayers.cta.enabled;
  ctaCheck.id = 'cta-check';
  ctaCheck.style.cssText = 'cursor: pointer;';
  const ctaCheckLabel = document.createElement('label');
  ctaCheckLabel.htmlFor = 'cta-check';
  ctaCheckLabel.textContent = 'CTA button';
  ctaCheckLabel.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 10pt; font-weight: 600; color: var(--fg); opacity: 0.9; cursor: pointer;`;
  ctaHeader.appendChild(ctaCheck);
  ctaHeader.appendChild(ctaCheckLabel);
  ctaWrap.appendChild(ctaHeader);

  const ctaTextInput = document.createElement('input');
  ctaTextInput.type = 'text';
  ctaTextInput.value = graphicsLayers.cta.text;
  ctaTextInput.placeholder = 'Button text';
  ctaTextInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    font-family: 'Fragment Mono', monospace;
    font-size: 9pt;
    color: var(--fg);
    background: var(--bg);
    border: ${BORDER};
    border-radius: 4px;
    box-sizing: border-box;
  `;
  ctaWrap.appendChild(ctaTextInput);

  const ctaControls = document.createElement('div');
  ctaControls.style.cssText = 'display: flex; align-items: center; gap: 16px; flex-wrap: wrap;';

  const ctaSizeGroup = document.createElement('div');
  ctaSizeGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const ctaSizeLabel = document.createElement('span');
  ctaSizeLabel.textContent = 'Size';
  ctaSizeLabel.style.cssText = LABEL_STYLE;
  const ctaSizeInput = document.createElement('input');
  ctaSizeInput.type = 'range';
  ctaSizeInput.min = '8';
  ctaSizeInput.max = '36';
  ctaSizeInput.step = '1';
  ctaSizeInput.value = String(graphicsLayers.cta.fontSize);
  ctaSizeInput.style.cssText = 'width: 100%; max-width: 100px;';
  const ctaSizeValue = document.createElement('span');
  ctaSizeValue.style.cssText = `font-family: 'Fragment Mono', monospace; font-size: 8pt; color: var(--fg); opacity: 0.6; min-width: 30px;`;
  ctaSizeValue.textContent = `${graphicsLayers.cta.fontSize}px`;
  ctaSizeGroup.appendChild(ctaSizeLabel);
  ctaSizeGroup.appendChild(ctaSizeInput);
  ctaSizeGroup.appendChild(ctaSizeValue);
  ctaControls.appendChild(ctaSizeGroup);

  const ctaBgGroup = document.createElement('div');
  ctaBgGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const ctaBgLabel = document.createElement('label');
  ctaBgLabel.textContent = 'BG';
  ctaBgLabel.style.cssText = LABEL_STYLE;
  const ctaBgInput = document.createElement('input');
  ctaBgInput.type = 'color';
  ctaBgInput.value = graphicsLayers.cta.bgColor;
  ctaBgInput.style.cssText = 'width: 40px; height: 32px; border: none; border-radius: 4px; cursor: pointer; padding: 0;';
  ctaBgGroup.appendChild(ctaBgLabel);
  ctaBgGroup.appendChild(ctaBgInput);
  ctaControls.appendChild(ctaBgGroup);

  const ctaTextColorGroup = document.createElement('div');
  ctaTextColorGroup.style.cssText = 'display: flex; align-items: center; gap: 8px;';
  const ctaTextColorLabel = document.createElement('label');
  ctaTextColorLabel.textContent = 'Text';
  ctaTextColorLabel.style.cssText = LABEL_STYLE;
  const ctaTextColorInput = document.createElement('input');
  ctaTextColorInput.type = 'color';
  ctaTextColorInput.value = graphicsLayers.cta.textColor;
  ctaTextColorInput.style.cssText = 'width: 40px; height: 32px; border: none; border-radius: 4px; cursor: pointer; padding: 0;';
  ctaTextColorGroup.appendChild(ctaTextColorLabel);
  ctaTextColorGroup.appendChild(ctaTextColorInput);
  ctaControls.appendChild(ctaTextColorGroup);

  ctaWrap.appendChild(ctaControls);
  graphicsSection.appendChild(ctaWrap);

  ctaCheck.addEventListener('change', () => {
    graphicsLayers.cta.enabled = ctaCheck.checked;
    drawPreview();
  });
  ctaTextInput.addEventListener('input', () => {
    graphicsLayers.cta.text = ctaTextInput.value;
    graphicsLayers.cta.x = 0;
    graphicsLayers.cta.y = 0;
    drawPreview();
  });
  ctaSizeInput.addEventListener('input', () => {
    graphicsLayers.cta.fontSize = Number(ctaSizeInput.value);
    ctaSizeValue.textContent = `${graphicsLayers.cta.fontSize}px`;
    drawPreview();
  });
  ctaBgInput.addEventListener('input', () => {
    graphicsLayers.cta.bgColor = ctaBgInput.value;
    drawPreview();
  });
  ctaTextColorInput.addEventListener('input', () => {
    graphicsLayers.cta.textColor = ctaTextColorInput.value;
    drawPreview();
  });

  graphicsControlSync.refresh = () => {
    headlineSizeInput.value = String(graphicsLayers.headline.fontSize);
    headlineSizeValue.textContent = `${graphicsLayers.headline.fontSize}px`;
    delphiLogoWInput.value = String(graphicsLayers.delphiLogo.width);
    delphiSymbolWInput.value = String(graphicsLayers.delphiSymbol.width);
    straplineWInput.value = String(graphicsLayers.strapline.width);
    userLogoWInput.value = String(graphicsLayers.userLogo.width);
    mdSizeInput.value = String(graphicsLayers.marketData.fontSize);
    mdSizeValue.textContent = `${graphicsLayers.marketData.fontSize}px`;
    ctaSizeInput.value = String(graphicsLayers.cta.fontSize);
    ctaSizeValue.textContent = `${graphicsLayers.cta.fontSize}px`;
  };

  controlsColumn.appendChild(graphicsSection);

  // EXPORT
  const exportSection = document.createElement('div');
  exportSection.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-top: 20px;
    border-top: 1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.1);
  `;
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Export PNG';
  exportBtn.type = 'button';
  exportBtn.style.cssText = `
    background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08);
    border: ${BORDER};
    border-radius: 6px;
    padding: 12px 24px;
    font-family: 'Instrument Serif', serif;
    font-size: 11pt;
    font-weight: 400;
    color: var(--fg);
    cursor: pointer;
    transition: background 0.2s ease;
    align-self: flex-start;
  `;
  exportBtn.addEventListener('mouseenter', () => { exportBtn.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)'; });
  exportBtn.addEventListener('mouseleave', () => { exportBtn.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.08)'; });
  exportBtn.addEventListener('click', () => {
    if (!exportCanvas) return;
    const link = document.createElement('a');
    link.download = 'delphi-duotone.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  });
  exportSection.appendChild(exportBtn);
  controlsColumn.appendChild(exportSection);

  const controlsBottomFade = document.createElement('div');
  controlsBottomFade.setAttribute('aria-hidden', 'true');
  controlsBottomFade.style.cssText = `
    position: sticky;
    bottom: 0;
    z-index: 1;
    align-self: stretch;
    height: 36px;
    margin-top: -36px;
    flex-shrink: 0;
    pointer-events: none;
    background: linear-gradient(to top, var(--bg), transparent);
    opacity: 0;
    transition: opacity 0.28s ease;
  `;
  controlsColumn.appendChild(controlsBottomFade);

  function updateControlsColumnScrollFade(): void {
    const el = controlsColumn;
    const overflows = el.scrollHeight > el.clientHeight + 2;
    const moreBelow = el.scrollTop + el.clientHeight < el.scrollHeight - 3;
    controlsBottomFade.style.opacity = overflows && moreBelow ? '1' : '0';
  }
  controlsColumn.addEventListener('scroll', updateControlsColumnScrollFade);
  const controlsScrollFadeRo = new ResizeObserver(() => {
    updateControlsColumnScrollFade();
  });
  controlsScrollFadeRo.observe(controlsColumn);
  requestAnimationFrame(() => requestAnimationFrame(updateControlsColumnScrollFade));

  window.addEventListener('resize', updateControlsColumnScrollFade);

  input.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    handleImageFile(file);
  });

  workshopRoot.appendChild(canvasColumn);
  workshopRoot.appendChild(controlsColumn);
  container.appendChild(workshopRoot);
}

/** Fetch default effect config from public JSON (optional). */
export async function fetchDelphiEffectConfig(
  baseUrl: string
): Promise<DelphiEffectConfig | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/images/Assets/Imagery/delphi-effect.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as DelphiEffectConfig;
    return json;
  } catch {
    return null;
  }
}
