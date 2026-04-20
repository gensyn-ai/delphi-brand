export interface Route {
  id: string;
  title: string;
  hash: string;
  imageSrc: string;
}

export const ROUTES: Route[] = [
  { id: 'assets', title: 'Assets', hash: '#/assets', imageSrc: '' },
  { id: 'creator-tools', title: 'Creator Tools', hash: '#/creator-tools', imageSrc: '' },
];

const DEFAULT_ROUTE = ROUTES[0];
const ASSETS_ROUTE = ROUTES.find((r) => r.id === 'assets') ?? DEFAULT_ROUTE;
const CREATOR_TOOLS_ROUTE = ROUTES.find((r) => r.id === 'creator-tools') ?? DEFAULT_ROUTE;

export function getCurrentRoute(): Route {
  const hash = window.location.hash;
  if (hash === '#/assets' || hash.startsWith('#/assets/')) {
    return ASSETS_ROUTE;
  }
  if (hash === '#/creator-tools' || hash.startsWith('#/creator-tools/')) {
    return CREATOR_TOOLS_ROUTE;
  }
  return ROUTES.find((r) => r.hash === hash) || DEFAULT_ROUTE;
}

export function getAssetsSubId(): string | null {
  const hash = window.location.hash;
  if (hash !== '#/assets' && hash.startsWith('#/assets/')) {
    return hash.slice('#/assets/'.length);
  }
  return null;
}

export function getCreatorToolsSubId(): string | null {
  const hash = window.location.hash;
  if (hash !== '#/creator-tools' && hash.startsWith('#/creator-tools/')) {
    return hash.slice('#/creator-tools/'.length);
  }
  return null;
}

export function initRouter(onChange: (route: Route) => void): void {
  window.addEventListener('hashchange', () => {
    onChange(getCurrentRoute());
  });

  if (!window.location.hash) {
    window.location.hash = DEFAULT_ROUTE.hash;
  }

  onChange(getCurrentRoute());
}
