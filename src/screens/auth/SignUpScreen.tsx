import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../lib/alert';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;
};

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);

  const handleSignUp = async () => {
    if (!email || !password) return;
    if (password !== confirm) { showAlert('Passwords do not match'); return; }
    if (password.length < 6) { showAlert('Password must be at least 6 characters'); return; }
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
        placeholderTextColor="#6a6782"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#6a6782"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#6a6782"
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#6366f1', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#6a6782', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#f1eff9', borderRadius: 12, padding: 16,
    color: '#1b1830', fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e3ef',
  },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#6a6782', textAlign: 'center', fontSize: 14 },
  linkBold: { color: '#6366f1', fontWeight: '700' },
});
