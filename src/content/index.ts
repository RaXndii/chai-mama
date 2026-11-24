import { createStore, useStore } from 'zustand';
import { chaimamaContent } from './chaimama';
import { LOCALES, type Locale, type Localized } from './types';

/**
 * The visitor's language: English or Central Kurdish (Sorani). It switches live: `chaimama` below is a live
 * binding, re-pointed by `setLocale`, so any component that reads it while it renders shows the new language on
 * its next render (`useLocale` triggers that).
 *
 * Chosen once from `?lang=` (en | ckb), then the visitor's last choice, then the browser's languages.
 */
const KEY = 'chai-mama-locale';
const isLocale = (v: unknown): v is Locale => typeof v === 'string' && v in LOCALES;

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(fromUrl)) return fromUrl;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {
    /* storage blocked: fall through */
  }
  const kurdish = (navigator.languages ?? [navigator.language]).some((l) => /^(ckb|ku)\b/i.test(l));
  return kurdish ? 'ckb' : 'en';
}

export let locale: Locale = initialLocale();
const pick = <T>(c: Localized<T>): T => c[locale as Exclude<Locale, 'en'>] ?? c.en;

export let chaimama = pick(chaimamaContent);

const applyDocument = () => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = LOCALES[locale].dir;
};
applyDocument();

export const localeStore = createStore<{ locale: Locale }>(() => ({ locale }));

/** Switch language everywhere; the choice is remembered. */
export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  chaimama = pick(chaimamaContent);
  applyDocument();
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    /* not remembered: fine */
  }
  localeStore.setState({ locale: next });
}

/** The current language, re-rendering the caller when it changes. */
export const useLocale = (): Locale => useStore(localeStore, (s) => s.locale);
