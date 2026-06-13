import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { Subscription } from '../../types/database';
import { daysUntilRenewal, formatCurrency, monthlyEquivalent, totalMonthlySpend } from '../../lib/subscriptionUtils';
import { HomeStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'SubscriptionList'>;
};

type FilterType = 'all' | 'overdue' | 'soon' | 'active' | 'trial';

const VIVID_COLORS = [
  '#f43f5e', '#a855f7', '#3b82f6', '#22d3ee', '#34d399',
  '#fbbf24', '#e879f9', '#8b5cf6', '#2dd4bf', '#fb923c',
];

function getSubColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VIVID_COLORS[Math.abs(hash) % VIVID_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getBadgeColor(days: number) {
  if (days < 0) return { bg: '#450a0a', text: '#f87171', label: 'Overdue' };
  if (days === 0) return { bg: '#78350f', text: '#fbbf24', label: 'Today' };
  if (days <= 3) return { bg: '#7f1d1d', text: '#fca5a5', label: `${days}d` };
  if (days <= 7) return { bg: '#1e3a5f', text: '#93c5fd', label: `${days}d` };
  return { bg: '#1e293b', text: '#475569', label: `${days}d` };
}

function getTrialBadge(trialDays: number) {
  if (trialDays <= 1) return { bg: '#450a0a', text: '#f87171', label: `⚗ TRIAL ${trialDays < 0 ? 'END' : trialDays === 0 ? 'TODAY' : '1d'}` };
  if (trialDays <= 3) return { bg: '#78350f', text: '#fbbf24', label: `⚗ TRIAL ${trialDays}d` };
  return { bg: '#2e1065', text: '#c4b5fd', label: `⚗ TRIAL ${trialDays}d` };
}

function SubscriptionCard({ item, onPress }: { item: Subscription; onPress: () => void }) {
  const days = daysUntilRenewal(item.next_renewal);
  const monthly = monthlyEquivalent(item.cost, item.billing_cycle, item.interval_days);
  const color = item.category?.color ?? getSubColor(item.name);
  const initials = getInitials(item.name);

  let badge;
  if (item.is_trial && item.trial_ends_on) {
    badge = getTrialBadge(Math.round((new Date(item.trial_ends_on).getTime() - Date.now()) / 86400000));
  } else {
    badge = getBadgeColor(days);
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: color + '12', borderColor: color + '35' }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Coloured initials circle */}
      <View style={[styles.cardAvatar, { backgroundColor: color + '25', borderColor: color + '50' }]}>
        <Text style={[styles.cardAvatarText, { color }]}>{initials}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow1}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardCost, { color }]}>
            {formatCurrency(monthly)}<Text style={styles.cardCostUnit}>/mo</Text>
          </Text>
        </View>
        <View style={styles.cardRow2}>
          <View style={[styles.cardCycleTag, { backgroundColor: color + '18', borderColor: color + '35' }]}>
            <Text style={[styles.cardCycleText, { color }]}>
              {item.billing_cycle.charAt(0).toUpperCase() + item.billing_cycle.slice(1)}
            </Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const FILTER_CHIP_STYLES: Record<FilterType, { bg: string; border: string; text: string }> = {
  all:    { bg: '#8b5cf620', border: '#8b5cf630', text: '#a78bfa' },
  overdue:{ bg: '#fb718520', border: '#fb718550', text: '#fb7185' },
  soon:   { bg: '#fbbf2420', border: '#fbbf2450', text: '#fbbf24' },
  active: { bg: '#34d39920', border: '#34d39950', text: '#34d399' },
  trial:  { bg: '#22d3ee20', border: '#22d3ee50', text: '#22d3ee' },
};

