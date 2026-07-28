import { Subscription, BillingCycle } from '../types/database';

export function monthlyEquivalent(cost: number, cycle: BillingCycle, intervalDays?: number | null): number {
  switch (cycle) {
    case 'monthly':   return cost;
    case 'quarterly': return cost / 3;
    case 'annual':    return cost / 12;
    case 'custom':    return intervalDays ? cost / (intervalDays / 30.44) : cost;
    default:          return cost;
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

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
