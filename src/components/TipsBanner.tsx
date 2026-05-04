import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../theme';
import { getAllGuides } from '../services/guidesService';
import type { Guide } from '../db/schema';

const ROTATE_INTERVAL_MS = 12000;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Earthquake: 'earth',
  Typhoon: 'thunderstorm',
  Flood: 'water',
  'Fire Safety': 'flame',
  'First Aid': 'medkit',
  Evacuation: 'exit',
  Survival: 'leaf',
};

const CATEGORY_COLORS: Record<string, string> = {
  Earthquake: '#8E44AD',
  Typhoon: '#2980B9',
  Flood: '#1ABC9C',
  'Fire Safety': '#E67E22',
  'First Aid': '#E74C3C',
  Evacuation: '#27AE60',
  Survival: '#D4AC0D',
};

export function TipsBanner() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const all = getAllGuides();
    // Shuffle so tips feel fresh each launch
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    setGuides(shuffled);
    setIndex(0);
  }, []);

  useEffect(() => {
    if (guides.length === 0) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % guides.length);
      setExpanded(false);
    }, ROTATE_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [guides]);

  function next() {
    setIndex((i) => (i + 1) % guides.length);
    setExpanded(false);
    resetTimer();
  }

  function prev() {
    setIndex((i) => (i - 1 + guides.length) % guides.length);
    setExpanded(false);
    resetTimer();
  }

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % guides.length);
      setExpanded(false);
    }, ROTATE_INTERVAL_MS);
  }

  if (guides.length === 0) return null;

  const tip = guides[index];
  const color = CATEGORY_COLORS[tip.category] ?? colors.primary;
  const icon = CATEGORY_ICONS[tip.category] ?? 'bulb-outline';

  // Show first paragraph only in collapsed state
  const preview = tip.body.split('\n\n')[0].slice(0, 140);

  return (
    <View style={[styles.container, { borderColor: color + '50' }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconBox, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.category, { color }]}>{tip.category}</Text>
          <Text style={styles.title} numberOfLines={2}>{tip.title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textDim}
        />
      </TouchableOpacity>

      {!expanded && (
        <Text style={styles.preview} numberOfLines={3}>{preview}…</Text>
      )}

      {expanded && (
        <Text style={styles.body}>{tip.body}</Text>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={prev} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.counter}>{index + 1} / {guides.length}</Text>
        <TouchableOpacity onPress={next} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  category: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    lineHeight: 18,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  body: {
    color: colors.text,
    fontSize: fontSize.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  navBtn: {
    padding: spacing.xs,
  },
  counter: {
    color: colors.textDim,
    fontSize: fontSize.xs,
  },
});
