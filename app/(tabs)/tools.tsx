import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Vibration,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { SectionHeader } from '../../src/components/SectionHeader';
import {
  getAllDocuments,
  addDocument,
  deleteDocument,
  getDocumentCount,
  DOC_CATEGORIES,
  type StoredDocument,
} from '../../src/services/documentsService';

// CPR timing constants
const COMPRESS_SECS = 18; // 30 compressions at 100/min
const BREATHE_SECS = 4;   // 2 rescue breaths
const BEAT_MS = 600;       // 100 bpm

type CprMode = 'adult' | 'child' | 'infant';

interface CprModeInfo {
  label: string;
  hands: string;
  depth: string;
  rate: string;
  breath: string;
  color: string;
}

const CPR_MODES: Record<CprMode, CprModeInfo> = {
  adult: {
    label: 'Adult (8+)',
    hands: 'Two hands, heel of hand on center of chest',
    depth: 'Push down 5–6 cm (2–2.4 in)',
    rate: '100–120 compressions/min',
    breath: 'Full breath over 1 second',
    color: colors.danger,
  },
  child: {
    label: 'Child (1–8)',
    hands: 'One or two hands on lower half of breastbone',
    depth: 'Push down ~5 cm (2 in)',
    rate: '100–120 compressions/min',
    breath: 'Small breath — just enough to see chest rise',
    color: '#E67E22',
  },
  infant: {
    label: 'Infant (<1 yr)',
    hands: 'Two fingers on center of chest, just below nipple line',
    depth: 'Push down ~4 cm (1.5 in)',
    rate: '100–120 compressions/min',
    breath: 'Tiny puff — cover mouth AND nose',
    color: '#3498DB',
  },
};

// SOS vibration pattern: ...  ---  ...
const SOS_PATTERN = [
  200, 150, 200, 150, 200, 400,   // ... short
  600, 150, 600, 150, 600, 400,   // --- long
  200, 150, 200, 150, 200, 1200,  // ... short + pause
];

