import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { TipsBanner } from '../../src/components/TipsBanner';
import { SectionHeader } from '../../src/components/SectionHeader';
import { PreparednessRing } from '../../src/components/PreparednessRing';
import { EmergencyModeButton } from '../../src/components/EmergencyModeButton';
import { TutorialOverlay } from '../../src/components/TutorialOverlay';
import { NextLessonCard } from '../../src/components/NextLessonCard';
import type { PreparednessItem } from '../../src/types/emergency';
import type { GDACSAlert, GDACSEventType } from '../../src/services/gdacsService';
import { getAllMembersSummary, type FamilySummary } from '../../src/services/checklistService';
import { hasAnyExpiryWarning } from '../../src/services/expiryService';

// ─── Alert banner ─────────────────────────────────────────────────────────────


// ─── GDACS alert banner ───────────────────────────────────────────────────────

const GDACS_TYPE_ICON: Record<GDACSEventType, keyof typeof MaterialCommunityIcons.glyphMap> = {
  TC: 'weather-hurricane',
  EQ: 'alert-circle',
  FL: 'waves',
  VO: 'fire-alert',
  WF: 'fire',
  DR: 'weather-sunny-alert',
};

function formatTimeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatAlertDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function GDACSBanner({
  alerts,
  lastFetched,
  source,
  isLoading,
}: {
  alerts: GDACSAlert[];
  lastFetched: string | null;
  source: 'live' | 'cached' | null;
  isLoading: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlert, setSelectedAlert] = useState<GDACSAlert | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sort: Philippines first, then Red > Orange > Green
  const sorted = useMemo(() => {
    return [...alerts]
      .sort((a, b) => {
        const isPH = (c: string) => c.toLowerCase().includes('philippine') ? 0 : 1;
        if (isPH(a.country) !== isPH(b.country)) return isPH(a.country) - isPH(b.country);
        const lvl = (l: string) => l === 'Red' ? 0 : l === 'Orange' ? 1 : 2;
        return lvl(a.alertLevel) - lvl(b.alertLevel);
      })
      .slice(0, 5);
  }, [alerts]);

  // Reset index when alerts change
  useEffect(() => { setCurrentIndex(0); }, [sorted.length]);

  // Auto-advance ticker every 4 s
  useEffect(() => {
    if (sorted.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sorted.length);
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sorted.length]);

  const currentAlert = sorted[currentIndex] ?? null;

  return (
    <View style={styles.gdacsSection}>
      {/* Header row */}
      <View style={styles.gdacsHeader}>
        <Text style={styles.gdacsTitle}>LIVE DISASTER ALERTS</Text>
        <View style={styles.gdacsHeaderRight}>
          {sorted.length > 1 && (
            <Text style={styles.gdacsPager}>{currentIndex + 1}/{sorted.length}</Text>
          )}
          {source !== null && (
            <View style={styles.gdacsSourceRow}>
              <View style={[styles.gdacsDot, { backgroundColor: source === 'live' ? '#22C55E' : '#6B7280' }]} />
              <Text style={[styles.gdacsSourceText, { color: source === 'live' ? '#22C55E' : '#6B7280' }]}>
                {source === 'live' ? 'LIVE' : 'CACHED'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Card */}
      {isLoading && alerts.length === 0 ? (
        <Text style={styles.gdacsEmptyText}>Checking for alerts...</Text>
      ) : alerts.length === 0 ? (
        <Text style={styles.gdacsEmptyText}>
          {lastFetched ? 'No active alerts worldwide.' : 'Connect to internet to load live alerts.'}
        </Text>
      ) : currentAlert ? (() => {
        const isRed = currentAlert.alertLevel === 'Red';
        const ac = isRed ? '#E8452A' : '#F97316';
        const bg = isRed ? '#1A0A0A' : '#1A1000';
        return (
          <TouchableOpacity
            style={[styles.gdacsCard, { width: screenWidth - spacing.md * 2, backgroundColor: bg, borderLeftColor: ac }]}
            onPress={() => setSelectedAlert(currentAlert)}
            activeOpacity={0.85}
          >
            <View style={styles.gdacsCardTop}>
              <MaterialCommunityIcons name={GDACS_TYPE_ICON[currentAlert.type] ?? 'alert'} size={18} color={ac} />
              <Text style={[styles.gdacsCardType, { color: ac }]}>
                {currentAlert.type}  •  {currentAlert.country}
              </Text>
            </View>
            <Text style={styles.gdacsCardTitle} numberOfLines={2}>{currentAlert.title}</Text>
            <Text style={styles.gdacsCardSub}>
              Alert Level: <Text style={{ color: ac, fontWeight: '700' }}>{currentAlert.alertLevel.toUpperCase()}</Text>
            </Text>
            <Text style={styles.gdacsCardSub}>Active since: {formatAlertDate(currentAlert.fromDate)}</Text>
            {sorted.length > 1 && (
              <View style={styles.gdacsDotsRow}>
                {sorted.map((_, i) => (
                  <View key={i} style={[styles.gdacsDotIndicator, i === currentIndex && styles.gdacsDotIndicatorActive]} />
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })() : null}

      {lastFetched !== null && (
        <Text style={styles.gdacsFooter}>Source: GDACS  •  Updated: {formatTimeAgo(lastFetched)}</Text>
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selectedAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAlert(null)}
      >
        <TouchableOpacity
          style={styles.gdacsModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedAlert(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.gdacsModalSheet}>
              {selectedAlert && (() => {
                const a = selectedAlert;
                const isR = a.alertLevel === 'Red';
                const ac = isR ? '#E8452A' : '#F97316';
                return (
                  <>
                    <View style={styles.gdacsModalHeader}>
                      <MaterialCommunityIcons name={GDACS_TYPE_ICON[a.type] ?? 'alert'} size={20} color={ac} />
                      <Text style={[styles.gdacsModalType, { color: ac }]}>{a.type}  •  {a.country}</Text>
                      <TouchableOpacity
                        onPress={() => setSelectedAlert(null)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.gdacsModalTitle}>{a.title}</Text>
                    <View style={[styles.gdacsModalLevelBadge, { borderColor: ac }]}>
                      <Text style={[styles.gdacsModalLevelText, { color: ac }]}>
                        {a.alertLevel.toUpperCase()} ALERT
                      </Text>
                    </View>
                    <Text style={styles.gdacsModalMeta}>
                      Active: {formatAlertDate(a.fromDate)} – {formatAlertDate(a.toDate)}
                    </Text>
                    {a.url ? (
                      <TouchableOpacity
                        style={styles.gdacsModalLinkBtn}
                        onPress={() => Linking.openURL(a.url).catch(() => {})}
                      >
                        <Ionicons name="open-outline" size={16} color={colors.primary} />
                        <Text style={styles.gdacsModalLinkText}>View on GDACS</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={styles.gdacsModalCloseBtn}
                      onPress={() => setSelectedAlert(null)}
                    >
                      <Text style={styles.gdacsModalCloseBtnText}>Close</Text>
                    </TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Quick tools ─────────────────────────────────────────────────────────────

interface QuickToolBase {
  label: string;
  color: string;
  /** When true, the card is rendered with a red-tinted background + border for urgency. */
  accent?: boolean;
  target?: string | { pathname: string; params: Record<string, string> };
  onPress?: () => void;
}

// Discriminated by `iconLib` so each entry's `icon` is type-checked against the
// correct glyphMap (Ionicons by default; MaterialCommunityIcons when iconLib='mci').
type QuickTool =
  | (QuickToolBase & { iconLib?: 'ionicons'; icon: keyof typeof Ionicons.glyphMap })
  | (QuickToolBase & { iconLib: 'mci';       icon: keyof typeof MaterialCommunityIcons.glyphMap });

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
    alerts,
    alertsLastFetched,
    alertsSource,
    isLoadingAlerts,
  } = useEmergency();

  const {
    lessonProgress,
    startLesson,
    showWelcome,
    dismissWelcome,
  } = useTutorial();

  const quickTools: QuickTool[] = [
    {
      // Active Threat is the highest-urgency tool — visually accented to stand out.
      iconLib: 'mci',
      icon:    'shield-alert',
      label:   'ACTIVE THREAT',
      color:   '#E8452A',
      accent:  true,
      target:  '/active-threat',
    },
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
  const [summaries,    setSummaries]    = useState<FamilySummary[]>([]);
  const [hasExpiryWarn, setHasExpiryWarn] = useState(false);

  // ── Emergency mode modals ────────────────────────────────────────────────────
  const [activateModal,   setActivateModal]   = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);

  useFocusEffect(useCallback(() => {
    refreshPreparedness();
    setSummaries(getAllMembersSummary());
    setHasExpiryWarn(hasAnyExpiryWarning());
  }, [refreshPreparedness]));

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

        {/* ── GDACS Live Alerts ─────────────────────────────────────────────── */}
        <GDACSBanner
          alerts={alerts}
          lastFetched={alertsLastFetched}
          source={alertsSource}
          isLoading={isLoadingAlerts}
        />

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
              style={[styles.quickToolBtn, t.accent && styles.quickToolBtnAccent]}
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
                {t.iconLib === 'mci'
                  ? <MaterialCommunityIcons name={t.icon} size={26} color={t.color} />
                  : <Ionicons               name={t.icon} size={26} color={t.color} />}
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

  // ── GDACS alert section ──────────────────────────────────────────────────────
  gdacsSection: {
    marginBottom: spacing.lg,
  },
  gdacsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  gdacsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gdacsPager: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  gdacsTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  gdacsSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gdacsDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  gdacsSourceText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gdacsEmptyText: {
    color: colors.textDim,
    fontSize: fontSize.sm,
    paddingVertical: spacing.sm,
  },
  gdacsCard: {
    borderLeftWidth: 4,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  gdacsCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  gdacsCardType: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  gdacsCardTitle: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
    lineHeight: 18,
  },
  gdacsCardSub: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 15,
  },
  gdacsDotsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: spacing.xs,
  },
  gdacsDotIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4B5563',
  },
  gdacsDotIndicatorActive: {
    backgroundColor: '#9CA3AF',
    width: 12,
  },
  gdacsFooter: {
    color: colors.textDim,
    fontSize: 10,
    marginTop: spacing.sm,
  },
  // Detail modal
  gdacsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  gdacsModalSheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    gap: spacing.sm,
  },
  gdacsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  gdacsModalType: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  gdacsModalTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 22,
  },
  gdacsModalLevelBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  gdacsModalLevelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gdacsModalMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  gdacsModalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  gdacsModalLinkText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  gdacsModalCloseBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  gdacsModalCloseBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  // Highest-urgency tools (e.g. Active Threat) get a red-tinted card background
  // + danger border so they read as distinct from the regular tool buttons.
  quickToolBtnAccent: {
    backgroundColor: '#1C1010',
    borderWidth: 1,
    borderColor: '#E8452A',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
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
