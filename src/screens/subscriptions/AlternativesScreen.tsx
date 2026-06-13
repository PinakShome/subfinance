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
  website: string;
}

type Props = {
  route: RouteProp<HomeStackParamList, 'Alternatives'>;
};

export default function AlternativesScreen({ route }: Props) {
  const { id, name } = route.params;
  const { subscriptions } = useSubscriptionStore();
  const sub = subscriptions.find((s) => s.id === id);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAlternatives();
  }, []);

  const fetchAlternatives = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const monthly = sub
        ? monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days)
        : undefined;

      const params = new URLSearchParams();
      if (monthly) params.set('cost', monthly.toFixed(2));
      if (sub?.currency) params.set('currency', sub.currency);
      if (sub?.category?.name) params.set('category', sub.category.name);

      const resp = await fetch(`${API_BASE}/api/alternatives/${encodeURIComponent(name)}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error);
      setAlternatives(json.alternatives);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>Alternatives to {name}</Text>
        {sub && (
          <Text style={styles.headerSub}>
            You pay {formatCurrency(monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days), sub.currency)}/mo
          </Text>
        )}
      </View>

      {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 60 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={alternatives}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.altName}>{item.name}</Text>
              <Text style={styles.altPrice}>
                {item.monthly_price === 0 || item.monthly_price === null
                  ? 'Free'
                  : formatCurrency(item.monthly_price, item.currency) + '/mo'}
              </Text>
            </View>
            <Text style={styles.altDesc}>{item.description}</Text>
            {item.website ? (
              <TouchableOpacity
                style={styles.websiteBtn}
                onPress={() => Linking.openURL(item.website)}
              >
                <Ionicons name="open-outline" size={14} color="#6366f1" />
                <Text style={styles.websiteBtnText}>Visit website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  headerBox: { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 4 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#334155',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  altName: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
  altPrice: { color: '#10b981', fontSize: 15, fontWeight: '700' },
  altDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  websiteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10,
  },
  websiteBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  error: { color: '#f87171', textAlign: 'center', marginTop: 40, padding: 20 },
});
