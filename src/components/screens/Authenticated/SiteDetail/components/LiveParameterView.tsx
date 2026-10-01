/**
 * LiveParameterView — v6 (honest ages, units, flat tiles, global search).
 *
 * Crash / perf lessons that still hold (see CLAUDE.md §11, §19):
 *   - No per-tile `Animated.View` / `entering`. At 100+ tiles concurrent
 *     worklets + Reanimated's commit hook triggered a `ShadowTree::commit`
 *     SIGABRT on iOS. Tiles are plain Views; only the four section
 *     wrappers below animate in.
 *   - No `layout=` / `LinearTransition` anywhere.
 *   - No `Surface elevation` on tiles (per-tile shadow rasterisation has
 *     OOM'd the app) — a flat surface + 1px border instead.
 *   - No `adjustsFontSizeToFit` (synchronous text measure per render). A
 *     long value steps down one size, decided once per fetch.
 *   - `ParamTile` is `React.memo`'d with props that are identity-stable per
 *     derivation: every display string (value, unit, age, a11y label) is
 *     precomputed in `extractLiveParams` (src/utils/liveParams.ts). No
 *     per-tile timers: ages are computed against `dataUpdatedAt`, re-anchored
 *     at most once per AGE_REANCHOR_MS (`AgeClock`) while the tab stays open
 *     without a refetch — so tiles turn stale alongside the header instead
 *     of saying 'Just now' forever.
 *   - Tiles mount progressively, MOUNT_CHUNK per frame, after
 *     `useInteractionReady`; the reveal restarts on category, search and
 *     sort changes so no single commit exceeds ~20 tiles.
 *   - Only two tiny memo'd children ride the shared 30 s `useNow` ticker:
 *     the header status line, and `AgeClock` (renders nothing; wakes the
 *     parent only when a 5-min bucket passes). The grid never re-renders
 *     per tick.
 *   - The status line reads the SAME site-level stamp as the SiteDetail
 *     header and Summary hero (`headerLastUpdate`: the web's 'last sync'
 *     first), so one fast-updating parameter can't make a delayed site
 *     pulse 'Live' here while the header says 'Delayed'.
 *   - A failed background refresh over cached readings is reported by THIS
 *     tab's one-line strip, worded exactly like the shell's
 *     RefreshStatusStrip. The shell yields on Live
 *     (`TABS_WITH_OWN_REFRESH_STATUS`, siteDetailModel.ts), so one failure
 *     shows one notice with one Retry.
 *
 * Categories: normal mode shows exactly one category (no 'All' pill) —
 * Energy, else Power, else the first non-empty one. A non-empty search
 * covers EVERY category: pills show match counts (0 → disabled), an 'All'
 * pill appears, the grid is grouped by category and tiles show their
 * category tag.
 *
 *  ┌────────────────────────────────────────────────┐
 *  │ Energy · 27 of 162                        [⟳]  │
 *  │ ● Live · 3 min ago                             │
 *  │ [🔍 Search parameters                     ✕]   │
 *  │ (Energy 27)(Power 64)(Voltage 3)… [≡ Sort: Name]│
 *  │ ┌──────────────┐ ┌──────────────┐              │
 *  │ │ PV Energy Day│ │ Energy       │              │
 *  │ │              │ │ Consumed     │              │
 *  │ │ 144,141.90kWh│ │ 1,188,328,1… │              │
 *  │ │ Just now     │ │ ◷ 2 h ago    │              │
 *  │ └──────────────┘ └──────────────┘              │
 *  └────────────────────────────────────────────────┘
 */

import React, {
  FC,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, View, ViewStyle } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  AppText,
  AppTextInput,
  EmptyStateCard,
  IconButton,
  Pill,
  PillGroup,
  PressableScale,
  PulseDot,
  Skeleton,
} from 'src/components/common';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  dataFreshness,
  formatRelativeTime,
  freshnessDot,
  freshnessSpoken,
  freshnessText,
  friendlyError,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
} from 'src/utils';
import {
  buildLiveGrid,
  buildParamUnitIndex,
  buildSiteParamNames,
  extractLiveParams,
  LIVE_CATEGORIES,
  LIVE_CATEGORY_LABEL,
  LIVE_SORT_LABEL,
  LIVE_SORT_SPOKEN,
  LiveCategoryKey,
  LiveParameter,
  LiveSearchScope,
  LiveSortKey,
  nextLiveSort,
} from 'src/utils/liveParams';
import {
  useInteractionReady,
  useNow,
  useParamsMapping,
  useSiteConfig,
  useSiteData,
} from 'src/hooks';
import { headerLastUpdate } from 'src/components/screens/Authenticated/SiteDetail/siteDetailModel';
import { DashboardStackParamList } from 'src/types';
import { Close, Magnify, RefreshIcon } from 'src/assets/icons';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;
type Themed = ReturnType<typeof createStyles>;

