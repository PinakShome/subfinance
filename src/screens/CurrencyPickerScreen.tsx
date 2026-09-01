import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SettingsStackParamList } from '../navigation/types';
import { CURRENCIES, getDefaultCurrency, setDefaultCurrency } from '../lib/prefs';

type Props = {
  navigation: NativeStackNavigationProp<SettingsStackParamList, 'DefaultCurrency'>;
};

export default function CurrencyPickerScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => { getDefaultCurrency().then(setSelected); }, []);

  const choose = async (code: string) => {
    setSelected(code);
    await setDefaultCurrency(code);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>New subscriptions will use this currency by default.</Text>
      <View style={styles.section}>
        {CURRENCIES.map((c, i) => {
          const active = c.code === selected;
          return (
            <TouchableOpacity
              key={c.code}
              style={[styles.row, i < CURRENCIES.length - 1 && styles.rowBorder]}
              onPress={() => choose(c.code)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${c.code}${active ? ', selected' : ''}`}
            >
              <View style={styles.symbolWrap}>
                <Text style={styles.symbol}>{c.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.name}>{c.name}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color="#8b5cf6" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f4fb' },
  content: { padding: 16, paddingBottom: 40 },
  hint: { color: '#787591', fontSize: 13, marginBottom: 14, marginHorizontal: 4 },
  section: {
    backgroundColor: '#ffffff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e3ef',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0ecff' },
  symbolWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#8b5cf618',
    borderWidth: 1, borderColor: '#8b5cf630', justifyContent: 'center', alignItems: 'center',
  },
  symbol: { color: '#8b5cf6', fontSize: 15, fontWeight: '800' },
  code: { color: '#1b1830', fontSize: 16, fontWeight: '700' },
  name: { color: '#8a8698', fontSize: 13, marginTop: 1 },
});
