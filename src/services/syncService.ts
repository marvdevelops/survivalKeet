/**
 * syncService.ts
 *
 * Handles QR-based family data export and import.
 *
 * Payload format (kept compact to fit QR capacity ~2953 bytes):
 * {
 *   v: 1,
 *   p: [{ n, t, la, lo, nt }],           // pins
 *   m: [{                                 // members
 *     n, t,                               // name, type
 *     mc: [{ il, ic, ie }],              // predefined: item label, checked, expiry
 *     ci: [{ l, ic, ie }],              // custom: label, checked, expiry
 *   }]
 * }
 *
 * IDs are never exported — they are local and meaningless on another device.
 * Deduplication on merge uses (pin.name+type+lat+lon) and (member.name+item.label).
 */

import { getDb } from '../db/database';
import type { PinType, MemberType } from '../db/schema';

// ─── Payload types ────────────────────────────────────────────────────────────

interface QRPin {
  n: string;   // name
  t: string;   // type
  la: number;  // lat
  lo: number;  // lon
  nt: string;  // note
}

interface QRMemberChecklist {
  il: string;        // item label (used as key on import)
  ic: number;        // checked 0|1
  ie: string | null; // expiry_date ISO or null
}

interface QRCustomItem {
  l: string;         // label
  ic: number;        // checked 0|1
  ie: string | null; // expiry_date
}

interface QRMember {
  n: string;         // name
  t: string;         // type
  mc: QRMemberChecklist[];
  ci: QRCustomItem[];
}

export interface QRPayload {
  v: 1;
  p: QRPin[];
  m: QRMember[];
}

// Max QR data size for error correction level M (~2335 bytes is safe)
const QR_MAX_BYTES = 2300;

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportToQRString(): { data: string; tooLarge: boolean } {
  const db = getDb();

  const pins = db.getAllSync<{
    name: string; type: string; lat: number; lon: number; note: string;
  }>('SELECT name, type, lat, lon, note FROM pins ORDER BY created_at DESC');

  const members = db.getAllSync<{ id: number; name: string; type: string }>(
    'SELECT id, name, type FROM members ORDER BY created_at ASC'
  );

  const qrMembers: QRMember[] = members.map((m) => {
    const mcRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
      `SELECT ci.label, mc.checked, mc.expiry_date
       FROM member_checklist mc
       JOIN checklist_items ci ON ci.id = mc.item_id
       WHERE mc.member_id = ?`,
      m.id
    );

    const customRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
      `SELECT label, checked, expiry_date
       FROM custom_checklist_items
       WHERE member_id = ?
       ORDER BY created_at ASC`,
      m.id
    );

    return {
      n: m.name,
      t: m.type,
      mc: mcRows.map((r) => ({ il: r.label, ic: r.checked, ie: r.expiry_date })),
      ci: customRows.map((r) => ({ l: r.label, ic: r.checked, ie: r.expiry_date })),
    };
  });

  const payload: QRPayload = {
    v: 1,
    p: pins.map((p) => ({ n: p.name, t: p.type, la: p.lat, lo: p.lon, nt: p.note })),
    m: qrMembers,
  };

  const data = JSON.stringify(payload);
  return { data, tooLarge: data.length > QR_MAX_BYTES };
}

// ─── Validate ─────────────────────────────────────────────────────────────────

const VALID_PIN_TYPES = new Set<string>(['evacuation', 'hospital', 'family', 'highground', 'custom']);
const VALID_MEMBER_TYPES = new Set<string>(['adult', 'child', 'baby', 'pet']);

export function parseQRPayload(raw: string): QRPayload | null {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (obj.v !== 1 || !Array.isArray(obj.p) || !Array.isArray(obj.m)) return null;
    return obj as unknown as QRPayload;
  } catch {
    return null;
  }
}

/**
 * Exports PINS ONLY — used by the map screen Share button.
 * Empty members array so import logic skips member handling automatically.
 */
export function exportPinsToQRString(): { data: string; tooLarge: boolean } {
  const db = getDb();
  const pins = db.getAllSync<{
    name: string; type: string; lat: number; lon: number; note: string;
  }>('SELECT name, type, lat, lon, note FROM pins ORDER BY created_at DESC');

  const payload: QRPayload = {
    v: 1,
    p: pins.map((p) => ({ n: p.name, t: p.type, la: p.lat, lo: p.lon, nt: p.note })),
    m: [],
  };

  const data = JSON.stringify(payload);
  return { data, tooLarge: data.length > QR_MAX_BYTES };
}

/**
 * Exports GO-BAG DATA ONLY (members + checklist) — used by the checklist Share button.
 * Empty pins array so import logic skips pin handling automatically.
 */
export function exportGoBagToQRString(): { data: string; tooLarge: boolean } {
  const db = getDb();

  const members = db.getAllSync<{ id: number; name: string; type: string }>(
    'SELECT id, name, type FROM members ORDER BY created_at ASC'
  );

  const qrMembers: QRMember[] = members.map((m) => {
    const mcRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
      `SELECT ci.label, mc.checked, mc.expiry_date
       FROM member_checklist mc
       JOIN checklist_items ci ON ci.id = mc.item_id
       WHERE mc.member_id = ?`,
      m.id
    );
    const customRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
      `SELECT label, checked, expiry_date
       FROM custom_checklist_items WHERE member_id = ? ORDER BY created_at ASC`,
      m.id
    );
    return {
      n: m.name,
      t: m.type,
      mc: mcRows.map((r) => ({ il: r.label, ic: r.checked, ie: r.expiry_date })),
      ci: customRows.map((r) => ({ l: r.label, ic: r.checked, ie: r.expiry_date })),
    };
  });

  const payload: QRPayload = { v: 1, p: [], m: qrMembers };
  const data = JSON.stringify(payload);
  return { data, tooLarge: data.length > QR_MAX_BYTES };
}

