export interface ColorPaletteEntry {
  id: number;
  colors: [string, string, string, string, string];
  use: [boolean, boolean, boolean, boolean, boolean];
  reverse: boolean;
}

/** Ported from Delphi dither preset colorPalette (1–30). */
export const DELPHI_COLOR_PALETTES: ColorPaletteEntry[] = [
  { id: 1, use: [true, true, true, true, true], reverse: false, colors: ['#2e3336', '#358e7e', '#e57e3a', '#f883d6', '#cad2d6'] },
  { id: 2, use: [true, true, true, true, true], reverse: false, colors: ['#2c426f', '#403d3d', '#db622d', '#d14e9b', '#ccc5c5'] },
  { id: 3, use: [true, true, true, true, true], reverse: false, colors: ['#303134', '#e15934', '#355ccd', '#348443', '#d2b58a'] },
  { id: 4, use: [true, true, true, true, true], reverse: false, colors: ['#2d2d2d', '#616f59', '#e8e0df', '#eeb2d0', '#e25d57'] },
  { id: 5, use: [true, true, true, true, false], reverse: false, colors: ['#353f37', '#744498', '#2f8088', '#fb8727', '#ece7f4'] },
  { id: 6, use: [true, true, true, true, false], reverse: false, colors: ['#363534', '#45936f', '#d28581', '#f2dc18', '#dae3ff'] },
  { id: 7, use: [true, false, false, true, true], reverse: false, colors: ['#3d3f43', '#77609f', '#9ca558', '#5286b5', '#cccbd5'] },
  { id: 8, use: [true, true, true, false, false], reverse: false, colors: ['#2f2727', '#2169d8', '#ff3b0e', '#a7723b', '#f4caf0'] },
  { id: 9, use: [false, true, true, true, false], reverse: false, colors: ['#0e301e', '#4e3fe4', '#2fa257', '#d2cfbf', '#9d7d37'] },
  { id: 10, use: [true, true, true, true, true], reverse: false, colors: ['#3c2706', '#7a5649', '#cc3904', '#e5cf0a', '#faf5c6'] },
  { id: 11, use: [true, true, true, true, true], reverse: false, colors: ['#d27099', '#8f64b0', '#4060a5', '#609dc5', '#9ddbc3'] },
  { id: 12, use: [true, true, true, true, true], reverse: false, colors: ['#117092', '#11c3ef', '#cca8e1', '#e9d13e', '#e7f6fe'] },
  { id: 13, use: [true, true, true, true, false], reverse: false, colors: ['#2a2955', '#6612ff', '#e12955', '#d19ef6', '#fac4ac'] },
  { id: 14, use: [true, true, true, true, true], reverse: false, colors: ['#000000', '#db4b3d', '#ff7b05', '#7dcfa7', '#b2ccff'] },
  { id: 15, use: [false, true, true, true, false], reverse: false, colors: ['#252c32', '#387d1f', '#f0a8ce', '#eee1da', '#eef1df'] },
  { id: 16, use: [true, true, true, false, false], reverse: false, colors: ['#5f5f65', '#ac5cc3', '#db5e51', '#5fa26a', '#a3d4c6'] },
  { id: 17, use: [true, true, true, true, false], reverse: false, colors: ['#050006', '#395e54', '#e55486', '#e77b4d', '#a1b8cf'] },
  { id: 18, use: [true, true, true, true, true], reverse: false, colors: ['#118ab2', '#ef476f', '#f78c6b', '#ffd166', '#06d6a0'] },
  { id: 19, use: [true, true, true, true, true], reverse: false, colors: ['#032472', '#3a678f', '#8d69de', '#ffa900', '#ffd200'] },
  { id: 20, use: [true, true, true, true, true], reverse: false, colors: ['#401469', '#9d246f', '#df1260', '#398a9b', '#10bbb1'] },
  { id: 21, use: [true, false, true, true, false], reverse: true, colors: ['#f592c0', '#ffa6a6', '#1c67bc', '#243295', '#ef9fa0'] },
  { id: 22, use: [false, true, true, true, true], reverse: false, colors: ['#5f5050', '#03abc2', '#5dd24f', '#cdff19', '#cdfaff'] },
  { id: 23, use: [true, true, true, true, true], reverse: false, colors: ['#0B3039', '#705771', '#B06683', '#E5B5B7', '#F2F5E7'] },
  { id: 24, use: [true, true, true, true, true], reverse: false, colors: ['#FF5181', '#FFB7BC', '#FFCF49', '#FFA43F', '#5CCAEF'] },
  { id: 25, use: [true, true, true, false, true], reverse: false, colors: ['#3e3700', '#ca2e2c', '#388a85', '#8ca79e', '#ccb000'] },
  { id: 26, use: [true, true, true, true, true], reverse: false, colors: ['#6f4c32', '#cd5845', '#d85da0', '#cdb337', '#C2CCC6'] },
  { id: 27, use: [true, true, true, true, true], reverse: false, colors: ['#c0311e', '#c53a5b', '#202020', '#d54a1f', '#2b5584'] },
  { id: 28, use: [true, true, true, true, true], reverse: false, colors: ['#1B1C19', '#5F2398', '#1CA56E', '#F0E800', '#DEDBC1'] },
  { id: 29, use: [true, true, true, true, true], reverse: false, colors: ['#1b1b2f', '#245a69', '#8198a5', '#b789e5', '#dbc064'] },
  { id: 30, use: [true, true, true, true, true], reverse: false, colors: ['#2B5F8F', '#818014', '#E87031', '#C27E97', '#CC9F7E'] },
];

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function parseHex(hex: string): Rgb {
  const m = hex.replace(/^#/, '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function resolveActivePalette(palette: ColorPaletteEntry, reverseOverride?: boolean): Rgb[] {
  const active: Rgb[] = [];
  for (let i = 0; i < palette.colors.length; i++) {
    if (palette.use[i]) active.push(parseHex(palette.colors[i]));
  }
  const result = active.length > 0 ? active : palette.colors.map(parseHex);
  const reverse = reverseOverride ?? palette.reverse;
  if (reverse) result.reverse();
  return result;
}

/** Linear interpolation across palette stops; t = 0 → first colour, t = 1 → last. */
export function samplePaletteGradient(colors: Rgb[], t: number): Rgb {
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  if (colors.length === 1) return colors[0];
  const u = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(u));
  const f = u - i;
  const a = colors[i];
  const b = colors[i + 1];
  return {
    r: Math.round(a.r + (b.r - a.r) * f),
    g: Math.round(a.g + (b.g - a.g) * f),
    b: Math.round(a.b + (b.b - a.b) * f),
  };
}

export function getPaletteById(id: number): ColorPaletteEntry {
  return DELPHI_COLOR_PALETTES.find((p) => p.id === id) ?? DELPHI_COLOR_PALETTES[20];
}
