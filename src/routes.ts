/** The site's pages: the homepage, the shop and Our Story. */
export type ChaiPage = 'home' | 'shop' | 'about';

/** The page at an address (anything unknown is the homepage). */
export const pageOf = (path: string): ChaiPage => {
  const p = path.replace(/\/+$/, '');
  return p === '/shop' ? 'shop' : p === '/about' ? 'about' : 'home';
};

/** A page's address. */
export const pathOf = (page: ChaiPage): string => (page === 'home' ? '/' : `/${page}`);
