import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
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

// ─── Component ────────────────────────────────────────────────────────────────

export function SosSignalScreen() {
  const router = useRouter();

  // ── Torch / flash SOS ────────────────────────────────────────────────────────
  const [torchOn,         setTorchOn]         = useState(false);
  const [sosFlashRunning, setSosFlashRunning] = useState(false);
  const [audioRunning,    setAudioRunning]    = useState(false);

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

  const toggleFlash = useCallback(() => {
    if (sosFlashRunning) {
      stopFlashlightSos();
      setSosFlashRunning(false);
    } else {
      startFlashlightSos();
      setSosFlashRunning(true);
    }
  }, [sosFlashRunning]);

  const toggleAudio = useCallback(async () => {
    if (audioRunning) {
      await stopAudioAlarm();
      setAudioRunning(false);
    } else {
      await startAudioAlarm();
      setAudioRunning(isAudioRunning());
    }
  }, [audioRunning]);

  // ── Pulsing "SOS" display ─────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActive  = sosFlashRunning || audioRunning;

  useEffect(() => {
    if (isActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* Invisible 1×1 CameraView — required for hardware torch */}
      <CameraView style={styles.hiddenCamera} enableTorch={torchOn} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SOS Signal</Text>
      </View>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <View style={styles.body}>

        {/* Pulsing SOS letters */}
        <Animated.Text style={[styles.sosBig, { opacity: pulseAnim }]}>
          SOS
        </Animated.Text>
        <Text style={styles.morseLabel}>··· — — — ···</Text>
        <Text style={styles.statusText}>
          {isActive ? 'Signalling — stay visible' : 'Tap a button below to start'}
        </Text>

        {/* Flash SOS */}
        <TouchableOpacity
          style={[styles.signalBtn, sosFlashRunning && styles.signalBtnActive]}
          onPress={toggleFlash}
          activeOpacity={0.85}
        >
          <Ionicons
            name={sosFlashRunning ? 'flashlight' : 'flashlight-outline'}
            size={32}
            color={colors.white}
          />
          <View style={styles.signalBtnInfo}>
            <Text style={styles.signalBtnTitle}>
              {sosFlashRunning ? 'FLASH SOS  —  ON' : 'Flash SOS'}
            </Text>
            <Text style={styles.signalBtnSub}>
              {sosFlashRunning
                ? 'Morse code pattern repeating'
                : 'Morse code ··· — — — ··· on torch'}
            </Text>
          </View>
          <View style={[styles.indicator, sosFlashRunning && styles.indicatorOn]} />
        </TouchableOpacity>

        {/* Audio Alarm */}
        <TouchableOpacity
          style={[styles.signalBtn, audioRunning && styles.signalBtnActive]}
          onPress={toggleAudio}
          activeOpacity={0.85}
        >
          <Ionicons
            name={audioRunning ? 'volume-high' : 'volume-high-outline'}
            size={32}
            color={colors.white}
          />
          <View style={styles.signalBtnInfo}>
            <Text style={styles.signalBtnTitle}>
              {audioRunning ? 'ALARM  —  ON' : 'Audio Alarm'}
            </Text>
            <Text style={styles.signalBtnSub}>
              {audioRunning
                ? 'Alarm sounding continuously'
                : 'Loud alarm, plays in silent mode'}
            </Text>
          </View>
          <View style={[styles.indicator, audioRunning && styles.indicatorOn]} />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Keep screen on. Both signals can run simultaneously. Stop when rescuers have you in sight.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050505' },

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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1A0000',
    gap: spacing.sm,
    minHeight: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosBig: {
    color: colors.danger,
    fontSize: 88,
    fontWeight: '900',
    letterSpacing: 12,
  },
  morseLabel: {
    color: colors.danger + 'AA',
    fontSize: fontSize.xl,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: -spacing.sm,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.md,
  },

  // Signal toggle buttons
  signalBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#1A0000',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#3D0000',
    padding: spacing.md,
    minHeight: 80,
  },
  signalBtnActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  signalBtnInfo: { flex: 1 },
  signalBtnTitle: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  signalBtnSub: {
    color: colors.white + 'AA',
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  indicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.textDim,
  },
  indicatorOn: {
    backgroundColor: colors.white,
  },

  footerNote: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
