import { describe, expect, it } from 'vitest';
import { checkList, checkShape, collectCurrencies } from '../guards';

describe('checkShape', () => {
  const spec = { id: 'string', amount: 'numeric', 'property.name': 'string', note: 'string?' } as const;

  it('passes a matching object', () => {
    expect(checkShape({ id: 'b1', amount: 10, property: { name: 'Hotel' } }, spec)).toEqual([]);
  });

  it('accepts decimal strings for numeric money fields', () => {
    expect(checkShape({ id: 'b1', amount: '29.00', property: { name: 'H' } }, spec)).toEqual([]);
    expect(checkShape({ id: 'b1', amount: 'abc', property: { name: 'H' } }, spec)).toEqual([
      { path: 'amount', problem: 'expected numeric, got string' },
    ]);
  });

  it('reports missing, wrong-kind and nested fields', () => {
    expect(checkShape({ id: 1, property: {} }, spec)).toEqual([
      { path: 'id', problem: 'expected string, got number' },
      { path: 'amount', problem: 'missing' },
      { path: 'property.name', problem: 'missing' },
    ]);
  });

  it('checks optional fields only when present', () => {
    const base = { id: 'b1', amount: 1, property: { name: 'H' } };
    expect(checkShape(base, spec)).toEqual([]);
    expect(checkShape({ ...base, note: 3 }, spec)).toEqual([{ path: 'note', problem: 'expected string, got number' }]);
  });

  it('rejects a non-object root', () => {
    expect(checkShape(null, spec, 'data')).toEqual([{ path: 'data', problem: 'expected an object, got null' }]);
  });
});

describe('checkList', () => {
  it('de-duplicates the same issue across rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: `r${i}` }));
    expect(checkList(rows, { id: 'string', total: 'numeric' }, 'rows[]')).toEqual([
      { path: 'rows[].total', problem: 'missing' },
    ]);
  });

  it('flags a non-array', () => {
    expect(checkList({}, { id: 'string' }, 'rows[]')).toEqual([{ path: 'rows[]', problem: 'expected an array, got object' }]);
  });
});

describe('collectCurrencies', () => {
  it('finds currency codes anywhere in a payload', () => {
    const payload = { data: { currency: 'usd', rows: [{ currency: 'EUR' }, { nested: { currency: 'GBP' } }] } };
    expect([...collectCurrencies(payload)].sort()).toEqual(['EUR', 'GBP', 'USD']);
  });
});
