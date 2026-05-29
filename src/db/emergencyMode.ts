import { getDb } from './database';
import type { EmergencyModeRow } from './schema';
import type { EmergencyModeState } from '../types/emergency';

export function getEmergencyMode(): EmergencyModeState {
  const row = getDb().getFirstSync<EmergencyModeRow>(
    'SELECT * FROM emergency_mode WHERE id = 1'
  );
  if (!row) return { is_active: false, activated_at: null };
  return {
    is_active:    row.is_active === 1,
    activated_at: row.activated_at,
  };
}

export function setEmergencyMode(active: boolean): void {
  const now = active ? new Date().toISOString() : null;
  getDb().runSync(
    `INSERT INTO emergency_mode (id, is_active, activated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       is_active    = excluded.is_active,
       activated_at = excluded.activated_at`,
    active ? 1 : 0,
    now
  );
}
