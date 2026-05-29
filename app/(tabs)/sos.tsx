import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import { getDb } from '../../src/db/database';
import { getEmergencyNumbers, detectCountryFromCoords, type EmergencyNumbers } from '../../src/data/emergencyNumbers';
import * as Location from 'expo-location';

// ── Custom contacts (SQLite) ─────────────────────────────────────────────────
interface CustomContact {
  id: number;
  label: string;
  number: string;
  note: string;
}

function ensureTable() {
  getDb().execSync(`CREATE TABLE IF NOT EXISTS custom_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    number TEXT NOT NULL,
    note TEXT DEFAULT ''
  )`);
}

function loadCustomContacts(): CustomContact[] {
  try {
    ensureTable();
    return getDb().getAllSync<CustomContact>('SELECT * FROM custom_contacts ORDER BY label ASC');
  } catch { return []; }
}

function saveCustomContact(label: string, number: string, note: string): void {
  ensureTable();
  getDb().runSync('INSERT INTO custom_contacts (label, number, note) VALUES (?, ?, ?)', label, number, note);
}

function deleteCustomContact(id: number): void {
  getDb().runSync('DELETE FROM custom_contacts WHERE id = ?', id);
}

function getStoredCountry(): string {
  try {
    const meta = getDb().getFirstSync<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = 'user_country'"
    );
    return meta?.value ?? '';
  } catch { return ''; }
}

function saveCountryCode(code: string): void {
  try {
    getDb().runSync(
      "INSERT OR REPLACE INTO app_meta (key, value) VALUES ('user_country', ?)",
      code
    );
  } catch {}
}

// Read the last GPS fix the Map screen persisted (survives OS cache eviction).
// Returns [lat, lng] or null.
function getStoredLastLocation(): [number, number] | null {
  try {
    const db = getDb();
    const lat = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'last_lat'");
    const lon = db.getFirstSync<{ value: string }>("SELECT value FROM app_meta WHERE key = 'last_lon'");
    if (lat && lon) {
      const latN = parseFloat(lat.value);
      const lonN = parseFloat(lon.value);
      if (Number.isFinite(latN) && Number.isFinite(lonN)) return [latN, lonN];
    }
    return null;
  } catch { return null; }
}

/**
 * Detect the user's country from last-known GPS position (no dialog, no crash).
 * Uses offline bounding-box lookup — no reverse geocode, no network.
 * Saves the result to app_meta so future visits are instant.
 */
async function detectAndSaveCountry(): Promise<string> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return '';

    // Prefer the OS position cache; fall back to the coords the Map screen saved.
    let lat: number | null = null;
    let lng: number | null = null;

    const pos = await Location.getLastKnownPositionAsync();
    if (pos) {
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } else {
      const stored = getStoredLastLocation();
      if (stored) { [lat, lng] = stored; }
    }

    if (lat === null || lng === null) return '';

    const code = detectCountryFromCoords(lat, lng);
    if (code) saveCountryCode(code);
    return code;
  } catch {
    return '';
  }
}

interface EmergencyLine {
  id: string;
  label: string;
  number: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}

const UNIVERSAL_LINES: EmergencyLine[] = [
  {
    id: 'intl',
    label: 'International Emergency',
    number: '112',
    icon: 'globe',
    color: '#E74C3C',
    description: 'Works on most mobile networks worldwide — even without SIM',
  },
  {
    id: 'redcross',
    label: 'Red Cross',
    number: '+800-4343-4357',
    icon: 'medkit',
    color: '#C0392B',
    description: 'International Red Cross humanitarian helpline',
  },
  {
    id: 'interpol',
    label: 'Interpol Emergency',
    number: '+1-202-616-9000',
    icon: 'shield-checkmark',
    color: '#2C3E50',
    description: 'For cross-border law enforcement emergencies',
  },
];

