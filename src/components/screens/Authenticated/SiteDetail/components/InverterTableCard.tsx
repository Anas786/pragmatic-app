import React, { FC, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroStatusBadge,
  HeroValueRow,
  OverlineLabel,
  Pill,
  PillGroup,
  Skeleton,
  Surface,
} from 'src/components/common';
import {
  duration,
  glass,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  useDateFilter,
  useInteractionReady,
  useInverterReport,
  useReportMapping,
} from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { inverterFilters, InverterFilterOption } from 'src/data/mock';
import { InverterReportRow } from 'src/networking';
import { formatClock } from 'src/utils/format';
import { friendlyError } from 'src/utils/errors';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  buildFleetHero,
  buildInverterRows,
  computeFleetStats,
  DEFAULT_INVERTER_SORT,
  FleetAggregate,
  INVERTER_SORT_OPTIONS,
  InverterSortMode,
  mapRowsToEntries,
  MOUNT_CHUNK,
  resolveYieldMeta,
  sortEntries,
  spokenPeriodLabel,
} from './InverterTable/helpers';
import { InverterRow } from './InverterTable/InverterCard';
import ReportFilterPill from './PerformanceReport/ReportFilterPill';
import { useSiteRefresh } from '../siteRefresh';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const EMPTY_ROWS: InverterReportRow[] = [];
/** Skeleton rows: enough to fill the first screen at the final row height. */
const SKELETON_ROWS = 6;
const ROW_SKELETON_H = 64;
/** Hero height with its usual content (badge, average, best/worst/total). */
const HERO_SKELETON_H = 264;

/**
 * Section-level entrance stagger for the static chrome (date header,
 * period pills). Mount-only: the content below stays mounted across
 * period changes (placeholder data), so these never replay on a filter
 * change.
 */
const tabStagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(180).springify().damping(20);

/**
 * Tables tab — "Inverter fleet" for the selected period:
 *
 *   DateFilterHeader ('Inverter fleet' + period pill + refresh)
 *   Period pills (PillGroup 'Date range type'; re-tap opens the picker)
 *   Hero  — FLEET · <period> · 'N inverters' · AVERAGE PR + status
 *           · ▲ best / ▼ worst / ▼ offline (0% PR or uptime) / total
 *   Sort  — Worst first (default) · Number · Energy
 *   List  — ONE Surface of compact inverter rows (hairline separators)
 *
 * Stats are honest: a missing PR / uptime is excluded (never coerced to
 * 0), a real 0 counts. The values are the backend's `inverter_queries`
 * fields as-is — the same ones the web portal's Inverter Table shows.
 * No LIVE / pulse anywhere: this is a period aggregate, so the hero
 * carries its period instead.
 */
