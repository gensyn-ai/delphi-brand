import { applyCSS, getMode } from './theme';
import { initRouter, getAssetsSubId, getCreatorToolsSubId, type Route } from './router';
import { createSidebar, setActiveRoute } from './sidebar';
import { mount as mountAssets, unmount as unmountAssets } from './pages/assets';
import { mount as mountCreatorTools, unmount as unmountCreatorTools } from './pages/creator-tools';

applyCSS(getMode());

const sidebarEl = document.getElementById('sidebar')!;
const contentEl = document.getElementById('content')!;

let currentRouteId: string | null = null;

function handleNavClick(route: Route): void {
  window.location.hash = route.hash;
}

createSidebar(sidebarEl, handleNavClick);

function teardownCurrentPage(): void {
  if (currentRouteId === 'assets') {
    unmountAssets(contentEl);
  } else if (currentRouteId === 'creator-tools') {
    unmountCreatorTools(contentEl);
  }
}

function mountPage(route: Route): void {
  if (route.id === 'assets') {
    mountAssets(contentEl, getAssetsSubId());
  } else if (route.id === 'creator-tools') {
    mountCreatorTools(contentEl, getCreatorToolsSubId());
  }
  currentRouteId = route.id;
}

function onRouteChange(route: Route): void {
  if (route.id === currentRouteId) return;
  teardownCurrentPage();
  setActiveRoute(route);
  mountPage(route);
}

initRouter(onRouteChange);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownCurrentPage();
  });
}
