import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AppState, Alert, Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { getEmergencyMode }        from '../db/emergencyMode';
import { getDmsConfig }             from '../db/dmsConfig';
import { getEmergencyContactCount } from '../db/emergencyContacts';
import {
  activateEmergencyMode   as _activate,
  deactivateEmergencyMode as _deactivate,
  getPreparednessScore,
} from '../services/emergencyModeService';
import {
  confirmCheckin        as _confirmCheckin,
  getNextCheckinDate,
  registerDmsBackgroundTask,
} from '../services/dmsService';
import type { PreparednessItem } from '../types/emergency';

// ─── Context shape ────────────────────────────────────────────────────────────

interface EmergencyContextValue {
  /** true while emergency mode is active */
  emergencyMode: boolean;
  /** ISO timestamp when emergency mode was activated, or null */
  emergencyActivatedAt: string | null;
  activateEmergencyMode: () => Promise<void>;
  deactivateEmergencyMode: () => Promise<void>;

  /** true while Dead Man's Switch is active */
  dmsActive: boolean;
  /** ISO timestamp of the next required check-in deadline, or null */
  dmsNextCheckin: string | null;
  confirmCheckin: () => Promise<void>;

  preparednessScore: number;
  preparednessItems: PreparednessItem[];
  refreshPreparedness: () => Promise<void>;

  hasEmergencyContacts: boolean;
  /** Re-reads all state from SQLite — call after editing contacts / medical info */
  reload: () => Promise<void>;

  /** true while the hardware torch is on */
  torchActive: boolean;
  /** Toggle the torch — requests camera permission if not yet granted */
  toggleTorch: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const [emergencyMode,        setEmergencyMode]        = useState(false);
  const [emergencyActivatedAt, setEmergencyActivatedAt] = useState<string | null>(null);
  const [dmsActive,            setDmsActive]            = useState(false);
  const [dmsNextCheckin,       setDmsNextCheckin]       = useState<string | null>(null);
  const [preparednessScore,    setPreparednessScore]    = useState(0);
  const [preparednessItems,    setPreparednessItems]    = useState<PreparednessItem[]>([]);
  const [hasEmergencyContacts, setHasEmergencyContacts] = useState(false);
  const [torchActive,          setTorchActive]          = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  // ── Read all state from SQLite ──────────────────────────────────────────────

  const reload = useCallback(async () => {
    // Emergency mode
    const mode = getEmergencyMode();
    setEmergencyMode(mode.is_active);
    setEmergencyActivatedAt(mode.activated_at);

    // DMS
    const dmsConfig = getDmsConfig();
    setDmsActive(dmsConfig?.is_active ?? false);
    const next = getNextCheckinDate();
    setDmsNextCheckin(next?.toISOString() ?? null);

    // Contacts
    setHasEmergencyContacts(getEmergencyContactCount() > 0);

    // Preparedness score
    const { score, items } = await getPreparednessScore();
    setPreparednessScore(score);
    setPreparednessItems(items);
  }, []);

  // ── Mount ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    reload();
    // Re-register background task on app launch in case it was cleared by OS
    registerDmsBackgroundTask().catch(() => null);
  }, [reload]);

  // Turn off torch when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        setTorchActive(false);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const activateEmergencyMode = useCallback(async () => {
    // Turn off global torch — EmergencyModeScreen owns its own CameraView for SOS
    setTorchActive(false);
    await _activate();
    const mode = getEmergencyMode();
    setEmergencyMode(true);
    setEmergencyActivatedAt(mode.activated_at);
  }, []);

  const deactivateEmergencyMode = useCallback(async () => {
    await _deactivate();
    setEmergencyMode(false);
    setEmergencyActivatedAt(null);
    setDmsActive(false);
    setDmsNextCheckin(null);
  }, []);

  const confirmCheckin = useCallback(async () => {
    await _confirmCheckin();
    const next = getNextCheckinDate();
    setDmsNextCheckin(next?.toISOString() ?? null);
  }, []);

  const toggleTorch = useCallback(async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'SurviveKit needs camera access to use the flashlight.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    setTorchActive((prev) => !prev);
  }, [cameraPermission, requestCameraPermission]);

  const refreshPreparedness = useCallback(async () => {
    const { score, items } = await getPreparednessScore();
    setPreparednessScore(score);
    setPreparednessItems(items);
    setHasEmergencyContacts(getEmergencyContactCount() > 0);
    // Refresh DMS state too since contacts affect DMS availability
    const dmsConfig = getDmsConfig();
    setDmsActive(dmsConfig?.is_active ?? false);
    const next = getNextCheckinDate();
    setDmsNextCheckin(next?.toISOString() ?? null);
  }, []);

  // ── Value ───────────────────────────────────────────────────────────────────

  const value: EmergencyContextValue = {
    emergencyMode,
    emergencyActivatedAt,
    activateEmergencyMode,
    deactivateEmergencyMode,
    dmsActive,
    dmsNextCheckin,
    confirmCheckin,
    preparednessScore,
    preparednessItems,
    refreshPreparedness,
    hasEmergencyContacts,
    reload,
    torchActive,
    toggleTorch,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useEmergency(): EmergencyContextValue {
  const ctx = useContext(EmergencyContext);
  if (!ctx) {
    throw new Error('useEmergency must be used inside <EmergencyProvider>');
  }
  return ctx;
}
