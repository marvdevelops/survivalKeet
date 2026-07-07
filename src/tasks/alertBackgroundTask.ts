import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { refreshAlerts } from '../services/alertManager';

export const GDACS_BACKGROUND_TASK = 'GDACS_ALERT_TASK';

// Must be defined at module level — Expo requirement for background tasks.
TaskManager.defineTask(GDACS_BACKGROUND_TASK, async () => {
  try {
    const result = await refreshAlerts();
    return result.source === 'live'
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerGDACSBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(GDACS_BACKGROUND_TASK);
    if (isRegistered) return;
    await BackgroundFetch.registerTaskAsync(GDACS_BACKGROUND_TASK, {
      minimumInterval: 15 * 60, // 15 min — OS may run less frequently on iOS
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch { /* Background fetch is best-effort */ }
}
