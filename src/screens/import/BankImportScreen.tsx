import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  FlatList, Alert, Platform,
} from 'react-native';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { formatCurrency } from '../../lib/subscriptionUtils';
import { BillingCycle } from '../../types/database';
import { apiFetch, API_BASE } from '../../lib/api';

// WebView is only used on native — not supported on web
let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch {}
}

interface DetectedSub {
  name: string;
  amount: number;
  currency: string;
  frequency: string;
  added?: boolean;
}

type Step = 'intro' | 'linking' | 'review' | 'done';

// ─── Web: launch Plaid Link via the browser's own JS SDK ─────────────────────
function openPlaidWeb(
  linkToken: string,
  onSuccess: (publicToken: string) => void,
  onExit: () => void,
) {
  if (typeof window === 'undefined') return;

  const loadAndOpen = () => {
    const handler = (window as any).Plaid.create({
      token: linkToken,
      onSuccess: (_pub: string, _meta: any) => onSuccess(_pub),
      onExit: (_err: any, _meta: any) => onExit(),
    });
    handler.open();
  };

  // Inject Plaid Link script if not already present
  if ((window as any).Plaid) {
    loadAndOpen();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload = loadAndOpen;
    document.head.appendChild(script);
  }
}

export default function BankImportScreen() {
  const [step, setStep] = useState<Step>('intro');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedSub[]>([]);
  const [busy, setBusy] = useState(false);
  const { add } = useSubscriptionStore();

  const startLink = async () => {
    setBusy(true);
    try {
      const json = await apiFetch('/api/plaid/link-token', { method: 'POST' });
      const token = json.link_token;
      setLinkToken(token);

      if (Platform.OS === 'web') {
        // On web: open Plaid directly in the browser without WebView
        openPlaidWeb(
          token,
          (publicToken) => handlePlaidCallback(publicToken),
          () => setBusy(false),
        );
        // Don't change step — stay on intro while Plaid Link modal is open
      } else {
        setStep('linking');
      }
    } catch (e: any) {
      Alert.alert('Connection Error', e.message);
    } finally {
      if (Platform.OS === 'web') setBusy(false);
      else setBusy(false);
    }
  };

  // Called when Plaid Link succeeds with a public_token
  const handlePlaidCallback = async (publicToken: string) => {
    setBusy(true);
    setStep('review');
    try {
      const json = await apiFetch('/api/plaid/exchange', {
        method: 'POST',
        body: JSON.stringify({ public_token: publicToken }),
        timeoutMs: 60000,
      } as any);
      setDetected(json.detected ?? []);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setBusy(false);
    }
  };

  const addSub = async (item: DetectedSub, index: number) => {
    const today = new Date();
    const nextRenewal = new Date(today);
    nextRenewal.setMonth(nextRenewal.getMonth() + 1);

    const err = await add({
      name: item.name,
      cost: item.amount,
      currency: item.currency,
      billing_cycle: item.frequency as BillingCycle,
      interval_days: null,
      next_renewal: nextRenewal.toISOString().slice(0, 10),
      category_id: null,
      notes: 'Imported from bank',
      is_trial: false,
      trial_ends_on: null,
      is_active: true,
      website_url: null,
      started_on: null,
    });

    if (err) { Alert.alert('Error', err); return; }
    setDetected((prev) =>
      prev.map((d, i) => (i === index ? { ...d, added: true } : d)),
    );
  };

  const plaidUrl = linkToken ? `${API_BASE}/plaid/link?token=${linkToken}` : '';

  // ─── Intro ────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🏦</Text>
        </View>
        <Text style={styles.title}>Connect Your Bank</Text>
        <Text style={styles.subtitle}>
          Securely connect via Plaid to auto-detect recurring subscriptions from your transactions.
        </Text>
        <View style={styles.bulletBox}>
          {['Bank-level 256-bit encryption', 'Read-only access to transactions', 'Powered by Plaid — used by thousands of apps'].map((t) => (
            <View key={t} style={styles.bullet}>
              <Text style={styles.checkmark}>✅</Text>
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={startLink} disabled={busy}>
          {busy
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Connect Bank Account</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Plaid Link WebView (native only) ─────────────────────────────────────
  if (step === 'linking' && Platform.OS !== 'web' && WebView) {
    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: plaidUrl }}
          originWhitelist={['*']}
          javaScriptEnabled
          onMessage={(event: any) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'success') handlePlaidCallback(msg.public_token);
              else if (msg.type === 'exit') setStep('intro');
            } catch {}
          }}
        />
      </View>
    );
  }

  // ─── Review detected subscriptions ────────────────────────────────────────
  if (step === 'review') {
    return (
      <View style={styles.container}>
        {busy && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#6366f1" size="large" />
            <Text style={styles.loadingText}>Analysing transactions…</Text>
          </View>
        )}
        <Text style={styles.title}>Detected Subscriptions</Text>
        <Text style={styles.subtitle}>
          {detected.length > 0
            ? `Found ${detected.length} recurring charge${detected.length > 1 ? 's' : ''}. Tap + to add any of them.`
            : 'No recurring charges detected in the last 90 days.'}
        </Text>
        <FlatList
          data={detected}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>
                  {formatCurrency(item.amount, item.currency)} · {item.frequency}
                </Text>
              </View>
              {item.added ? (
                <Text style={{ fontSize: 24 }}>✅</Text>
              ) : (
                <TouchableOpacity onPress={() => addSub(item, index)} style={styles.addBtn}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            !busy ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={styles.emptyText}>No subscriptions found</Text>
              </View>
            ) : null
          }
        />
        <TouchableOpacity style={styles.btn} onPress={() => setStep('intro')}>
          <Text style={styles.btnText}>Connect Another Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginTop: 40, marginBottom: 24,
  },
  iconText: { fontSize: 36 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtitle: { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  bulletBox: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 32 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  checkmark: { fontSize: 16 },
  bulletText: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  btn: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 10,
  },
  cardInfo: { flex: 1 },
  cardName: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
  cardMeta: { color: '#64748b', fontSize: 13, marginTop: 3 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  loadingOverlay: { alignItems: 'center', marginBottom: 24 },
  loadingText: { color: '#94a3b8', marginTop: 12, fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#475569', fontSize: 16, marginTop: 12 },
});
