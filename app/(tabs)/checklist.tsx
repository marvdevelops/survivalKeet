import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { getAllMembers, addMember, deleteMember } from '../../src/services/membersService';
import {
  getChecklistForMember,
  getChecklistSummary,
  toggleItem,
  resetChecklist,
  getCustomItemsForMember,
  addCustomItem,
  toggleCustomItem,
  deleteCustomItem,
  resetCustomItems,
  updateCustomItemCategory,
  renameCustomItem,
  type ChecklistRow,
  type CustomChecklistItem,
} from '../../src/services/checklistService';
import {
  getExpiryStatus,
  setMcItemExpiry,
  setCustomItemExpiry,
  scheduleExpiryNotifications,
  cancelItemNotifications,
  todayISO,
  type ExpirySource,
} from '../../src/services/expiryService';
import {
  exportMemberToQRString,
  parseQRPayload,
  importReplaceGoBag,
  importMergeGoBag,
} from '../../src/services/syncService';
import type { Member, MemberType } from '../../src/db/schema';
import { useTutorial } from '../../src/context/TutorialContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_TYPE_ICONS: Record<MemberType, keyof typeof Ionicons.glyphMap> = {
  adult: 'person',
  child: 'happy',
  baby: 'heart',
  pet: 'paw',
};

const MEMBER_TYPE_COLORS: Record<MemberType, string> = {
  adult: '#3498DB',
  child: '#F39C12',
  baby: '#E74C3C',
  pet: '#27AE60',
};

// Unified item — predefined rows (keyed by mc_id) or custom rows (keyed by id)
type UnifiedItem =
  | ({ kind: 'predefined' } & ChecklistRow)
  | ({ kind: 'custom'     } & CustomChecklistItem);

interface SectionData {
  title: string;
  data: UnifiedItem[];
}

// ─── Expiry badge ─────────────────────────────────────────────────────────────

function ExpiryBadge({ expiry }: { expiry: string | null }) {
  if (!expiry) return null;
  const status = getExpiryStatus(expiry);
  if (status === 'ok') return null;
  const isExpired = status === 'expired';
  return (
    <View style={[styles.expiryBadge, isExpired ? styles.expiryBadgeRed : styles.expiryBadgeOrange]}>
      <Ionicons
        name={isExpired ? 'alert-circle' : 'time-outline'}
        size={11}
        color={colors.white}
      />
      <Text style={styles.expiryBadgeText}>
        {isExpired ? 'Expired' : 'Expiring'}
      </Text>
    </View>
  );
}

// ─── Expiry date display ──────────────────────────────────────────────────────

function ExpiryText({ expiry }: { expiry: string | null }) {
  if (!expiry) return null;
  const status = getExpiryStatus(expiry);
  const color =
    status === 'expired' ? colors.danger :
    status === 'expiring_soon' ? colors.accent :
    colors.textDim;
  // Format YYYY-MM-DD → "May 18, 2026"
  const d = new Date(expiry + 'T00:00:00');
  const label = d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  return <Text style={[styles.checkItemNotes, { color }]}>Expires {label}</Text>;
}

// ─── Expiry picker sheet ──────────────────────────────────────────────────────

interface ExpirySheetProps {
  visible: boolean;
  label: string;
  memberName: string;
  currentExpiry: string | null;
  onSave: (iso: string | null) => void;
  onClose: () => void;
}

