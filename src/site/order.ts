import { kuNum } from '@/content/kurdish';
import type { Locale } from '@/content/types';

/**
 * What a Chai Mama order costs (DECISIONS CM-010). The prices are the owner's (2026-10-22), the same for both
 * blends: a single 200 g pouch at 3,000 IQD, or a master carton of 42 pouches at 2,750 IQD a pouch. Nothing
 * else is known yet — no delivery terms, no offers — so the page adds none. Ordering itself is not open on the
 * site yet; this only works out what the visitor's choice would come to.
 */
export type OptionId = 'pouch' | 'carton';
export const OPTIONS: readonly OptionId[] = ['pouch', 'carton'];

export interface OrderOption {
  /** Pouches in one unit of this option. */
  pouches: number;
  /** What one pouch costs in this option (IQD). */
  perPouch: number;
}

export const ORDER_OPTIONS: Record<OptionId, OrderOption> = {
  pouch: { pouches: 1, perPouch: 3000 },
  carton: { pouches: 42, perPouch: 2750 },
};

/** The fewest and the most units the quantity can be set to (the page's own limits, not the owner's). */
export const MIN_QTY = 1;
export const MAX_QTY = 99;

/** One unit of an option (IQD): a pouch, or a whole carton. */
export const unitPrice = (id: OptionId): number => ORDER_OPTIONS[id].pouches * ORDER_OPTIONS[id].perPouch;

/** A quantity the page accepts: a whole number from MIN_QTY to MAX_QTY (anything else is brought in range). */
export function clampQty(n: number): number {
  if (!Number.isFinite(n)) return MIN_QTY;
  return Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(n)));
}

/** What the choice comes to before delivery (IQD). */
export const subtotal = (id: OptionId, qty: number): number => unitPrice(id) * clampQty(qty);

/** 3000 → "3,000 IQD"; in Kurdish "٣٬٠٠٠ دینار". */
export function formatIqd(n: number, lang: Locale): string {
  return lang === 'ckb' ? `${kuNum(n)} دینار` : `${new Intl.NumberFormat('en').format(n)} IQD`;
}

/** A plain count in the page's digits: 42 → "42" / "٤٢". */
export const formatCount = (n: number, lang: Locale): string =>
  lang === 'ckb' ? kuNum(n) : new Intl.NumberFormat('en').format(n);
