import { getDb } from './database';
import type { DmsConfigRow } from './schema';
import type { DmsConfig } from '../types/emergency';

// ─── Row → typed config ───────────────────────────────────────────────────────

function rowToConfig(row: DmsConfigRow): DmsConfig {
  const hours = row.interval_hours;
  const grace = row.grace_minutes;
  return {
    id: 1,
    is_active: row.is_active === 1,
    interval_hours: (hours === 4 || hours === 6 || hours === 12) ? hours : 6,
    grace_minutes:  (grace === 30 || grace === 60) ? grace : 30,
    owner_name:     row.owner_name ?? '',
    last_checkin_at: row.last_checkin_at,
    activated_at:    row.activated_at,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getDmsConfig(): DmsConfig | null {
  const row = getDb().getFirstSync<DmsConfigRow>(
    'SELECT * FROM dms_config WHERE id = 1'
  );
  return row ? rowToConfig(row) : null;
}

/**
 * Upserts the DMS config row.
 * Reads current values first so callers only need to pass changed fields.
 */
export function saveDmsConfig(config: Partial<DmsConfig>): void {
  const current = getDmsConfig() ?? {
    id: 1 as const,
    is_active: false,
    interval_hours: 6 as const,
    grace_minutes: 30 as const,
    owner_name: '',
    last_checkin_at: null,
    activated_at: null,
  };

  const merged: DmsConfig = { ...current, ...config };

  getDb().runSync(
    `INSERT INTO dms_config
       (id, is_active, interval_hours, grace_minutes, owner_name, last_checkin_at, activated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       is_active       = excluded.is_active,
       interval_hours  = excluded.interval_hours,
       grace_minutes   = excluded.grace_minutes,
       owner_name      = excluded.owner_name,
       last_checkin_at = excluded.last_checkin_at,
       activated_at    = excluded.activated_at`,
    merged.is_active ? 1 : 0,
    merged.interval_hours,
    merged.grace_minutes,
    merged.owner_name || null,
    merged.last_checkin_at,
    merged.activated_at
  );
}

/** Stamps last_checkin_at with the current UTC time. */
export function updateLastCheckin(): void {
  saveDmsConfig({ last_checkin_at: new Date().toISOString() });
}

/** Activates or deactivates the DMS; sets activated_at accordingly. */
export function setDmsActive(active: boolean): void {
  saveDmsConfig({
    is_active: active,
    activated_at: active ? new Date().toISOString() : null,
  });
}
