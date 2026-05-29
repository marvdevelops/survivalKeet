import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { getDmsConfig, saveDmsConfig, setDmsActive, updateLastCheckin } from '../db/dmsConfig';
import { getEmergencyContacts } from '../db/emergencyContacts';
import type { DmsConfig } from '../types/emergency';

// ─── Background task name ─────────────────────────────────────────────────────

export const BACKGROUND_TASK_NAME = 'DMS_CHECKIN_TASK';

// ─── Notification data types ──────────────────────────────────────────────────

/** Tapping a notification with this type will call triggerSmsAlert() in the foreground. */
export const DMS_ALERT_TYPE = 'dms_alert_trigger';

// ─── Notification identifier keys (stored in app_meta) ───────────────────────

const NOTIF_KEY_REMINDER  = 'dms_notif_reminder';
const NOTIF_KEY_DEADLINE  = 'dms_notif_deadline';

// ─── Background task definition ───────────────────────────────────────────────
// Must be defined at module level before any runtime code — Expo requirement.

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const config = getDmsConfig();
    if (!config?.is_active || !config.last_checkin_at) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const lastCheckin = new Date(config.last_checkin_at).getTime();
    const intervalMs  = config.interval_hours  * 60 * 60 * 1000;
    const graceMs     = config.grace_minutes   * 60 * 1000;
    const deadlineMs  = lastCheckin + intervalMs + graceMs;

    if (Date.now() > deadlineMs) {
      // On iOS, SMS.sendSMSAsync() requires a foreground user-interaction context
      // and cannot be called from a background task.  Instead, we fire a high-
      // priority notification; when the user taps it the response listener in
      // _layout.tsx calls triggerSmsAlert() in the foreground.
      await _scheduleAlertTriggerNotification(config.owner_name ?? 'You');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Notification helpers ─────────────────────────────────────────────────────

function _getStoredNotifId(key: string): string | null {
  try {
    const { getDb } = require('../db/database') as { getDb: () => import('expo-sqlite').SQLiteDatabase };
    const row = getDb().getFirstSync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?', key
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function _storeNotifId(key: string, id: string): void {
  try {
    const { getDb } = require('../db/database') as { getDb: () => import('expo-sqlite').SQLiteDatabase };
    const db = getDb();
    db.runSync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      key, id
    );
  } catch { /* ignore */ }
}

function _deleteStoredNotifId(key: string): void {
  try {
    const { getDb } = require('../db/database') as { getDb: () => import('expo-sqlite').SQLiteDatabase };
    getDb().runSync('DELETE FROM app_meta WHERE key = ?', key);
  } catch { /* ignore */ }
}

async function _cancelDmsNotifications(): Promise<void> {
  for (const key of [NOTIF_KEY_REMINDER, NOTIF_KEY_DEADLINE]) {
    const id = _getStoredNotifId(key);
    if (id) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch { /* ignore */ }
      _deleteStoredNotifId(key);
    }
  }
}

async function _scheduleDmsNotifications(config: DmsConfig): Promise<void> {
  await _cancelDmsNotifications();

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const base      = config.last_checkin_at ? new Date(config.last_checkin_at) : new Date();
  const intervalMs = config.interval_hours * 60 * 60 * 1000;
  const graceMs    = config.grace_minutes  * 60 * 1000;

  const reminderDate = new Date(base.getTime() + intervalMs - 5 * 60 * 1000); // 5 min before deadline
  const deadlineDate = new Date(base.getTime() + intervalMs);

  const name = config.owner_name || 'You';

  try {
    if (reminderDate > new Date()) {
      const rid = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ DMS Check-In Reminder',
          body: `${name}, tap to confirm you're safe. Alert sends in ${config.grace_minutes} min.`,
          sound: true,
          data: { type: 'dms_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderDate,
        },
      });
      _storeNotifId(NOTIF_KEY_REMINDER, rid);
    }

    if (deadlineDate > new Date()) {
      const did = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔴 DMS — Final Warning',
          body: `${name}, check in NOW or an alert will be sent to your emergency contacts.`,
          sound: true,
          data: { type: 'dms_deadline' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: deadlineDate,
        },
      });
      _storeNotifId(NOTIF_KEY_DEADLINE, did);
    }
  } catch { /* Notifications are best-effort */ }
}

