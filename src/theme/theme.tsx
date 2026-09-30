import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getThemePref, setThemePref, ThemePref } from '../lib/prefs';

export interface Theme {
  mode: 'light' | 'dark';
  bg: string;         // screen background
  surface: string;    // cards, inputs, sheets
  surfaceAlt: string; // subtle fills / secondary surfaces
  border: string;
  text: string;       // primary text
  textMuted: string;  // secondary text
  textFaint: string;  // tertiary text / carets
  primary: string;    // brand indigo (buttons, active)
  primaryDark: string;
  accent: string;     // brand purple
  green: string; red: string; amber: string; cyan: string;
  overlay: string;    // modal backdrop
}

const light: Theme = {
  mode: 'light',
  bg: '#f5f4fb', surface: '#ffffff', surfaceAlt: '#f1eff9', border: '#e5e3ef',
  text: '#1b1830', textMuted: '#787591', textFaint: '#b6b2c6',
  primary: '#6366f1', primaryDark: '#4f46e5', accent: '#8b5cf6',
  green: '#10b981', red: '#f43f5e', amber: '#f59e0b', cyan: '#06b6d4',
  overlay: 'rgba(0,0,0,0.4)',
};

const dark: Theme = {
  mode: 'dark',
  bg: '#0f0e17', surface: '#1a1826', surfaceAlt: '#221f31', border: '#2e2a40',
  text: '#ece9f5', textMuted: '#9a95b3', textFaint: '#6f6a86',
  primary: '#818cf8', primaryDark: '#6366f1', accent: '#a78bfa',
  green: '#10b981', red: '#fb7185', amber: '#f59e0b', cyan: '#22d3ee',
  overlay: 'rgba(0,0,0,0.6)',
};

interface ThemeCtx {
  theme: Theme;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: light, pref: 'system', setPref: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => { getThemePref().then(setPrefState); }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    setThemePref(p);
  }, []);

  const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const theme = mode === 'dark' ? dark : light;

  return <Ctx.Provider value={{ theme, pref, setPref }}>{children}</Ctx.Provider>;
}

/** The active theme tokens. */
export function useTheme(): Theme {
  return useContext(Ctx).theme;
}

/** Theme preference controls (for the Settings toggle). */
export function useThemePref(): { pref: ThemePref; setPref: (p: ThemePref) => void; mode: 'light' | 'dark' } {
  const { pref, setPref, theme } = useContext(Ctx);
  return { pref, setPref, mode: theme.mode };
}
