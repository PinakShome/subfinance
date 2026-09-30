import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { CURRENCIES } from '../lib/prefs';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useTheme, Theme } from '../theme/theme';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'DefaultCurrency'>;
};

export default function CurrencyPickerScreen({ navigation }: Props) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { defaultCurrency, setDefaultCurrency, loadDefaultCurrency } = useSubscriptionStore();
  const [selected, setSelected] = useState<string | null>(defaultCurrency);

  useEffect(() => { loadDefaultCurrency(); }, []);
  useEffect(() => { setSelected(defaultCurrency); }, [defaultCurrency]);

  const choose = async (code: string) => {
    setSelected(code);
    await setDefaultCurrency(code); // persists + updates the store so all surfaces re-render
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>All totals across the app are shown in this currency, and new subscriptions default to it.</Text>
      <View style={styles.section}>
        {CURRENCIES.map((cur, i) => {
          const active = cur.code === selected;
          return (
            <TouchableOpacity
              key={cur.code}
              style={[styles.row, i < CURRENCIES.length - 1 && styles.rowBorder]}
              onPress={() => choose(cur.code)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${cur.name}, ${cur.code}${active ? ', selected' : ''}`}
            >
              <View style={styles.symbolWrap}>
                <Text style={styles.symbol}>{cur.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{cur.code}</Text>
                <Text style={styles.name}>{cur.name}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={c.accent} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: c.textMuted, fontSize: 13, marginBottom: 14, marginHorizontal: 4 },
  section: {
    backgroundColor: c.surface, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: c.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  symbolWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: c.accent + '18',
    borderWidth: 1, borderColor: c.accent + '30', justifyContent: 'center', alignItems: 'center',
  },
  symbol: { color: c.accent, fontSize: 15, fontWeight: '800' },
  code: { color: c.text, fontSize: 16, fontWeight: '700' },
  name: { color: c.textMuted, fontSize: 13, marginTop: 1 },
});
