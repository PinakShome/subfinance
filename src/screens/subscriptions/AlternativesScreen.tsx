import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Linking, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/types';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { supabase } from '../../lib/supabase';
import { formatCurrency, monthlyEquivalent } from '../../lib/subscriptionUtils';

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
  const { id, name } = route.params;
  const { subscriptions } = useSubscriptionStore();
  const sub = subscriptions.find((s) => s.id === id);
  const currentMonthly = sub ? monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days) : undefined;

  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <ActivityIndicator color="#8b5cf6" />
          <Text style={styles.centerText}>Finding cheaper options…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAlternatives} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : alternatives.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={40} color="#8b5cf6" />
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
                    <Ionicons name="trending-down-outline" size={12} color="#10b981" />
                    <Text style={styles.savingText}>{saving}</Text>
                  </View>
                )}
                <Text style={styles.altDesc}>{item.description}</Text>
                {isSafeWebUrl(item.website) ? (
                  <TouchableOpacity
                    style={styles.websiteBtn}
                    onPress={() => Linking.openURL(item.website!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Visit ${item.name} website`}
                  >
                    <Ionicons name="open-outline" size={14} color="#8b5cf6" />
                    <Text style={styles.websiteBtnText}>Visit website</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  headerBox: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1eff9' },
  headerTitle: { color: '#1b1830', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#787591', fontSize: 13, marginTop: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  centerText: { color: '#787591', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyTitle: { color: '#1b1830', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  retryBtn: {
    marginTop: 6, backgroundColor: '#8b5cf6', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  list: { padding: 16 },
  card: {
    backgroundColor: '#faf9ff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e3ef',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  altName: { color: '#1b1830', fontSize: 16, fontWeight: '700', flexShrink: 1, paddingRight: 8 },
  altPrice: { color: '#1b1830', fontSize: 15, fontWeight: '800' },
  savingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: '#10b98115', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8,
  },
  savingText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  altDesc: { color: '#6a6782', fontSize: 13, lineHeight: 20, marginTop: 8 },
  websiteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  websiteBtnText: { color: '#8b5cf6', fontSize: 13, fontWeight: '600' },

  disclaimer: { color: '#a5a1b8', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 12 },
});
