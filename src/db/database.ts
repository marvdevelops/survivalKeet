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

function _runAlertsV2Migration(database: SQLite.SQLiteDatabase): void {
  const done = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'alerts_v2'"
  );
  if (done) return;

  const alertCols = database
    .getAllSync<{ name: string }>('PRAGMA table_info(alerts)')
    .map((r) => r.name);

  if (!alertCols.includes('alert_type')) {
    database.runSync('ALTER TABLE alerts ADD COLUMN alert_type TEXT DEFAULT NULL');
  }
  if (!alertCols.includes('severity')) {
    database.runSync('ALTER TABLE alerts ADD COLUMN severity TEXT DEFAULT NULL');
  }
  if (!alertCols.includes('lat')) {
    database.runSync('ALTER TABLE alerts ADD COLUMN lat REAL DEFAULT NULL');
  }
  if (!alertCols.includes('lng')) {
    database.runSync('ALTER TABLE alerts ADD COLUMN lng REAL DEFAULT NULL');
  }
  if (!alertCols.includes('radius_km')) {
    database.runSync('ALTER TABLE alerts ADD COLUMN radius_km REAL DEFAULT NULL');
  }

  database.execSync(`
    CREATE TABLE IF NOT EXISTS push_registration (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      expo_token   TEXT NOT NULL,
      lat          REAL NOT NULL,
      lng          REAL NOT NULL,
      registered_at TEXT NOT NULL
    );
  `);

  database.runSync("INSERT INTO app_meta (key, value) VALUES ('alerts_v2', '1')");
}

function _runMigrations(database: SQLite.SQLiteDatabase): void {
  // expiry_v1 — add expiry_date to member_checklist and custom_checklist_items,
  // plus item_notifications table to track scheduled push notification IDs.
  const done = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'expiry_v1'"
  );
  if (done) return;

  // ALTER TABLE is safe to call even when column already exists on fresh installs
  // because we gate on the app_meta flag, not on the column.
  const mcCols = database
    .getAllSync<{ name: string }>('PRAGMA table_info(member_checklist)')
    .map((r) => r.name);
  if (!mcCols.includes('expiry_date')) {
    database.runSync(
      'ALTER TABLE member_checklist ADD COLUMN expiry_date TEXT DEFAULT NULL'
    );
  }

  const ciCols = database
    .getAllSync<{ name: string }>('PRAGMA table_info(custom_checklist_items)')
    .map((r) => r.name);
  if (!ciCols.includes('expiry_date')) {
    database.runSync(
      'ALTER TABLE custom_checklist_items ADD COLUMN expiry_date TEXT DEFAULT NULL'
    );
  }

  database.execSync(`
    CREATE TABLE IF NOT EXISTS item_notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      item_id     INTEGER NOT NULL,
      notif_id    TEXT    NOT NULL,
      trigger_days INTEGER NOT NULL
    );
  `);

  database.runSync("INSERT INTO app_meta (key, value) VALUES ('expiry_v1', '1')");
}

function _runEmergencyV1Migration(database: SQLite.SQLiteDatabase): void {
  const done = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'emergency_v1'"
  );
  if (done) return;

  // Add medical columns to existing members table
  const memberCols = database
    .getAllSync<{ name: string }>('PRAGMA table_info(members)')
    .map((r) => r.name);

  const newMemberCols: { name: string; type: string }[] = [
    { name: 'blood_type',    type: 'TEXT' },
    { name: 'allergies',     type: 'TEXT' },
    { name: 'conditions',    type: 'TEXT' },
    { name: 'medications',   type: 'TEXT' },
    { name: 'medical_notes', type: 'TEXT' },
  ];

  for (const col of newMemberCols) {
    if (!memberCols.includes(col.name)) {
      database.runSync(
        `ALTER TABLE members ADD COLUMN ${col.name} ${col.type} DEFAULT NULL`
      );
    }
  }

  // New tables are created via CREATE TABLE IF NOT EXISTS in CREATE_TABLES_SQL,
  // which already ran above in _initOnce. Nothing else to do for them here.

  database.runSync("INSERT INTO app_meta (key, value) VALUES ('emergency_v1', '1')");
}

function _initOnce(database: SQLite.SQLiteDatabase): void {
  database.execSync(CREATE_TABLES_SQL);
  _runMigrations(database);
  _runAlertsV2Migration(database);
  _runEmergencyV1Migration(database);

  const meta = database.getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'seeded'"
  );

  if (!meta) {
    _seedChecklist(database);
    _seedGuides(database);
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('seeded', '1')");
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v2_seeded', '1')");
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v3_seeded', '1')");
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v4_seeded', '1')");
    database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v5_seeded', '1')");
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
        database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v4_seeded', '1')");
      } else {
        const guidesV4 = database.getFirstSync<{ value: string }>(
          "SELECT value FROM app_meta WHERE key = 'guides_v4_seeded'"
        );
        if (!guidesV4) {
          database.runSync('DELETE FROM guides');
          database.runSync('DELETE FROM guides_fts');
          _seedGuides(database);
          database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v4_seeded', '1')");
          database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v5_seeded', '1')");
        } else {
          const guidesV5 = database.getFirstSync<{ value: string }>(
            "SELECT value FROM app_meta WHERE key = 'guides_v5_seeded'"
          );
          if (!guidesV5) {
            database.runSync('DELETE FROM guides');
            database.runSync('DELETE FROM guides_fts');
            _seedGuides(database);
            database.runSync("INSERT INTO app_meta (key, value) VALUES ('guides_v5_seeded', '1')");
          }
        }
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