function fmt(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function tqColor(secs: number): string {
  if (secs >= 7200) return '#C0392B';
  if (secs >= 5400) return '#E74C3C';
  if (secs >= 3600) return '#E67E22';
  if (secs >= 1800) return '#F39C12';
  return colors.success;
}

export default function ToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { open } = useLocalSearchParams<{ open?: string }>();
  const lastOpen = useRef<string | undefined>(undefined);

  // ── Flashlight ──────────────────────────────────────────────────────────────
  const [flashOn, setFlashOn] = useState(false);

  // ── Distress signal ─────────────────────────────────────────────────────────
  const [sosActive, setSosActive] = useState(false);

  // ── CPR Timer ───────────────────────────────────────────────────────────────
  const [cprOpen, setCprOpen] = useState(false);
  const [cprMode, setCprMode] = useState<CprMode | null>(null); // null = mode selection screen
  const [cprRunning, setCprRunning] = useState(false);
  const [cprPhase, setCprPhase] = useState<'compress' | 'breathe'>('compress');
  const [cprElapsed, setCprElapsed] = useState(0);
  const [cprCycles, setCprCycles] = useState(0);
  const [cprPhaseTime, setCprPhaseTime] = useState(0);
  const [cprBeat, setCprBeat] = useState(false);
  const cprTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cprBeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Tourniquet Timer ────────────────────────────────────────────────────────
  const [tqOpen, setTqOpen] = useState(false);
  const [tqRunning, setTqRunning] = useState(false);
  const [tqElapsed, setTqElapsed] = useState(0);
  const [tqStart, setTqStart] = useState<Date | null>(null);
  const tqTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Documents ───────────────────────────────────────────────────────────────
  const [docsOpen, setDocsOpen] = useState(false);
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<string>('ID');
  const [newUri, setNewUri] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<StoredDocument | null>(null);

  // Refresh doc count on focus + handle deep-open param from home quick tools
  useFocusEffect(useCallback(() => {
    setDocCount(getDocumentCount());
    if (open && open !== lastOpen.current) {
      lastOpen.current = open;
      if (open.startsWith('cpr')) setCprOpen(true);
      else if (open.startsWith('flashlight')) setFlashOn(true);
      else if (open.startsWith('documents')) { loadDocs(); setDocsOpen(true); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]));

  // ─── SOS vibration ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (sosActive) {
      Vibration.vibrate(SOS_PATTERN, true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [sosActive]);

  // ─── CPR helpers ────────────────────────────────────────────────────────────
  function startBeat() {
    if (cprBeatRef.current) clearInterval(cprBeatRef.current);
    cprBeatRef.current = setInterval(() => setCprBeat((b) => !b), BEAT_MS);
  }

  function stopBeat() {
    if (cprBeatRef.current) { clearInterval(cprBeatRef.current); cprBeatRef.current = null; }
    setCprBeat(false);
  }

  function startCpr() {
    setCprRunning(true);
    startBeat();
    if (cprTickRef.current) clearInterval(cprTickRef.current);
    cprTickRef.current = setInterval(() => {
      setCprElapsed((e) => e + 1);
      setCprPhaseTime((pt) => pt + 1);
    }, 1000);
  }

  function pauseCpr() {
    setCprRunning(false);
    stopBeat();
    if (cprTickRef.current) { clearInterval(cprTickRef.current); cprTickRef.current = null; }
  }

  function resetCpr() {
    pauseCpr();
    setCprElapsed(0);
    setCprCycles(0);
    setCprPhase('compress');
    setCprPhaseTime(0);
  }

  function closeCpr() {
    resetCpr();
    setCprMode(null);
    setCprOpen(false);
  }

  // Phase auto-advance
  useEffect(() => {
    if (!cprRunning) return;
    if (cprPhase === 'compress' && cprPhaseTime >= COMPRESS_SECS) {
      setCprPhase('breathe');
      setCprPhaseTime(0);
      stopBeat();
    } else if (cprPhase === 'breathe' && cprPhaseTime >= BREATHE_SECS) {
      setCprPhase('compress');
      setCprPhaseTime(0);
      setCprCycles((c) => c + 1);
      startBeat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cprPhaseTime]);

  // ─── Tourniquet helpers ──────────────────────────────────────────────────────
  function startTq() {
    if (!tqStart) setTqStart(new Date());
    setTqRunning(true);
    if (tqTickRef.current) clearInterval(tqTickRef.current);
    tqTickRef.current = setInterval(() => setTqElapsed((e) => e + 1), 1000);
  }

  function pauseTq() {
    setTqRunning(false);
    if (tqTickRef.current) { clearInterval(tqTickRef.current); tqTickRef.current = null; }
  }

  function resetTq() {
    pauseTq();
    setTqElapsed(0);
    setTqStart(null);
  }

  // ─── Document helpers ────────────────────────────────────────────────────────
  function loadDocs() {
    const list = getAllDocuments();
    setDocs(list);
    setDocCount(list.length);
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to scan documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true });
    if (!result.canceled && result.assets[0]) setNewUri(result.assets[0].uri);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setNewUri(result.assets[0].uri);
  }

  async function saveDoc() {
    if (!newUri) { Alert.alert('No photo', 'Take or select a photo first.'); return; }
    const label = newName.trim() || newCat;
    const dir = (FileSystem.documentDirectory ?? '') + 'survivekit_docs/';
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const ext = newUri.split('.').pop() ?? 'jpg';
    const dest = `${dir}doc_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: newUri, to: dest });
    addDocument(label, newCat, dest);
    loadDocs();
    setAddOpen(false);
    setNewName('');
    setNewCat('ID');
    setNewUri(null);
  }

  function confirmDeleteDoc(doc: StoredDocument) {
    Alert.alert('Delete document?', doc.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await FileSystem.deleteAsync(doc.uri, { idempotent: true }); } catch {}
          deleteDocument(doc.id);
          loadDocs();
          if (viewDoc?.id === doc.id) setViewDoc(null);
        },
      },
    ]);
  }

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (cprTickRef.current) clearInterval(cprTickRef.current);
      if (cprBeatRef.current) clearInterval(cprBeatRef.current);
      if (tqTickRef.current) clearInterval(tqTickRef.current);
      Vibration.cancel();
    };
  }, []);

  const urgencyColor = tqColor(tqElapsed);
  const cprPhasePct = Math.min(
    ((cprPhase === 'compress' ? cprPhaseTime : cprPhaseTime) /
      (cprPhase === 'compress' ? COMPRESS_SECS : BREATHE_SECS)) * 100,
    100
  );

  return (
    <>
      {/* ── Flashlight overlay ───────────────────────────────────────────────── */}
      {flashOn && (
        <TouchableOpacity
          style={styles.flashOverlay}
          activeOpacity={1}
          onPress={() => setFlashOn(false)}
        >
          <View style={styles.flashOffHint}>
            <Ionicons name="close-circle" size={32} color="#333" />
            <Text style={styles.flashOffText}>Tap anywhere to turn off</Text>
          </View>
        </TouchableOpacity>
      )}

      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Tools</Text>

          {/* ── NAVIGATION ──────────────────────────────────────────────────── */}
          <SectionHeader title="Navigation" />
          <TouchableOpacity style={styles.toolCard} onPress={() => router.push('/(tabs)/compass')}>
            <View style={[styles.toolIcon, { backgroundColor: colors.accent + '25' }]}>
              <Ionicons name="compass" size={26} color={colors.accent} />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolName}>Compass</Text>
              <Text style={styles.toolDesc}>Heading · coordinates · save location</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>

          {/* ── FIRST AID ────────────────────────────────────────────────────── */}
          <SectionHeader title="First Aid Timers" />
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.groupRow} onPress={() => setCprOpen(true)}>
              <View style={[styles.toolIcon, { backgroundColor: colors.danger + '25' }]}>
                <Ionicons name="heart" size={24} color={colors.danger} />
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolName}>CPR Timer</Text>
                <Text style={styles.toolDesc}>30 compressions · 2 breaths · 100 bpm metronome</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity style={styles.groupRow} onPress={() => { setTqOpen(true); }}>
              <View style={[styles.toolIcon, { backgroundColor: '#E67E22' + '25' }]}>
                <Ionicons name="bandage" size={24} color="#E67E22" />
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolName}>Tourniquet Timer</Text>
                <Text style={styles.toolDesc}>Track application time · alert at 2 hours</Text>
              </View>
              {tqRunning && <View style={styles.activeDot} />}
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* ── EMERGENCY SIGNALS ───────────────────────────────────────────── */}
          <SectionHeader title="Emergency Signals" />
          <View style={styles.groupCard}>
            <TouchableOpacity
              style={[styles.groupRow, flashOn && styles.groupRowActive]}
              onPress={() => setFlashOn((v) => !v)}
            >
              <View style={[styles.toolIcon, { backgroundColor: flashOn ? '#FFD700AA' : '#F39C12' + '25' }]}>
                <Ionicons name={flashOn ? 'sunny' : 'sunny-outline'} size={24} color={flashOn ? '#000' : '#F39C12'} />
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolName}>Flashlight</Text>
                <Text style={styles.toolDesc}>{flashOn ? 'ON — tap to turn off' : 'Full-screen torch for signaling'}</Text>
              </View>
              <View style={[styles.togglePill, flashOn && styles.togglePillOn]}>
                <View style={[styles.toggleThumb, flashOn && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>

            <View style={styles.groupDivider} />

            <TouchableOpacity
              style={[styles.groupRow, sosActive && styles.groupRowActive]}
              onPress={() => setSosActive((v) => !v)}
            >
              <View style={[styles.toolIcon, { backgroundColor: sosActive ? colors.danger + '40' : colors.danger + '25' }]}>
                <Ionicons name="radio-outline" size={24} color={colors.danger} />
              </View>
              <View style={styles.toolInfo}>
                <Text style={styles.toolName}>SOS Signal</Text>
                <Text style={styles.toolDesc}>{sosActive ? 'Vibrating SOS — tap to stop' : 'Repeating SOS vibration pattern'}</Text>
              </View>
              <View style={[styles.togglePill, sosActive && { backgroundColor: colors.danger }]}>
                <View style={[styles.toggleThumb, sosActive && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── DOCUMENTS ───────────────────────────────────────────────────── */}
          <SectionHeader title="Documents" />
          <TouchableOpacity
            style={styles.toolCard}
            onPress={() => { loadDocs(); setDocsOpen(true); }}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#3498DB' + '25' }]}>
              <Ionicons name="documents" size={26} color="#3498DB" />
            </View>
            <View style={styles.toolInfo}>
              <Text style={styles.toolName}>Document Vault</Text>
              <Text style={styles.toolDesc}>IDs, insurance, land titles — stored offline</Text>
            </View>
            {docCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{docCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ════════════════════════════════════════════════════════════════════════
          CPR TIMER MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={cprOpen} animationType="slide" onRequestClose={closeCpr}>
        <SafeAreaView style={styles.modalFull} edges={[]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
            <View>
              <Text style={styles.modalTitle}>CPR Timer</Text>
              <Text style={styles.modalSubtitle}>
                {cprMode ? CPR_MODES[cprMode].label : 'Select patient type'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeCpr} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Mode selection ── */}
          {!cprMode ? (
            <ScrollView contentContainerStyle={styles.timerContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modeSelectTitle}>Who needs CPR?</Text>
              {(Object.entries(CPR_MODES) as [CprMode, CprModeInfo][]).map(([key, info]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.modeCard, { borderColor: info.color + '50' }]}
                  onPress={() => setCprMode(key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.modeCardIcon, { backgroundColor: info.color + '20' }]}>
                    <Ionicons name="heart" size={28} color={info.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modeCardTitle, { color: info.color }]}>{info.label}</Text>
                    <Text style={styles.modeCardSub}>{info.hands}</Text>
                    <Text style={styles.modeCardSub}>{info.depth}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
                </TouchableOpacity>
              ))}

              <View style={styles.cprInfoCard}>
                <Text style={styles.cprInfoTitle}>Before starting CPR</Text>
                <Text style={styles.cprInfoStep}>1. Check scene is safe</Text>
                <Text style={styles.cprInfoStep}>2. Tap shoulder — "Are you OK?"</Text>
                <Text style={styles.cprInfoStep}>3. Call emergency services (or ask someone to)</Text>
                <Text style={styles.cprInfoStep}>4. Lay person on firm flat surface</Text>
                <Text style={styles.cprInfoStep}>5. Tilt head back, lift chin to open airway</Text>
              </View>
            </ScrollView>
          ) : (
            /* ── Timer view ── */
            <ScrollView contentContainerStyle={styles.timerContent} showsVerticalScrollIndicator={false}>
              {/* Quick instructions */}
              <View style={[styles.cprInstructionCard, { borderColor: CPR_MODES[cprMode].color + '40' }]}>
                <View style={styles.cprInstructionRow}>
                  <Ionicons name="hand-left-outline" size={16} color={CPR_MODES[cprMode].color} />
                  <Text style={styles.cprInstructionText}>{CPR_MODES[cprMode].hands}</Text>
                </View>
                <View style={styles.cprInstructionRow}>
                  <Ionicons name="arrow-down-outline" size={16} color={CPR_MODES[cprMode].color} />
                  <Text style={styles.cprInstructionText}>{CPR_MODES[cprMode].depth}</Text>
                </View>
                <View style={styles.cprInstructionRow}>
                  <Ionicons name="timer-outline" size={16} color={CPR_MODES[cprMode].color} />
                  <Text style={styles.cprInstructionText}>{CPR_MODES[cprMode].rate}</Text>
                </View>
                <View style={styles.cprInstructionRow}>
                  <Ionicons name="cloud-outline" size={16} color={CPR_MODES[cprMode].color} />
                  <Text style={styles.cprInstructionText}>{CPR_MODES[cprMode].breath}</Text>
                </View>
              </View>

              {/* Beat circle */}
              <View style={[
                styles.cprBeatCircle,
                { borderColor: CPR_MODES[cprMode].color + '40' },
                cprPhase === 'compress' && cprBeat && { backgroundColor: CPR_MODES[cprMode].color + '20', borderColor: CPR_MODES[cprMode].color },
                cprPhase === 'breathe' && { borderColor: colors.success + '60' },
              ]}>
                <Text style={[styles.cprPhaseWord, { color: cprPhase === 'compress' ? CPR_MODES[cprMode].color : colors.success }]}>
                  {cprPhase === 'compress' ? 'PUSH' : 'BREATHE'}
                </Text>
                <Text style={styles.cprPhaseInstruction}>
                  {cprPhase === 'compress' ? '30 compressions' : '2 rescue breaths'}
                </Text>
              </View>

              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${cprPhasePct}%` as `${number}%`,
                    backgroundColor: cprPhase === 'compress' ? CPR_MODES[cprMode].color : colors.success },
                ]} />
              </View>
              <Text style={styles.progressLabel}>
                {cprPhase === 'compress'
                  ? `${Math.max(0, COMPRESS_SECS - cprPhaseTime)}s until breaths`
                  : `${Math.max(0, BREATHE_SECS - cprPhaseTime)}s until next compressions`}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{fmt(cprElapsed)}</Text>
                  <Text style={styles.statLabel}>Elapsed</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{cprCycles}</Text>
                  <Text style={styles.statLabel}>Cycles done</Text>
                </View>
              </View>

              <View style={styles.controls}>
                {!cprRunning ? (
                  <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnPrimary]} onPress={startCpr}>
                    <Ionicons name="play" size={22} color={colors.white} />
                    <Text style={styles.ctrlBtnText}>{cprElapsed > 0 ? 'Resume' : 'Start'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnPause]} onPress={pauseCpr}>
                    <Ionicons name="pause" size={22} color={colors.white} />
                    <Text style={styles.ctrlBtnText}>Pause</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnSecondary]} onPress={resetCpr}>
                  <Ionicons name="refresh" size={22} color={colors.textSecondary} />
                  <Text style={[styles.ctrlBtnText, { color: colors.textSecondary }]}>Reset</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.modeChangeBtn} onPress={() => { resetCpr(); setCprMode(null); }}>
                <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
                <Text style={styles.modeChangeBtnText}>Change patient type</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.guideLink}
                onPress={() => { closeCpr(); router.push('/(tabs)/guides'); }}>
                <Ionicons name="book-outline" size={16} color={colors.primary} />
                <Text style={styles.guideLinkText}>Open CPR guide for full instructions</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          TOURNIQUET TIMER MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={tqOpen} animationType="slide" onRequestClose={() => { resetTq(); setTqOpen(false); }}>
        <SafeAreaView style={[styles.modalFull, { backgroundColor: tqElapsed >= 1800 ? urgencyColor + '18' : colors.background }]} edges={[]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
            <View>
              <Text style={styles.modalTitle}>Tourniquet Timer</Text>
              <Text style={styles.modalSubtitle}>Remove or reassess within 2 hours</Text>
            </View>
            <TouchableOpacity onPress={() => { resetTq(); setTqOpen(false); }} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.timerContent}>
            {/* Big display */}
            <View style={[styles.tqDisplay, { borderColor: urgencyColor + '50' }]}>
              <Text style={[styles.tqTime, { color: urgencyColor }]}>{fmt(tqElapsed)}</Text>
              <Text style={styles.tqTimeLabel}>elapsed</Text>
              {tqStart && (
                <Text style={styles.tqApplied}>
                  Applied at {tqStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>

            {/* Urgency milestones */}
            <View style={styles.milestones}>
              {[
                { label: '30 min', secs: 1800, color: '#F39C12', note: 'Reassess circulation' },
                { label: '1 hour', secs: 3600, color: '#E67E22', note: 'Loosen briefly if trained' },
                { label: '90 min', secs: 5400, color: '#E74C3C', note: 'Seek medical aid urgently' },
                { label: '2 hours', secs: 7200, color: '#C0392B', note: 'CRITICAL — remove ASAP' },
              ].map((m) => {
                const past = tqElapsed >= m.secs;
                return (
                  <View key={m.secs} style={styles.milestone}>
                    <View style={[styles.milestoneDot, { backgroundColor: past ? m.color : colors.border }]} />
                    <View style={styles.milestoneInfo}>
                      <Text style={[styles.milestoneLabel, past && { color: m.color }]}>{m.label}</Text>
                      <Text style={styles.milestoneNote}>{m.note}</Text>
                    </View>
                    {past && <Ionicons name="warning-outline" size={16} color={m.color} />}
                  </View>
                );
              })}
            </View>

            <View style={styles.controls}>
              {!tqRunning ? (
                <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnPrimary]} onPress={startTq}>
                  <Ionicons name="play" size={22} color={colors.white} />
                  <Text style={styles.ctrlBtnText}>{tqElapsed > 0 ? 'Resume' : 'Start Timer'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnPause]} onPress={pauseTq}>
                  <Ionicons name="pause" size={22} color={colors.white} />
                  <Text style={styles.ctrlBtnText}>Pause</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnSecondary]} onPress={resetTq}>
                <Ionicons name="refresh" size={22} color={colors.textSecondary} />
                <Text style={[styles.ctrlBtnText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          DOCUMENT VAULT MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={docsOpen} animationType="slide" onRequestClose={() => setDocsOpen(false)}>
        <SafeAreaView style={styles.modalFull} edges={[]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
            <Text style={styles.modalTitle}>Document Vault</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setAddOpen(true)}>
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDocsOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {docs.length === 0 ? (
            <View style={styles.docsEmpty}>
              <Ionicons name="documents-outline" size={72} color={colors.textDim} />
              <Text style={styles.docsEmptyTitle}>No documents saved</Text>
              <Text style={styles.docsEmptyBody}>
                Store offline copies of IDs, insurance cards, land titles, medical records, and other important documents.
              </Text>
              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnPrimary, {
                  flex: 0, alignSelf: 'center', marginTop: spacing.lg,
                  paddingHorizontal: spacing.xl,
                }]}
                onPress={() => setAddOpen(true)}
              >
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.ctrlBtnText}>Add First Document</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.docsGrid} showsVerticalScrollIndicator={false}>
              {docs.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.docTile}
                  onPress={() => setViewDoc(doc)}
                  onLongPress={() => confirmDeleteDoc(doc)}
                >
                  <Image source={{ uri: doc.uri }} style={styles.docThumb} resizeMode="cover" />
                  <View style={styles.docTileInfo}>
                    <Text style={styles.docTileCat}>{doc.category}</Text>
                    <Text style={styles.docTileName} numberOfLines={1}>{doc.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* ── Add Document sheet — nested so it stacks on iOS ── */}
          <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
            <View style={styles.sheetOverlay}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAddOpen(false)} />
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>Add Document</Text>

                <TouchableOpacity style={styles.photoPicker} onPress={takePhoto}>
                  {newUri ? (
                    <Image source={{ uri: newUri }} style={styles.photoPreview} resizeMode="cover" />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={44} color={colors.textDim} />
                      <Text style={styles.photoPickerText}>Tap to take photo</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity style={[styles.photoSourceBtn, { flex: 1 }]} onPress={takePhoto}>
                    <Ionicons name="camera" size={18} color={colors.text} />
                    <Text style={styles.photoSourceText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoSourceBtn, { flex: 1 }]} onPress={pickPhoto}>
                    <Ionicons name="images" size={18} color={colors.text} />
                    <Text style={styles.photoSourceText}>Gallery</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs }}>
                    {DOC_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, newCat === cat && styles.catChipActive]}
                        onPress={() => setNewCat(cat)}
                      >
                        <Text style={[styles.catChipText, newCat === cat && { color: colors.white }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.fieldLabel}>Name (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder={`e.g. My ${newCat}`}
                  placeholderTextColor={colors.textDim}
                />

                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <TouchableOpacity
                    style={[styles.ctrlBtn, styles.ctrlBtnSecondary, { flex: 1 }]}
                    onPress={() => { setAddOpen(false); setNewUri(null); setNewName(''); }}
                  >
                    <Text style={[styles.ctrlBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlBtnPrimary, { flex: 1 }]} onPress={saveDoc}>
                    <Text style={styles.ctrlBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW DOCUMENT FULLSCREEN
      ════════════════════════════════════════════════════════════════════════ */}
      {viewDoc && (
        <Modal visible animationType="fade" onRequestClose={() => setViewDoc(null)}>
          <SafeAreaView style={[styles.modalFull, { backgroundColor: '#000' }]} edges={[]}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + spacing.sm }]}>
              <View>
                <Text style={styles.modalTitle}>{viewDoc.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{viewDoc.category}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => confirmDeleteDoc(viewDoc)}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setViewDoc(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <Image source={{ uri: viewDoc.uri }} style={{ flex: 1 }} resizeMode="contain" />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  pageTitle: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.xl,
  },

  // ── Tool cards ──────────────────────────────────────────────────────────────
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toolInfo: { flex: 1 },
  toolName: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  toolDesc: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },

  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  groupRowActive: { backgroundColor: colors.surfaceElevated },
  groupDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  activeDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.success, marginRight: spacing.xs,
  },

  togglePill: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  togglePillOn: { backgroundColor: colors.success, borderColor: colors.success },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.textDim,
  },
  toggleThumbOn: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },

  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  countBadgeText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' },

  // ── Flashlight overlay ──────────────────────────────────────────────────────
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 80,
  },
  flashOffHint: { alignItems: 'center', gap: spacing.sm },
  flashOffText: { color: '#333', fontSize: fontSize.sm, fontWeight: '600' },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalFull: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '800' },
  modalSubtitle: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  closeBtn: {
    padding: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
  },

  // ── CPR Timer ───────────────────────────────────────────────────────────────
  timerContent: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  cprBeatCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.danger + '40',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  cprBeatCircleActive: {
    backgroundColor: colors.danger + '20',
    borderColor: colors.danger,
  },
  cprPhaseWord: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  cprPhaseInstruction: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },

  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  progressLabel: { color: colors.textDim, fontSize: fontSize.xs },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: spacing.md },
  statNum: { color: colors.text, fontSize: fontSize.xxl, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  controls: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  ctrlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  ctrlBtnPrimary: { backgroundColor: colors.primary },
  ctrlBtnPause: { backgroundColor: colors.accent },
  ctrlBtnSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ctrlBtnText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  guideLinkText: { color: colors.primary, fontSize: fontSize.sm },

  // ── CPR mode selection ─────────────────────────────────────────────────────
  modeSelectTitle: {
    color: colors.text, fontSize: fontSize.xl, fontWeight: '700',
    textAlign: 'center', marginBottom: spacing.md,
  },
  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, padding: spacing.md, width: '100%',
  },
  modeCardIcon: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  modeCardTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  modeCardSub: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },

  cprInfoCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.xs,
  },
  cprInfoTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  cprInfoStep: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },

  cprInstructionCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, padding: spacing.md, gap: spacing.sm,
  },
  cprInstructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cprInstructionText: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1, lineHeight: 18 },

  modeChangeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm,
  },
  modeChangeBtnText: { color: colors.textSecondary, fontSize: fontSize.sm },

  // ── Tourniquet ──────────────────────────────────────────────────────────────
  tqDisplay: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.surface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  tqTime: { fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] },
  tqTimeLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  tqApplied: { color: colors.textDim, fontSize: fontSize.xs, marginTop: spacing.xs },

  milestones: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  milestoneDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  milestoneInfo: { flex: 1 },
  milestoneLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  milestoneNote: { color: colors.textDim, fontSize: fontSize.xs },

  // ── Documents ───────────────────────────────────────────────────────────────

  docsEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  docsEmptyTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  docsEmptyBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },

  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  docTile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  docThumb: { width: '100%', height: 140 },
  docTileInfo: { padding: spacing.sm },
  docTileCat: { color: colors.textDim, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  docTileName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', marginTop: 2 },

  // ── Add document sheet ──────────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: '#000000BB',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },

  photoPicker: {
    height: 90,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.sm,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoPickerText: { color: colors.textDim, fontSize: fontSize.sm },

  photoSourceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoSourceText: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },

  fieldLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.md,
    padding: spacing.md,
    minHeight: 48,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
});
