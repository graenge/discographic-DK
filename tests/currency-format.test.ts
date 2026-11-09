import { describe, expect, it } from 'vitest';
import { DEFAULT_DISPLAY_CURRENCY } from '../shared/currency.js';
import { formatCurrency } from '../src/lib/format.js';

describe('currency formatting', () => {
  it('defaults to DKK and formats it with Danish number conventions', () => {
    const expected = new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency: 'DKK',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(1234.5);

    expect(DEFAULT_DISPLAY_CURRENCY).toBe('DKK');
    expect(formatCurrency(1234.5)).toBe(expected);
    expect(formatCurrency(1234.5, 'DKK')).toBe(expected);
  });
});
