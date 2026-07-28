import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { advanceRenewal } from '../lib/subscriptionUtils';
import { Subscription, SubscriptionInsert, SubscriptionUpdate, Category, PriceHistoryEntry } from '../types/database';

// Check if demo mode is enabled
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

interface SubscriptionState {
  subscriptions: Subscription[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  clear: () => void;
  fetchAll: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  add: (data: SubscriptionInsert) => Promise<string | null>;
  update: (id: string, data: SubscriptionUpdate) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
  fetchPriceHistory: (subscriptionId: string) => Promise<PriceHistoryEntry[]>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscriptions: [],
  categories: [],
  loading: false,
  error: null,

  /** Wipe cached rows so one user's data never shows up under another. */
  clear: () => set({ subscriptions: [], error: null, loading: false }),

  fetchCategories: async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) set({ categories: data });
  },

  fetchAll: async () => {
    // In demo mode, don't fetch from Supabase (data already set in App.tsx)
    if (DEMO_MODE) return;

    set({ loading: true });
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('next_renewal', { ascending: true });

    if (error || !data) {
      set({ loading: false, error: 'Could not load your subscriptions. Pull down to try again.' });
      return;
    }

    // Roll any past-due renewal dates forward to the next billing period, so
    // subscriptions don't sit permanently "overdue" and reminders keep firing.
    const rolled = (data as Subscription[]).map((sub) => {
      const next = advanceRenewal(sub.next_renewal, sub.billing_cycle, sub.interval_days);
      return next === sub.next_renewal ? sub : { ...sub, next_renewal: next };
    });

    const changed = rolled.filter((sub, i) => sub.next_renewal !== (data as Subscription[])[i].next_renewal);
    set({
      subscriptions: rolled.sort((a, b) => a.next_renewal.localeCompare(b.next_renewal)),
      loading: false,
      error: null,
    });

    // Persist the advanced dates (best-effort; UI already reflects them).
    if (changed.length) {
      await Promise.all(
        changed.map((sub) =>
          supabase.from('subscriptions').update({ next_renewal: sub.next_renewal }).eq('id', sub.id),
        ),
      );
    }
  },

  add: async (payload) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'Not authenticated';
    const { error } = await supabase
      .from('subscriptions')
      .insert({ ...payload, user_id: user.id });
    if (error) return error.message;
    await get().fetchAll();
    return null;
  },

  update: async (id, payload) => {
    // Detect price change before updating
    const existing = get().subscriptions.find(s => s.id === id);
    const priceChanged = existing && payload.cost !== undefined && payload.cost !== existing.cost;

    const { error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', id);
    if (error) return error.message;

    // Log price change to history
    if (priceChanged && existing) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('price_history').insert({
            user_id: user.id,
            subscription_id: id,
            old_cost: existing.cost,
            new_cost: payload.cost!,
            currency: payload.currency ?? existing.currency,
          });
        }
      } catch { /* price_history table may not exist yet — fail silently */ }
    }

    await get().fetchAll();
    return null;
  },

  fetchPriceHistory: async (subscriptionId: string): Promise<PriceHistoryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .order('changed_at', { ascending: false })
        .limit(10);
      if (error) return [];
      return (data ?? []) as PriceHistoryEntry[];
    } catch { return []; }
  },

  remove: async (id) => {
    // Soft-delete by marking inactive
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: false })
      .eq('id', id);
    if (error) return error.message;
    set((s) => ({ subscriptions: s.subscriptions.filter((x) => x.id !== id) }));
    return null;
  },
}));
