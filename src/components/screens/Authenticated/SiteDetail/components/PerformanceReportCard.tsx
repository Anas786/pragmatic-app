import React, { FC, memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import RNEChartsPro from 'react-native-echarts-pro';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroStatusBadge,
  HeroValueRow,
  IconButton,
  OverlineLabel,
  PillGroup,
  PowerMixBar,
  Skeleton,
} from 'src/components/common';
import { duration, glass, space, useScheme } from 'src/theme';
import { useDateFilter, useEnergyReport, useInteractionReady, useReportMapping } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { inverterFilters, InverterFilterOption } from 'src/data/mock';
import { EnergyReportRow } from 'src/networking';
import { formatClock } from 'src/utils/format';
import { formatNoProductionCaption } from 'src/utils/reports';
import { formatEnergy } from 'src/utils/units';
import { friendlyError } from 'src/utils/errors';
import { WEBVIEW_SETTINGS } from './chartConfig';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  aggregateEnergy,
  AggregatedSource,
  buildEnergyChartSummary,
  buildStackData,
  EnergyStackData,
  heroMixLabel,
  reportingSources,
  sourceCountLabel,
  spokenHeroMixLabel,
  spokenPeriod,
} from './PerformanceReport/helpers';
import {
  buildReportStackBarOption,
  reportChartThemeFromScheme,
} from './PerformanceReport/echartsReportOption';
import ReportFilterPill from './PerformanceReport/ReportFilterPill';
import SourceRow from './PerformanceReport/SourceRow';
import SectionCard from './PerformanceReport/SectionCard';
import ChartFullscreenModal from './ChartFullscreenModal';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const BAR_HEIGHT = 280;
/** Landscape chrome the fullscreen viewer reserves around the chart
 *  (safe-area paddings + header) — only sizes the legend-row estimate. */
const FULLSCREEN_CHROME_W = 120;
const EMPTY_ROWS: EnergyReportRow[] = [];
// Placeholder fed to the (closed) fullscreen modal before its detailed
// option is built — its chart only mounts while visible.
const EMPTY_CHART_OPTION = {};
const LEGEND_HINT = 'Tap a source in the legend to show or hide it';

/**
 * Section-level entrance stagger for the static chrome (date header,
 * filter pills). Snappy ~270ms total so sub-tab switching feels swift.
 * Mount-only: the content below stays mounted across period changes
 * (placeholder data), so these never replay on a filter change.
 */
const tabStagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(180).springify().damping(20);

interface ReportChartProps {
  option: object;
  height: number;
}

/**
 * Memoized RNEChartsPro host. The library rebuilds its injected JS +
 * inline-HTML source (~2MB of throwaway strings, embedding the full
 * echarts bundle) on EVERY render — so parent re-renders (pickers,
 * fullscreen toggles, the 'Updating…' dim) must not reach it. `option`
 * is memoized upstream, so this bails out unless the chart changes; a
 * new option is posted into the SAME WebView (no reload).
 */
const ReportChart = memo<ReportChartProps>(({ option, height }) => (
  <RNEChartsPro
    height={height}
    option={option}
    backgroundColor="transparent"
    enableParseStringFunction
    webViewSettings={WEBVIEW_SETTINGS}
  />
));
ReportChart.displayName = 'ReportChart';

/**
 * Reports tab — "Energy mix" for the selected period:
 *
 *   DateFilterHeader ('Energy mix' + period pill + refresh)
 *   Period pills (PillGroup 'Date range type'; re-tap opens the picker)
 *   Hero      — period badge · source count · TOTAL ENERGY · 'Updated hh:mm'
 *               · POWER MIX bar + 'Mostly Solar · 100%'
 *   Sources   — one read-only row per reporting source (value, share, bar)
 *   Energy over time — ONE stacked-bar WebView (outage-honest buckets),
 *               fullscreen entry, 'N days with no production' caption
 *
 * Every value is the backend's, summed exactly as before (see
 * utils/aggregations.ts); this card only changes presentation.
 */
