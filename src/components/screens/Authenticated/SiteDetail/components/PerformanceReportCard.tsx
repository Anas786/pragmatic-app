import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
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
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
  formatDateFilterLabel,
  MonthSelection,
} from 'src/utils';
import {
  useEnergyReport,
  useInteractionReady,
  useReportMapping,
} from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { InverterFilterOption, inverterFilters } from 'src/data/mock';
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

const PerformanceReportCard: FC = () => {
  const scheme = useScheme();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const [startDate, setStartDate] = useState(() => daysAgo(DEFAULT_CUSTOM_RANGE_DAYS));
  const [endDate, setEndDate] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<InverterFilterOption>('Custom');
  const [barFullscreen, setBarFullscreen] = useState(false);
  const pieRef = useRef<{ dispatchAction: (action: object) => void } | null>(null);

  const reportFilter = useMemo(
    () => buildReportFilter(activeFilter, startDate, endDate, selectedMonth, selectedYear),
    [activeFilter, startDate, endDate, selectedMonth, selectedYear],
  );

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

  // Keep the pie's selected slice in sync with `selectedIndex` — so
  // tapping a SOURCE ROW (not just a slice) pops the matching slice.
  // `selectedMode: 'single'` makes echarts deselect the previous one;
  // the small delay lets a freshly-applied option settle first.
  useEffect(() => {
    const ref = pieRef.current;
    if (!ref?.dispatchAction || grandTotal <= 0) return;
    const t = setTimeout(() => {
      ref.dispatchAction({
        type: 'select',
        seriesIndex: 0,
        dataIndex: safeSelectedIndex,
      });
    }, 60);
    return () => clearTimeout(t);
  }, [safeSelectedIndex, pieOption, grandTotal]);

  // Tapping a pie slice selects that source (highlights its row).
  const handlePiePress = (result: any) => {
    const params = typeof result === 'string' ? JSON.parse(result) : result;
    if (params && typeof params.dataIndex === 'number') {
      setSelectedIndex(params.dataIndex);
    }
  };

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };
  const handleMonthApply = (sel: { year: number; month: number }) => {
    setSelectedMonth({ year: sel.year, month: sel.month });
  };
  const handleYearApply = (sel: { year: number }) => {
    setSelectedYear(sel.year);
  };
  const handlePillPress = () => {
    switch (activeFilter) {
      case 'Custom':
        setShowDatePicker(true);
        break;
      case 'Month':
        setShowMonthPicker(true);
        break;
      case 'Year':
        setShowYearPicker(true);
        break;
      case 'Life Time':
      default:
        break;
    }
  };

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
            <RNEChartsPro
              ref={pieRef as never}
              height={PIE_HEIGHT}
              option={pieOption}
              backgroundColor="transparent"
              enableParseStringFunction
              onPress={handlePiePress}
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
            <RNEChartsPro
              height={BAR_HEIGHT}
              option={stackBarOption}
              backgroundColor="transparent"
              enableParseStringFunction
            />
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
    if (error) {
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
          dateLabel={formatDateFilterLabel(
            activeFilter,
            startDate,
            endDate,
            selectedMonth,
            selectedYear,
          )}
          pillDisabled={activeFilter === 'Life Time'}
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

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleDateApply}
      />

      <MonthYearPickerModal
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        mode="month"
        initialYear={selectedMonth.year}
        initialMonth={selectedMonth.month}
        onApply={handleMonthApply}
      />

      <MonthYearPickerModal
        visible={showYearPicker}
        onClose={() => setShowYearPicker(false)}
        mode="year"
        initialYear={selectedYear}
        onApply={handleYearApply}
      />

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
