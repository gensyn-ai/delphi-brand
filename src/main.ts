import { applyCSS, getMode, toggleTheme } from './theme';
import { initRouter, getAssetsSubId } from './router';
import { mount as mountAssets, unmount as unmountAssets } from './pages/assets';

applyCSS(getMode());

const contentEl = document.getElementById('content')!;
const logoBtn = document.getElementById('app-logo-btn');
const themeToggleBtn = document.getElementById('theme-toggle');

logoBtn?.addEventListener('click', () => {
  window.location.hash = '#/assets';
});

themeToggleBtn?.addEventListener('click', () => {
  toggleTheme();
});

function mountAssetsPage(): void {
  unmountAssets(contentEl);
  mountAssets(contentEl, getAssetsSubId());
}

initRouter(mountAssetsPage);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unmountAssets(contentEl);
  });
}
