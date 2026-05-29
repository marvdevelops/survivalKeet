import { getDb } from './database';

// ─── Row type (raw SQLite integers) ──────────────────────────────────────────

interface TutorialProgressRow {
  id: 1;
  lesson_1_done: number;
  lesson_2_done: number;
  lesson_3_done: number;
  lesson_4_done: number;
  lesson_5_done: number;
  welcome_shown: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _ensureRow(): void {
  const existing = getDb().getFirstSync<{ id: number }>(
    'SELECT id FROM tutorial_progress WHERE id = 1'
  );
  if (!existing) {
    getDb().runSync(
      `INSERT INTO tutorial_progress
         (id, lesson_1_done, lesson_2_done, lesson_3_done,
          lesson_4_done, lesson_5_done, welcome_shown)
       VALUES (1, 0, 0, 0, 0, 0, 0)`
    );
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getTutorialProgressRow(): TutorialProgressRow {
  _ensureRow();
  return getDb().getFirstSync<TutorialProgressRow>(
    'SELECT * FROM tutorial_progress WHERE id = 1'
  )!;
}

export function markLessonDone(lessonNumber: 1 | 2 | 3 | 4 | 5): void {
  _ensureRow();
  getDb().runSync(
    `UPDATE tutorial_progress SET lesson_${lessonNumber}_done = 1 WHERE id = 1`
  );
}

export function markWelcomeShown(): void {
  _ensureRow();
  getDb().runSync(
    'UPDATE tutorial_progress SET welcome_shown = 1 WHERE id = 1'
  );
}
