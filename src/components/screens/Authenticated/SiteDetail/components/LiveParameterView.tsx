/**
 * LiveParameterView — v5 (modern bento, crash-safe, render-cheap).
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
 * v5 additions (re-render + commit-size budget):
 *   - `ParamTile` is `React.memo`'d and receives only referentially
 *     stable props (`param`, `themed`); scheme colors come from its own
 *     `useScheme()` call. Keystrokes / pill taps / sort taps no longer
 *     re-render every mounted tile.
 *   - Display strings (`displayValue` / `displayTime`) and the per-tile
 *     gradient color pair are precomputed once per fetch inside
 *     `extractLiveParams` against ONE module-level `Intl.NumberFormat`.
 *     Hermes builds a fresh collator per `toLocaleString` call, so doing
 *     that inside 142 tile renders was pure waste — tiles now render
 *     plain strings with zero `Intl`/`Date` work.
 *   - The search `TextInput` stays instantly controlled, but the value
 *     that feeds `filtered` is a ~200 ms debounced copy — filtering
 *     142 params per keystroke is gone.
 *   - Tiles mount progressively: after `useInteractionReady`, a
 *     `requestAnimationFrame` counter reveals ~20 tiles per frame until
 *     all are shown, so no single React commit exceeds ~20 tiles. The
 *     counter resets when the category / search changes.
 *
 * Category selection:
 *   There is no "All" pill — the grid always shows exactly one category.
 *   The default is Energy, falling back to Power when the site reports no
 *   energy registers, and to the first non-empty category when it reports
 *   neither. Because that depends on data which isn't present on the first
 *   render, the default is DERIVED (see `activeCategory`) rather than
 *   seeded into `useState` — an effect would flash the wrong category for
 *   a frame before correcting itself.
 *
 *  ┌────────────────────────────────────────────────┐
 *  │ ● LIVE METRICS · 142          [⟳]              │
 *  ├────────────────────────────────────────────────┤
 *  │ [🔍 Search…                          ✕]        │
 *  ├────────────────────────────────────────────────┤
 *  │ [Energy 41][Power 38][Voltage 22][Current 18]… │
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
  useEffect,
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
  /** Precomputed in `extractLiveParams` — tiles render this verbatim. */
  displayValue: string;
  /** Precomputed in `extractLiveParams` — tiles render this verbatim. */
  displayTime: string;
  /** Precomputed `[tint, transparent]` pair for the tile's gradient sweep. */
  gradientColors: [string, string];
}

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  value: 'Value',
  time: 'Time',
};

const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

/** Debounce window between a search keystroke and the filter pass. */
const SEARCH_DEBOUNCE_MS = 200;

/** Max tiles added per frame during the progressive reveal (task 4). */
const MOUNT_CHUNK = 20;

/**
 * ONE shared formatter. On Hermes, `value.toLocaleString(undefined, opts)`
 * constructs a fresh `Intl.NumberFormat` per call — fine once, brutal
 * inside 142 tile renders. Hoisted to module scope and reused for every
 * parameter during extraction.
 */
const VALUE_FORMATTER = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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

/** Called once per parameter during extraction — never from render. */
const formatValue = (value: LiveParameter['value']): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return VALUE_FORMATTER.format(value);
  return String(value);
};

/** Called once per parameter during extraction — never from render. */
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
    if (c.key === 'other') continue;
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
      // Bake the display strings + gradient pair here, once per fetch,
      // so the (memoised) tiles do zero Intl/Date/concat work in render.
      displayValue: formatValue(value),
      displayTime: formatClockTime(updateAt),
      gradientColors: [cat.color + '22', cat.color + '00'],
    });
  }
  return out;
};

/* ─────────────── child components (module-scope, no inline defs) ─────────────── */

interface ParamTileProps {
  param: LiveParameter;
  themed: ReturnType<typeof useThemedStyles<ReturnType<typeof createStyles>>>;
}

/**
 * Memoised — both props are referentially stable (`param` objects survive
 * filter/sort re-shuffles; `themed` is a memoised StyleSheet), so search
 * keystrokes and pill/sort taps skip every already-mounted tile. Scheme
 * colors are read via the tile's own `useScheme()` (stable frozen object)
 * instead of a prop, so the memo doesn't depend on the parent's scheme.
 */
