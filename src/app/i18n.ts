import { flushSync } from 'react-dom';
import { locale, setLocale } from '@/content';
import type { Locale } from '@/content/types';
import { qualityStore } from './quality';

/**
 * Change the site's language. The page re-renders in place, as one cross-fade (a view transition) so the switch
 * from left-to-right to right-to-left reads as a single change rather than a jump; immediate under reduced motion
 * or without view transitions.
 */
export function switchLocale(next: Locale): void {
  if (next === locale) return;
  const go = () => setLocale(next);
  if (typeof document.startViewTransition !== 'function' || qualityStore.getState().reducedMotion)
    return go();
  const root = document.documentElement;
  root.dataset.vt = 'lang';
  const t = document.startViewTransition(() => flushSync(go));
  void t.finished.finally(() => delete root.dataset.vt);
}
