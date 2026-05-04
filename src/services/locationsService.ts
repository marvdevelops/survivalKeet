import { getDb } from '../db/database';
import type { SavedLocation } from '../db/schema';

export function getAllLocations(): SavedLocation[] {
  return getDb().getAllSync<SavedLocation>(
    'SELECT * FROM saved_locations ORDER BY created_at DESC'
  );
}

export function saveLocation(
  name: string,
  lat: number,
  lon: number,
  note = ''
): SavedLocation {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO saved_locations (name, lat, lon, note) VALUES (?, ?, ?, ?)',
    name, lat, lon, note
  );
  return db.getFirstSync<SavedLocation>(
    'SELECT * FROM saved_locations WHERE id = ?',
    result.lastInsertRowId
  )!;
}

export function deleteLocation(id: number): void {
  getDb().runSync('DELETE FROM saved_locations WHERE id = ?', id);
}
