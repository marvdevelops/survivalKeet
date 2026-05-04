import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
} from 'react-native';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import {
  Map,
  Camera,
  UserLocation,
  GeoJSONSource,
  Layer,
  Marker,
  type CameraRef,
  type PressEvent,
} from '@maplibre/maplibre-react-native';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colors, spacing, fontSize, radius } from '../theme';
import { getAllPins, addPin, deletePin } from '../services/pinsService';
import type { Pin, PinType } from '../db/schema';

const PIN_COLORS: Record<PinType, string> = {
  evacuation: '#27AE60',
  hospital: '#3498DB',
  family: '#F39C12',
  highground: '#9B59B6',
  custom: '#E74C3C',
};

const PIN_ICONS: Record<PinType, keyof typeof Ionicons.glyphMap> = {
  evacuation: 'flag',
  hospital: 'medical',
  family: 'home',
  highground: 'triangle',
  custom: 'location',
};

// CartoDB Dark Matter — matches dark theme, much crisper than OSM raster
const BASE_STYLE_SOURCES: StyleSpecification['sources'] = {
  cartodb: {
    type: 'raster',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors © CARTO',
    maxzoom: 19,
  },
  flood: {
    type: 'raster',
    // JRC Global Surface Water — historical water occurrence, proxy for flood risk
    tiles: ['https://storage.googleapis.com/global-surface-water/tiles2021/occurrence/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© EC JRC / Google',
    maxzoom: 13,
  },
};

interface AddPinState {
  visible: boolean;
  lat: number;
  lon: number;
  latText: string;
  lonText: string;
  name: string;
  type: PinType;
  note: string;
}

const DEFAULT_ADD_PIN: AddPinState = {
  visible: false, lat: 0, lon: 0, latText: '', lonText: '', name: '', type: 'evacuation', note: '',
};

export default function MapContent() {
  const cameraRef = useRef<CameraRef>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [pins, setPins] = useState<Pin[]>(() => getAllPins());
  const [addPinState, setAddPinState] = useState<AddPinState>(DEFAULT_ADD_PIN);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [routeTarget, setRouteTarget] = useState<Pin | null>(null);
  const [showOverlays, setShowOverlays] = useState(false);
  const [overlays, setOverlays] = useState({ flood: false });
  const [heading, setHeading] = useState(0);

  // Compass heading from magnetometer
  useEffect(() => {
    let sub: ReturnType<typeof Magnetometer.addListener> | null = null;
    Magnetometer.isAvailableAsync().then((available) => {
      if (!available) return;
      Magnetometer.setUpdateInterval(400);
      sub = Magnetometer.addListener(({ x, y }) => {
        let angle = Math.atan2(y, x) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        setHeading(Math.round((360 - angle) % 360));
      });
    });
    return () => { sub?.remove(); };
  }, []);

  // Build map style dynamically so flood layer toggles without remount
  const mapStyle = useMemo((): StyleSpecification => ({
    version: 8,
    sources: BASE_STYLE_SOURCES,
    layers: [
      { id: 'carto-dark', type: 'raster', source: 'cartodb' },
      ...(overlays.flood ? [{
        id: 'flood-layer',
        type: 'raster' as const,
        source: 'flood',
        paint: { 'raster-opacity': 0.45 },
      }] : []),
    ],
  }), [overlays.flood]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
    setUserLocation(coords);
    // easeTo handles both center + zoom reliably in MapLibre v11
    cameraRef.current?.easeTo({ center: coords, zoom: 15, duration: 600 });
  }

  function handleMapLongPress(event: NativeSyntheticEvent<PressEvent>) {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    setAddPinState({
      ...DEFAULT_ADD_PIN,
      visible: true,
      lat: latitude,
      lon: longitude,
      latText: latitude.toFixed(6),
      lonText: longitude.toFixed(6),
    });
  }

  function handleCoordChange(field: 'latText' | 'lonText', value: string) {
    setAddPinState((s) => {
      const next = { ...s, [field]: value };
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        if (field === 'latText') next.lat = parsed;
        else next.lon = parsed;
      }
      return next;
    });
  }

  function handleSavePin() {
    if (!addPinState.name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this pin.');
      return;
    }
    const lat = parseFloat(addPinState.latText);
    const lon = parseFloat(addPinState.lonText);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Invalid coordinates', 'Please enter valid latitude and longitude.');
      return;
    }
    addPin(addPinState.name.trim(), addPinState.type, lat, lon, addPinState.note.trim());
    setPins(getAllPins());
    setAddPinState(DEFAULT_ADD_PIN);
  }

  function handleDeletePin(pin: Pin) {
    Alert.alert('Delete pin?', pin.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => {
          deletePin(pin.id);
          setPins(getAllPins());
          setSelectedPin(null);
          if (routeTarget?.id === pin.id) setRouteTarget(null);
        },
      },
    ]);
  }

  const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null =
    routeTarget && userLocation
      ? {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [userLocation, [routeTarget.lon, routeTarget.lat]] },
          properties: {},
        }
      : null;

  const compassCardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8];

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={mapStyle}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, right: 8 }}
        onLongPress={handleMapLongPress}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: [121.774, 12.8797], zoom: 6 }}
        />

        {Platform.OS !== 'web' && <UserLocation />}

        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': colors.primary, 'line-width': 3, 'line-dasharray': [4, 3] }}
            />
          </GeoJSONSource>
        )}

        {pins.map((pin) => (
          <Marker
            key={String(pin.id)}
            id={String(pin.id)}
            lngLat={[pin.lon, pin.lat]}
            onPress={() => setSelectedPin(pin)}
          >
            <View style={[styles.pinMarker, { backgroundColor: PIN_COLORS[pin.type] }]}>
              <Ionicons name={PIN_ICONS[pin.type]} size={14} color={colors.white} />
            </View>
          </Marker>
        ))}
      </Map>

      {/* Top bar */}
      <View style={styles.topControls} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Map</Text>
          <Text style={styles.headerSub}>Long-press to add a pin</Text>
        </View>
        <TouchableOpacity style={styles.overlayBtn} onPress={() => setShowOverlays(true)}>
          <Ionicons name="layers" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Compass widget */}
      <View style={styles.compassWidget} pointerEvents="none">
        <Text style={styles.compassHeading}>{heading}°</Text>
        <Text style={styles.compassCardinal}>{compassCardinal}</Text>
      </View>

      {/* Float buttons */}
      <View style={styles.floatButtons} pointerEvents="box-none">
        <TouchableOpacity style={styles.floatBtn} onPress={requestLocation}>
          <Ionicons name="locate" size={22} color={colors.text} />
        </TouchableOpacity>
        {routeTarget && (
          <TouchableOpacity
            style={[styles.floatBtn, { backgroundColor: colors.primary }]}
            onPress={() => setRouteTarget(null)}
          >
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Pin callout */}
      {selectedPin && (
        <View style={styles.callout}>
          <View style={styles.calloutHeader}>
            <View style={[styles.calloutDot, { backgroundColor: PIN_COLORS[selectedPin.type] }]} />
            <Text style={styles.calloutTitle}>{selectedPin.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPin(null)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.calloutType}>{selectedPin.type.toUpperCase()}</Text>
          <Text style={styles.calloutCoords}>{selectedPin.lat.toFixed(5)}, {selectedPin.lon.toFixed(5)}</Text>
          {selectedPin.note ? <Text style={styles.calloutNote}>{selectedPin.note}</Text> : null}
          <View style={styles.calloutActions}>
            <TouchableOpacity
              style={styles.calloutAction}
              onPress={() => { setRouteTarget(selectedPin); setSelectedPin(null); }}
            >
              <Ionicons name="navigate" size={16} color={colors.success} />
              <Text style={[styles.calloutActionText, { color: colors.success }]}>Route</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calloutAction} onPress={() => handleDeletePin(selectedPin)}>
              <Ionicons name="trash" size={16} color={colors.danger} />
              <Text style={[styles.calloutActionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {routeTarget && userLocation && (
        <View style={styles.routeInfo} pointerEvents="none">
          <Ionicons name="navigate" size={14} color={colors.primary} />
          <Text style={styles.routeText}>
            Straight line to: <Text style={{ color: colors.text }}>{routeTarget.name}</Text>
          </Text>
        </View>
      )}

      {/* Add Pin Modal */}
      <Modal
        visible={addPinState.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddPinState(DEFAULT_ADD_PIN)}
      >
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setAddPinState(DEFAULT_ADD_PIN)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Pin</Text>

            {/* Editable coordinates */}
            <View style={styles.coordRow}>
              <View style={styles.coordField}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={addPinState.latText}
                  onChangeText={(v) => handleCoordChange('latText', v)}
                  keyboardType="numbers-and-punctuation"
                  placeholder="0.000000"
                  placeholderTextColor={colors.textDim}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.coordField}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={addPinState.lonText}
                  onChangeText={(v) => handleCoordChange('lonText', v)}
                  keyboardType="numbers-and-punctuation"
                  placeholder="0.000000"
                  placeholderTextColor={colors.textDim}
                  returnKeyType="next"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={addPinState.name}
              onChangeText={(v) => setAddPinState((s) => ({ ...s, name: v }))}
              placeholder="e.g. Barangay Evacuation Center"
              placeholderTextColor={colors.textDim}
              autoFocus
            />

            <Text style={styles.inputLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeRow}>
                {(Object.keys(PIN_COLORS) as PinType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, addPinState.type === t && { backgroundColor: PIN_COLORS[t] }]}
                    onPress={() => setAddPinState((s) => ({ ...s, type: t }))}
                  >
                    <Text style={[styles.typeChipText, addPinState.type === t && { color: colors.white }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={addPinState.note}
              onChangeText={(v) => setAddPinState((s) => ({ ...s, note: v }))}
              placeholder="Any additional info..."
              placeholderTextColor={colors.textDim}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setAddPinState(DEFAULT_ADD_PIN)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSavePin}>
                <Text style={styles.modalBtnSaveText}>Save Pin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Overlays Modal */}
      <Modal
        visible={showOverlays}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverlays(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOverlays(false)}>
          <View style={[styles.modalSheet, { maxHeight: 260 }]}>
            <Text style={styles.modalTitle}>Overlays</Text>
            <TouchableOpacity
              style={styles.overlayRow}
              onPress={() => setOverlays((s) => ({ ...s, flood: !s.flood }))}
            >
              <Ionicons name="water-outline" size={20} color="#1ABC9C" />
              <View style={styles.overlayInfo}>
                <Text style={styles.overlayLabel}>Flood Hazard</Text>
                <Text style={styles.overlaySubLabel}>Historical water occurrence (JRC)</Text>
              </View>
              <View style={[styles.overlayToggle, overlays.flood && { backgroundColor: '#1ABC9C' }]}>
                {overlays.flood && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  topControls: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: spacing.md, paddingTop: spacing.sm,
  },
  header: { backgroundColor: colors.background + 'CC', borderRadius: radius.md, padding: spacing.sm },
  headerTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  headerSub: { color: colors.textSecondary, fontSize: fontSize.xs },
  overlayBtn: {
    backgroundColor: colors.surface + 'EE', borderRadius: radius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  compassWidget: {
    position: 'absolute',
    top: 80,
    right: spacing.md,
    backgroundColor: colors.surface + 'EE',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    minWidth: 52,
  },
  compassHeading: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  compassCardinal: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
  floatButtons: { position: 'absolute', right: spacing.md, bottom: 100, gap: spacing.sm },
  floatBtn: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  pinMarker: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  callout: {
    position: 'absolute', bottom: 80, left: spacing.md, right: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  calloutHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  calloutDot: { width: 10, height: 10, borderRadius: 5 },
  calloutTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', flex: 1 },
  calloutType: { color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 2 },
  calloutCoords: { color: colors.textDim, fontSize: fontSize.xs, marginBottom: spacing.xs },
  calloutNote: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm },
  calloutActions: { flexDirection: 'row', gap: spacing.md },
  calloutAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  calloutActionText: { fontSize: fontSize.sm, fontWeight: '600' },
  routeInfo: {
    position: 'absolute', bottom: 44, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface + 'EE', borderRadius: radius.sm, padding: spacing.sm,
  },
  routeText: { color: colors.textSecondary, fontSize: fontSize.xs },

  // Modals
  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  coordRow: { flexDirection: 'row', gap: spacing.sm },
  coordField: { flex: 1 },
  inputLabel: {
    color: colors.textSecondary, fontSize: fontSize.xs,
    fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
    fontSize: fontSize.md, padding: spacing.md,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  typeChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  typeChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.md },
  modalBtnSave: { backgroundColor: colors.primary },
  modalBtnSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  overlayRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  overlayInfo: { flex: 1 },
  overlayLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  overlaySubLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  overlayToggle: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
