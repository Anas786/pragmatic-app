import React, {
  FC,
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import RNEChartsPro from 'react-native-echarts-pro';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Section-level entrance stagger for the static chrome (date header,
 * filter pills, skeleton state). Snappy ~270ms total so sub-tab
 * switching feels swift.
 */
const tabStagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(180).springify().damping(20);
import {
  AppText,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PowerMixBar,
  PressableScale,
  PulseDot,
  Skeleton,
  SkeletonStack,
} from 'src/components/common';
import { duration, glass, radius as radiusTokens, space, useScheme } from 'src/theme';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
} from 'src/utils';
import {
  useDateFilter,
  useEnergyReport,
  useInteractionReady,
  useReportMapping,
} from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { inverterFilters } from 'src/data/mock';
import { WEBVIEW_SETTINGS } from './chartConfig';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  aggregateEnergy,
  AggregatedSource,
  buildStackData,
  formatCompactLocal,
  niceCeiling,
  StackBar,
} from './PerformanceReport/helpers';
import {
  buildReportPieOption,
  buildReportStackBarOption,
} from './PerformanceReport/echartsReportOption';
import ReportFilterPill from './PerformanceReport/ReportFilterPill';
import SourceRow from './PerformanceReport/SourceRow';
import SectionCard from './PerformanceReport/SectionCard';
import ChartFullscreenModal from './ChartFullscreenModal';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const PIE_HEIGHT = 240;
const BAR_HEIGHT = 280;

/** Ref handle exposed by react-native-echarts-pro that we rely on. */
interface ReportChartHandle {
  dispatchAction: (action: object) => void;
}

interface ReportChartProps {
  option: object;
  height: number;
  onPress?: (result: string) => void;
  /**
   * Fires when the chart's WebView finishes loading — i.e. the
   * page-side message listener (registered by the injected script at
   * load end) can now receive `dispatchAction` postMessages.
   */
  onLoadEnd?: () => void;
}

/**
 * Memoized RNEChartsPro host. The library rebuilds its injected JS +
 * inline-HTML source (~2MB of throwaway strings, embedding the full
 * echarts bundle) on EVERY render — so selection taps / modal toggles
 * in the parent must not reach it. `option` is already memoized
 * upstream and `onPress` is useCallback'd, so this wrapper bails out
 * unless the chart actually changes. The ref forwards straight to the
 * library handle, keeping `dispatchAction` slice-sync working.
 */
const ReportChart = memo(
  forwardRef<ReportChartHandle, ReportChartProps>(
    ({ option, height, onPress, onLoadEnd }, ref) => {
      // The library spreads `webViewSettings` before its own WebView
      // props and never sets `onLoadEnd` itself, so composing it here
      // survives. Memoized (callers pass a useCallback'd onLoadEnd) so
      // the settings reference stays stable and the memo above holds.
      const webViewSettings = useMemo(
        () => (onLoadEnd ? { ...WEBVIEW_SETTINGS, onLoadEnd } : WEBVIEW_SETTINGS),
        [onLoadEnd],
      );
      return (
        <RNEChartsPro
          ref={ref as never}
          height={height}
          option={option}
          backgroundColor="transparent"
          enableParseStringFunction
          webViewSettings={webViewSettings}
          onPress={onPress}
        />
      );
    },
  ),
);
ReportChart.displayName = 'ReportChart';

