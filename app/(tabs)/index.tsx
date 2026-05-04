import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { AlertBanner } from '../../src/components/AlertBanner';
import { QuickActionButton } from '../../src/components/QuickActionButton';
import { SectionHeader } from '../../src/components/SectionHeader';
import { getAllMembersSummary, type FamilySummary } from '../../src/services/checklistService';

export default function HomeScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<FamilySummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setSummaries(getAllMembersSummary());
  }, []);

  useEffect(() => {
    load();
    requestLocation();
  }, [load]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission denied');
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation(loc);
    } catch {
      setLocationError('Unable to get location');
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    load();
    await requestLocation();
    setRefreshing(false);
  }, [load]);

  const totalChecked = summaries.reduce((s, m) => s + m.checked, 0);
  const totalItems = summaries.reduce((s, m) => s + m.total, 0);
  const readinessPercent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>SurviveKit</Text>
          <Text style={styles.tagline}>Offline survival guide · Philippines</Text>
        </View>

        {/* PAGASA Alert */}
        <SectionHeader title="PAGASA Alerts" />
        <AlertBanner />

        {/* Quick Actions */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.quickActions}>
          <QuickActionButton
            icon="map"
            label="Map"
            color={colors.success}
            onPress={() => router.push('/(tabs)/map')}
          />
          <QuickActionButton
            icon="call"
            label="SOS"
            color={colors.primary}
            onPress={() => router.push('/(tabs)/sos')}
          />
          <QuickActionButton
            icon="compass"
            label="Compass"
            color={colors.accent}
            onPress={() => router.push('/(tabs)/compass')}
          />
          <QuickActionButton
            icon="location"
            label="Locations"
            color="#8E44AD"
            onPress={() => router.push('/(tabs)/map')}
          />
        </View>

        {/* Location Status */}
        <SectionHeader title="Location Status" />
        <View style={styles.locationCard}>
          <Ionicons
            name={location ? 'location' : 'location-outline'}
            size={20}
            color={location ? colors.success : locationError ? colors.danger : colors.textSecondary}
          />
          {location ? (
            <View style={styles.locationInfo}>
              <Text style={styles.locationCoords}>
                {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
              </Text>
              <Text style={styles.locationAccuracy}>
                Accuracy ±{Math.round(location.coords.accuracy ?? 0)}m
              </Text>
            </View>
          ) : (
            <Text style={styles.locationError}>
              {locationError ?? 'Getting location…'}
            </Text>
          )}
          <TouchableOpacity onPress={requestLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Checklist Summary */}
        <SectionHeader
          title="Go-Bag Readiness"
          right={
            <TouchableOpacity onPress={() => router.push('/(tabs)/checklist')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          }
        />

        {summaries.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyChecklist}
            onPress={() => router.push('/(tabs)/checklist')}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.emptyChecklistText}>Add family members to track go-bags</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.readinessCard}>
            <View style={styles.readinessRow}>
              <Text style={styles.readinessPercent}>{readinessPercent}%</Text>
              <Text style={styles.readinessLabel}>
                {totalChecked}/{totalItems} items packed
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${readinessPercent}%` as `${number}%`,
                    backgroundColor:
                      readinessPercent >= 80
                        ? colors.success
                        : readinessPercent >= 50
                        ? colors.accent
                        : colors.danger,
                  },
                ]}
              />
            </View>
            {summaries.map((s) => (
              <View key={s.memberId} style={styles.memberRow}>
                <Text style={styles.memberName}>{s.memberName}</Text>
                <Text style={styles.memberProgress}>
                  {s.checked}/{s.total}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl },
  appName: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  locationInfo: { flex: 1 },
  locationCoords: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  locationAccuracy: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  locationError: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },
  seeAll: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  emptyChecklist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  emptyChecklistText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  readinessCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  readinessPercent: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  readinessLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  memberName: { color: colors.text, fontSize: fontSize.sm },
  memberProgress: { color: colors.textSecondary, fontSize: fontSize.sm },
});
