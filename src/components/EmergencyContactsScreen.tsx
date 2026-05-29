import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getEmergencyContacts,
  addEmergencyContact,
  removeEmergencyContact,
} from '../db/emergencyContacts';
import { useEmergency } from '../context/EmergencyContext';
import { useTutorial } from '../context/TutorialContext';
import { colors, spacing, fontSize, radius } from '../theme';
import type { EmergencyContact } from '../types/emergency';

// ─── Component ────────────────────────────────────────────────────────────────

export function EmergencyContactsScreen() {
  const router = useRouter();
  const { reload } = useEmergency();
  const { onActionCompleted } = useTutorial();

  const [contacts, setContacts] = useState<EmergencyContact[]>(
    () => getEmergencyContacts()
  );

  // ── Add modal ────────────────────────────────────────────────────────────────
  const [addModal, setAddModal] = useState(false);
  const [name,     setName]     = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const refresh = useCallback(() => {
    setContacts(getEmergencyContacts());
  }, []);

  const openAddModal = useCallback(() => {
    setName('');
    setPhone('');
    setAddModal(true);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!name.trim() || !phone.trim() || saving) return;
    setSaving(true);
    try {
      addEmergencyContact(name.trim(), phone.trim());
      refresh();
      await reload();
      onActionCompleted('emergency_contact_added');
      setAddModal(false);
    } catch { /* fail silently */ }
    setSaving(false);
  }, [name, phone, saving, refresh, reload]);

  const handleDelete = useCallback(
    (id: number, contactName: string) => {
      Alert.alert(
        'Remove Contact',
        `Remove ${contactName} from emergency contacts?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeEmergencyContact(id);
              refresh();
              reload().catch(() => null);
            },
          },
        ]
      );
    },
    [refresh, reload]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        {contacts.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{contacts.length}</Text>
          </View>
        )}
      </View>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {contacts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={56} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptyBody}>
              Add people who should be alerted if you stop checking in. They'll receive a text message with your last known location.
            </Text>
          </View>
        ) : (
          contacts.map((c) => (
            <View key={c.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitial}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{c.name}</Text>
                <Text style={styles.cardPhone}>{c.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(c.id, c.name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            When the Dead Man's Switch fires, an SMS containing your GPS coordinates is sent to every contact listed above.
          </Text>
        </View>
      </ScrollView>

      {/* ── Footer add button ────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add" size={22} color={colors.white} />
          <Text style={styles.addBtnText}>Add Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      {/* ═══ ADD CONTACT MODAL ══════════════════════════════════════════════════ */}
      <Modal
        visible={addModal}
        transparent
        animationType="slide"
        onRequestClose={() => { Keyboard.dismiss(); setAddModal(false); }}
      >
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalSheet}>
                  <Text style={styles.modalTitle}>Add Emergency Contact</Text>

                  <Text style={styles.modalLabel}>Full name</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Maria Santos"
                    placeholderTextColor={colors.textDim}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />

                  <Text style={styles.modalLabel}>Phone number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="+63 900 000 0000"
                    placeholderTextColor={colors.textDim}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.modalBtnGray]}
                      onPress={() => { Keyboard.dismiss(); setAddModal(false); }}
                    >
                      <Text style={styles.modalBtnGrayText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalBtn,
                        styles.modalBtnRed,
                        (!name.trim() || !phone.trim() || saving) && styles.modalBtnDisabled,
                      ]}
                      onPress={handleAdd}
                      disabled={!name.trim() || !phone.trim() || saving}
                    >
                      <Text style={styles.modalBtnRedText}>
                        {saving ? 'Saving…' : 'SAVE'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
    minHeight: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    minWidth: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  // ── List ────────────────────────────────────────────────────────────────────
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 72,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.danger,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  cardInfo: { flex: 1 },
  cardName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  cardPhone: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    minHeight: 56,
    padding: spacing.md,
  },
  addBtnText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '800',
  },

  // ── Add modal ────────────────────────────────────────────────────────────────
  modalKAV: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: -spacing.xs,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 52,
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
  modalBtnGray: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnGrayText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  modalBtnRed: { backgroundColor: colors.danger },
  modalBtnRedText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '900',
  },
  modalBtnDisabled: { opacity: 0.4 },
});
