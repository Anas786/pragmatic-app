/**
 * TrendAnalysisCard — v2 (modern visuals + interactive legend).
 *
 * The same three chart types as v1 (area, line, grouped bar) using
 * gifted-charts — the user noted that the chart *type* is driven by
 * API, so this layer concerns itself only with making the visuals
 * modern, on-brand, and animated:
 *
 *   - HeroGradientCard summary with the LIVE chip + comparison count
 *   - Tappable legend chips (haptic + brand colour fills) toggle
 *     series visibility on/off; the chart re-renders with whichever
 *     subset is on. Minimum one series must remain visible so the
 *     chart never collapses to nothing.
 *   - Per-section staggered FadeInDown wraps so the three charts
 *     reveal sequentially (3 worklets total — safe regime).
 *   - Chart styling pulled from `scheme` + `energyPalette` instead
 *     of legacy ACCENT_*; dashed rules, Poppins axis labels.
 *   - Custom data-point glow on every series, custom tooltip card.
 *
 * Performance: gifted-charts' built-in `isAnimated` is left OFF
 * (its on-data-change re-tween caused jank at zoom changes).
 * Modern entrance comes from a single Animated.View wrap per chart
 * section, not per data point.
 */

import React, { FC, ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import {
  AppText,
  Dot,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PressableScale,
  PulseDot,
  Skeleton,
  ZoomControls,
} from 'src/components/common';
import {
  duration as durationTokens,
  energyPalette,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  FONT_SIZE_LG,
  FONT_SIZE_MICRO,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXL,
  FONT_SIZE_XXS,
  formatDateFilterLabel,
  normalizeHeight,
  normalizeWidth,
  TRANSPARENT,
} from 'src/utils';
import { trendAnalysisSeries } from 'src/data/mock';
import { haptics } from 'src/utils/haptics';
import { useInteractionReady } from 'src/hooks';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import { Minus, Plus } from 'src/assets/icons';

/* ─────────────── constants ─────────────── */

const BASE_CHART_WIDTH = normalizeWidth(310);
const BASE_SPACING = BASE_CHART_WIDTH / 7;
const BASE_BAR_WIDTH = normalizeWidth(10);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const CHART_HEIGHT = normalizeHeight(190);
const CHART_MAX_VALUE = 100;
const CHART_SECTIONS = 5;
const CHART_INITIAL_SPACING = normalizeWidth(20);
const CHART_END_SPACING = normalizeWidth(10);
const DATA_POINT_RADIUS = 5;
const LINE_THICKNESS = 2.5;
const AREA_START_OPACITY = 0.45;
const AREA_END_OPACITY = 0.02;
const POINTER_RADIUS = 6;
const POINTER_STRIP_WIDTH = 1;
const POINTER_LABEL_WIDTH = normalizeWidth(120);
const POINTER_LABEL_HEIGHT = normalizeHeight(90);
const TOOLTIP_DOT_SIZE = normalizeWidth(8);
const BAR_GROUP_SPACING = 2;
const BAR_SET_SPACING = normalizeWidth(18);

// Modern series palette — pulled from the v2 energyPalette + brand so
// the charts feel cohesive with the rest of the redesigned UI.
const SERIES_COLORS = [
  energyPalette.solar, // lime — fresh, leading series
  energyPalette.grid, // blue — comparison
  energyPalette.battery, // purple — accent
] as const;

/* ─────────────── interactive legend ─────────────── */

interface LegendItem {
  year: string;
  color: string;
  visible: boolean;
}

const LegendChip: FC<{
  item: LegendItem;
  onToggle: (year: string) => void;
  disabled: boolean;
}> = ({ item, onToggle, disabled }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const { year, color, visible } = item;
  return (
    <PressableScale
      onPress={() => onToggle(year)}
      haptic="select"
      scaleTo={0.94}
      disabled={disabled}
      accessibilityLabel={`Toggle ${year}`}
      style={[
        themed.legendChip,
        visible ? { backgroundColor: color, borderColor: color } : null,
      ]}>
      <Dot color={visible ? scheme.heroOnGradient : color} size={8} />
      <AppText
        fontSize={FONT_SIZE_XXS}
        bold
        color={visible ? scheme.heroOnGradient : scheme.textSecondary}>
        {year}
      </AppText>
    </PressableScale>
  );
};
LegendChip.displayName = 'LegendChip';

const LegendRow: FC<{
  items: LegendItem[];
  onToggle: (year: string) => void;
}> = ({ items, onToggle }) => {
  const visibleCount = items.filter(i => i.visible).length;
  return (
    <Row>
      {items.map(item => (
        <LegendChip
          key={item.year}
          item={item}
          onToggle={onToggle}
          // Block toggling off the last visible series so the chart
          // never goes blank.
          disabled={item.visible && visibleCount === 1}
        />
      ))}
    </Row>
  );
};
LegendRow.displayName = 'LegendRow';

/* ─────────────── tooltip ─────────────── */

const ChartTooltip: FC<{
  items: { value: number }[];
  visibleSeries: LegendItem[];
}> = ({ items, visibleSeries }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <View style={themed.tooltip}>
      {items.map((item, index) => {
        const series = visibleSeries[index];
        if (!series) return null;
        return (
          <View key={series.year} style={styles.tooltipRow}>
            <Dot color={series.color} size={TOOLTIP_DOT_SIZE} />
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textPrimary}>
              {series.year}: {item.value}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};
ChartTooltip.displayName = 'ChartTooltip';

const BarTooltipLabel: FC<{ value: number }> = ({ value }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <View style={themed.barTooltip}>
      <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.textPrimary}>
        {value}
      </AppText>
    </View>
  );
};
BarTooltipLabel.displayName = 'BarTooltipLabel';

/* ─────────────── styled wrappers ─────────────── */

const Container: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.container}>{children}</View>;
};
Container.displayName = 'Container';

