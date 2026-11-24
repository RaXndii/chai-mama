import { describe, expect, it } from 'vitest';
import { clampQty, formatIqd, MAX_QTY, MIN_QTY, ORDER_OPTIONS, subtotal, unitPrice } from './order';

describe('a Chai Mama order (CM-010)', () => {
  it("has the owner's prices: a pouch at 3,000 IQD, a carton of 42 at 2,750 a pouch", () => {
    expect(ORDER_OPTIONS.pouch).toEqual({ pouches: 1, perPouch: 3000 });
    expect(ORDER_OPTIONS.carton).toEqual({ pouches: 42, perPouch: 2750 });
    expect(unitPrice('pouch')).toBe(3000);
    expect(unitPrice('carton')).toBe(115_500);
  });

  it('comes to the unit price times the quantity', () => {
    expect(subtotal('pouch', 1)).toBe(3000);
    expect(subtotal('pouch', 4)).toBe(12_000);
    expect(subtotal('carton', 2)).toBe(231_000);
  });

  it('never goes below one or past the most, and only whole units', () => {
    expect(clampQty(0)).toBe(MIN_QTY);
    expect(clampQty(-3)).toBe(MIN_QTY);
    expect(clampQty(Number.NaN)).toBe(MIN_QTY);
    expect(clampQty(2.4)).toBe(2);
    expect(clampQty(1000)).toBe(MAX_QTY);
    expect(subtotal('pouch', 0)).toBe(3000);
  });

  it('reads in each language', () => {
    expect(formatIqd(115_500, 'en')).toBe('115,500 IQD');
    expect(formatIqd(3000, 'ckb')).toBe('٣٬٠٠٠ دینار');
  });
});
