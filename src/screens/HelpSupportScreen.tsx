import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { showAlert } from '../lib/alert';

const SUPPORT_EMAIL = 'support@subfinance.app';
const PRIVACY_POLICY_URL = 'https://subscription-tracker-gilt.vercel.app/privacy-policy.html';
const TERMS_URL = 'https://subscription-tracker-gilt.vercel.app/terms.html';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ: { q: string; a: string }[] = [
  { q: 'How do the cheaper alternatives work?', a: 'For a subscription you track, we find real, currently-available services that serve the same purpose for less (or free), using public pricing. Every suggestion links to the provider so you can verify it yourself.' },
  { q: 'Are the alternative prices exact?', a: 'No — they are approximate and can change or go out of date. Always confirm current pricing, plans and features on the provider’s own website before switching. Suggestions are informational only, not financial advice.' },
  { q: 'How do renewal reminders work?', a: 'With notifications enabled (Settings → Renewal Reminders), we alert you shortly before a subscription renews and before a free trial ends, so nothing charges you by surprise.' },
  { q: 'How is my data protected?', a: 'Your data is stored in a secure, encrypted database, sent only over encrypted HTTPS, and isolated to your account. We never sell your personal information. See our Privacy Policy for details.' },
  { q: 'Which currency are my totals in?', a: 'All totals are shown in your display currency (Settings → Default Currency). Subscriptions in other currencies are converted using approximate rates, while each subscription still shows its own currency.' },
  { q: 'How do I delete my account?', a: 'Go to Settings → Delete Account. This permanently removes your account and all associated data — this cannot be undone.' },
];

function FaqItem({ item, open, onToggle }: { item: { q: string; a: string }; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.faqItem}>
      <TouchableOpacity style={styles.faqQRow} onPress={onToggle} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={item.q} accessibilityState={{ expanded: open }}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#8b5cf6" />
      </TouchableOpacity>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </View>
  );
}

function LinkRow({ icon, label, description, color, onPress }: { icon: string; label: string; description?: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.rowIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={14} color="#b6b2c6" />
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const openURL = async (url: string, failMsg: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error('cannot open');
      await Linking.openURL(url);
    } catch {
      showAlert('Unavailable', failMsg);
    }
  };

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx((cur) => (cur === i ? null : i));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionHdr}>FREQUENTLY ASKED</Text>
      <View style={styles.section}>
        {FAQ.map((item, i) => (
          <FaqItem key={item.q} item={item} open={openIdx === i} onToggle={() => toggle(i)} />
        ))}
      </View>

      <Text style={styles.sectionHdr}>CONTACT</Text>
      <View style={styles.section}>
        <LinkRow
          icon="mail-outline"
          label="Email support"
          description={SUPPORT_EMAIL}
          color="#8b5cf6"
          onPress={() => openURL(`mailto:${SUPPORT_EMAIL}?subject=SubFinance%20Support`, `Email us at ${SUPPORT_EMAIL}`)}
        />
      </View>

      <Text style={styles.sectionHdr}>DATA &amp; SECURITY</Text>
      <View style={styles.blurbCard}>
        <Ionicons name="lock-closed-outline" size={18} color="#10b981" />
        <Text style={styles.blurb}>
          Your subscriptions are stored in a secure, encrypted database, isolated to your account and sent only over encrypted connections. We never sell your data, and you can permanently delete your account any time from Settings.
        </Text>
      </View>

      <Text style={styles.sectionHdr}>LEGAL</Text>
      <View style={styles.section}>
        <LinkRow icon="shield-checkmark-outline" label="Privacy Policy" color="#06b6d4" onPress={() => openURL(PRIVACY_POLICY_URL, 'Could not open the privacy policy. Please try again.')} />
        <LinkRow icon="document-text-outline" label="Terms of Use" color="#6a6782" onPress={() => openURL(TERMS_URL, 'Could not open the terms. Please try again.')} />
      </View>

      <Text style={styles.version}>SubFinance v{version}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4fb' },
  content: { padding: 16, paddingBottom: 60 },
  sectionHdr: { color: '#8a8698', fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 8, marginTop: 12, paddingLeft: 4 },
  section: { backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', overflow: 'hidden' },

  faqItem: { borderBottomWidth: 1, borderBottomColor: '#f0ecff', paddingHorizontal: 16 },
  faqQRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, gap: 12 },
  faqQ: { flex: 1, color: '#2b2842', fontSize: 14, fontWeight: '600' },
  faqA: { color: '#6a6782', fontSize: 13, lineHeight: 20, paddingBottom: 15 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  rowIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { color: '#2b2842', fontSize: 14, fontWeight: '600' },
  rowDesc: { color: '#8a8698', fontSize: 12, marginTop: 2 },

  blurbCard: { flexDirection: 'row', gap: 12, backgroundColor: '#10b98110', borderColor: '#10b98130', borderWidth: 1, borderRadius: 18, padding: 16 },
  blurb: { flex: 1, color: '#3a5a4a', fontSize: 13, lineHeight: 20 },

  version: { color: '#b6b2c6', fontSize: 12, textAlign: 'center', marginTop: 20 },
});
