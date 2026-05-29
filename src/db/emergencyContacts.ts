import { getDb } from './database';
import type { EmergencyContact } from '../types/emergency';

export function getEmergencyContacts(): EmergencyContact[] {
  return getDb().getAllSync<EmergencyContact>(
    'SELECT * FROM emergency_contacts ORDER BY created_at ASC'
  );
}

export function addEmergencyContact(name: string, phone: string): void {
  getDb().runSync(
    'INSERT INTO emergency_contacts (name, phone) VALUES (?, ?)',
    name,
    phone
  );
}

export function removeEmergencyContact(id: number): void {
  getDb().runSync('DELETE FROM emergency_contacts WHERE id = ?', id);
}

export function getEmergencyContactCount(): number {
  const row = getDb().getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM emergency_contacts'
  );
  return row?.count ?? 0;
}
