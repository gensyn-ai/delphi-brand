import type { DEFAULT_DELPHI_CONFIG } from '../types/delphi-effect';
import {
  getPaletteById,
  resolveActivePalette,
  samplePaletteGradient,
  type Rgb,
} from './color-palettes';

type EffectConfig = typeof DEFAULT_DELPHI_CONFIG;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function parsePaper(hex: string): Rgb {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function luminance(rgb: Rgb): number {
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function applySaturation(rgb: Rgb, factor: number): Rgb {
  if (Math.abs(factor - 1) < 0.001) return rgb;
  const y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return {
    r: clampByte(y + (rgb.r - y) * factor),
    g: clampByte(y + (rgb.g - y) * factor),
    b: clampByte(y + (rgb.b - y) * factor),
  };
}

function applyBrightnessContrast(rgb: Rgb, brightness: number, contrast: number): Rgb {
  const apply = (c: number) => clampByte(((c * brightness - 128) * contrast + 128));
  return { r: apply(rgb.r), g: apply(rgb.g), b: apply(rgb.b) };
}

function colorDist2(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function nearestPaletteColor(rgb: Rgb, palette: Rgb[]): Rgb {
  let best = palette[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of palette) {
    const d = colorDist2(rgb, c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Deterministic cell noise in 0..1 (noise64-style grain). */
function cellNoise(cx: number, cy: number): number {
  let n = cx * 374761393 + cy * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function quantizeLevel(L: number, steps: number): number {
  const s = Math.max(2, Math.round(steps));
  return Math.round(clamp01(L) * (s - 1)) / (s - 1);
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const u = clamp01(t);
  return {
    r: clampByte(a.r + (b.r - a.r) * u),
    g: clampByte(a.g + (b.g - a.g) * u),
    b: clampByte(a.b + (b.b - a.b) * u),
  };
}

/**
 * Halftone Bayer dither: block-average palette mapping + ordered threshold dots.
 */
export function renderHalftoneDither(
  sourceCanvas: HTMLCanvasElement,
  destCtx: CanvasRenderingContext2D,
  config: EffectConfig
): void {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const cellPx = Math.max(2, Math.min(48, Math.round(config.cellSize)));
  const smooth = Math.max(0, Math.min(10, config.halftoneSmooth));
  const noiseAmt = Math.max(0, Math.min(0.25, config.noiseAmount));
  const sat = Math.max(0, Math.min(2, config.saturation));
  const brightness = Math.max(0.25, Math.min(3, config.brightness));
  const contrast = Math.max(0.25, Math.min(3, config.contrast));
  const steps = Math.max(2, Math.min(32, Math.round(config.steps)));

  const palette = resolveActivePalette(getPaletteById(config.paletteId), config.reversePalette);
  const paper = parsePaper(config.paperColor);
  const gradientMode = config.colorMode !== 'nearest';

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return;
  const srcData = srcCtx.getImageData(0, 0, w, h).data;
  const out = destCtx.createImageData(w, h);
  const outData = out.data;

  for (let i = 0; i < outData.length; i += 4) {
    outData[i] = paper.r;
    outData[i + 1] = paper.g;
    outData[i + 2] = paper.b;
    outData[i + 3] = 255;
  }

  // Edge softness scales with cell size so small cells keep their ink coverage.
  const edgeSoft = Math.max(0.3, smooth * 0.045 * cellPx);

  for (let cy = 0; cy < h; cy += cellPx) {
    const cellH = Math.min(cellPx, h - cy);
    const by = Math.floor(cy / cellPx);

    for (let cx = 0; cx < w; cx += cellPx) {
      const cellW = Math.min(cellPx, w - cx);
      const bx = Math.floor(cx / cellPx);

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let count = 0;
      for (let py = 0; py < cellH; py++) {
        for (let px = 0; px < cellW; px++) {
          const i = ((cy + py) * w + (cx + px)) * 4;
          sumR += srcData[i];
          sumG += srcData[i + 1];
          sumB += srcData[i + 2];
          count++;
        }
      }
      if (count === 0) continue;

      let avg: Rgb = {
        r: sumR / count,
        g: sumG / count,
        b: sumB / count,
      };
      avg = applySaturation(avg, sat);
      avg = applyBrightnessContrast(avg, brightness, contrast);

      const L = quantizeLevel(luminance(avg), steps);
      const dotColor = gradientMode
        ? samplePaletteGradient(palette, L)
        : nearestPaletteColor(avg, palette);

      // Continuous halftone: dot radius follows luminance; grain adds subtle
      // per-cell size modulation.
      const noise = (cellNoise(bx, by) - 0.5) * 2 * noiseAmt;
      const level = clamp01(L * (1 + noise));
      if (level <= 0.004) continue;

      const centerX = cellW / 2;
      const centerY = cellH / 2;
      // Area-accurate sizing: circle area / cell area = level, so ink coverage tracks
      // luminance (radius may exceed cell/2 — corners fill in, highlights go solid).
      const maxRadius = Math.min(cellW, cellH) * Math.sqrt(level / Math.PI);

      for (let py = 0; py < cellH; py++) {
        for (let px = 0; px < cellW; px++) {
          const dx = px + 0.5 - centerX;
          const dy = py + 0.5 - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let dotAmt: number;
          if (smooth <= 0.01) {
            dotAmt = dist <= maxRadius ? 1 : 0;
          } else {
            // Transition band centred on the radius keeps coverage roughly area-true.
            dotAmt = clamp01((maxRadius - dist) / edgeSoft + 0.5);
          }

          if (dotAmt <= 0) continue;

          const oi = ((cy + py) * w + (cx + px)) * 4;
          const mixed = mixRgb(paper, dotColor, dotAmt);
          outData[oi] = mixed.r;
          outData[oi + 1] = mixed.g;
          outData[oi + 2] = mixed.b;
          outData[oi + 3] = 255;
        }
      }
    }
  }

  destCtx.putImageData(out, 0, 0);
}
