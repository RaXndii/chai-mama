import { describe, expect, it } from 'vitest';
import { DIALS, dialOf, digitsOnly, emailOk, readPhone, sendOrder, showPhone } from './checkout';

describe('the checkout (CM-019)', () => {
  it('lists the Middle East first (Iraq at the top), then Europe, each country once', () => {
    expect(DIALS[0]!.iso).toBe('IQ');
    const isos = DIALS.map((d) => d.iso);
    expect(new Set(isos).size).toBe(isos.length);
    expect(isos.indexOf('AE')).toBeLessThan(isos.indexOf('DE'));
    expect(dialOf('XX').iso).toBe('IQ');
  });

  it('reads Kurdish and Persian digits', () => {
    expect(digitsOnly('٠٧٧٠ ١٢٣ ٤٥٦٧')).toBe('07701234567');
    expect(digitsOnly('۰۷۵۰')).toBe('0750');
  });

  it('reads an Iraqi number however it is typed', () => {
    const iq = dialOf('IQ');
    for (const typed of [
      '770 123 4567',
      '0770 123 4567',
      '+964 770 123 4567',
      '00964 7701234567',
      '٠٧٧٠١٢٣٤٥٦٧',
    ])
      expect(readPhone(iq, typed)).toBe('7701234567');
    // Too short, too long, or not a mobile.
    expect(readPhone(iq, '770 123')).toBeNull();
    expect(readPhone(iq, '770 123 45678')).toBeNull();
    expect(readPhone(iq, '0660 123 4567')).toBeNull();
  });

  it('reads European numbers of their own lengths', () => {
    expect(readPhone(dialOf('DE'), '+49 1512 3456789')).toBe('15123456789');
    expect(readPhone(dialOf('GB'), '07700 900123')).toBe('7700900123');
    expect(readPhone(dialOf('SE'), '070-123 45 67')).toBe('701234567');
    expect(readPhone(dialOf('NO'), '123')).toBeNull();
  });

  it('shows a number back in groups', () => {
    expect(showPhone(dialOf('IQ'), '7701234567')).toBe('+964 770 123 4567');
    expect(showPhone(dialOf('FR'), '612345678')).toBe('+33 612 345 678');
  });

  it('checks an email loosely', () => {
    expect(emailOk('aras@example.com')).toBe(true);
    expect(emailOk(' aras@example.co ')).toBe(true);
    expect(emailOk('aras@')).toBe(false);
    expect(emailOk('aras@example')).toBe(false);
  });

  it('sends nothing without an order address, and says so', async () => {
    await expect(
      sendOrder({
        blend: 'heritage',
        option: 'pouch',
        quantity: 1,
        unitPrice: 3000,
        total: 3000,
        currency: 'IQD',
        name: 'Aras',
        phone: '+9647701234567',
        place: { label: 'Erbil' },
        lang: 'en',
      }),
    ).resolves.toBe('unsent');
  });
});
