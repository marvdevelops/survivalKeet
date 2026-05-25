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
}

export interface Alert {
  id: number;
  title: string;
  description: string;
  published_at: string;
  source: string;
  cached_at: string;
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

  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