/**
 * Schedules an immediate "tap to send alert" notification.
 * The notification response listener in _layout.tsx calls triggerSmsAlert()
 * when the user taps, which runs in the foreground where SMS is allowed.
 */
async function _scheduleAlertTriggerNotification(ownerName: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ DMS Alert — Action Required',
        body: `${ownerName} has not checked in. Tap to send emergency SMS to your contacts.`,
        sound: true,
        data: { type: DMS_ALERT_TYPE },
      },
      trigger: null, // fire immediately
    });
  } catch { /* best-effort */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Registers the background fetch task with the OS. Call after DB init. */
export async function registerDmsBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes minimum (OS may run less frequently)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch { /* Fail silently — background fetch is best-effort */ }
}

/** Unregisters the background fetch task. */
async function _unregisterDmsBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    }
  } catch { /* ignore */ }
}

/** Activates DMS with the given config. */
export async function activateDms(config: Partial<DmsConfig>): Promise<void> {
  const now = new Date().toISOString();
  saveDmsConfig({
    ...config,
    is_active:       true,
    last_checkin_at: now,
    activated_at:    now,
  });

  await registerDmsBackgroundTask();

  const saved = getDmsConfig();
  if (saved) {
    await _scheduleDmsNotifications(saved);
  }
}

/** Deactivates DMS — cancels notifications and unregisters background task. */
export async function deactivateDms(): Promise<void> {
  setDmsActive(false);
  await _cancelDmsNotifications();
  await _unregisterDmsBackgroundTask();
}

/**
 * User confirms they are safe.
 * Resets the check-in timer and reschedules notifications.
 */
export async function confirmCheckin(): Promise<void> {
  updateLastCheckin();
  const config = getDmsConfig();
  if (config?.is_active && config) {
    await _scheduleDmsNotifications(config);
  }
}

/**
 * Computes the next check-in deadline as a Date, or null if DMS is inactive.
 */
export function getNextCheckinDate(): Date | null {
  const config = getDmsConfig();
  if (!config?.is_active || !config.last_checkin_at) return null;
  const base = new Date(config.last_checkin_at).getTime();
  return new Date(base + config.interval_hours * 60 * 60 * 1000);
}

/**
 * Opens the SMS composer pre-filled with the alert message and all
 * emergency contacts as recipients.
 * Never throws — all errors are silently swallowed.
 */
export async function triggerSmsAlert(): Promise<void> {
  try {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) return;

    const contacts = getEmergencyContacts();
    if (contacts.length === 0) return;

    const config = getDmsConfig();
    const name = config?.owner_name || 'Someone';

    // Best-effort GPS — use last known to avoid delay.
    // This runs in a background task: never show a permission dialog (check only),
    // and never call getCurrentPositionAsync (it crashes on new arch in background).
    let locationLine = 'Location unavailable';
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getLastKnownPositionAsync();
        if (pos) {
          const { latitude: lat, longitude: lng } = pos.coords;
          locationLine =
            `Last known location: ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
            `View: https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
        }
      }
    } catch { /* location is optional */ }

    const lastCheckin = config?.last_checkin_at
      ? new Date(config.last_checkin_at).toLocaleString()
      : 'Unknown';

    const message =
      `SURVIVEKIT ALERT: ${name} has not checked in.\n` +
      `${locationLine}\n` +
      `Last check-in: ${lastCheckin}\n` +
      `Sent by SurviveKit`;

    const recipients = contacts.map((c) => c.phone);

    await SMS.sendSMSAsync(recipients, message);
  } catch { /* Fail silently — SMS is best-effort */ }
}
