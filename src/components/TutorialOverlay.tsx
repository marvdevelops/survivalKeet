import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../theme';
import { useTutorial } from '../context/TutorialContext';
import type { Lesson, LessonId } from '../services/tutorialService';

// ─── Lesson icons ─────────────────────────────────────────────────────────────

const LESSON_ICONS: Record<LessonId, keyof typeof Ionicons.glyphMap> = {
  1: 'map',
  2: 'bag',
  3: 'person-add',
  4: 'book',
  5: 'heart',
};

const LESSON_COLORS: Record<LessonId, string> = {
  1: '#27AE60',
  2: '#F39C12',
  3: '#3498DB',
  4: '#8E44AD',
  5: '#E74C3C',
};

// ─── Single lesson card ───────────────────────────────────────────────────────

function LessonCard({ lesson }: { lesson: Lesson }) {
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const { dismissLesson } = useTutorial();

  const translateY = useSharedValue(200);
  const opacity    = useSharedValue(0);

  // Slide in on mount
  useEffect(() => {
    translateY.value = withSpring(0, { damping: 22, stiffness: 180 });
    opacity.value    = withTiming(1, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  const color = LESSON_COLORS[lesson.id];
  const icon  = LESSON_ICONS[lesson.id];

  function handleGo() {
    // Slide out before navigating
    translateY.value = withTiming(200, { duration: 200 });
    opacity.value    = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(dismissLesson)();
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(lesson.actionRoute as any);
  }

  function handleDismiss() {
    translateY.value = withTiming(200, { duration: 180 });
    opacity.value    = withTiming(0, { duration: 180 }, (finished) => {
      if (finished) runOnJS(dismissLesson)();
    });
  }

  return (
    <Animated.View style={[styles.card, { marginBottom: insets.bottom + spacing.md }, cardStyle]}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.stepLabel}>LESSON {lesson.id} OF 5</Text>
          <Text style={styles.titleText}>{lesson.title}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Description */}
      <Text style={styles.description}>{lesson.description}</Text>

      {/* CTA button */}
      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: color }]}
        onPress={handleGo}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>{lesson.action}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.white} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Globally-mounted overlay ─────────────────────────────────────────────────

export function TutorialOverlay() {
  const { activeLesson } = useTutorial();
  if (!activeLesson) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <LessonCard lesson={activeLesson} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 900,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    // subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleCol: { flex: 1 },
  stepLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
    marginTop: 1,
  },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
    marginTop: spacing.xs,
  },
  ctaText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
