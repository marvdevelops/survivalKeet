import { getDb } from '../db/database';
import type { StoredDocument } from '../db/schema';

export type { StoredDocument };

export const DOC_CATEGORIES = ['ID', 'Insurance', 'Land Title', 'Medical', 'Vehicle', 'Other'] as const;

export function getAllDocuments(): StoredDocument[] {
  return getDb().getAllSync<StoredDocument>(
    'SELECT * FROM documents ORDER BY created_at DESC'
  );
}

export function addDocument(name: string, category: string, uri: string): void {
  getDb().runSync(
    'INSERT INTO documents (name, category, uri) VALUES (?, ?, ?)',
    name, category, uri
  );
}

export function deleteDocument(id: number): void {
  getDb().runSync('DELETE FROM documents WHERE id = ?', id);
}

export function getDocumentCount(): number {
  const row = getDb().getFirstSync<{ n: number }>('SELECT COUNT(*) as n FROM documents');
  return row?.n ?? 0;
}