function ExpirySheet({ visible, label, memberName, currentExpiry, onSave, onClose }: ExpirySheetProps) {
  const initial = currentExpiry
    ? new Date(currentExpiry + 'T00:00:00')
    : (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; })();

  const [date, setDate] = useState<Date>(initial);
  const [showPicker, setShowPicker] = useState(false);

  // Re-sync date when sheet re-opens with a different item
  React.useEffect(() => {
    if (visible) {
      setDate(currentExpiry ? new Date(currentExpiry + 'T00:00:00') : (() => {
        const d = new Date(); d.setMonth(d.getMonth() + 6); return d;
      })());
      // On Android open picker inline; on iOS show inline always
      if (Platform.OS === 'android') setShowPicker(false);
    }
  }, [visible, currentExpiry]);

  function toISO(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  }

  const formattedDate = date.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>Set Expiry Date</Text>
        <Text style={styles.expirySheetSubtitle} numberOfLines={2}>
          {memberName} · {label}
        </Text>

        {/* Date display / tap to open picker on Android */}
        {Platform.OS === 'android' ? (
          <TouchableOpacity style={styles.androidDateBtn} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={styles.androidDateText}>{formattedDate}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </TouchableOpacity>
        ) : null}

        {/* iOS — inline picker; Android — modal picker shown on demand */}
        {(Platform.OS === 'ios' || showPicker) && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={handleChange}
            themeVariant="dark"
            style={styles.datePicker}
          />
        )}

        <View style={styles.modalActions}>
          {currentExpiry ? (
            <TouchableOpacity
              style={[styles.modalBtn, styles.modalBtnDanger]}
              onPress={() => onSave(null)}
            >
              <Text style={styles.modalBtnDangerText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={onClose}>
            <Text style={styles.modalBtnCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalBtn, styles.modalBtnSave]}
            onPress={() => onSave(toISO(date))}
          >
            <Text style={styles.modalBtnSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Custom item categories ───────────────────────────────────────────────────

const CUSTOM_CATEGORIES = [
  'Custom',
  'Water',
  'Food',
  'First Aid',
  'Documents',
  'Clothing',
  'Tools',
  'Communication',
  'Shelter',
  'Medicine',
  'Hygiene',
  'Baby',
  'Pet',
];

// Category picker bottom sheet
function CategoryPickerSheet({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (cat: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>Select Category</Text>
        <View style={styles.catGrid}>
          {CUSTOM_CATEGORIES.map((cat) => {
            const active = current === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => { onSelect(cat); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={onClose}>
          <Text style={styles.modalBtnCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ChecklistScreen() {
  const { onActionCompleted } = useTutorial();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<MemberType>('adult');
  const [addItemModal, setAddItemModal] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Custom');
  const [categoryPicker, setCategoryPicker] = useState<{ itemId: number; current: string } | null>(null);
  const [renameItem, setRenameItem] = useState<{ itemId: number; current: string } | null>(null);
  const [renameLabel, setRenameLabel] = useState('');

  // QR sync state
  const [qrModal, setQrModal] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrTooLarge, setQrTooLarge] = useState(false);
  const [qrMemberName, setQrMemberName] = useState('');
  const [scanModal, setScanModal] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<string | null>(null);
  const scanned = useRef(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  // Expiry sheet state
  const [expirySheet, setExpirySheet] = useState<{
    source: ExpirySource;
    itemId: number;   // mc.id for 'mc', custom_checklist_items.id for 'custom'
    label: string;
    currentExpiry: string | null;
  } | null>(null);

  useFocusEffect(useCallback(() => { loadMembers(); }, []));

  function loadMembers() {
    const loaded = getAllMembers();
    setMembers(loaded);
    if (loaded.length > 0) {
      const current = selectedMember
        ? loaded.find((m) => m.id === selectedMember.id) ?? loaded[0]
        : loaded[0];
      selectMember(current);
    } else {
      setSelectedMember(null);
      setSections([]);
    }
  }

  function selectMember(member: Member) {
    setSelectedMember(member);
    const items  = getChecklistForMember(member.id);
    const custom = getCustomItemsForMember(member.id);

    const grouped: Record<string, UnifiedItem[]> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({ kind: 'predefined', ...item });
    }
    for (const item of custom) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push({ kind: 'custom', ...item });
    }

    setSections(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([title, data]) => ({ title, data }))
    );
  }

  function handleToggle(item: UnifiedItem) {
    const nowChecked = item.checked === 0;
    if (item.kind === 'predefined') {
      toggleItem(item.mc_id, nowChecked);
    } else {
      toggleCustomItem(item.id, nowChecked);
    }
    if (selectedMember) {
      selectMember(selectedMember);
      if (nowChecked) {
        const summary = getChecklistSummary(selectedMember.id);
        if (summary.checked >= 3) onActionCompleted('checklist_checked_3');
      }
    }
  }

  function handleAddMember() {
    if (!newName.trim()) { Alert.alert('Name required', 'Please enter a name.'); return; }
    addMember(newName.trim(), newType);
    setAddModal(false);
    setNewName('');
    setNewType('adult');
    loadMembers();
  }

  function handleDeleteMember(member: Member) {
    Alert.alert('Delete member?', `Remove ${member.name} and all their checklist data?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteMember(member.id); loadMembers(); } },
    ]);
  }

  function handleReset() {
    if (!selectedMember) return;
    Alert.alert('Reset checklist?', `Uncheck all items for ${selectedMember.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: () => {
          resetChecklist(selectedMember.id);
          resetCustomItems(selectedMember.id);
          selectMember(selectedMember);
        },
      },
    ]);
  }

  function handleAddCustomItem() {
    if (!newItemLabel.trim() || !selectedMember) return;
    addCustomItem(selectedMember.id, newItemLabel.trim(), newItemCategory);
    setNewItemLabel('');
    setNewItemCategory('Custom');
    setAddItemModal(false);
    selectMember(selectedMember);
  }

  function handleRenameCustomItem() {
    if (!renameItem || !renameLabel.trim() || !selectedMember) return;
    renameCustomItem(renameItem.itemId, renameLabel.trim());
    setRenameItem(null);
    setRenameLabel('');
    selectMember(selectedMember);
  }

  function handleDeleteCustomItem(item: CustomChecklistItem | (UnifiedItem & { kind: 'custom' })) {
    Alert.alert('Remove item?', item.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          cancelItemNotifications('custom', item.id);
          deleteCustomItem(item.id);
          if (selectedMember) selectMember(selectedMember);
        },
      },
    ]);
  }

  async function handleSaveExpiry(iso: string | null) {
    if (!expirySheet || !selectedMember) return;
    const { source, itemId, label } = expirySheet;

    if (source === 'mc') {
      setMcItemExpiry(itemId, iso);
    } else {
      setCustomItemExpiry(itemId, iso);
    }

    if (iso) {
      await scheduleExpiryNotifications(source, itemId, label, selectedMember.name, iso);
    } else {
      cancelItemNotifications(source, itemId);
    }

    setExpirySheet(null);
    selectMember(selectedMember);
  }

  function handleOpenShare(member: Member) {
    const { data, tooLarge } = exportMemberToQRString(member.id);
    setQrMemberName(member.name);
    setQrData(data);
    setQrTooLarge(tooLarge);
    setQrModal(true);
  }

  async function handleOpenScan() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Camera permission required', 'Allow camera access to scan QR codes.');
        return;
      }
    }
    scanned.current = false;
    setScanModal(true);
  }

  function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned.current) return;
    scanned.current = true;
    setScanModal(false);
    const payload = parseQRPayload(data);
    if (!payload) {
      Alert.alert('Invalid QR Code', 'This QR code was not created by SurviveKit.');
      return;
    }
    setConfirmPayload(data);
  }

  function handleImport(mode: 'replace' | 'merge') {
    if (!confirmPayload) return;
    const payload = parseQRPayload(confirmPayload);
    if (!payload) return;
    try {
      if (mode === 'replace') {
        importReplaceGoBag(payload);
      } else {
        importMergeGoBag(payload);
      }
      setConfirmPayload(null);
      loadMembers();
      Alert.alert(
        'Import complete',
        mode === 'replace'
          ? 'All data replaced successfully.'
          : 'New items merged into your existing data.'
      );
    } catch {
      Alert.alert('Import failed', 'Could not import data. The QR code may be corrupted.');
    }
  }

  const totalItems   = sections.reduce((s, sec) => s + sec.data.length, 0);
  const checkedItems = sections.reduce((s, sec) => s + sec.data.filter((i) => i.checked === 1).length, 0);
  const progress = totalItems > 0 ? checkedItems / totalItems : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Checklist</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenScan}>
            <Ionicons name="qr-code-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addMemberBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="person-add" size={20} color={colors.primary} />
            <Text style={styles.addMemberText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {members.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.textDim} />
          <Text style={styles.emptyTitle}>No family members yet</Text>
          <Text style={styles.emptySubtitle}>
            Add family members to track individual go-bag checklists
          </Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={22} color={colors.white} />
            <Text style={styles.emptyAddText}>Add First Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Member selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.memberScroll}
            contentContainerStyle={styles.memberRow}
          >
            {members.map((m) => {
              const active = selectedMember?.id === m.id;
              const color = MEMBER_TYPE_COLORS[m.type];
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.memberChip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => selectMember(m)}
                  onLongPress={() => handleDeleteMember(m)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={MEMBER_TYPE_ICONS[m.type]} size={16} color={active ? colors.white : color} />
                  <Text style={[styles.memberChipText, active && { color: colors.white }]}>{m.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Progress bar */}
          {selectedMember && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>{checkedItems}/{totalItems} items packed</Text>
                <View style={styles.progressActions}>
                  <Text style={[styles.progressPercent, {
                    color: progress >= 0.8 ? colors.success : progress >= 0.5 ? colors.accent : colors.danger,
                  }]}>
                    {Math.round(progress * 100)}%
                  </Text>
                  <TouchableOpacity
                    onPress={() => selectedMember && handleOpenShare(selectedMember)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="qr-code" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleReset} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="refresh" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${Math.round(progress * 100)}%` as `${number}%`,
                  backgroundColor: progress >= 0.8 ? colors.success : progress >= 0.5 ? colors.accent : colors.danger,
                }]} />
              </View>
            </View>
          )}

          {/* Checklist */}
          <SectionList
            style={styles.list}
            sections={sections}
            keyExtractor={(item) =>
              item.kind === 'predefined' ? `p-${item.mc_id}` : `c-${item.id}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <Text style={styles.sectionHeaderCount}>
                  {section.data.filter((i) => i.checked === 1).length}/{section.data.length}
                </Text>
              </View>
            )}
            renderSectionFooter={({ section }) => (
              <TouchableOpacity
                style={styles.sectionAddBtn}
                onPress={() => {
                  setNewItemCategory(section.title);
                  setAddItemModal(true);
                }}
              >
                <Ionicons name="add" size={15} color={colors.primary} />
                <Text style={styles.sectionAddText}>Add item</Text>
              </TouchableOpacity>
            )}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.checkItem,
                  getExpiryStatus(item.expiry_date) === 'expired' && styles.checkItemExpired,
                  getExpiryStatus(item.expiry_date) === 'expiring_soon' && styles.checkItemExpiringSoon,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleToggle(item)}
                onLongPress={() => {
                  if (item.kind === 'predefined') {
                    setExpirySheet({
                      source: 'mc',
                      itemId: item.mc_id,
                      label: item.label,
                      currentExpiry: item.expiry_date,
                    });
                  } else {
                    Alert.alert(item.label, 'What would you like to do?', [
                      {
                        text: 'Rename',
                        onPress: () => {
                          setRenameLabel(item.label);
                          setRenameItem({ itemId: item.id, current: item.label });
                        },
                      },
                      {
                        text: 'Change Category',
                        onPress: () => setCategoryPicker({ itemId: item.id, current: item.category }),
                      },
                      {
                        text: 'Set Expiry Date',
                        onPress: () => setExpirySheet({
                          source: 'custom',
                          itemId: item.id,
                          label: item.label,
                          currentExpiry: item.expiry_date,
                        }),
                      },
                      {
                        text: 'Remove Item',
                        style: 'destructive',
                        onPress: () => handleDeleteCustomItem(item),
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }
                }}
              >
                <View style={[styles.checkbox, item.checked === 1 && styles.checkboxChecked]}>
                  {item.checked === 1 && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <View style={styles.checkItemInfo}>
                  <View style={styles.checkItemLabelRow}>
                    <Text style={[styles.checkItemLabel, item.checked === 1 && styles.checkItemLabelDone]}>
                      {item.label}
                    </Text>
                    {item.kind === 'custom' && (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>custom</Text>
                      </View>
                    )}
                    <ExpiryBadge expiry={item.expiry_date} />
                  </View>
                  {item.kind === 'predefined' && item.notes
                    ? <Text style={styles.checkItemNotes}>{item.notes}</Text>
                    : null}
                  <ExpiryText expiry={item.expiry_date} />
                  {!item.expiry_date && (
                    <Text style={styles.setExpiryHint}>Hold to set expiry date</Text>
                  )}
                </View>
              </Pressable>
            )}
            ListFooterComponent={
              selectedMember ? (
                <View style={styles.customSection}>
                  <TouchableOpacity
                    style={styles.addItemBtn}
                    onPress={() => {
                      setNewItemCategory('Custom');
                      setAddItemModal(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addItemText}>Add custom item</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* ── QR Share modal ───────────────────────────────────────────── */}
      <Modal visible={qrModal} transparent animationType="fade" onRequestClose={() => setQrModal(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrSheet}>
            <View style={styles.qrSheetHeader}>
              <View>
                <Text style={styles.qrSheetTitle}>Share Go-Bag</Text>
                {qrMemberName ? (
                  <Text style={styles.qrSheetSubtitle}>{qrMemberName}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => setQrModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {qrTooLarge ? (
              <View style={styles.qrTooLargeWrap}>
                <Ionicons name="warning-outline" size={36} color={colors.accent} />
                <Text style={styles.qrTooLargeTitle}>Data too large for QR</Text>
                <Text style={styles.qrTooLargeBody}>
                  This member has too many custom items. Try removing some custom items and sharing again.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.qrWrap}>
                  {qrData ? (
                    <QRCode
                      value={qrData}
                      size={220}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  ) : (
                    <ActivityIndicator color={colors.primary} />
                  )}
                </View>
                <Text style={styles.qrHint}>
                  Show this to another device running SurviveKit to import {qrMemberName ? `${qrMemberName}'s` : 'this'} go-bag data.
                </Text>
                <Text style={styles.qrSizeNote}>
                  {qrData ? `${qrData.length} bytes` : ''}
                </Text>
              </>
            )}

            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setQrModal(false)}>
              <Text style={styles.qrCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── QR Scan modal ────────────────────────────────────────────── */}
      <Modal visible={scanModal} animationType="slide" onRequestClose={() => setScanModal(false)}>
        <View style={[styles.scanContainer, { paddingTop: insets.top }]}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={() => setScanModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />

          <View style={styles.scanOverlay} pointerEvents="none">
            <View style={styles.scanFrame} />
          </View>

          <Text style={styles.scanHint}>
            Point the camera at a SurviveKit QR code
          </Text>
        </View>
      </Modal>

      {/* ── Confirm import modal ─────────────────────────────────────── */}
      <Modal visible={!!confirmPayload} transparent animationType="slide" onRequestClose={() => setConfirmPayload(null)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrSheet}>
            <View style={styles.qrSheetHeader}>
              <Text style={styles.qrSheetTitle}>Import Data</Text>
              <TouchableOpacity onPress={() => setConfirmPayload(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmBody}>
              Go-bag QR detected. How would you like to import?
            </Text>

            <TouchableOpacity style={styles.confirmOptionBtn} onPress={() => handleImport('merge')}>
              <View style={styles.confirmOptionIcon}>
                <Ionicons name="person-add-outline" size={22} color={colors.success} />
              </View>
              <View style={styles.confirmOptionInfo}>
                <Text style={styles.confirmOptionTitle}>Add member</Text>
                <Text style={styles.confirmOptionDesc}>
                  Adds this person to your family. Skipped if someone with the same name already exists.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.confirmOptionBtn, styles.confirmOptionDanger]} onPress={() => {
              Alert.alert(
                'Replace all members?',
                'This will delete ALL your current family members and replace them with the scanned data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Replace', style: 'destructive', onPress: () => handleImport('replace') },
                ]
              );
            }}>
              <View style={[styles.confirmOptionIcon, { backgroundColor: colors.danger + '20' }]}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </View>
              <View style={styles.confirmOptionInfo}>
                <Text style={[styles.confirmOptionTitle, { color: colors.danger }]}>Replace all members</Text>
                <Text style={styles.confirmOptionDesc}>
                  Deletes all your existing family members and replaces with this person.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setConfirmPayload(null)}>
              <Text style={styles.qrCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Expiry date picker sheet */}
      {expirySheet && selectedMember && (
        <ExpirySheet
          visible
          label={expirySheet.label}
          memberName={selectedMember.name}
          currentExpiry={expirySheet.currentExpiry}
          onSave={handleSaveExpiry}
          onClose={() => setExpirySheet(null)}
        />
      )}

      {/* Category picker for existing custom items */}
      <CategoryPickerSheet
        visible={!!categoryPicker}
        current={categoryPicker?.current ?? 'Custom'}
        onSelect={(cat) => {
          if (categoryPicker && selectedMember) {
            updateCustomItemCategory(categoryPicker.itemId, cat);
            setCategoryPicker(null);
            selectMember(selectedMember);
          }
        }}
        onClose={() => setCategoryPicker(null)}
      />

      {/* Rename custom item modal */}
      <Modal
        visible={!!renameItem}
        transparent
        animationType="slide"
        onRequestClose={() => { setRenameItem(null); setRenameLabel(''); }}
      >
        <KeyboardAvoidingView style={styles.modalKAV} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => { setRenameItem(null); setRenameLabel(''); }}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Rename Item</Text>
            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={renameLabel}
              onChangeText={setRenameLabel}
              placeholderTextColor={colors.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleRenameCustomItem}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setRenameItem(null); setRenameLabel(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleRenameCustomItem}
              >
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add custom item modal */}
      <Modal visible={addItemModal} transparent animationType="slide" onRequestClose={() => { setAddItemModal(false); setNewItemLabel(''); setNewItemCategory('Custom'); }}>
        <KeyboardAvoidingView style={styles.modalKAV} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setAddItemModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Custom Item</Text>
            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={newItemLabel}
              onChangeText={setNewItemLabel}
              placeholder="e.g. Insulin, spare glasses, radio"
              placeholderTextColor={colors.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomItem}
            />
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CUSTOM_CATEGORIES.map((cat) => {
                const active = newItemCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setNewItemCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => { setAddItemModal(false); setNewItemLabel(''); setNewItemCategory('Custom'); }}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleAddCustomItem}>
                <Text style={styles.modalBtnSaveText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add member modal */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={styles.modalKAV} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Family Member</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Nanay, Tatay, Baby Isko"
              placeholderTextColor={colors.textDim}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddMember}
            />
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(MEMBER_TYPE_ICONS) as MemberType[]).map((t) => {
                const active = newType === t;
                const color = MEMBER_TYPE_COLORS[t];
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeCard, active && { backgroundColor: color + '30', borderColor: color }]}
                    onPress={() => setNewType(t)}
                  >
                    <Ionicons name={MEMBER_TYPE_ICONS[t]} size={28} color={active ? color : colors.textSecondary} />
                    <Text style={[styles.typeCardText, active && { color }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setAddModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleAddMember}>
                <Text style={styles.modalBtnSaveText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800', letterSpacing: -0.5 },
  addMemberBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, minHeight: 44,
  },
  addMemberText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  emptySubtitle: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.md, minHeight: 52,
  },
  emptyAddText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  memberScroll: { flexGrow: 0 },
  memberRow: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'center' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  memberChipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },

  progressSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.textSecondary, fontSize: fontSize.md },
  progressActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressPercent: { fontSize: fontSize.md, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  sectionHeaderCount: { color: colors.textDim, fontSize: fontSize.sm },
  sectionAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: 2,
    marginBottom: spacing.xs,
  },
  sectionAddText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  customBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.full,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  customBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '700' },

  checkItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: spacing.xs, minHeight: 56,
  },
  checkItemExpired: { borderColor: colors.danger + '80', backgroundColor: colors.danger + '10' },
  checkItemExpiringSoon: { borderColor: colors.accent + '80', backgroundColor: colors.accent + '08' },
  checkbox: {
    width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkItemInfo: { flex: 1 },
  checkItemLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  checkItemLabel: { color: colors.text, fontSize: 16, lineHeight: 24 },
  checkItemLabelDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  checkItemNotes: { color: colors.textDim, fontSize: fontSize.sm, marginTop: 2 },
  setExpiryHint: { color: colors.textDim, fontSize: 10, marginTop: 2, fontStyle: 'italic' },

  // Expiry badge
  expiryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full,
  },
  expiryBadgeRed: { backgroundColor: colors.danger },
  expiryBadgeOrange: { backgroundColor: colors.accent },
  expiryBadgeText: { color: colors.white, fontSize: 10, fontWeight: '700' },

  customSection: { paddingBottom: spacing.xxl },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center',
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary + '60',
    borderStyle: 'dashed', padding: spacing.md, marginTop: spacing.sm, minHeight: 52,
  },
  addItemText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },

  // Modals
  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  expirySheetSubtitle: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: -spacing.xs },
  inputLabel: {
    color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, fontSize: fontSize.lg,
    padding: spacing.md, minHeight: 52,
  },
  typeGrid: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1, alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    paddingVertical: spacing.md, minHeight: 72, justifyContent: 'center',
  },
  typeCardText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: {
    flex: 1, borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', minHeight: 52, justifyContent: 'center',
  },
  modalBtnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.md },
  modalBtnSave: { backgroundColor: colors.primary },
  modalBtnSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
  modalBtnDanger: { backgroundColor: colors.danger + '20', borderWidth: 1, borderColor: colors.danger + '60', flex: 0, paddingHorizontal: spacing.md },
  modalBtnDangerText: { color: colors.danger, fontWeight: '700', fontSize: fontSize.md },

  // Header actions
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerIconBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },

  // QR share modal
  qrOverlay: {
    flex: 1, backgroundColor: '#000000BB',
    justifyContent: 'flex-end',
  },
  qrSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg,
    paddingBottom: spacing.xxl, gap: spacing.md,
  },
  qrSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  qrSheetTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  qrSheetSubtitle: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600', marginTop: 2 },
  qrWrap: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, alignSelf: 'center',
  },
  qrHint: {
    color: colors.textSecondary, fontSize: fontSize.sm,
    textAlign: 'center', lineHeight: 20,
  },
  qrSizeNote: { color: colors.textDim, fontSize: 10, textAlign: 'center' },
  qrCloseBtn: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, minHeight: 52, justifyContent: 'center',
  },
  qrCloseBtnText: { color: colors.text, fontWeight: '700', fontSize: fontSize.md },
  qrTooLargeWrap: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  qrTooLargeTitle: { color: colors.accent, fontSize: fontSize.lg, fontWeight: '700' },
  qrTooLargeBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },

  // Scanner
  scanContainer: { flex: 1, backgroundColor: '#000' },
  scanHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  scanTitle: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700' },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  scanFrame: {
    width: 240, height: 240, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.primary,
  },
  scanHint: {
    color: colors.white, textAlign: 'center',
    fontSize: fontSize.sm, padding: spacing.lg,
    backgroundColor: '#00000088',
  },

  // Confirm import
  confirmBody: {
    color: colors.textSecondary, fontSize: fontSize.md, lineHeight: 22,
  },
  confirmOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  confirmOptionDanger: { borderColor: colors.danger + '40' },
  confirmOptionIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.success + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  confirmOptionInfo: { flex: 1 },
  confirmOptionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  confirmOptionDesc: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2, lineHeight: 18 },

  // Category picker
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  catChipActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  catChipText: {
    color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600',
  },
  catChipTextActive: {
    color: colors.white,
  },
  catSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 52,
  },
  catSelectText: {
    color: colors.text, fontSize: fontSize.md, fontWeight: '600',
  },

  // Date picker
  datePicker: { width: '100%' },
  androidDateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 52,
  },
  androidDateText: { flex: 1, color: colors.text, fontSize: fontSize.md },
});
