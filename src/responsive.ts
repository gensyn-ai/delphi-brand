const MQ_MOBILE = '(max-width: 768px)';
const MQ_SMALL = '(max-width: 480px)';

export function isMobile(): boolean {
  return window.matchMedia(MQ_MOBILE).matches;
}

export function isSmall(): boolean {
  return window.matchMedia(MQ_SMALL).matches;
}

export function pagePadding(): string {
  if (isSmall()) return '20px 12px';
  if (isMobile()) return '24px 16px';
  return '48px 60px';
}

export function overlayPadding(): string {
  if (isSmall()) return '20px 12px';
  if (isMobile()) return '24px 16px';
  return '56px 72px';
}
