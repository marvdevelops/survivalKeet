import { getDb } from './database';
import type { Member } from './schema';

/** Returns all family members ordered by creation date. */
export function getMembers(): Member[] {
  return getDb().getAllSync<Member>(
    'SELECT id, name, type, created_at, blood_type, allergies, conditions, medications, medical_notes FROM members ORDER BY created_at ASC'
  );
}
