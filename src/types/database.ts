export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'custom';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  cost: number;
  currency: string;
  billing_cycle: BillingCycle;
  interval_days: number | null;
  next_renewal: string; // ISO date
  started_on: string | null;
  notes: string | null;
  is_trial: boolean;
  trial_ends_on: string | null;
  is_active: boolean;
  website_url: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
}

export interface NotificationPrefs {
  user_id: string;
  remind_days_before: number[];
  push_token: string | null;
  enabled: boolean;
  updated_at: string;
}

export type SubscriptionInsert = Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category'>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

export interface PriceHistoryEntry {
  id: string;
  user_id: string;
  subscription_id: string;
  old_cost: number;
  new_cost: number;
  currency: string;
  changed_at: string;
}
