import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Linking, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { formatCurrency, monthlyEquivalent } from '../../lib/subscriptionUtils';
import { useTheme, Theme } from '../../theme/theme';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Alternative {
  name: string;
  description: string;
  monthly_price: number | null;
  currency: string;
  website: string | null;
}

type Props = {
  route: RouteProp<HomeStackParamList, 'Alternatives'>;
};

/**
 * Alternatives come from an LLM, so treat every URL as untrusted: only open
 * plain https:// links (never javascript:, data:, or app deep-link schemes).
 */
function isSafeWebUrl(url?: string | null): boolean {
  return typeof url === 'string' && /^https:\/\/[^\s]+$/i.test(url.trim());
}

export default function AlternativesScreen({ route }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id, name } = route.params;
  const { subscriptions } = useSubscriptionStore();
  const sub = subscriptions.find((s) => s.id === id);
  const currentMonthly = sub ? monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days) : undefined;

  const userId = useAuthStore((s) => s.session?.user?.id);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});

  const sendFeedback = async (altName: string, helpful: boolean) => {
    setFeedback((prev) => ({ ...prev, [altName]: helpful ? 'up' : 'down' })); // optimistic
    if (!userId) return;
    try {
      await supabase.from('alternative_feedback').insert({
        user_id: userId, service_name: name, alternative_name: altName, helpful,
      });
    } catch {
      /* non-fatal: the UI already thanked the user */
    }
  };

  // Implicit feedback: opening an alternative's site is a soft "this looks useful"
  // signal that folds into ranking at a low weight (server-side).
  const logClick = async (altName: string) => {
    if (!userId) return;
    try {
      await supabase.from('alternative_clicks').insert({
        user_id: userId, service_name: name, alternative_name: altName,
      });
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => { fetchAlternatives(); }, []);

  const fetchAlternatives = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams();
      if (currentMonthly) params.set('cost', currentMonthly.toFixed(2));
      if (sub?.currency) params.set('currency', sub.currency);
      if (sub?.category?.name) params.set('category', sub.category.name);

      const resp = await fetch(`${API_BASE}/api/alternatives/${encodeURIComponent(name)}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Something went wrong.');
      setAlternatives(Array.isArray(json.alternatives) ? json.alternatives : []);
    } catch (e: any) {
      setError(
        e?.message === 'Network request failed'
          ? "Can't reach the server. Check your connection and try again."
          : 'Could not load alternatives right now. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const currency = sub?.currency ?? 'USD';

  const priceLabel = (a: Alternative) =>
    a.monthly_price === 0 || a.monthly_price === null
      ? 'Free'
      : `~${formatCurrency(a.monthly_price, a.currency)}/mo`;

  const savingsLabel = (a: Alternative): string | null => {
    if (currentMonthly === undefined) return null;
    const price = a.monthly_price ?? 0;
    const saved = currentMonthly - price;
    if (saved <= 0) return null;
    return `Save ~${formatCurrency(saved, currency)}/mo`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle} accessibilityRole="header">Alternatives to {name}</Text>
        {currentMonthly !== undefined && (
          <Text style={styles.headerSub}>You pay ~{formatCurrency(currentMonthly, currency)}/mo</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} />
          <Text style={styles.centerText}>Finding cheaper options…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={c.red} />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAlternatives} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : alternatives.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={40} color={c.accent} />
          <Text style={styles.emptyTitle}>No cheaper alternatives found</Text>
          <Text style={styles.centerText}>
            We couldn't find a well-known option cheaper than {name}. You may already have a good deal.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alternatives}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <Text style={styles.disclaimer}>
              Prices are approximate and provided for guidance. Confirm current pricing and features on each provider's website before switching.
            </Text>
          }
          renderItem={({ item }) => {
            const saving = savingsLabel(item);
            return (
              <View
                style={styles.card}
                accessibilityLabel={`${item.name}, ${priceLabel(item)}${saving ? ', ' + saving : ''}. ${item.description}`}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.altName}>{item.name}</Text>
                  <Text style={styles.altPrice}>{priceLabel(item)}</Text>
                </View>
                {saving && (
                  <View style={styles.savingPill}>
                    <Ionicons name="trending-down-outline" size={12} color={c.green} />
                    <Text style={styles.savingText}>{saving}</Text>
                  </View>
                )}
                <Text style={styles.altDesc}>{item.description}</Text>
                <View style={styles.cardFooter}>
                  {isSafeWebUrl(item.website) ? (
                    <TouchableOpacity
                      style={styles.websiteBtn}
                      onPress={() => { logClick(item.name); Linking.openURL(item.website!); }}
                      accessibilityRole="button"
                      accessibilityLabel={`Visit ${item.name} website`}
                    >
                      <Ionicons name="open-outline" size={14} color={c.accent} />
                      <Text style={styles.websiteBtnText}>Visit website</Text>
                    </TouchableOpacity>
                  ) : <View />}

                  {feedback[item.name] ? (
                    <Text style={styles.thanks}>Thanks!</Text>
                  ) : (
                    <View style={styles.fbRow}>
                      <Text style={styles.fbLabel}>Helpful?</Text>
                      <TouchableOpacity
                        onPress={() => sendFeedback(item.name, true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${item.name} helpful`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="thumbs-up-outline" size={18} color={c.green} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => sendFeedback(item.name, false)}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${item.name} not helpful`}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="thumbs-down-outline" size={18} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  headerBox: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  headerTitle: { color: c.text, fontSize: 20, fontWeight: '800' },
  headerSub: { color: c.textMuted, fontSize: 13, marginTop: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  centerText: { color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyTitle: { color: c.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  retryBtn: {
    marginTop: 6, backgroundColor: c.accent, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: { padding: 16 },
  card: {
    backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  altName: { color: c.text, fontSize: 16, fontWeight: '700', flexShrink: 1, paddingRight: 8 },
  altPrice: { color: c.text, fontSize: 15, fontWeight: '800' },
  savingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: c.green + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8,
  },
  savingText: { color: c.green, fontSize: 12, fontWeight: '700' },
  altDesc: { color: c.textMuted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, minHeight: 22,
  },
  websiteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  websiteBtnText: { color: c.accent, fontSize: 13, fontWeight: '600' },
  fbRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  fbLabel: { color: c.textMuted, fontSize: 12 },
  thanks: { color: c.green, fontSize: 12, fontWeight: '600' },

  disclaimer: { color: c.textFaint, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
});
