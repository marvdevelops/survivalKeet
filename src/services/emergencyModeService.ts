import { setEmergencyMode } from '../db/emergencyMode';
import { setDmsActive } from '../db/dmsConfig';
import { getEmergencyContactCount } from '../db/emergencyContacts';
import { anyMemberHasMedicalInfo } from '../db/medicalInfo';
import { getAllMembersSummary } from './checklistService';
import { getTutorialScorePoints } from './tutorialService';
import { getDb } from '../db/database';
import type { PreparednessItem } from '../types/emergency';

// ─── Emergency mode ───────────────────────────────────────────────────────────

export async function activateEmergencyMode(): Promise<void> {
  setEmergencyMode(true);
}

export async function deactivateEmergencyMode(): Promise<void> {
  setEmergencyMode(false);
  // Also deactivate DMS if it was running
  setDmsActive(false);
}

// ─── Preparedness score ───────────────────────────────────────────────────────

/**
 * Checks five readiness factors and returns a 0–100 score + item list.
 *
 * Weights (total = 100):
 *   Go-bag packed (≥ 80%)   — 17 pts
 *   Offline map downloaded   — 15 pts
 *   Emergency contacts ≥ 1  — 20 pts
 *   Medical info filled      — 16 pts
 *   Evacuation pin set       — 12 pts
 *   Tutorial completed       — 20 pts (4 pts per lesson, 5 lessons)
 */
export async function getPreparednessScore(): Promise<{
  score: number;
  items: PreparednessItem[];
}> {
  // 1 — Go-bag readiness
  const summaries = getAllMembersSummary();
  const totalItems   = summaries.reduce((s, m) => s + m.total, 0);
  const checkedItems = summaries.reduce((s, m) => s + m.checked, 0);
  const gobagPct = totalItems > 0 ? checkedItems / totalItems : 0;
  const gobagDone = gobagPct >= 0.8;

  // 2 — Emergency contacts
  const contactCount = getEmergencyContactCount();
  const contactsDone = contactCount >= 1;

  // 3 — Medical info for at least one member
  const medicalDone = anyMemberHasMedicalInfo();

  // 4 — Evacuation pin
  const evacPin = getDb().getFirstSync<{ id: number }>(
    "SELECT id FROM pins WHERE type = 'evacuation' LIMIT 1"
  );
  const evacDone = !!evacPin;

  // 5 — Offline map downloaded (flag kept in sync by MapContent.loadPacks)
  const offlineMapFlag = getDb().getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'has_offline_map'"
  );
  const offlineMapDone = !!offlineMapFlag;

  // 6 — Tutorial progress (0–20 pts, 4 per completed lesson)
  const tutorialPts = getTutorialScorePoints();

  const items: PreparednessItem[] = [
    {
      key: 'gobag',
      label: gobagDone
        ? `Go-bag packed (${Math.round(gobagPct * 100)}%)`
        : `Go-bag not ready (${Math.round(gobagPct * 100)}%)`,
      completed: gobagDone,
      route: '/(tabs)/checklist',
    },
    {
      key: 'contacts',
      label: contactsDone
        ? `Emergency contacts added (${contactCount})`
        : 'Emergency contacts missing',
      completed: contactsDone,
      route: '/emergency-contacts',
    },
    {
      key: 'medical',
      label: medicalDone
        ? 'Medical records added'
        : 'Medical info not filled',
      completed: medicalDone,
      route: '/medical-info',
    },
    {
      key: 'evacuation',
      label: evacDone
        ? 'Evacuation point set'
        : 'Evacuation point not set',
      completed: evacDone,
      route: '/(tabs)/map',
    },
    {
      key: 'offlinemap',
      label: offlineMapDone
        ? 'Offline map downloaded'
        : 'Offline map not downloaded',
      completed: offlineMapDone,
      route: '/(tabs)/map?action=download',
    },
    {
      key: 'tutorial',
      label: tutorialPts >= 20
        ? 'Training complete (5/5 lessons)'
        : `Training in progress (${tutorialPts / 4}/5 lessons)`,
      completed: tutorialPts >= 20,
      route: '/(tabs)/index',
    },
  ];

  const WEIGHTS: Record<string, number> = {
    gobag:      17,
    offlinemap: 15,
    contacts:   20,
    medical:    16,
    evacuation: 12,
    tutorial:    0, // tutorial uses its own variable-point system
  };

  const baseScore = items
    .filter((item) => item.key !== 'tutorial')
    .reduce((total, item) => total + (item.completed ? (WEIGHTS[item.key] ?? 0) : 0), 0);

  const score = baseScore + tutorialPts;

  return { score, items };
}
