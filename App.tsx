import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import { useSubscriptionStore } from './src/store/subscriptionStore';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { useNotifications } from './src/hooks/useNotifications';

// ─── Demo mode ───────────────────────────────────────────────────────────────
// Set EXPO_PUBLIC_DEMO_MODE=true in .env to bypass Supabase auth for testing.
// REMOVE THIS before final production build.
const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const DEMO_USER = {
  id: 'demo-user-id',
  email: 'demo@subfinance.app',
  created_at: '2026-01-15T10:00:00.000Z',
  app_metadata: {}, user_metadata: {}, aud: 'authenticated', role: 'authenticated',
} as any;

const DEMO_SESSION = {
  access_token: 'demo-token', refresh_token: 'demo-refresh',
  expires_in: 99999, expires_at: 9999999999, token_type: 'bearer',
  user: DEMO_USER,
} as any;

const d = (days: number) => new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
const DEMO_SUBS: any[] = [
  { id:'s1', user_id:'demo-user-id', name:'Netflix',       cost:19.99, billing_cycle:'monthly', currency:'USD', next_renewal:d(13), is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:'Family plan', website_url:'https://netflix.com', interval_days:null, started_on:'2023-01-01', created_at:'2023-01-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s2', user_id:'demo-user-id', name:'Spotify',       cost:9.99,  billing_cycle:'monthly', currency:'USD', next_renewal:d(4),  is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s3', user_id:'demo-user-id', name:'GitHub Copilot',cost:10,    billing_cycle:'monthly', currency:'USD', next_renewal:d(-1), is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s4', user_id:'demo-user-id', name:'ChatGPT Plus',  cost:20,    billing_cycle:'monthly', currency:'USD', next_renewal:d(2),  is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s5', user_id:'demo-user-id', name:'AWS',           cost:47.23, billing_cycle:'monthly', currency:'USD', next_renewal:d(22), is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s6', user_id:'demo-user-id', name:'Figma',         cost:12,    billing_cycle:'monthly', currency:'USD', next_renewal:d(9),  is_active:true, is_trial:false, trial_ends_on:null, category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s7', user_id:'demo-user-id', name:'Notion',        cost:8,     billing_cycle:'monthly', currency:'USD', next_renewal:d(5),  is_active:true, is_trial:true,  trial_ends_on:d(2), category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s8', user_id:'demo-user-id', name:'Linear',        cost:8,     billing_cycle:'monthly', currency:'USD', next_renewal:d(1),  is_active:true, is_trial:true,  trial_ends_on:d(1), category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
  { id:'s9', user_id:'demo-user-id', name:'Vercel Pro',    cost:20,    billing_cycle:'monthly', currency:'USD', next_renewal:d(14), is_active:true, is_trial:true,  trial_ends_on:d(7), category:null, category_id:null, notes:null, website_url:null, interval_days:null, started_on:null, created_at:'2023-06-01T00:00:00Z', updated_at:'2026-05-13T00:00:00Z' },
];
// ─────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const { session, loading, setSession } = useAuthStore();
  useNotifications();

  useEffect(() => {
    if (DEMO_MODE) {
      // Bypass Supabase entirely — pre-load demo session + subscriptions
      setSession(DEMO_SESSION);
      useSubscriptionStore.setState({ subscriptions: DEMO_SUBS, loading: false });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return session ? <AppNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f4fb' }}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppContent />
      </NavigationContainer>
    </View>
  );
}
