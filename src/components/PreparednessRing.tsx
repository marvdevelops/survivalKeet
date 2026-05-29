import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { PreparednessItem } from '../types/emergency';
import { colors, spacing, radius } from '../theme';

// ─── Ring geometry ─────────────────────────────────────────────────────────────

const RING_SIZE    = 80;
const RING_RADIUS  = 34;
const STROKE_WIDTH = 7;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 213.6

// ─── Helpers ───────────────────────────────────────────────────────────────────

function progressColor(score: number): string {
  if (score < 50) return '#FF3B30';
  if (score < 80) return '#FFB800';
  return '#4CAF50';
}

// Short display title per preparedness key — derived from data key, not hardcoded status
const KEY_DISPLAY: Record<string, string> = {
  gobag:      'Go-Bag',
  contacts:   'Contacts',
  medical:    'Medical',
  evacuation: 'Evacuation',
  offlinemap: 'Offline Map',
  tutorial:   'Tutorial',
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  score: number;
  items: PreparednessItem[];
  onItemPress: (item: PreparednessItem) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function PreparednessRing({ score, items, onItemPress }: Props) {
  // strokeDashoffset starts fully hidden, animates to the target value on mount
  const [dashOffset, setDashOffset] = useState(CIRCUMFERENCE);

  useEffect(() => {
    const targetOffset = CIRCUMFERENCE * (1 - score / 100);
    const startOffset  = CIRCUMFERENCE;
    const startTime    = Date.now();
    const DURATION     = 1000; // ms

    let rafId: ReturnType<typeof requestAnimationFrame>;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t       = Math.min(elapsed / DURATION, 1); // 0 → 1 linear
      setDashOffset(startOffset + (targetOffset - startOffset) * t);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [score]);

  const arcColor = progressColor(score);

  return (
    <View style={styles.card}>
      <View style={styles.row}>

        {/* ── Small SVG ring (left) ──────────────────────────────────────────── */}
        <View style={styles.ringWrap}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {/* Track */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke="#1e2530"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Progress arc — starts at top */}
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={arcColor}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
            />
          </Svg>

          {/* Center text — absolutely overlaid */}
          <View style={styles.centerOverlay} pointerEvents="none">
            <Text style={styles.centerScore}>{score}%</Text>
            <Text style={styles.centerLabel}>prepared</Text>
          </View>
        </View>

        {/* ── 2×2 status grid (right) ───────────────────────────────────────── */}
        <View style={styles.grid}>
          {items.map((item) => {
            const dotColor  = item.completed ? '#4CAF50' : '#FF6B6B';
            const textColor = item.completed ? '#4CAF50' : '#FF6B6B';

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.gridItem}
                onPress={() => { if (!item.completed) onItemPress(item); }}
                activeOpacity={item.completed ? 1 : 0.7}
              >
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
                <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                  {KEY_DISPLAY[item.key] ?? item.key}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  // Horizontal layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  // Ring (left side)
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    flexShrink: 0,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerScore: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  centerLabel: {
    color: '#666666',
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Grid (right side)
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
