import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { getTutorialProgressRow, markWelcomeShown } from '../db/tutorialProgress';
import {
  LESSONS,
  getLessonProgress,
  getTutorialScorePoints,
  completeLessonByKey,
  type Lesson,
  type LessonId,
} from '../services/tutorialService';

// ─── Context shape ────────────────────────────────────────────────────────────

interface TutorialContextValue {
  /** Currently highlighted lesson, or null if none is active */
  activeLesson: Lesson | null;
  /** true until the user dismisses the first-launch welcome modal */
  showWelcome: boolean;
  /** Points earned from completed lessons (0–20, 4 pts each) */
  tutorialScorePoints: number;
  /** Per-lesson completion flags */
  lessonProgress: Record<LessonId, boolean>;
  /** Open the tutorial overlay for a specific lesson */
  startLesson: (id: LessonId) => void;
  /** Dismiss the active lesson overlay without completing the lesson */
  dismissLesson: () => void;
  /** Dismiss the welcome modal (persists to DB) */
  dismissWelcome: () => void;
  /**
   * Call when the user performs a tutorial-tracked action.
   * Pass the `completionKey` that matches one of the LESSONS entries.
   */
  onActionCompleted: (key: string) => void;
  /** Re-reads progress from DB — call after external DB writes */
  refreshTutorial: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TutorialContext = createContext<TutorialContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function _safeGetProgress(): Record<LessonId, boolean> {
  try { return getLessonProgress(); }
  catch { return { 1: false, 2: false, 3: false, 4: false, 5: false }; }
}

function _safeGetScore(): number {
  try { return getTutorialScorePoints(); } catch { return 0; }
}

function _safeShowWelcome(): boolean {
  try { return getTutorialProgressRow().welcome_shown === 0; } catch { return false; }
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [activeLesson,        setActiveLesson]        = useState<Lesson | null>(null);
  // Safe defaults — real values loaded from DB in useEffect (matches EmergencyContext pattern;
  // avoids blocking the render phase with synchronous DB access on first launch).
  const [showWelcome,         setShowWelcome]         = useState<boolean>(false);
  const [tutorialScorePoints, setTutorialScorePoints] = useState<number>(0);
  const [lessonProgress,      setLessonProgress]      = useState<Record<LessonId, boolean>>(
    { 1: false, 2: false, 3: false, 4: false, 5: false }
  );

  // ── Actions ─────────────────────────────────────────────────────────────────

  const refreshTutorial = useCallback(() => {
    setLessonProgress(_safeGetProgress());
    setTutorialScorePoints(_safeGetScore());
  }, []);

  // Load real values from DB after mount — never during render phase
  useEffect(() => {
    setShowWelcome(_safeShowWelcome());
    refreshTutorial();
  }, [refreshTutorial]);

  const startLesson = useCallback((id: LessonId) => {
    const lesson = LESSONS.find((l) => l.id === id);
    if (lesson) setActiveLesson(lesson);
  }, []);

  const dismissLesson = useCallback(() => {
    setActiveLesson(null);
  }, []);

  const dismissWelcome = useCallback(() => {
    markWelcomeShown();
    setShowWelcome(false);
  }, []);

  const onActionCompleted = useCallback((key: string) => {
    const lessonId = completeLessonByKey(key);
    if (lessonId !== null) {
      refreshTutorial();
      // Auto-dismiss overlay if it was showing the just-completed lesson
      setActiveLesson((prev) =>
        prev?.completionKey === key ? null : prev
      );
    }
  }, [refreshTutorial]);

  // ── Value ───────────────────────────────────────────────────────────────────

  const value: TutorialContextValue = {
    activeLesson,
    showWelcome,
    tutorialScorePoints,
    lessonProgress,
    startLesson,
    dismissLesson,
    dismissWelcome,
    onActionCompleted,
    refreshTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error('useTutorial must be used inside <TutorialProvider>');
  }
  return ctx;
}
