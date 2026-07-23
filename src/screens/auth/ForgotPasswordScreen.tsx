import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { showAlert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

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
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Glow */}
      <View style={styles.glow} />

      {/* Back button */}
      <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={20} color="#6a6782" />
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Ionicons name="lock-open-outline" size={28} color="#8b5cf6" />
        </View>

        {sent ? (
          /* ─── Success state ─── */
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
          /* ─── Form state ─── */
          <>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.sub}>Enter your email and we'll send you a reset link.</Text>

            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color="#8a8698" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#b6b2c6"
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f5f4fb',
    justifyContent: 'center', padding: 20,
  },
  glow: {
    position: 'absolute', top: -100, alignSelf: 'center',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#8b5cf612',
  },
  back: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 32, alignSelf: 'flex-start',
  },
  backText: { color: '#6a6782', fontSize: 14 },

  card: {
    backgroundColor: '#ffffff', borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#8b5cf618', borderWidth: 1, borderColor: '#8b5cf630',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  title: { color: '#1b1830', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  sub: { color: '#787591', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  emailHighlight: { color: '#7c4dff', fontWeight: '700' },
  hint: {
    color: '#8a8698', fontSize: 13, lineHeight: 20,
    marginBottom: 24, backgroundColor: '#ffffff',
    padding: 14, borderRadius: 12,
  },

  label: {
    color: '#8a8698', fontSize: 10, fontWeight: '800',
    letterSpacing: 1.5, marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, marginBottom: 20,
  },
  input: { flex: 1, color: '#1b1830', fontSize: 15, paddingVertical: 14 },

  btn: {
    backgroundColor: '#8b5cf6', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
