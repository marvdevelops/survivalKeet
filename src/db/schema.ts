export type PinType = 'evacuation' | 'hospital' | 'family' | 'highground' | 'custom';
export type POIType = 'hospital' | 'clinic' | 'pharmacy' | 'police' | 'fire_station' | 'assembly_point';

export interface POI {
  osm_id: string;
  type: POIType;
  name: string;
  lat: number;
  lon: number;
}
export type MemberType = 'adult' | 'child' | 'baby' | 'pet';

export interface Pin {
  id: number;
  name: string;
  type: PinType;
  lat: number;
  lon: number;
  note: string;
  created_at: string;
}

export interface Member {
  id: number;
  name: string;
  type: MemberType;
  created_at: string;
  // Added in emergency_v1 migration
  blood_type: string | null;
  allergies: string | null;
  conditions: string | null;
  medications: string | null;
  medical_notes: string | null;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

export interface DmsConfigRow {
  id: 1;
  is_active: number;       // 0 | 1
  interval_hours: number;  // 4 | 6 | 12
  grace_minutes: number;   // 30 | 60
  owner_name: string | null;
  last_checkin_at: string | null;
  activated_at: string | null;
}

export interface EmergencyModeRow {
  id: 1;
  is_active: number;       // 0 | 1
  activated_at: string | null;
}

export interface ChecklistItem {
  id: number;
  member_type: MemberType | 'all';
  category: string;
  label: string;
  notes: string;
}

export interface MemberChecklist {
  id: number;
  member_id: number;
  item_id: number;
  checked: number; // 0 or 1
  updated_at: string;
  expiry_date: string | null;
}

export interface Alert {
  id: number;
  title: string;
  description: string;
  published_at: string;
  source: string;
  cached_at: string;
  // Added in alerts_v2 migration
  alert_type: string | null;
  severity: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
}

export interface SavedLocation {
  id: number;
  name: string;
  lat: number;
  lon: number;
  note: string;
  created_at: string;
}

export interface Guide {
  id: number;
  category: string;
  title: string;
  body: string;
  keywords: string;
}

export interface StoredDocument {
  id: number;
  name: string;
  category: string;
  uri: string;
  created_at: string;
}

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS pins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_type TEXT NOT NULL,
    category TEXT NOT NULL,
    label TEXT NOT NULL,
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS member_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    checked INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
    UNIQUE(member_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    published_at TEXT DEFAULT '',
    source TEXT DEFAULT 'PAGASA',
    cached_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS saved_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    keywords TEXT DEFAULT ''
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS guides_fts USING fts5(
    title,
    body,
    keywords,
    content=guides,
    content_rowid=id
  );

  CREATE TABLE IF NOT EXISTS custom_checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    category TEXT DEFAULT 'Custom',
    label TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    uri TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS poi_cache (
    osm_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    PRIMARY KEY (osm_id, type)
  );

  CREATE TABLE IF NOT EXISTS gdacs_alerts (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    alert_level TEXT NOT NULL,
    country     TEXT NOT NULL,
    latitude    REAL NOT NULL,
    longitude   REAL NOT NULL,
    from_date   TEXT NOT NULL,
    to_date     TEXT NOT NULL,
    url         TEXT NOT NULL,
    is_current  INTEGER NOT NULL DEFAULT 1,
    fetched_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dms_config (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    is_active       INTEGER DEFAULT 0,
    interval_hours  INTEGER DEFAULT 6,
    grace_minutes   INTEGER DEFAULT 30,
    owner_name      TEXT,
    last_checkin_at TEXT,
    activated_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS emergency_mode (
    id           INTEGER PRIMARY KEY CHECK (id = 1),
    is_active    INTEGER DEFAULT 0,
    activated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tutorial_progress (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    lesson_1_done INTEGER DEFAULT 0,
    lesson_2_done INTEGER DEFAULT 0,
    lesson_3_done INTEGER DEFAULT 0,
    lesson_4_done INTEGER DEFAULT 0,
    lesson_5_done INTEGER DEFAULT 0,
    welcome_shown INTEGER DEFAULT 0
  );
`;
