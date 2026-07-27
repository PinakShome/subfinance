import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const FEATURES = [
  { icon: 'wallet-outline', text: 'Track every subscription in one place', color: '#8b5cf6', bg: '#8b5cf615', border: '#8b5cf630' },
  { icon: 'trending-down-outline', text: 'AI-powered savings & alternatives', color: '#06b6d4', bg: '#06b6d415', border: '#06b6d430' },
  { icon: 'bar-chart-outline', text: 'Real-time spending analytics', color: '#10b981', bg: '#10b98115', border: '#10b98130' },
];

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setBusy(true);
    const err = await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (err) showAlert('Login failed', err);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background glow blobs */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* ─── Branding ─── */}
      <View style={styles.brandArea}>
        {/* Logo */}
        <View style={styles.logoOuter}>
          <View style={styles.logoInner}>
            <Ionicons name="layers" size={30} color="#1b1830" />
          </View>
        </View>

        <Text style={styles.appName}>SubFinance</Text>
        <Text style={styles.tagline}>Smart subscription intelligence.</Text>

        {/* Feature pills — each a different colour */}
        <View style={styles.pills}>
          {FEATURES.map(f => (
            <View key={f.text} style={[styles.pill, { backgroundColor: f.bg, borderColor: f.border }]}>
              <Ionicons name={f.icon as any} size={14} color={f.color} />
              <Text style={[styles.pillText, { color: f.color }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ─── Form card ─── */}
      <View style={styles.card}>
        {/* Card top glow */}
        <View style={styles.cardGlow} />

        <Text style={styles.cardTitle}>Welcome back</Text>
        <Text style={styles.cardSub}>Sign in to continue</Text>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.fieldWrap}>
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
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <View style={styles.fieldWrap}>
            <Ionicons name="lock-closed-outline" size={16} color="#8a8698" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#b6b2c6"
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color="#8a8698" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={{ alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 }}
        >
          <Text style={{ color: '#8b5cf6', fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Sign In */}
        <TouchableOpacity
          style={[styles.signInBtn, busy && { opacity: 0.6 }]}
          onPress={handleLogin}
          disabled={busy}
          activeOpacity={0.85}
        >
          <View style={styles.signInBtnInner}>
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.signInText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.divLine} />
          <Text style={styles.divText}>or</Text>
          <View style={styles.divLine} />
        </View>

        {/* Create account */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.8}
        >
          <Text style={styles.createText}>Create a new account</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f4fb',
    overflow: 'hidden',
  },
  // Centers the form when there's room, but scrolls instead of clipping under
  // the Dynamic Island on shorter devices.
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  // Ambient glow blobs
  glowTop: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#8b5cf618',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#06b6d410',
  },

  // Branding
  brandArea: { alignItems: 'center', marginBottom: 28 },

  logoOuter: {
    width: 80, height: 80, borderRadius: 26,
    backgroundColor: '#8b5cf620',
    borderWidth: 1.5, borderColor: '#8b5cf650',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoInner: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center', alignItems: 'center',
  },

  appName: {
    color: '#1b1830',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  tagline: {
    color: '#787591',
    fontSize: 14,
    marginBottom: 22,
    letterSpacing: 0.2,
  },

  pills: { gap: 8, alignSelf: 'stretch' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: '600' },

  // Form card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
  },
  cardGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 200,
    height: 120,
    borderRadius: 100,
    backgroundColor: '#8b5cf610',
  },

  cardTitle: { color: '#1b1830', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSub: { color: '#787591', fontSize: 14, marginBottom: 24 },

  // Fields
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    color: '#8a8698',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#1b1830',
    fontSize: 15,
    paddingVertical: 14,
  },

  // Sign in button
  signInBtn: {
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  signInBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 17,
  },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  divText: { color: '#b6b2c6', fontSize: 13 },

  // Create account
  createBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  createText: { color: '#6a6782', fontSize: 15, fontWeight: '600' },
});