/**
 * Exports a SINGLE MEMBER's go-bag data as a QR string.
 * One member typically uses ~400–700 bytes — comfortably within QR capacity.
 */
export function exportMemberToQRString(memberId: number): { data: string; tooLarge: boolean } {
  const db = getDb();

  const member = db.getFirstSync<{ id: number; name: string; type: string }>(
    'SELECT id, name, type FROM members WHERE id = ?',
    memberId
  );
  if (!member) return { data: '', tooLarge: false };

  const mcRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
    `SELECT ci.label, mc.checked, mc.expiry_date
     FROM member_checklist mc
     JOIN checklist_items ci ON ci.id = mc.item_id
     WHERE mc.member_id = ?`,
    memberId
  );

  const customRows = db.getAllSync<{ label: string; checked: number; expiry_date: string | null }>(
    `SELECT label, checked, expiry_date
     FROM custom_checklist_items WHERE member_id = ? ORDER BY created_at ASC`,
    memberId
  );

  const payload: QRPayload = {
    v: 1,
    p: [],
    m: [{
      n: member.name,
      t: member.type,
      mc: mcRows.map((r) => ({ il: r.label, ic: r.checked, ie: r.expiry_date })),
      ci: customRows.map((r) => ({ l: r.label, ic: r.checked, ie: r.expiry_date })),
    }],
  };

  const data = JSON.stringify(payload);
  return { data, tooLarge: data.length > QR_MAX_BYTES };
}

// ─── Import: Replace ──────────────────────────────────────────────────────────

/**
 * Replaces ALL pins only — used by map screen.
 */
export function importReplacePins(payload: QRPayload): void {
  getDb().runSync('DELETE FROM pins');
  _insertPins(payload.p);
}

/**
 * Replaces ALL members + checklist data only — used by checklist screen.
 * Never touches pins.
 */
export function importReplaceGoBag(payload: QRPayload): void {
  getDb().runSync('DELETE FROM members'); // cascades to member_checklist + custom_checklist_items
  _insertMembers(payload.m);
}

// ─── Import: Merge ────────────────────────────────────────────────────────────

/**
 * Merges PINS ONLY — used by map screen.
 * Deduplicates by (name, type, lat, lon).
 */
export function importMergePins(payload: QRPayload): void {
  _insertPins(payload.p, true);
}

/**
 * Merges GO-BAG DATA ONLY — used by checklist screen.
 * Never touches pins. Deduplicates members by name.
 */
export function importMergeGoBag(payload: QRPayload): void {
  _insertMembers(payload.m, true);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _insertPins(pins: QRPin[], skipDuplicates = false): void {
  const db = getDb();

  for (const p of pins) {
    if (!p.n || !VALID_PIN_TYPES.has(p.t) || typeof p.la !== 'number' || typeof p.lo !== 'number') {
      continue; // skip malformed entries
    }

    if (skipDuplicates) {
      const exists = db.getFirstSync<{ id: number }>(
        `SELECT id FROM pins
         WHERE name = ? AND type = ?
           AND ROUND(lat, 4) = ROUND(?, 4)
           AND ROUND(lon, 4) = ROUND(?, 4)`,
        p.n, p.t, p.la, p.lo
      );
      if (exists) continue;
    }

    db.runSync(
      'INSERT INTO pins (name, type, lat, lon, note) VALUES (?, ?, ?, ?, ?)',
      p.n, p.t as PinType, p.la, p.lo, p.nt ?? ''
    );
  }
}

function _insertMembers(members: QRMember[], skipDuplicates = false): void {
  const db = getDb();

  for (const m of members) {
    if (!m.n || !VALID_MEMBER_TYPES.has(m.t)) continue;

    let memberId: number;

    if (skipDuplicates) {
      const existing = db.getFirstSync<{ id: number }>(
        'SELECT id FROM members WHERE LOWER(name) = LOWER(?)',
        m.n
      );
      if (existing) continue; // skip entire member on merge — don't overwrite their data
      memberId = _createMember(m.n, m.t as MemberType);
    } else {
      memberId = _createMember(m.n, m.t as MemberType);
    }

    // Apply checked state + expiry for predefined items
    for (const mc of m.mc ?? []) {
      if (!mc.il) continue;
      db.runSync(
        `UPDATE member_checklist
         SET checked = ?, expiry_date = ?
         WHERE member_id = ?
           AND item_id = (SELECT id FROM checklist_items WHERE label = ? LIMIT 1)`,
        mc.ic ?? 0,
        mc.ie ?? null,
        memberId,
        mc.il
      );
    }

    // Insert custom items
    for (const ci of m.ci ?? []) {
      if (!ci.l) continue;
      db.runSync(
        `INSERT INTO custom_checklist_items (member_id, label, checked, expiry_date)
         VALUES (?, ?, ?, ?)`,
        memberId, ci.l, ci.ic ?? 0, ci.ie ?? null
      );
    }
  }
}

function _createMember(name: string, type: MemberType): number {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO members (name, type) VALUES (?, ?)',
    name, type
  );
  const memberId = result.lastInsertRowId;
  // Seed predefined checklist items for this member type
  db.runSync(
    `INSERT OR IGNORE INTO member_checklist (member_id, item_id)
     SELECT ?, id FROM checklist_items WHERE member_type = ? OR member_type = 'all'`,
    memberId, type
  );
  return memberId;
}
