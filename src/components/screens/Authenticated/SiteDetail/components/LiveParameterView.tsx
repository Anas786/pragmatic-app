/**
 * LiveParameterView — v4 (modern bento, crash-safe).
 *
 * Lessons baked in from previous iterations that crashed:
 *   - No per-tile `Animated.View` / `FadeInDown`. At 100+ tiles the
 *     concurrent worklets + Reanimated's commit hook recursing across
 *     the shadow tree triggered a `ShadowTree::commit` assertion abort
 *     (SIGABRT) on iOS. Tiles render as plain Views — they appear with
 *     React's normal mount and that's plenty modern.
 *   - No `layout=`/`LinearTransition` anywhere. Same reason — that's
 *     the path that ran `cloneShadowTreeWithNewPropsRecursive` deep on
 *     every tab change.
 *   - No `Surface elevation="md"` on tiles. iOS shadow rasterization is
 *     a per-tile offscreen pass; at 100+ tiles it has OOM'd the app.
 *     Depth comes from a tinted `LinearGradient` sweep + 1px border.
 *   - No `adjustsFontSizeToFit` — that does a synchronous text-measure
 *     on every render. `numberOfLines={1}` truncates instead.
 *   - `PressableScale` is used only on interactive controls (refresh,
 *     filter pills, sort chips, clear). The scale animation fires on
 *     press, not on mount/scroll, so it's bounded.
 *   - Single file. Prior subdirectory split made it hard to reason
 *     about which pieces were animated.
 *
 *  ┌────────────────────────────────────────────────┐
 *  │ ● LIVE METRICS · 142          [⟳]              │
 *  ├────────────────────────────────────────────────┤
 *  │ [🔍 Search…                          ✕]        │
 *  ├────────────────────────────────────────────────┤
 *  │ [All 142][Power 38][Voltage 22][Current 18]…   │
 *  │  Sort:  [Name][Value][Time]                    │
 *  ├────────────────────────────────────────────────┤
 *  │ ┌──────────┐ ┌──────────┐                      │
 *  │ │ ●POWER   │ │ ●POWER   │                      │
 *  │ │ Solar 1  │ │ Wind 2   │                      │
 *  │ │ 21,385   │ │ 462.86   │                      │
 *  │ │ 02:55am  │ │ 02:55am  │                      │
 *  │ └──────────┘ └──────────┘                      │
 *  └────────────────────────────────────────────────┘
 */

import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  AppTextInput,
  Dot,
  OverlineLabel,
  PressableScale,
  PulseDot,
  Skeleton,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  energyPalette,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_LG,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  tryNumber,
} from 'src/utils';
import { useInteractionReady, useParamsMapping, useSiteData } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { Close, Magnify, RefreshIcon } from 'src/assets/icons';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

type SortKey = 'name' | 'value' | 'time';

type CategoryKey =
  | 'all'
  | 'power'
  | 'voltage'
  | 'current'
  | 'energy'
  | 'temperature'
  | 'frequency'
  | 'other';

interface CategoryDef {
  key: CategoryKey;
  label: string;
  color: string;
  match: (name: string) => boolean;
}

interface LiveParameter {
  code: string;
  name: string;
  value: number | string | null | undefined;
  updateAt: number | undefined;
  category: CategoryKey;
  categoryColor: string;
  categoryLabel: string;
}

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  value: 'Value',
  time: 'Time',
};

const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

/**
 * Section-level entrance animation. Five wrappers max (header, search,
 * filter row, sort row, body) → at most five concurrent Reanimated
 * worklets on mount, which is the safe regime. Tuned for snappy
 * sub-tab switching — `duration.fast` + 30ms step lands the full
 * stagger in ~300ms instead of the original ~560ms.
 */
const stagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(duration.fast).springify().damping(20);

/* ─────────────── helpers ─────────────── */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const pickString = (
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return undefined;
};

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

const formatClockTime = (ms: number | undefined): string => {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '—';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  return `${pad(hours)}:${minutes} ${ampm}`;
};

const matchCategory = (
  name: string,
  categories: CategoryDef[],
): CategoryDef => {
  for (const c of categories) {
    if (c.key === 'all' || c.key === 'other') continue;
    try {
      if (c.match(name)) return c;
    } catch {
      // bad regex shouldn't poison the rest of the list
    }
  }
  return categories[categories.length - 1];
};

