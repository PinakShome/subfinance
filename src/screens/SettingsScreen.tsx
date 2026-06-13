import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { totalMonthlySpend } from '../lib/subscriptionUtils';
import { SettingsStackParamList } from '../navigation/types';

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
      {!danger && <Ionicons name="chevron-forward" size={14} color="#374151" />}
    </TouchableOpacity>
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // Avatar initials from email
  const initials = user?.email?.split('@')[0].slice(0, 2).toUpperCase() ?? '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ─── Profile Card ─── */}
      <View style={styles.profileCard}>
        <View style={[styles.profileBlob, { backgroundColor: '#8b5cf618', top: -50, left: -30 }]} />
        <View style={[styles.profileBlob, { backgroundColor: '#22d3ee0d', bottom: -30, right: -20 }]} />

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
            <Text style={[styles.statVal, { color: '#22d3ee' }]}>${totalMonthly.toFixed(0)}</Text>
            <Text style={styles.statLbl}>monthly</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={[styles.statVal, { color: overdueCount > 0 ? '#fb7185' : '#34d399' }]}>{overdueCount}</Text>
            <Text style={styles.statLbl}>overdue</Text>
          </View>
        </View>
      </View>

      {/* ─── Import Section ─── */}
      <SectionHeader title="IMPORT" />
      <View style={styles.section}>
        <SettingsRow
          icon="business-outline"
          label="Import from Bank"
          description="Connect via Plaid to auto-detect subscriptions"
          color="#6366f1"
          badge="Plaid"
          onPress={() => navigation.navigate('BankImport')}
        />
        {/* Gmail import hidden until Google OAuth is configured in production. */}
      </View>

      {/* ─── Preferences Section ─── */}
      <SectionHeader title="PREFERENCES" />
      <View style={styles.section}>
        <SettingsRow
          icon="notifications-outline"
          label="Renewal Reminders"
          description="Get notified before subscriptions renew"
          color="#fbbf24"
          badge="7 days"
          onPress={() => Alert.alert('Notifications', 'Configure your notification settings.')}
        />
        <SettingsRow
          icon="cash-outline"
          label="Default Currency"
          description="Used for new subscriptions"
          color="#34d399"
          badge="USD"
          onPress={() => Alert.alert('Currency', 'Currency settings coming soon.')}
        />
        <SettingsRow
          icon="moon-outline"
          label="Appearance"
          description="Dark mode (default)"
          color="#94a3b8"
          onPress={() => Alert.alert('Appearance', 'Theme settings coming soon.')}
        />
      </View>

      {/* ─── Account Section ─── */}
      <SectionHeader title="ACCOUNT" />
      <View style={styles.section}>
        <SettingsRow
          icon="shield-checkmark-outline"
          label="Privacy & Security"
          description="Manage your data and permissions"
          color="#22d3ee"
          onPress={() => Alert.alert('Privacy', 'Your data is encrypted and never sold.')}
        />
        <SettingsRow
          icon="help-circle-outline"
          label="Help & Support"
          description="FAQs, contact and feedback"
          color="#94a3b8"
          onPress={() => Alert.alert('Support', 'Contact support@subtracker.app')}
        />
        <SettingsRow
          icon="log-out-outline"
          label="Sign Out"
          color="#fb7185"
          danger
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.version}>SubFinance v1.0.0 · Built with ♥</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090f' },
  content: { padding: 16, paddingBottom: 60 },

  // Profile card
  profileCard: {
    backgroundColor: '#0e0e1f',
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
  profileEmail: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  profileJoined: { color: '#4b5563', fontSize: 12, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLbl: { color: '#4b5563', fontSize: 11, marginTop: 3 },
  statDiv: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.07)' },

  // Section header
  sectionHdr: {
    color: '#4b5563', fontSize: 10, fontWeight: '800',
    letterSpacing: 2, marginBottom: 8, marginTop: 4, paddingLeft: 4,
  },

  // Section
  section: {
    backgroundColor: '#0e0e1f', borderRadius: 20,
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
  rowLabel: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  rowDesc: { color: '#4b5563', fontSize: 12, marginTop: 2 },
  rowBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6,
  },
  rowBadgeText: { fontSize: 11, fontWeight: '800' },

  version: { color: '#1f1f3a', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
