import { useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import * as Notifications from 'expo-notifications';
import { initDatabase, getDb } from '../src/db/database';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { EmergencyProvider, useEmergency } from '../src/context/EmergencyContext';
import { TutorialProvider } from '../src/context/TutorialContext';
import { colors } from '../src/theme';
import { registerForPushNotifications } from '../src/services/pushRegistrationService';
import { DMS_ALERT_TYPE, triggerSmsAlert } from '../src/services/dmsService';

// How long the loading screen stays visible at minimum (ms)
const MIN_LOADING_MS = 3000;

// ─── Global torch camera ──────────────────────────────────────────────────────
// Renders an invisible 1×1 CameraView that drives the hardware torch from the
// global torchActive context state.  Not mounted during emergency mode because
// EmergencyModeScreen owns its own CameraView for SOS torch control.

function GlobalTorchCamera() {
  const { torchActive, emergencyMode } = useEmergency();
  if (emergencyMode || !torchActive) return null;
  return (
    <CameraView
      style={styles.hiddenCamera}
      enableTorch={torchActive}
    />
  );
}

function isOnboardingDone(): boolean {
  try {
    const meta = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'onboarding_done'"
    );
    return !!meta;
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const router = useRouter();
  const checked = useRef(false);
  const [ready, setReady] = useState(false);

  // DMS alert-trigger notification response handler
  // When the background task detects a missed check-in on iOS, it schedules a
  // notification instead of opening the SMS composer (which is forbidden from
  // background context).  The user taps the notification → app comes to
  // foreground → this handler calls triggerSmsAlert() with a UI context.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.type === DMS_ALERT_TYPE) {
        triggerSmsAlert().catch(() => null);
      }
    });
    return () => sub.remove();
  }, []);

  // Phase 1 — init DB and show loading screen for MIN_LOADING_MS.
  //
  // initDatabase() is synchronous under the hood (openDatabaseSync + execSync).
  // We fire it immediately so seeding runs as early as possible, then a
  // plain setTimeout guarantees setReady(true) is ALWAYS called after
  // MIN_LOADING_MS (or longer if the JS thread was blocked by seeding).
  // No Promise chains needed — nothing can prevent the timer from firing.
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    // Fire DB init; errors are non-fatal (app degrades gracefully).
    initDatabase().catch((e) => console.error('[DB] init error:', e));

    // Register for push notifications after DB is ready — fire and forget.
    // Fails silently if offline or permissions denied.
    setTimeout(() => { registerForPushNotifications(); }, MIN_LOADING_MS + 500);

    const timer = setTimeout(() => setReady(true), MIN_LOADING_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 2 — once `ready` flips true React re-renders and mounts <Stack>.
  // We defer the redirect by one frame (100ms) so the Stack navigator is
  // fully mounted before router.replace is called.  Calling replace on an
  // unmounted navigator is the root cause of the "stuck on splash" rejection.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      if (!isOnboardingDone()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace('/onboarding' as any);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [ready, router]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" backgroundColor={colors.background} />
      <EmergencyProvider>
        <TutorialProvider>
          <GlobalTorchCamera />
          {ready ? (
            <Stack screenOptions={{ headerShown: false }} />
          ) : (
            <LoadingScreen />
          )}
        </TutorialProvider>
      </EmergencyProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  hiddenCamera: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
