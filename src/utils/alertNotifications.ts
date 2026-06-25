import * as Notifications from 'expo-notifications';
import type { GDACSAlert } from '../services/gdacsService';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const TYPE_LABEL: Record<string, string> = {
  TC: 'Typhoon',
  EQ: 'Earthquake',
  FL: 'Flood',
  VO: 'Volcano',
  WF: 'Wildfire',
  DR: 'Drought',
};

export async function notifyGDACSAlert(alert: GDACSAlert): Promise<void> {
  const emoji = alert.alertLevel === 'Red' ? '🔴' : '🟠';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${TYPE_LABEL[alert.type] ?? 'Disaster'} Alert — ${alert.country}`,
      body: alert.title,
      data: { type: 'gdacs_alert', alertId: alert.id },
    },
    trigger: null,
  });
}

export function findNewGDACSAlerts(
  previousIds: Set<string>,
  freshAlerts: GDACSAlert[]
): GDACSAlert[] {
  return freshAlerts.filter((a) => !previousIds.has(a.id));
}
