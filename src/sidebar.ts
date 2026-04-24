import { ROUTES, type Route } from './router';
import { toggleTheme } from './theme';

// Parked for future reintroduction of side navigation.
// The current app entry mounts an assets-only flow and does not import this module.

const LOGO_SVG = `<svg class="sidebar-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style="color: var(--fg);">
  <path d="M128.35,14.96h-56.69c-31.31,0-56.69,25.38-56.69,56.69v56.69c0,31.31,25.38,56.69,56.69,56.69h56.69c31.31,0,56.69-25.38,56.69-56.69v-56.69c0-31.31-25.38-56.69-56.69-56.69Z" fill="none" stroke="currentColor" stroke-width="3"/>
  <rect class="bar-left" x="33.07" y="98.59" width="62.37" height="64.43" rx="27.63" ry="27.63" fill="none" stroke="currentColor" stroke-width="3"/>
  <rect class="bar-right" x="104.62" y="37.71" width="62.37" height="125" rx="28.35" ry="28.35" fill="none" stroke="currentColor" stroke-width="3"/>
</svg>`;

const TOGGLE_HTML = `<button id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">
  <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--fg);">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
  <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--fg);">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
</button>`;

let navItems: HTMLAnchorElement[] = [];
let hamburgerBtn: HTMLButtonElement | null = null;
let backdrop: HTMLDivElement | null = null;
let sidebarRef: HTMLElement | null = null;

function isMobileView(): boolean {
  return window.matchMedia('(max-width: 768px)').matches;
}

function closeSidebar(): void {
  if (sidebarRef) sidebarRef.classList.remove('sidebar-open');
  if (backdrop) backdrop.classList.remove('visible');
}

function toggleSidebar(): void {
  if (!sidebarRef) return;
  const opening = !sidebarRef.classList.contains('sidebar-open');
  sidebarRef.classList.toggle('sidebar-open', opening);
  if (backdrop) backdrop.classList.toggle('visible', opening);
}

export type OnNavClick = (route: Route) => void;

export function createSidebar(sidebarEl: HTMLElement, onNavClick?: OnNavClick): void {
  sidebarRef = sidebarEl;

  hamburgerBtn = document.createElement('button');
  hamburgerBtn.className = 'hamburger-btn';
  hamburgerBtn.setAttribute('aria-label', 'Open menu');
  hamburgerBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  hamburgerBtn.addEventListener('click', toggleSidebar);
  document.body.appendChild(hamburgerBtn);

  backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  backdrop.addEventListener('click', closeSidebar);
  document.body.appendChild(backdrop);

  const logoWrapper = document.createElement('div');
  logoWrapper.innerHTML = LOGO_SVG;
  const logoSvg = logoWrapper.firstElementChild as SVGElement;
  logoSvg.addEventListener('click', () => {
    window.location.hash = '#/assets';
  });
  sidebarEl.appendChild(logoSvg);

  const nav = document.createElement('nav');
  nav.className = 'sidebar-nav';

  for (const route of ROUTES) {
    const a = document.createElement('a');
    a.href = route.hash;
    a.className = 'nav-item';
    a.dataset.routeId = route.id;
    if (onNavClick) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        onNavClick(route);
        if (isMobileView()) closeSidebar();
      });
    }

    if (route.imageSrc) {
      const img = document.createElement('img');
      img.className = 'nav-image';
      img.src = route.imageSrc;
      img.alt = route.title;
      a.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'nav-image-placeholder';
      a.appendChild(placeholder);
    }

    const indicator = document.createElement('span');
    indicator.className = 'nav-indicator';
    a.appendChild(indicator);

    const title = document.createElement('span');
    title.className = 'nav-title';
    title.textContent = route.title;
    a.appendChild(title);

    nav.appendChild(a);
    navItems.push(a);
  }

  sidebarEl.appendChild(nav);

  const footer = document.createElement('div');
  footer.className = 'sidebar-footer';
  footer.innerHTML = TOGGLE_HTML;
  sidebarEl.appendChild(footer);

  const toggleBtn = footer.querySelector('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => toggleTheme());
  }
}

export function setActiveRoute(route: Route): void {
  for (const item of navItems) {
    if (item.dataset.routeId === route.id) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  }
}
