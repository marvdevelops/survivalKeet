import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEmergency } from '../../src/context/EmergencyContext';
import { useTutorial } from '../../src/context/TutorialContext';
import { colors, spacing, fontSize, radius } from '../../src/theme';
import {
  getAllGuides,
  searchGuides,
  getCategories,
  getGuide,
} from '../../src/services/guidesService';
import type { Guide } from '../../src/db/schema';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  // 'Active Threat' sorts first alphabetically in the FlatList (SQL ORDER BY
  // category), so it surfaces near the top of the guides list.
  'Active Threat': 'warning',
  Earthquake: 'earth',
  Typhoon: 'thunderstorm',
  Flood: 'water',
  'Fire Safety': 'flame',
  'First Aid': 'medkit',
  Evacuation: 'exit',
  Survival: 'leaf',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Active Threat': '#E8452A', // matches the Active Threat tool branding
  Earthquake: '#8E44AD',
  Typhoon: '#2980B9',
  Flood: '#1ABC9C',
  'Fire Safety': '#E67E22',
  'First Aid': '#E74C3C',
  Evacuation: '#27AE60',
  Survival: '#D4AC0D',
};

function GuideDetail({ guide, onClose }: { guide: Guide; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const color = CATEGORY_COLORS[guide.category] ?? colors.primary;

  return (
    <SafeAreaView style={styles.detailSafe} edges={['bottom']}>
      <View style={[styles.detailHeader, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.detailCat, { color }]}>{guide.category}</Text>
      </View>

      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.detailTitle}>{guide.title}</Text>
        <Text style={styles.detailBody}>{guide.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function GuidesScreen() {
  const router = useRouter();
  const { emergencyMode } = useEmergency();
  const { onActionCompleted } = useTutorial();
  const { search: searchParam } = useLocalSearchParams<{ search?: string }>();

  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  useEffect(() => {
    setCategories(getCategories());
    setGuides(getAllGuides());
  }, []);

  // Auto-apply search param (e.g. search=CPR coming from the CPR timer)
  useEffect(() => {
    if (!searchParam?.trim()) return;
    setQuery(searchParam);
    setActiveCategory(null);
    const results = searchGuides(searchParam);
    setGuides(results);
    // Auto-open if there is exactly one match
    if (results.length === 1) {
      const guide = getGuide(results[0].id);
      if (guide) setSelectedGuide(guide);
    }
  }, [searchParam]);

  const runSearch = useCallback((q: string, cat: string | null) => {
    if (q.trim()) {
      setGuides(searchGuides(q));
    } else if (cat) {
      setGuides(getAllGuides().filter((g) => g.category === cat));
    } else {
      setGuides(getAllGuides());
    }
  }, []);

  function handleQueryChange(text: string) {
    setQuery(text);
    setActiveCategory(null);
    runSearch(text, null);
  }

  function handleCategoryPress(cat: string) {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    setQuery('');
    runSearch('', next);
  }

  function openGuide(id: number) {
    const guide = getGuide(id);
    if (guide) {
      setSelectedGuide(guide);
      // Tutorial: lesson 4 — read a guide
      onActionCompleted('guide_opened');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Guides</Text>

        {/* Search */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search guides..."
            placeholderTextColor={colors.textDim}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {query.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => handleQueryChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((cat) => {
            const active = activeCategory === cat;
            const color = CATEGORY_COLORS[cat] ?? colors.primary;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => handleCategoryPress(cat)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={CATEGORY_ICONS[cat] ?? 'document-text-outline'}
                  size={16}
                  color={active ? colors.white : color}
                />
                <Text style={[styles.categoryChipText, active && { color: colors.white }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Guides list */}
        <FlatList
          style={styles.list}
          data={guides}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.category] ?? colors.primary;
            return (
              <TouchableOpacity
                style={styles.guideCard}
                onPress={() => openGuide(item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.guideIconBox, { backgroundColor: color + '20' }]}>
                  <Ionicons
                    name={CATEGORY_ICONS[item.category] ?? 'document-text-outline'}
                    size={24}
                    color={color}
                  />
                </View>
                <View style={styles.guideInfo}>
                  <Text style={styles.guideCat}>{item.category}</Text>
                  <Text style={styles.guideTitle}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={40} color={colors.textDim} />
              <Text style={styles.emptyText}>No guides found</Text>
            </View>
          }
        />
      </View>

      {/* Back to Emergency bar — only shown when emergency mode is active */}
      {emergencyMode && (
        <TouchableOpacity
          style={styles.emergencyBackBar}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Ionicons name="warning" size={18} color="#FFFFFF" />
          <Text style={styles.emergencyBackText}>← Back to Emergency Mode</Text>
        </TouchableOpacity>
      )}

      {/* Guide detail full-screen modal */}
      <Modal
        visible={!!selectedGuide}
        animationType="slide"
        onRequestClose={() => setSelectedGuide(null)}
      >
        {selectedGuide && (
          <GuideDetail guide={selectedGuide} onClose={() => setSelectedGuide(null)} />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingTop: spacing.md, paddingHorizontal: spacing.md },
  title: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    minHeight: 52,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
  categoryScroll: { flexGrow: 0 },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    paddingRight: spacing.md,
    alignItems: 'center',
  },
  categoryChip: {
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
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  list: { flex: 1 },
  listContent: { paddingBottom: spacing.xxl },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 72,
  },
  guideIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideInfo: { flex: 1 },
  guideCat: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  guideTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 22,
  },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: fontSize.lg },

  // Emergency mode back bar
  emergencyBackBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#7B0000',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  emergencyBackText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },

  // Guide detail
  detailSafe: { flex: 1, backgroundColor: colors.background },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  backBtnText: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  detailCat: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailScroll: { flex: 1 },
  detailContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  detailTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    marginBottom: spacing.lg,
    lineHeight: 34,
  },
  detailBody: {
    color: colors.text,
    fontSize: fontSize.md,
    lineHeight: 28,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});
