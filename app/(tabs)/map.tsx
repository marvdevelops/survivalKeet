import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TurboModuleRegistry } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';

// CRITICAL: nothing from MapLibre may be touched at app launch.
// Importing '@maplibre/maplibre-react-native' (and even probing its TurboModule)
// initializes the native MapLibre SDK, which reads its offline-pack database. On
// the new architecture that init crashes at startup once an offline pack exists.
// Tab route modules are imported eagerly by expo-router at launch, so we must NOT
// `require()` MapContent (or call TurboModuleRegistry) at module scope here.
// Instead we resolve everything lazily, only when the user first opens this tab.
type Resolved = { available: boolean; Comp: React.ComponentType | null };

export default function MapScreen() {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const resolvedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (resolvedRef.current) return; // resolve once, then keep mounted across tab switches
      resolvedRef.current = true;
      // First open of the Map tab: NOW it's safe to touch MapLibre (foreground,
      // user-initiated). Probe the native module and load the heavy map component.
      const available = !!TurboModuleRegistry.get('MLRNCameraModule');
      const Comp = available
        ? (require('../../src/components/MapContent').default as React.ComponentType)
        : null;
      setResolved({ available, Comp });
    }, []),
  );

  // Tab not opened yet — MapLibre is completely untouched.
  if (!resolved) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!resolved.available || !resolved.Comp) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="map" size={64} color={colors.textDim} />
          </View>
          <Text style={styles.title}>Map unavailable</Text>
          <Text style={styles.body}>
            The offline map requires a custom native build and cannot run in Expo Go.
          </Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>To enable the map:</Text>
            <Text style={styles.step}>1. Install EAS CLI{'\n'}   npm install -g eas-cli</Text>
            <Text style={styles.step}>2. Build a development client{'\n'}   eas build --profile development --platform ios</Text>
            <Text style={styles.step}>3. Install the build on your device and open it</Text>
          </View>
          <Text style={styles.note}>
            All other tabs (Compass, SOS, Guides, Checklist) work fully in Expo Go.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const Comp = resolved.Comp;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Comp />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  step: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  note: {
    color: colors.success,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
