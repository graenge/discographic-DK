export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'DKK'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// Internal currency used for storage and calculations.
export const BASE_CURRENCY: Currency = 'EUR';

// Default currency shown to users.
export const DEFAULT_DISPLAY_CURRENCY: Currency = 'DKK';

// Legacy alias. Keep EUR as the internal base currency.
export const DEFAULT_CURRENCY: Currency = BASE_CURRENCY;

function isCurrency(value: string): value is Currency {
  return SUPPORTED_CURRENCIES.includes(value as Currency);
}

export function normalizeCurrency(
  value: unknown,
  fallback: Currency = DEFAULT_DISPLAY_CURRENCY
): Currency {
  const normalized = String(value || '').trim().toUpperCase();
  return isCurrency(normalized) ? normalized : fallback;
}