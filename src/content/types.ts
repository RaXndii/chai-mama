/**
 * Content types (i18n-ready, DECISIONS D-006). Every string a visitor reads lives in src/content.
 * Anything not supplied by the client is marked `placeholder: true` — the UI shows a small
 * "placeholder" badge next to it and `npm run content:check` lists what is still missing.
 */
export type Locale = 'en' | 'ckb';
/**
 * The site's languages (DX-027): English, and Central Kurdish (Sorani, `ckb`), right to left. `intl` is the
 * tag for Intl formatting (Kurdish digits, month names, collation).
 */
export const LOCALES: Record<Locale, { label: string; short: string; dir: 'ltr' | 'rtl'; intl: string }> = {
  en: { label: 'English', short: 'EN', dir: 'ltr', intl: 'en' },
  ckb: { label: 'کوردی', short: 'کو', dir: 'rtl', intl: 'ckb' },
};
/** English always exists; any other language is optional and falls back to English (DX-027). */
export type Localized<T> = { en: T } & Partial<Record<Exclude<Locale, 'en'>, T>>;

export interface Placeholderable {
  placeholder?: boolean;
}

export interface TextBlock extends Placeholderable {
  text: string;
}

export interface ContactChannel extends Placeholderable {
  /** What the visitor sees. */
  display: string;
  /** Machine value: tel:+…, mailto:…, https://… */
  href: string;
}

export interface VideoRef {
  provider: 'youtube' | 'vimeo' | 'file';
  /** YouTube/Vimeo id, or a URL for `file`. */
  id: string;
}

export interface PortfolioItem extends Placeholderable {
  id: string;
  title: string;
  client: string;
  category: string;
  year: string;
  summary: string;
  /** Image URL (public/ or remote). Null → a generated branded thumbnail. */
  thumbnail: string | null;
  video: VideoRef | null;
  /** Larger stills shown in the lightbox (the first is the cover); none → the thumbnail. */
  gallery?: string[];
  /** Where the project is published (e.g. its page on the studio's own website). */
  link?: ContactChannel;
}

export interface TeamMember extends Placeholderable {
  id: string;
  name: string;
  role: string;
  line: string;
  /** Image URL. Null → silhouette placeholder. */
  photo: string | null;
}

export interface HotspotCopy {
  label: string;
  hint: string;
}