function FilterChip({ label, active, onPress, filterType }: {
  label: string; active: boolean; onPress: () => void; filterType: FilterType;
}) {
  const activeStyle = FILTER_CHIP_STYLES[filterType];
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active
          ? { backgroundColor: activeStyle.bg, borderColor: activeStyle.border }
          : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterChipText,
        { color: active ? activeStyle.text : '#6b7280' },
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SubscriptionListScreen({ navigation }: Props) {
  const { subscriptions, loading, fetchAll } = useSubscriptionStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = useCallback(() => { fetchAll(); }, []);

  const totalMonthly = totalMonthlySpend(subscriptions);
  const annualTotal = totalMonthly * 12;
  const avgPerSub = subscriptions.length > 0 ? totalMonthly / subscriptions.length : 0;
  const overdueCount = subscriptions.filter(s => daysUntilRenewal(s.next_renewal) < 0).length;
  const dueSoonCount = subscriptions.filter(s => { const d = daysUntilRenewal(s.next_renewal); return d >= 0 && d <= 7; }).length;
  const trialCount = subscriptions.filter(s => s.is_trial).length;

  const filtered = useMemo(() => {
    let result = subscriptions;
    if (search.trim()) {
      result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    }
    if (filter === 'overdue') result = result.filter(s => daysUntilRenewal(s.next_renewal) < 0);
    if (filter === 'soon') result = result.filter(s => { const d = daysUntilRenewal(s.next_renewal); return d >= 0 && d <= 7; });
    if (filter === 'active') result = result.filter(s => s.is_active);
    if (filter === 'trial') result = result.filter(s => s.is_trial);
    return result;
  }, [subscriptions, filter, search]);

  return (
    <View style={styles.container}>
      {/* ─── Hero Card ─── */}
      <View style={styles.heroCard}>
        <View style={[styles.heroGlob, { backgroundColor: '#8b5cf620', left: -40, top: -40 }]} />
        <View style={[styles.heroGlob, { backgroundColor: '#22d3ee15', right: -20, bottom: -30 }]} />

        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>TOTAL MONTHLY</Text>
            <Text style={styles.heroAmount}>${totalMonthly.toFixed(2)}</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{subscriptions.length} active</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: '#22d3ee' }]}>${annualTotal.toFixed(0)}</Text>
            <Text style={styles.heroStatLbl}>per year</Text>
          </View>
          <View style={styles.heroStatDiv} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: '#34d399' }]}>${avgPerSub.toFixed(0)}</Text>
            <Text style={styles.heroStatLbl}>avg / sub</Text>
          </View>
          <View style={styles.heroStatDiv} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: overdueCount > 0 ? '#fb7185' : '#94a3b8' }]}>{overdueCount}</Text>
            <Text style={styles.heroStatLbl}>overdue</Text>
          </View>
        </View>
      </View>

      {/* ─── Search ─── */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color="#4b5563" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subscriptions…"
          placeholderTextColor="#4b5563"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#4b5563" />
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Filter Chips ─── */}
      <View style={styles.filterRow}>
        <FilterChip label="All" active={filter === 'all'} filterType="all" onPress={() => setFilter('all')} />
        <FilterChip label={`Overdue${overdueCount > 0 ? ` (${overdueCount})` : ''}`} active={filter === 'overdue'} filterType="overdue" onPress={() => setFilter('overdue')} />
        <FilterChip label={`Due Soon${dueSoonCount > 0 ? ` (${dueSoonCount})` : ''}`} active={filter === 'soon'} filterType="soon" onPress={() => setFilter('soon')} />
        <FilterChip label="Active" active={filter === 'active'} filterType="active" onPress={() => setFilter('active')} />
        <FilterChip label={`Trials${trialCount > 0 ? ` (${trialCount})` : ''}`} active={filter === 'trial'} filterType="trial" onPress={() => setFilter('trial')} />
      </View>

      {/* ─── List ─── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            item={item}
            onPress={() => navigation.navigate('SubscriptionDetail', { id: item.id })}
          />
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#8b5cf6" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="receipt-outline" size={36} color="#8b5cf6" />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'No results found' : 'No subscriptions yet'}
              </Text>
              <Text style={styles.emptySub}>
                {search ? 'Try a different search term' : 'Tap + to add your first one'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* ─── FAB ─── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddSubscription')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },

  // Hero
  heroCard: {
    margin: 16, marginBottom: 12,
    backgroundColor: '#0e0e1f',
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 12,
  },
  heroGlob: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  heroLabel: { color: '#8b5cf6', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  heroAmount: { color: '#f1f5f9', fontSize: 44, fontWeight: '900', letterSpacing: -1.5 },
  heroBadge: {
    backgroundColor: '#8b5cf620', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#8b5cf640',
  },
  heroBadgeText: { color: '#a78bfa', fontSize: 12, fontWeight: '700' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '800' },
  heroStatLbl: { color: '#4b5563', fontSize: 11, marginTop: 3 },
  heroStatDiv: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#13132a', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  searchInput: { flex: 1, color: '#f1f5f9', fontSize: 14 },

  // Filter chips
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 14, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, marginBottom: 10, padding: 14,
    borderWidth: 1,
  },
  cardAvatar: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  cardAvatarText: { fontSize: 15, fontWeight: '900' },
  cardBody: { flex: 1 },
  cardRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  cardName: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  cardCost: { fontSize: 15, fontWeight: '800' },
  cardCostUnit: { color: '#4b5563', fontSize: 11, fontWeight: '400' },
  cardRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCycleTag: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  cardCycleText: { fontSize: 11, fontWeight: '700' },
  badgePill: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 120 },

  // Empty state
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 28,
    backgroundColor: '#8b5cf615',
    borderWidth: 1, borderColor: '#8b5cf640',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  emptyTitle: { color: '#94a3b8', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#4b5563', fontSize: 14, marginTop: 6, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', right: 20, bottom: 28,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6, shadowRadius: 16, elevation: 12,
  },
});
