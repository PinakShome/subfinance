// Approximate FX rates as units per 1 USD. Bundled (no network/API key) so
// cross-currency totals are self-contained. These are for display aggregation
// only — a personal tracker doesn't need trade-grade precision — and are the
// single place to refresh if you later wire a live rates feed.
export const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 150,
  CNY: 7.1,
  CHF: 0.88,
  SGD: 1.34,
  AED: 3.67,
  BRL: 5.0,
  MXN: 18,
  ZAR: 18.5,
};

/** Convert an amount between currencies via USD. Unknown codes are treated as USD. */
export function convert(amount: number, from = 'USD', to = 'USD'): number {
  if (!Number.isFinite(amount)) return 0;
  const f = USD_RATES[(from ?? 'USD').toUpperCase()] ?? 1;
  const t = USD_RATES[(to ?? 'USD').toUpperCase()] ?? 1;
  if (from?.toUpperCase() === to?.toUpperCase()) return amount;
  return (amount / f) * t;
}

/** Whether a subscription list mixes more than one currency (totals then rely on conversion). */
export function hasMixedCurrencies(currencies: string[]): boolean {
  return new Set(currencies.map((c) => (c ?? 'USD').toUpperCase())).size > 1;
}
