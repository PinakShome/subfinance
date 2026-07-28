import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { isRealDate } from '../../lib/subscriptionUtils';
import { BillingCycle, SubscriptionInsert } from '../../types/database';
import { HomeStackParamList } from '../../navigation/types';

type AddProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AddSubscription'>;
  route: RouteProp<HomeStackParamList, 'AddSubscription'>;
};
type EditProps = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'EditSubscription'>;
  route: RouteProp<HomeStackParamList, 'EditSubscription'>;
};
type Props = AddProps | EditProps;

const CYCLES: { label: string; value: BillingCycle }[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Annual', value: 'annual' },
  { label: 'Custom', value: 'custom' },
];

export default function SubscriptionFormScreen({ navigation, route }: Props) {
  const editId = (route as RouteProp<HomeStackParamList, 'EditSubscription'>).params?.id;
  const { subscriptions, categories, add, update, fetchCategories } = useSubscriptionStore();
  const existing = editId ? subscriptions.find((s) => s.id === editId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [cost, setCost] = useState(existing?.cost.toString() ?? '');
  const [currency, setCurrency] = useState(existing?.currency ?? 'USD');
  const [cycle, setCycle] = useState<BillingCycle>(existing?.billing_cycle ?? 'monthly');
  const [intervalDays, setIntervalDays] = useState(existing?.interval_days?.toString() ?? '');
  const [nextRenewal, setNextRenewal] = useState(existing?.next_renewal ?? '');
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [isTrial, setIsTrial] = useState(existing?.is_trial ?? false);
  const [trialEndsOn, setTrialEndsOn] = useState(existing?.trial_ends_on ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(existing?.website_url ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { showAlert('Name is required'); return; }
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum < 0) { showAlert('Enter a valid cost'); return; }
    if (!isRealDate(nextRenewal)) {
      showAlert('Enter a valid renewal date', 'Use the format YYYY-MM-DD, for example 2026-08-15.');
      return;
    }

    const payload: SubscriptionInsert = {
      name: name.trim(),
      cost: costNum,
      currency,
      billing_cycle: cycle,
      interval_days: cycle === 'custom' ? parseInt(intervalDays) || null : null,
      next_renewal: nextRenewal,
      category_id: categoryId || null,
      notes: notes.trim() || null,
      is_trial: isTrial,
      trial_ends_on: isTrial ? (trialEndsOn || null) : null,
      is_active: true,
      website_url: websiteUrl.trim() || null,
      started_on: null,
    };

    setBusy(true);
    const err = editId ? await update(editId, payload) : await add(payload);
    setBusy(false);
    if (err) { showAlert('Error', err); return; }
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Netflix" placeholderTextColor="#8a8698" />

      <Text style={styles.sectionLabel}>Cost</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { width: 80, marginRight: 8 }]}
          value={currency}
          onChangeText={setCurrency}
          autoCapitalize="characters"
          maxLength={3}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#8a8698"
        />
      </View>

      <Text style={styles.sectionLabel}>Billing Cycle</Text>
      <View style={styles.row}>
        {CYCLES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, cycle === c.value && styles.chipActive]}
            onPress={() => setCycle(c.value)}
          >
            <Text style={[styles.chipText, cycle === c.value && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {cycle === 'custom' && (
        <TextInput
          style={styles.input}
          value={intervalDays}
          onChangeText={setIntervalDays}
          keyboardType="number-pad"
          placeholder="Every X days"
          placeholderTextColor="#8a8698"
        />
      )}

      <Text style={styles.sectionLabel}>Next Renewal Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={nextRenewal} onChangeText={setNextRenewal} placeholder="2025-01-01" placeholderTextColor="#8a8698" />

      <Text style={styles.sectionLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, categoryId === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setCategoryId(cat.id)}
          >
            <Text style={[styles.chipText, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>Website URL (optional)</Text>
      <TextInput style={styles.input} value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://..." placeholderTextColor="#8a8698" autoCapitalize="none" keyboardType="url" />

      <View style={styles.row}>
        <Text style={styles.sectionLabel}>Free Trial?</Text>
        <Switch value={isTrial} onValueChange={setIsTrial} thumbColor={isTrial ? '#6366f1' : '#8a8698'} trackColor={{ true: '#4f46e5', false: '#f1eff9' }} />
      </View>
      {isTrial && (
        <>
          <Text style={styles.sectionLabel}>Trial Ends (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={trialEndsOn} onChangeText={setTrialEndsOn} placeholder="2025-01-15" placeholderTextColor="#8a8698" />
        </>
      )}

      <Text style={styles.sectionLabel}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Any extra info…"
        placeholderTextColor="#8a8698"
      />

      <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSave} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : editId ? 'Save Changes' : 'Add Subscription'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: { color: '#6a6782', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#f1eff9', borderRadius: 12, padding: 14,
    color: '#1b1830', fontSize: 15, borderWidth: 1, borderColor: '#e5e3ef',
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e5e3ef', backgroundColor: '#f1eff9',
  },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { color: '#6a6782', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
