import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { formatCurrency } from '../../lib/subscriptionUtils';
import { convert } from '../../lib/currency';
import { Subscription } from '../../types/database';

type Props = { navigation: NativeStackNavigationProp<HomeStackParamList, 'RenewalCalendar'> };

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function RenewalCalendarScreen({ navigation }: Props) {
  const { subscriptions, defaultCurrency, loadDefaultCurrency } = useSubscriptionStore();
  useEffect(() => { loadDefaultCurrency(); }, []);

  const today = new Date();
  const todayStr = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-11
  const [selected, setSelected] = useState<string | null>(todayStr);

  // Group active subscriptions by their next renewal date (YYYY-MM-DD).
  const byDate = useMemo(() => {
    const m = new Map<string, Subscription[]>();
    for (const s of subscriptions) {
      if (!s.is_active || !s.next_renewal) continue;
      const key = s.next_renewal.slice(0, 10);
      const arr = m.get(key) ?? [];
      arr.push(s);
      m.set(key, arr);
    }
    return m;
  }, [subscriptions]);

  const monthPrefix = `${year}-${pad(month + 1)}`;
  const monthTotal = useMemo(() => {
    let sum = 0;
    for (const [date, subs] of byDate) {
      if (!date.startsWith(monthPrefix)) continue;
      for (const s of subs) sum += convert(s.cost, s.currency, defaultCurrency);
    }
    return sum;
  }, [byDate, monthPrefix, defaultCurrency]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const step = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(null);
  };

  const selectedSubs = selected ? byDate.get(selected) ?? [] : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => step(-1)} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => step(1)} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <Text style={styles.monthTotal}>
        {formatCurrency(monthTotal, defaultCurrency)} renewing this month
      </Text>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekday}>{w}</Text>)}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;
          const dateStr = iso(year, month, day);
          const subs = byDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selected;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.cell, isSelected && styles.cellSelected]}
              onPress={() => setSelected(dateStr)}
              accessibilityRole="button"
              accessibilityLabel={`${MONTHS[month]} ${day}${subs ? `, ${subs.length} renewal${subs.length > 1 ? 's' : ''}` : ''}`}
            >
              <Text style={[styles.dayNum, isToday && styles.dayToday, isSelected && styles.dayNumSelected]}>{day}</Text>
              {subs && (
                <View style={styles.dot}>
                  {subs.length > 1
                    ? <Text style={styles.dotCount}>{subs.length}</Text>
                    : <View style={styles.dotSingle} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.dayList}>
        <Text style={styles.dayListTitle}>
          {selected ? formatSelected(selected) : 'Select a day'}
        </Text>
        {selected && selectedSubs.length === 0 && (
          <Text style={styles.empty}>No renewals on this day.</Text>
        )}
        {selectedSubs.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.subRow}
            onPress={() => navigation.navigate('SubscriptionDetail', { id: s.id })}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, ${formatCurrency(s.cost, s.currency)}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.subName}>{s.name}</Text>
              {s.is_trial && <Text style={styles.subTrial}>Trial</Text>}
            </View>
            <Text style={styles.subCost}>{formatCurrency(s.cost, s.currency)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#b6b2c6" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function formatSelected(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const CELL = `${100 / 7}%`;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4fb' },
  content: { padding: 16, paddingBottom: 40 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eceaff', justifyContent: 'center', alignItems: 'center' },
  monthLabel: { color: '#1b1830', fontSize: 18, fontWeight: '800' },
  monthTotal: { color: '#6a6782', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 12 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: CELL as any, textAlign: 'center', color: '#a5a1b8', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 6, borderWidth: 1, borderColor: '#e5e3ef', marginTop: 4 },
  cell: { width: CELL as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  cellSelected: { backgroundColor: '#eceaff', borderRadius: 12 },
  dayNum: { color: '#2b2842', fontSize: 15 },
  dayNumSelected: { fontWeight: '800', color: '#4f46e5' },
  dayToday: { color: '#6366f1', fontWeight: '800' },
  dot: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  dotSingle: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  dotCount: { color: '#fff', fontSize: 10, fontWeight: '800' },
  dayList: { marginTop: 18 },
  dayListTitle: { color: '#1b1830', fontSize: 15, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#8a8698', fontSize: 13 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e3ef' },
  subName: { color: '#1b1830', fontSize: 15, fontWeight: '600' },
  subTrial: { color: '#f59e0b', fontSize: 11, fontWeight: '700', marginTop: 2 },
  subCost: { color: '#1b1830', fontSize: 15, fontWeight: '800' },
});