const PerformanceReportCard: FC = () => {
  const scheme = useScheme();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [barFullscreen, setBarFullscreen] = useState(false);
  // Counts pie-WebView load completions (not a boolean): a remounted
  // WebView re-fires onLoadEnd, re-arming the select-sync effect below
  // even when none of its data deps changed.
  const [pieLoadCount, setPieLoadCount] = useState(0);
  const pieRef = useRef<ReportChartHandle | null>(null);

  const {
    activeFilter,
    setActiveFilter,
    reportFilter,
    dateLabel,
    pillDisabled,
    handlePillPress,
    dateRangePickerProps,
    monthPickerProps,
    yearPickerProps,
  } = useDateFilter();

  const {
    data: reportData,
    refetch,
    isLoading,
    isFetching,
    error,
  } = useEnergyReport(siteId, reportFilter);
  const { data: reportMapping } = useReportMapping();
  // Defer the heavy chart WebViews so the chip-morph and hero render
  // first on a cold visit.
  const ready = useInteractionReady();

  const aggregated = useMemo<AggregatedSource[]>(
    () => aggregateEnergy(reportData?.data ?? [], reportMapping),
    [reportData, reportMapping],
  );

  const stackData = useMemo<StackBar[]>(
    () => buildStackData(reportData?.data ?? [], activeFilter, reportMapping),
    [reportData, activeFilter, reportMapping],
  );

  const visibleSources = useMemo(() => aggregated.filter(s => s.value > 0), [aggregated]);

  const grandTotal = aggregated.reduce((acc, s) => acc + s.value, 0);

  const stackMaxValue = useMemo(() => {
    if (stackData.length === 0) return 0;
    const maxTotal = Math.max(
      ...stackData.map(b => b.stacks.reduce((acc, s) => acc + s.value, 0)),
    );
    return niceCeiling(maxTotal);
  }, [stackData]);

  const safeSelectedIndex = Math.min(selectedIndex, Math.max(aggregated.length - 1, 0));

  useEffect(() => {
    if (grandTotal <= 0) return;
    const current = aggregated[safeSelectedIndex];
    if (current && current.value > 0) return;
    const nextIndex = aggregated.findIndex(s => s.value > 0);
    if (nextIndex >= 0 && nextIndex !== safeSelectedIndex) {
      setSelectedIndex(nextIndex);
    }
  }, [aggregated, grandTotal, safeSelectedIndex]);

  // echarts colours/typography pulled from the active scheme.
  const chartTheme = useMemo(
    () => ({
      textPrimary: scheme.textPrimary,
      textSecondary: scheme.textSecondary,
      textTertiary: scheme.textTertiary,
      border: scheme.border,
      surface: scheme.surfaceRaised,
      isDark: scheme.isDark,
    }),
    [
      scheme.textPrimary,
      scheme.textSecondary,
      scheme.textTertiary,
      scheme.border,
      scheme.surfaceRaised,
      scheme.isDark,
    ],
  );

  // Pie data is the FULL `aggregated` array so a slice's dataIndex maps
  // 1:1 onto our selection index.
  const pieOption = useMemo(
    () => buildReportPieOption(aggregated, chartTheme),
    [aggregated, chartTheme],
  );
  const stackBarOption = useMemo(
    () => buildReportStackBarOption(stackData, stackMaxValue, chartTheme),
    [stackData, stackMaxValue, chartTheme],
  );

  // Fired via `webViewSettings.onLoadEnd` when the pie WebView finishes
  // loading. Stable identity so the memoized ReportChart never re-renders
  // because of it.
  const handlePieLoadEnd = useCallback(() => setPieLoadCount(c => c + 1), []);

  // Keep the pie's selected slice in sync with `selectedIndex` — so
  // tapping a SOURCE ROW (not just a slice) pops the matching slice.
  // `selectedMode: 'single'` makes echarts deselect the previous one.
  // dispatchAction is a raw postMessage and the page-side listener only
  // registers once the WebView finishes loading — anything posted
  // earlier is silently dropped. So the effect is gated on
  // `pieLoadCount` and re-runs on every (re)load. The first shot waits
  // 60 ms for a freshly-applied option to settle; the 360 ms backstop
  // covers the small onLoadEnd ↔ injected-script ordering race.
  useEffect(() => {
    if (pieLoadCount === 0 || grandTotal <= 0) return;
    const dispatch = () => {
      pieRef.current?.dispatchAction?.({
        type: 'select',
        seriesIndex: 0,
        dataIndex: safeSelectedIndex,
      });
    };
    const t1 = setTimeout(dispatch, 60);
    const t2 = setTimeout(dispatch, 360);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [safeSelectedIndex, pieOption, grandTotal, pieLoadCount]);

  // Tapping a pie slice selects that source (highlights its row).
  // Stable identity (useCallback) so the memoized ReportChart wrapper
  // bails out on selection re-renders.
  const handlePiePress = useCallback((result: any) => {
    const params = typeof result === 'string' ? JSON.parse(result) : result;
    if (params && typeof params.dataIndex === 'number') {
      setSelectedIndex(params.dataIndex);
    }
  }, []);

  const renderFilters = () => (
    <View style={styles.filterRow}>
      {inverterFilters.map(filter => (
        <ReportFilterPill
          key={filter}
          active={activeFilter === filter}
          label={filter}
          onPress={() => setActiveFilter(filter)}
        />
      ))}
    </View>
  );

  const renderHero = () => {
    if (isLoading || grandTotal <= 0) return null;
    const topSource =
      visibleSources.length > 0
        ? [...visibleSources].sort((a, b) => b.value - a.value)[0]
        : null;

    return (
      <Animated.View
        entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
        <HeroGradientCard>
          <HeroTopRow>
            <HeroLiveBadge>
              <PulseDot color={scheme.heroOnGradient} size={8} />
              <OverlineLabel color={scheme.heroOnGradient}>LIVE · ENERGY</OverlineLabel>
            </HeroLiveBadge>
            <GlassChip>
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradient}>
                Σ {visibleSources.length}
              </AppText>
            </GlassChip>
          </HeroTopRow>

          <OverlineLabel color={scheme.heroOnGradientMuted} style={styles.heroSectionLabel}>
            TOTAL GENERATED
          </OverlineLabel>
          <HeroValueRow>
            <AppText
              fontSize={FONT_SIZE_XXL}
              bold
              color={scheme.heroOnGradient}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={styles.heroValueText}>
              {formatCompactLocal(grandTotal)}
            </AppText>
            <AppText fontSize={FONT_SIZE_SM} color={scheme.heroOnGradientMuted} medium>
              kWh
            </AppText>
          </HeroValueRow>

          {visibleSources.length > 0 ? (
            <View style={styles.heroMixSection}>
              <View style={styles.heroMixHeader}>
                <OverlineLabel color={scheme.heroOnGradientMuted}>POWER MIX</OverlineLabel>
                {topSource ? (
                  <AppText fontSize={FONT_SIZE_XXS} color={scheme.heroOnGradient}>
                    TOP · {topSource.label.toUpperCase()}
                  </AppText>
                ) : null}
              </View>
              <PowerMixBar
                segments={visibleSources.map(s => ({
                  key: s.label,
                  color: s.color,
                  weight: s.value,
                }))}
              />
            </View>
          ) : null}
        </HeroGradientCard>
      </Animated.View>
    );
  };

  const renderPie = () => {
    if (!ready || isLoading || grandTotal <= 0) return null;
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.fast).delay(40).springify().damping(20)}>
        <SectionCard>
          <View style={styles.sectionHeader}>
            <OverlineLabel color={scheme.textTertiary}>DISTRIBUTION</OverlineLabel>
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              Tap a slice
            </AppText>
          </View>
          <View style={styles.chartContainer}>
            <ReportChart
              ref={pieRef}
              height={PIE_HEIGHT}
              option={pieOption}
              onPress={handlePiePress}
              onLoadEnd={handlePieLoadEnd}
            />
          </View>
        </SectionCard>
      </Animated.View>
    );
  };

  const renderSourceList = () => {
    if (isLoading || grandTotal <= 0) return null;
    const items = aggregated
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.value > 0);
    return (
      <View style={styles.sourceList}>
        {items.map(({ item, idx }, n) => (
          <SourceRow
            key={item.label}
            item={item}
            delay={120 + n * 40}
            isActive={idx === safeSelectedIndex}
            onPress={() => setSelectedIndex(idx)}
          />
        ))}
      </View>
    );
  };

  const renderBarChart = () => {
    if (!ready || isLoading || stackData.length === 0) return null;
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.fast).delay(120).springify().damping(20)}>
        <SectionCard>
          <View style={styles.sectionHeader}>
            <OverlineLabel color={scheme.textTertiary}>ENERGY OVER TIME</OverlineLabel>
            <PressableScale
              onPress={() => setBarFullscreen(true)}
              haptic="tap"
              scaleTo={0.94}
              accessibilityLabel="Open full screen"
              style={[styles.fsBtn, { backgroundColor: scheme.brandSoft }]}>
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.brand}>
                Fullscreen
              </AppText>
            </PressableScale>
          </View>
          <View style={styles.barContainer}>
            <ReportChart height={BAR_HEIGHT} option={stackBarOption} />
          </View>
        </SectionCard>
      </Animated.View>
    );
  };

  const renderStateBlock = () => {
    if (isLoading && grandTotal <= 0) {
      return (
        <Animated.View entering={tabStagger(2)}>
          <SkeletonStack>
            <SectionCard>
              <Skeleton width={120} height={12} />
              <Skeleton width={220} height={220} radius="pill" />
            </SectionCard>
            <SectionCard>
              <Skeleton width={120} height={12} />
              <Skeleton width="100%" height={180} radius="md" />
            </SectionCard>
          </SkeletonStack>
        </Animated.View>
      );
    }
    // A failed BACKGROUND refetch sets `error` while react-query still
    // holds the previous data — with cached content rendered above,
    // appending an error card would contradict it. Reserve the error
    // state for a genuinely empty report (the header spinner already
    // covers refresh feedback).
    if (error && grandTotal <= 0) {
      return (
        <Animated.View entering={tabStagger(2)}>
          <EmptyStateCard
            title="Couldn't load energy report"
            message="Tap retry to try again."
            onRetry={() => refetch()}
          />
        </Animated.View>
      );
    }
    if (!isLoading && grandTotal <= 0) {
      return (
        <Animated.View entering={tabStagger(2)}>
          <EmptyStateCard message="No energy data for this period." />
        </Animated.View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={tabStagger(0)}>
        <DateFilterHeader
          title="Energy Mix"
          dateLabel={dateLabel}
          pillDisabled={pillDisabled}
          onDatePress={handlePillPress}
          onRefresh={refetch}
          refreshing={isLoading || isFetching}
        />
      </Animated.View>

      <Animated.View entering={tabStagger(1)}>{renderFilters()}</Animated.View>
      {renderHero()}
      {renderPie()}
      {renderSourceList()}
      {renderBarChart()}
      {renderStateBlock()}

      <DateRangePickerModal {...dateRangePickerProps} />
      <MonthYearPickerModal {...monthPickerProps} />
      <MonthYearPickerModal {...yearPickerProps} />

      <ChartFullscreenModal
        visible={barFullscreen}
        onClose={() => setBarFullscreen(false)}
        title="Energy Over Time"
        option={stackBarOption}
        hint="Tap a source in the legend to show or hide it"
      />
    </View>
  );
};

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  heroSectionLabel: {
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
  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
    paddingHorizontal: space.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  fsBtn: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radiusTokens.pill,
  },
  chartContainer: {
    height: PIE_HEIGHT,
  },
  barContainer: {
    height: BAR_HEIGHT,
  },
  sourceList: {
    gap: space.sm,
  },
});

export default PerformanceReportCard;