export default function SOSScreen() {
  const [customContacts, setCustomContacts] = useState<CustomContact[]>(() => loadCustomContacts());
  const [addModal, setAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newNote, setNewNote] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [localNumbers, setLocalNumbers] = useState<EmergencyNumbers | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    setCustomContacts(loadCustomContacts());

    const stored = getStoredCountry();
    if (stored) {
      setCountryCode(stored);
      setLocalNumbers(getEmergencyNumbers(stored));
    } else {
      // Country not yet cached — detect from last-known GPS position (safe, offline, no crash)
      detectAndSaveCountry().then((detected) => {
        if (active && detected) {
          setCountryCode(detected);
          setLocalNumbers(getEmergencyNumbers(detected));
        }
      });
    }

    return () => { active = false; };
  }, []));

  function handleCall(number: string, label: string) {
    const cleaned = number.replace(/[^0-9+]/g, '');
    Alert.alert(`Call ${label}?`, number, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${cleaned}`) },
    ]);
  }

  function handleAddContact() {
    if (!newLabel.trim() || !newNumber.trim()) {
      Alert.alert('Required', 'Please enter a name and phone number.');
      return;
    }
    saveCustomContact(newLabel.trim(), newNumber.trim(), newNote.trim());
    setCustomContacts(loadCustomContacts());
    setAddModal(false);
    setNewLabel('');
    setNewNumber('');
    setNewNote('');
  }

  function handleDeleteContact(contact: CustomContact) {
    Alert.alert('Delete contact?', contact.label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: () => { deleteCustomContact(contact.id); setCustomContacts(loadCustomContacts()); },
      },
    ]);
  }

  const hasDifferentLocalNumbers =
    localNumbers &&
    (localNumbers.primary !== '112' ||
      localNumbers.police !== '112' ||
      localNumbers.fire !== '112' ||
      localNumbers.ambulance !== '112');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>SOS</Text>
        <Text style={styles.subtitle}>
          {countryCode
            ? `Emergency numbers · ${countryCode}`
            : 'Emergency numbers · Worldwide'}
        </Text>

        {/* ── Primary emergency button (local if known, else 112) ─────────── */}
        {localNumbers && localNumbers.primary !== '112' ? (
          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => handleCall(localNumbers.primary, localNumbers.primaryLabel)}
            activeOpacity={0.8}
          >
            <View style={styles.emergencyBtnInner}>
              <Ionicons name="call" size={40} color={colors.white} />
              <View>
                <Text style={styles.emergencyBtnNumber}>{localNumbers.primary}</Text>
                <Text style={styles.emergencyBtnLabel}>{localNumbers.primaryLabel}</Text>
              </View>
            </View>
            <Text style={styles.emergencyBtnSub}>Your local emergency number · {countryCode}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.emergencyBtn}
            onPress={() => handleCall('112', 'International Emergency')}
            activeOpacity={0.8}
          >
            <View style={styles.emergencyBtnInner}>
              <Ionicons name="call" size={40} color={colors.white} />
              <View>
                <Text style={styles.emergencyBtnNumber}>112</Text>
                <Text style={styles.emergencyBtnLabel}>International Emergency</Text>
              </View>
            </View>
            <Text style={styles.emergencyBtnSub}>Works on most mobile networks worldwide · even without a SIM</Text>
          </TouchableOpacity>
        )}

        {/* ── Local breakdown (police / fire / ambulance) ─────────────────── */}
        {hasDifferentLocalNumbers && localNumbers && (
          <>
            <Text style={styles.sectionTitle}>Local Services · {countryCode}</Text>
            <View style={styles.card}>
              {[
                { label: 'Police', number: localNumbers.police, icon: 'shield-checkmark' as const, color: '#3498DB' },
                { label: 'Fire', number: localNumbers.fire, icon: 'flame' as const, color: '#E67E22' },
                { label: 'Ambulance', number: localNumbers.ambulance, icon: 'medical' as const, color: colors.danger },
              ].filter((item, idx, arr) => arr.findIndex(a => a.number === item.number) === idx).map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  {i > 0 && <View style={styles.separator} />}
                  <TouchableOpacity style={styles.contactRow} onPress={() => handleCall(item.number, item.label)} activeOpacity={0.7}>
                    <View style={[styles.contactIcon, { backgroundColor: item.color + '20' }]}>
                      <Ionicons name={item.icon} size={24} color={item.color} />
                    </View>
                    <Text style={styles.contactLabel}>{item.label}</Text>
                    <View style={styles.contactRight}>
                      <Text style={styles.contactNumber}>{item.number}</Text>
                      <Ionicons name="call-outline" size={18} color={colors.success} />
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* ── 112 fallback chip (when local number is shown above) ─────────── */}
        {localNumbers && localNumbers.primary !== '112' && (
          <TouchableOpacity
            style={styles.universalChip}
            onPress={() => handleCall('112', 'International Emergency')}
          >
            <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.universalChipText}>Also try 112 — works worldwide, even without SIM</Text>
          </TouchableOpacity>
        )}

        {/* ── International lines ───────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>International Lines</Text>
        <View style={styles.card}>
          {UNIVERSAL_LINES.map((item, idx) => (
            <React.Fragment key={item.id}>
              {idx > 0 && <View style={styles.separator} />}
              <TouchableOpacity style={styles.contactRow} onPress={() => handleCall(item.number, item.label)} activeOpacity={0.7}>
                <View style={[styles.contactIcon, { backgroundColor: item.color + '20' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>{item.label}</Text>
                  <Text style={styles.contactDesc}>{item.description}</Text>
                </View>
                <View style={styles.contactRight}>
                  <Text style={styles.contactNumber}>{item.number}</Text>
                  <Ionicons name="call-outline" size={18} color={colors.success} />
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Local tip ─────────────────────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.tipText}>
            {countryCode
              ? `Numbers shown for ${countryCode}. Save local contacts below for police, fire, and family.`
              : 'Enable location to see your local emergency numbers. Save local contacts below.'}
          </Text>
        </View>

        {/* ── Custom contacts ───────────────────────────────────────────────── */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>My Emergency Contacts</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {customContacts.length === 0 ? (
          <TouchableOpacity style={styles.emptyCard} onPress={() => setAddModal(true)}>
            <Ionicons name="person-add-outline" size={28} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              Add family, neighbors, or local{'\n'}emergency services for your area
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.card}>
            {customContacts.map((c, idx) => (
              <React.Fragment key={c.id}>
                {idx > 0 && <View style={styles.separator} />}
                <TouchableOpacity style={styles.contactRow} onPress={() => handleCall(c.number, c.label)} activeOpacity={0.7}>
                  <View style={[styles.contactIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="person" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactLabel}>{c.label}</Text>
                    {c.note ? <Text style={styles.contactDesc}>{c.note}</Text> : null}
                  </View>
                  <View style={styles.contactRight}>
                    <Text style={styles.contactNumber}>{c.number}</Text>
                    <TouchableOpacity onPress={() => handleDeleteContact(c)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Add contact modal ─────────────────────────────────────────────── */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Contact</Text>

            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.input} value={newLabel} onChangeText={setNewLabel}
              placeholder="e.g. Local Police, Family Member" placeholderTextColor={colors.textDim}
              autoFocus returnKeyType="next" />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput style={styles.input} value={newNumber} onChangeText={setNewNumber}
              placeholder="+1 555 123 4567" placeholderTextColor={colors.textDim}
              keyboardType="phone-pad" returnKeyType="next" />

            <Text style={styles.inputLabel}>Note (optional)</Text>
            <TextInput style={styles.input} value={newNote} onChangeText={setNewNote}
              placeholder="Neighbor, relative, local fire station..."
              placeholderTextColor={colors.textDim} returnKeyType="done" onSubmitEditing={handleAddContact} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setAddModal(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleAddContact}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
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
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.md, marginBottom: spacing.lg },

  emergencyBtn: {
    backgroundColor: colors.primaryDark, borderRadius: radius.xl,
    padding: spacing.lg, marginBottom: spacing.xl,
    borderWidth: 2, borderColor: colors.primary,
  },
  emergencyBtnInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xs },
  emergencyBtnNumber: { color: colors.white, fontSize: fontSize.display, fontWeight: '900', lineHeight: 40 },
  emergencyBtnLabel: { color: colors.white + 'CC', fontSize: fontSize.md, fontWeight: '600' },
  emergencyBtnSub: { color: colors.white + '99', fontSize: fontSize.sm, lineHeight: 18 },

  universalChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
    marginBottom: spacing.lg,
  },
  universalChipText: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 },

  sectionTitle: {
    color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, marginTop: spacing.md,
  },

  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg,
  },
  tipText: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1, lineHeight: 18 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border, minHeight: 44,
  },
  addBtnText: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md,
  },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md, minHeight: 72 },
  contactIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  contactInfo: { flex: 1 },
  contactLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  contactDesc: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 },
  contactRight: { alignItems: 'flex-end', gap: spacing.xs },
  contactNumber: { color: colors.success, fontSize: fontSize.md, fontWeight: '700' },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, borderStyle: 'dashed',
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md,
  },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },

  modalKAV: { flex: 1, justifyContent: 'flex-end' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm,
  },
  modalTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: '700' },
  inputLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    backgroundColor: colors.surfaceElevated, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, color: colors.text, fontSize: fontSize.lg, padding: spacing.md, minHeight: 52,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  modalBtn: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  modalBtnCancel: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  modalBtnCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: fontSize.md },
  modalBtnSave: { backgroundColor: colors.primary },
  modalBtnSaveText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },
});
