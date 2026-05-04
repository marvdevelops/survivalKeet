import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { CHECKLIST_SEED } from './checklistSeed';
import { GUIDES_SEED } from './guidesSeed';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Returns the singleton database, initializing tables and seed data on the
 * very first call. All subsequent calls return the cached instance instantly.
 *
 * Because initialization is synchronous, any component can call getDb() safely
 * at any point — including inside useState initializers — without a race condition.
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('survivekit.db');
    _initOnce(db);
  }
  return db;
}

/** @deprecated – kept for backwards-compat; now a no-op since getDb() auto-inits */
export async function initDatabase(): Promise<void> {
  getDb();
}

function _initOnce(database: SQLite.SQLiteDatabase): void {
  database.execSync(CREATE_TABLES_SQL);

  const meta = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'seeded'"
  );

  if (!meta) {
    _seedChecklist(database);
    _seedGuides(database);
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('seeded', '1')");
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v2_seeded', '1')");
  } else {
    const guidesV2 = database.getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'guides_v2_seeded'"
    );
    if (!guidesV2) {
      database.runSync('DELETE FROM guides');
      database.runSync('DELETE FROM guides_fts');
      _seedGuides(database);
      database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v2_seeded', '1')");
      database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v3_seeded', '1')");
    } else {
      const guidesV3 = database.getFirstSync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'guides_v3_seeded'"
      );
      if (!guidesV3) {
        database.runSync('DELETE FROM guides');
        database.runSync('DELETE FROM guides_fts');
        _seedGuides(database);
        database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v3_seeded', '1')");
      }
    }
  }
}

function _seedChecklist(database: SQLite.SQLiteDatabase): void {
  for (const item of CHECKLIST_SEED) {
    database.runSync(
      'INSERT INTO checklist_items (member_type, category, label, notes) VALUES (?, ?, ?, ?)',
      item.member_type,
      item.category,
      item.label,
      item.notes ?? ''
    );
  }
}

function _seedGuides(database: SQLite.SQLiteDatabase): void {
  for (const guide of GUIDES_SEED) {
    const result = database.runSync(
      'INSERT INTO guides (category, title, body, keywords) VALUES (?, ?, ?, ?)',
      guide.category,
      guide.title,
      guide.body,
      guide.keywords ?? ''
    );
    database.runSync(
      'INSERT INTO guides_fts (rowid, title, body, keywords) VALUES (?, ?, ?, ?)',
      result.lastInsertRowId,
      guide.title,
      guide.body,
      guide.keywords ?? ''
    );
  }
}
