import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../src/theme';
import { getDb } from '../src/db/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  bullets: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    icon: 'shield-checkmark',
    iconColor: colors.primary,
    title: 'SurviveKit',
    subtitle: 'Your offline survival companion — works anywhere, even without internet.',
    bullets: [
      { icon: 'wifi-outline', text: 'Fully offline — no internet required' },
      { icon: 'globe-outline', text: 'Works worldwide in any emergency' },
      { icon: 'flash-outline', text: 'Built for high-stress situations' },
    ],
  },
  {
    key: 'features',
    icon: 'apps',
    iconColor: '#3498DB',
    title: 'Everything You Need',
    subtitle: 'Five tools built for real emergencies.',
    bullets: [
      { icon: 'map',       text: 'Offline maps with evacuation points & hospitals' },
      { icon: 'call',      text: 'One-tap SOS with local emergency numbers' },
      { icon: 'construct', text: 'CPR timer, tourniquet tracker, flashlight' },
      { icon: 'book',      text: 'Survival guides for fire, flood, first aid & more' },
      { icon: 'documents', text: 'Offline document vault for IDs & insurance' },
    ],
  },
];

function markOnboardingDone() {
  const db = getDb();
  db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('onboarding_done', '1')");
  // auto_download_pending intentionally omitted — location is not requested during onboarding.
  // The Map screen handles location permission and offline pack creation independently.
}

export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef<FlatList<Slide>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleFinish() {
    markOnboardingDone();
    router.replace('/(tabs)');
  }

  function goNext() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: item.iconColor + '20' }]}>
              <Ionicons name={item.icon} size={64} color={item.iconColor} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            <View style={styles.bullets}>
              {item.bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletIcon}>
                    <Ionicons name={b.icon} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.bulletText}>{b.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isLast ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={20} color={colors.white} />
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  slideSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  bullets: { width: '100%', gap: spacing.md },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulletIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bulletText: { color: colors.text, fontSize: fontSize.md, flex: 1, lineHeight: 20 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    width: 24,
  },

  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
});
