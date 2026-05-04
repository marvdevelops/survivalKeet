import { getDb } from '../db/database';
import type { Guide } from '../db/schema';

export function getAllGuides(): Guide[] {
  return getDb().getAllSync<Guide>(
    'SELECT * FROM guides ORDER BY category, title'
  );
}

export function getGuidesByCategory(category: string): Guide[] {
  return getDb().getAllSync<Guide>(
    'SELECT * FROM guides WHERE category = ? ORDER BY title',
    category
  );
}

export function getGuide(id: number): Guide | null {
  return getDb().getFirstSync<Guide>('SELECT * FROM guides WHERE id = ?', id) ?? null;
}

export function searchGuides(query: string): Guide[] {
  if (!query.trim()) return getAllGuides();
  const escaped = query.trim().replace(/"/g, '""');
  return getDb().getAllSync<Guide>(
    `SELECT g.* FROM guides g
     JOIN guides_fts fts ON fts.rowid = g.id
     WHERE guides_fts MATCH ?
     ORDER BY rank`,
    `"${escaped}"*`
  );
}

export function getCategories(): string[] {
  const rows = getDb().getAllSync<{ category: string }>(
    'SELECT DISTINCT category FROM guides ORDER BY category'
  );
  return rows.map((r) => r.category);
}
