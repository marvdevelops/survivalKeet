import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';
import type { Lesson, LessonId } from '../services/tutorialService';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  progress: Record<LessonId, boolean>;
  lessons:  Lesson[];
  onStart:  (lessonId: LessonId) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NextLessonCard({ progress, lessons, onStart }: Props) {
  const completedCount = lessons.filter((l) => progress[l.id]).length;
  const nextLesson     = lessons.find((l) => !progress[l.id]) ?? null;

  // All lessons done — section disappears entirely
  if (!nextLesson) return null;

  return (
    <View style={styles.card}>

      {/* ── Badge ─────────────────────────────────────────────────────────── */}
      <Text style={styles.badge}>
        {`NEXT LESSON · ${nextLesson.id} OF 5`}
      </Text>

      {/* ── Title ─────────────────────────────────────────────────────────── */}
      <Text style={styles.title}>{nextLesson.title}</Text>

      {/* ── Description ───────────────────────────────────────────────────── */}
      <Text style={styles.description}>{nextLesson.description}</Text>

      {/* ── Start button ──────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.startBtn}
        onPress={() => onStart(nextLesson.id)}
        activeOpacity={0.85}
      >
        <Text style={styles.startBtnText}>Start now</Text>
      </TouchableOpacity>

      {/* ── Progress dots ─────────────────────────────────────────────────── */}
      <View style={styles.dotsRow}>
        {lessons.map((lesson) => {
          const isDone    = progress[lesson.id];
          const isCurrent = lesson.id === nextLesson.id;
          return (
            <View
              key={lesson.id}
              style={[
                styles.dot,
                isDone                  ? styles.dotDone    :
                isCurrent               ? styles.dotCurrent :
                                          styles.dotFuture,
              ]}
            />
          );
        })}
        <Text style={styles.progressText}>{completedCount} of 5 complete</Text>
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius:    radius.lg,
    borderWidth:     0.5,
    borderColor:     '#FF3B30',
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
    padding:         spacing.md,
    marginBottom:    spacing.lg,
  },

  // ── Badge ────────────────────────────────────────────────────────────────────
  badge: {
    fontSize:      10,
    color:         '#FF3B30',
    fontWeight:    '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Text ─────────────────────────────────────────────────────────────────────
  title: {
    fontSize:   15,
    color:      '#FFFFFF',
    fontWeight: '500',
    marginTop:  4,
  },
  description: {
    fontSize:     12,
    color:        '#666666',
    marginTop:    2,
    marginBottom: 10,
  },

  // ── Start button ─────────────────────────────────────────────────────────────
  startBtn: {
    backgroundColor:  '#FF3B30',
    borderRadius:     8,
    paddingVertical:  8,
    paddingHorizontal: 14,
    alignSelf:        'flex-start',
  },
  startBtnText: {
    fontSize:   13,
    color:      '#FFFFFF',
    fontWeight: '600',
  },

  // ── Progress dots ─────────────────────────────────────────────────────────────
  dotsRow: {
    marginTop:      12,
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
  },
  dot: {
    width:        7,
    height:       7,
    borderRadius: 3.5,
  },
  dotDone: {
    backgroundColor: '#4CAF50',
  },
  dotCurrent: {
    backgroundColor: '#FF3B30',
  },
  dotFuture: {
    backgroundColor: '#1e1e1e',
    borderWidth:     0.5,
    borderColor:     '#333333',
  },
  progressText: {
    fontSize:   10,
    color:      '#555555',
    marginLeft: 4,
  },
});