const PerformanceReportCard: FC = () => {
  const scheme = useScheme();
  const { width: windowW, height: windowH } = useWindowDimensions();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  const [fullscreen, setFullscreen] = useState(false);

  // Period selection lives in the per-site report-period store, so
  // 'August 2026' survives a switch to Tables and back.
  const scope = useMemo(() => ({ siteId, card: 'reports' as const }), [siteId]);
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
  } = useEnergyReport(siteId, reportFilter);
  const { data: reportMapping } = useReportMapping();
  // Defer the chart WebView so the chip-morph and hero render first.
  const ready = useInteractionReady();

  // The period the ON-SCREEN data belongs to. While placeholder data (the
  // previous period) is shown, axis labels / summaries keep describing
  // that period, not the newly-selected one ('adjust state during render').
  const [settled, setSettled] = useState(() => ({ pill: activeFilter, label: dateLabel }));
  if (
    reportData &&
    !isPlaceholderData &&
    (settled.pill !== activeFilter || settled.label !== dateLabel)
  ) {
    setSettled({ pill: activeFilter, label: dateLabel });
  }

  const rows = reportData?.data ?? EMPTY_ROWS;

  const aggregated = useMemo<AggregatedSource[]>(
    () => aggregateEnergy(rows, reportMapping),
    [rows, reportMapping],
  );
  const stack = useMemo<EnergyStackData>(
    () => buildStackData(rows, settled.pill),
    [rows, settled.pill],
  );

  // Hero total: the same sum as ever (every source bucket, unchanged).
  const grandTotal = aggregated.reduce((acc, s) => acc + s.value, 0);
  const hasData = aggregated.some(s => s.hasData);
  const sources = useMemo(() => reportingSources(aggregated), [aggregated]);
  const mixSegments = useMemo(
    () =>
      aggregated
        .filter(s => s.hasData && s.value > 0)
        .map(s => ({ key: s.token, color: s.color, weight: s.value })),
    [aggregated],
  );
  const mixLabel = useMemo(() => heroMixLabel(aggregated), [aggregated]);
  const mixLabelSpoken = useMemo(() => spokenHeroMixLabel(aggregated), [aggregated]);

  const noProductionCaption = formatNoProductionCaption(stack.zeroBuckets, settled.pill);
  const chartSummary = useMemo(
    () =>
      buildEnergyChartSummary({
        stack,
        periodLabel: settled.label,
        pill: settled.pill,
        total: grandTotal,
        noProductionCaption,
      }),
    [stack, settled.label, settled.pill, grandTotal, noProductionCaption],
  );

  // echarts colours from the active scheme (stable per scheme singleton).
  const chartTheme = reportChartThemeFromScheme(scheme);
  // Page gutter + SectionCard padding + its 1pt border, both sides.
  const inlineChartW = windowW - space.lg * 4 - 2;
  const inlineOption = useMemo(
    () => buildReportStackBarOption(stack, chartTheme, { width: inlineChartW }),
    [stack, chartTheme, inlineChartW],
  );
  // Built lazily — only while the fullscreen viewer is open.
  const fullscreenW = Math.max(windowW, windowH) - FULLSCREEN_CHROME_W;
  const fullscreenOption = useMemo(
    () =>
      fullscreen
        ? buildReportStackBarOption(stack, chartTheme, { width: fullscreenW, detailed: true })
        : null,
    [fullscreen, stack, chartTheme, fullscreenW],
  );

  // Header refresh + error-card retry (never forwards the press event
  // into refetch's options argument).
  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);
  const openFullscreen = useCallback(() => setFullscreen(true), []);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);
  const pillHandlers = useMemo(
    () =>
      Object.fromEntries(
        inverterFilters.map(f => [f, () => onFilterPress(f)]),
      ) as Record<InverterFilterOption, () => void>,
    [onFilterPress],
  );

  const friendly = useMemo(() => (error ? friendlyError(error) : null), [error]);

  const totalQ = formatEnergy(grandTotal);
  const updatedText =
    !isPlaceholderData && dataUpdatedAt > 0 ? `Updated ${formatClock(dataUpdatedAt)}` : null;
  // The accessible group's label replaces its children's text, so the
  // freshness caption must be part of it or screen readers never hear it.
  const totalA11y = [
    `Total energy, ${formatEnergy(grandTotal, { mode: 'precise', decimals: 1 }).spoken}`,
    updatedText,
  ]
    .filter(Boolean)
    .join('. ');

  const renderHero = () => (
    <Animated.View entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
      <HeroGradientCard>
        <View style={styles.heroTopRow}>
          <HeroStatusBadge
            mode="period"
            label="Energy"
            periodLabel={dateLabel}
            updating={isPlaceholderData}
          />
          <GlassChip size="md">
            <AppText variant="caption" semi_bold tone="onHero" numberOfLines={1}>
              {sourceCountLabel(sources.length)}
            </AppText>
          </GlassChip>
        </View>

        <View style={styles.heroTotal} accessible accessibilityLabel={totalA11y}>
          <OverlineLabel color={scheme.heroOnGradientMuted}>TOTAL ENERGY</OverlineLabel>
          <HeroValueRow>
            <AppText
              variant="h1"
              tone="onHero"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={styles.heroValueText}>
              {totalQ.text}
            </AppText>
            {totalQ.unit ? (
              <AppText variant="bodyLg" medium tone="onHeroMuted">
                {totalQ.unit}
              </AppText>
            ) : null}
          </HeroValueRow>
          {updatedText ? (
            <AppText variant="caption" tone="onHeroMuted">
              {updatedText}
            </AppText>
          ) : null}
        </View>

        {mixSegments.length > 0 ? (
          <View style={styles.heroMixSection}>
            <View style={styles.heroMixHeader}>
              <OverlineLabel color={scheme.heroOnGradientMuted}>POWER MIX</OverlineLabel>
              {mixLabel ? (
                <AppText
                  variant="caption"
                  medium
                  tone="onHero"
                  numberOfLines={1}
                  accessibilityLabel={mixLabelSpoken ?? undefined}
                  style={styles.mixLabel}>
                  {mixLabel}
                </AppText>
              ) : null}
            </View>
            <PowerMixBar segments={mixSegments} />
          </View>
        ) : null}
      </HeroGradientCard>
    </Animated.View>
  );

  const renderSources = () => (
    <Animated.View
      entering={FadeInDown.duration(duration.fast).delay(40).springify().damping(20)}>
      <SectionCard>
        <OverlineLabel>SOURCES</OverlineLabel>
        <View style={styles.sourceList}>
          {sources.map(item => (
            <SourceRow key={item.token} item={item} />
          ))}
        </View>
      </SectionCard>
    </Animated.View>
  );

  const renderChart = () =>
    stack.buckets.length > 0 && stack.series.length > 0 ? (
      <Animated.View
        entering={FadeInDown.duration(duration.fast).delay(80).springify().damping(20)}>
        <SectionCard>
          <View style={styles.sectionHeader}>
            <OverlineLabel>ENERGY OVER TIME</OverlineLabel>
            <IconButton
              variant="soft"
              size={36}
              onPress={openFullscreen}
              accessibilityLabel="Open Energy over time full screen"
              accessibilityHint="Shows the chart in landscape, with export">
              <Icon name="open-in-full" size={18} color={scheme.brandText} />
            </IconButton>
          </View>
          {/* ONE image element for screen readers, labelled with a data
              summary; the WebView's own DOM is hidden from them. */}
          <View
            style={styles.barContainer}
            accessible
            accessibilityRole="image"
            accessibilityLabel={chartSummary}>
            <View
              style={styles.chartFill}
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden>
              {ready ? (
                <ReportChart height={BAR_HEIGHT} option={inlineOption} />
              ) : (
                <Skeleton width="100%" height={BAR_HEIGHT} radius="md" />
              )}
            </View>
          </View>
          {noProductionCaption ? (
            <AppText variant="caption" tone="secondary">
              {noProductionCaption}
            </AppText>
          ) : null}
        </SectionCard>
      </Animated.View>
    ) : null;

  const renderBody = () => {
    // First load with nothing to show yet — or a period change whose
    // placeholder (the previous period) was itself empty, which must not
    // claim 'No energy data' for the NEW period: a skeleton with the final
    // layout's geometry (hero · sources · chart).
    if ((isLoading && !reportData) || (isPlaceholderData && !hasData)) {
      return (
        <View style={styles.content}>
          <Skeleton width="100%" height={232} radius="xl" />
          <SectionCard>
            <Skeleton width={72} height={12} />
            <Skeleton width="100%" height={44} radius="md" />
          </SectionCard>
          <SectionCard>
            <Skeleton width={120} height={12} />
            <Skeleton width="100%" height={BAR_HEIGHT} radius="md" />
          </SectionCard>
        </View>
      );
    }
    // A failed BACKGROUND refetch sets `error` while react-query still
    // holds the previous data — keep that content; only a report with
    // nothing to show gets the error card.
    if (friendly && !reportData) {
      return (
        <Animated.View entering={tabStagger(2)}>
          <EmptyStateCard
            kind={friendly.kind === 'offline' ? 'offline' : 'error'}
            title={friendly.title}
            message={friendly.message}
            onRetry={handleRefetch}
            retryLabel="Retry"
          />
        </Animated.View>
      );
    }
    if (!hasData) {
      return (
        <Animated.View entering={tabStagger(2)}>
          <EmptyStateCard
            kind="empty"
            title="No energy data for this period"
            message="Pick another period above."
          />
        </Animated.View>
      );
    }
    // Placeholder (previous period) data stays mounted — dimmed with a
    // STATIC opacity and marked 'Updating…' in the hero — until the new
    // period lands: no unmount, no entrance replay, no WebView reload.
    return (
      <View
        style={isPlaceholderData ? styles.contentDimmed : styles.content}
        accessibilityState={{ busy: isPlaceholderData }}>
        {renderHero()}
        {renderSources()}
        {renderChart()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={tabStagger(0)}>
        <DateFilterHeader
          title="Energy mix"
          dateLabel={dateLabel}
          dateA11yLabel={spokenPeriod(dateLabel)}
          pillDisabled={pillDisabled}
          onDatePress={handlePillPress}
          onRefresh={handleRefetch}
          refreshing={isFetching}
        />
      </Animated.View>

      <Animated.View entering={tabStagger(1)}>
        <PillGroup label="Date range type" style={styles.filterRow}>
          {inverterFilters.map(filter => (
            <ReportFilterPill
              key={filter}
              active={activeFilter === filter}
              label={filter}
              onPress={pillHandlers[filter]}
            />
          ))}
        </PillGroup>
      </Animated.View>

      {renderBody()}

      <DateRangePickerModal {...dateRangePickerProps} />
      <MonthYearPickerModal {...monthPickerProps} />
      <MonthYearPickerModal {...yearPickerProps} />

      <ChartFullscreenModal
        visible={fullscreen}
        onClose={closeFullscreen}
        title="Energy over time"
        option={fullscreenOption ?? EMPTY_CHART_OPTION}
        hint={stack.series.length > 1 ? LEGEND_HINT : undefined}
        warning={noProductionCaption ?? undefined}
        summary={chartSummary}
      />
    </View>
  );
};

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
  heroTotal: {
    marginTop: space.lg,
  },
  heroValueText: {
    flexShrink: 1,
  },
  heroMixSection: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: glass.borderSubtle,
    gap: space.md,
  },
  heroMixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  mixLabel: {
    flexShrink: 1,
    textAlign: 'right',
  },
  filterRow: {
    paddingHorizontal: space.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  barContainer: {
    height: BAR_HEIGHT,
  },
  // The library's chart root is `flex: 1` — the wrapper must fill.
  chartFill: {
    flex: 1,
  },
  sourceList: {
    gap: space.xs,
  },
});

export default PerformanceReportCard;