/** Debounce window between a search keystroke and the filter pass. */
const SEARCH_DEBOUNCE_MS = 200;

/** Max tiles added per frame during the progressive reveal. */
const MOUNT_CHUNK = 20;

/** Skeleton tiles — four rows, about one screenful. */
const SKELETON_TILES = 8;

/** Value size for numbers longer than LONG_VALUE_CHARS (else h3 = 18). */
const LONG_VALUE_FONT = 15;

/**
 * While the tab stays open without a refetch (useSiteData has no
 * refetchInterval), tile ages are re-derived at most this often — a tile
 * can't keep saying 'Just now' while the header reads 'Last data 20 min
 * ago'. One re-derivation re-renders the mounted tiles once, like a
 * refetch does.
 */
const AGE_REANCHOR_MS = 5 * 60_000;
const ageBucket = (ms: number) => Math.floor(ms / AGE_REANCHOR_MS) * AGE_REANCHOR_MS;

/** Refresh-failed copy — the same words as the shell's RefreshStatusStrip
 *  on every other tab. */
const STRIP_TEXT = {
  offline: 'Offline · showing the last data received',
  failed: "Couldn't refresh · showing the last data received",
} as const;

/**
 * Section-level entrance animation. Four wrappers (header, search,
 * controls, body) → at most four concurrent worklets on mount.
 */
const stagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(duration.fast).springify().damping(20);

/* ─────────────── tiles ─────────────── */

interface ParamTileProps {
  param: LiveParameter;
  /** Cross-category search results show which category a tile is in. */
  showCategory: boolean;
  themed: Themed;
}

/**
 * One accessible element. Props are identity-stable per fetch (`param`
 * objects survive filter / sort / search re-shuffles; `themed` is a
 * cached StyleSheet), so keystrokes and pill taps skip mounted tiles.
 */
const ParamTile: FC<ParamTileProps> = memo(({ param, showCategory, themed }) => {
  const scheme = useScheme();
  let valueColor = scheme.textPrimary;
  if (param.isMissing) valueColor = scheme.textTertiary;
  else if (param.implausible) valueColor = scheme.statusInk.warning;
  else if (param.stale) valueColor = scheme.textSecondary;
  const timeTone = param.updateAt === null ? 'tertiary' : param.stale ? 'warning' : 'secondary';
  return (
    <View
      style={themed.tile}
      accessible
      accessibilityLabel={
        showCategory ? `${param.a11yLabel}, ${param.categoryLabel}` : param.a11yLabel
      }>
      <View style={styles.tileTop}>
        {showCategory ? (
          <View style={themed.categoryTag}>
            <AppText variant="micro" tone="secondary" numberOfLines={1}>
              {param.categoryLabel}
            </AppText>
          </View>
        ) : null}
        <AppText variant="caption" medium tone="secondary" numberOfLines={2}>
          {param.name}
        </AppText>
      </View>
      <View style={styles.tileBottom}>
        <View style={styles.valueRow}>
          <AppText
            variant="h3"
            fontSize={param.longValue ? LONG_VALUE_FONT : undefined}
            color={valueColor}
            numberOfLines={2}
            style={styles.valueText}>
            {param.displayValue}
          </AppText>
          {param.displayUnit ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {param.displayUnit}
            </AppText>
          ) : null}
        </View>
        <View style={styles.timeRow}>
          {param.stale ? (
            <Icon name="schedule" size={12} color={scheme.statusInk.warning} />
          ) : null}
          <AppText variant="caption" tone={timeTone} numberOfLines={1} style={styles.shrink}>
            {param.displayTime}
          </AppText>
        </View>
      </View>
    </View>
  );
});
ParamTile.displayName = 'ParamTile';

