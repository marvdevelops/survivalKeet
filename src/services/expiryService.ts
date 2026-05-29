/**
 * expiryService.ts
 *
 * All expiry-date logic: reading, writing, status classification,
 * and scheduling / cancelling local push notifications.
 *
 * Notification schedule per item:
 *   - 30 days before expiry date
 *   - 7 days before expiry date
 */

import * as Notifications from 'expo-notifications';
import { getDb } from '../db/database';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Which table owns this item */
export type ExpirySource = 'mc' | 'custom';

export type ExpiryStatus = 'ok' | 'expiring_soon' | 'expired';

export interface ExpiringItem {
  source: ExpirySource;
  item_id: number;
  label: string;
  member_name: string;
  expiry_date: string; // ISO YYYY-MM-DD
  status: ExpiryStatus;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD in local time */
export function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** How many days until (positive) or since (negative) the expiry date */
export function daysUntilExpiry(expiryISO: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryISO + 'T00:00:00');
  return Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function getExpiryStatus(expiryISO: string | null): ExpiryStatus {
  if (!expiryISO) return 'ok';
  const days = daysUntilExpiry(expiryISO);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'ok';
}

// ─── DB reads ─────────────────────────────────────────────────────────────────

/**
 * Returns all items (predefined + custom, across all members) that are
 * either expired or expiring within 30 days.
 */
export function getExpiringItems(): ExpiringItem[] {
  const db = getDb();
  const cutoff = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();
  const today = todayISO();

  const mc = db.getAllSync<{ item_id: number; label: string; member_name: string; expiry_date: string }>(
    `SELECT mc.id AS item_id, ci.label, m.name AS member_name, mc.expiry_date
     FROM member_checklist mc
     JOIN checklist_items ci ON ci.id = mc.item_id
     JOIN members m ON m.id = mc.member_id
     WHERE mc.expiry_date IS NOT NULL
       AND mc.expiry_date <= ?
     ORDER BY mc.expiry_date ASC`,
    cutoff
  );

  const custom = db.getAllSync<{ item_id: number; label: string; member_name: string; expiry_date: string }>(
    `SELECT ci.id AS item_id, ci.label, m.name AS member_name, ci.expiry_date
     FROM custom_checklist_items ci
     JOIN members m ON m.id = ci.member_id
     WHERE ci.expiry_date IS NOT NULL
       AND ci.expiry_date <= ?
     ORDER BY ci.expiry_date ASC`,
    cutoff
  );

  const toItem = (source: ExpirySource) =>
    (r: { item_id: number; label: string; member_name: string; expiry_date: string }): ExpiringItem => ({
      source,
      item_id: r.item_id,
      label: r.label,
      member_name: r.member_name,
      expiry_date: r.expiry_date,
      status: r.expiry_date < today ? 'expired' : 'expiring_soon',
    });

  return [...mc.map(toItem('mc')), ...custom.map(toItem('custom'))];
}

/** Returns true if ANY item across all members is expired or expiring within 30 days */
export function hasAnyExpiryWarning(): boolean {
  return getExpiringItems().length > 0;
}

// ─── DB writes ────────────────────────────────────────────────────────────────

export function setMcItemExpiry(mcId: number, expiryDate: string | null): void {
  getDb().runSync(
    `UPDATE member_checklist SET expiry_date = ? WHERE id = ?`,
    expiryDate,
    mcId
  );
}

export function setCustomItemExpiry(itemId: number, expiryDate: string | null): void {
  getDb().runSync(
    `UPDATE custom_checklist_items SET expiry_date = ? WHERE id = ?`,
    expiryDate,
    itemId
  );
}

// ─── Notification helpers ─────────────────────────────────────────────────────

/** Request permission; returns true if granted */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Cancel all scheduled notifications for an item and remove them from DB */
export function cancelItemNotifications(source: ExpirySource, itemId: number): void {
  const db = getDb();
  const rows = db.getAllSync<{ notif_id: string }>(
    'SELECT notif_id FROM item_notifications WHERE source = ? AND item_id = ?',
    source,
    itemId
  );
  for (const row of rows) {
    Notifications.cancelScheduledNotificationAsync(row.notif_id).catch(() => null);
  }
  db.runSync(
    'DELETE FROM item_notifications WHERE source = ? AND item_id = ?',
    source,
    itemId
  );
}

/**
 * Schedule 30-day and 7-day notifications for a given expiry date.
 * Cancels any existing notifications for the item first.
 * No-op if permission not granted or trigger date is in the past.
 */
export async function scheduleExpiryNotifications(
  source: ExpirySource,
  itemId: number,
  label: string,
  memberName: string,
  expiryISO: string
): Promise<void> {
  cancelItemNotifications(source, itemId);

  const permitted = await requestNotificationPermission();
  if (!permitted) return;

  const db = getDb();
  const expiryDate = new Date(expiryISO + 'T08:00:00'); // 8 AM on expiry day

  const triggers: Array<{ days: number; title: string; body: string }> = [
    {
      days: 30,
      title: '⚠️ Go-Bag Item Expiring Soon',
      body: `${memberName}'s ${label} expires in 30 days. Time to replace it.`,
    },
    {
      days: 7,
      title: '🔴 Go-Bag Item Expiring This Week',
      body: `${memberName}'s ${label} expires in 7 days. Replace it now.`,
    },
  ];

  for (const t of triggers) {
    const triggerDate = new Date(expiryDate);
    triggerDate.setDate(triggerDate.getDate() - t.days);

    // Only schedule future notifications
    if (triggerDate <= new Date()) continue;

    try {
      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: t.title,
          body: t.body,
          sound: true,
          data: { source, itemId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      db.runSync(
        'INSERT INTO item_notifications (source, item_id, notif_id, trigger_days) VALUES (?, ?, ?, ?)',
        source,
        itemId,
        notifId,
        t.days
      );
    } catch {
      // Notification scheduling is best-effort; never crash the app
    }
  }
}
