export type ThemeMode = 'light' | 'dark';

const LIGHT = {
  bg: [243, 242, 239] as const,
  fg: [0, 0, 0] as const,
  tooltipBg: [245, 246, 241] as const,
};

const DARK = {
  bg: [12, 12, 12] as const,
  fg: [243, 242, 239] as const,
  tooltipBg: [20, 20, 20] as const,
};

let mode: ThemeMode = (localStorage.getItem('delphi-theme') as ThemeMode) || 'light';

export function getTheme() {
  return mode === 'light' ? LIGHT : DARK;
}

export function getMode(): ThemeMode {
  return mode;
}

export function toggleTheme(): void {
  mode = mode === 'light' ? 'dark' : 'light';
  localStorage.setItem('delphi-theme', mode);
  applyCSS(mode);
}

export function applyCSS(m: ThemeMode): void {
  const t = m === 'light' ? LIGHT : DARK;
  const bg = m === 'light' ? LIGHT.bg : DARK.bg;
  const root = document.documentElement;
  root.style.setProperty('--bg', `rgb(${t.bg.join(',')})`);
  root.style.setProperty('--bg-r', String(bg[0]));
  root.style.setProperty('--bg-g', String(bg[1]));
  root.style.setProperty('--bg-b', String(bg[2]));
  root.style.setProperty('--fg', `rgb(${t.fg.join(',')})`);
  root.style.setProperty('--fg-r', String(t.fg[0]));
  root.style.setProperty('--fg-g', String(t.fg[1]));
  root.style.setProperty('--fg-b', String(t.fg[2]));
  if (m === 'dark') {
    root.style.setProperty('--color-active-green-bg', '#1a5c34');
    root.style.setProperty('--color-dark-active-green', '#4ade80');
  } else {
    root.style.setProperty('--color-active-green-bg', '#E4FFE9');
    root.style.setProperty('--color-dark-active-green', '#00632D');
  }
  root.setAttribute('data-theme', m);
}
