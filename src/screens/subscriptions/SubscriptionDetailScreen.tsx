import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Linking,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { PriceHistoryEntry } from '../../types/database';
import { HomeStackParamList } from '../../navigation/types';
import {
  annualEquivalent, daysUntilRenewal, formatCurrency, formatDate, monthlyEquivalent,
} from '../../lib/subscriptionUtils';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'SubscriptionDetail'>;
  route: RouteProp<HomeStackParamList, 'SubscriptionDetail'>;
};

const VIVID_COLORS = [
  '#f43f5e', '#a855f7', '#3b82f6', '#22d3ee', '#34d399',
  '#fbbf24', '#e879f9', '#8b5cf6', '#2dd4bf', '#fb923c',
];

function getSubColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return VIVID_COLORS[Math.abs(hash) % VIVID_COLORS.length];
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionButton({ icon, label, color, bg, borderColor, onPress }: {
  icon: string; label: string; color: string; bg: string; borderColor: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={color + '88'} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

export default function SubscriptionDetailScreen({ navigation, route }: Props) {
  const { subscriptions, remove, fetchPriceHistory } = useSubscriptionStore();
  const sub = subscriptions.find((s) => s.id === route.params.id);
  const [priceHistory, setPriceHistory] = React.useState<PriceHistoryEntry[]>([]);

  React.useEffect(() => {
    if (sub?.id) {
      fetchPriceHistory(sub.id).then(setPriceHistory);
    }
  }, [sub?.id]);

  if (!sub) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="warning-outline" size={48} color="#334155" />
        <Text style={styles.notFound}>Subscription not found</Text>
      </View>
    );
  }

  const days = daysUntilRenewal(sub.next_renewal);
  const monthly = monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days);
  const annual = annualEquivalent(sub.cost, sub.billing_cycle, sub.interval_days);
  const daily = monthly / 30;
  const accentColor = sub.category?.color ?? getSubColor(sub.name);
  const isOverdue = days < 0;

  const getRenewalDisplay = () => {
    if (days < 0) return { text: `Overdue by ${-days}d · ${formatDate(sub.next_renewal)}`, color: '#f87171', bg: '#450a0a', borderColor: '#ef444433', icon: 'warning-outline' };
    if (days === 0) return { text: `Renews today · ${formatDate(sub.next_renewal)}`, color: '#fbbf24', bg: '#78350f', borderColor: '#f59e0b33', icon: 'time-outline' };
    if (days <= 3) return { text: `Renews in ${days} days · ${formatDate(sub.next_renewal)}`, color: '#fca5a5', bg: '#7f1d1d', borderColor: '#ef444433', icon: 'time-outline' };
    return { text: `Renews in ${days} days · ${formatDate(sub.next_renewal)}`, color: '#93c5fd', bg: '#1e3a5f22', borderColor: '#3b82f633', icon: 'calendar-outline' };
  };

  const renewal = getRenewalDisplay();

  const handleDelete = () => {
    showAlert('Remove Subscription', `Remove "${sub.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await remove(sub.id); navigation.goBack(); } },
    ]);
  };

  const initials = sub.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ─── Hero ─── */}
      <View style={[styles.hero, { borderColor: accentColor + '40' }]}>
        {/* Two layered glow blobs */}
        <View style={[styles.heroBlob1, { backgroundColor: accentColor + '20' }]} />
        <View style={[styles.heroBlob2, { backgroundColor: accentColor + '0a' }]} />

        {/* Logo */}
        <View style={[styles.heroLogoWrap, {
          backgroundColor: accentColor + '20',
          borderColor: accentColor + '50',
          shadowColor: accentColor,
        }]}>
          <Text style={[styles.heroLogoText, { color: accentColor }]}>{initials}</Text>
        </View>

        <Text style={styles.heroName}>{sub.name}</Text>
        {sub.category && (
          <View style={[styles.heroCatBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '50' }]}>
            <Text style={[styles.heroCatText, { color: accentColor }]}>{sub.category.name}</Text>
          </View>
        )}
        {sub.is_trial && (
          <View style={styles.trialBadge}>
            <Ionicons name="flask-outline" size={12} color="#fbbf24" />
            <Text style={styles.trialText}>FREE TRIAL</Text>
          </View>
        )}
      </View>

      {/* ─── Cost Trio ─── */}
      <View style={styles.costRow}>
        <View style={[styles.costCard, styles.costMain]}>
          <Text style={styles.costLabel}>MONTHLY</Text>
          <Text style={[styles.costCardAmount, { color: accentColor }]}>{formatCurrency(monthly, sub.currency)}</Text>
        </View>
        <View style={[styles.costCard, styles.costGroup]}>
          <View style={[styles.costCard, styles.costSmall, { marginBottom: 0 }]}>
            <Text style={styles.costLabel}>ANNUAL</Text>
            <Text style={styles.costAmount}>{formatCurrency(annual, sub.currency)}</Text>
          </View>
          <View style={[styles.costCard, styles.costSmall]}>
            <Text style={styles.costLabel}>PER DAY</Text>
            <Text style={styles.costAmount}>{formatCurrency(daily, sub.currency)}</Text>
          </View>
        </View>
      </View>

      {/* ─── Trial Countdown Banner ─── */}
      {sub.is_trial && (() => {
        const trialDays = sub.trial_ends_on
          ? Math.round((new Date(sub.trial_ends_on).getTime() - Date.now()) / 86400000)
          : null;

        const trialBannerStyle = trialDays === null
          ? { bg: '#1a1035', borderColor: '#7c3aed33', color: '#a78bfa', icon: 'flask-outline' }
          : trialDays < 0
          ? { bg: '#450a0a', borderColor: '#ef444433', color: '#f87171', icon: 'warning-outline' }
          : trialDays <= 1
          ? { bg: '#450a0a', borderColor: '#ef444433', color: '#f87171', icon: 'warning-outline' }
          : trialDays <= 3
          ? { bg: '#78350f', borderColor: '#f59e0b33', color: '#fbbf24', icon: 'time-outline' }
          : { bg: '#1a1035', borderColor: '#7c3aed33', color: '#a78bfa', icon: 'flask-outline' };

        const trialMsg = trialDays === null
          ? 'Free trial active'
          : trialDays < 0
          ? `Trial ended ${-trialDays}d ago · ${formatDate(sub.trial_ends_on!)}`
          : trialDays === 0
          ? `Trial ends today · ${formatDate(sub.trial_ends_on!)}`
          : `Trial ends in ${trialDays}d · ${formatDate(sub.trial_ends_on!)}`;

        return (
          <View style={[styles.banner, { backgroundColor: trialBannerStyle.bg, borderColor: trialBannerStyle.borderColor }]}>
            <Ionicons name={trialBannerStyle.icon as any} size={18} color={trialBannerStyle.color} />
            <Text style={[styles.bannerText, { color: trialBannerStyle.color }]}>{trialMsg}</Text>
          </View>
        );
      })()}

      {/* ─── Price Increase Alert ─── */}
      {priceHistory.length > 0 && priceHistory[0].new_cost > priceHistory[0].old_cost && (() => {
        const latest = priceHistory[0];
        const pct = ((latest.new_cost - latest.old_cost) / latest.old_cost * 100).toFixed(0);
        const daysAgo = Math.round((Date.now() - new Date(latest.changed_at).getTime()) / 86400000);
        if (daysAgo > 30) return null;
        return (
          <View style={[styles.banner, styles.priceAlertBanner]}>
            <Ionicons name="trending-up" size={18} color="#f59e0b" />
            <Text style={[styles.bannerText, styles.priceAlertText]}>
              Price increased +{pct}% {daysAgo === 0 ? 'today' : `${daysAgo}d ago`} · {formatCurrency(latest.old_cost, latest.currency)} → {formatCurrency(latest.new_cost, latest.currency)}/mo
            </Text>
          </View>
        );
      })()}

      {/* ─── Renewal Banner ─── */}
      <View style={[styles.banner, { backgroundColor: renewal.bg, borderColor: renewal.borderColor }]}>
        <Ionicons name={renewal.icon as any} size={18} color={renewal.color} />
        <Text style={[styles.bannerText, { color: renewal.color }]}>{renewal.text}</Text>
      </View>

      {/* ─── Subscription Details ─── */}
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>SUBSCRIPTION DETAILS</Text>
        <InfoRow label="Billing cycle" value={sub.billing_cycle.charAt(0).toUpperCase() + sub.billing_cycle.slice(1)} />
        <InfoRow label="Currency" value={sub.currency} />
        <InfoRow label="Status" value={sub.is_active ? '● Active' : '○ Inactive'} />
        {sub.started_on && <InfoRow label="Started" value={formatDate(sub.started_on)} />}
        {sub.is_trial && sub.trial_ends_on && <InfoRow label="Trial ends" value={formatDate(sub.trial_ends_on)} />}
        {sub.notes && <InfoRow label="Notes" value={sub.notes} />}
        {sub.website_url && (
          <TouchableOpacity
            style={[styles.infoRow, styles.infoRowLast]}
            onPress={() => sub.website_url && Linking.openURL(sub.website_url)}
          >
            <Text style={styles.infoLabel}>Website</Text>
            <Text style={[styles.infoValue, { color: accentColor }]} numberOfLines={1}>{sub.website_url}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ─── Quick Stats ─── */}
      <View style={styles.quickRow}>
        <View style={styles.quickStat}>
          <Text style={styles.quickVal}>{formatCurrency(annual, sub.currency)}</Text>
          <Text style={styles.quickLbl}>you'll spend this year</Text>
        </View>
        <View style={styles.quickDiv} />
        <View style={styles.quickStat}>
          <Text style={[styles.quickVal, { color: isOverdue ? '#f87171' : '#a78bfa' }]}>
            {isOverdue ? `${-days}d ago` : days === 0 ? 'Today' : `in ${days}d`}
          </Text>
          <Text style={styles.quickLbl}>next payment</Text>
        </View>
      </View>

      {/* ─── Price History ─── */}
      {priceHistory.length > 0 && (
        <View style={styles.priceHistoryCard}>
          <View style={styles.priceHistoryHeader}>
            <Ionicons name="trending-up-outline" size={14} color="#f59e0b" />
            <Text style={styles.priceHistoryTitle}>PRICE HISTORY</Text>
          </View>
          {priceHistory.map((entry) => {
            const increased = entry.new_cost > entry.old_cost;
            const pct = ((entry.new_cost - entry.old_cost) / entry.old_cost * 100).toFixed(0);
            const date = new Date(entry.changed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <View key={entry.id} style={styles.priceHistoryRow}>
                <Ionicons
                  name={increased ? 'arrow-up-outline' : 'arrow-down-outline'}
                  size={14}
                  color={increased ? '#f87171' : '#34d399'}
                />
                <Text style={styles.priceHistoryDate}>{date}</Text>
                <View style={styles.priceHistoryChange}>
                  <Text style={styles.priceHistoryOld}>{formatCurrency(entry.old_cost, entry.currency)}</Text>
                  <Ionicons name="arrow-forward" size={10} color="#475569" />
                  <Text style={[styles.priceHistoryNew, { color: increased ? '#f87171' : '#34d399' }]}>
                    {formatCurrency(entry.new_cost, entry.currency)}
                  </Text>
                </View>
                <View style={[styles.priceHistoryBadge, { backgroundColor: increased ? '#450a0a' : '#052514' }]}>
                  <Text style={[styles.priceHistoryBadgeText, { color: increased ? '#f87171' : '#34d399' }]}>
                    {increased ? '+' : ''}{pct}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ─── Actions ─── */}
      <Text style={styles.actionsTitle}>ACTIONS</Text>

      <ActionButton
        icon="create-outline"
        label="Edit Subscription"
        color="#8b5cf6"
        bg="#13132a"
        borderColor="#8b5cf633"
        onPress={() => navigation.navigate('EditSubscription', { id: sub.id })}
      />
      <ActionButton
        icon="search-outline"
        label="Cheaper Alternatives — Soon"
        color="#34d399"
        bg="#052514"
        borderColor="#34d39933"
        onPress={() => showAlert('Coming soon', 'AI-powered alternative suggestions are being polished and will be fully available shortly.')}
      />
      <ActionButton
        icon="trash-outline"
        label="Remove Subscription"
        color="#f43f5e"
        bg="#1f0a0a"
        borderColor="#f43f5e33"
        onPress={handleDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },
  content: { padding: 16, paddingBottom: 60 },
  centerContainer: { flex: 1, backgroundColor: '#09090f', justifyContent: 'center', alignItems: 'center', gap: 16 },
  notFound: { color: '#6b7280', fontSize: 16 },

  // Hero
  hero: {
    alignItems: 'center', padding: 32,
    backgroundColor: '#0e0e1f',
    borderRadius: 28, marginBottom: 14,
    borderWidth: 1, overflow: 'hidden',
  },
  heroBlob1: { position: 'absolute', top: -60, left: -60, width: 200, height: 200, borderRadius: 100 },
  heroBlob2: { position: 'absolute', bottom: -40, right: -40, width: 160, height: 160, borderRadius: 80 },
  heroLogoWrap: {
    width: 80, height: 80, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
  },
  heroLogoText: { fontSize: 26, fontWeight: '900' },
  heroName: { color: '#f1f5f9', fontSize: 28, fontWeight: '900', marginBottom: 10, letterSpacing: -0.5 },
  heroCatBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 4,
  },
  heroCatText: { fontSize: 13, fontWeight: '700' },
  trialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: '#fbbf2418', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#fbbf2440',
  },
  trialText: { color: '#fbbf24', fontSize: 11, fontWeight: '800' },

  // Cost cards
  costRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  costCard: {
    backgroundColor: '#0e0e1f', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  costMain: { flex: 1.4, justifyContent: 'center' },
  costGroup: { flex: 1, gap: 10, backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
  costSmall: { flex: 1 },
  costLabel: { color: '#4b5563', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  costCardAmount: { fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  costAmount: { color: '#f1f5f9', fontSize: 15, fontWeight: '800' },

  // Banners
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1,
  },
  bannerText: { fontSize: 14, fontWeight: '700', flex: 1 },
  priceAlertBanner: {
    backgroundColor: '#78350f22', borderColor: '#f59e0b33',
  },
  priceAlertText: { color: '#fbbf24' },

  // Detail card
  detailCard: {
    backgroundColor: '#0e0e1f', borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  detailTitle: { color: '#4b5563', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { color: '#6b7280', fontSize: 13 },
  infoValue: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  // Quick stats
  quickRow: {
    flexDirection: 'row', backgroundColor: '#0e0e1f', borderRadius: 18,
    padding: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickVal: { color: '#a78bfa', fontSize: 18, fontWeight: '800' },
  quickLbl: { color: '#4b5563', fontSize: 11, marginTop: 4, textAlign: 'center' },
  quickDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 4 },

  // Price history
  priceHistoryCard: {
    backgroundColor: '#0e0e1f', borderRadius: 18, padding: 16,
    marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  priceHistoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  priceHistoryTitle: { color: '#4b5563', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  priceHistoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  priceHistoryDate: { color: '#6b7280', fontSize: 12, flex: 1 },
  priceHistoryChange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceHistoryOld: { color: '#4b5563', fontSize: 12, textDecorationLine: 'line-through' },
  priceHistoryNew: { fontSize: 13, fontWeight: '700' },
  priceHistoryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 4 },
  priceHistoryBadgeText: { fontSize: 11, fontWeight: '700' },

  // Actions
  actionsTitle: { color: '#4b5563', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, padding: 18, marginBottom: 10, borderWidth: 1,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
});