/* ─────────────── extraction ─────────────── */

const extractLiveParams = (
  liveData: unknown,
  mapping: unknown,
  categories: CategoryDef[],
): LiveParameter[] => {
  if (!isObject(liveData)) return [];
  const liveBranch = liveData.live;
  if (!isObject(liveBranch)) return [];
  const dataEnvelope = liveBranch.data;
  if (!isObject(dataEnvelope)) return [];
  const inner = dataEnvelope.live;
  if (!isObject(inner)) return [];

  const out: LiveParameter[] = [];
  for (const [code, entry] of Object.entries(inner)) {
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
    const name = resolveParamName(mapping, code) ?? code;
    const cat = matchCategory(name, categories);
    out.push({
      code,
      name,
      value,
      updateAt,
      category: cat.key,
      categoryColor: cat.color,
      categoryLabel: cat.label,
    });
  }
  return out;
};

/* ─────────────── child components (module-scope, no inline defs) ─────────────── */

interface ParamTileProps {
  param: LiveParameter;
  scheme: Scheme;
  themed: ReturnType<typeof useThemedStyles<ReturnType<typeof createStyles>>>;
}

const ParamTile: FC<ParamTileProps> = ({ param, scheme, themed }) => (
  <View style={themed.tile}>
    <LinearGradient
      colors={[param.categoryColor + '22', param.categoryColor + '00']}
      start={GRADIENT_TL}
      end={GRADIENT_BR}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    />
    <TintedPill color={param.categoryColor} alpha="24" row paddingY={3}>
      <Dot color={param.categoryColor} size={6} />
      <AppText fontSize={FONT_SIZE_XXS} bold color={param.categoryColor}>
        {param.categoryLabel.toUpperCase()}
      </AppText>
    </TintedPill>
    <AppText
      fontSize={FONT_SIZE_XXS}
      medium
      color={scheme.textTertiary}
      numberOfLines={2}
      style={styles.tileName}>
      {param.name}
    </AppText>
    <AppText
      fontSize={FONT_SIZE_LG}
      bold
      color={scheme.textPrimary}
      numberOfLines={1}>
      {formatValue(param.value)}
    </AppText>
    <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
      {formatClockTime(param.updateAt)}
    </AppText>
  </View>
);

interface SkeletonTileProps {
  themed: ReturnType<typeof useThemedStyles<ReturnType<typeof createStyles>>>;
}

/**
 * Placeholder card shown in the bento grid while the first-load fetch
 * is in flight. Matches the live tile's outer dimensions exactly so
 * the layout doesn't shift when real data arrives.
 */
const SkeletonTile: FC<SkeletonTileProps> = ({ themed }) => (
  <View style={themed.tile}>
    <Skeleton width={56} height={14} radius="pill" />
    <Skeleton width="80%" height={10} radius="sm" />
    <Skeleton width="60%" height={20} radius="sm" />
    <Skeleton width="40%" height={10} radius="sm" />
  </View>
);

interface FilterPillProps {
  active: boolean;
  color: string;
  label: string;
  count: number;
  onPress: () => void;
  scheme: Scheme;
  themed: ReturnType<typeof useThemedStyles<ReturnType<typeof createStyles>>>;
}

const FilterPill: FC<FilterPillProps> = ({
  active,
  color,
  label,
  count,
  onPress,
  scheme,
  themed,
}) => {
  const bg = active ? color : scheme.surface;
  const fg = active ? scheme.textOnBrand : scheme.textSecondary;
  const dotColor = active ? scheme.textOnBrand : color;
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.94}
      accessibilityLabel={`${label} filter, ${count} items`}
      style={[
        themed.filterPill,
        { backgroundColor: bg, borderColor: active ? color : scheme.hairline },
      ]}>
      <Dot color={dotColor} size={6} />
      <AppText fontSize={FONT_SIZE_XS} semi_bold color={fg}>
        {label}
      </AppText>
      <AppText fontSize={FONT_SIZE_XXS} color={fg} style={styles.filterCount}>
        {count}
      </AppText>
    </PressableScale>
  );
};

