import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '../theme/theme';

const { width } = Dimensions.get('window');

type Slide = { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; body: string };

const SLIDES: Slide[] = [
  {
    icon: 'card-outline',
    color: '#8b5cf6',
    title: 'Track every subscription',
    body: 'Add what you pay for and see exactly where your money goes each month and year — in one place.',
  },
  {
    icon: 'notifications-outline',
    color: '#f59e0b',
    title: 'Never miss a renewal',
    body: 'Get reminders before free trials end and subscriptions renew, so nothing charges you by surprise.',
  },
  {
    icon: 'trending-down-outline',
    color: '#10b981',
    title: 'Find cheaper alternatives',
    body: 'For anything you pay for, discover real cheaper or free options — and see how much you could save.',
  },
];

export default function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const c = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
      setIndex(index + 1);
    } else {
      onDone();
    }
  };

  const last = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={onDone} accessibilityRole="button" accessibilityLabel="Skip onboarding">
          <Text style={styles.skip}>{last ? '' : 'Skip'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flexGrow: 0 }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: s.color + '18', borderColor: s.color + '33' }]}>
              <Ionicons name={s.icon} size={64} color={s.color} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next} accessibilityRole="button" accessibilityLabel={last ? 'Get started' : 'Next'}>
        <Text style={styles.buttonText}>{last ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.surface },
  skipRow: { height: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20 },
  skip: { color: c.textMuted, fontSize: 15, fontWeight: '600' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 8 },
  iconWrap: {
    width: 140, height: 140, borderRadius: 40, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  title: { color: c.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { color: c.textMuted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 6 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.border },
  dotActive: { backgroundColor: c.primary, width: 22 },
  button: {
    backgroundColor: c.primary, marginHorizontal: 24, marginBottom: 12, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
