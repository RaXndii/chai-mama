import { createStore, useStore } from 'zustand';
import { pageOf, pathOf, type ChaiPage } from '../routes';

/**
 * The site's own router: three pages (`/`, `/shop`, `/about`), real addresses, the browser's Back and Forward,
 * no reloads. The query (`?lang=`, `?blend=`) is kept as the visitor moves between pages.
 */
const here = (): ChaiPage => (typeof window === 'undefined' ? 'home' : pageOf(window.location.pathname));

export const routerStore = createStore<{ page: ChaiPage }>(() => ({ page: here() }));

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => routerStore.setState({ page: here() }));
}

/** Go to a page: a new history entry, the page shown at once (the caller animates the change). */
export function navigate(page: ChaiPage): void {
  if (page === routerStore.getState().page) return;
  window.history.pushState(null, '', pathOf(page) + window.location.search);
  routerStore.setState({ page });
}

/** The page shown, re-rendering the caller when it changes. */
export const usePage = (): ChaiPage => useStore(routerStore, (s) => s.page);
