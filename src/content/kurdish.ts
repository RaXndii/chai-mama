/**
 * Kurdish (Sorani) number and date formatting (DECISIONS DX-027). Written out by hand instead of through
 * `Intl` with the `ckb` locale: Chrome ships without Kurdish data and quietly falls back to English digits
 * and month names, so the same page would read differently from one browser to the next.
 */

const DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Western digits to Kurdish ones (٠–٩), with Kurdish separators: 12,345.6 → ١٢٬٣٤٥٫٦. */
export const toKurdishDigits = (text: string | number): string =>
  String(text).replace(/[0-9.,]/g, (c) => (c === ',' ? '٬' : c === '.' ? '٫' : DIGITS[Number(c)]!));

/** A number in Kurdish digits, grouped: 1234 → ١٬٢٣٤. */
export const kuNum = (n: number): string => toKurdishDigits(new Intl.NumberFormat('en').format(n));

/** A compact count in words: 950 → ٩٥٠, 12 400 → ١٢٫٤ هەزار, 10 300 000 → ١٠٫٣ ملیۆن. */
export function kuCompact(n: number): string {
  const one = (x: number) =>
    toKurdishDigits(new Intl.NumberFormat('en', { maximumFractionDigits: 1, useGrouping: false }).format(x));
  if (n >= 1e6) return `${one(n / 1e6)} ملیۆن`;
  if (n >= 1e3) return `${one(n / 1e3)} هەزار`;
  return kuNum(n);
}

/** The months as Kurdistan writes them (the Syriac names, as in CLDR). */
export const KU_MONTHS = [
  'کانوونی دووەم',
  'شوبات',
  'ئازار',
  'نیسان',
  'ئایار',
  'حوزەیران',
  'تەمووز',
  'ئاب',
  'ئەیلوول',
  'تشرینی یەکەم',
  'تشرینی دووەم',
  'کانوونی یەکەم',
] as const;

/** 2026-09-28 → ٢٨ی ئەیلوولی ٢٠٢٦ (day, month and year each joined with the Kurdish ی). */
export function kuDate(d: Date): string {
  return `${toKurdishDigits(d.getUTCDate())}ی ${KU_MONTHS[d.getUTCMonth()]}ی ${toKurdishDigits(d.getUTCFullYear())}`;
}
