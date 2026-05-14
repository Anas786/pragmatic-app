import React, { FC, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useParamsMapping, useSiteData, useThemeStore } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { Close, Magnify, RefreshIcon } from 'src/assets/icons';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

type SortKey = 'name' | 'value' | 'time';

interface LiveParameter {
  /** Backend parameter code, e.g. "p10390". */
  code: string;
  /** UI label resolved via params-mapping, falls back to `code`. */
  name: string;
  /** Numeric reading when parseable, otherwise the raw value verbatim. */
  value: number | string | null | undefined;
  /** Epoch ms of the last update, or undefined when missing/unparseable. */
  updateAt: number | undefined;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Pick the first non-empty string field from a list of candidate keys. */
const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return undefined;
};

/**
 * Resolve a UI display name for a parameter code from the cached
 * params-mapping. Backend ships a flat `{ "p10436": "SVG 4 Active Power" }`
 * dictionary today; we still tolerate a richer object shape
 * (`{ display | displayName | name | label }`) so this stays safe if the
 * contract is ever upgraded without a mobile change.
 */
const resolveParamName = (
  mapping: unknown,
  code: string,
): string | undefined => {
  if (!isObject(mapping)) return undefined;
  const entry = mapping[code];
  if (typeof entry === 'string' && entry.trim() !== '') return entry;
  if (isObject(entry)) {
    return pickString(entry, ['display', 'displayName', 'name', 'label']);
  }
  return undefined;
};

const tryNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/**
 * Format a numeric value with thousands separators and 2 decimal places.
 * Non-numeric values pass through verbatim so the user can tell apart
 * "0.00" from a missing reading or a string status code from the device.
 */
const formatValue = (value: LiveParameter['value']): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return String(value);
};

/** Format an epoch-ms reading into "DD/MM/YYYY, hh:mm:ss am". */
const formatTime = (ms: number | undefined): string => {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Walk the live-data tree down to the per-parameter map. Backend shape:
 *   liveData.live.data.live = { p10390: { value, update_at }, ... }
 */
const extractLiveParams = (
  liveData: unknown,
  mapping: unknown,
): LiveParameter[] => {
  if (!isObject(liveData)) return [];
  const liveBranch = liveData.live;
  if (!isObject(liveBranch)) return [];
  const dataEnvelope = liveBranch.data;
  if (!isObject(dataEnvelope)) return [];
  const inner = dataEnvelope.live;
  if (!isObject(inner)) return [];

  return Object.entries(inner).map(([code, entry]) => {
    let value: LiveParameter['value'] = null;
    let updateAt: number | undefined;
    if (isObject(entry)) {
      const rawVal = entry.value;
      const num = tryNumber(rawVal);
      value = num !== undefined ? num : (rawVal as LiveParameter['value']);
      updateAt =
        tryNumber(entry.update_at) ??
        tryNumber((entry as Record<string, unknown>).updateAt);
    }
    return {
      code,
      name: resolveParamName(mapping, code) ?? code,
      value,
      updateAt,
    };
  });
};

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  value: 'Value',
  time: 'Time',
};

