import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, Modal, FlatList,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { isRealDate } from '../../lib/subscriptionUtils';
import { getDefaultCurrency } from '../../lib/prefs';
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
  const [catModalOpen, setCatModalOpen] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  // For new subscriptions, pre-fill the user's chosen default currency.
  useEffect(() => {
    if (!existing) getDefaultCurrency().then(setCurrency).catch(() => {});
  }, [existing]);

  const handleSave = async () => {
    if (!name.trim()) { showAlert('Name is required'); return; }
    const costNum = parseFloat(cost);
    // Upper bound matches the DB column (numeric(10,2)); without it the insert
    // fails with a raw database error.
    if (isNaN(costNum) || costNum < 0 || costNum > 99999999.99) {
      showAlert('Enter a valid cost', 'Use an amount between 0 and 99,999,999.99.');
      return;
    }
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) {
      showAlert('Enter a valid currency', 'Use a 3-letter code such as USD, EUR or GBP.');
      return;
    }
    let interval: number | null = null;
    if (cycle === 'custom') {
      interval = parseInt(intervalDays, 10);
      if (!Number.isFinite(interval) || interval < 1 || interval > 3650) {
        showAlert('Enter a valid interval', 'Use a number of days between 1 and 3650.');
        return;
      }
    }
    if (!isRealDate(nextRenewal)) {
      showAlert('Enter a valid renewal date', 'Use the format YYYY-MM-DD, for example 2026-08-15.');
      return;
    }
    if (isTrial && trialEndsOn && !isRealDate(trialEndsOn)) {
      showAlert('Enter a valid trial end date', 'Use the format YYYY-MM-DD, for example 2026-08-15.');
      return;
    }

    const payload: SubscriptionInsert = {
      name: name.trim().slice(0, 100),
      cost: costNum,
      currency: currency.trim().toUpperCase(),
      billing_cycle: cycle,
      interval_days: interval,
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

  const selectedCat = categories.find((c) => c.id === categoryId);
  const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100} placeholder="e.g. Netflix" placeholderTextColor="#8a8698" />

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
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setCatModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selectedCat ? `Category: ${selectedCat.name}` : 'Select a category'}
      >
        <Text style={[styles.dropdownText, !selectedCat && styles.dropdownPlaceholder]}>
          {selectedCat ? selectedCat.name : 'Select a category'}
        </Text>
        <Text style={styles.dropdownCaret}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={catModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCatModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCatModalOpen(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Choose a category</Text>
            <FlatList
              data={sortedCategories}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => { setCategoryId(item.id); setCatModalOpen(false); }}
                >
                  <Text style={[styles.modalRowText, categoryId === item.id && styles.modalRowTextActive]}>{item.name}</Text>
                  {categoryId === item.id && <Text style={styles.modalCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

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
        maxLength={500}
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
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f1eff9', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e5e3ef',
  },
  dropdownText: { color: '#1b1830', fontSize: 15 },
  dropdownPlaceholder: { color: '#8a8698' },
  dropdownCaret: { color: '#6a6782', fontSize: 14, marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 14, paddingHorizontal: 20, paddingBottom: 30, maxHeight: '70%',
  },
  modalTitle: { color: '#1b1830', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1eff9',
  },
  modalRowText: { color: '#1b1830', fontSize: 15 },
  modalRowTextActive: { color: '#6366f1', fontWeight: '700' },
  modalCheck: { color: '#6366f1', fontSize: 16, fontWeight: '700' },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
