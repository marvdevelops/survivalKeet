import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TurboModuleRegistry } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';

// MapLibre requires native modules compiled into the app.
// In Expo Go these are absent — check before importing.
const MAP_AVAILABLE = !!TurboModuleRegistry.get('MLRNCameraModule');

// Lazy require so MapLibre code never loads in Expo Go
const MapContent: React.ComponentType | null = MAP_AVAILABLE
  ? (require('../../src/components/MapContent').default as React.ComponentType)
  : null;

export default function MapScreen() {
  if (!MAP_AVAILABLE || !MapContent) {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <MapContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
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