/** Mirrors ParamTile's geometry so nothing shifts when data lands. */
const SkeletonTile: FC<{ themed: Themed }> = ({ themed }) => (
  <View style={themed.tile}>
    <View style={styles.tileTop}>
      <Skeleton width="85%" height={12} radius="sm" />
      <Skeleton width="55%" height={12} radius="sm" />
    </View>
    <View style={styles.tileBottom}>
      <Skeleton width="65%" height={20} radius="sm" />
      <Skeleton width="40%" height={12} radius="sm" />
    </View>
  </View>
);

/* ─────────────── header status ─────────────── */

/**
 * '● Live · 3 min ago' with the pulse while the site's last sync is live;
 * otherwise a static dot and 'Last data 41 min ago'. `lastUpdate` is the
 * SiteDetail header's stamp (`headerLastUpdate`), so both say the same
 * age. Rides the shared 30 s `useNow` ticker on its own, so the pulse
 * can't outlive the data.
 */
const LiveStatusLine: FC<{ lastUpdate: number | null }> = memo(({ lastUpdate }) => {
  const scheme = useScheme();
  const now = useNow();
  const fresh = dataFreshness(lastUpdate, now);
  const live = fresh.level === 'live';

  let text: string;
  if (live) text = freshnessText('live', fresh.ageMs, 'status', now);
  else if (fresh.ageMs === null || lastUpdate === null) text = 'Last update unknown';
  else text = `Last data ${formatRelativeTime(lastUpdate, now)}`;

  const dot = freshnessDot(fresh.level, scheme);
  const dotStyle = useMemo<ViewStyle>(
    () =>
      dot.hollow
        ? { ...styles.statusDot, borderWidth: 1.5, borderColor: dot.color }
        : { ...styles.statusDot, backgroundColor: dot.color },
    [dot.hollow, dot.color],
  );

  return (
    <View
      style={styles.statusRow}
      accessible
      accessibilityLabel={freshnessSpoken(fresh.level, fresh.ageMs, now)}>
      {live ? <PulseDot color={scheme.brand} size={8} /> : <View style={dotStyle} />}
      <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.shrink}>
        {text}
      </AppText>
    </View>
  );
});
LiveStatusLine.displayName = 'LiveStatusLine';

/**
 * Renders nothing. Rides the shared `useNow` ticker and reports the
 * current AGE_REANCHOR_MS bucket; the effect (and so the parent's state
 * update) only fires when the bucket changes — the parent re-renders at
 * most once per bucket, never per 30 s tick.
 */
const AgeClock: FC<{ onBucket: (bucket: number) => void }> = memo(({ onBucket }) => {
  const bucket = ageBucket(useNow());
  useEffect(() => {
    onBucket(bucket);
  }, [bucket, onBucket]);
  return null;
});
AgeClock.displayName = 'AgeClock';

/* ─────────────── sort control ─────────────── */

interface SortButtonProps {
  sortKey: LiveSortKey;
  onPress: () => void;
  themed: Themed;
}

/**
 * One compact control that cycles the five orders. The visible 'Sort:'
 * prefix keeps it from reading as another category chip in the same row.
 */
const SortButton: FC<SortButtonProps> = ({ sortKey, onPress, themed }) => {
  const scheme = useScheme();
  const a11yValue = useMemo(() => ({ text: LIVE_SORT_SPOKEN[sortKey] }), [sortKey]);
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.95}
      hitSlop={SORT_HIT_SLOP}
      accessibilityLabel={`Sort, ${LIVE_SORT_LABEL[sortKey]}`}
      accessibilityValue={a11yValue}
      accessibilityHint="Changes to the next sort order"
      style={themed.sortButton}>
      <Icon name="sort" size={16} color={scheme.textSecondary} />
      <AppText variant="bodySm" tone="secondary" numberOfLines={1}>
        Sort:
      </AppText>
      <AppText variant="bodySm" medium tone="primary" numberOfLines={1}>
        {LIVE_SORT_LABEL[sortKey]}
      </AppText>
    </PressableScale>
  );
};

const SORT_SLOP = Math.max(0, Math.ceil((touch.min - touch.pillVisual) / 2));
const SORT_HIT_SLOP = { top: SORT_SLOP, bottom: SORT_SLOP, left: 0, right: 0 };