const LiveParameterView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const { data: liveData, isLoading, isFetching, refetch } = useSiteData(siteId);
  const paramsMapping = useParamsMapping();

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const params = useMemo(
    () => extractLiveParams(liveData, paramsMapping),
    [liveData, paramsMapping],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? params.filter(
          p =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q),
        )
      : params;

    const sorted = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'value') {
        const an = typeof a.value === 'number' ? a.value : Number.NEGATIVE_INFINITY;
        const bn = typeof b.value === 'number' ? b.value : Number.NEGATIVE_INFINITY;
        return bn - an;
      }
      // time: most recent first
      return (b.updateAt ?? 0) - (a.updateAt ?? 0);
    });
    return sorted;
  }, [params, query, sortKey]);

  const clearSearch = useCallback(() => setQuery(''), []);

  const renderBody = () => {
    if (isLoading && params.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.primaryText} />
          <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
            Loading live parameters...
          </AppText>
        </View>
      );
    }
    if (params.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center>
            No live parameters available for this site.
          </AppText>
        </View>
      );
    }
    if (filtered.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary} center>
            No parameters match "{query}".
          </AppText>
        </View>
      );
    }
    return (
      <View style={styles.list}>
        {filtered.map(p => (
          <View key={p.code} style={styles.row}>
            <View
              style={[
                styles.accentBar,
                { backgroundColor: ACCENT_BLUE },
              ]}
            />
            <View style={styles.rowMeta}>
              <AppText
                fontSize={FONT_SIZE_XS}
                medium
                color={colors.primaryText}
                numberOfLines={2}>
                {p.name}
              </AppText>
              <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                {formatTime(p.updateAt)}
              </AppText>
            </View>
            <View style={styles.rowValue}>
              <AppText
                fontSize={FONT_SIZE_SM}
                semi_bold
                color={colors.primaryText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {formatValue(p.value)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText
          fontSize={FONT_SIZE_SM}
          bold
          color={colors.primaryText}
          numberOfLines={1}
          style={styles.headerTitle}>
          Live Parameters
        </AppText>
        <View style={styles.headerActions}>
          {params.length > 0 ? (
            <View style={styles.countPill}>
              <AppText fontSize={FONT_SIZE_XXS} color={colors.dateFilterText}>
                {filtered.length === params.length
                  ? `${params.length}`
                  : `${filtered.length}/${params.length}`}
              </AppText>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Refresh live parameters"
            disabled={isFetching}>
            {isFetching ? (
              <ActivityIndicator size="small" color={ACCENT_GREEN} />
            ) : (
              <RefreshIcon size={ICON_SIZE_MD} color={ACCENT_GREEN} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Magnify size={ICON_SIZE_MD} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parameters"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={clearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search">
              <Close size={ICON_SIZE_XS} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sortRow}>
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            Sort by
          </AppText>
          {(Object.keys(SORT_LABELS) as SortKey[]).map(key => {
            const active = key === sortKey;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSortKey(key)}
                style={[
                  styles.sortChip,
                  active ? styles.sortChipActive : styles.sortChipInactive,
                ]}>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  medium
                  color={active ? colors.dateFilterText : colors.textSecondary}>
                  {SORT_LABELS[key]}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.body}>{renderBody()}</View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.inputDarkBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(14),
      gap: normalizeWidth(10),
    },
    headerTitle: {
      flexShrink: 1,
      flexGrow: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(8),
    },
    countPill: {
      backgroundColor: colors.dateFilterBg,
      paddingHorizontal: normalizeWidth(10),
      paddingVertical: normalizeHeight(4),
      borderRadius: 100,
    },
    refreshButton: {
      width: normalizeWidth(38),
      height: normalizeWidth(38),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: ACCENT_GREEN,
      borderRadius: 100,
    },
    toolbar: {
      backgroundColor: colors.inputDarkBg,
      paddingHorizontal: normalizeWidth(12),
      paddingBottom: normalizeHeight(12),
      gap: normalizeHeight(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.inputDarkBorder,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(12),
      height: normalizeHeight(38),
      gap: normalizeWidth(8),
    },
    searchInput: {
      flex: 1,
      color: colors.primaryText,
      fontSize: FONT_SIZE_XS,
      fontFamily: 'Poppins-Regular',
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(8),
      flexWrap: 'wrap',
    },
    sortChip: {
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(5),
      borderRadius: 100,
      borderWidth: 1,
    },
    sortChipActive: {
      backgroundColor: colors.dateFilterBg,
      borderColor: colors.dateFilterBg,
    },
    sortChipInactive: {
      backgroundColor: 'transparent',
      borderColor: colors.inputDarkBorder,
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
    },
    list: {
      gap: normalizeHeight(8),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      paddingVertical: normalizeHeight(12),
      paddingHorizontal: normalizeWidth(12),
      gap: normalizeWidth(12),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(36),
      borderRadius: 2,
    },
    rowMeta: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    rowValue: {
      alignItems: 'flex-end',
      gap: normalizeHeight(2),
      maxWidth: '40%',
    },
    statusContainer: {
      paddingVertical: normalizeHeight(40),
      alignItems: 'center',
      gap: normalizeHeight(8),
    },
  });

export default LiveParameterView;
