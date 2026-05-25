import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { TipsBanner } from '../../src/components/TipsBanner';
import { SectionHeader } from '../../src/components/SectionHeader';
import { getAllMembersSummary, type FamilySummary } from '../../src/services/checklistService';

interface QuickTool {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  target: string | { pathname: string; params: Record<string, string> };
}

const QUICK_TOOLS: QuickTool[] = [
  { icon: 'compass',   label: 'Compass',    color: colors.accent, target: '/(tabs)/compass' },
  { icon: 'heart',     label: 'CPR Timer',  color: colors.danger, target: { pathname: '/(tabs)/tools', params: { open: 'cpr' } } },
  { icon: 'sunny',     label: 'Flashlight', color: '#F39C12',     target: { pathname: '/(tabs)/tools', params: { open: 'flashlight' } } },
  { icon: 'documents', label: 'Documents',  color: '#3498DB',     target: { pathname: '/(tabs)/tools', params: { open: 'documents' } } },
];

async function call911() {
  const url = 'tel:911';
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Call 911', 'Dial 911 for emergency assistance.');
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<FamilySummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setSummaries(getAllMembersSummary());
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    load();
    setRefreshing(false);
  }, [load]);

  const totalChecked = summaries.reduce((s, m) => s + m.checked, 0);
  const totalItems   = summaries.reduce((s, m) => s + m.total, 0);
  const readiness    = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header — horizontal logo */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/icon.png')}
              style={styles.logoIcon}
              resizeMode="cover"
            />
            <View>
              <View style={styles.logoNameRow}>
                <Text style={styles.logoNameBold}>Survival</Text>
                <Text style={styles.logoNameLight}>Kit</Text>
              </View>
              <Text style={styles.tagline}>Offline survival guide · Worldwide</Text>
            </View>
          </View>
        </View>

        {/* ── Survival Tips ─────────────────────────────────────────────────── */}
        <SectionHeader title="Survival Tip" />
        <TipsBanner />

        {/* ── Quick Tools ───────────────────────────────────────────────────── */}
        <SectionHeader title="Quick Tools" />
        <View style={styles.quickToolsGrid}>
          {QUICK_TOOLS.map((t) => (
            <TouchableOpacity
              key={t.label}
              style={styles.quickToolBtn}
              onPress={() => router.push(t.target as Parameters<typeof router.push>[0])}
              activeOpacity={0.75}
            >
              <View style={[styles.quickToolIcon, { backgroundColor: t.color + '25' }]}>
                <Ionicons name={t.icon} size={26} color={t.color} />
              </View>
              <Text style={styles.quickToolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Emergency 911 ─────────────────────────────────────────────────── */}
        <SectionHeader title="Emergency" />
        <TouchableOpacity style={styles.emergencyBtn} onPress={call911} activeOpacity={0.85}>
          <View style={styles.emergencyIconWrap}>
            <Ionicons name="call" size={28} color={colors.white} />
          </View>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyLabel}>Call 911</Text>
            <Text style={styles.emergencyDesc}>Emergency hotline — Philippines</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white + 'AA'} />
        </TouchableOpacity>

        {/* ── Go-Bag Readiness ──────────────────────────────────────────────── */}
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
            style={styles.emptyGoBag}
            onPress={() => router.push('/(tabs)/checklist')}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.emptyGoBagText}>Add family members to track go-bags</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.readinessCard}>
            <View style={styles.readinessRow}>
              <Text style={styles.readinessPct}>{readiness}%</Text>
              <Text style={styles.readinessLabel}>
                {totalChecked}/{totalItems} items packed
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${readiness}%` as `${number}%`,
                    backgroundColor:
                      readiness >= 80
                        ? colors.success
                        : readiness >= 50
                        ? colors.accent
                        : colors.danger,
                  },
                ]}
              />
            </View>
            {summaries.map((s) => (
              <View key={s.memberId} style={styles.memberRow}>
                <Text style={styles.memberName}>{s.memberName}</Text>
                <Text style={styles.memberProg}>{s.checked}/{s.total}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  scroll:  { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.xl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoIcon: { width: 48, height: 48, borderRadius: 11 },
  logoNameRow: { flexDirection: 'row', alignItems: 'baseline' },
  logoNameBold: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoNameLight: {
    color: colors.textSecondary,
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  tagline: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 1 },

  // ── Quick Tools grid ────────────────────────────────────────────────────────
  quickToolsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    justifyContent: 'space-between',
  },
  quickToolBtn: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  quickToolIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickToolLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // ── Emergency 911 ───────────────────────────────────────────────────────────
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  emergencyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyInfo: { flex: 1 },
  emergencyLabel: { color: colors.white, fontSize: fontSize.lg, fontWeight: '800' },
  emergencyDesc:  { color: colors.white + 'CC', fontSize: fontSize.xs, marginTop: 2 },

  // ── Go-Bag ──────────────────────────────────────────────────────────────────
  seeAll: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  emptyGoBag: {
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
  emptyGoBagText: { color: colors.textSecondary, fontSize: fontSize.sm },
  readinessCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  readinessRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  readinessPct: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
  readinessLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  memberName: { color: colors.text, fontSize: fontSize.sm },
  memberProg: { color: colors.textSecondary, fontSize: fontSize.sm },
});