/* ─────────────── main component ─────────────── */

const LiveParameterView: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const {
    data: liveData,
    dataUpdatedAt,
    error,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useSiteData(siteId);
  // Already observed (and prefetched) by SiteDetail — no extra request.
  const { data: siteConfig } = useSiteConfig(siteId);
  const paramsMapping = useParamsMapping();
  // Defer the tile grid so the tab-switch animation and the header commit
  // first; tiles then stream in MOUNT_CHUNK per frame.
  const ready = useInteractionReady();

  const [query, setQuery] = useState('');
  // Debounced copy of `query` feeds the (filter + sort over 100+ params)
  // pass at most once per SEARCH_DEBOUNCE_MS instead of per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortKey, setSortKey] = useState<LiveSortKey>('name');
  // null until the user picks; the grid model resolves it against the
  // data-derived default (Energy → Power → first non-empty).
  const [pickedCategory, setPickedCategory] = useState<LiveCategoryKey | null>(null);
  const [searchScope, setSearchScope] = useState<LiveSearchScope>('all');
  // Re-anchors tile ages every AGE_REANCHOR_MS (see AgeClock).
  const [ageAnchor, setAgeAnchor] = useState(() => ageBucket(Date.now()));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Every search starts across ALL categories: drop any narrowing when a
  // search begins or ends (state-from-render, no flash).
  const searching = debouncedQuery.trim() !== '';
  const [wasSearching, setWasSearching] = useState(searching);
  if (wasSearching !== searching) {
    setWasSearching(searching);
    setSearchScope('all');
  }

  /* ── per-fetch derivation ── */
  const siteNames = useMemo(() => buildSiteParamNames(siteConfig), [siteConfig]);
  const unitIndex = useMemo(
    () => buildParamUnitIndex(siteConfig, paramsMapping),
    [siteConfig, paramsMapping],
  );
  // Ages are "as of the fetch", re-anchored once a 5-min bucket passes
  // without a refetch — never later than the real clock.
  const ageNow = Math.max(dataUpdatedAt, ageAnchor);
  const params = useMemo(
    () =>
      extractLiveParams(liveData, {
        mapping: paramsMapping,
        siteNames,
        unitIndex,
        fetchNow: ageNow,
      }),
    [liveData, paramsMapping, siteNames, unitIndex, ageNow],
  );
  // The SiteDetail header's stamp (site-level 'last sync' first) — the
  // status line must not contradict the header right above it.
  const routeLastUpdate = route.params.dataLastUpdate;
  const lastUpdate = useMemo(
    () => headerLastUpdate(liveData, routeLastUpdate),
    [liveData, routeLastUpdate],
  );

  const grid = useMemo(
    () =>
      buildLiveGrid({
        params,
        query: debouncedQuery,
        pickedCategory,
        searchScope,
        sortKey,
      }),
    [params, debouncedQuery, pickedCategory, searchScope, sortKey],
  );

  /* ── handlers (stable) ── */
  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);
  const cycleSort = useCallback(() => setSortKey(nextLiveSort), []);
  const selectAllMatches = useCallback(() => setSearchScope('all'), []);
  const pickHandlers = useMemo(
    () =>
      Object.fromEntries(
        LIVE_CATEGORIES.map(c => [c.key, () => setPickedCategory(c.key)]),
      ) as Record<LiveCategoryKey, () => void>,
    [],
  );
  // While searching a pill narrows the results — and is also remembered
  // as the category to land on once the search is cleared.
  const scopeHandlers = useMemo(
    () =>
      Object.fromEntries(
        LIVE_CATEGORIES.map(c => [
          c.key,
          () => {
            setSearchScope(c.key);
            setPickedCategory(c.key);
          },
        ]),
      ) as Record<LiveCategoryKey, () => void>,
    [],
  );

  const friendly = useMemo(() => (error ? friendlyError(error) : null), [error]);

  /* ── chunked progressive mount ─────────────────────────────────
   * A nested FlatList can't virtualise inside the parent SiteDetail
   * ScrollView (same orientation), so tiles are revealed MOUNT_CHUNK at a
   * time, one chunk per frame. Keyed on category, search scope, query and
   * sort so any change restarts the window synchronously (state-from-
   * render) — no oversized intermediate commit. */
  const revealKey = `${grid.searching ? 's' : 'n'}|${grid.activeCategory}|${grid.scope}|${debouncedQuery}|${sortKey}`;
  const [reveal, setReveal] = useState({ key: revealKey, count: MOUNT_CHUNK });
  if (reveal.key !== revealKey) {
    setReveal({ key: revealKey, count: MOUNT_CHUNK });
  }
  const tileCount = grid.tiles.length;

  useEffect(() => {
    if (!ready || reveal.count >= tileCount) return;
    const frame = requestAnimationFrame(() => {
      setReveal(s =>
        s.count >= tileCount ? s : { ...s, count: Math.min(s.count + MOUNT_CHUNK, tileCount) },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, reveal, tileCount]);

  const visibleTiles = useMemo(
    () => (grid.tiles.length > reveal.count ? grid.tiles.slice(0, reveal.count) : grid.tiles),
    [grid.tiles, reveal.count],
  );

  /* ── render branches ── */

  // Refresh failed but cached readings exist: a one-line, non-blocking
  // strip (the shell's own strip stays off this tab while errored).
  const refreshFailed = isError && !isFetching && params.length > 0 && friendly;

  const loading = !ready || (isLoading && params.length === 0);
  let body: ReactNode;
  if (loading) {
    body = (
      <View style={styles.grid} accessible accessibilityLabel="Loading live parameters">
        {Array.from({ length: SKELETON_TILES }).map((_, i) => (
          <SkeletonTile key={i} themed={themed} />
        ))}
      </View>
    );
  } else if (params.length === 0) {
    // A failed fetch is NOT "no parameters" — say what happened instead.
    body =
      isError && friendly ? (
        <EmptyStateCard
          kind={friendly.kind === 'offline' ? 'offline' : 'error'}
          title={friendly.title}
          message={friendly.message}
          onRetry={handleRefresh}
          retryLabel="Retry"
        />
      ) : (
        <EmptyStateCard
          kind="empty"
          title="No live parameters"
          message="This site isn't reporting any live parameters yet."
        />
      );
  } else if (grid.tiles.length === 0) {
    body = grid.searching ? (
      <EmptyStateCard
        kind="noMatch"
        size="inline"
        title={`No parameters match "${debouncedQuery.trim()}"`}
        message="Check the spelling, or search by another name."
        onRetry={clearSearch}
        retryLabel="Clear search"
      />
    ) : (
      <EmptyStateCard kind="empty" size="inline" title="Nothing in this category" />
    );
  } else {
    body = (
      <View style={styles.grid}>
        {visibleTiles.map(p => (
          <ParamTile key={p.code} param={p} showCategory={grid.searching} themed={themed} />
        ))}
        {/* An odd last tile shares its row with an invisible twin, so it
            keeps the column width instead of stretching. */}
        {visibleTiles.length % 2 === 1 ? <View style={styles.tileSpacer} /> : null}
      </View>
    );
  }

  // Search + pills only make sense with parameters (or their skeleton,
  // so nothing jumps when the first fetch lands).
  const showControls = loading || params.length > 0;

  return (
    <View style={styles.container}>
      <AgeClock onBucket={setAgeAnchor} />
      {/* ── Header ── */}
      <Animated.View entering={stagger(0)} style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="h3" accessibilityRole="header" numberOfLines={2}>
            {grid.title}
          </AppText>
          {params.length > 0 ? <LiveStatusLine lastUpdate={lastUpdate} /> : null}
        </View>
        <IconButton
          variant="soft"
          onPress={handleRefresh}
          disabled={isFetching}
          busy={isFetching}
          accessibilityLabel="Refresh live parameters">
          {isFetching ? (
            <ActivityIndicator size="small" color={scheme.brandText} />
          ) : (
            <RefreshIcon size={ICON_SIZE_MD} color={scheme.brandText} />
          )}
        </IconButton>
      </Animated.View>

      {refreshFailed ? (
        <View style={themed.strip} accessibilityLiveRegion="polite">
          <AppText variant="caption" tone="secondary" numberOfLines={2} style={styles.shrink}>
            {STRIP_TEXT[friendly.kind === 'offline' ? 'offline' : 'failed']}
          </AppText>
          <PressableScale
            onPress={handleRefresh}
            accessibilityLabel="Retry"
            accessibilityHint="Refreshes the live parameters"
            style={styles.stripRetry}>
            <AppText variant="caption" semi_bold tone="brand">
              Retry
            </AppText>
          </PressableScale>
        </View>
      ) : null}

      {showControls ? (
        <>
          {/* ── Search ── */}
          <Animated.View entering={stagger(1)} style={themed.searchBar}>
            <Magnify size={ICON_SIZE_MD} color={scheme.textSecondary} />
            <AppTextInput
              style={styles.searchInput}
              placeholder="Search parameters"
              accessibilityLabel="Search parameters"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <PressableScale
                onPress={clearSearch}
                accessibilityLabel="Clear search"
                style={styles.clearButton}>
                <Close size={ICON_SIZE_XS} color={scheme.textSecondary} />
              </PressableScale>
            ) : null}
          </Animated.View>

          {/* ── Category pills + sort ── */}
          <Animated.View entering={stagger(2)} style={styles.controlsRow}>
            {params.length === 0 ? (
              <View style={styles.pillSkeletonRow}>
                <Skeleton width={96} height={touch.pillVisual} radius="pill" />
                <Skeleton width={88} height={touch.pillVisual} radius="pill" />
                <Skeleton width={96} height={touch.pillVisual} radius="pill" />
              </View>
            ) : (
              <>
                <PillGroup label="Parameter category" scroll style={styles.pillScroll}>
                  {grid.searching ? (
                    <Pill
                      key="all"
                      label="All"
                      count={grid.matchTotal}
                      selected={grid.scope === 'all'}
                      onPress={selectAllMatches}
                    />
                  ) : null}
                  {grid.categories.map(key => (
                    <Pill
                      key={key}
                      label={LIVE_CATEGORY_LABEL[key]}
                      count={grid.counts[key]}
                      selected={grid.searching ? grid.scope === key : grid.activeCategory === key}
                      disabled={grid.searching && grid.counts[key] === 0}
                      onPress={grid.searching ? scopeHandlers[key] : pickHandlers[key]}
                    />
                  ))}
                </PillGroup>
                <SortButton sortKey={sortKey} onPress={cycleSort} themed={themed} />
              </>
            )}
          </Animated.View>
        </>
      ) : null}

      {/* ── Body ── */}
      <Animated.View entering={stagger(3)}>{body}</Animated.View>
    </View>
  );
};

