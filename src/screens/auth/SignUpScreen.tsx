import React, { useMemo, useState } from 'react';
import {
  Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';
import { useTheme, Theme } from '../../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password !== confirm) { showAlert('Passwords do not match'); return; }
    if (password.length < 8) {
      showAlert('Choose a stronger password', 'Use at least 8 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      showAlert('Choose a stronger password', 'Include at least one letter and one number.');
      return;
    }
    setBusy(true);
    const err = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (err) { showAlert('Sign up failed', err); return; }
    showAlert('Check your email', 'We sent you a confirmation link.');
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.title}>SubFinance</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={c.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={c.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor={c.textMuted}
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />

      <TouchableOpacity
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={busy}
      >
        <Text style={styles.buttonText}>{busy ? 'Creating account…' : 'Create Account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: c.primary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: c.textMuted, textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 16,
    color: c.text, fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: c.border,
  },
  button: {
    backgroundColor: c.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: c.textMuted, textAlign: 'center', fontSize: 14 },
  linkBold: { color: c.primary, fontWeight: '700' },
});
