import React, { FC, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Section-level entrance stagger for the static chrome (date header,
 * filter pills, skeleton state). Snappy ~270ms total so sub-tab
 * switching feels swift. Bounded wrapper count keeps us well below
 * the per-tile worklet storm regime.
 */
const tabStagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(180).springify().damping(20);
import {
  AppText,
  Dot,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PowerMixBar,
  PulseDot,
  Skeleton,
  SkeletonStack,
} from 'src/components/common';
import {
  duration,
  glass,
  space,
  useScheme,
} from 'src/theme';
import {
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
  formatDateFilterLabel,
  MonthSelection,
  TRANSPARENT,
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
import { Minus, Plus } from 'src/assets/icons';
import {
  aggregateEnergy,
  AggregatedSource,
  BAR_AVAILABLE_WIDTH,
  BAR_CHART_HEIGHT,
  BAR_CHART_SECTIONS,
  BAR_MAX_WIDTH,
  BAR_MIN_SPACING,
  BAR_MIN_WIDTH,
  BAR_ZOOM_STEP,
  buildStackData,
  FOCUSED_PIE_EXTRA_RADIUS,
  formatCompactLocal,
  formatYAxis,
  MAX_BAR_ZOOM,
  MIN_BAR_ZOOM,
  niceCeiling,
  PIE_INNER_RADIUS,
  PIE_RADIUS,
  StackBar,
} from './PerformanceReport/helpers';
import ReportFilterPill from './PerformanceReport/ReportFilterPill';
import SourceRow from './PerformanceReport/SourceRow';
import SectionCard from './PerformanceReport/SectionCard';
import { ZoomControls } from 'src/components/common';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

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
  const [barZoom, setBarZoom] = useState(MIN_BAR_ZOOM);

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
  // Defer the heavy gifted-charts mounts (pie + stacked bar) so the
  // chip-morph and hero render first on a cold visit.
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

  const { adaptiveBarWidth, adaptiveSpacing, adaptiveInitialSpacing } = useMemo(() => {
    const count = stackData.length;
    if (count === 0) {
      return {
        adaptiveBarWidth: BAR_MIN_WIDTH,
        adaptiveSpacing: BAR_MIN_SPACING,
        adaptiveInitialSpacing: undefined as number | undefined,
      };
    }
    const slotWidth = BAR_AVAILABLE_WIDTH / count;
    const barW = Math.max(BAR_MIN_WIDTH, Math.min(BAR_MAX_WIDTH, slotWidth * 0.55));
    const sp = Math.max(BAR_MIN_SPACING, slotWidth - barW);
    const initial = count === 1 ? (BAR_AVAILABLE_WIDTH - barW) / 2 : undefined;
    return { adaptiveBarWidth: barW, adaptiveSpacing: sp, adaptiveInitialSpacing: initial };
  }, [stackData.length]);

  const zoomedBarWidth = adaptiveBarWidth * barZoom;
  const zoomedSpacing = adaptiveSpacing * barZoom;
  const zoomedInitialSpacing =
    adaptiveInitialSpacing != null ? adaptiveInitialSpacing * barZoom : undefined;

  const zoomIn = () => setBarZoom(prev => Math.min(prev + BAR_ZOOM_STEP, MAX_BAR_ZOOM));
  const zoomOut = () => setBarZoom(prev => Math.max(prev - BAR_ZOOM_STEP, MIN_BAR_ZOOM));
  const canZoomIn = barZoom < MAX_BAR_ZOOM;
  const canZoomOut = barZoom > MIN_BAR_ZOOM;

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

  const pieData = aggregated.map((s, i) => ({
    value: s.value,
    color: s.color,
    focused: i === safeSelectedIndex,
    onPress: () => setSelectedIndex(i),
  }));

  // Chart axis labels must be plain style objects — gifted-charts does not
  // accept StyleSheet refs for inner text. Memoised to avoid handing the
  // chart a fresh object every render.
  const chartAxisLabel = useMemo(
    () => ({
      color: scheme.textSecondary,
      fontSize: 10,
      fontFamily: 'Poppins-Medium',
    }),
    [scheme.textSecondary],
  );

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
                  // local binding side-steps the Reanimated `.value`
                  // heuristic when the segment object has a `.value`
                  // property.
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
          <View style={styles.pieContainer}>
            {/* `sectionAutoFocus` enables the popped-slice overlay
                without entering the `focusOnPress` branch inside
                gifted-charts' slice-tap handler — that branch
                maintains a second internal selectedIndex which
                desynced with ours after 1–2 taps and made the chart
                stop responding. With `sectionAutoFocus`, our
                `pieData[i].focused = i === safeSelectedIndex` flag is
                the single source of truth and the chart's internal
                index is set from that via its data-change effect. */}
            <PieChart
              data={pieData}
              radius={PIE_RADIUS}
              innerRadius={PIE_INNER_RADIUS}
              donut
              sectionAutoFocus
              extraRadius={FOCUSED_PIE_EXTRA_RADIUS}
              backgroundColor={TRANSPARENT}
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
            <ZoomControls
              MinusIcon={Minus}
              PlusIcon={Plus}
              zoom={barZoom}
              canZoomIn={canZoomIn}
              canZoomOut={canZoomOut}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
            />
          </View>

          <BarChart
            stackData={stackData}
            barWidth={zoomedBarWidth}
            spacing={zoomedSpacing}
            initialSpacing={zoomedInitialSpacing}
            barBorderRadius={3}
            height={BAR_CHART_HEIGHT}
            maxValue={stackMaxValue || undefined}
            noOfSections={BAR_CHART_SECTIONS}
            // `isAnimated` is intentionally off — gifted-charts drives its
            // bar grow animation on the JS thread via setInterval, which
            // spikes when the data lands at the exact moment our four
            // FadeInDown entrances (hero, pie, source list, bar) are also
            // firing. The bar still slides in via the parent Animated.View
            // wrapper, which is enough motion.
            hideRules={false}
            rulesColor={scheme.border}
            rulesType="dashed"
            dashWidth={3}
            dashGap={4}
            xAxisColor={scheme.border}
            yAxisColor={TRANSPARENT}
            xAxisLabelTextStyle={chartAxisLabel}
            xAxisLabelsHeight={20}
            yAxisTextStyle={chartAxisLabel}
            formatYLabel={formatYAxis}
            disableScroll={false}
          />

          {visibleSources.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartLegend}>
              {visibleSources.map(s => (
                <LegendDot
                  key={s.label}
                  color={s.color}
                  label={s.label}
                  textColor={scheme.textSecondary}
                />
              ))}
            </ScrollView>
          ) : null}
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
    </View>
  );
};

/* ─────────────── legend dot ─────────────── */

interface LegendDotProps {
  color: string;
  label: string;
  textColor: string;
}

const LegendDot: FC<LegendDotProps> = ({ color, label, textColor }) => (
  <View style={styles.chartLegendItem}>
    <Dot color={color} size={8} />
    <AppText fontSize={FONT_SIZE_XXS} color={textColor} numberOfLines={1}>
      {label}
    </AppText>
  </View>
);

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
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceList: {
    gap: space.sm,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.sm,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default PerformanceReportCard;
