/**
 * Config for Delphi halftone dither image effect.
 * Loaded from public/images/Assets/Imagery/delphi-effect.json or any compatible JSON.
 */
export interface DelphiEffectConfig {
  name?: string;
  description?: string;
  ditherType?: 'halftone';
  /** Tone contrast multiplier (preset default 1.13). */
  contrast?: number;
  /** Brightness multiplier (preset default 1.5). */
  brightness?: number;
  /** Halftone cell size in px (dither.scale × halftone.scale, default 6). */
  cellSize?: number;
  /** Soft dot edge falloff 0–10 (preset halftone.smooth: 5). */
  halftoneSmooth?: number;
  /** Grain added to dither threshold 0–0.25. */
  noiseAmount?: number;
  /** Luminance quantization steps before dither (preset step: 10). */
  steps?: number;
  /** Source saturation 0–2 (preset gradient.saturation: 0.6). */
  saturation?: number;
  /** Palette id 1–30 (preset gradient.palette: 21). */
  paletteId?: number;
  /** How cell colour is chosen: gradient map by luminance, or nearest palette colour. */
  colorMode?: 'gradient' | 'nearest';
  /** Reverse the active palette order (DITHR "Reverse Palette"). */
  reversePalette?: boolean;
  /** Background / paper color between dots. */
  paperColor?: string;
}

export const DEFAULT_DELPHI_CONFIG: Required<Omit<DelphiEffectConfig, 'name' | 'description'>> = {
  ditherType: 'halftone',
  contrast: 1.13,
  brightness: 1.5,
  cellSize: 6,
  halftoneSmooth: 5,
  noiseAmount: 0.06,
  steps: 10,
  saturation: 0.6,
  paletteId: 21,
  colorMode: 'gradient',
  reversePalette: true,
  paperColor: '#000000',
};

export function mergeWithDefaults(partial: DelphiEffectConfig | null): typeof DEFAULT_DELPHI_CONFIG {
  if (!partial) return { ...DEFAULT_DELPHI_CONFIG };
  return {
    ditherType: partial.ditherType ?? DEFAULT_DELPHI_CONFIG.ditherType,
    contrast: partial.contrast ?? DEFAULT_DELPHI_CONFIG.contrast,
    brightness: partial.brightness ?? DEFAULT_DELPHI_CONFIG.brightness,
    cellSize: partial.cellSize ?? DEFAULT_DELPHI_CONFIG.cellSize,
    halftoneSmooth: partial.halftoneSmooth ?? DEFAULT_DELPHI_CONFIG.halftoneSmooth,
    noiseAmount: partial.noiseAmount ?? DEFAULT_DELPHI_CONFIG.noiseAmount,
    steps: partial.steps ?? DEFAULT_DELPHI_CONFIG.steps,
    saturation: partial.saturation ?? DEFAULT_DELPHI_CONFIG.saturation,
    paletteId: partial.paletteId ?? DEFAULT_DELPHI_CONFIG.paletteId,
    colorMode: partial.colorMode ?? DEFAULT_DELPHI_CONFIG.colorMode,
    reversePalette: partial.reversePalette ?? DEFAULT_DELPHI_CONFIG.reversePalette,
    paperColor: partial.paperColor ?? DEFAULT_DELPHI_CONFIG.paperColor,
  };
}

// --- Graphics layers (drawn on top of dithered image) ---

export type HeadlineTextAlign = 'left' | 'center' | 'right';

export interface HeadlineLayer {
  enabled: boolean;
  text: string;
  fontSize: number;
  x: number;
  y: number;
  color: string;
  textAlign: HeadlineTextAlign;
}

export interface DelphiLogoLayer {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  /** Ink colour for the (white-source) SVG. Defaults to white. */
  color?: string;
}

export interface UserLogoLayer {
  enabled: boolean;
  image: HTMLImageElement | null;
  x: number;
  y: number;
  width: number;
}

export interface MarketDataLayer {
  enabled: boolean;
  x: number;
  y: number;
  options: Array<{ label: string; probability: number }>;
  title: string;
  volume: string;
  fontSize: number;
  textColor: string;
  /** Dark card / panel styling for the overlay on dark imagery. */
  darkMode?: boolean;
}

export interface CtaLayer {
  enabled: boolean;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  bgColor: string;
  textColor: string;
  borderRadius: number;
  paddingH: number;
  paddingV: number;
}

export interface GraphicsLayers {
  headline: HeadlineLayer;
  delphiLogo: DelphiLogoLayer;
  /** Mark / symbol only (default bottom-left in UI). */
  delphiSymbol: DelphiLogoLayer;
  strapline: DelphiLogoLayer;
  userLogo: UserLogoLayer;
  marketData: MarketDataLayer;
  cta: CtaLayer;
}

export const DEFAULT_HEADLINE_LAYER: HeadlineLayer = {
  enabled: false,
  text: 'Headline',
  fontSize: 32,
  x: 0,
  y: 0,
  color: '#FFFFFF',
  textAlign: 'left',
};

export const DEFAULT_DELPHI_LOGO_LAYER: DelphiLogoLayer = {
  enabled: false,
  x: 0,
  y: 0,
  width: 120,
  color: '#FFFFFF',
};

export const DEFAULT_DELPHI_SYMBOL_LAYER: DelphiLogoLayer = {
  enabled: false,
  x: 0,
  y: 0,
  width: 56,
  color: '#FFFFFF',
};

/** “Make Your Market” strapline SVG (same fields as logotype layer). */
export const DEFAULT_STRAPLINE_LAYER: DelphiLogoLayer = {
  enabled: false,
  x: 0,
  y: 0,
  width: 480,
  color: '#FFFFFF',
};

export const DEFAULT_USER_LOGO_LAYER: UserLogoLayer = {
  enabled: false,
  image: null,
  x: 0,
  y: 0,
  width: 80,
};

export const DEFAULT_MARKET_DATA_LAYER: MarketDataLayer = {
  enabled: false,
  x: 0,
  y: 0,
  options: [],
  title: '',
  volume: '',
  fontSize: 14,
  textColor: '#FFFFFF',
  darkMode: false,
};

export const DEFAULT_CTA_LAYER: CtaLayer = {
  enabled: false,
  text: 'Click here',
  x: 0,
  y: 0,
  fontSize: 14,
  bgColor: 'rgba(0, 0, 0, 0.55)',
  textColor: '#FFFFFF',
  borderRadius: 6,
  paddingH: 24,
  paddingV: 12,
};

export function createDefaultGraphicsLayers(): GraphicsLayers {
  return {
    headline: { ...DEFAULT_HEADLINE_LAYER },
    delphiLogo: { ...DEFAULT_DELPHI_LOGO_LAYER },
    delphiSymbol: { ...DEFAULT_DELPHI_SYMBOL_LAYER },
    strapline: { ...DEFAULT_STRAPLINE_LAYER },
    userLogo: { ...DEFAULT_USER_LOGO_LAYER },
    marketData: { ...DEFAULT_MARKET_DATA_LAYER, options: [] },
    cta: { ...DEFAULT_CTA_LAYER },
  };
}
