/** Monedas soportadas por la plataforma (mesas cash y torneos). */
export const CURRENCIES = ['USD', 'VES', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'USD';
