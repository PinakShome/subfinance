import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Share, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { totalMonthlySpend } from '../lib/subscriptionUtils';
import { getNotificationsEnabled, setNotificationsEnabled } from '../lib/notifications';
import { getDefaultCurrency } from '../lib/prefs';
import { apiFetch } from '../lib/api';
import { showAlert } from '../lib/alert';
import { SettingsStackParamList } from '../navigation/types';

const PRIVACY_POLICY_URL = 'https://subscription-tracker-gilt.vercel.app/privacy-policy.html';
const SUPPORT_EMAIL = 'support@subfinance.app';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'SettingsHome'>;
};

function SettingsRow({
  icon, label, description, color = '#8b5cf6', danger = false, badge, onPress,
}: {
  icon: string; label: string; description?: string; color?: string;
  danger?: boolean; badge?: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, danger && styles.rowDanger]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
    >
      <View style={[styles.rowIcon, { backgroundColor: color + '18', borderColor: color + '30', borderWidth: 1 }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color }]}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      {badge && (
        <View style={[styles.rowBadge, { backgroundColor: color + '18', borderColor: color + '30', borderWidth: 1 }]}>
          <Text style={[styles.rowBadgeText, { color }]}>{badge}</Text>
        </View>
      )}
      {!danger && <Ionicons name="chevron-forward" size={14} color="#b6b2c6" />}
    </TouchableOpacity>
  );
}

function SettingsToggleRow({
  icon, label, description, color = '#8b5cf6', value, onValueChange, disabled,
}: {
  icon: string; label: string; description?: string; color?: string;
  value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18', borderColor: color + '30', borderWidth: 1 }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={description}
        thumbColor={value ? color : '#8a8698'}
        trackColor={{ true: color + '80', false: '#f1eff9' }}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHdr}>{title}</Text>;
}

