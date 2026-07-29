import { Subscription, BillingCycle } from '../types/database';

export function monthlyEquivalent(cost: number, cycle: BillingCycle, intervalDays?: number | null): number {
  const amount = Number.isFinite(cost) && cost > 0 ? cost : 0;
  switch (cycle) {
    case 'monthly':   return amount;
    case 'quarterly': return amount / 3;
    case 'annual':    return amount / 12;
    // Guard the interval: a zero/negative/absurd value would otherwise produce
    // negative or wildly inflated "monthly" spend and corrupt every total.
    case 'custom': {
      const days = intervalDays ?? 0;
      if (!Number.isFinite(days) || days < 1) return amount;
      return amount / (days / 30.44);
    }
    default:          return amount;
  }
}

export function annualEquivalent(cost: number, cycle: BillingCycle, intervalDays?: number | null): number {
  return monthlyEquivalent(cost, cycle, intervalDays) * 12;
}

export function daysUntilRenewal(nextRenewal: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(nextRenewal);
  return Math.ceil((renewal.getTime() - today.getTime()) / 86400000);
}

/** Parse a YYYY-MM-DD string as a *local* midnight date (avoids UTC shifting). */
function parseLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * True only for a real calendar date in YYYY-MM-DD form. A format-only regex
 * accepts impossible dates like 2026-13-45, so round-trip through Date and
 * confirm the parts survive.
 */
export function isRealDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** Add months, clamping to the end of the target month (Jan 31 + 1mo -> Feb 28). */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setMonth(d.getMonth() + months);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return d;
}

/**
 * Roll a past-due renewal date forward by whole billing periods until it is
 * today or later. Returns the original string when nothing needs to change
 * (already upcoming, unparseable, or a custom cycle with no valid interval).
 */
export function advanceRenewal(
  nextRenewal: string,
  cycle: BillingCycle,
  intervalDays?: number | null,
  today: Date = new Date(),
): string {
  const start = parseLocalDate(nextRenewal);
  if (!start) return nextRenewal;

  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (start >= cutoff) return nextRenewal;

  const monthsPerPeriod =
    cycle === 'monthly' ? 1 : cycle === 'quarterly' ? 3 : cycle === 'annual' ? 12 : 0;

  let next = start;
  if (monthsPerPeriod > 0) {
    // Jump most of the way in one step, then step until we pass the cutoff.
    const monthsApart =
      (cutoff.getFullYear() - start.getFullYear()) * 12 + (cutoff.getMonth() - start.getMonth());
    const periods = Math.max(0, Math.floor(monthsApart / monthsPerPeriod));
    next = addMonthsClamped(start, periods * monthsPerPeriod);
    while (next < cutoff) next = addMonthsClamped(next, monthsPerPeriod);
  } else {
    // Custom cycle: advance by whole intervals.
    const step = intervalDays ?? 0;
    if (step <= 0) return nextRenewal;
    const elapsedDays = Math.floor((cutoff.getTime() - start.getTime()) / 86400000);
    const periods = Math.floor(elapsedDays / step);
    next = new Date(start.getTime());
    next.setDate(next.getDate() + periods * step);
    while (next < cutoff) next.setDate(next.getDate() + step);
  }

  return toISODate(next);
}

export function totalMonthlySpend(subscriptions: Subscription[]): number {
  return subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days), 0);
}

/**
 * Format money for display. `currency` originates from user input, and
 * Intl.NumberFormat throws a RangeError on anything that isn't a valid ISO
 * 4217 code — which would take down the whole screen — so fall back instead.
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const code = (currency ?? 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(safeAmount);
  } catch {
    return `${/^[A-Z]{3}$/.test(code) ? code : 'USD'} ${safeAmount.toFixed(2)}`;
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
