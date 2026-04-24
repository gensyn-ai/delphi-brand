import { createDelphiImageryPanel, fetchDelphiEffectConfig } from './imagery-delphi';
import { overlayPadding, isMobile } from '../responsive';

// Parked for possible future reintroduction of Creator Tools routing.
// This module is currently not mounted by the app entrypoint.

const CREATOR_TOOLS = [
  { id: 'imagery', name: 'Image Generator', category: 'Creator Tools' },
] as const;

let detailOverlay: HTMLDivElement | null = null;
let creatorToolsHashChangeHandler: (() => void) | null = null;

function createToolDetailOverlay(container: HTMLElement, toolId: string): HTMLDivElement {
  const borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';
  const isImageryTool = toolId === 'imagery';
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: ${isImageryTool ? 'stretch' : 'flex-start'};
    justify-content: flex-start;
    padding: ${overlayPadding()};
    opacity: 0;
    transition: opacity 0.4s ease;
    overflow-y: ${isImageryTool ? 'hidden' : 'auto'};
    overflow-x: ${isImageryTool ? 'hidden' : 'hidden'};
    min-height: 0;
    background-color: var(--bg);
    background-image: radial-gradient(circle, rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.10) 1px, transparent 1px);
    background-size: 28px 28px;
  `;

  const inner = document.createElement('div');
  inner.style.cssText = isImageryTool
    ? `
    width: 100%;
    max-width: min(1320px, 100%);
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-self: stretch;
  `
    : `
    max-width: 680px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `;

  const backBtn = document.createElement('button');
  backBtn.textContent = '\u2190 back';
  backBtn.style.cssText = `
    background: none;
    border: none;
    font-family: 'Instrument Serif', serif;
    font-size: 13pt;
    color: var(--fg);
    opacity: 0.5;
    cursor: pointer;
    padding: 0;
    margin-bottom: 32px;
    align-self: flex-start;
    transition: opacity 0.2s ease;
  `;
  backBtn.addEventListener('mouseenter', () => { backBtn.style.opacity = '0.9'; });
  backBtn.addEventListener('mouseleave', () => { backBtn.style.opacity = '0.5'; });
  backBtn.addEventListener('click', () => {
    window.location.hash = '#/creator-tools';
  });

  const tool = CREATOR_TOOLS.find((t) => t.id === toolId);
  const title = document.createElement('h2');
  title.textContent = tool?.name ?? toolId;
  title.style.cssText = `
    font-family: 'Instrument Serif', serif;
    font-size: 22pt;
    font-weight: 400;
    color: var(--fg);
    opacity: 0.85;
    margin: 0 0 40px 0;
    letter-spacing: 0.01em;
  `;
  if (isImageryTool) {
    backBtn.style.flexShrink = '0';
    title.style.flexShrink = '0';
    title.style.marginBottom = '16px';
  }
  inner.appendChild(backBtn);
  inner.appendChild(title);

  const others = CREATOR_TOOLS.filter((t) => t.id !== toolId);
  const navRow = document.createElement('div');
  navRow.style.cssText = isImageryTool
    ? `
    display: flex;
    gap: 16px;
    margin-top: 0;
    padding-top: 20px;
    flex-wrap: wrap;
    flex-shrink: 0;
    width: 100%;
    box-sizing: border-box;
  `
    : `
    display: flex;
    gap: 16px;
    margin-top: 48px;
    flex-wrap: wrap;
  `;
  for (const other of others) {
    const btn = document.createElement('button');
    btn.textContent = other.name;
    btn.style.cssText = `
      background: none;
      border: 1px solid ${borderColor};
      border-radius: 6px;
      padding: 8px 16px;
      font-family: 'Instrument Serif', serif;
      font-size: 10pt;
      color: var(--fg);
      opacity: 0.55;
      cursor: pointer;
      transition: opacity 0.2s ease, border-color 0.2s ease;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.opacity = '0.9'; });
    btn.addEventListener('mouseleave', () => { btn.style.opacity = '0.55'; });
    btn.addEventListener('click', () => {
      window.location.hash = `#/creator-tools/${other.id}`;
    });
    navRow.appendChild(btn);
  }

  if (toolId === 'imagery') {
    const imageryScrollWrap = document.createElement('div');
    /* Workshop fills viewport band; only the imagery tools column scrolls (see imagery-delphi). */
    imageryScrollWrap.style.cssText = `
      flex: 1;
      min-height: 0;
      width: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      -webkit-overflow-scrolling: touch;
    `;
    inner.appendChild(imageryScrollWrap);

    const loadingEl = document.createElement('p');
    loadingEl.textContent = 'Loading…';
    loadingEl.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 9pt;
      color: var(--fg);
      opacity: 0.4;
    `;
    imageryScrollWrap.appendChild(loadingEl);
    const baseUrl = window.location.origin + (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
    const appendNavAfterImagery = (): void => {
      if (navRow.parentNode !== inner) inner.appendChild(navRow);
    };
    fetchDelphiEffectConfig(baseUrl).then((config) => {
      loadingEl.remove();
      createDelphiImageryPanel(imageryScrollWrap, config);
      appendNavAfterImagery();
    }).catch(() => {
      loadingEl.textContent = 'Failed to load effect config. Using defaults.';
      loadingEl.style.opacity = '0.6';
      setTimeout(() => {
        loadingEl.remove();
        createDelphiImageryPanel(imageryScrollWrap, null);
        appendNavAfterImagery();
      }, 1200);
    });
  }

  overlay.appendChild(inner);
  container.appendChild(overlay);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  });

  return overlay;
}

const boxBorder = '1px solid rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';

export function mount(container: HTMLElement, initialSubId?: string | null): void {
  const wrap = document.createElement('div');
  wrap.style.cssText = `
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: ${isMobile() ? '24px 16px' : '56px 64px'};
    box-sizing: border-box;
  `;

  const grid = document.createElement('div');
  grid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(2, minmax(160px, 1fr));
    gap: 28px;
    max-width: 640px;
    width: 100%;
  `;

  for (const tool of CREATOR_TOOLS) {
    const box = document.createElement('button');
    box.type = 'button';
    box.style.cssText = `
      background: rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02);
      border: ${boxBorder};
      border-radius: 12px;
      padding: 28px 24px;
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s ease, background 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    box.addEventListener('mouseenter', () => {
      box.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.25)';
      box.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.04)';
    });
    box.addEventListener('mouseleave', () => {
      box.style.borderColor = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.12)';
      box.style.background = 'rgba(var(--fg-r), var(--fg-g), var(--fg-b), 0.02)';
    });
    box.addEventListener('click', () => {
      window.location.hash = `#/creator-tools/${tool.id}`;
    });

    const nameEl = document.createElement('span');
    nameEl.textContent = tool.name;
    nameEl.style.cssText = `
      font-family: 'Instrument Serif', serif;
      font-size: 14pt;
      color: var(--fg);
      opacity: 0.9;
    `;
    const catEl = document.createElement('span');
    catEl.textContent = tool.category;
    catEl.style.cssText = `
      font-family: 'Fragment Mono', monospace;
      font-size: 8pt;
      color: var(--fg);
      opacity: 0.5;
    `;
    box.appendChild(nameEl);
    box.appendChild(catEl);
    grid.appendChild(box);
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);

  creatorToolsHashChangeHandler = () => {
    const hash = window.location.hash;
    if (hash === '#/creator-tools') {
      if (detailOverlay) {
        detailOverlay.remove();
        detailOverlay = null;
      }
    } else if (hash.startsWith('#/creator-tools/')) {
      const subId = hash.slice('#/creator-tools/'.length);
      if (CREATOR_TOOLS.some((t) => t.id === subId)) {
        if (detailOverlay) {
          detailOverlay.remove();
          detailOverlay = null;
        }
        detailOverlay = createToolDetailOverlay(container, subId);
      }
    }
  };
  window.addEventListener('hashchange', creatorToolsHashChangeHandler);

  if (initialSubId && CREATOR_TOOLS.some((t) => t.id === initialSubId)) {
    detailOverlay = createToolDetailOverlay(container, initialSubId);
  }
}

export function unmount(container: HTMLElement): void {
  if (creatorToolsHashChangeHandler) {
    window.removeEventListener('hashchange', creatorToolsHashChangeHandler);
    creatorToolsHashChangeHandler = null;
  }
  if (detailOverlay) {
    detailOverlay.remove();
    detailOverlay = null;
  }
  container.innerHTML = '';
}