export default function SettingsScreen({ navigation }: Props) {
  const { user, signOut } = useAuthStore();
  const { subscriptions } = useSubscriptionStore();

  const totalMonthly = totalMonthlySpend(subscriptions);
  const activeCount = subscriptions.filter(s => s.is_active).length;
  const overdueCount = subscriptions.filter(s => {
    const d = new Date(s.next_renewal).getTime() - Date.now();
    return d < 0;
  }).length;
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null;

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [defaultCurrency, setDefaultCurrencyState] = useState('USD');

  useEffect(() => {
    getNotificationsEnabled().then(setNotifEnabled).catch(() => {});
  }, [user?.id]);

  // Refresh the currency badge each time this screen regains focus (e.g. after
  // returning from the currency picker).
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      getDefaultCurrency().then(setDefaultCurrencyState).catch(() => {});
    });
    return unsub;
  }, [navigation]);

  const openURL = async (url: string, failMsg: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      showAlert('Unavailable', failMsg);
    }
  };

  const handleToggleNotifications = async (next: boolean) => {
    setNotifBusy(true);
    const effective = await setNotificationsEnabled(next);
    setNotifEnabled(effective);
    setNotifBusy(false);
    // If the user tried to enable but it didn't stick, permission was denied
    // or push isn't available on this platform/build.
    if (next && !effective) {
      showAlert(
        'Notifications unavailable',
        'Enable notifications for SubFinance in your device settings, then try again.',
      );
    }
  };

  const handleSignOut = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleExportData = async () => {
    if (!subscriptions.length) {
      showAlert('Nothing to export', 'Add a subscription first.');
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'Name,Cost,Currency,Billing Cycle,Interval Days,Next Renewal,Category,Free Trial,Trial Ends,Notes';
    const rows = subscriptions.map((s) => [
      esc(s.name), s.cost, esc(s.currency), esc(s.billing_cycle), s.interval_days ?? '',
      esc(s.next_renewal), esc(s.category?.name ?? ''), s.is_trial ? 'yes' : 'no',
      esc(s.trial_ends_on ?? ''), esc(s.notes ?? ''),
    ].join(','));
    const csv = [header, ...rows].join('\n');
    try {
      await Share.share({ message: csv, title: 'SubFinance subscriptions (CSV)' });
    } catch {
      showAlert('Could not export', 'Something went wrong preparing your data. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'This permanently deletes your account and all your subscriptions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch('/api/account', { method: 'DELETE' });
              await signOut();
            } catch (e: any) {
              showAlert('Could not delete account', e?.message ?? 'Please try again later.');
            }
          },
        },
      ],
    );
  };

  // Avatar initials from email
  const initials = user?.email?.split('@')[0].slice(0, 2).toUpperCase() ?? '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ─── Profile Card ─── */}
      <View style={styles.profileCard}>
        <View style={[styles.profileBlob, { backgroundColor: '#8b5cf618', top: -50, left: -30 }]} />
        <View style={[styles.profileBlob, { backgroundColor: '#06b6d40d', bottom: -30, right: -20 }]} />

        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        {joinDate && <Text style={styles.profileJoined}>Member since {joinDate}</Text>}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#8b5cf6' }]}>{activeCount}</Text>
            <Text style={styles.statLbl}>subscriptions</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: '#06b6d4' }]}>${totalMonthly.toFixed(0)}</Text>
            <Text style={styles.statLbl}>monthly</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: overdueCount > 0 ? '#f43f5e' : '#10b981' }]}>{overdueCount}</Text>
            <Text style={styles.statLbl}>overdue</Text>
          </View>
        </View>
      </View>

      {/* ─── Preferences Section ─── */}
      <SectionHeader title="PREFERENCES" />
      <View style={styles.section}>
        <SettingsToggleRow
          icon="notifications-outline"
          label="Renewal Reminders"
          description="Get notified before subscriptions renew"
          color="#f59e0b"
          value={notifEnabled}
          onValueChange={handleToggleNotifications}
          disabled={notifBusy}
        />
        <SettingsRow
          icon="cash-outline"
          label="Default Currency"
          description="Used for new subscriptions"
          color="#10b981"
          badge={defaultCurrency}
          onPress={() => navigation.navigate('DefaultCurrency')}
        />
      </View>

      {/* ─── Account Section ─── */}
      <SectionHeader title="ACCOUNT" />
      <View style={styles.section}>
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          description="How we handle and protect your data"
          color="#06b6d4"
          onPress={() => openURL(PRIVACY_POLICY_URL, 'Could not open the privacy policy. Please try again.')}
        />
        <SettingsRow
          icon="help-circle-outline"
          label="Help & Support"
          description={`Email us at ${SUPPORT_EMAIL}`}
          color="#6a6782"
          onPress={() => openURL(`mailto:${SUPPORT_EMAIL}?subject=SubFinance%20Support`, `Email us at ${SUPPORT_EMAIL}`)}
        />
        <SettingsRow
          icon="log-out-outline"
          label="Sign Out"
          color="#f43f5e"
          danger
          onPress={handleSignOut}
        />
        <SettingsRow
          icon="download-outline"
          label="Export My Data"
          description="Download your subscriptions as CSV"
          color="#06b6d4"
          onPress={handleExportData}
        />
        <SettingsRow
          icon="trash-outline"
          label="Delete Account"
          description="Permanently delete your account and data"
          color="#ef4444"
          danger
          onPress={handleDeleteAccount}
        />
      </View>

      <Text style={styles.version}>SubFinance v1.0.0 · Built with ♥</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4fb' },
  content: { padding: 16, paddingBottom: 60 },

  // Profile card
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28, padding: 26,
    alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: '#8b5cf630',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 24, elevation: 10,
  },
  profileBlob: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: '#8b5cf650',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  profileEmail: { color: '#1b1830', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  profileJoined: { color: '#8a8698', fontSize: 12, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLbl: { color: '#8a8698', fontSize: 11, marginTop: 3 },
  statDiv: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Section header
  sectionHdr: {
    color: '#8a8698', fontSize: 10, fontWeight: '800',
    letterSpacing: 2, marginBottom: 8, marginTop: 4, paddingLeft: 4,
  },

  // Section
  section: {
    backgroundColor: '#ffffff', borderRadius: 20,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowDanger: { borderBottomWidth: 0 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { color: '#2b2842', fontSize: 14, fontWeight: '600' },
  rowDesc: { color: '#8a8698', fontSize: 12, marginTop: 2 },
  rowBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
  },
  rowBadgeText: { fontSize: 11, fontWeight: '800' },

  version: { color: '#f4f2fc', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
