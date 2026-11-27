/**
 * The site's pages: the homepage, which scrolls on through "How was your tea?" (`share`) into Our Story (`about`)
 * — one scroll, its address following it (CM-021, CM-025) — the shop, and the reviews.
 */
export type ChaiPage = 'home' | 'shop' | 'share' | 'about' | 'reviews';

/** The pages that are parts of the homepage's one scroll. */
export const inScroll = (p: ChaiPage): boolean => p === 'home' || p === 'share' || p === 'about';

/** Where the site lives: `/` on its own domain, `/chai-mama/` on GitHub Pages (Vite's `base`). */
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

/** The page at an address (anything unknown is the homepage). */
export const pageOf = (path: string): ChaiPage => {
  const p = (path.startsWith(BASE) ? path.slice(BASE.length) : path).replace(/\/+$/, '');
  return p === '/shop'
    ? 'shop'
    : p === '/about'
      ? 'about'
      : p === '/share'
        ? 'share'
        : p === '/reviews'
          ? 'reviews'
          : 'home';
};

/** A page's address. */
export const pathOf = (page: ChaiPage): string => `${BASE}${page === 'home' ? '/' : `/${page}`}`;
