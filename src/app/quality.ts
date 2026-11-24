import { createStore } from 'zustand';

/**
 * How much the page may move. `lite` (a weak or data-saving device, or `?lite=1`): the falling tea is lighter
 * and the arrival calm. `reducedMotion` follows the visitor's system setting, live.
 */
export interface QualityState {
  tier: 'lite' | 'full';
  reducedMotion: boolean;
}

function initialTier(): QualityState['tier'] {
  if (typeof window === 'undefined') return 'full';
  if (new URLSearchParams(window.location.search).get('lite') === '1') return 'lite';
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return 'lite';
  if ((nav.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2) return 'lite';
  return 'full';
}

const reduce = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;

export const qualityStore = createStore<QualityState>(() => ({
  tier: initialTier(),
  reducedMotion: !!reduce?.matches,
}));

reduce?.addEventListener?.('change', (e) => qualityStore.setState({ reducedMotion: e.matches }));
