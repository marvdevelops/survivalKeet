import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SectionList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { getAllMembers, addMember, deleteMember } from '../../src/services/membersService';
import {
  getChecklistForMember,
  toggleItem,
  resetChecklist,
  getCustomItemsForMember,
  addCustomItem,
  toggleCustomItem,
  deleteCustomItem,
  resetCustomItems,
  type ChecklistRow,
  type CustomChecklistItem,
} from '../../src/services/checklistService';
import type { Member, MemberType } from '../../src/db/schema';

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

interface SectionData {
  title: string;
  data: ChecklistRow[];
}

export default function ChecklistScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<MemberType>('adult');
  const [addItemModal, setAddItemModal] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [customItems, setCustomItems] = useState<CustomChecklistItem[]>([]);

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
    const items = getChecklistForMember(member.id);
    const custom = getCustomItemsForMember(member.id);
    setCustomItems(custom);
    const grouped: Record<string, ChecklistRow[]> = {};
    for (const item of items) {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    }
    setSections(
      Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([title, data]) => ({ title, data }))
    );
  }

  function handleToggle(mcId: number, currentChecked: number) {
    toggleItem(mcId, currentChecked === 0);
    if (selectedMember) selectMember(selectedMember);
  }

  function handleAddMember() {
    if (!newName.trim()) {
      Alert.alert('Name required', 'Please enter a name.');
      return;
    }
    addMember(newName.trim(), newType);
    setAddModal(false);
    setNewName('');
    setNewType('adult');
    loadMembers();
  }

  function handleDeleteMember(member: Member) {
    Alert.alert('Delete member?', `Remove ${member.name} and all their checklist data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { deleteMember(member.id); loadMembers(); },
      },
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
    addCustomItem(selectedMember.id, newItemLabel.trim());
    setNewItemLabel('');
    setAddItemModal(false);
    selectMember(selectedMember);
  }

  function handleDeleteCustomItem(item: CustomChecklistItem) {
    Alert.alert('Remove item?', item.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => {
          deleteCustomItem(item.id);
          if (selectedMember) selectMember(selectedMember);
        },
      },
    ]);
  }

  const totalItems = sections.reduce((s, sec) => s + sec.data.length, 0) + customItems.length;
  const checkedItems = sections.reduce((s, sec) => s + sec.data.filter((i) => i.checked === 1).length, 0)
    + customItems.filter((i) => i.checked === 1).length;
  const progress = totalItems > 0 ? checkedItems / totalItems : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Checklist</Text>
        <TouchableOpacity style={styles.addMemberBtn} onPress={() => setAddModal(true)}>
          <Ionicons name="person-add" size={20} color={colors.primary} />
          <Text style={styles.addMemberText}>Add</Text>
        </TouchableOpacity>
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
        <>
          {/* Member selector — larger chips */}
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
                  <Ionicons
                    name={MEMBER_TYPE_ICONS[m.type]}
                    size={16}
                    color={active ? colors.white : color}
                  />
                  <Text style={[styles.memberChipText, active && { color: colors.white }]}>
                    {m.name}
                  </Text>
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
            keyExtractor={(item) => String(item.mc_id)}
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
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.checkItem}
                onPress={() => handleToggle(item.mc_id, item.checked)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.checked === 1 && styles.checkboxChecked]}>
                  {item.checked === 1 && <Ionicons name="checkmark" size={16} color={colors.white} />}
                </View>
                <View style={styles.checkItemInfo}>
                  <Text style={[styles.checkItemLabel, item.checked === 1 && styles.checkItemLabelDone]}>
                    {item.label}
                  </Text>
                  {item.notes ? <Text style={styles.checkItemNotes}>{item.notes}</Text> : null}
                </View>
              </TouchableOpacity>
            )}
            ListFooterComponent={
              selectedMember ? (
                <View style={styles.customSection}>
                  {customItems.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>Custom</Text>
                        <Text style={styles.sectionHeaderCount}>
                          {customItems.filter((i) => i.checked === 1).length}/{customItems.length}
                        </Text>
                      </View>
                      {customItems.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.checkItem}
                          onPress={() => {
                            toggleCustomItem(item.id, item.checked === 0);
                            if (selectedMember) selectMember(selectedMember);
                          }}
                          onLongPress={() => handleDeleteCustomItem(item)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, item.checked === 1 && styles.checkboxChecked]}>
                            {item.checked === 1 && <Ionicons name="checkmark" size={16} color={colors.white} />}
                          </View>
                          <View style={styles.checkItemInfo}>
                            <Text style={[styles.checkItemLabel, item.checked === 1 && styles.checkItemLabelDone]}>
                              {item.label}
                            </Text>
                            <Text style={styles.checkItemNotes}>Long-press to remove</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  <TouchableOpacity style={styles.addItemBtn} onPress={() => setAddItemModal(true)}>
                    <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                    <Text style={styles.addItemText}>Add custom item</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      )}

      {/* Add custom item modal */}
      <Modal
        visible={addItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddItemModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setAddItemModal(false)}>
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
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                    <Ionicons
                      name={MEMBER_TYPE_ICONS[t]}
                      size={28}
                      color={active ? color : colors.textSecondary}
                    />
                    <Text style={[styles.typeCardText, active && { color }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setAddModal(false)}
              >
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800', letterSpacing: -0.5 },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  addMemberText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  emptySubtitle: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    minHeight: 52,
  },
  emptyAddText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },

  memberScroll: { flexGrow: 0 },
  memberRow: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, alignItems: 'center' },
  list: { flex: 1 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  memberChipText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },

  progressSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.textSecondary, fontSize: fontSize.md },
  progressActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressPercent: { fontSize: fontSize.md, fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderCount: { color: colors.textDim, fontSize: fontSize.sm },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.xs,
    minHeight: 56,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkItemInfo: { flex: 1 },
  checkItemLabel: { color: colors.text, fontSize: fontSize.md, lineHeight: 22 },
  checkItemLabelDone: { color: colors.textDim, textDecorationLine: 'line-through' },
  checkItemNotes: { color: colors.textDim, fontSize: fontSize.sm, marginTop: 2 },

  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.lg,
    padding: spacing.md,
    minHeight: 52,
  },
  typeGrid: { flexDirection: 'row', gap: spacing.sm },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    minHeight: 72,
    justifyContent: 'center',
  },
  typeCardText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.md },
  modalBtnSave: { backgroundColor: colors.primary },
  modalBtnSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },

  customSection: { paddingBottom: spacing.xxl },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary + '60',
    borderStyle: 'dashed',
    padding: spacing.md,
    marginTop: spacing.sm,
    minHeight: 52,
  },
  addItemText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '600' },
});
