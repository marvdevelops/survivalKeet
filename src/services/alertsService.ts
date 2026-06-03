import * as Notifications from 'expo-notifications';
import { getDb } from '../db/database';
import type { Alert } from '../db/schema';

// ─── Incoming push alert payload ─────────────────────────────────────────────

export interface IncomingAlertPayload {
  alertId: string;
  type: string;
  severity: string;
  lat: number;
  lng: number;
  radius_km: number;
  source: string;
  issued_at: string;
  title?: string;
}

/**
 * Saves an alert received via push notification into the local alerts table.
 * Called from the foreground notification listener on the home screen.
 */
export function saveIncomingAlert(payload: IncomingAlertPayload, title: string): void {
  try {
    const db = getDb();
    // Avoid duplicates — skip if this alertId was already saved
    const exists = db.getFirstSync<{ id: number }>(
      "SELECT id FROM alerts WHERE source = ? AND published_at = ?",
      payload.source, payload.issued_at
    );
    if (exists) return;

    db.runSync(
      `INSERT INTO alerts
         (title, description, published_at, source, alert_type, severity, lat, lng, radius_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      title,
      '',
      payload.issued_at,
      payload.source,
      payload.type,
      payload.severity,
      payload.lat,
      payload.lng,
      payload.radius_km
    );
  } catch (e) {
    console.warn('[alerts] saveIncomingAlert failed:', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Returns alerts received in the last 48 hours, newest first.
 */
export function getRecentAlerts(): Alert[] {
  try {
    return getDb().getAllSync<Alert>(
      `SELECT * FROM alerts
       WHERE cached_at >= datetime('now', '-48 hours')
         OR published_at >= datetime('now', '-48 hours')
       ORDER BY cached_at DESC
       LIMIT 20`
    );
  } catch {
    return [];
  }
}

const PAGASA_URLS = [
  'https://pubfiles.pagasa.dost.gov.ph/rss/weather_bulletin.xml',
  'https://pubfiles.pagasa.dost.gov.ph/pagasaweb/files/rss/weather_bulletin.xml',
];

export interface AlertsResult {
  alerts: Alert[];
  error: string | null;
  fromCache: boolean;
}

export function getCachedAlerts(): Alert[] {
  return getDb().getAllSync<Alert>(
    'SELECT * FROM alerts ORDER BY cached_at DESC LIMIT 10'
  );
}

export function getLastUpdated(): string | null {
  const row = getDb().getFirstSync<{ cached_at: string }>(
    'SELECT cached_at FROM alerts ORDER BY cached_at DESC LIMIT 1'
  );
  return row?.cached_at ?? null;
}

export async function fetchAndCacheAlerts(): Promise<AlertsResult> {
  let lastError = '';

  for (const url of PAGASA_URLS) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      });

      if (!response.ok) {
        lastError = `Server returned ${response.status}`;
        continue;
      }

      const xml = await response.text();
      const items = parseRSSItems(xml);

      if (items.length === 0) {
        lastError = 'Feed returned no items';
        continue;
      }

      const db = getDb();
      db.runSync('DELETE FROM alerts');
      for (const item of items) {
        db.runSync(
          `INSERT INTO alerts (title, description, published_at, source) VALUES (?, ?, ?, 'PAGASA')`,
          item.title,
          item.description,
          item.pubDate
        );
      }

      return { alerts: getCachedAlerts(), error: null, fromCache: false };
    } catch (e) {
      lastError = e instanceof Error ? e.message : 'Network error';
    }
  }

  const cached = getCachedAlerts();
  return {
    alerts: cached,
    error: lastError || 'Could not reach PAGASA servers',
    fromCache: true,
  };
}

interface RSSItem {
  title: string;
  description: string;
  pubDate: string;
}

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, 'title') ?? 'PAGASA Bulletin';
    const description = extractTag(block, 'description') ?? '';
    const pubDate = extractTag(block, 'pubDate') ?? new Date().toISOString();
    items.push({ title, description, pubDate });
  }

  return items.slice(0, 10);
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'si');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

// ─── Test alert (diagnostic) ─────────────────────────────────────────────────

/**
 * Fires a local notification that looks like a real incoming calamity push,
 * so the user can verify their notification setup end-to-end (system banner,
 * sound, in-app banner on Home, and saved entry in the alerts table).
 * Requires notification permission; throws if it can't schedule.
 */
export async function sendTestCalamityAlert(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== 'granted') {
      throw new Error('Notification permission denied. Enable notifications in Settings.');
    }
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ TEST — Severe Storm Warning',
      body:
        'This is a TEST calamity alert. A severe thunderstorm is forecast in your area within the hour. Take shelter and stay tuned.',
      sound: true,
      data: {
        alertId: `test_${Date.now()}`,
        type: 'thunderstorm',
        severity: 'high',
        lat: 0,
        lng: 0,
        radius_km: 25,
        source: 'TEST',
        issued_at: new Date().toISOString(),
      },
    },
    trigger: null, // fire immediately
  });
}
