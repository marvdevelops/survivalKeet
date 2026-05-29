import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { getDb } from '../db/database';
import { BACKEND_URL } from '../config/backend';
import { getDistanceKm } from './geoUtils';

const PROJECT_ID = '245f18b6-67c2-45f6-af1e-c731de04d33a';
const RE_REGISTER_DISTANCE_KM = 5;

interface PushRegistration {
  expo_token: string;
  lat: number;
  lng: number;
  registered_at: string;
}

function getStoredRegistration(): PushRegistration | null {
  try {
    return getDb().getFirstSync<PushRegistration>(
      'SELECT expo_token, lat, lng, registered_at FROM push_registration LIMIT 1'
    );
  } catch {
    return null;
  }
}

function saveRegistration(token: string, lat: number, lng: number): void {
  const db = getDb();
  db.runSync('DELETE FROM push_registration');
  db.runSync(
    'INSERT INTO push_registration (expo_token, lat, lng, registered_at) VALUES (?, ?, ?, ?)',
    token, lat, lng, new Date().toISOString()
  );
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const token = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    return token.data;
  } catch {
    return null;
  }
}

async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    // Check permission status only — never show a dialog from a background service.
    // The Map and Compass screens handle permission requests in the right UX context.
    // getCurrentPositionAsync is intentionally omitted: it causes native crashes on
    // new arch when called outside a user interaction on iOS.
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const last = await Location.getLastKnownPositionAsync();
    if (!last) return null;

    return { lat: last.coords.latitude, lng: last.coords.longitude };
  } catch {
    return null;
  }
}

async function postRegistration(
  token: string,
  lat: number,
  lng: number,
  platform: 'ios' | 'android'
): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expo_token: token, lat, lng, platform }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false; // fail silently if offline
  }
}

/**
 * Registers this device for push notifications.
 * - Skips silently if permissions are denied
 * - Skips silently if offline
 * - Re-registers if the device has moved more than 5 km since last registration
 * Call once from the root layout after DB init.
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (!token) return;

    const location = await getCurrentLocation();
    if (!location) return;

    const { lat, lng } = location;
    const stored = getStoredRegistration();

    // Skip if already registered at this location
    if (stored && stored.expo_token === token) {
      const distance = getDistanceKm(stored.lat, stored.lng, lat, lng);
      if (distance < RE_REGISTER_DISTANCE_KM) return;
    }

    const { Platform } = await import('react-native');
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    const ok = await postRegistration(token, lat, lng, platform);
    if (ok) {
      saveRegistration(token, lat, lng);
      console.log('[push] Registered successfully');
    }
  } catch (e) {
    // Never crash the app over push registration
    console.warn('[push] Registration failed silently:', e instanceof Error ? e.message : String(e));
  }
}
