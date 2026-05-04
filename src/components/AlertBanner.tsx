import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, radius } from '../theme';
import { getCachedAlerts, fetchAndCacheAlerts, getLastUpdated } from '../services/alertsService';
import type { Alert } from '../db/schema';

export function AlertBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    setAlerts(getCachedAlerts());
    setLastUpdated(getLastUpdated());
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setFetchError(null);
    const result = await fetchAndCacheAlerts();
    setAlerts(result.alerts);
    setFetchError(result.error);
    setFromCache(result.fromCache);
    setLastUpdated(getLastUpdated());
    setLoading(false);
  }

  if (alerts.length === 0 && !loading) {
    return (
      <TouchableOpacity style={styles.empty} onPress={refresh}>
        <Ionicons name="cloud-offline-outline" size={16} color={colors.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.emptyText}>No PAGASA alerts cached</Text>
          {fetchError ? (
            <Text style={styles.errorText}>{fetchError} — tap to retry</Text>
          ) : (
            <Text style={styles.emptySubText}>Tap to fetch latest</Text>
          )}
        </View>
        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const latest = alerts[0];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="warning" size={18} color={colors.accent} />
          <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
            {latest?.title ?? 'PAGASA Alerts'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <TouchableOpacity onPress={refresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
            style={{ marginLeft: spacing.sm }}
          />
        </View>
      </TouchableOpacity>

      {fetchError && (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={13} color={colors.textDim} />
          <Text style={styles.errorBannerText}>Showing cached — {fetchError}</Text>
        </View>
      )}

      {expanded && (
        <View style={styles.body}>
          {latest?.description ? (
            <Text style={styles.description}>{latest.description}</Text>
          ) : null}
          {alerts.length > 1 && (
            <Text style={styles.moreText}>{alerts.length - 1} more alert(s)</Text>
          )}
          {lastUpdated && (
            <Text style={styles.updated}>
              {fromCache ? 'Cached: ' : 'Updated: '}
              {formatDate(lastUpdated)}
            </Text>
          )}
        </View>
      )}

      {!expanded && lastUpdated && (
        <Text style={styles.updatedInline}>
          {fromCache ? 'Cached: ' : 'Updated: '}
          {formatDate(lastUpdated)}
        </Text>
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  moreText: {
    color: colors.accent,
    fontSize: fontSize.xs,
  },
  updated: {
    color: colors.textDim,
    fontSize: fontSize.xs,
  },
  updatedInline: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorBannerText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    flex: 1,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptySubText: {
    color: colors.textDim,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
