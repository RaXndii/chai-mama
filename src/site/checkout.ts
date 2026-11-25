import type { BlendId } from '@/content/chaimama';
import type { Locale } from '@/content/types';
import type { OptionId } from './order';

/**
 * The checkout's rules (DECISIONS CM-019), apart from its looks: the countries a phone can be from (the Middle
 * East first, then Europe), how a number is read and checked, and where an order goes.
 */
export interface Dial {
  /** ISO country code. */
  iso: string;
  /** The calling code, without the +. */
  code: string;
  flag: string;
  /** How long the national number is (without a leading 0), shortest and longest. */
  len: [number, number];
  /** What a number looks like there (placeholder). */
  example?: string;
  /** Mobile numbers there start with this (Iraq: 7). */
  lead?: string;
}

export const DIALS: readonly Dial[] = [
  // The Middle East.
  { iso: 'IQ', code: '964', flag: '🇮🇶', len: [10, 10], example: '770 123 4567', lead: '7' },
  { iso: 'TR', code: '90', flag: '🇹🇷', len: [10, 10], example: '532 123 4567' },
  { iso: 'IR', code: '98', flag: '🇮🇷', len: [10, 10], example: '912 123 4567' },
  { iso: 'SY', code: '963', flag: '🇸🇾', len: [9, 9] },
  { iso: 'JO', code: '962', flag: '🇯🇴', len: [9, 9] },
  { iso: 'LB', code: '961', flag: '🇱🇧', len: [7, 8] },
  { iso: 'KW', code: '965', flag: '🇰🇼', len: [8, 8] },
  { iso: 'SA', code: '966', flag: '🇸🇦', len: [9, 9] },
  { iso: 'AE', code: '971', flag: '🇦🇪', len: [9, 9] },
  { iso: 'QA', code: '974', flag: '🇶🇦', len: [8, 8] },
  { iso: 'BH', code: '973', flag: '🇧🇭', len: [8, 8] },
  { iso: 'OM', code: '968', flag: '🇴🇲', len: [8, 8] },
  { iso: 'EG', code: '20', flag: '🇪🇬', len: [10, 10] },
  // Europe.
  { iso: 'DE', code: '49', flag: '🇩🇪', len: [10, 11] },
  { iso: 'GB', code: '44', flag: '🇬🇧', len: [10, 10] },
  { iso: 'SE', code: '46', flag: '🇸🇪', len: [7, 9] },
  { iso: 'NL', code: '31', flag: '🇳🇱', len: [9, 9] },
  { iso: 'FR', code: '33', flag: '🇫🇷', len: [9, 9] },
  { iso: 'AT', code: '43', flag: '🇦🇹', len: [10, 13] },
  { iso: 'NO', code: '47', flag: '🇳🇴', len: [8, 8] },
  { iso: 'DK', code: '45', flag: '🇩🇰', len: [8, 8] },
  { iso: 'FI', code: '358', flag: '🇫🇮', len: [9, 10] },
  { iso: 'BE', code: '32', flag: '🇧🇪', len: [9, 9] },
  { iso: 'CH', code: '41', flag: '🇨🇭', len: [9, 9] },
  { iso: 'IT', code: '39', flag: '🇮🇹', len: [9, 10] },
  { iso: 'ES', code: '34', flag: '🇪🇸', len: [9, 9] },
  { iso: 'GR', code: '30', flag: '🇬🇷', len: [10, 10] },
  { iso: 'PL', code: '48', flag: '🇵🇱', len: [9, 9] },
];

export const DEFAULT_DIAL = 'IQ';

export const dialOf = (iso: string): Dial => DIALS.find((d) => d.iso === iso) ?? DIALS[0]!;

/** Kurdish (٠–٩) and Persian digits to Western ones; everything but digits out. */
export function digitsOnly(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
}

/**
 * The national number as typed, read: digits only, without the country code if it was typed too, without the
 * trunk 0 (0770… is 770…). Null when it is not a number of that country.
 */
export function readPhone(dial: Dial, input: string): string | null {
  let n = digitsOnly(input);
  if (n.startsWith('00' + dial.code)) n = n.slice(2 + dial.code.length);
  else if (input.trim().startsWith('+') && n.startsWith(dial.code)) n = n.slice(dial.code.length);
  n = n.replace(/^0+/, '');
  const [min, max] = dial.len;
  if (n.length < min || n.length > max) return null;
  if (dial.lead && !n.startsWith(dial.lead)) return null;
  return n;
}

/** +964 770 123 4567: the full number, in groups, for showing it back. */
export function showPhone(dial: Dial, national: string): string {
  const groups = national.length === 10 ? [3, 3, 4] : national.length === 9 ? [3, 3, 3] : [4, 4, 4];
  const parts: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= national.length) break;
    parts.push(national.slice(i, i + g));
    i += g;
  }
  if (i < national.length) parts.push(national.slice(i));
  return `+${dial.code} ${parts.join(' ')}`;
}

export const emailOk = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Where the order goes, as the visitor pinned it (or typed it, without the map). */
export interface Place {
  lat?: number;
  lng?: number;
  /** A readable address for it (from the map's search), or what was typed. */
  label: string;
  city?: string;
  country?: string;
}

export interface Order {
  blend: BlendId;
  option: OptionId;
  quantity: number;
  unitPrice: number;
  total: number;
  currency: 'IQD';
  name: string;
  /** +9647701234567 */
  phone: string;
  email?: string;
  place: Place;
  landmark?: string;
  notes?: string;
  lang: Locale;
}

/**
 * Send an order. It goes to the shop's order endpoint when the site is built with one (VITE_ORDER_ENDPOINT: a
 * URL that takes the order as JSON); without one nothing leaves the page, and the visitor is told so.
 */
export async function sendOrder(order: Order): Promise<'sent' | 'unsent'> {
  const url = import.meta.env.VITE_ORDER_ENDPOINT as string | undefined;
  if (!url) return 'unsent';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...order, sentAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return 'sent';
}
