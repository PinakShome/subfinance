import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { formatCurrency, monthlyEquivalent, daysUntilRenewal } from '../../lib/subscriptionUtils';
import { Subscription } from '../../types/database';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 48;

const PIE_COLORS = ['#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#e879f9', '#fb923c', '#3b82f6'];

const CHART_CONFIG = {
  backgroundGradientFrom: '#0e0e1f',
  backgroundGradientTo: '#0e0e1f',
  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
  labelColor: () => '#4b5563',
  barPercentage: 0.55,
  decimalPlaces: 0,
  propsForBackgroundLines: { stroke: 'rgba(255,255,255,0.05)', strokeDasharray: '' },
  propsForLabels: { fontSize: 11 },
};

function MetricCard({ label, value, sub, accentColor = '#8b5cf6', icon }: {
  label: string; value: string; sub?: string; accentColor?: string; icon?: string
}) {
  return (
    <View style={[styles.metricCard, { borderColor: accentColor + '30' }]}>
      <View style={[styles.metricGlow, { backgroundColor: accentColor + '15' }]} />
      {icon && <Ionicons name={icon as any} size={16} color={accentColor} style={{ marginBottom: 10 }} />}
      <Text style={[styles.metricValue, { color: accentColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub && <Text style={styles.metricSub}>{sub}</Text>}
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={13} color="#8b5cf6" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function UpcomingRow({ sub }: { sub: Subscription }) {
  const days = daysUntilRenewal(sub.next_renewal);
  const monthly = monthlyEquivalent(sub.cost, sub.billing_cycle, sub.interval_days);
  const urgent = days <= 3;
  const dotColor = days < 0 ? '#fb7185' : urgent ? '#fb923c' : '#8b5cf6';
  return (
    <View style={styles.upcomingRow}>
      <View style={[styles.upcomingDot, { backgroundColor: dotColor }]} />
      <Text style={styles.upcomingName} numberOfLines={1}>{sub.name}</Text>
      <Text style={[styles.upcomingDays, { color: dotColor }]}>{days === 0 ? 'Today' : `${days}d`}</Text>
      <Text style={styles.upcomingAmt}>{formatCurrency(monthly)}/mo</Text>
    </View>
  );
}

function CategoryBar({ name, amount, total, color }: { name: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.catRow}>
      <View style={[styles.catDot, { backgroundColor: color }]} />
      <Text style={styles.catName} numberOfLines={1}>{name}</Text>
      <View style={styles.catTrack}>
        <View style={[styles.catFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.catAmt, { color }]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { subscriptions } = useSubscriptionStore();
  const active = subscriptions.filter((s) => s.is_active);

  const monthly = useMemo(
    () => active.reduce((sum, s) => sum + monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days), 0),
    [active],
  );

  const daily = monthly / 30;
  const avgPerSub = active.length > 0 ? monthly / active.length : 0;

  const mostExpensive = active.reduce<Subscription | null>(
    (max, s) => !max || monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days) >
      monthlyEquivalent(max.cost, max.billing_cycle, max.interval_days) ? s : max, null,
  );

  const cheapest = active.reduce<Subscription | null>(
    (min, s) => !min || monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days) <
      monthlyEquivalent(min.cost, min.billing_cycle, min.interval_days) ? s : min, null,
  );

  // Upcoming renewals in next 30 days
  const upcoming = useMemo(() =>
    [...active]
      .filter(s => { const d = daysUntilRenewal(s.next_renewal); return d >= 0 && d <= 30; })
      .sort((a, b) => daysUntilRenewal(a.next_renewal) - daysUntilRenewal(b.next_renewal))
      .slice(0, 5),
    [active],
  );

  // Category breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, { amount: number; color: string }> = {};
    active.forEach((s, i) => {
      const key = s.category?.name ?? 'Other';
      const color = s.category?.color ?? PIE_COLORS[i % PIE_COLORS.length];
      if (!map[key]) map[key] = { amount: 0, color };
      map[key].amount += monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days);
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [active]);

  const pieData = categoryData.map(([name, { amount, color }], i) => ({
    name: name.length > 10 ? name.slice(0, 10) : name,
    population: Math.round(amount * 100) / 100,
    color: color ?? PIE_COLORS[i % PIE_COLORS.length],
    legendFontColor: '#64748b',
    legendFontSize: 12,
  }));

  const barData = useMemo(() => {
    const top = [...active]
      .sort((a, b) => monthlyEquivalent(b.cost, b.billing_cycle, b.interval_days) - monthlyEquivalent(a.cost, a.billing_cycle, a.interval_days))
      .slice(0, 5);
    return {
      labels: top.map(s => s.name.length > 7 ? s.name.slice(0, 7) + '…' : s.name),
      datasets: [{ data: top.map(s => Math.round(monthlyEquivalent(s.cost, s.billing_cycle, s.interval_days) * 100) / 100) }],
    };
  }, [active]);

  if (active.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="bar-chart-outline" size={52} color="#1f2937" />
        <Text style={styles.emptyText}>No data yet</Text>
        <Text style={styles.emptySubText}>Add subscriptions to see analytics</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ─── KPI Grid ─── */}
      <View style={styles.kpiGrid}>
        <MetricCard label="Monthly" value={formatCurrency(monthly)} icon="trending-up-outline" accentColor="#8b5cf6" />
        <MetricCard label="Annual" value={formatCurrency(monthly * 12)} icon="calendar-outline" accentColor="#22d3ee" />
        <MetricCard label="Daily avg" value={formatCurrency(daily)} icon="sunny-outline" accentColor="#34d399" />
        <MetricCard label="Per sub" value={formatCurrency(avgPerSub)} icon="layers-outline" accentColor="#fbbf24" />
      </View>

      {/* ─── Highlight Cards ─── */}
      {mostExpensive && (
        <View style={styles.highlightRow}>
          <View style={[styles.highlightCard, styles.hlDanger]}>
            <Ionicons name="arrow-up-circle" size={18} color="#fb7185" />
            <Text style={styles.hlLabel}>Most expensive</Text>
            <Text style={styles.hlName}>{mostExpensive.name}</Text>
            <Text style={[styles.hlAmt, { color: '#fb7185' }]}>
              {formatCurrency(monthlyEquivalent(mostExpensive.cost, mostExpensive.billing_cycle, mostExpensive.interval_days))}/mo
            </Text>
          </View>
          {cheapest && cheapest.id !== mostExpensive.id && (
            <View style={[styles.highlightCard, styles.hlGreen]}>
              <Ionicons name="arrow-down-circle" size={18} color="#34d399" />
              <Text style={[styles.hlLabel, styles.hlLabelGreen]}>Cheapest</Text>
              <Text style={styles.hlName}>{cheapest.name}</Text>
              <Text style={[styles.hlAmt, { color: '#34d399' }]}>
                {formatCurrency(monthlyEquivalent(cheapest.cost, cheapest.billing_cycle, cheapest.interval_days))}/mo
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ─── Category Breakdown ─── */}
      {categoryData.length > 0 && (
        <>
          <SectionHeader title="SPEND BY CATEGORY" icon="pie-chart-outline" />
          <View style={styles.card}>
            {categoryData.map(([name, { amount, color }], i) => (
              <CategoryBar key={name} name={name} amount={amount} total={monthly} color={color ?? PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </View>
        </>
      )}

      {/* ─── Pie Chart ─── */}
      {pieData.length > 0 && (
        <>
          <SectionHeader title="CATEGORY DISTRIBUTION" icon="stats-chart-outline" />
          <View style={styles.chartCard}>
            <PieChart
              data={pieData}
              width={CHART_WIDTH}
              height={190}
              chartConfig={CHART_CONFIG}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="8"
              absolute={false}
            />
          </View>
        </>
      )}

      {/* ─── Bar Chart ─── */}
      {barData.labels.length > 0 && (
        <>
          <SectionHeader title="TOP SUBSCRIPTIONS" icon="podium-outline" />
          <View style={styles.chartCard}>
            <BarChart
              data={barData}
              width={CHART_WIDTH}
              height={210}
              chartConfig={CHART_CONFIG}
              yAxisLabel="$"
              yAxisSuffix=""
              showValuesOnTopOfBars
              fromZero
            />
          </View>
        </>
      )}

      {/* ─── Upcoming Renewals ─── */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="UPCOMING RENEWALS (30 DAYS)" icon="time-outline" />
          <View style={styles.card}>
            {upcoming.map(sub => <UpcomingRow key={sub.id} sub={sub} />)}
          </View>
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },
  content: { padding: 16, paddingBottom: 60 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#0e0e1f',
    borderRadius: 20, padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  metricGlow: {
    position: 'absolute', top: -30, right: -30,
    width: 100, height: 100, borderRadius: 50,
  },
  metricValue: { fontSize: 24, fontWeight: '900', marginBottom: 4, letterSpacing: -0.5 },
  metricLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  metricSub: { color: '#374151', fontSize: 11, marginTop: 4 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 7, marginBottom: 12, marginTop: 6,
  },
  sectionTitle: {
    color: '#6b7280', fontSize: 11, fontWeight: '800', letterSpacing: 1.5,
  },

  // Highlight cards
  highlightRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  highlightCard: {
    flex: 1, borderRadius: 20, padding: 18, borderWidth: 1, overflow: 'hidden',
  },
  hlDanger: { backgroundColor: '#fb718510', borderColor: '#fb718530' },
  hlGreen: { backgroundColor: '#34d39910', borderColor: '#34d39930' },
  hlLabel: { color: '#fb7185', fontSize: 11, fontWeight: '700', marginTop: 6 },
  hlLabelGreen: { color: '#34d399' },
  hlName: { color: '#f1f5f9', fontSize: 15, fontWeight: '800', marginTop: 4 },
  hlAmt: { fontSize: 13, fontWeight: '700', marginTop: 2 },

  // Generic card
  card: {
    backgroundColor: '#0e0e1f', borderRadius: 18, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  chartCard: {
    backgroundColor: '#0e0e1f', borderRadius: 18, padding: 14,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
  },

  // Category rows
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { color: '#94a3b8', fontSize: 13, width: 80 },
  catTrack: {
    flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3, overflow: 'hidden',
  },
  catFill: { height: 6, borderRadius: 3 },
  catAmt: { fontSize: 12, fontWeight: '700', width: 60, textAlign: 'right' },

  // Upcoming
  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  upcomingDot: { width: 8, height: 8, borderRadius: 4 },
  upcomingName: { flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  upcomingDays: { fontSize: 13, fontWeight: '800', width: 40, textAlign: 'center' },
  upcomingAmt: { color: '#6b7280', fontSize: 13, width: 70, textAlign: 'right' },

  // Empty state
  emptyContainer: { flex: 1, backgroundColor: '#09090f', justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  emptySubText: { color: '#374151', fontSize: 13 },
});