const InverterTableCard: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  // Period lives in the per-site report-period store under 'tables', so it
  // survives tab switches independently of the Reports tab's period.
  const scope = useMemo(() => ({ siteId, card: 'tables' as const }), [siteId]);
  const {
    activeFilter,
    reportFilter,
    dateLabel,
    pillDisabled,
    handlePillPress,
    onFilterPress,
    dateRangePickerProps,
    monthPickerProps,
    yearPickerProps,
  } = useDateFilter(scope);

  const {
    data: reportData,
    refetch,
    isLoading,
    isFetching,
    isPlaceholderData,
    error,
    dataUpdatedAt,
  } = useInverterReport(siteId, reportFilter);
  const { data: reportMapping } = useReportMapping();
  // Defer the row mount so the chip-morph + hero render first.
  const ready = useInteractionReady();
  const [sortMode, setSortMode] = useState<InverterSortMode>(DEFAULT_INVERTER_SORT);

  const entries = useMemo(
    () => mapRowsToEntries(reportData?.data ?? EMPTY_ROWS),
    [reportData],
  );
  const stats = useMemo(() => computeFleetStats(entries), [entries]);
  const hero = useMemo(() => buildFleetHero(stats), [stats]);
  const yieldMeta = useMemo(() => resolveYieldMeta(reportMapping), [reportMapping]);
  // Display strings are built once per fetch / sort, not per row render.
  const rows = useMemo(
    () => buildInverterRows(sortEntries(entries, sortMode), yieldMeta),
    [entries, sortMode, yieldMeta],
  );

  /* ── chunked progressive mount ─────────────────────────────────
   * This list can't virtualise inside SiteDetail's ScrollView (same
   * orientation), so an unbounded fleet must not land in one Fabric
   * commit: reveal MOUNT_CHUNK rows per frame via a rAF counter
   * (LiveParameterView convention). Row keys are the inverter ids, which
   * are stable across periods and sorts, so the window only ever grows —
   * a period change re-renders the mounted rows in place (dimmed while
   * the new period loads) instead of unmounting them. */
  const [revealCount, setRevealCount] = useState(MOUNT_CHUNK);
  useEffect(() => {
    if (!ready || revealCount >= rows.length) return;
    const frame = requestAnimationFrame(() => {
      setRevealCount(c => (c >= rows.length ? c : Math.min(c + MOUNT_CHUNK, rows.length)));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, revealCount, rows.length]);
  const visibleRows = useMemo(
    () => (rows.length > revealCount ? rows.slice(0, revealCount) : rows),
    [rows, revealCount],
  );

  // The SiteDetail-wide refresh: this table + /data/all (siteRefresh.ts).
  const handleRefresh = useSiteRefresh(refetch);
  const periodHandlers = useMemo(
    () =>
      Object.fromEntries(inverterFilters.map(f => [f, () => onFilterPress(f)])) as Record<
        InverterFilterOption,
        () => void
      >,
    [onFilterPress],
  );
  const sortHandlers = useMemo(
    () =>
      Object.fromEntries(
        INVERTER_SORT_OPTIONS.map(o => [o.mode, () => setSortMode(o.mode)]),
      ) as Record<InverterSortMode, () => void>,
    [],
  );

  const friendly = useMemo(() => (error ? friendlyError(error) : null), [error]);
  const updatedText =
    !isPlaceholderData && dataUpdatedAt > 0 ? `Updated ${formatClock(dataUpdatedAt)}` : null;
  const heroMainA11y = updatedText
    ? `${hero.avgA11yLabel}. ${updatedText}`
    : hero.avgA11yLabel;

  const renderHero = () => (
    <Animated.View entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
      <HeroGradientCard>
        <View style={styles.heroTopRow}>
          <HeroStatusBadge
            mode="period"
            label="Fleet"
            periodLabel={dateLabel}
            updating={isPlaceholderData}
          />
          <GlassChip size="md">
            <AppText variant="caption" semi_bold tone="onHero" numberOfLines={1}>
              {hero.countLabel}
            </AppText>
          </GlassChip>
        </View>

        <View style={styles.heroMain} accessible accessibilityLabel={heroMainA11y}>
          <OverlineLabel color={scheme.heroOnGradientMuted}>AVERAGE PR</OverlineLabel>
          {hero.avgText !== null ? (
            <HeroValueRow>
              <AppText
                variant="h1"
                tone="onHero"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                style={styles.heroValueText}>
                {hero.avgText}
              </AppText>
              <AppText variant="bodyLg" medium tone="onHeroMuted">
                %
              </AppText>
              <View style={styles.heroStatusChip}>
                <GlassChip size="md">
                  <AppText variant="caption" semi_bold tone="onHero" numberOfLines={1}>
                    {hero.avgStatus.label}
                  </AppText>
                </GlassChip>
              </View>
            </HeroValueRow>
          ) : (
            <AppText variant="bodyLg" medium tone="onHero" style={styles.heroNoData}>
              No PR data for this period
            </AppText>
          )}
          {updatedText ? (
            <AppText variant="caption" tone="onHeroMuted">
              {updatedText}
            </AppText>
          ) : null}
        </View>

        <View style={styles.heroDivider} />

        {hero.best ? <AggRow glyph="▲" label="Best" item={hero.best} /> : null}
        {hero.worst ? <AggRow glyph="▼" label="Worst" item={hero.worst} /> : null}
        {hero.offlineText ? (
          <View style={styles.aggRow} accessible accessibilityLabel={hero.offlineA11yLabel ?? ''}>
            <View style={styles.aggLeft}>
              <AppText variant="caption" tone="onHero" style={styles.aggGlyph}>
                ▼
              </AppText>
              <AppText variant="caption" medium tone="onHeroMuted" numberOfLines={1}>
                Offline / 0% PR
              </AppText>
            </View>
            <AppText variant="bodySm" semi_bold tone="onHero" numberOfLines={1}>
              {hero.offlineText}
            </AppText>
          </View>
        ) : null}
        <View style={styles.aggRow} accessible accessibilityLabel={hero.totalA11yLabel}>
          <View style={styles.aggLeft}>
            <AppText variant="caption" medium tone="onHeroMuted" numberOfLines={1}>
              Total production
            </AppText>
          </View>
          <View style={styles.aggValue}>
            <AppText variant="bodySm" semi_bold tone="onHero" numberOfLines={1}>
              {hero.total.text}
            </AppText>
            {hero.total.unit ? (
              <AppText variant="caption" tone="onHeroMuted">
                {hero.total.unit}
              </AppText>
            ) : null}
          </View>
        </View>
      </HeroGradientCard>
    </Animated.View>
  );

  const renderSort = () => (
    <View style={styles.sortRow}>
      <AppText
        variant="caption"
        tone="secondary"
        importantForAccessibility="no"
        accessibilityElementsHidden>
        Sort by
      </AppText>
      <PillGroup label="Sort inverters">
        {INVERTER_SORT_OPTIONS.map(option => (
          <Pill
            key={option.mode}
            size="sm"
            label={option.label}
            selected={sortMode === option.mode}
            onPress={sortHandlers[option.mode]}
          />
        ))}
      </PillGroup>
    </View>
  );

  const renderRowSkeletons = (count: number) => (
    <Surface elevation="sm" radius="xl" background={scheme.surface} style={themed.listCard}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.skeletonRow, i > 0 ? themed.separator : null]}>
          <Skeleton width={28} height={28} radius="sm" />
          <View style={styles.skeletonMain}>
            <Skeleton width={96} height={14} />
            <Skeleton width={160} height={12} />
          </View>
          <View style={styles.skeletonSide}>
            <Skeleton width={44} height={14} />
            <Skeleton width={56} height={4} radius="pill" />
          </View>
        </View>
      ))}
    </Surface>
  );

  const renderList = () =>
    ready ? (
      <Surface elevation="sm" radius="xl" background={scheme.surface} style={themed.listCard}>
        {visibleRows.map((row, i) => (
          <InverterRow key={row.key} row={row} index={i} first={i === 0} />
        ))}
      </Surface>
    ) : (
      renderRowSkeletons(Math.min(SKELETON_ROWS, Math.max(1, rows.length)))
    );

  const renderBody = () => {
    // First load with nothing to show — or a period change whose
    // placeholder (the previous period) was itself empty, which must not
    // claim 'No inverter data' for the NEW period: skeletons with the
    // final layout's geometry (hero · sort row · rows).
    if ((isLoading && !reportData) || (isPlaceholderData && entries.length === 0)) {
      return (
        <View style={styles.content}>
          <Skeleton width="100%" height={HERO_SKELETON_H} radius="xl" />
          <Skeleton width={260} height={32} radius="pill" />
          {renderRowSkeletons(SKELETON_ROWS)}
        </View>
      );
    }
    // A failed BACKGROUND refetch sets `error` while react-query still
    // holds the previous data — keep that content; only an empty cache
    // gets the error card.
    if (friendly && !reportData) {
      return (
        <EmptyStateCard
          kind={friendly.kind === 'offline' ? 'offline' : 'error'}
          title={friendly.title}
          message={friendly.message}
          onRetry={handleRefresh}
          retryLabel="Retry"
        />
      );
    }
    if (entries.length === 0) {
      return (
        <EmptyStateCard
          kind="empty"
          title="No inverter data for this period"
          message="Pick another period above."
        />
      );
    }
    // Placeholder (previous period) data stays mounted — dimmed with a
    // STATIC opacity and marked 'Updating…' in the hero — until the new
    // period lands: no unmount, no entrance replay.
    return (
      <View
        style={isPlaceholderData ? styles.contentDimmed : styles.content}
        accessibilityState={{ busy: isPlaceholderData }}>
        {renderHero()}
        {renderSort()}
        {renderList()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={tabStagger(0)}>
        <DateFilterHeader
          title="Inverter fleet"
          dateLabel={dateLabel}
          dateA11yLabel={spokenPeriodLabel(dateLabel)}
          pillDisabled={pillDisabled}
          onDatePress={handlePillPress}
          onRefresh={handleRefresh}
          refreshing={isFetching}
        />
      </Animated.View>

      {/* Period pills sit directly under the date selector — they drive
          the API the hero summarises: control → snapshot → detail. */}
      <Animated.View entering={tabStagger(1)}>
        <PillGroup label="Date range type" style={styles.filterRow}>
          {inverterFilters.map(filter => (
            <ReportFilterPill
              key={filter}
              active={activeFilter === filter}
              label={filter}
              onPress={periodHandlers[filter]}
            />
          ))}
        </PillGroup>
      </Animated.View>

      {renderBody()}

      <DateRangePickerModal {...dateRangePickerProps} />
      <MonthYearPickerModal {...monthPickerProps} />
      <MonthYearPickerModal {...yearPickerProps} />
    </View>
  );
};

/* ─────────────── hero aggregate row ─────────────── */

/** '▲ Best · Inverter 6 ……… 83.5%' — ONE screen-reader element. */
const AggRow: FC<{ glyph: string; label: string; item: FleetAggregate }> = ({
  glyph,
  label,
  item,
}) => (
  <View style={styles.aggRow} accessible accessibilityLabel={item.a11yLabel}>
    <View style={styles.aggLeft}>
      <AppText variant="caption" tone="onHero" style={styles.aggGlyph}>
        {glyph}
      </AppText>
      <AppText variant="caption" medium tone="onHeroMuted">
        {label}
      </AppText>
      <AppText variant="bodySm" medium tone="onHero" numberOfLines={1} style={styles.aggName}>
        {item.title}
      </AppText>
    </View>
    <AppText variant="bodySm" semi_bold tone="onHero" numberOfLines={1}>
      {item.prText}
    </AppText>
  </View>
);
AggRow.displayName = 'AggRow';

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  content: {
    gap: space.md,
  },
  contentDimmed: {
    gap: space.md,
    opacity: 0.5,
  },
  filterRow: {
    paddingHorizontal: space.xs,
  },
  heroTopRow: {
    // Wraps (count chip drops to its own line) instead of overflowing
    // when the period badge is long at large text sizes.
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space.sm,
    rowGap: space.sm,
  },
  heroMain: {
    marginTop: space.lg,
  },
  heroValueText: {
    flexShrink: 1,
  },
  heroStatusChip: {
    alignSelf: 'center',
  },
  heroNoData: {
    marginTop: space.xs,
  },
  heroDivider: {
    height: 1,
    marginVertical: space.lg,
    backgroundColor: glass.borderSubtle,
  },
  aggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  aggLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  aggGlyph: {
    width: 12,
    textAlign: 'center',
  },
  aggName: {
    flexShrink: 1,
  },
  aggValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 0,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.sm,
    rowGap: space.xs,
    paddingHorizontal: space.xs,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: ROW_SKELETON_H,
    paddingHorizontal: space.lg,
  },
  skeletonMain: {
    flex: 1,
    gap: space.sm,
  },
  skeletonSide: {
    alignItems: 'flex-end',
    gap: space.sm,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    listCard: {
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: radiusTokens.xl,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: scheme.hairline,
    },
  });

export default InverterTableCard;
