export interface Route {
  id: string;
  title: string;
  hash: string;
  imageSrc: string;
}

export const ROUTES: Route[] = [
  { id: 'assets', title: 'Assets', hash: '#/assets', imageSrc: '' },
];

const DEFAULT_ROUTE = ROUTES[0];

export function getCurrentRoute(): Route {
  const hash = window.location.hash;
  if (hash === '#/assets' || hash.startsWith('#/assets/')) {
    return DEFAULT_ROUTE;
  }
  return DEFAULT_ROUTE;
}

export function getAssetsSubId(): string | null {
  const hash = window.location.hash;
  if (hash !== '#/assets' && hash.startsWith('#/assets/')) {
    return hash.slice('#/assets/'.length);
  }
  return null;
}

export function initRouter(onChange: (route: Route) => void): void {
  window.addEventListener('hashchange', () => {
    const route = getCurrentRoute();
    if (!window.location.hash.startsWith('#/assets')) {
      window.location.hash = route.hash;
      return;
    }
    onChange(route);
  });

  if (!window.location.hash || !window.location.hash.startsWith('#/assets')) {
    window.location.hash = DEFAULT_ROUTE.hash;
  }

  onChange(getCurrentRoute());
}
