import { describe, expect, it } from 'vitest';
import { DEFAULT_CURRENCY, formatMoney, normalizeCurrency, toAmount } from '../money';
import { formatCurrency } from '../utils';

const text = (value: string) => value.replace(/\u00a0/g, ' ');

describe('formatMoney', () => {
  it('formats in the en-US currency style', () => {
    expect(formatMoney(1250)).toBe('$1,250.00');
    expect(formatMoney(1250, 'EUR')).toBe('€1,250.00');
    expect(formatMoney(1250, 'GBP')).toBe('£1,250.00');
    expect(text(formatMoney(1250, 'EUR'))).toBe('€1,250.00');
    expect(formatMoney(-1234.56)).toBe('-$1,234.56');
  });

  it('uses each currency’s own decimals', () => {
    expect(formatMoney(1250, 'JPY')).toBe('¥1,250');
  });

  it('has a compact form for KPI tiles', () => {
    expect(formatMoney(12400, 'USD', { compact: true })).toBe('$12.4K');
    expect(formatMoney(1_250_000, 'USD', { compact: true })).toBe('$1.3M');
    expect(text(formatMoney(7650, 'EUR', { compact: true }))).toBe('€7.7K');
  });

  it('defaults to USD and falls back to it for a missing or invalid code', () => {
    expect(DEFAULT_CURRENCY).toBe('USD');
    expect(formatMoney(5, undefined)).toBe('$5.00');
    expect(formatMoney(5, '')).toBe('$5.00');
    expect(formatMoney(5, 'dollars')).toBe('$5.00');
    expect(formatMoney(5, 'usd')).toBe('$5.00');
  });

  it('accepts decimal strings and treats junk as zero', () => {
    expect(formatMoney('29.00')).toBe('$29.00');
    expect(formatMoney('1,530.5')).toBe('$1,530.50');
    expect(formatMoney(null)).toBe('$0.00');
    expect(formatMoney(Number.NaN)).toBe('$0.00');
    expect(formatMoney(Infinity)).toBe('$0.00');
  });
});

describe('helpers', () => {
  it('normalizeCurrency', () => {
    expect(normalizeCurrency(' eur ')).toBe('EUR');
    expect(normalizeCurrency(42)).toBe('USD');
  });

  it('toAmount', () => {
    expect(toAmount('12.5')).toBe(12.5);
    expect(toAmount({})).toBe(0);
  });

  it('formatCurrency always renders Stays prices in USD', () => {
    expect(formatCurrency(1530)).toBe('$1,530.00');
    expect(formatCurrency(1530, 'EUR')).toBe('$1,530.00');
  });
});