/* ─────────────── styles ─────────────── */

/** Tile flex-basis: low enough that two always fit beside the gap. */
const TILE_BASIS = '40%';

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.xs,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shrink: {
    flexShrink: 1,
  },
  stripRetry: {
    minHeight: touch.min,
    minWidth: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  searchInput: {
    flex: 1,
  },
  clearButton: {
    width: touch.min,
    height: touch.min,
    // The bar's right padding is space.md; pull the 44pt box flush with
    // the bar's edge so the icon keeps its old position.
    marginRight: -space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
  },
  pillScroll: {
    flex: 1,
  },
  pillSkeletonRow: {
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  tileSpacer: {
    flexBasis: TILE_BASIS,
    flexGrow: 1,
  },
  tileTop: {
    gap: space.xs,
  },
  tileBottom: {
    gap: 2,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space.xs,
  },
  valueText: {
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      minHeight: touch.min,
      paddingHorizontal: space.md,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
      borderWidth: 1,
      borderColor: scheme.borderStrong,
    },
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.sm,
      paddingLeft: space.md,
      borderRadius: radiusTokens.md,
      backgroundColor: scheme.statusSoft.warning,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.xs,
      minHeight: touch.pillVisual,
      minWidth: touch.min,
      paddingHorizontal: space.md,
      borderRadius: radiusTokens.pill,
      borderWidth: 1,
      borderColor: scheme.border,
      backgroundColor: scheme.surface,
    },
    tile: {
      // Two columns at any width: 2 × 40% + gap always fits, and grow
      // splits the rest evenly. An odd last tile gets a `tileSpacer` twin.
      flexBasis: TILE_BASIS,
      flexGrow: 1,
      minHeight: 100,
      justifyContent: 'space-between',
      gap: space.sm,
      padding: space.md,
      borderRadius: radiusTokens.lg,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
    },
    categoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
  });

export default memo(LiveParameterView);
