import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEmergency } from '../context/EmergencyContext';
import {
  registerTorchCallback,
  unregisterTorchCallback,
  startFlashlightSos,
  stopFlashlightSos,
  isSosRunning,
  startAudioAlarm,
  stopAudioAlarm,
  isAudioRunning,
} from '../services/sosSignalService';
import { colors, spacing, fontSize, radius } from '../theme';
import { DmsConfigModal } from './modals/DmsConfigModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatActiveSince(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0')
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmergencyModeScreen() {
  const router = useRouter();
  const {
    emergencyActivatedAt,
    deactivateEmergencyMode,
    dmsActive,
    dmsNextCheckin,
    confirmCheckin,
    hasEmergencyContacts,
    reload,
  } = useEmergency();

  // ── Battery ─────────────────────────────────────────────────────────────────

  const [battery, setBattery] = useState<number | null>(null);

  useEffect(() => {
    Battery.getBatteryLevelAsync()
      .then((l) => setBattery(Math.round(l * 100)))
      .catch(() => null);
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBattery(Math.round(batteryLevel * 100));
    });
    return () => sub.remove();
  }, []);

  // ── DMS countdown timer ──────────────────────────────────────────────────────

  const [countdown, setCountdown] = useState('--:--:--');

  useEffect(() => {
    if (!dmsNextCheckin) {
      setCountdown('--:--:--');
      return;
    }
    const tick = () => {
      const diff = new Date(dmsNextCheckin).getTime() - Date.now();
      setCountdown(formatCountdown(diff));
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [dmsNextCheckin]);

  // ── Location ─────────────────────────────────────────────────────────────────

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location access needed',
            'SurviveKit needs location permission to show your coordinates in emergency mode.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]
          );
          return;
        }

        // Poll the cached position instead of watchPositionAsync. The watch sets up a
        // native location-event subscription (a TurboModule "void" method) that crashes
        // on iOS 26 + New Architecture release builds (RN#54859). getLastKnownPositionAsync
        // is a plain promise method, so polling it avoids the crash.
        const pos = await Location.getLastKnownPositionAsync();
        if (pos) {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }

        pollTimer = setInterval(async () => {
          try {
            const p = await Location.getLastKnownPositionAsync();
            if (p) setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          } catch { /* ignore transient location errors */ }
        }, 10000);
      } catch { /* fail silently */ }
    })();

    return () => { if (pollTimer) clearInterval(pollTimer); };
  }, []);

  // ── Torch / SOS flash / audio alarm ─────────────────────────────────────────

  const [torchOn,         setTorchOn]         = useState(false);
  const [sosFlashRunning, setSosFlashRunning] = useState(false);
  const [audioRunning,    setAudioRunning]    = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    registerTorchCallback(setTorchOn);
    setSosFlashRunning(isSosRunning());
    setAudioRunning(isAudioRunning());

    return () => {
      unregisterTorchCallback();
      stopFlashlightSos();
      stopAudioAlarm().catch(() => null);
    };
  }, []);

  const toggleFlashSos = useCallback(async () => {
    if (sosFlashRunning) {
      stopFlashlightSos();
      setSosFlashRunning(false);
      return;
    }
    // The torch is driven through expo-camera, which needs camera permission.
    // Request it here (with a clear reason) only when the user actually starts the
    // SOS flash — never just for entering emergency mode.
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera permission required',
          'SurviveKit uses the camera flash to blink the SOS signal. Enable camera access to use it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }
    startFlashlightSos();
    setSosFlashRunning(true);
  }, [sosFlashRunning, cameraPermission, requestCameraPermission]);

  const toggleAudio = useCallback(async () => {
    if (audioRunning) {
      await stopAudioAlarm();
      setAudioRunning(false);
    } else {
      await startAudioAlarm();
      setAudioRunning(isAudioRunning()); // reflect whether audio actually started
    }
  }, [audioRunning]);

  // ── Header pulsing dot ───────────────────────────────────────────────────────

  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dotAnim]);

  // ── DMS setup modal state ────────────────────────────────────────────────────

  const [dmsSetupModal, setDmsSetupModal] = useState(false);

  // ── Emergency calls modal (avoids tab-switch with no back button on iOS) ─────

  const [emergencyCallsModal, setEmergencyCallsModal] = useState(false);

  // ── Deactivation modal ───────────────────────────────────────────────────────

  const [deactivateModal, setDeactivateModal] = useState(false);

  // ── Countdown urgency colour ─────────────────────────────────────────────────

  const countdownUrgent = countdown.startsWith('00:') && countdown !== '--:--:--';

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Invisible 1×1 CameraView — drives the hardware torch for the SOS flash.
          Mounted only once camera permission is granted, so simply entering
          emergency mode never triggers a camera permission prompt. */}
      {cameraPermission?.granted && (
        <CameraView style={styles.hiddenCamera} enableTorch={torchOn} />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Animated.View style={[styles.headerDot, { opacity: dotAnim }]} />

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>🔴 EMERGENCY MODE</Text>
          <Text style={styles.headerSince}>
            Active since {formatActiveSince(emergencyActivatedAt)}
          </Text>
        </View>

        {battery !== null && (
          <View style={styles.batteryBadge}>
            <Ionicons
              name={battery > 20 ? 'battery-half-outline' : 'battery-dead-outline'}
              size={18}
              color={battery > 20 ? colors.success : colors.danger}
            />
            <Text style={[styles.batteryText, { color: battery > 20 ? colors.success : colors.danger }]}>
              {battery}%
            </Text>
          </View>
        )}
      </View>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Dead Man's Switch Card ───────────────────────────────────────── */}
        <View style={styles.dmsCard}>
          <Text style={styles.dmsSectionLabel}>DEAD MAN'S SWITCH</Text>

          {dmsActive ? (
            /* ── State 1: active — show countdown + check-in ── */
            <>
              <View style={styles.countdownRow}>
                <Text style={styles.countdownLabel}>Check in before</Text>
                <Text style={[
                  styles.countdownTimer,
                  countdownUrgent && styles.countdownTimerUrgent,
                ]}>
                  {countdown}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.checkinBtn}
                onPress={confirmCheckin}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={28} color={colors.white} />
                <Text style={styles.checkinBtnText}>✓  I'M OKAY</Text>
              </TouchableOpacity>
            </>
          ) : hasEmergencyContacts ? (
            /* ── State 2: contacts exist, DMS off — offer setup ── */
            <>
              <Text style={styles.dmsBodyText}>
                Activate the check-in timer. If you stop responding, your emergency contacts will be alerted automatically.
              </Text>
              <TouchableOpacity
                style={styles.activateDmsBtn}
                onPress={() => setDmsSetupModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="timer-outline" size={24} color={colors.white} />
                <Text style={styles.activateDmsBtnText}>ACTIVATE CHECK-IN TIMER</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── State 3: no contacts — show disabled warning ── */
            <>
              <Text style={styles.dmsDisabledTitle}>⚠️  DEAD MAN'S SWITCH DISABLED</Text>
              <Text style={styles.dmsBodyText}>
                Add emergency contacts to enable automatic check-in alerts.
              </Text>
              <TouchableOpacity
                style={styles.addContactBtn}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onPress={() => router.push('/emergency-contacts' as any)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                <Text style={styles.addContactBtnText}>+ Add Emergency Contact</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── 2-column Action Grid ─────────────────────────────────────────── */}
        <View style={styles.grid}>

          {/* MY LOCATION */}
          <View style={styles.gridCard}>
            <Ionicons name="location" size={26} color={colors.primary} />
            <Text style={styles.gridCardTitle}>MY LOCATION</Text>
            {coords ? (
              <>
                <Text selectable style={styles.gridCardCoord}>
                  {coords.lat.toFixed(5)}
                </Text>
                <Text selectable style={styles.gridCardCoord}>
                  {coords.lng.toFixed(5)}
                </Text>
              </>
            ) : (
              <Text style={styles.gridCardSub}>Locating…</Text>
            )}
          </View>

          {/* EMERGENCY CALLS */}
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setEmergencyCallsModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={26} color={colors.danger} />
            <Text style={styles.gridCardTitle}>{'EMERGENCY\nCALLS'}</Text>
            <Text style={styles.gridCardSub}>PH hotlines</Text>
          </TouchableOpacity>

          {/* MEDICAL INFO */}
          <TouchableOpacity
            style={styles.gridCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/medical-info' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="medkit" size={26} color={colors.accent} />
            <Text style={styles.gridCardTitle}>{'MEDICAL\nINFO'}</Text>
            <Text style={styles.gridCardSub}>Blood type, meds</Text>
          </TouchableOpacity>

          {/* FIRST AID GUIDES — pushes to guides tab; guides.tsx shows "Back to Emergency"
              when emergencyMode is active so the user can return without the tab bar */}
          <TouchableOpacity
            style={styles.gridCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push({ pathname: '/(tabs)/guides', params: { search: 'First Aid' } } as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="book" size={26} color={colors.success} />
            <Text style={styles.gridCardTitle}>{'FIRST AID\nGUIDES'}</Text>
            <Text style={styles.gridCardSub}>Offline guides</Text>
          </TouchableOpacity>

          {/* SOS SIGNAL */}
          <View style={styles.gridCard}>
            <Ionicons name="radio" size={26} color={colors.danger} />
            <Text style={styles.gridCardTitle}>SOS SIGNAL</Text>
            <TouchableOpacity
              style={[styles.signalToggle, sosFlashRunning && styles.signalToggleOn]}
              onPress={toggleFlashSos}
              activeOpacity={0.8}
            >
              <Ionicons
                name="flashlight"
                size={16}
                color={sosFlashRunning ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.signalToggleText, sosFlashRunning && styles.signalToggleTextOn]}>
                {sosFlashRunning ? 'FLASH ON' : 'Flash SOS'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.signalToggle, audioRunning && styles.signalToggleOn]}
              onPress={toggleAudio}
              activeOpacity={0.8}
            >
              <Ionicons
                name="volume-high"
                size={16}
                color={audioRunning ? colors.white : colors.textSecondary}
              />
              <Text style={[styles.signalToggleText, audioRunning && styles.signalToggleTextOn]}>
                {audioRunning ? 'ALARM ON' : 'Alarm'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* FAMILY & CONTACTS */}
          <TouchableOpacity
            style={styles.gridCard}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => router.push('/emergency-contacts' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="people" size={26} color="#3498DB" />
            <Text style={styles.gridCardTitle}>{'FAMILY &\nCONTACTS'}</Text>
            <Text style={styles.gridCardSub}>Emergency list</Text>
          </TouchableOpacity>

        </View>

        {/* ── Exit emergency mode ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.exitBtn}
          onPress={() => setDeactivateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.exitBtnText}>EXIT EMERGENCY MODE</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ═══ DMS SETUP MODAL ═══════════════════════════════════════════════════ */}
      <DmsConfigModal
        visible={dmsSetupModal}
        onClose={() => setDmsSetupModal(false)}
        onActivated={() => {
          setDmsSetupModal(false);
          reload().catch(() => null);
        }}
      />

      {/* ═══ DEACTIVATION MODAL ════════════════════════════════════════════════ */}
      <Modal
        visible={deactivateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeactivateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Exit Emergency Mode?</Text>
            <Text style={styles.modalBody}>
              The Dead Man's Switch will be deactivated. Exit only when you are safe.
            </Text>
            <View style={styles.modalActions}>
              {/* Prominent button — harder to exit than enter */}
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnRed, { flex: 2 }]}
                onPress={() => setDeactivateModal(false)}
              >
                <Text style={styles.modalBtnRedText}>Stay in Emergency</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGray]}
                onPress={async () => {
                  setDeactivateModal(false);
                  await deactivateEmergencyMode();
                }}
              >
                <Text style={styles.modalBtnGrayText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ EMERGENCY CALLS MODAL ════════════════════════════════════════════
          Inline instead of tab-push so the back button works on iOS.        */}
      <Modal
        visible={emergencyCallsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEmergencyCallsModal(false)}
      >
        <SafeAreaView style={styles.callsModalSafe} edges={['top', 'bottom']}>
          <View style={styles.callsModalHeader}>
            <TouchableOpacity
              onPress={() => setEmergencyCallsModal(false)}
              style={styles.callsBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
              <Text style={styles.callsBackText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.callsModalTitle}>Emergency Calls</Text>
          </View>

          <ScrollView contentContainerStyle={styles.callsContent} showsVerticalScrollIndicator={false}>
            {EMERGENCY_CALL_BUTTONS.map((btn) => (
              <TouchableOpacity
                key={btn.id}
                style={[styles.callBtn, { borderLeftColor: btn.color }]}
                onPress={() => {
                  const cleaned = btn.number.replace(/[^0-9+]/g, '');
                  Alert.alert(`Call ${btn.label}?`, btn.number, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Call', onPress: () => Linking.openURL(`tel:${cleaned}`) },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.callBtnIcon, { backgroundColor: btn.color + '25' }]}>
                  <Ionicons name={btn.icon} size={26} color={btn.color} />
                </View>
                <View style={styles.callBtnInfo}>
                  <Text style={styles.callBtnLabel}>{btn.label}</Text>
                  <Text style={styles.callBtnDesc}>{btn.description}</Text>
                </View>
                <Text style={[styles.callBtnNumber, { color: btn.color }]}>{btn.number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Emergency call button data ───────────────────────────────────────────────

interface CallButton {
  id: string;
  label: string;
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const EMERGENCY_CALL_BUTTONS: CallButton[] = [
  { id: 'emergency', label: '911 Emergency', number: '911', icon: 'warning', color: '#E74C3C', description: 'All emergencies — Philippines' },
  { id: 'police',   label: 'PNP Police',    number: '117', icon: 'shield', color: '#2980B9', description: 'Philippine National Police' },
  { id: 'fire',     label: 'BFP Fire',      number: '160', icon: 'flame',  color: '#E67E22', description: 'Bureau of Fire Protection' },
  { id: 'ndrrmc',   label: 'NDRRMC',         number: '(02) 8911-1406', icon: 'earth', color: '#8E44AD', description: 'National disaster risk hotline' },
  { id: 'redcross', label: 'Red Cross',      number: '143', icon: 'medkit', color: '#C0392B', description: 'Philippine Red Cross' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const EM_RED   = '#1A0000';
const EM_BORDER = '#3D0000';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0000' },

  // 1×1 invisible camera for hardware torch
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -1,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: EM_RED,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: EM_BORDER,
    minHeight: 64,
  },
  headerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
  },
  headerInfo: { flex: 1 },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSince: {
    color: '#FF666699',
    fontSize: 16,
    marginTop: 2,
  },
  batteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Content ──────────────────────────────────────────────────────────────────
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },

  // ── DMS Card ─────────────────────────────────────────────────────────────────
  dmsCard: {
    backgroundColor: EM_RED,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: EM_BORDER,
    padding: spacing.md,
    gap: spacing.sm,
  },
  dmsSectionLabel: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // State 1 — active
  countdownRow: { gap: 4 },
  countdownLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  countdownTimer: {
    color: colors.text,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  countdownTimerUrgent: { color: colors.danger },
  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  checkinBtnText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // State 2 & 3 — inactive
  dmsBodyText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  activateDmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
  },
  activateDmsBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  dmsDisabledTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 56,
  },
  addContactBtnText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Action Grid ───────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridCard: {
    // 2-column: subtract gap and divide
    width: '48.5%',
    backgroundColor: EM_RED,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: EM_BORDER,
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 110,
  },
  gridCardTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  gridCardCoord: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  gridCardSub: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  // SOS signal mini-toggles inside grid card
  signalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signalToggleOn: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  signalToggleText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  signalToggleTextOn: {
    color: colors.white,
  },

  // ── Exit button ───────────────────────────────────────────────────────────────
  exitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
    padding: spacing.md,
  },
  exitBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Modals (shared) ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  modalBody: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  modalBtnGray: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGrayText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  modalBtnRed: {
    backgroundColor: colors.danger,
  },
  modalBtnRedText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },

  // ── Emergency Calls inline modal ─────────────────────────────────────────────
  callsModalSafe: { flex: 1, backgroundColor: colors.background },
  callsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  callsBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  callsBackText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  callsModalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  callsContent: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    minHeight: 76,
  },
  callBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  callBtnInfo: { flex: 1 },
  callBtnLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  callBtnDesc:  { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  callBtnNumber: { fontSize: 18, fontWeight: '900', flexShrink: 0 },
});

