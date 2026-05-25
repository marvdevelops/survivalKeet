import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  Platform,
  Keyboard,
  NativeSyntheticEvent,
  ActivityIndicator,
} from 'react-native';
import { File, Paths } from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  OfflineManager,
  OfflinePack,
  type CameraRef,
  type PressEvent,
  type OfflinePackStatus,
} from '@maplibre/maplibre-react-native';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colors, spacing, fontSize, radius } from '../theme';
import { getAllPins, addPin, deletePin, movePinLocation } from '../services/pinsService';
import type { Pin, PinType } from '../db/schema';
import {
  getCachedPOIs,
  fetchAndCachePOIs,
  isPOICacheStale,
  clearPOICache,
  POI_COLORS,
  type POI,
  type POIType,
} from '../services/poiService';
import { getDb } from '../db/database';

const PIN_COLORS: Record<PinType, string> = {
  evacuation: '#27AE60',
  hospital:   '#3498DB',
  family:     '#F39C12',
  highground: '#9B59B6',
  custom:     '#E74C3C',
};

const PIN_ICONS: Record<PinType, keyof typeof Ionicons.glyphMap> = {
  evacuation: 'flag',
  hospital:   'medical',
  family:     'home',
  highground: 'triangle',
  custom:     'location',
};

const POI_IONICONS: Record<POIType, keyof typeof Ionicons.glyphMap> = {
  hospital:       'medical',
  clinic:         'fitness',
  pharmacy:       'flask',
  police:         'shield-checkmark',
  fire_station:   'flame',
  assembly_point: 'flag',
};

type MapMode = 'standard' | 'satellite';

const ALL_POI_TYPES: POIType[] = ['hospital', 'clinic', 'pharmacy', 'police', 'fire_station'];

const POI_TYPE_LABELS: Record<POIType, string> = {
  hospital:       'Hospital',
  clinic:         'Clinic',
  pharmacy:       'Pharmacy',
  police:         'Police',
  fire_station:   'Fire Stn',
  assembly_point: 'Assembly',
};

// Raster style that exactly matches what the Map component renders.
// Written to a temp file so OfflineManager downloads the correct tile URLs.
// (The CartoDB GL vector style URL would download vector tiles that the
//  raster map never requests — making the offline pack useless.)
const OFFLINE_RASTER_STYLE = JSON.stringify({
  version: 8,
  sources: {
    cartodb: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'base', type: 'raster', source: 'cartodb' }],
});

// Write the raster style JSON to a local file so MapLibre can use its
// file:// URI as the style URL for offline pack creation.
function getOfflineStyleUri(): string {
  const file = new File(Paths.cache, 'map_offline_style.json');
  file.write(OFFLINE_RASTER_STYLE);
  return file.uri;
}

const ALL_SOURCES: StyleSpecification['sources'] = {
  cartodb: {
    type: 'raster',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    ],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors © CARTO',
    maxzoom: 19,
  },
  esri_sat: {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxzoom: 19,
  },
  esri_labels: {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    maxzoom: 19,
  },
  esri_relief: {
    type: 'raster',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256,
    attribution: '© Esri',
    maxzoom: 13,
  },
  flood: {
    type: 'raster',
    tiles: ['https://storage.googleapis.com/global-surface-water/tiles2021/occurrence/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© EC JRC / Google',
    maxzoom: 13,
  },
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface StagingPin {
  lat: number;
  lon: number;
  name: string;
  type: PinType;
}

function getLastKnownLocation(): [number, number] | null {
  try {
    const lat = getDb().getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'last_lat'");
    const lon = getDb().getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'last_lon'");
    if (lat && lon) return [parseFloat(lon.value), parseFloat(lat.value)];
    return null;
  } catch { return null; }
}

function saveLastKnownLocation(lat: number, lon: number) {
  try {
    const db = getDb();
    db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('last_lat', ?)", String(lat));
    db.runSync("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('last_lon', ?)", String(lon));
  } catch {}
}

function isAutoDownloadPending(): boolean {
  try {
    const meta = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'auto_download_pending'"
    );
    return !!meta;
  } catch { return false; }
}

function clearAutoDownloadPending() {
  try {
    getDb().runSync("DELETE FROM app_meta WHERE key = 'auto_download_pending'");
  } catch {}
}

