import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { activateDms } from '../../services/dmsService';
import { colors, spacing, radius } from '../../theme';

// ─── Options ──────────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS: { label: string; value: 4 | 6 | 12 }[] = [
  { label: '4 hours',  value: 4  },
  { label: '6 hours',  value: 6  },
  { label: '12 hours', value: 12 },
];

const GRACE_OPTIONS: { label: string; value: 30 | 60 }[] = [
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface DmsConfigModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called immediately after DMS is activated — caller should reload context */
  onActivated: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DmsConfigModal({ visible, onClose, onActivated }: DmsConfigModalProps) {
  const [ownerName,  setOwnerName]  = useState('');
  const [interval,   setInterval]   = useState<4 | 6 | 12>(6);
  const [grace,      setGrace]      = useState<30 | 60>(30);
  const [activating, setActivating] = useState(false);

  const handleActivate = useCallback(async () => {
    if (!ownerName.trim() || activating) return;
    setActivating(true);
    try {
      await activateDms({
        owner_name:     ownerName.trim(),
        interval_hours: interval,
        grace_minutes:  grace,
      });
      onActivated();
      // Reset form for next time
      setOwnerName('');
      setInterval(6);
      setGrace(30);
    } catch { /* fail silently */ }
    setActivating(false);
  }, [ownerName, interval, grace, activating, onActivated]);

  const handleClose = useCallback(() => {
    setOwnerName('');
    setInterval(6);
    setGrace(30);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Set Up Check-In Timer</Text>

          <Text style={styles.fieldLabel}>Your name (used in alert message)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Juan dela Cruz"
            placeholderTextColor={colors.textDim}
            value={ownerName}
            onChangeText={setOwnerName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Text style={styles.fieldLabel}>Check-in interval</Text>
          <View style={styles.radioRow}>
            {INTERVAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.radioBtn, interval === opt.value && styles.radioBtnOn]}
                onPress={() => setInterval(opt.value)}
              >
                <Text style={[styles.radioBtnText, interval === opt.value && styles.radioBtnTextOn]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Grace period after missed check-in</Text>
          <View style={styles.radioRow}>
            {GRACE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.radioBtn, grace === opt.value && styles.radioBtnOn]}
                onPress={() => setGrace(opt.value)}
              >
                <Text style={[styles.radioBtnText, grace === opt.value && styles.radioBtnTextOn]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnGray]} onPress={handleClose}>
              <Text style={styles.btnGrayText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnRed,
                (!ownerName.trim() || activating) && styles.btnDisabled,
              ]}
              onPress={handleActivate}
              disabled={!ownerName.trim() || activating}
            >
              <Text style={styles.btnRedText}>
                {activating ? 'Activating…' : 'ACTIVATE'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: -spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 18,
    minHeight: 56,
  },
  radioRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  radioBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  radioBtnOn: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  radioBtnText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  radioBtnTextOn: {
    color: colors.white,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  btnGray: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGrayText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  btnRed: {
    backgroundColor: colors.danger,
  },
  btnRedText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '900',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
