import { getTutorialProgressRow, markLessonDone } from '../db/tutorialProgress';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LessonId = 1 | 2 | 3 | 4 | 5;

export interface Lesson {
  id: LessonId;
  /** Short title shown in the overlay header */
  title: string;
  /** One-sentence instruction */
  description: string;
  /** CTA button label */
  action: string;
  /** Route to push when CTA is tapped */
  actionRoute: string;
  /** Event key fired by the relevant screen when the action is done */
  completionKey: string;
}

// ─── Lesson definitions ───────────────────────────────────────────────────────

export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Drop Your Pin',
    description:
      'Open the Map and add an evacuation pin to mark your family\'s safe meeting point.',
    action: 'Open Map',
    actionRoute: '/(tabs)/map',
    completionKey: 'pin_added',
  },
  {
    id: 2,
    title: 'Pack Your Bag',
    description:
      'Check off at least 3 items in your go-bag checklist to start your emergency supply.',
    action: 'Open Checklist',
    actionRoute: '/(tabs)/checklist',
    completionKey: 'checklist_checked_3',
  },
  {
    id: 3,
    title: 'Add an Emergency Contact',
    description:
      'Add a contact who will receive your Dead Man\'s Switch SMS alert if you miss a check-in.',
    action: 'Add Contact',
    actionRoute: '/emergency-contacts',
    completionKey: 'emergency_contact_added',
  },
  {
    id: 4,
    title: 'Read a Survival Guide',
    description:
      'Open and read any guide in the Guides tab — earthquake, flood, first aid, and more.',
    action: 'Open Guides',
    actionRoute: '/(tabs)/guides',
    completionKey: 'guide_opened',
  },
  {
    id: 5,
    title: 'Try the CPR Timer',
    description:
      'Start the CPR metronome in the Tools tab to learn the 110 bpm compression rhythm.',
    action: 'Open Tools',
    actionRoute: '/(tabs)/tools',
    completionKey: 'cpr_started',
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLessonProgress(): Record<LessonId, boolean> {
  const row = getTutorialProgressRow();
  return {
    1: row.lesson_1_done === 1,
    2: row.lesson_2_done === 1,
    3: row.lesson_3_done === 1,
    4: row.lesson_4_done === 1,
    5: row.lesson_5_done === 1,
  };
}

/** Returns points earned from completed lessons (4 pts each, max 20). */
export function getTutorialScorePoints(): number {
  const progress = getLessonProgress();
  const done = (Object.values(progress) as boolean[]).filter(Boolean).length;
  return done * 4;
}

/**
 * Looks up the lesson with the given `completionKey` and marks it done.
 * Returns the lesson id if it was newly completed, or null if already done / unknown key.
 */
export function completeLessonByKey(key: string): LessonId | null {
  const lesson = LESSONS.find((l) => l.completionKey === key);
  if (!lesson) return null;
  const progress = getLessonProgress();
  if (progress[lesson.id]) return null; // already done
  markLessonDone(lesson.id);
  return lesson.id;
}

/** True if all 5 lessons are complete. */
export function isTutorialComplete(): boolean {
  const progress = getLessonProgress();
  return (Object.values(progress) as boolean[]).every(Boolean);
}
