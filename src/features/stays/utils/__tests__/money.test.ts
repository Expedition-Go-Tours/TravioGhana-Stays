import { describe, expect, it } from 'vitest';
import { formatMoney } from '../money';

describe('formatMoney (Stays)', () => {
  it('uses the shared standard: USD by default, two decimals', () => {
    expect(formatMoney(6950)).toBe('$6,950.00');
    expect(formatMoney(750)).toBe('$750.00');
    expect(formatMoney(0)).toBe('$0.00');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('ignores any non-USD currency passed by a caller', () => {
    expect(formatMoney(1000, 'EUR')).toBe('$1,000.00');
    expect(formatMoney(1000, 'EUR')).toBe('$1,000.00');
  });

  it('survives junk', () => {
    expect(formatMoney(undefined)).toBe('$0.00');
    expect(formatMoney('not-a-number')).toBe('$0.00');
  });
});