export default function MapContent() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);
  const hasFlown = useRef(false);
  const initialLocation = useRef(getLastKnownLocation());
  // Prevents map onPress from firing when a marker is tapped (MapLibre propagates both)
  const markerPressGuard = useRef(false);
  // Holds the active location subscription so we can clean up on unmount
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [pins, setPins] = useState<Pin[]>(() => getAllPins());
  const [stagingPin, setStagingPin] = useState<StagingPin | null>(null);
  const [movingPin, setMovingPin] = useState<Pin | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [routeTarget, setRouteTarget] = useState<Pin | null>(null);
  const [showOverlays, setShowOverlays] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const [overlays, setOverlays] = useState({ elevation: false, flood: false, pois: true });
  const [heading, setHeading] = useState(0);
  const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number | null; isRoad: boolean } | null>(null);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking'>('driving');

  // POIs
  const [pois, setPois] = useState<POI[]>([]);
  const [poisLoading, setPoisLoading] = useState(false);
  const [poisError, setPoisError] = useState<string | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [poiTypeFilter, setPoiTypeFilter] = useState<Set<POIType>>(new Set(ALL_POI_TYPES));
  const [showPoiFilter, setShowPoiFilter] = useState(false);

  const filteredPois = useMemo(
    () => pois.filter((p) => poiTypeFilter.has(p.type)),
    [pois, poiTypeFilter],
  );

  // Offline packs
  const [showDownload, setShowDownload] = useState(false);
  const [dlSize, setDlSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [dlActive, setDlActive] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [offlinePacks, setOfflinePacks] = useState<OfflinePack[]>([]);

  // Track keyboard height for staging bar
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  const mapStyle = useMemo((): StyleSpecification => {
    const layers: StyleSpecification['layers'] = [];
    if (mapMode === 'satellite') {
      layers.push({ id: 'sat-base', type: 'raster', source: 'esri_sat' });
      layers.push({ id: 'sat-labels', type: 'raster', source: 'esri_labels' });
    } else {
      layers.push({ id: 'standard', type: 'raster', source: 'cartodb' });
    }
    if (overlays.elevation) {
      layers.push({ id: 'relief', type: 'raster', source: 'esri_relief', paint: { 'raster-opacity': mapMode === 'satellite' ? 0.3 : 0.4 } });
    }
    if (overlays.flood) {
      layers.push({ id: 'flood-layer', type: 'raster', source: 'flood', paint: { 'raster-opacity': 0.45 } });
    }
    return { version: 8, sources: ALL_SOURCES, layers };
  }, [mapMode, overlays.elevation, overlays.flood]);

  // Fly to user's location on first fix
  useEffect(() => {
    if (userLocation && !hasFlown.current) {
      hasFlown.current = true;
      cameraRef.current?.easeTo({ center: userLocation, zoom: 14, duration: 600 });
    }
  }, [userLocation]);

  async function requestLocation(): Promise<[number, number] | undefined> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    // Step 1: use cached position instantly — works offline with no GPS warm-up
    const last = await Location.getLastKnownPositionAsync();
    let initialCoords: [number, number] | undefined;
    if (last) {
      initialCoords = [last.coords.longitude, last.coords.latitude];
      setUserLocation(initialCoords);
      saveLastKnownLocation(last.coords.latitude, last.coords.longitude);
    }

    // Step 2: start a continuous GPS watch.
    // watchPositionAsync delivers fixes as the GPS chip locks in — works fully
    // offline. Unlike getCurrentPositionAsync with Balanced accuracy, it never
    // hangs waiting for a network-assisted fix that will never arrive.
    locationWatchRef.current?.remove();
    locationWatchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 4000,      // at most every 4 s
        distanceInterval: 10,    // or every 10 m moved
      },
      (loc) => {
        const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
        setUserLocation(coords);
        saveLastKnownLocation(loc.coords.latitude, loc.coords.longitude);
      },
    );

    return initialCoords;
  }

  // Stop tracking when the map unmounts to avoid a memory / battery leak
  useEffect(() => () => { locationWatchRef.current?.remove(); }, []);

  function flyToUser() {
    if (userLocation) {
      cameraRef.current?.easeTo({ center: userLocation, zoom: 15, duration: 500 });
    } else {
      requestLocation();
    }
  }

  // Auto-fly on first mount; also handle auto-download if pending
  useEffect(() => {
    (async () => {
      const coords = await requestLocation();
      if (coords && isAutoDownloadPending()) {
        clearAutoDownloadPending();
        const [lng, lat] = coords;
        triggerAutoDownload(lng, lat);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // POI loading: fires when location becomes available, regardless of overlay toggle
  useEffect(() => {
    const cached = getCachedPOIs();

    // Always render cached POIs immediately — no waiting for the network
    if (cached.length > 0) setPois(cached);

    if (!userLocation) return;

    // Cache is fresh — nothing more to do
    if (cached.length > 0 && !isPOICacheStale(userLocation[1], userLocation[0])) return;

    // Cache is stale (or empty) — fetch fresh POIs in the background.
    // If we're offline the request will fail quickly; we keep showing the
    // cached data silently rather than flashing an error the user can't act on.
    setPoisLoading(true);
    setPoisError(null);
    fetchAndCachePOIs(userLocation[1], userLocation[0])
      .then((fresh) => { setPois(fresh); })
      .catch((e: Error) => {
        if (cached.length > 0) {
          // Offline with stale cache — keep showing what we have, no error banner
          setPois(cached);
        } else {
          // Truly nothing to show
          setPoisError(`POIs unavailable: ${e.message}`);
        }
      })
      .finally(() => setPoisLoading(false));
  // Only re-run when location changes (not on overlay toggle)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation]);

  // ── Offline pack helpers ─────────────────────────────────────────────────
  async function loadPacks() {
    try {
      const packs = await OfflineManager.getPacks();
      setOfflinePacks(packs);
    } catch {}
  }

  useEffect(() => { loadPacks(); }, []);

  async function triggerAutoDownload(lng: number, lat: number) {
    const d = 1.2; // ~120 km radius in degrees
    const packName = `auto_${Date.now()}`;
    setDlActive(true);
    setDlProgress(0);
    try {
      const styleUri = getOfflineStyleUri();
      await OfflineManager.createPack(
        { mapStyle: styleUri,
          bounds: [lng - d, lat - d, lng + d, lat + d],
          minZoom: 5, maxZoom: 12,
          metadata: { name: packName, size: 'large', auto: true, createdAt: new Date().toISOString() } },
        (_pack: OfflinePack, status: OfflinePackStatus) => {
          setDlProgress(Math.round(status.percentage ?? 0));
          if (status.state === 'complete' || status.percentage >= 100) {
            setDlActive(false);
            loadPacks();
          }
        },
        (_pack: OfflinePack, error: { message: string }) => {
          setDlActive(false);
          console.warn('Auto-download failed:', error.message);
        }
      );
    } catch (e) {
      setDlActive(false);
      console.warn('Auto-download createPack error:', e);
    }
  }

  async function startDownload() {
    if (!userLocation) {
      Alert.alert('Location needed', 'Enable location to download your area.');
      return;
    }
    const [lng, lat] = userLocation;
    const deltas: Record<typeof dlSize, number> = { small: 0.05, medium: 0.25, large: 1.2 };
    const zooms: Record<typeof dlSize, [number, number]> = { small: [11,15], medium: [8,14], large: [5,12] };
    const d = deltas[dlSize];
    const [minZoom, maxZoom] = zooms[dlSize];
    const packName = `area_${Date.now()}`;
    setDlActive(true);
    setDlProgress(0);
    try {
      const styleUri = getOfflineStyleUri();
      await OfflineManager.createPack(
        { mapStyle: styleUri,
          bounds: [lng - d, lat - d, lng + d, lat + d],
          minZoom, maxZoom,
          metadata: { name: packName, createdAt: new Date().toISOString(), size: dlSize } },
        (_pack: OfflinePack, status: OfflinePackStatus) => {
          setDlProgress(Math.round(status.percentage ?? 0));
          if (status.state === 'complete' || status.percentage >= 100) {
            setDlActive(false);
            setShowDownload(false);
            loadPacks();
            Alert.alert('Download complete', 'Map tiles saved for offline use.');
          }
        },
        (_pack: OfflinePack, error: { message: string }) => {
          setDlActive(false);
          Alert.alert('Download failed', error.message);
        }
      );
    } catch (e: unknown) {
      setDlActive(false);
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Unknown error');
    }
  }

  async function deletePack(pack: OfflinePack) {
    Alert.alert('Delete saved map?', 'This will remove the offline tiles.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await OfflineManager.deletePack(pack.id);
            loadPacks();
          } catch {}
        },
      },
    ]);
  }

  const fetchRoute = useCallback(async (
    target: Pin,
    mode: 'driving' | 'walking',
    origin: [number, number],
  ) => {
    setRouteLoading(true);
    setRouteGeoJSON(null);
    setRouteInfo(null);
    try {
      const url =
        `https://router.project-osrm.org/route/v1/${mode}/` +
        `${origin[0]},${origin[1]};${target.lon},${target.lat}` +
        `?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`OSRM ${res.status}`);
      const json = await res.json();
      const route = json.routes?.[0];
      if (!route?.geometry) throw new Error('No route geometry');
      setRouteGeoJSON({ type: 'Feature', geometry: route.geometry, properties: {} });
      setRouteInfo({ distanceKm: route.distance / 1000, durationMin: Math.round(route.duration / 60), isRoad: true });
    } catch {
      setRouteGeoJSON({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [origin, [target.lon, target.lat]] },
        properties: {},
      });
      setRouteInfo({ distanceKm: haversineKm(origin[1], origin[0], target.lat, target.lon), durationMin: null, isRoad: false });
    } finally {
      setRouteLoading(false);
    }
  }, []);

  function startRoute(target: Pin, mode: 'driving' | 'walking') {
    if (!userLocation) { Alert.alert('Location needed', 'Enable location to get directions.'); return; }
    setRouteTarget(target);
    fetchRoute(target, mode, userLocation);
    setSelectedPin(null);
  }

  function clearRoute() { setRouteTarget(null); setRouteGeoJSON(null); setRouteInfo(null); }

  function openPOIDirections(lat: number, lon: number, name: string) {
    const wazeUrl = `waze://ul?ll=${lat},${lon}&navigate=yes`;
    const googleUrl = Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${lat},${lon}&directionsmode=driving`
      : `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`;
    const googleFallback = `https://maps.google.com/?daddr=${lat},${lon}`;
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${lat},${lon}`;

    const buttons: Parameters<typeof Alert.alert>[2] = [
      {
        text: 'Waze',
        onPress: async () => {
          const ok = await Linking.canOpenURL(wazeUrl);
          await Linking.openURL(ok ? wazeUrl : `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`);
        },
      },
      {
        text: 'Google Maps',
        onPress: async () => {
          const ok = await Linking.canOpenURL(googleUrl);
          await Linking.openURL(ok ? googleUrl : googleFallback);
        },
      },
    ];
    if (Platform.OS === 'ios') {
      buttons.push({
        text: 'Apple Maps',
        onPress: () => Linking.openURL(appleMapsUrl),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Get Directions', name, buttons);
  }

  function handleMapPress(event: NativeSyntheticEvent<PressEvent>) {
    // Marker onPress also bubbles to Map onPress — skip if a marker was just tapped
    if (markerPressGuard.current) {
      markerPressGuard.current = false;
      return;
    }
    const [longitude, latitude] = event.nativeEvent.lngLat;
    if (stagingPin) {
      setStagingPin((p) => p ? { ...p, lat: latitude, lon: longitude } : null);
      return;
    }
    if (movingPin) {
      movePinLocation(movingPin.id, latitude, longitude);
      setPins(getAllPins());
      setMovingPin(null);
      return;
    }
    setSelectedPin(null);
    setSelectedPOI(null);
    setStagingPin({ lat: latitude, lon: longitude, name: '', type: 'evacuation' });
  }

  function handleSaveStagingPin() {
    if (!stagingPin) return;
    if (!stagingPin.name.trim()) { Alert.alert('Name required', 'Enter a name for this pin.'); return; }
    addPin(stagingPin.name.trim(), stagingPin.type, stagingPin.lat, stagingPin.lon, '');
    setPins(getAllPins());
    setStagingPin(null);
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

  const compassCardinal = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8];

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={mapStyle}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, right: 8 }}
        onPress={handleMapPress}
      >
        <Camera
          ref={cameraRef}
          initialViewState={initialLocation.current
            ? { center: initialLocation.current, zoom: 13 }
            : { center: [0, 20], zoom: 1.5 }}
        />
        {Platform.OS !== 'web' && <UserLocation />}

        {routeGeoJSON && (
          <GeoJSONSource id="route" data={routeGeoJSON}>
            <Layer id="route-casing" type="line"
              paint={{ 'line-color': '#ffffff', 'line-width': 9, 'line-opacity': 0.8,
                'line-cap': 'round', 'line-join': 'round' } as any} />
            <Layer id="route-fill" type="line"
              paint={{ 'line-color': '#4285F4', 'line-width': 5,
                'line-cap': 'round', 'line-join': 'round' } as any} />
          </GeoJSONSource>
        )}

        {/* User pins */}
        {pins.map((pin) => (
          <Marker
            key={String(pin.id)}
            id={String(pin.id)}
            lngLat={[pin.lon, pin.lat]}
            onPress={() => {
              markerPressGuard.current = true;
              setSelectedPin(pin);
              setStagingPin(null);
              setMovingPin(null);
            }}
          >
            <View style={[
              styles.pinMarker,
              { backgroundColor: movingPin?.id === pin.id ? colors.accent : PIN_COLORS[pin.type] },
            ]}>
              <Ionicons
                name={movingPin?.id === pin.id ? 'move' : PIN_ICONS[pin.type]}
                size={14}
                color={colors.white}
              />
            </View>
          </Marker>
        ))}

        {/* Staging pin — tap map to reposition */}
        {stagingPin && (
          <Marker
            id="staging"
            lngLat={[stagingPin.lon, stagingPin.lat]}
          >
            <View style={styles.stagingPinMarker}>
              <Ionicons name="location" size={20} color={colors.white} />
            </View>
          </Marker>
        )}

        {/* OSM POI markers */}
        {overlays.pois && filteredPois.map((poi) => (
          <Marker
            key={`poi_${poi.osm_id}`}
            id={`poi_${poi.osm_id}`}
            lngLat={[poi.lon, poi.lat]}
            onPress={() => {
              markerPressGuard.current = true;
              setSelectedPOI(poi);
              setSelectedPin(null);
            }}
          >
            <View style={[styles.poiMarker, { backgroundColor: POI_COLORS[poi.type] }]}>
              <Ionicons name={POI_IONICONS[poi.type]} size={11} color={colors.white} />
            </View>
          </Marker>
        ))}
      </Map>

      {/* Top-right buttons */}
      <View style={[styles.topControls, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        {overlays.pois && (
          <TouchableOpacity
            style={[styles.overlayBtn, showPoiFilter && { backgroundColor: colors.primary }]}
            onPress={() => setShowPoiFilter((v) => !v)}
          >
            <Ionicons name="funnel" size={18} color={showPoiFilter ? colors.white : colors.text} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.overlayBtn} onPress={() => setShowOverlays(true)}>
          <Ionicons name="layers" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* POI type filter dropdown */}
      {overlays.pois && showPoiFilter && (
        <View style={[styles.poiFilterDropdown, { top: insets.top + 56 }]} pointerEvents="box-none">
          <View style={styles.poiFilterDropdownInner} pointerEvents="auto">
            {ALL_POI_TYPES.map((type) => {
              const active = poiTypeFilter.has(type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.poiFilterDropChip, active && { backgroundColor: POI_COLORS[type], borderColor: POI_COLORS[type] }]}
                  onPress={() => setPoiTypeFilter((prev) => {
                    const next = new Set(prev);
                    if (active) { if (next.size > 1) next.delete(type); }
                    else next.add(type);
                    return next;
                  })}
                >
                  <Ionicons name={POI_IONICONS[type]} size={12} color={active ? colors.white : colors.textSecondary} />
                  <Text style={[styles.poiFilterDropChipText, active && { color: colors.white }]}>
                    {POI_TYPE_LABELS[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Compass widget */}
      <View style={styles.compassWidget} pointerEvents="none">
        <View style={styles.compassRose}>
          <Text style={[styles.compassLabel, styles.compassLabelN]}>N</Text>
          <Text style={[styles.compassLabel, styles.compassLabelS]}>S</Text>
          <Text style={[styles.compassLabel, styles.compassLabelE]}>E</Text>
          <Text style={[styles.compassLabel, styles.compassLabelW]}>W</Text>
          <View style={[styles.compassNeedle, { transform: [{ rotate: `${-heading}deg` }] }]}>
            <View style={styles.needleNorth} />
            <View style={styles.needleSouth} />
          </View>
          <View style={styles.compassCenterDot} />
        </View>
        <Text style={styles.compassDegreeText}>{heading}°  {compassCardinal}</Text>
      </View>

      {/* Float buttons */}
      <View style={styles.floatButtons} pointerEvents="box-none">
        {/* Locate — zooms to current location */}
        <TouchableOpacity style={styles.floatBtn} onPress={flyToUser}>
          <Ionicons name="locate" size={22} color={colors.text} />
        </TouchableOpacity>
        {/* Download */}
        <TouchableOpacity
          style={[styles.floatBtn, dlActive && { backgroundColor: colors.success }]}
          onPress={() => setShowDownload(true)}
        >
          {dlActive
            ? <Text style={styles.dlProgressText}>{dlProgress}%</Text>
            : <Ionicons name="cloud-download-outline" size={22} color={colors.text} />
          }
        </TouchableOpacity>
        {routeTarget && (
          <TouchableOpacity style={[styles.floatBtn, { backgroundColor: colors.primary }]} onPress={clearRoute}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Move-pin mode banner */}
      {movingPin && (
        <View style={[styles.movingBanner, { top: insets.top + 56 }]}>
          <Ionicons name="move" size={16} color={colors.accent} />
          <Text style={styles.movingBannerText}>Tap anywhere to move "{movingPin.name}"</Text>
          <TouchableOpacity onPress={() => setMovingPin(null)}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* POI loading / error banner */}
      {overlays.pois && (poisLoading || poisError) && (
        <View style={[styles.poisLoadingBar, poisError ? styles.poisErrorBar : null]}>
          {poisLoading
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Ionicons name="warning-outline" size={16} color={colors.accent} />}
          <Text style={styles.poisLoadingText} numberOfLines={2}>
            {poisLoading ? 'Loading nearby places…' : poisError}
          </Text>
          {!poisLoading && userLocation && (
            <TouchableOpacity
              onPress={() => {
                setPoisError(null);
                setPoisLoading(true);
                fetchAndCachePOIs(userLocation[1], userLocation[0])
                  .then((fresh) => { setPois(fresh); if (fresh.length === 0) setPoisError('No POIs found within 10 km'); })
                  .catch((e: Error) => setPoisError(`Failed: ${e.message}`))
                  .finally(() => setPoisLoading(false));
              }}
            >
              <Text style={styles.poisRetryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
            <TouchableOpacity style={styles.calloutAction} onPress={() => startRoute(selectedPin, 'driving')}>
              <Ionicons name="car" size={16} color={colors.success} />
              <Text style={[styles.calloutActionText, { color: colors.success }]}>Drive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calloutAction} onPress={() => startRoute(selectedPin, 'walking')}>
              <Ionicons name="walk" size={16} color={colors.accent} />
              <Text style={[styles.calloutActionText, { color: colors.accent }]}>Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calloutAction} onPress={() => { setMovingPin(selectedPin); setSelectedPin(null); }}>
              <Ionicons name="move" size={16} color={colors.primary} />
              <Text style={[styles.calloutActionText, { color: colors.primary }]}>Move</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calloutAction} onPress={() => handleDeletePin(selectedPin)}>
              <Ionicons name="trash" size={16} color={colors.danger} />
              <Text style={[styles.calloutActionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* POI callout */}
      {selectedPOI && (
        <View style={styles.callout}>
          <View style={styles.calloutHeader}>
            <View style={[styles.calloutDot, { backgroundColor: POI_COLORS[selectedPOI.type] }]} />
            <Text style={styles.calloutTitle}>{selectedPOI.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPOI(null)}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.calloutType}>{selectedPOI.type.replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.calloutCoords}>{selectedPOI.lat.toFixed(5)}, {selectedPOI.lon.toFixed(5)}</Text>
          {userLocation && (
            <Text style={styles.calloutNote}>
              {haversineKm(userLocation[1], userLocation[0], selectedPOI.lat, selectedPOI.lon).toFixed(1)} km away
            </Text>
          )}
          <View style={styles.calloutActions}>
            <TouchableOpacity
              style={styles.calloutAction}
              onPress={() => openPOIDirections(selectedPOI.lat, selectedPOI.lon, selectedPOI.name)}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={[styles.calloutActionText, { color: colors.primary }]}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {routeTarget && (
        <View style={styles.routeInfo} pointerEvents="none">
          {routeLoading ? (
            <><ActivityIndicator size="small" color="#4285F4" /><Text style={styles.routeText}>Finding route…</Text></>
          ) : (
            <>
              <Ionicons name={routeInfo?.isRoad ? 'navigate' : 'remove-outline'} size={14} color="#4285F4" />
              <View style={{ flex: 1 }}>
                <Text style={styles.routeDestination} numberOfLines={1}>→ {routeTarget.name}</Text>
                {routeInfo && (
                  <Text style={styles.routeText}>
                    {routeInfo.distanceKm.toFixed(1)} km
                    {routeInfo.durationMin != null ? `  ·  ~${routeInfo.durationMin} min` : '  ·  straight line (offline)'}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
      )}

      {/* Staging pin bar — name + category + save */}
      {stagingPin && (
        <View
          style={[styles.stagingBar, {
            bottom: kbHeight,
            paddingBottom: kbHeight > 0 ? spacing.sm : insets.bottom + spacing.sm,
          }]}
          pointerEvents="auto"
        >
          {/* Row 1: hint + dismiss */}
          <View style={styles.stagingTopRow}>
            <Text style={styles.stagingHint}>Tap map to reposition</Text>
            <TouchableOpacity onPress={() => setStagingPin(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Row 2: name input */}
          <TextInput
            style={styles.stagingInput}
            value={stagingPin.name}
            onChangeText={(v) => setStagingPin((p) => p ? { ...p, name: v } : null)}
            placeholder="Pin name (e.g. Evacuation Center)"
            placeholderTextColor={colors.textDim}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSaveStagingPin}
          />

          {/* Row 3: category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <View style={styles.stagingTypeRow}>
              {(Object.keys(PIN_COLORS) as PinType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.stagingTypeChip, stagingPin.type === t && { backgroundColor: PIN_COLORS[t], borderColor: PIN_COLORS[t] }]}
                  onPress={() => setStagingPin((p) => p ? { ...p, type: t } : null)}
                >
                  <Ionicons name={PIN_ICONS[t]} size={12} color={stagingPin.type === t ? colors.white : colors.textSecondary} />
                  <Text style={[styles.stagingTypeChipText, stagingPin.type === t && { color: colors.white }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Row 4: cancel + save */}
          <View style={styles.stagingActions}>
            <TouchableOpacity style={styles.stagingCancelBtn} onPress={() => setStagingPin(null)}>
              <Text style={styles.stagingCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stagingSaveBtn} onPress={handleSaveStagingPin}>
              <Ionicons name="checkmark" size={16} color={colors.white} />
              <Text style={styles.stagingSaveText}>Save Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overlays / Style Modal */}
      <Modal visible={showOverlays} transparent animationType="fade" onRequestClose={() => setShowOverlays(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOverlays(false)}>
          <View style={[styles.modalSheet, { maxHeight: 520 }]}>
            <Text style={styles.modalTitle}>Map</Text>

            <Text style={styles.overlayGroupLabel}>STYLE</Text>
            <View style={styles.styleRow}>
              {(['standard', 'satellite'] as const).map((mode) => (
                <TouchableOpacity key={mode}
                  style={[styles.styleChip, mapMode === mode && styles.styleChipActive]}
                  onPress={() => setMapMode(mode)}>
                  <Ionicons name={mode === 'standard' ? 'map-outline' : 'globe-outline'} size={20}
                    color={mapMode === mode ? colors.white : colors.textSecondary} />
                  <Text style={[styles.styleChipText, mapMode === mode && { color: colors.white }]}>
                    {mode === 'standard' ? 'Standard' : 'Satellite'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.overlayGroupLabel, { marginTop: spacing.sm }]}>OVERLAYS</Text>

            <TouchableOpacity style={styles.overlayRow} onPress={() => setOverlays((s) => ({ ...s, elevation: !s.elevation }))}>
              <Ionicons name="triangle-outline" size={20} color="#8E44AD" />
              <View style={styles.overlayInfo}>
                <Text style={styles.overlayLabel}>Terrain Elevation</Text>
                <Text style={styles.overlaySubLabel}>Esri shaded relief</Text>
              </View>
              <View style={[styles.overlayToggle, overlays.elevation && { backgroundColor: '#8E44AD' }]}>
                {overlays.elevation && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.overlayRow} onPress={() => setOverlays((s) => ({ ...s, flood: !s.flood }))}>
              <Ionicons name="water-outline" size={20} color="#1ABC9C" />
              <View style={styles.overlayInfo}>
                <Text style={styles.overlayLabel}>Flood Hazard</Text>
                <Text style={styles.overlaySubLabel}>Historical water occurrence · JRC</Text>
              </View>
              <View style={[styles.overlayToggle, overlays.flood && { backgroundColor: '#1ABC9C' }]}>
                {overlays.flood && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.overlayRow}
              onPress={() => setOverlays((s) => ({ ...s, pois: !s.pois }))}>
              <Ionicons name="medical-outline" size={20} color={colors.danger} />
              <View style={styles.overlayInfo}>
                <Text style={styles.overlayLabel}>Points of Interest</Text>
                <Text style={styles.overlaySubLabel}>
                  {overlays.pois && pois.length > 0
                    ? `${pois.length} places loaded · 10 km radius`
                    : 'Hospitals · pharmacies · police · fire stations'}
                </Text>
              </View>
              <View style={[styles.overlayToggle, overlays.pois && { backgroundColor: colors.danger }]}>
                {overlays.pois && <Ionicons name="checkmark" size={14} color={colors.white} />}
              </View>
            </TouchableOpacity>
            {overlays.pois && !poisLoading && userLocation && (
              <TouchableOpacity
                style={styles.poisRefreshRow}
                onPress={() => {
                  clearPOICache();
                  setPois([]);
                  setPoisError(null);
                  setPoisLoading(true);
                  fetchAndCachePOIs(userLocation[1], userLocation[0])
                    .then((fresh) => { setPois(fresh); if (fresh.length === 0) setPoisError('No POIs found within 10 km'); })
                    .catch((e: Error) => setPoisError(`Failed: ${e.message}`))
                    .finally(() => { setPoisLoading(false); setShowOverlays(false); });
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <Text style={styles.poisRefreshText}>
                  {pois.length === 0 ? 'Load nearby places' : 'Refresh nearby places'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Offline Download Modal */}
      <Modal visible={showDownload} transparent animationType="slide" onRequestClose={() => !dlActive && setShowDownload(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => !dlActive && setShowDownload(false)}>
          <View style={[styles.modalSheet, { maxHeight: 540 }]}>
            <Text style={styles.modalTitle}>Download for Offline</Text>
            <Text style={styles.dlSubtitle}>
              Saves map tiles for your area. Requires internet to download — works offline after.
            </Text>

            <Text style={styles.overlayGroupLabel}>AREA SIZE</Text>
            <View style={styles.dlSizeRow}>
              {([
                { key: 'small',  label: 'Neighborhood', desc: '~5 km radius',   zoom: 'Zoom 11–15' },
                { key: 'medium', label: 'City',          desc: '~25 km radius',  zoom: 'Zoom 8–14'  },
                { key: 'large',  label: 'Region',        desc: '~120 km radius', zoom: 'Zoom 5–12'  },
              ] as const).map((s) => (
                <TouchableOpacity key={s.key}
                  style={[styles.dlSizeChip, dlSize === s.key && styles.dlSizeChipActive]}
                  onPress={() => setDlSize(s.key)} disabled={dlActive}>
                  <Text style={[styles.dlSizeLabel, dlSize === s.key && { color: colors.white }]}>{s.label}</Text>
                  <Text style={[styles.dlSizeDesc,  dlSize === s.key && { color: colors.white + 'CC' }]}>{s.desc}</Text>
                  <Text style={[styles.dlSizeZoom,  dlSize === s.key && { color: colors.white + '99' }]}>{s.zoom}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {dlActive && (
              <View style={styles.dlProgressWrap}>
                <View style={styles.dlProgressBar}>
                  <View style={[styles.dlProgressFill, { width: `${dlProgress}%` as `${number}%` }]} />
                </View>
                <Text style={styles.dlProgressLabel}>Downloading… {dlProgress}%</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.dlBtn, dlActive && { backgroundColor: colors.textDim }]}
              onPress={startDownload} disabled={dlActive}>
              <Ionicons name={dlActive ? 'hourglass' : 'cloud-download'} size={20} color={colors.white} />
              <Text style={styles.dlBtnText}>{dlActive ? `Downloading ${dlProgress}%` : 'Start Download'}</Text>
            </TouchableOpacity>

            {offlinePacks.length > 0 && (
              <>
                <Text style={[styles.overlayGroupLabel, { marginTop: spacing.md }]}>SAVED MAPS</Text>
                {offlinePacks.map((pack) => (
                  <View key={pack.id} style={styles.packRow}>
                    <Ionicons name="map" size={18} color={colors.success} />
                    <Text style={styles.packName} numberOfLines={1}>
                      {(pack.metadata?.name as string | undefined) ?? pack.id.slice(0, 12)}
                    </Text>
                    <Text style={styles.packSize}>
                      {(pack.metadata?.size as string | undefined) ?? '—'}
                    </Text>
                    <TouchableOpacity onPress={() => deletePack(pack)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
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
    position: 'absolute', top: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.md, paddingTop: spacing.sm,
  },
  overlayBtn: {
    backgroundColor: colors.surface + 'EE', borderRadius: radius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  poiFilterDropdown: {
    position: 'absolute', right: spacing.md, zIndex: 20,
  },
  poiFilterDropdownInner: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    backgroundColor: colors.surface + 'F5', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.sm,
    maxWidth: 260,
  },
  poiFilterDropChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  poiFilterDropChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  compassWidget: { position: 'absolute', bottom: 100, left: spacing.md, alignItems: 'center' },
  compassRose: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.surface + 'EE', borderWidth: 1.5, borderColor: colors.border,
  },
  compassLabel: { position: 'absolute', fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  compassLabelN: { top: 4, left: 0, right: 0, textAlign: 'center', color: '#E74C3C' },
  compassLabelS: { bottom: 4, left: 0, right: 0, textAlign: 'center' },
  compassLabelE: { right: 5, top: 33 },
  compassLabelW: { left: 5, top: 33 },
  compassNeedle: { position: 'absolute', width: 4, height: 56, left: 38, top: 12, borderRadius: 2, overflow: 'hidden' },
  needleNorth: { flex: 1, backgroundColor: '#E74C3C' },
  needleSouth: { flex: 1, backgroundColor: colors.textSecondary },
  compassCenterDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text, left: 36, top: 36 },
  compassDegreeText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600', marginTop: spacing.xs },
  floatButtons: { position: 'absolute', right: spacing.md, bottom: 100, flexDirection: 'column', gap: 14, alignItems: 'center' },
  floatBtn: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  dlProgressText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  movingBanner: {
    position: 'absolute', left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accent + '22', borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accent + '80',
    padding: spacing.sm, paddingHorizontal: spacing.md,
  },
  movingBannerText: { flex: 1, color: colors.accent, fontSize: fontSize.sm, fontWeight: '600' },
  poisLoadingBar: {
    position: 'absolute', top: 80, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface + 'EE', borderRadius: radius.md,
    padding: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  poisErrorBar: { borderColor: colors.accent + '80' },
  poisLoadingText: { color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 },
  poisRetryText: { color: colors.primary, fontSize: fontSize.xs, fontWeight: '700' },
  poisRefreshRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingLeft: 36 + spacing.md,
  },
  poisRefreshText: { color: colors.primary, fontSize: fontSize.sm },
  pinMarker: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
  },
  stagingPinMarker: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 6,
  },
  stagingBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 8,
  },
  stagingTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  stagingHint: { color: colors.textDim, fontSize: fontSize.xs },
  stagingInput: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, color: colors.text,
    fontSize: fontSize.md, paddingHorizontal: spacing.md, paddingVertical: 9,
  },
  stagingTypeRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 1 },
  stagingTypeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  stagingTypeChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  stagingActions: { flexDirection: 'row', gap: spacing.sm },
  stagingCancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
  },
  stagingCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.sm },
  stagingSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: 9, borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  stagingSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  poiMarker: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.white,
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
  routeDestination: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  routeText: { color: colors.textSecondary, fontSize: fontSize.xs, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  overlayGroupLabel: { color: colors.textDim, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  styleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  styleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceElevated, minHeight: 52,
  },
  styleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  styleChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },
  overlayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  overlayInfo: { flex: 1 },
  overlayLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  overlaySubLabel: { color: colors.textDim, fontSize: fontSize.xs, marginTop: 2 },
  overlayToggle: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dlSubtitle: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 18, marginBottom: spacing.sm },
  dlSizeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  dlSizeChip: {
    flex: 1, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated, padding: spacing.sm, alignItems: 'center', gap: 2,
  },
  dlSizeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dlSizeLabel: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  dlSizeDesc: { color: colors.textSecondary, fontSize: 10 },
  dlSizeZoom: { color: colors.textDim, fontSize: 9 },
  dlProgressWrap: { gap: spacing.xs, marginBottom: spacing.sm },
  dlProgressBar: { height: 6, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  dlProgressFill: { height: '100%', backgroundColor: colors.success, borderRadius: radius.full },
  dlProgressLabel: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },
  dlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, minHeight: 52,
  },
  dlBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  packRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  packName: { flex: 1, color: colors.text, fontSize: fontSize.sm },
  packSize: { color: colors.textDim, fontSize: fontSize.xs, textTransform: 'capitalize' },
});