interface SortChipProps {
  active: boolean;
  label: string;
  onPress: () => void;
  scheme: Scheme;
  themed: ReturnType<typeof useThemedStyles<ReturnType<typeof createStyles>>>;
}

const SortChip: FC<SortChipProps> = ({
  active,
  label,
  onPress,
  scheme,
  themed,
}) => (
  <PressableScale
    onPress={onPress}
    haptic="select"
    scaleTo={0.94}
    accessibilityLabel={`Sort by ${label}`}
    style={active ? themed.sortChipActive : themed.sortChipInactive}>
    <AppText
      fontSize={FONT_SIZE_XXS}
      semi_bold
      color={active ? scheme.textOnBrand : scheme.textSecondary}>
      {label}
    </AppText>
  </PressableScale>
);

/* ─────────────── main component ─────────────── */

const LiveParameterView: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const { data: liveData, isLoading, isFetching, refetch } = useSiteData(siteId);
  const paramsMapping = useParamsMapping();
  // Defer the tile-grid mount so the tab-switch animation and the
  // (cheap) header always commit first. On first visit the user sees
  // the header + skeleton instantly, and the 100+ tiles arrive
  // ~120 ms later instead of blocking the JS thread mid-morph.
  const ready = useInteractionReady();

  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');

  const categories: CategoryDef[] = useMemo(
    () => [
      { key: 'all', label: 'All', color: scheme.brand, match: () => true },
      {
        key: 'power',
        label: 'Power',
        color: energyPalette.solar,
        match: n =>
          /\b(power|kw|kvar|kva|pf)\b/i.test(n) ||
          /\b(active|reactive|apparent)\b/i.test(n),
      },
      {
        key: 'voltage',
        label: 'Voltage',
        color: energyPalette.wind,
        match: n => /\b(volt|voltage|kv|^v\b)/i.test(n),
      },
      {
        key: 'current',
        label: 'Current',
        color: energyPalette.grid,
        match: n => /\b(current|amp|amps|^a\b)/i.test(n),
      },
      {
        key: 'energy',
        label: 'Energy',
        color: scheme.brand,
        match: n => /\b(energy|kwh|mwh|gwh)\b/i.test(n),
      },
      {
        key: 'temperature',
        label: 'Temp',
        color: energyPalette.genset,
        match: n => /(temp|temperature|°c|°f)/i.test(n),
      },
      {
        key: 'frequency',
        label: 'Freq',
        color: energyPalette.battery,
        match: n => /\b(freq|frequency|hz)\b/i.test(n),
      },
      {
        key: 'other',
        label: 'Other',
        color: scheme.textSecondary,
        match: () => true,
      },
    ],
    [scheme.brand, scheme.textSecondary],
  );

  const params = useMemo(
    () => extractLiveParams(liveData, paramsMapping, categories),
    [liveData, paramsMapping, categories],
  );

  const countsByCategory = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: params.length,
      power: 0,
      voltage: 0,
      current: 0,
      energy: 0,
      temperature: 0,
      frequency: 0,
      other: 0,
    };
    for (const p of params) counts[p.category] += 1;
    return counts;
  }, [params]);

  const visibleCategories = useMemo(
    () =>
      categories.filter(
        c => c.key === 'all' || countsByCategory[c.key] > 0,
      ),
    [categories, countsByCategory],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list =
      activeCategory === 'all'
        ? params
        : params.filter(p => p.category === activeCategory);
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name);
      if (sortKey === 'value') {
        const an =
          typeof a.value === 'number' ? a.value : Number.NEGATIVE_INFINITY;
        const bn =
          typeof b.value === 'number' ? b.value : Number.NEGATIVE_INFINITY;
        return bn - an;
      }
      return (b.updateAt ?? 0) - (a.updateAt ?? 0);
    });
    return sorted;
  }, [params, query, sortKey, activeCategory]);

  const clearSearch = useCallback(() => setQuery(''), []);

  /* ── render branches ───────────────────────────────────────── */

  let body: ReactNode;
  if (!ready || (isLoading && params.length === 0)) {
    // Render a 6-tile skeleton grid that mirrors the real bento layout
    // so the user sees the shape of what's about to land. Same
    // skeleton covers both the brief mount-defer window and the
    // first-load fetch.
    body = (
      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonTile key={i} themed={themed} />
        ))}
      </View>
    );
  } else if (params.length === 0) {
    body = (
      <View style={styles.statusBlock}>
        <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
          No live parameters available for this site.
        </AppText>
      </View>
    );
  } else if (filtered.length === 0) {
    body = (
      <View style={styles.statusBlock}>
        <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
          {query
            ? `No parameters match "${query}".`
            : 'Nothing in this category.'}
        </AppText>
      </View>
    );
  } else {
    body = (
      <View style={styles.grid}>
        {filtered.map(p => (
          <ParamTile key={p.code} param={p} scheme={scheme} themed={themed} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <Animated.View entering={stagger(0)} style={styles.header}>
        <View style={styles.headerLeft}>
          <PulseDot color={scheme.brand} size={8} />
          <OverlineLabel color={scheme.brand}>LIVE METRICS</OverlineLabel>
          <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary}>
            ·{' '}
            {filtered.length === params.length
              ? `${params.length}`
              : `${filtered.length} / ${params.length}`}
          </AppText>
        </View>
        <PressableScale
          onPress={() => refetch()}
          haptic="tap"
          disabled={isFetching}
          accessibilityLabel="Refresh live parameters"
          style={themed.refreshButton}>
          {isFetching ? (
            <ActivityIndicator size="small" color={scheme.brand} />
          ) : (
            <RefreshIcon size={ICON_SIZE_MD} color={scheme.brand} />
          )}
        </PressableScale>
      </Animated.View>

      {/* ── Search ── */}
      <Animated.View entering={stagger(1)} style={themed.searchBar}>
        <Magnify size={ICON_SIZE_MD} color={scheme.textTertiary} />
        <AppTextInput
          style={styles.searchInput}
          placeholder="Search parameters"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <PressableScale
            onPress={clearSearch}
            haptic="tap"
            hitSlop={8}
            accessibilityLabel="Clear search"
            style={styles.clearButton}>
            <Close size={ICON_SIZE_XS} color={scheme.textSecondary} />
          </PressableScale>
        ) : null}
      </Animated.View>

      {/* ── Category filter pills ── */}
      <Animated.View entering={stagger(2)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {visibleCategories.map(cat => (
            <FilterPill
              key={cat.key}
              active={activeCategory === cat.key}
              color={cat.color}
              label={cat.label}
              count={countsByCategory[cat.key]}
              onPress={() => setActiveCategory(cat.key)}
              scheme={scheme}
              themed={themed}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* ── Sort chips ── */}
      <Animated.View entering={stagger(3)} style={styles.sortRow}>
        <AppText
          fontSize={FONT_SIZE_XXS}
          medium
          color={scheme.textTertiary}
          style={styles.sortLabel}>
          Sort
        </AppText>
        {(Object.keys(SORT_LABELS) as SortKey[]).map(key => (
          <SortChip
            key={key}
            active={key === sortKey}
            label={SORT_LABELS[key]}
            onPress={() => setSortKey(key)}
            scheme={scheme}
            themed={themed}
          />
        ))}
      </Animated.View>

      {/* ── Body ── */}
      <Animated.View entering={stagger(4)}>{body}</Animated.View>
    </View>
  );
};

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  searchInput: {
    flex: 1,
  },
  clearButton: {
    padding: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 4,
  },
  filterCount: {
    marginLeft: 2,
    opacity: 0.85,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xs,
  },
  sortLabel: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  tileName: {
    minHeight: 28,
  },
  statusBlock: {
    paddingVertical: space['2xl'],
    alignItems: 'center',
    gap: space.sm,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: radiusTokens.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: scheme.brandSoft,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      height: 44,
      paddingHorizontal: space.md,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    filterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.md,
      paddingVertical: 8,
      borderRadius: radiusTokens.pill,
      borderWidth: 1,
    },
    sortChipActive: {
      paddingHorizontal: space.md,
      paddingVertical: 6,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
    },
    sortChipInactive: {
      paddingHorizontal: space.md,
      paddingVertical: 6,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: scheme.border,
    },
    tile: {
      flexBasis: '48%',
      flexGrow: 1,
      minHeight: 130,
      gap: 6,
      padding: space.lg,
      borderRadius: radiusTokens.xl,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      overflow: 'hidden',
    },
  });

export default React.memo(LiveParameterView);
