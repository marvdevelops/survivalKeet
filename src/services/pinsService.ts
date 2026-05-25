import { getDb } from '../db/database';
import type { Pin, PinType } from '../db/schema';

export function getAllPins(): Pin[] {
  return getDb().getAllSync<Pin>('SELECT * FROM pins ORDER BY created_at DESC');
}

export function addPin(
  name: string,
  type: PinType,
  lat: number,
  lon: number,
  note = ''
): Pin {
  const db = getDb();
  const result = db.runSync(
    'INSERT INTO pins (name, type, lat, lon, note) VALUES (?, ?, ?, ?, ?)',
    name, type, lat, lon, note
  );
  return db.getFirstSync<Pin>('SELECT * FROM pins WHERE id = ?', result.lastInsertRowId)!;
}

export function updatePin(
  id: number,
  name: string,
  type: PinType,
  note: string
): void {
  getDb().runSync(
    'UPDATE pins SET name = ?, type = ?, note = ? WHERE id = ?',
    name, type, note, id
  );
}

export function movePinLocation(id: number, lat: number, lon: number): void {
  getDb().runSync('UPDATE pins SET lat = ?, lon = ? WHERE id = ?', lat, lon, id);
}

export function deletePin(id: number): void {
  getDb().runSync('DELETE FROM pins WHERE id = ?', id);
}