const Body: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.body}>{children}</View>;
};
Body.displayName = 'Body';

const Section: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.section}>{children}</View>;
};
Section.displayName = 'Section';

const SectionHeader: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.sectionHeader}>{children}</View>;
};
SectionHeader.displayName = 'SectionHeader';

const Row: FC<{ children: ReactNode }> = ({ children }) => (
  <View style={styles.row}>{children}</View>
);
Row.displayName = 'Row';

const ChartFrame: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.chartFrame}>{children}</View>;
};
ChartFrame.displayName = 'ChartFrame';

/* ─────────────── main ─────────────── */

const TrendAnalysisCard: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  // Three gifted-charts mounting in the same commit is the most
  // expensive thing this view does. Defer them so the hero + filter
  // header render immediately on first visit.
  const ready = useInteractionReady(160);

  const [startDate, setStartDate] = useState(() =>
    daysAgo(DEFAULT_CUSTOM_RANGE_DAYS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [areaZoom, setAreaZoom] = useState(1);
  const [lineZoom, setLineZoom] = useState(1);
  const [barZoom, setBarZoom] = useState(1);

  // Each year independently togglable. Initial state: all visible.
  const [seriesVisible, setSeriesVisible] = useState<Record<string, boolean>>(
    () =>
      trendAnalysisSeries.reduce<Record<string, boolean>>((acc, s) => {
        acc[s.year] = true;
        return acc;
      }, {}),
  );

  const toggleSeries = (year: string) => {
    setSeriesVisible(prev => {
      const next = { ...prev, [year]: !prev[year] };
      // Block toggling off the last visible series.
      const visibleCount = Object.values(next).filter(Boolean).length;
      if (visibleCount === 0) return prev;
      haptics.tap();
      return next;
    });
  };

  // Index-stable colours so a series keeps its colour even when
  // earlier series are hidden.
  const legendItems = useMemo<LegendItem[]>(
    () =>
      trendAnalysisSeries.map((s, i) => ({
        year: s.year,
        color: SERIES_COLORS[i] ?? scheme.brand,
        visible: seriesVisible[s.year] ?? true,
      })),
    [seriesVisible, scheme.brand],
  );

  const visibleSeries = useMemo(
    () => legendItems.filter(s => s.visible),
    [legendItems],
  );

  const visibleData = useMemo(
    () =>
      visibleSeries.map(s => {
        const source = trendAnalysisSeries.find(t => t.year === s.year);
        return source?.data ?? [];
      }),
    [visibleSeries],
  );

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // gifted-charts requires plain inline style objects for inner text.
  const yAxisTextStyle = useMemo(
    () => ({ color: scheme.textSecondary, fontSize: FONT_SIZE_XXS }),
    [scheme.textSecondary],
  );
  const xAxisLabelTextStyle = useMemo(
    () => ({ color: scheme.textSecondary, fontSize: FONT_SIZE_MICRO }),
    [scheme.textSecondary],
  );

  const pointerConfig = useMemo(
    () => ({
      pointerStripColor: scheme.border,
      pointerStripWidth: POINTER_STRIP_WIDTH,
      pointerColor: scheme.textPrimary,
      radius: POINTER_RADIUS,
      pointerLabelWidth: POINTER_LABEL_WIDTH,
      pointerLabelHeight: POINTER_LABEL_HEIGHT,
      activatePointersOnLongPress: false,
      autoAdjustPointerLabelPosition: true,
      pointerLabelComponent: (items: { value: number }[]) => (
        <ChartTooltip items={items} visibleSeries={visibleSeries} />
      ),
    }),
    [scheme.border, scheme.textPrimary, visibleSeries],
  );

  const getLineProps = (zoom: number) => ({
    width: BASE_CHART_WIDTH * zoom,
    height: CHART_HEIGHT,
    spacing: BASE_SPACING * zoom,
    initialSpacing: CHART_INITIAL_SPACING * zoom,
    endSpacing: CHART_END_SPACING * zoom,
    maxValue: CHART_MAX_VALUE,
    noOfSections: CHART_SECTIONS,
    yAxisTextStyle,
    xAxisLabelTextStyle,
    xAxisColor: scheme.hairline,
    yAxisColor: TRANSPARENT,
    rulesColor: scheme.hairline,
    rulesType: 'dashed' as const,
    dashWidth: 4,
    dashGap: 6,
    hideDataPoints: false,
    dataPointsRadius: DATA_POINT_RADIUS,
    dataPointsWidth: DATA_POINT_RADIUS * 2,
    curved: true,
    isAnimated: false,
    pointerConfig,
    scrollToEnd: false,
    disableScroll: false,
    backgroundColor: TRANSPARENT,
  });

  // Sparse multi-series wiring. gifted-charts uses fixed prop slots
  // (data/data2/data3), so we pack the visible series into the
  // lowest slots and leave the rest undefined.
  const multiSeriesProps = useMemo(() => {
    const [s0, s1, s2] = visibleSeries;
    const [d0, d1, d2] = visibleData;
    return {
      data: d0 ?? [],
      data2: d1,
      data3: d2,
      color1: s0?.color ?? scheme.brand,
      color2: s1?.color,
      color3: s2?.color,
      dataPointsColor1: s0?.color ?? scheme.brand,
      dataPointsColor2: s1?.color,
      dataPointsColor3: s2?.color,
    };
  }, [visibleSeries, visibleData, scheme.brand]);

  // Grouped bar data: one bar group per x-label, with one bar per
  // visible series inside the group. Indices follow the visible
  // subset so colours don't shift.
  const barData = useMemo(() => {
    const labels =
      trendAnalysisSeries[0]?.data.map(d => d.label ?? '') ?? [];
    return labels.flatMap((label, i) =>
      visibleSeries.map((s, j) => {
        const source = trendAnalysisSeries.find(t => t.year === s.year);
        const value = source?.data[i]?.value ?? 0;
        const isFirstInGroup = j === 0;
        const isLastInGroup = j === visibleSeries.length - 1;
        return {
          value,
          frontColor: s.color,
          label: isFirstInGroup ? label : undefined,
          labelTextStyle: isFirstInGroup ? xAxisLabelTextStyle : undefined,
          spacing: isLastInGroup ? BAR_SET_SPACING * barZoom : BAR_GROUP_SPACING,
        };
      }),
    );
  }, [visibleSeries, barZoom, xAxisLabelTextStyle]);

  const zoomIn = (setter: React.Dispatch<React.SetStateAction<number>>) => () =>
    setter(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = (setter: React.Dispatch<React.SetStateAction<number>>) => () =>
    setter(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  /* ── render ── */

  const renderHero = () => (
    <Animated.View
      entering={FadeInDown.duration(durationTokens.fast)
        .springify()
        .damping(20)}>
      <HeroGradientCard>
        <HeroTopRow>
          <HeroLiveBadge>
            <PulseDot color={scheme.heroOnGradient} size={8} />
            <OverlineLabel color={scheme.heroOnGradient}>
              LIVE · TREND ANALYSIS
            </OverlineLabel>
          </HeroLiveBadge>
          <GlassChip>
            <AppText
              fontSize={FONT_SIZE_XXS}
              bold
              color={scheme.heroOnGradient}>
              Σ {legendItems.length}
            </AppText>
          </GlassChip>
        </HeroTopRow>

        <OverlineLabel
          color={scheme.heroOnGradientMuted}
          style={themed.heroSectionLabel}>
          COMPARED PERIODS
        </OverlineLabel>
        <HeroValueRow>
          <AppText
            fontSize={FONT_SIZE_XXL}
            bold
            color={scheme.heroOnGradient}
            numberOfLines={1}>
            {legendItems.length}
          </AppText>
          <AppText
            fontSize={FONT_SIZE_SM}
            color={scheme.heroOnGradientMuted}
            medium>
            series · tap to toggle
          </AppText>
        </HeroValueRow>

        <View style={themed.heroLegend}>
          <LegendRow items={legendItems} onToggle={toggleSeries} />
        </View>
      </HeroGradientCard>
    </Animated.View>
  );

  const renderAreaChart = () => (
    <ChartFrame>
        <SectionHeader>
          <OverlineLabel color={scheme.textTertiary}>
            AREA · LAYERED
          </OverlineLabel>
          <ZoomControls
            MinusIcon={Minus}
            PlusIcon={Plus}
            zoom={areaZoom}
            canZoomIn={areaZoom < MAX_ZOOM}
            canZoomOut={areaZoom > MIN_ZOOM}
            onZoomIn={zoomIn(setAreaZoom)}
            onZoomOut={zoomOut(setAreaZoom)}
          />
        </SectionHeader>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            {...getLineProps(areaZoom)}
            {...multiSeriesProps}
            areaChart
            startFillColor1={multiSeriesProps.color1}
            endFillColor1={TRANSPARENT}
            startOpacity={AREA_START_OPACITY}
            endOpacity={AREA_END_OPACITY}
            startFillColor2={multiSeriesProps.color2}
            endFillColor2={TRANSPARENT}
            startOpacity2={AREA_START_OPACITY}
            endOpacity2={AREA_END_OPACITY}
            startFillColor3={multiSeriesProps.color3}
            endFillColor3={TRANSPARENT}
            startOpacity3={AREA_START_OPACITY}
            endOpacity3={AREA_END_OPACITY}
            thickness={LINE_THICKNESS}
          />
        </ScrollView>
      </ChartFrame>
  );

  const renderLineChart = () => (
      <ChartFrame>
        <SectionHeader>
          <OverlineLabel color={scheme.textTertiary}>
            LINE · COMPARISON
          </OverlineLabel>
          <ZoomControls
            MinusIcon={Minus}
            PlusIcon={Plus}
            zoom={lineZoom}
            canZoomIn={lineZoom < MAX_ZOOM}
            canZoomOut={lineZoom > MIN_ZOOM}
            onZoomIn={zoomIn(setLineZoom)}
            onZoomOut={zoomOut(setLineZoom)}
          />
        </SectionHeader>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            {...getLineProps(lineZoom)}
            {...multiSeriesProps}
            thickness={LINE_THICKNESS}
          />
        </ScrollView>
      </ChartFrame>
  );

  const renderBarChart = () => (
      <ChartFrame>
        <SectionHeader>
          <OverlineLabel color={scheme.textTertiary}>
            BAR · GROUPED
          </OverlineLabel>
          <ZoomControls
            MinusIcon={Minus}
            PlusIcon={Plus}
            zoom={barZoom}
            canZoomIn={barZoom < MAX_ZOOM}
            canZoomOut={barZoom > MIN_ZOOM}
            onZoomIn={zoomIn(setBarZoom)}
            onZoomOut={zoomOut(setBarZoom)}
          />
        </SectionHeader>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barData}
            width={BASE_CHART_WIDTH}
            height={CHART_HEIGHT}
            barWidth={BASE_BAR_WIDTH * barZoom}
            roundedTop
            noOfSections={CHART_SECTIONS}
            maxValue={CHART_MAX_VALUE}
            yAxisTextStyle={yAxisTextStyle}
            xAxisColor={scheme.hairline}
            yAxisColor={TRANSPARENT}
            rulesColor={scheme.hairline}
            rulesType="dashed"
            dashWidth={4}
            dashGap={6}
            isAnimated={false}
            renderTooltip={(item: { value: number }) => (
              <BarTooltipLabel value={item.value} />
            )}
            disableScroll={false}
          />
        </ScrollView>
      </ChartFrame>
  );

  return (
    <Container>
      {renderHero()}

      <DateFilterHeader
        title="Trend Analysis"
        dateLabel={formatDateFilterLabel('Custom', startDate, endDate)}
        onDatePress={() => setShowDatePicker(true)}
        onRefresh={() => {}}
      />

      <Body>
        {ready ? (
          <>
            <Section>{renderAreaChart()}</Section>
            <Section>{renderLineChart()}</Section>
            <Section>{renderBarChart()}</Section>
          </>
        ) : (
          <>
            <ChartFrame>
              <Skeleton width="100%" height={CHART_HEIGHT} radius="lg" />
            </ChartFrame>
            <ChartFrame>
              <Skeleton width="100%" height={CHART_HEIGHT} radius="lg" />
            </ChartFrame>
            <ChartFrame>
              <Skeleton width="100%" height={CHART_HEIGHT} radius="lg" />
            </ChartFrame>
          </>
        )}
      </Body>

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleDateApply}
      />
    </Container>
  );
};
TrendAnalysisCard.displayName = 'TrendAnalysisCard';

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: normalizeWidth(8),
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(6),
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: {
      gap: space.lg,
    },
    body: {
      gap: space.lg,
    },
    section: {
      gap: space.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.xs,
      paddingBottom: space.xs,
    },
    chartFrame: {
      backgroundColor: scheme.surface,
      borderRadius: radiusTokens.xl,
      padding: space.md,
      borderWidth: 1,
      borderColor: scheme.hairline,
      gap: space.sm,
      shadowColor: scheme.heroGlow,
      shadowOpacity: scheme.isDark ? 0.12 : 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    heroSectionLabel: {
      marginTop: space.lg,
    },
    heroLegend: {
      marginTop: space.lg,
      paddingTop: space.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: scheme.heroOnGradientMuted,
    },
    legendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(6),
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(6),
      borderRadius: radiusTokens.pill,
      borderWidth: 1,
      borderColor: scheme.heroOnGradientMuted,
      backgroundColor: 'rgba(255, 255, 255, 0.10)',
    },
    tooltip: {
      backgroundColor: scheme.surfaceRaised,
      borderRadius: radiusTokens.md,
      paddingHorizontal: normalizeWidth(10),
      paddingVertical: normalizeHeight(8),
      gap: normalizeHeight(4),
      borderWidth: 1,
      borderColor: scheme.border,
      shadowColor: scheme.heroGlow,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    barTooltip: {
      backgroundColor: scheme.surfaceRaised,
      borderRadius: radiusTokens.sm,
      paddingHorizontal: normalizeWidth(8),
      paddingVertical: normalizeHeight(4),
      marginBottom: normalizeHeight(4),
      borderWidth: 1,
      borderColor: scheme.border,
    },
  });

export default TrendAnalysisCard;
