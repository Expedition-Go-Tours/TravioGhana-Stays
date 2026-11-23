import { describe, expect, it } from 'vitest';
import { formatMoney } from '../money';

// Normalise the non-breaking space Intl puts between a currency code and the amount.
const text = (value: string) => value.replace(/\u00a0/g, ' ');

describe('formatMoney (Stays)', () => {
  it('uses the shared standard: USD by default, two decimals', () => {
    expect(formatMoney(6950)).toBe('$6,950.00');
    expect(formatMoney(750)).toBe('$750.00');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('keeps the record currency — amounts are never converted', () => {
    expect(text(formatMoney(1000, 'GHS'))).toBe('GHS 1,000.00');
    expect(formatMoney(1000, 'EUR')).toBe('€1,000.00');
  });

  it('survives junk', () => {
    expect(formatMoney(undefined)).toBe('$0.00');
    expect(formatMoney('not-a-number')).toBe('$0.00');
  });
});
