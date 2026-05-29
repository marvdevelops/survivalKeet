import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEmergency } from '../../src/context/EmergencyContext';
import { useTutorial } from '../../src/context/TutorialContext';
import { LESSONS, type LessonId } from '../../src/services/tutorialService';
import { EmergencyModeScreen } from '../../src/components/EmergencyModeScreen';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { TipsBanner } from '../../src/components/TipsBanner';
import { SectionHeader } from '../../src/components/SectionHeader';
import { PreparednessRing } from '../../src/components/PreparednessRing';
import { EmergencyModeButton } from '../../src/components/EmergencyModeButton';
import { TutorialOverlay } from '../../src/components/TutorialOverlay';
import { NextLessonCard } from '../../src/components/NextLessonCard';
import type { PreparednessItem } from '../../src/types/emergency';
import { saveIncomingAlert, type IncomingAlertPayload } from '../../src/services/alertsService';
import { getAllMembersSummary, type FamilySummary } from '../../src/services/checklistService';
import { hasAnyExpiryWarning } from '../../src/services/expiryService';

// ─── Alert banner ─────────────────────────────────────────────────────────────

type AlertSeverity = 'extreme' | 'high' | 'medium' | 'low';

const SEVERITY_BG: Record<AlertSeverity, string> = {
  extreme: '#FF0000',
  high:    '#FF6600',
  medium:  '#FFB800',
  low:     '#4CAF50',
};

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  extreme: '⛔',
  high:    '🔴',
  medium:  '🟠',
  low:     '🟡',
};

interface ActiveAlert {
  title: string;
  body: string;
  severity: AlertSeverity;
}

const AUTO_DISMISS_MS = 30000;

function isAlertSeverity(s: unknown): s is AlertSeverity {
  return s === 'extreme' || s === 'high' || s === 'medium' || s === 'low';
}

function DisasterBanner({
  alert,
  onDismiss,
}: {
  alert: ActiveAlert;
  onDismiss: () => void;
}) {
  const bg = SEVERITY_BG[alert.severity];
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Text style={styles.bannerEmoji}>{SEVERITY_EMOJI[alert.severity]}</Text>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle} numberOfLines={1}>{alert.title}</Text>
        <Text style={styles.bannerBody}  numberOfLines={2}>{alert.body}</Text>
      </View>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

interface QuickTool {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  target?: string | { pathname: string; params: Record<string, string> };
  onPress?: () => void;
}

async function call911() {
  const url = 'tel:911';
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Call 911', 'Dial 911 for emergency assistance.');
  }
}

function formatActiveBannerTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    emergencyMode,
    emergencyActivatedAt,
    activateEmergencyMode,
    deactivateEmergencyMode,
    preparednessScore,
    preparednessItems,
    refreshPreparedness,
    dmsActive,
    confirmCheckin,
    torchActive,
    toggleTorch,
  } = useEmergency();

  const {
    lessonProgress,
    startLesson,
    showWelcome,
    dismissWelcome,
  } = useTutorial();

  const quickTools: QuickTool[] = [
    { icon: 'compass',   label: 'Compass',    color: colors.accent, target: '/(tabs)/compass' },
    { icon: 'heart',     label: 'CPR Timer',  color: colors.danger, target: { pathname: '/(tabs)/tools', params: { open: 'cpr' } } },
    {
      icon:    torchActive ? 'sunny'         : 'sunny-outline',
      label:  'Flashlight',
      color:   torchActive ? '#FFD700'       : '#F39C12',
      onPress: toggleTorch,
    },
    { icon: 'documents', label: 'Documents',  color: '#3498DB',     target: { pathname: '/(tabs)/tools', params: { open: 'documents' } } },
  ];

  const [refreshing, setRefreshing] = useState(false);
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [summaries,    setSummaries]    = useState<FamilySummary[]>([]);
  const [hasExpiryWarn, setHasExpiryWarn] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Emergency mode modals ────────────────────────────────────────────────────
  const [activateModal,   setActivateModal]   = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshPreparedness();
    setSummaries(getAllMembersSummary());
    setHasExpiryWarn(hasAnyExpiryWarning());
  }, [refreshPreparedness]));

  // Foreground push notification listener
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const title = notification.request.content.title ?? 'Disaster Alert';
      const body  = notification.request.content.body  ?? '';
      const severity = isAlertSeverity(data.severity) ? data.severity : 'medium';

      // Show banner
      setActiveAlert({ title: title, body, severity });

      // Auto-dismiss after 30 seconds
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setActiveAlert(null), AUTO_DISMISS_MS);

      // Save to SQLite
      const payload: IncomingAlertPayload = {
        alertId:   String(data.alertId  ?? ''),
        type:      String(data.type     ?? 'storm'),
        severity:  String(data.severity ?? 'medium'),
        lat:       typeof data.lat       === 'number' ? data.lat       : 0,
        lng:       typeof data.lng       === 'number' ? data.lng       : 0,
        radius_km: typeof data.radius_km === 'number' ? data.radius_km : 0,
        source:    String(data.source    ?? 'unknown'),
        issued_at: String(data.issued_at ?? new Date().toISOString()),
      };
      saveIncomingAlert(payload, title);
    });

    return () => {
      subscription.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshPreparedness();
    setSummaries(getAllMembersSummary());
    setHasExpiryWarn(hasAnyExpiryWarning());
    setRefreshing(false);
  }, [refreshPreparedness]);

  const handlePreparednessItemPress = useCallback((item: PreparednessItem) => {
    if (item.key === 'tutorial') {
      // Open the first incomplete lesson overlay instead of navigating to self
      const first = LESSONS.find((l) => !lessonProgress[l.id as LessonId]);
      if (first) startLesson(first.id as LessonId);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(item.route as any);
  }, [router, lessonProgress, startLesson]);

  const handleEmergencyModePress = useCallback(() => {
    if (emergencyMode) {
      setDeactivateModal(true);
    } else {
      setActivateModal(true);
    }
  }, [emergencyMode]);

  // ── Go-Bag computed values ────────────────────────────────────────────────────
  const totalChecked = summaries.reduce((acc, s) => acc + (s.checked ?? 0), 0);
  const totalItems   = summaries.reduce((acc, s) => acc + (s.total   ?? 0), 0);
  const readiness    = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

  // ── Tutorial: first incomplete lesson (null = all done, section hidden) ───────
  const nextLesson   = LESSONS.find((l) => !lessonProgress[l.id as LessonId]) ?? null;

  // ── Emergency mode takes over the entire screen ──────────────────────────────
  if (emergencyMode) {
    return <EmergencyModeScreen />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Disaster alert banner — sits above scroll, full width */}
      {activeAlert && (
        <DisasterBanner
          alert={activeAlert}
          onDismiss={() => {
            setActiveAlert(null);
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
          }}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header — logo left, emergency button right */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
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

            <EmergencyModeButton
              isActive={emergencyMode}
              activatedAt={emergencyActivatedAt}
              dmsActive={dmsActive}
              onPress={handleEmergencyModePress}
              onImOkayPress={confirmCheckin}
            />
          </View>

          {/* Active banner — shown when emergency mode is active.
              Currently unreachable in normal flow (early return → EmergencyModeScreen),
              but structurally correct if early return is ever removed. */}
          {emergencyMode && (
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerText} numberOfLines={1}>
                {'🔴 EMERGENCY ACTIVE · ' + formatActiveBannerTime(emergencyActivatedAt)}
              </Text>
              {dmsActive && (
                <TouchableOpacity
                  onPress={confirmCheckin}
                  style={styles.activeBannerOkayBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.activeBannerOkayText}>I'M OKAY</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Emergency Preparedness ────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>EMERGENCY PREPAREDNESS</Text>
        <PreparednessRing
          score={preparednessScore}
          items={preparednessItems}
          onItemPress={handlePreparednessItemPress}
        />

        {/* ── Get Ready (Tutorial) — hidden once all 5 lessons complete ─────── */}
        {nextLesson !== null && (
          <>
            <Text style={styles.sectionLabel}>GET READY</Text>
            <NextLessonCard
              progress={lessonProgress}
              lessons={LESSONS}
              onStart={startLesson}
            />
          </>
        )}

        {/* ── Survival Tips ─────────────────────────────────────────────────── */}
        <SectionHeader title="Survival Tip" />
        <TipsBanner />

        {/* ── Quick Tools ───────────────────────────────────────────────────── */}
        <SectionHeader title="Quick Tools" />
        <View style={styles.quickToolsGrid}>
          {quickTools.map((t) => (
            <TouchableOpacity
              key={t.label}
              style={styles.quickToolBtn}
              onPress={() => {
                if (t.onPress) {
                  t.onPress();
                } else if (t.target) {
                  router.push(t.target as Parameters<typeof router.push>[0]);
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.quickToolIcon, { backgroundColor: t.color + '25' }]}>
                <Ionicons name={t.icon} size={26} color={t.color} />
              </View>
              <Text style={styles.quickToolLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Go-Bag Readiness ──────────────────────────────────────────────── */}
        <SectionHeader
          title="Go-Bag Readiness"
          right={
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/checklist')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          }
        />
        {summaries.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyGoBag}
            onPress={() => router.push('/(tabs)/checklist')}
            activeOpacity={0.8}
          >
            <Ionicons name="bag-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyGoBagText}>No family members added yet</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.readinessCard}
            onPress={() => router.push('/(tabs)/checklist')}
            activeOpacity={0.85}
          >
            {/* Overall progress bar */}
            <View style={styles.readinessRow}>
              <Text style={styles.readinessPct}>{readiness}%</Text>
              <Text style={styles.readinessLabel}>
                {totalChecked}/{totalItems} items packed
              </Text>
              {hasExpiryWarn && (
                <View style={styles.expiryWarnBadge}>
                  <Text style={styles.expiryWarnText}>⚠ Expiry</Text>
                </View>
              )}
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${readiness}%` }]} />
            </View>

            {/* Per-member rows */}
            {summaries.slice(0, 3).map((s) => {
              const pct = s.total > 0 ? Math.round((s.checked / s.total) * 100) : 0;
              return (
                <View key={s.memberId} style={styles.memberRow}>
                  <Text style={styles.memberName} numberOfLines={1}>{s.memberName}</Text>
                  <Text style={styles.memberProg}>{s.checked}/{s.total}</Text>
                </View>
              );
            })}
            {summaries.length > 3 && (
              <Text style={styles.seeAllMore}>+{summaries.length - 3} more members →</Text>
            )}
          </TouchableOpacity>
        )}

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

      </ScrollView>

      {/* ── Activation confirmation modal ──────────────────────────────────── */}
      <Modal
        visible={activateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActivateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Activate Emergency Mode?</Text>
            <Text style={styles.modalBody}>
              This switches the app to disaster response view and activates the Dead Man's Switch if you have emergency contacts set up.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setActivateModal(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnActivate]}
                onPress={async () => {
                  setActivateModal(false);
                  await activateEmergencyMode();
                }}
              >
                <Text style={styles.modalBtnActivateText}>ACTIVATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── First-launch welcome modal ─────────────────────────────────────── */}
      <Modal
        visible={showWelcome}
        transparent
        animationType="fade"
        onRequestClose={dismissWelcome}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.welcomeEmoji}>🛡️</Text>
            <Text style={styles.modalTitle}>Welcome to SurviveKit</Text>
            <Text style={styles.modalBody}>
              Complete 5 quick lessons to build your emergency preparedness foundation.
              Each lesson takes under 2 minutes and works fully offline.
            </Text>
            <View style={styles.welcomeLessons}>
              {LESSONS.map((l) => (
                <View key={l.id} style={styles.welcomeLessonRow}>
                  <Text style={styles.welcomeLessonNum}>{l.id}.</Text>
                  <Text style={styles.welcomeLessonTitle}>{l.title}</Text>
                </View>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={dismissWelcome}
              >
                <Text style={styles.modalBtnCancelText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnActivate]}
                onPress={() => {
                  dismissWelcome();
                  startLesson(1);
                }}
              >
                <Text style={styles.modalBtnActivateText}>Let's Go →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Deactivation confirmation modal ────────────────────────────────── */}
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
              Dead Man's Switch will be deactivated. Exit only when you are safe.
            </Text>
            <View style={styles.modalActions}>
              {/* Prominent button is STAY — harder to exit than enter */}
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnStay]}
                onPress={() => setDeactivateModal(false)}
              >
                <Text style={styles.modalBtnActivateText}>Stay in Emergency</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={async () => {
                  setDeactivateModal(false);
                  await deactivateEmergencyMode();
                }}
              >
                <Text style={styles.modalBtnCancelText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Tutorial lesson overlay ────────────────────────────────────────── */}
      <TutorialOverlay />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Disaster banner ─────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  bannerEmoji: { fontSize: 24 },
  bannerText: { flex: 1 },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  bannerBody: {
    color: '#FFFFFFCC',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2,
  },

  safe:    { flex: 1, backgroundColor: colors.background },
  scroll:  { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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

  // ── Active emergency banner (below header) ───────────────────────────────────
  activeBanner: {
    marginTop: spacing.sm,
    backgroundColor: '#1a0000',
    borderRadius: 8,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-between',
  },
  activeBannerText: {
    color: '#FF6666',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  activeBannerOkayBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  activeBannerOkayText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Section label ────────────────────────────────────────────────────────────
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

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

  // ── Go-Bag widget ────────────────────────────────────────────────────────────
  seeAll: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  emptyGoBag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyGoBagText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  readinessCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  readinessPct: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  readinessLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  expiryWarnBadge: {
    backgroundColor: '#FF6B0020',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  expiryWarnText: {
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: 6,
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  memberName: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  memberProg: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  seeAllMore: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textAlign: 'center',
    paddingTop: 4,
  },


  // ── Welcome modal extras ─────────────────────────────────────────────────────
  welcomeEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  welcomeLessons: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  welcomeLessonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  welcomeLessonNum: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    fontWeight: '700',
    width: 18,
  },
  welcomeLessonTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
  },

  // ── Confirmation modals ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  modalBody: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
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
    minHeight: 52,
  },
  modalBtnCancel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  modalBtnActivate: {
    backgroundColor: colors.danger,
  },
  modalBtnActivateText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  // "Stay in Emergency" — prominent, takes 60% width
  modalBtnStay: {
    flex: 2,
    backgroundColor: colors.danger,
  },
});
