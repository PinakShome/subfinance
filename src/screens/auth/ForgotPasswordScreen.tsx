import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme, Theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const insets = useSafeAreaInsets();

  const handleReset = async () => {
    if (!email.trim()) {
      showAlert('Enter your email', 'Please enter the email address for your account.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.EXPO_PUBLIC_SITE_URL ?? 'https://subscription-tracker-gilt.vercel.app'}/reset-password.html`,
    });
    setBusy(false);
    if (error) {
      showAlert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.glow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color={c.textMuted} />
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={28} color={c.accent} />
        </View>

        {sent ? (
          <>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.sub}>
              We sent a password reset link to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>
            <Text style={styles.hint}>
              Click the link in the email to reset your password. Check your spam folder if you don't see it.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.btnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>

            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={c.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={c.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, busy && { opacity: 0.6 }]}
              onPress={handleReset}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  glow: {
    position: 'absolute', top: -100, alignSelf: 'center',
    width: 280, height: 280, borderRadius: 140, backgroundColor: '#8b5cf612',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32, alignSelf: 'flex-start' },
  backText: { color: c.textMuted, fontSize: 14 },

  card: {
    backgroundColor: c.surface, borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: c.border,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf630',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { color: c.text, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { color: c.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  emailHighlight: { color: c.accent, fontWeight: '700' },
  hint: {
    color: c.textMuted, fontSize: 13, lineHeight: 20,
    marginBottom: 24, backgroundColor: c.surfaceAlt,
    padding: 14, borderRadius: 12,
  },

  label: { color: c.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surfaceAlt, borderRadius: 14,
    borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, marginBottom: 20,
  },
  input: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 14 },

  btn: {
    backgroundColor: '#8b5cf6', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
