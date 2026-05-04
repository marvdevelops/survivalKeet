import { getDb } from '../db/database';
import type { Member, MemberType } from '../db/schema';

export function getAllMembers(): Member[] {
  return getDb().getAllSync<Member>('SELECT * FROM members ORDER BY created_at ASC');
}

export function addMember(name: string, type: MemberType): Member {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO members (name, type) VALUES (?, ?)',
    name, type
  );
  // Seed this member's checklist from predefined items
  db.runSync(
    `INSERT OR IGNORE INTO member_checklist (member_id, item_id)
     SELECT ?, id FROM checklist_items WHERE member_type = ? OR member_type = 'all'`,
    result.lastInsertRowId, type
  );
  return db.getFirstSync<Member>('SELECT * FROM members WHERE id = ?', result.lastInsertRowId)!;
}

export function deleteMember(id: number): void {
  getDb().runSync('DELETE FROM members WHERE id = ?', id);
}
