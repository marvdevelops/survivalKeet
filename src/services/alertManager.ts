import { isOnline } from '../utils/connectivity';
import { fetchGDACSAlerts, type GDACSAlert } from './gdacsService';
import {
  saveGDACSAlerts,
  getCachedGDACSAlerts,
  saveAlertsLastFetched,
  getAlertsLastFetched,
} from '../db/gdacsAlerts';
import { findNewGDACSAlerts, notifyGDACSAlert } from '../utils/alertNotifications';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export interface AlertsResult {
  alerts: GDACSAlert[];
  source: 'live' | 'cached';
  lastFetched: string | null;
}

export async function refreshAlerts(): Promise<AlertsResult> {
  const lastFetched = getAlertsLastFetched();
  const now = new Date();

  const online = await isOnline();
  const stale =
    !lastFetched ||
    now.getTime() - new Date(lastFetched).getTime() > REFRESH_INTERVAL_MS;

  if (online && stale) {
    // Snapshot previous IDs before overwriting cache
    const previousIds = new Set(getCachedGDACSAlerts().map((a) => a.id));
    const isFirstFetch = previousIds.size === 0;

    const fresh = await fetchGDACSAlerts();
    const ts = now.toISOString();
    saveAlertsLastFetched(ts);

    if (fresh.length > 0) {
      saveGDACSAlerts(fresh);

      // Notify for new alerts — skip on very first fetch (no baseline)
      if (!isFirstFetch) {
        const newAlerts = findNewGDACSAlerts(previousIds, fresh);
        // Cap at 3 notifications per refresh to avoid spamming
        for (const alert of newAlerts.slice(0, 3)) {
          notifyGDACSAlert(alert).catch(() => null);
        }
      }

      return { alerts: fresh, source: 'live', lastFetched: ts };
    }

    // Online but no Red/Orange events — return empty cache
    saveGDACSAlerts([]);
    return { alerts: [], source: 'live', lastFetched: ts };
  }

  const cached = getCachedGDACSAlerts();
  return { alerts: cached, source: 'cached', lastFetched };
}
