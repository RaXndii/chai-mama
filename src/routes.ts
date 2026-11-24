/** The site's pages: the homepage, the shop and Our Story. */
export type ChaiPage = 'home' | 'shop' | 'about';

/** Where the site lives: `/` on its own domain, `/chai-mama/` on GitHub Pages (Vite's `base`). */
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

/** The page at an address (anything unknown is the homepage). */
export const pageOf = (path: string): ChaiPage => {
  const p = (path.startsWith(BASE) ? path.slice(BASE.length) : path).replace(/\/+$/, '');
  return p === '/shop' ? 'shop' : p === '/about' ? 'about' : 'home';
};

/** A page's address. */
export const pathOf = (page: ChaiPage): string => `${BASE}${page === 'home' ? '/' : `/${page}`}`;
