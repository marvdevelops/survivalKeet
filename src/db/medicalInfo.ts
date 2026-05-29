import { getDb } from './database';
import type { MedicalInfo } from '../types/emergency';

/**
 * Returns the medical info for a member.
 * Always returns a fully-populated object — empty strings for unset fields.
 */
export function getMedicalInfo(memberId: number): MedicalInfo {
  const row = getDb().getFirstSync<{
    blood_type:    string | null;
    allergies:     string | null;
    conditions:    string | null;
    medications:   string | null;
    medical_notes: string | null;
  }>(
    `SELECT blood_type, allergies, conditions, medications, medical_notes
     FROM members WHERE id = ?`,
    memberId
  );

  return {
    member_id:     memberId,
    blood_type:    row?.blood_type    ?? '',
    allergies:     row?.allergies     ?? '',
    conditions:    row?.conditions    ?? '',
    medications:   row?.medications   ?? '',
    medical_notes: row?.medical_notes ?? '',
  };
}

/**
 * Saves medical info for a member.
 * Stores empty strings as NULL to keep the DB clean.
 */
export function saveMedicalInfo(memberId: number, info: Partial<MedicalInfo>): void {
  const db = getDb();
  const set = (col: string, val: string | undefined) => {
    if (val === undefined) return;
    db.runSync(
      `UPDATE members SET ${col} = ? WHERE id = ?`,
      val.trim() || null,
      memberId
    );
  };

  set('blood_type',    info.blood_type);
  set('allergies',     info.allergies);
  set('conditions',    info.conditions);
  set('medications',   info.medications);
  set('medical_notes', info.medical_notes);
}

/**
 * Returns true if at least one medical field is filled for this member.
 */
export function hasMedicalInfo(memberId: number): boolean {
  const info = getMedicalInfo(memberId);
  return !!(
    info.blood_type ||
    info.allergies  ||
    info.conditions ||
    info.medications
  );
}

/**
 * Returns true if ANY member has medical info filled.
 */
export function anyMemberHasMedicalInfo(): boolean {
  const row = getDb().getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM members
     WHERE blood_type IS NOT NULL
        OR allergies IS NOT NULL
        OR conditions IS NOT NULL
        OR medications IS NOT NULL`
  );
  return (row?.count ?? 0) > 0;
}
