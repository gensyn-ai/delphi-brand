/**
 * Config for Delphi-style duotone + vertical-blinds effect.
 * Can be loaded from public/images/Assets/Imagery/delphi-effect.json
 * or from any JSON file you provide.
 *
 * Legacy JSON keys `halftoneCellSize` / `halftoneDotScale` are reused:
 * cell size = vertical stripe width; dot scale = brightness sensitivity.
 */
export interface DelphiEffectConfig {
  name?: string;
  description?: string;
  /** Width in pixels of each vertical stripe (column). Sliders go up to 96px for large export sizes. */
  halftoneCellSize?: number;
  /** How readily mid-tones form visible strokes (0.2–1). Higher = more fill. */
  halftoneDotScale?: number;
  /** Horizontal gap in pixels between stripes (shows as background). Capped in renderer to match UI. */
  stripeGap?: number;
  /** When true, copy full-resolution source pixels through each stripe (not duotone). */
  useOriginalColors?: boolean;
  /** Radius (px) for rounded top/bottom of each stripe segment; 0 = square ends. */
  stripeEndRadius?: number;
  /** Stretch luminance before masking (0.7–1.6). Above 1 increases edge separation. */
  luminanceContrast?: number;
  /** Drop vertical runs shorter than this (px) to reduce speckle. 0 = off. */
  minRunLength?: number;
  /** Boost mask along strong vertical luminance changes (row-to-row). 0 = off. */
  edgeMaskStrength?: number;
  /** Source saturation before masking (0.5–1.6). 1 = unchanged. */
  sourceSaturation?: number;
  /** Dark inner edge on stripes for depth (0–1). */
  stripeInnerShadow?: number;
  /** Duotone shadow color (hex). Background and gaps; dark end of duotone. */
  colorShadow?: string;
  /** Duotone highlight color (hex). Maps to light areas. */
  colorHighlight?: string;
  /** Screen angle in degrees (0–360). */
  angle?: number;
}

export const DEFAULT_DELPHI_CONFIG: Required<Omit<DelphiEffectConfig, 'name' | 'description'>> = {
  halftoneCellSize: 4,
  halftoneDotScale: 0.5,
  stripeGap: 3,
  useOriginalColors: true,
  stripeEndRadius: 12,
  luminanceContrast: 1.1,
  minRunLength: 0,
  edgeMaskStrength: 0,
  sourceSaturation: 1,
  stripeInnerShadow: 0,
  colorShadow: '#240908',
  colorHighlight: '#ffa6a6',
  angle: 0,
};

export function mergeWithDefaults(partial: DelphiEffectConfig | null): typeof DEFAULT_DELPHI_CONFIG {
  if (!partial) return DEFAULT_DELPHI_CONFIG;
  return {
    halftoneCellSize: partial.halftoneCellSize ?? DEFAULT_DELPHI_CONFIG.halftoneCellSize,
    halftoneDotScale: partial.halftoneDotScale ?? DEFAULT_DELPHI_CONFIG.halftoneDotScale,
    stripeGap: partial.stripeGap ?? DEFAULT_DELPHI_CONFIG.stripeGap,
    useOriginalColors: partial.useOriginalColors ?? DEFAULT_DELPHI_CONFIG.useOriginalColors,
    stripeEndRadius: partial.stripeEndRadius ?? DEFAULT_DELPHI_CONFIG.stripeEndRadius,
    luminanceContrast: partial.luminanceContrast ?? DEFAULT_DELPHI_CONFIG.luminanceContrast,
    minRunLength: partial.minRunLength ?? DEFAULT_DELPHI_CONFIG.minRunLength,
    edgeMaskStrength: partial.edgeMaskStrength ?? DEFAULT_DELPHI_CONFIG.edgeMaskStrength,
    sourceSaturation: partial.sourceSaturation ?? DEFAULT_DELPHI_CONFIG.sourceSaturation,
    stripeInnerShadow: partial.stripeInnerShadow ?? DEFAULT_DELPHI_CONFIG.stripeInnerShadow,
    colorShadow: partial.colorShadow ?? DEFAULT_DELPHI_CONFIG.colorShadow,
    colorHighlight: partial.colorHighlight ?? DEFAULT_DELPHI_CONFIG.colorHighlight,
    angle: partial.angle ?? DEFAULT_DELPHI_CONFIG.angle,
  };
}

// --- Graphics layers (drawn on top of duotone image) ---

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
};

export const DEFAULT_DELPHI_SYMBOL_LAYER: DelphiLogoLayer = {
  enabled: false,
  x: 0,
  y: 0,
  width: 56,
};

/** “Make Your Market” strapline SVG (same fields as logotype layer). */
export const DEFAULT_STRAPLINE_LAYER: DelphiLogoLayer = {
  enabled: false,
  x: 0,
  y: 0,
  width: 240,
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
  bgColor: 'rgba(0, 0, 0, 0.55)', // same as market chart box
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