const ParamTile: FC<ParamTileProps> = React.memo(({ param, themed }) => {
  const scheme = useScheme();
  return (
    <View style={themed.tile}>
      <LinearGradient
        colors={param.gradientColors}
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
        {param.displayValue}
      </AppText>
      <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
        {param.displayTime}
      </AppText>
    </View>
  );
});

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

  const { data: liveData, isLoading, isFetching, isError, refetch } =
    useSiteData(siteId);
  const paramsMapping = useParamsMapping();
  // Defer the tile-grid mount so the tab-switch animation and the
  // (cheap) header always commit first. On first visit the user sees
  // the header + skeleton instantly; once interactions settle the
  // tiles stream in MOUNT_CHUNK per frame (see the chunked progressive
  // mount block below) instead of landing as one 100+-tile commit.
  const ready = useInteractionReady();

  const [query, setQuery] = useState('');
  // Debounced copy of `query` — the TextInput stays instantly controlled
  // while the (filter + sort over 100+ params) pass runs at most once per
  // SEARCH_DEBOUNCE_MS instead of per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  // null until the user taps a pill; `activeCategory` below resolves it
  // against the data-derived default (Energy → Power → first non-empty).
  const [pickedCategory, setPickedCategory] = useState<CategoryKey | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const categories: CategoryDef[] = useMemo(
    () => [
      // Energy is tested BEFORE power: standard meter registers like
      // "Active Energy Import (kWh)" / "Reactive Energy" must land in
      // Energy, not get claimed by a power keyword first. kvarh/kvah
      // (reactive/apparent energy registers) are energy too.
      {
        key: 'energy',
        label: 'Energy',
        color: scheme.brand,
        match: n => /\b(energy|kwh|mwh|gwh|kvarh|kvah)\b/i.test(n),
      },
      {
        key: 'power',
        label: 'Power',
        color: energyPalette.solar,
        // No bare active|reactive|apparent alternation — "Active Power"
        // already matches \bpower\b, and the bare words misclassified
        // energy/current registers ("Reactive Energy", "Reactive Current").
        match: n => /\b(power|kw|kvar|kva|pf)\b/i.test(n),
      },
      {
        key: 'voltage',
        label: 'Voltage',
        color: energyPalette.wind,
        // kv needs a trailing boundary or it claims kVArh/kVAh registers.
        match: n => /\b(volt|voltage|kv\b|^v\b)/i.test(n),
      },
      {
        key: 'current',
        label: 'Current',
        color: energyPalette.grid,
        match: n => /\b(current|amp|amps|^a\b)/i.test(n),
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
    () => categories.filter(c => countsByCategory[c.key] > 0),
    [categories, countsByCategory],
  );

  /**
   * Energy first, Power when the site has no energy registers, otherwise
   * the leftmost pill that actually has parameters. Null only while
   * `params` is empty (loading / no data), which the render branches above
   * the grid already handle.
   */
  const defaultCategory: CategoryKey | null = useMemo(() => {
    if (countsByCategory.energy > 0) return 'energy';
    if (countsByCategory.power > 0) return 'power';
    return visibleCategories[0]?.key ?? null;
  }, [countsByCategory, visibleCategories]);

  // A pick only survives while its category still has parameters — a
  // refetch that empties it also removes its pill, so honouring the stale
  // pick would strand the user on "Nothing in this category" with no pill
  // to tap back out of.
  const activeCategory: CategoryKey | null =
    pickedCategory && countsByCategory[pickedCategory] > 0
      ? pickedCategory
      : defaultCategory;

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    let list = activeCategory
      ? params.filter(p => p.category === activeCategory)
      : params;
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
  }, [params, debouncedQuery, sortKey, activeCategory]);

  const clearSearch = useCallback(() => setQuery(''), []);

  /* ── chunked progressive mount ─────────────────────────────────
   * A nested FlatList can't virtualise inside the parent SiteDetail
   * ScrollView (same orientation), so ALL filtered tiles used to land
   * in one commit. Instead, reveal them MOUNT_CHUNK at a time: the
   * counter advances one chunk per frame via requestAnimationFrame
   * until everything is mounted. Keyed on category + search so a
   * filter change resets the window synchronously (state-from-render
   * pattern) — no oversized intermediate commit. Sort changes keep
   * the window: tiles are already mounted, React just reorders them. */
  const revealKey = `${activeCategory}|${debouncedQuery}`;
  const [reveal, setReveal] = useState({ key: revealKey, count: MOUNT_CHUNK });
  if (reveal.key !== revealKey) {
    setReveal({ key: revealKey, count: MOUNT_CHUNK });
  }

  useEffect(() => {
    if (!ready || reveal.count >= filtered.length) return;
    const frame = requestAnimationFrame(() => {
      setReveal(s =>
        s.count >= filtered.length
          ? s
          : { ...s, count: Math.min(s.count + MOUNT_CHUNK, filtered.length) },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, reveal, filtered.length]);

  const visibleTiles = useMemo(
    () =>
      filtered.length > reveal.count
        ? filtered.slice(0, reveal.count)
        : filtered,
    [filtered, reveal.count],
  );

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
    // A failed fetch is NOT "no parameters available" — don't assert a
    // definitive empty state when we simply couldn't load the data.
    // The header refresh button also recovers, but an explicit retry
    // here is the discoverable path.
    body = (
      <View style={styles.statusBlock}>
        <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
          {isError
            ? "Couldn't load live parameters."
            : 'No live parameters available for this site.'}
        </AppText>
        {isError ? (
          <PressableScale
            onPress={() => refetch()}
            haptic="tap"
            accessibilityLabel="Retry loading live parameters"
            style={themed.retryButton}>
            <AppText fontSize={FONT_SIZE_XXS} semi_bold color={scheme.textOnBrand}>
              Retry
            </AppText>
          </PressableScale>
        ) : null}
      </View>
    );
  } else if (filtered.length === 0) {
    body = (
      <View style={styles.statusBlock}>
        <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
          {debouncedQuery
            ? `No parameters match "${debouncedQuery}".`
            : 'Nothing in this category.'}
        </AppText>
      </View>
    );
  } else {
    body = (
      <View style={styles.grid}>
        {visibleTiles.map(p => (
          <ParamTile key={p.code} param={p} themed={themed} />
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
              onPress={() => setPickedCategory(cat.key)}
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
    retryButton: {
      paddingHorizontal: space.xl,
      paddingVertical: space.sm,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
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
