import type { ChaiPage } from '../routes';

/** The header's links (DECISIONS CM-008, CM-014), in its order: each goes to a page, Connect to its part of
 *  the About page. */
export const NAV_SECTIONS = ['chai-top', 'chai-about', 'chai-tea', 'chai-connect'] as const;
export type NavSection = (typeof NAV_SECTIONS)[number];

export const NAV_PAGE: Record<NavSection, ChaiPage> = {
  'chai-top': 'home',
  'chai-about': 'about',
  'chai-tea': 'shop',
  'chai-connect': 'about',
};
