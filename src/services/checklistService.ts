import { getDb } from '../db/database';
import type { ChecklistItem, MemberChecklist } from '../db/schema';

export interface ChecklistRow extends ChecklistItem {
  checked: number;
  mc_id: number;
  expiry_date: string | null;
}

export function getChecklistForMember(memberId: number): ChecklistRow[] {
  return getDb().getAllSync<ChecklistRow>(
    `SELECT ci.*, mc.checked, mc.id as mc_id, mc.expiry_date
     FROM checklist_items ci
     JOIN member_checklist mc ON mc.item_id = ci.id
     WHERE mc.member_id = ?
     ORDER BY ci.category, ci.label`,
    memberId
  );
}

export function toggleItem(mcId: number, checked: boolean): void {
  getDb().runSync(
    `UPDATE member_checklist SET checked = ?, updated_at = datetime('now') WHERE id = ?`,
    checked ? 1 : 0,
    mcId
  );
}

export function getChecklistSummary(memberId: number): { total: number; checked: number } {
  const row = getDb().getFirstSync<{ total: number; checked: number }>(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN mc.checked = 1 THEN 1 ELSE 0 END) as checked
     FROM member_checklist mc
     WHERE mc.member_id = ?`,
    memberId
  );
  return row ?? { total: 0, checked: 0 };
}

export function resetChecklist(memberId: number): void {
  getDb().runSync(
    `UPDATE member_checklist SET checked = 0, updated_at = datetime('now') WHERE member_id = ?`,
    memberId
  );
}

export interface FamilySummary {
  memberId: number;
  memberName: string;
  total: number;
  checked: number;
}

export function getAllMembersSummary(): FamilySummary[] {
  return getDb().getAllSync<FamilySummary>(
    `SELECT m.id as memberId, m.name as memberName,
            (COUNT(mc.id) + COUNT(ci.id)) as total,
            (SUM(CASE WHEN mc.checked = 1 THEN 1 ELSE 0 END) + SUM(CASE WHEN ci.checked = 1 THEN 1 ELSE 0 END)) as checked
     FROM members m
     LEFT JOIN member_checklist mc ON mc.member_id = m.id
     LEFT JOIN custom_checklist_items ci ON ci.member_id = m.id
     GROUP BY m.id
     ORDER BY m.created_at ASC`
  );
}

// ─── Custom checklist items ───────────────────────────────────────────────────

export interface CustomChecklistItem {
  id: number;
  member_id: number;
  category: string;
  label: string;
  checked: number;
  created_at: string;
  expiry_date: string | null;
}

export function getCustomItemsForMember(memberId: number): CustomChecklistItem[] {
  return getDb().getAllSync<CustomChecklistItem>(
    'SELECT * FROM custom_checklist_items WHERE member_id = ? ORDER BY created_at ASC',
    memberId
  );
}

export function addCustomItem(memberId: number, label: string, category = 'Custom'): void {
  // Note: bindings MUST match column order (member_id, category, label).
  getDb().runSync(
    'INSERT INTO custom_checklist_items (member_id, category, label) VALUES (?, ?, ?)',
    memberId, category, label
  );
}

export function toggleCustomItem(id: number, checked: boolean): void {
  getDb().runSync(
    'UPDATE custom_checklist_items SET checked = ? WHERE id = ?',
    checked ? 1 : 0, id
  );
}

export function deleteCustomItem(id: number): void {
  getDb().runSync('DELETE FROM custom_checklist_items WHERE id = ?', id);
}

export function resetCustomItems(memberId: number): void {
  getDb().runSync(
    'UPDATE custom_checklist_items SET checked = 0 WHERE member_id = ?',
    memberId
  );
}
