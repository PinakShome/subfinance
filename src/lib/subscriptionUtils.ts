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
