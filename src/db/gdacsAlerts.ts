import { getDb } from './database';
import type { GDACSAlert } from '../services/gdacsService';

interface GDACSRow {
  id: string;
  type: string;
  title: string;
  alert_level: string;
  country: string;
  latitude: number;
  longitude: number;
  from_date: string;
  to_date: string;
  url: string;
  is_current: number;
  fetched_at: string;
}

function rowToAlert(row: GDACSRow): GDACSAlert {
  return {
    id: row.id,
    type: row.type as GDACSAlert['type'],
    title: row.title,
    alertLevel: row.alert_level as GDACSAlert['alertLevel'],
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    fromDate: row.from_date,
    toDate: row.to_date,
    url: row.url,
    isCurrent: row.is_current === 1,
  };
}

export function saveGDACSAlerts(alerts: GDACSAlert[]): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM gdacs_alerts');
    for (const a of alerts) {
      db.runSync(
        `INSERT OR REPLACE INTO gdacs_alerts
           (id, type, title, alert_level, country, latitude, longitude,
            from_date, to_date, url, is_current, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        a.id, a.type, a.title, a.alertLevel, a.country,
        a.latitude, a.longitude, a.fromDate, a.toDate,
        a.url, a.isCurrent ? 1 : 0, now
      );
    }
  });
}

export function getCachedGDACSAlerts(): GDACSAlert[] {
  try {
    const rows = getDb().getAllSync<GDACSRow>(
      'SELECT * FROM gdacs_alerts ORDER BY from_date DESC'
    );
    return rows.map(rowToAlert);
  } catch {
    return [];
  }
}

export function getAlertsLastFetched(): string | null {
  const row = getDb().getFirstSync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = 'gdacs_last_fetched'"
  );
  return row?.value ?? null;
}

export function saveAlertsLastFetched(timestamp: string): void {
  getDb().runSync(
    `INSERT INTO app_meta (key, value) VALUES ('gdacs_last_fetched', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    timestamp
  );
}
