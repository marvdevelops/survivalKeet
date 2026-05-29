import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMembers } from '../db/members';
import { getMedicalInfo, saveMedicalInfo } from '../db/medicalInfo';
import { useEmergency } from '../context/EmergencyContext';
import { colors, spacing, fontSize, radius } from '../theme';
import type { Member } from '../db/schema';

// ─── Blood type options ───────────────────────────────────────────────────────

const BLOOD_TYPES = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
type BloodType = typeof BLOOD_TYPES[number];

// ─── Member type label/icon ───────────────────────────────────────────────────

const MEMBER_EMOJI: Record<Member['type'], string> = {
  adult: '👤',
  child: '👦',
  baby:  '👶',
  pet:   '🐾',
};

// ─── Per-member edit state ────────────────────────────────────────────────────

interface EditState {
  blood_type:    string;
  allergies:     string;
  conditions:    string;
  medications:   string;
  medical_notes: string;
  saving:        boolean;
  saved:         boolean;
}

function initialEditState(memberId: number): EditState {
  const info = getMedicalInfo(memberId);
  return {
    blood_type:    info.blood_type    || 'Unknown',
    allergies:     info.allergies     || '',
    conditions:    info.conditions    || '',
    medications:   info.medications   || '',
    medical_notes: info.medical_notes || '',
    saving:        false,
    saved:         false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MedicalInfoScreen() {
  const router  = useRouter();
  const { refreshPreparedness } = useEmergency();

  const [members] = useState<Member[]>(() => getMembers());

  // Which member cards are expanded
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Per-member form state
  const [editMap, setEditMap] = useState<Record<number, EditState>>(() => {
    const map: Record<number, EditState> = {};
    for (const m of getMembers()) {
      map[m.id] = initialEditState(m.id);
    }
    return map;
  });

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const updateField = useCallback(
    (memberId: number, field: keyof EditState, value: string) => {
      setEditMap((prev) => ({
        ...prev,
        [memberId]: { ...prev[memberId], [field]: value, saved: false },
      }));
    },
    []
  );

  const handleSave = useCallback(
    async (memberId: number) => {
      const s = editMap[memberId];
      if (!s || s.saving) return;

      setEditMap((prev) => ({ ...prev, [memberId]: { ...prev[memberId], saving: true } }));

      try {
        saveMedicalInfo(memberId, {
          blood_type:    s.blood_type === 'Unknown' ? '' : s.blood_type,
          allergies:     s.allergies,
          conditions:    s.conditions,
          medications:   s.medications,
          medical_notes: s.medical_notes,
        });
        await refreshPreparedness();
        setEditMap((prev) => ({
          ...prev,
          [memberId]: { ...prev[memberId], saving: false, saved: true },
        }));
      } catch {
        setEditMap((prev) => ({ ...prev, [memberId]: { ...prev[memberId], saving: false } }));
      }
    },
    [editMap, refreshPreparedness]
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Medical Info</Text>
          <Text style={styles.headerSub}>Shown during emergency mode</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {members.length === 0 ? (
          /* ── Empty state ── */
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No family members yet</Text>
            <Text style={styles.emptyBody}>
              Add family members in the Checklist tab first, then come back to fill in their medical information.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onPress={() => router.push('/(tabs)/checklist' as any)}
            >
              <Text style={styles.emptyBtnText}>Go to Checklist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          members.map((member) => {
            const isExpanded = !!expanded[member.id];
            const edit       = editMap[member.id];

            return (
              <View key={member.id} style={styles.memberCard}>
                {/* Card header — always visible */}
                <TouchableOpacity
                  style={styles.memberHeader}
                  onPress={() => toggleExpand(member.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.memberEmoji}>{MEMBER_EMOJI[member.type]}</Text>
                  <View style={styles.memberNameWrap}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberType}>{member.type}</Text>
                  </View>
                  {edit?.blood_type && edit.blood_type !== 'Unknown' && (
                    <View style={styles.bloodTypeBadge}>
                      <Text style={styles.bloodTypeText}>{edit.blood_type}</Text>
                    </View>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Expanded form */}
                {isExpanded && edit && (
                  <View style={styles.form}>
                    {/* Blood type chips */}
                    <Text style={styles.formLabel}>Blood Type</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.bloodTypeRow}
                    >
                      {BLOOD_TYPES.map((bt: BloodType) => (
                        <TouchableOpacity
                          key={bt}
                          style={[
                            styles.bloodTypeChip,
                            edit.blood_type === bt && styles.bloodTypeChipOn,
                          ]}
                          onPress={() => updateField(member.id, 'blood_type', bt)}
                        >
                          <Text style={[
                            styles.bloodTypeChipText,
                            edit.blood_type === bt && styles.bloodTypeChipTextOn,
                          ]}>
                            {bt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {/* Text fields */}
                    <Text style={styles.formLabel}>Allergies</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Penicillin, shellfish"
                      placeholderTextColor={colors.textDim}
                      value={edit.allergies}
                      onChangeText={(v) => updateField(member.id, 'allergies', v)}
                      multiline
                      numberOfLines={2}
                    />

                    <Text style={styles.formLabel}>Medical Conditions</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Asthma, hypertension"
                      placeholderTextColor={colors.textDim}
                      value={edit.conditions}
                      onChangeText={(v) => updateField(member.id, 'conditions', v)}
                      multiline
                      numberOfLines={2}
                    />

                    <Text style={styles.formLabel}>Medications</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Metformin 500mg twice daily"
                      placeholderTextColor={colors.textDim}
                      value={edit.medications}
                      onChangeText={(v) => updateField(member.id, 'medications', v)}
                      multiline
                      numberOfLines={2}
                    />

                    <Text style={styles.formLabel}>Notes</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Any other important medical info"
                      placeholderTextColor={colors.textDim}
                      value={edit.medical_notes}
                      onChangeText={(v) => updateField(member.id, 'medical_notes', v)}
                      multiline
                      numberOfLines={3}
                    />

                    <TouchableOpacity
                      style={[styles.saveBtn, edit.saving && styles.saveBtnDisabled]}
                      onPress={() => handleSave(member.id)}
                      disabled={edit.saving}
                      activeOpacity={0.85}
                    >
                      {edit.saved ? (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                          <Text style={styles.saveBtnText}>Saved</Text>
                        </>
                      ) : (
                        <Text style={styles.saveBtnText}>
                          {edit.saving ? 'Saving…' : 'Save Medical Info'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

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
  headerInfo: { flex: 1 },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // ── Keyboard avoiding ────────────────────────────────────────────────────────
  keyboardAvoiding: { flex: 1 },

  // ── Content ──────────────────────────────────────────────────────────────────
  content: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
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
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },

  // ── Member card ──────────────────────────────────────────────────────────────
  memberCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
  },
  memberEmoji: { fontSize: 28 },
  memberNameWrap: { flex: 1 },
  memberName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  memberType: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  bloodTypeBadge: {
    backgroundColor: colors.accent + '30',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bloodTypeText: {
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: '800',
  },

  // ── Form ─────────────────────────────────────────────────────────────────────
  form: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  formLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: -4,
  },
  formInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  bloodTypeRow: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  bloodTypeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  bloodTypeChipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  bloodTypeChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  bloodTypeChipTextOn: {
    color: '#000000',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    minHeight: 52,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});
