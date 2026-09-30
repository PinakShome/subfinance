import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, Modal, FlatList, Pressable, Dimensions,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { isRealDate } from '../../lib/subscriptionUtils';
import { getDefaultCurrency } from '../../lib/prefs';
import { BillingCycle, SubscriptionInsert } from '../../types/database';
import { HomeStackParamList } from '../../navigation/types';
import { CATALOGUE_INDEX } from '../../data/catalogueIndex';
import { useTheme, Theme } from '../../theme/theme';

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
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

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
  const [justPicked, setJustPicked] = useState(!!existing);

  useEffect(() => { fetchCategories(); }, []);

  // Add-time autocomplete: match what the user types against the bundled
  // catalogue so name/category/cost are pre-filled and, crucially, the saved
  // name matches a catalogue key exactly (so the alternatives lookup hits
  // directly instead of falling back to a paid generation).
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (justPicked || q.length < 2) return [];
    if (CATALOGUE_INDEX.some((e) => e.name.toLowerCase() === q)) return [];
    const starts: typeof CATALOGUE_INDEX = [];
    const contains: typeof CATALOGUE_INDEX = [];
    for (const e of CATALOGUE_INDEX) {
      const n = e.name.toLowerCase();
      if (n.startsWith(q)) starts.push(e);
      else if (n.includes(q)) contains.push(e);
    }
    return [...starts, ...contains].slice(0, 6);
  }, [name, justPicked]);

  const onNameChange = (text: string) => { setName(text); setJustPicked(false); };

  const pickSuggestion = (e: (typeof CATALOGUE_INDEX)[number]) => {
    setName(e.name);
    setJustPicked(true);
    // Only pre-fill cost when the field is empty and the display currency is
    // USD (catalogue prices are approximate US prices).
    if (!cost.trim() && currency.trim().toUpperCase() === 'USD' && e.approx_monthly != null && e.approx_monthly > 0) {
      setCost(String(e.approx_monthly));
    }
    const cat = categories.find((c) => c.name === e.category);
    if (cat) setCategoryId(cat.id);
  };

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
      <TextInput style={styles.input} value={name} onChangeText={onNameChange} maxLength={100} placeholder="e.g. Netflix" placeholderTextColor={t.textMuted} autoCorrect={false} />
      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
          {suggestions.map((e, i) => (
            <TouchableOpacity
              key={e.name}
              style={[styles.suggestRow, i < suggestions.length - 1 && styles.suggestRowBorder]}
              onPress={() => pickSuggestion(e)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${e.name}, ${e.category}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.suggestName}>{e.name}</Text>
                <Text style={styles.suggestCat}>{e.category}</Text>
              </View>
              {e.approx_monthly != null && e.approx_monthly > 0 && (
                <Text style={styles.suggestPrice}>≈ ${e.approx_monthly}/mo</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
          placeholderTextColor={t.textMuted}
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
          placeholderTextColor={t.textMuted}
        />
      )}

      <Text style={styles.sectionLabel}>Next Renewal Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={nextRenewal} onChangeText={setNextRenewal} placeholder="2025-01-01" placeholderTextColor={t.textMuted} />

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
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCatModalOpen(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose a category</Text>
            <FlatList
              data={sortedCategories}
              keyExtractor={(c) => c.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: Dimensions.get('window').height * 0.55 }}
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
        </View>
      </Modal>

      <Text style={styles.sectionLabel}>Website URL (optional)</Text>
      <TextInput style={styles.input} value={websiteUrl} onChangeText={setWebsiteUrl} placeholder="https://..." placeholderTextColor={t.textMuted} autoCapitalize="none" keyboardType="url" />

      <View style={styles.row}>
        <Text style={styles.sectionLabel}>Free Trial?</Text>
        <Switch value={isTrial} onValueChange={setIsTrial} thumbColor={isTrial ? t.primary : t.textMuted} trackColor={{ true: t.primaryDark, false: t.surfaceAlt }} />
      </View>
      {isTrial && (
        <>
          <Text style={styles.sectionLabel}>Trial Ends (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} value={trialEndsOn} onChangeText={setTrialEndsOn} placeholder="2025-01-15" placeholderTextColor={t.textMuted} />
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
        placeholderTextColor={t.textMuted}
      />

      <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={handleSave} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Saving…' : editId ? 'Save Changes' : 'Add Subscription'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 20, paddingBottom: 60 },
  sectionLabel: { color: c.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 14,
    color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceAlt,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { color: c.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  dropdownText: { color: c.text, fontSize: 15 },
  dropdownPlaceholder: { color: c.textMuted },
  dropdownCaret: { color: c.textMuted, fontSize: 14, marginLeft: 8 },
  suggestBox: {
    marginTop: 6, backgroundColor: c.surface, borderRadius: 12,
    borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 3,
  },
  suggestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, gap: 10 },
  suggestRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  suggestName: { color: c.text, fontSize: 15, fontWeight: '600' },
  suggestCat: { color: c.textMuted, fontSize: 12, marginTop: 1 },
  suggestPrice: { color: c.primary, fontSize: 13, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: c.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 14, paddingHorizontal: 20, paddingBottom: 30, maxHeight: '70%',
  },
  modalTitle: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  modalRowText: { color: c.text, fontSize: 15 },
  modalRowTextActive: { color: c.primary, fontWeight: '700' },
  modalCheck: { color: c.primary, fontSize: 16, fontWeight: '700' },
  button: {
    backgroundColor: c.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
