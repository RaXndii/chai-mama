import { describe, expect, it } from 'vitest';
import { inScroll, pageOf, pathOf } from './routes';

describe('the pages (CM-014, CM-021, CM-025)', () => {
  it('reads each address, and anything unknown as the homepage', () => {
    for (const p of ['home', 'shop', 'share', 'about', 'reviews'] as const) expect(pageOf(pathOf(p))).toBe(p);
    expect(pageOf('/nowhere')).toBe('home');
  });

  it('the homepage, "How was your tea?" and Our Story are one scroll; the shop and the reviews are not', () => {
    expect(['home', 'share', 'about'].every((p) => inScroll(p as never))).toBe(true);
    expect(inScroll('shop')).toBe(false);
    expect(inScroll('reviews')).toBe(false);
  });
});
