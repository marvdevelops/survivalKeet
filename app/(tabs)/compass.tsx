import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { saveLocation, getAllLocations, deleteLocation } from '../../src/services/locationsService';
import type { SavedLocation } from '../../src/db/schema';

const COMPASS_SIZE = 220;
const ROSE_SIZE = 200;
const ROSE_CENTER = ROSE_SIZE / 2; // 100
const LABEL_RADIUS = 78;

const CARDINAL = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function getCardinal(heading: number): string {
  const idx = Math.round(heading / 45) % 8;
  return CARDINAL[idx];
}

function formatCoord(deg: number, isLat: boolean): string {
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : deg >= 0 ? 'E' : 'W';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFull = (abs - d) * 60;
  const m = Math.floor(mFull);
  const s = ((mFull - m) * 60).toFixed(1);
  return `${d}°${m}'${s}"${dir}`;
}

// Returns absolute {left, top} for a label of given size at a radius from ROSE_CENTER
function labelPos(angleDeg: number, halfW = 8, halfH = 10) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: ROSE_CENTER + Math.sin(rad) * LABEL_RADIUS - halfW,
    top: ROSE_CENTER - Math.cos(rad) * LABEL_RADIUS - halfH,
  };
}

export default function CompassScreen() {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const lastHeading = useRef(0);
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState<'high' | 'medium' | 'low'>('low');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [saveModal, setSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNote, setSaveNote] = useState('');
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    loadLocations();
    startCompass();
    startLocation();
    return () => { Magnetometer.removeAllListeners(); };
  }, []);

  function loadLocations() {
    setLocations(getAllLocations());
  }

  function startCompass() {
    Magnetometer.setUpdateInterval(100);
    Magnetometer.addListener(({ x, y }) => {
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      const compassHeading = Math.round((360 - ((angle + 360) % 360)) % 360);
      setHeading(compassHeading);

      const diff = compassHeading - lastHeading.current;
      const shortest = ((diff + 540) % 360) - 180;
      lastHeading.current = lastHeading.current + shortest;

      Animated.timing(rotationAnim, {
        toValue: lastHeading.current,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }

  async function startLocation() {
    // Check permission first — calling requestForegroundPermissionsAsync() when
    // already granted can cause a native crash on new arch. This runs on mount and
    // expo-router eagerly mounts all tabs, so it fires on every app launch.
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      ({ status } = await Location.requestForegroundPermissionsAsync());
    }
    if (status !== 'granted') return;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5 },
      (loc) => {
        setCoords({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        const acc = loc.coords.accuracy ?? 100;
        setAccuracy(acc <= 10 ? 'high' : acc <= 30 ? 'medium' : 'low');
      }
    );
  }

  function handleSaveLocation() {
    if (!coords) {
      Alert.alert('No GPS fix', 'Waiting for location. Try again shortly.');
      return;
    }
    if (!saveName.trim()) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }
    saveLocation(saveName.trim(), coords.lat, coords.lon, saveNote.trim());
    loadLocations();
    setSaveModal(false);
    setSaveName('');
    setSaveNote('');
  }

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const accuracyColor =
    accuracy === 'high' ? colors.success : accuracy === 'medium' ? colors.accent : colors.danger;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Compass</Text>
          <TouchableOpacity onPress={() => setShowSaved(true)} style={styles.savedBtn}>
            <Ionicons name="bookmark" size={18} color={colors.textSecondary} />
            <Text style={styles.savedBtnText}>Saved ({locations.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Compass */}
        <View style={styles.compassSection}>
          {/* Outer container: fixed, non-rotating */}
          <View style={styles.compassOuter}>
            {/* Fixed north pointer at top */}
            <View style={styles.northPointer} />

            {/* Rotating rose */}
            <Animated.View style={[styles.compassRose, { transform: [{ rotate }] }]}>
              {/* Cardinal labels at computed positions */}
              <Text style={[styles.cardinalN, labelPos(0, 7, 9)]}>N</Text>
              <Text style={[styles.cardinalOther, labelPos(90, 5, 9)]}>E</Text>
              <Text style={[styles.cardinalOther, labelPos(180, 5, 9)]}>S</Text>
              <Text style={[styles.cardinalOther, labelPos(270, 8, 9)]}>W</Text>

              {/* Intercardinal (smaller) */}
              <Text style={[styles.cardinalSmall, labelPos(45, 9, 7)]}>NE</Text>
              <Text style={[styles.cardinalSmall, labelPos(135, 7, 7)]}>SE</Text>
              <Text style={[styles.cardinalSmall, labelPos(225, 8, 7)]}>SW</Text>
              <Text style={[styles.cardinalSmall, labelPos(315, 9, 7)]}>NW</Text>

              {/* Arrow: centered at (ROSE_CENTER, ROSE_CENTER) */}
              <View style={styles.arrowWrap}>
                <View style={styles.arrowNorth} />
                <View style={styles.arrowSouth} />
              </View>
            </Animated.View>

            {/* Heading readout — fixed, not rotating */}
            <View style={styles.centerReadout} pointerEvents="none">
              <Text style={styles.headingDeg}>{heading}°</Text>
              <Text style={styles.headingCardinal}>{getCardinal(heading)}</Text>
            </View>
          </View>
        </View>

        {/* Accuracy */}
        <View style={[styles.accuracyBadge, { borderColor: accuracyColor + '50' }]}>
          <View style={[styles.accuracyDot, { backgroundColor: accuracyColor }]} />
          <Text style={[styles.accuracyText, { color: accuracyColor }]}>
            Compass: {accuracy.toUpperCase()}
          </Text>
          {accuracy !== 'high' && (
            <Text style={styles.accuracyHint}>  Wave device in a figure-8 to calibrate</Text>
          )}
        </View>

        {/* Coordinates */}
        <View style={styles.coordsCard}>
          {[
            { label: 'Latitude', value: coords ? formatCoord(coords.lat, true) : '—' },
            { label: 'Longitude', value: coords ? formatCoord(coords.lon, false) : '—' },
            { label: 'Decimal', value: coords ? `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}` : '—' },
          ].map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <View style={styles.coordsSep} />}
              <View style={styles.coordsRow}>
                <Ionicons
                  name="location"
                  size={16}
                  color={coords ? colors.success : colors.textDim}
                />
                <Text style={styles.coordsLabel}>{row.label}</Text>
                <Text style={styles.coordsValue}>{row.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity style={styles.saveBtn} onPress={() => setSaveModal(true)} activeOpacity={0.8}>
          <Ionicons name="bookmark-outline" size={20} color={colors.white} />
          <Text style={styles.saveBtnText}>Save Current Location</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Save location modal */}
      <Modal
        visible={saveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSaveModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setSaveModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Save Location</Text>
            {coords && (
              <Text style={styles.modalCoords}>
                {coords.lat.toFixed(6)}, {coords.lon.toFixed(6)}
              </Text>
            )}
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="e.g. My Home"
              placeholderTextColor={colors.textDim}
              autoFocus
              returnKeyType="next"
            />
            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              style={styles.input}
              value={saveNote}
              onChangeText={setSaveNote}
              placeholder="Additional info..."
              placeholderTextColor={colors.textDim}
              returnKeyType="done"
              onSubmitEditing={handleSaveLocation}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSaveModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveLocation}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Saved locations modal */}
      <Modal
        visible={showSaved}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaved(false)}
      >
        <View style={styles.modalKAV}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowSaved(false)} />
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Locations</Text>
              <TouchableOpacity onPress={() => setShowSaved(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {locations.length === 0 ? (
                <Text style={styles.emptyText}>No saved locations yet.</Text>
              ) : (
                locations.map((loc) => (
                  <View key={loc.id} style={styles.savedRow}>
                    <View style={styles.savedInfo}>
                      <Text style={styles.savedName}>{loc.name}</Text>
                      <Text style={styles.savedCoords}>
                        {loc.lat.toFixed(5)}, {loc.lon.toFixed(5)}
                      </Text>
                      {loc.note ? <Text style={styles.savedNote}>{loc.note}</Text> : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Delete?', loc.name, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete', style: 'destructive',
                            onPress: () => { deleteLocation(loc.id); loadLocations(); },
                          },
                        ]);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ARROW_HALF = 70;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800', letterSpacing: -0.5 },
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedBtnText: { color: colors.textSecondary, fontSize: fontSize.sm },

  compassSection: { alignItems: 'center', marginBottom: spacing.lg },
  compassOuter: {
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  northPointer: {
    position: 'absolute',
    top: 2,
    zIndex: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
  },
  compassRose: {
    width: ROSE_SIZE,
    height: ROSE_SIZE,
    borderRadius: ROSE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardinalN: {
    position: 'absolute',
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  cardinalOther: {
    position: 'absolute',
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cardinalSmall: {
    position: 'absolute',
    color: colors.textDim,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  arrowWrap: {
    position: 'absolute',
    left: ROSE_CENTER - 8,
    top: ROSE_CENTER - ARROW_HALF,
    width: 16,
    alignItems: 'center',
  },
  arrowNorth: {
    width: 0, height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: ARROW_HALF,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.primary,
  },
  arrowSouth: {
    width: 0, height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: ARROW_HALF,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.surfaceElevated,
  },
  centerReadout: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (COMPASS_SIZE - 44) / 2,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  headingDeg: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  headingCardinal: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },

  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    flexWrap: 'wrap',
  },
  accuracyDot: { width: 10, height: 10, borderRadius: 5 },
  accuracyText: { fontSize: fontSize.sm, fontWeight: '700' },
  accuracyHint: { color: colors.textDim, fontSize: fontSize.xs },

  coordsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  coordsLabel: { color: colors.textSecondary, fontSize: fontSize.md, flex: 1 },
  coordsValue: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  coordsSep: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  saveBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  modalCoords: { color: colors.textSecondary, fontSize: fontSize.xs },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.lg,
    padding: spacing.md,
    minHeight: 52,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.md },
  modalBtnSave: { backgroundColor: colors.primary },
  modalBtnSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', paddingVertical: spacing.xl },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  savedInfo: { flex: 1 },
  savedName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  savedCoords: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  savedNote: { color: colors.textDim, fontSize: fontSize.sm, marginTop: 2 },
});
