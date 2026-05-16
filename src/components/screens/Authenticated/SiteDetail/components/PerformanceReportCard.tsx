import React, { FC, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { useRoute, RouteProp } from "@react-navigation/native";
import { AppText } from "src/components/common";
import {
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  ENERGY_SOURCE_BATTERY,
  ENERGY_SOURCE_GENSET,
  ENERGY_SOURCE_GRID,
  ENERGY_SOURCE_SOLAR,
  ENERGY_SOURCE_WIND,
  FONT_SIZE_LG,
  FONT_SIZE_MICRO,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  formatChartLabel,
  formatDateFilterLabel,
  ICON_SIZE_XS,
  MonthSelection,
  normalizeHeight,
  normalizeWidth,
  PROGRESS_FILLED,
  resolveReportLabel,
  ThemeColors,
  TRANSPARENT,
  WHITE,
} from "src/utils";
import {
  useEnergyReport,
  useReportMapping,
  useThemeStore,
} from "src/hooks";
import { EnergyReportRow } from "src/networking";
import { DashboardStackParamList, ReportMapping } from "src/types";
import {
  InverterFilterOption,
  inverterFilters,
} from "src/data/mock";
import DateRangePickerModal from "./DateRangePickerModal";
import DateFilterHeader from "./DateFilterHeader";
import MonthYearPickerModal from "./MonthYearPickerModal";
import { Minus, Plus } from "src/assets/icons";

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, "SiteDetail">;

const PIE_RADIUS = normalizeWidth(120);
const FOCUSED_PIE_EXTRA_RADIUS = normalizeWidth(10);
const SOURCE_CARD_RADIUS = normalizeWidth(14);
const SOURCE_CARD_PADDING = normalizeWidth(14);
const SOURCE_DOT_SIZE = normalizeWidth(10);
const PERCENT_BADGE_PH = normalizeWidth(10);
const PERCENT_BADGE_PV = normalizeHeight(4);
const PERCENT_BADGE_RADIUS = 100;
const BAR_CHART_HEIGHT = normalizeHeight(220);
const BAR_CHART_SECTIONS = 4;
/** Approximate horizontal space the bars get to occupy after the
 *  card padding + y-axis label gutter. Used to scale bar/spacing so
 *  sparse selections (Year ⇒ ~5 bars, Lifetime ⇒ 1 bar) fill the
 *  width instead of clumping on the left. */
const BAR_AVAILABLE_WIDTH = normalizeWidth(280);
const BAR_MIN_WIDTH = normalizeWidth(16);
const BAR_MAX_WIDTH = normalizeWidth(56);
const BAR_MIN_SPACING = normalizeWidth(8);

// Zoom range for the stacked bar chart. 1× = adaptive baseline (bars
// fit the card width); 3× = bars are 3× wider and the chart scrolls
// horizontally to see them all. 0.5 step keeps the levels feeling
// distinct without overshooting on each tap.
const MIN_BAR_ZOOM = 1;
const MAX_BAR_ZOOM = 3;
const BAR_ZOOM_STEP = 0.5;
const ZOOM_BUTTON_SIZE = normalizeWidth(28);
const FILTER_PILL_PH = normalizeWidth(20);
const FILTER_PILL_PV = normalizeHeight(10);
const FILTER_PILL_RADIUS = 100;

/**
 * The five energy sources rendered by the Performance Report pie chart.
 *
 * Source columns in the API response can ship with arbitrary prefixes
 * — `ed_solar`, `et_solar`, `hi_solar`, etc. — so we identify each
 * source by the substring **token** rather than the full key. At
 * aggregation time every column whose name contains the token is
 * summed into the same bucket, so a single semantic source can span
 * multiple wire-format columns.
 *
 * Each entry also binds:
 *  - a brand-defined accent colour (solar=green, wind=purple,
 *    grid=cyan, genset=orange, battery=slate), and
 *  - a fallback label used until `useReportMapping()` hydrates with
 *    the backend's `display` strings (e.g. "Grid Production (kWh)").
 *
 * Order here drives the legend order.
 */
interface SourceConfig {
  /** Lowercase substring used to match column names. */
  token: string;
  fallbackLabel: string;
  color: string;
}

const SOURCES: SourceConfig[] = [
  { token: "solar", fallbackLabel: "Solar", color: ENERGY_SOURCE_SOLAR },
  { token: "wind", fallbackLabel: "Wind", color: ENERGY_SOURCE_WIND },
  { token: "grid", fallbackLabel: "Grid", color: ENERGY_SOURCE_GRID },
  { token: "genset", fallbackLabel: "Genset", color: ENERGY_SOURCE_GENSET },
  {
    token: "battery",
    fallbackLabel: "Battery",
    color: ENERGY_SOURCE_BATTERY,
  },
];

/**
 * Pick the source whose `token` appears (case-insensitive) anywhere in
 * the column name. Returns `undefined` for unrecognised columns —
 * those are silently ignored by the aggregator.
 */
const findSourceForColumn = (
  column: string,
): SourceConfig | undefined => {
  const lower = column.toLowerCase();
  return SOURCES.find(s => lower.includes(s.token));
};

interface AggregatedSource {
  label: string;
  color: string;
  value: number;
  displayValue: string;
  percentage: string;
}

const formatKwh = (n: number): string =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Compact y-axis label: 1,234,567 → "1.2M", 12,345 → "12K". */
const formatYAxis = (raw: string): string => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};

/**
 * Round `n` up to the next "nice" axis number — keeps the chart's
 * y-axis ticks clean (e.g. 1,250,000 → 1,500,000 with 5 sections).
 * Uses 1/2/5 × 10^k as the canonical step set, the same convention
 * d3 / chart.js use for default axes.
 */
const niceCeiling = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const exp = Math.floor(Math.log10(n));
  const base = Math.pow(10, exp);
  const fraction = n / base;
  let nice: number;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * base;
};

/**
 * Sum each source across the response's time-series rows.
 *
 * The aggregator scans every key on every row (excluding `time`) and
 * routes the value into the matching source bucket via
 * `findSourceForColumn`. Multiple wire-format columns can map to the
 * same logical source — e.g. `ed_solar` + `et_solar` both feed into
 * "solar" — and their values are summed. Null cells and unknown
 * columns are skipped silently.
 *
 * Returns an always-5-entry array (one per `SOURCES` row) so the
 * legend layout stays stable across periods.
 *
 * `mapping` is the cached `/public/config/report-mapping` response —
 * each source's display label is taken from `mapping[matchedKey].display`
 * (using the FIRST column that matched the token, so a key the user
 * recognises). Falls back to the static label when missing.
 */
const aggregateEnergy = (
  rows: EnergyReportRow[],
  mapping: ReportMapping | undefined | null,
): AggregatedSource[] => {
  const sums: Record<string, number> = {};
  const firstMatchedColumn: Record<string, string> = {};
  for (const s of SOURCES) sums[s.token] = 0;

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (column === "time") continue;
      const v = row[column];
      if (typeof v !== "number" || !Number.isFinite(v)) continue;
      const source = findSourceForColumn(column);
      if (!source) continue;
      sums[source.token] += v;
      if (!firstMatchedColumn[source.token]) {
        firstMatchedColumn[source.token] = column;
      }
    }
  }

  const total = SOURCES.reduce((acc, s) => acc + sums[s.token], 0);

  return SOURCES.map(src => {
    const value = sums[src.token];
    const matchedColumn = firstMatchedColumn[src.token];
    return {
      label: matchedColumn
        ? resolveReportLabel(mapping, matchedColumn, src.fallbackLabel)
        : src.fallbackLabel,
      color: src.color,
      value,
      displayValue: formatKwh(value),
      percentage:
        total > 0
          ? `${((value / total) * 100).toFixed(2)}%`
          : "0.00%",
    };
  });
};

/**
 * One bar in the stacked chart. `gifted-charts` accepts a list of
 * `{ value, color }` segments per bar — they're stacked bottom-up in
 * the order given, which we keep as `SOURCES` order so the colour
 * sequence matches the pie chart and source cards above.
 *
 * `sourceLabel` is an extra field gifted-charts ignores — we use it
 * inside the per-segment `onPress` handler to tell the user which
 * source they tapped.
 */
interface StackSegment {
  value: number;
  color: string;
  sourceLabel: string;
}

interface StackBar {
  label: string;
  stacks: StackSegment[];
}

/**
 * Build per-time-bucket stack data. Each row of the response becomes
 * one bar; sources whose `token` doesn't appear in the row's columns
 * (or whose value is null) contribute no segment to that bar — keeps
 * the stack tight and avoids "ghost" zero-height segments.
 *
 * Bars where every segment is null/zero are dropped entirely (e.g. the
 * leading/trailing buckets the sample response shows with all nulls).
 *
 * `pill` drives the x-axis label format:
 *   Custom    → "DD/MM"   (one bar per day)
 *   Month     → "DD"      (one bar per day, all in same month)
 *   Year      → "Apr"     (one bar per month)
 *   Life Time → "2024"    (one bar per year)
 */
const buildStackData = (
  rows: EnergyReportRow[],
  pill: string,
  mapping: ReportMapping | undefined | null,
): StackBar[] => {
  return rows
    .map(row => {
      const stacks: StackSegment[] = [];
      for (const src of SOURCES) {
        let value = 0;
        let matchedColumn: string | undefined;
        for (const column of Object.keys(row)) {
          if (column === "time") continue;
          const v = row[column];
          if (typeof v !== "number" || !Number.isFinite(v)) continue;
          const matched = findSourceForColumn(column);
          if (matched && matched.token === src.token) {
            value += v;
            if (!matchedColumn) matchedColumn = column;
          }
        }
        if (value > 0) {
          const sourceLabel = matchedColumn
            ? resolveReportLabel(mapping, matchedColumn, src.fallbackLabel)
            : src.fallbackLabel;
          stacks.push({ value, color: src.color, sourceLabel });
        }
      }
      return { label: formatChartLabel(row.time, pill), stacks };
    })
    .filter(b => b.stacks.length > 0);
};

const PerformanceReportCard: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  // Default Custom-filter range: last 15 days through today.
  const [startDate, setStartDate] = useState(() =>
    daysAgo(DEFAULT_CUSTOM_RANGE_DAYS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
  // Month / Year pickers default to "current month/year".
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] =
    useState<InverterFilterOption>("Custom");
  // Stacked bar chart zoom — multiplies the adaptive bar width +
  // spacing. 1×–3×, 0.5× step.
  const [barZoom, setBarZoom] = useState(MIN_BAR_ZOOM);

  // Memoised so React Query treats identical pill+date selections as the
  // same cache entry. New object only when pill or dates actually change.
  const reportFilter = useMemo(
    () =>
      buildReportFilter(
        activeFilter,
        startDate,
        endDate,
        selectedMonth,
        selectedYear,
      ),
    [activeFilter, startDate, endDate, selectedMonth, selectedYear],
  );

  const {
    data: reportData,
    refetch,
    isLoading,
    isFetching,
    error,
  } = useEnergyReport(siteId, reportFilter);

  // Read-only subscriber to the cached report-mapping. The cache is
  // primed by `useSwitchActiveSite` on every site tap, so this is
  // typically a synchronous in-memory read.
  const { data: reportMapping } = useReportMapping();

  const aggregated = useMemo<AggregatedSource[]>(
    () => aggregateEnergy(reportData?.data ?? [], reportMapping),
    [reportData, reportMapping],
  );

  /**
   * Stack data drives the per-time-bucket bar chart. `niceCeiling` of
   * the largest bar's total gives the y-axis a friendly upper bound
   * with rounded gridlines.
   */
  const stackData = useMemo<StackBar[]>(
    () => buildStackData(reportData?.data ?? [], activeFilter, reportMapping),
    [reportData, activeFilter, reportMapping],
  );

  /**
   * Sources actually present in the current period — used for the
   * compact chart legend below the bars. Mirrors the pie chart's
   * "only show what has data" behaviour.
   */
  const visibleSources = useMemo(
    () => aggregated.filter(s => s.value > 0),
    [aggregated],
  );

  const stackMaxValue = useMemo(() => {
    if (stackData.length === 0) return 0;
    const maxTotal = Math.max(
      ...stackData.map(b =>
        b.stacks.reduce((acc, s) => acc + s.value, 0),
      ),
    );
    return niceCeiling(maxTotal);
  }, [stackData]);

  /**
   * Adaptive bar / spacing sizing.
   *
   * gifted-charts' intrinsic chart width is `count × (barWidth + spacing)`.
   * With the fixed defaults that worked for ~15 daily bars, sparser
   * selections (5 monthly bars on Year, 1 yearly bar on Lifetime)
   * collapsed to the left of the card.
   *
   * We split a target "content width" between bar + gap per slot —
   * 55% bar / 45% gap — clamped to sensible min/max so the bars never
   * vanish into pixel-thin slivers nor blow out into rectangles.
   *
   * `initialSpacing` is bumped for the 1-bar case so the lone bar
   * sits centred rather than hugging the y-axis.
   */
  const { adaptiveBarWidth, adaptiveSpacing, adaptiveInitialSpacing } =
    useMemo(() => {
      const count = stackData.length;
      if (count === 0) {
        return {
          adaptiveBarWidth: BAR_MIN_WIDTH,
          adaptiveSpacing: BAR_MIN_SPACING,
          adaptiveInitialSpacing: undefined as number | undefined,
        };
      }
      const slotWidth = BAR_AVAILABLE_WIDTH / count;
      const barW = Math.max(
        BAR_MIN_WIDTH,
        Math.min(BAR_MAX_WIDTH, slotWidth * 0.55),
      );
      const sp = Math.max(BAR_MIN_SPACING, slotWidth - barW);
      const initial =
        count === 1 ? (BAR_AVAILABLE_WIDTH - barW) / 2 : undefined;
      return {
        adaptiveBarWidth: barW,
        adaptiveSpacing: sp,
        adaptiveInitialSpacing: initial,
      };
    }, [stackData.length]);

  // Apply the current zoom factor to the adaptive sizing — bars and
  // gaps scale together so they keep their visual proportion. Anything
  // beyond the card width triggers the gifted-charts horizontal scroll.
  const zoomedBarWidth = adaptiveBarWidth * barZoom;
  const zoomedSpacing = adaptiveSpacing * barZoom;
  const zoomedInitialSpacing =
    adaptiveInitialSpacing != null
      ? adaptiveInitialSpacing * barZoom
      : undefined;

  const zoomIn = () =>
    setBarZoom(prev => Math.min(prev + BAR_ZOOM_STEP, MAX_BAR_ZOOM));
  const zoomOut = () =>
    setBarZoom(prev => Math.max(prev - BAR_ZOOM_STEP, MIN_BAR_ZOOM));
  const canZoomIn = barZoom < MAX_BAR_ZOOM;
  const canZoomOut = barZoom > MIN_BAR_ZOOM;

  // Total across all sources — used to detect "empty period" (every
  // source aggregated to zero) so we can render an empty state instead
  // of a 4-segment all-zero pie chart that gifted-charts can't render.
  const grandTotal = aggregated.reduce((acc, s) => acc + s.value, 0);

  // Clamp selection so a previous index doesn't bleed into a refetched
  // result with a different shape.
  const safeSelectedIndex = Math.min(
    selectedIndex,
    Math.max(aggregated.length - 1, 0),
  );

  // If the currently-selected source has no data (e.g. user had Battery
  // selected, then a refetch returned `ed_battery: null` for the new
  // period), redirect to the first source that does — otherwise the
  // info card on the left would freeze on a "0.00 / 0%" reading with
  // no legend pill the user could tap to change it.
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

  /**
   * Pill tap dispatcher — opens the right picker for the active
   * filter. Lifetime has nothing to pick, so the pill is non-interactive.
   */
  const handlePillPress = () => {
    switch (activeFilter) {
      case "Custom":
        setShowDatePicker(true);
        break;
      case "Month":
        setShowMonthPicker(true);
        break;
      case "Year":
        setShowYearPicker(true);
        break;
      case "Life Time":
      default:
        break;
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  /**
   * Stack of "source detail" cards rendered below the pie chart. Each
   * non-zero source gets its own card showing label / value / percent
   * — same information the web design surfaces around the pie's edges
   * via leader lines, just adapted for narrow mobile widths.
   *
   * Tapping a card focuses the matching segment in the pie chart.
   */
  const SourceList: FC = () => (
    <View style={styles.sourceList}>
      {aggregated
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.value > 0)
        .map(({ item, index }) => {
          const isActive = index === safeSelectedIndex;
          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => setSelectedIndex(index)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.sourceCard,
                {
                  borderColor: isActive
                    ? item.color
                    : colors.inputDarkBorder,
                  borderWidth: isActive ? 1.5 : 1,
                },
              ]}>
              <View
                style={[
                  styles.sourceDot,
                  { backgroundColor: item.color },
                ]}
              />
              <View style={styles.sourceContent}>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  color={colors.textSecondary}
                  numberOfLines={1}>
                  {item.label}
                </AppText>
                <AppText
                  fontSize={FONT_SIZE_LG}
                  bold
                  color={colors.primaryText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}>
                  {item.displayValue}
                </AppText>
              </View>
              <View
                style={[
                  styles.percentBadge,
                  { backgroundColor: item.color },
                ]}>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  bold
                  color={WHITE}
                  numberOfLines={1}>
                  {item.percentage}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}
    </View>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator color={colors.primaryText} />
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center>
            Loading performance report...
          </AppText>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.statusContainer}>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center>
            Couldn't load performance report.
          </AppText>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <AppText fontSize={FONT_SIZE_XS} medium color={PROGRESS_FILLED}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    if (grandTotal <= 0) {
      return (
        <View style={styles.statusContainer}>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center>
            No energy data for this period.
          </AppText>
        </View>
      );
    }
    return (
      <>
        {/* Centred pie chart — each segment's matching source card lives
            in <SourceList/> below, so all the labels / values / %s are
            visible at a glance without leader lines (which are awkward
            at mobile widths). */}
        <View style={styles.pieContainer}>
          <PieChart
            data={pieData}
            radius={PIE_RADIUS}
            focusOnPress
            extraRadius={FOCUSED_PIE_EXTRA_RADIUS}
            backgroundColor={TRANSPARENT}
          />
        </View>

        <SourceList />

        {/* Stacked bar chart — same data as the pie, broken out per
            time bucket (typically one bar per day). Colours mirror the
            pie segments + source cards; horizontal scroll kicks in if
            the active period has more bars than fit on screen. */}
        {stackData.length > 0 ? (
          <View style={styles.stackChartContainer}>
            {/* Zoom controls — right-aligned above the chart. Same
                visual language as TrendAnalysisCard so the two charts
                feel like part of the same family. */}
            <View style={styles.zoomControls}>
              <TouchableOpacity
                style={[
                  styles.zoomButton,
                  !canZoomOut && styles.zoomButtonDisabled,
                ]}
                onPress={zoomOut}
                disabled={!canZoomOut}
                accessibilityRole="button"
                accessibilityLabel="Zoom out"
                accessibilityState={{ disabled: !canZoomOut }}>
                <Minus
                  size={ICON_SIZE_XS}
                  color={
                    canZoomOut ? colors.primaryText : colors.textSecondary
                  }
                />
              </TouchableOpacity>
              <AppText
                fontSize={FONT_SIZE_XXS}
                color={colors.textSecondary}>
                {barZoom.toFixed(1)}x
              </AppText>
              <TouchableOpacity
                style={[
                  styles.zoomButton,
                  !canZoomIn && styles.zoomButtonDisabled,
                ]}
                onPress={zoomIn}
                disabled={!canZoomIn}
                accessibilityRole="button"
                accessibilityLabel="Zoom in"
                accessibilityState={{ disabled: !canZoomIn }}>
                <Plus
                  size={ICON_SIZE_XS}
                  color={
                    canZoomIn ? colors.primaryText : colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            <BarChart
              stackData={stackData}
              barWidth={zoomedBarWidth}
              spacing={zoomedSpacing}
              initialSpacing={zoomedInitialSpacing}
              barBorderRadius={normalizeWidth(2)}
              height={BAR_CHART_HEIGHT}
              maxValue={stackMaxValue || undefined}
              noOfSections={BAR_CHART_SECTIONS}
              isAnimated
              hideRules={false}
              rulesColor={colors.chartRuleColor}
              rulesType="solid"
              xAxisColor={colors.textSecondary}
              yAxisColor={TRANSPARENT}
              xAxisLabelTextStyle={{
                color: colors.textSecondary,
                fontSize: FONT_SIZE_MICRO,
              }}
              yAxisTextStyle={{
                color: colors.textSecondary,
                fontSize: FONT_SIZE_XXS,
              }}
              formatYLabel={formatYAxis}
              disableScroll={false}
            />

            {/* Compact chart legend — colour dot + mapping label per
                source actually present in the current period. */}
            {visibleSources.length > 0 ? (
              <View style={styles.chartLegend}>
                {visibleSources.map(s => (
                  <View key={s.label} style={styles.chartLegendItem}>
                    <View
                      style={[
                        styles.chartLegendDot,
                        { backgroundColor: s.color },
                      ]}
                    />
                    <AppText
                      fontSize={FONT_SIZE_XXS}
                      color={colors.textSecondary}
                      numberOfLines={1}>
                      {s.label}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Subtle background-refetch indicator. */}
        {!isLoading && isFetching ? (
          <View style={styles.bgFetchHint}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <DateFilterHeader
        title="Performance Report"
        dateLabel={formatDateFilterLabel(
          activeFilter,
          startDate,
          endDate,
          selectedMonth,
          selectedYear,
        )}
        pillDisabled={activeFilter === "Life Time"}
        onDatePress={handlePillPress}
        onRefresh={handleRefresh}
      />

      <View style={styles.body}>
        {/* Custom / Month / Year / Life Time pills — same UX as
            Inverter Table. Driving the same `?type=energy_queries`
            request via `buildReportFilter`. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled">
          {inverterFilters.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterActive : styles.filterInactive,
                ]}
                onPress={() => setActiveFilter(filter)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}>
                <AppText
                  fontSize={FONT_SIZE_XS}
                  medium
                  color={isActive ? WHITE : colors.textSecondary}>
                  {filter}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {renderBody()}
      </View>

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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16),
      overflow: "hidden",
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
      gap: normalizeHeight(16),
    },
    filterRow: {
      flexDirection: "row",
      gap: normalizeWidth(8),
      paddingVertical: normalizeHeight(4),
    },
    filterPill: {
      paddingHorizontal: FILTER_PILL_PH,
      paddingVertical: FILTER_PILL_PV,
      borderRadius: FILTER_PILL_RADIUS,
      borderWidth: 1,
    },
    filterActive: {
      backgroundColor: colors.tabActiveBg,
      borderColor: colors.tabActiveBg,
    },
    filterInactive: {
      backgroundColor: colors.tabInactiveBg,
      borderColor: colors.inputDarkBorder,
    },
    pieContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: normalizeHeight(8),
    },
    sourceList: {
      gap: normalizeHeight(8),
    },
    stackChartContainer: {
      paddingTop: normalizeHeight(12),
      paddingBottom: normalizeHeight(4),
      gap: normalizeHeight(8),
    },
    zoomControls: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-end",
      gap: normalizeWidth(8),
    },
    zoomButton: {
      width: ZOOM_BUTTON_SIZE,
      height: ZOOM_BUTTON_SIZE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(6),
    },
    zoomButtonDisabled: {
      opacity: 0.4,
    },
    chartLegend: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: normalizeWidth(12),
      paddingTop: normalizeHeight(8),
    },
    chartLegendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(6),
    },
    chartLegendDot: {
      width: normalizeWidth(8),
      height: normalizeWidth(8),
      borderRadius: normalizeWidth(4),
    },
    sourceCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.metricCardBg,
      borderRadius: SOURCE_CARD_RADIUS,
      paddingVertical: SOURCE_CARD_PADDING,
      paddingHorizontal: SOURCE_CARD_PADDING,
      gap: normalizeWidth(12),
    },
    sourceDot: {
      width: SOURCE_DOT_SIZE,
      height: SOURCE_DOT_SIZE,
      borderRadius: SOURCE_DOT_SIZE / 2,
    },
    sourceContent: {
      flex: 1,
      gap: normalizeHeight(2),
    },
    percentBadge: {
      paddingHorizontal: PERCENT_BADGE_PH,
      paddingVertical: PERCENT_BADGE_PV,
      borderRadius: PERCENT_BADGE_RADIUS,
    },
    statusContainer: {
      paddingVertical: normalizeHeight(40),
      alignItems: "center",
      gap: normalizeHeight(8),
    },
    retryBtn: {
      paddingHorizontal: normalizeWidth(20),
      paddingVertical: normalizeHeight(10),
      borderWidth: 1,
      borderColor: PROGRESS_FILLED,
      borderRadius: 100,
      marginTop: normalizeHeight(4),
    },
    bgFetchHint: {
      paddingTop: normalizeHeight(4),
      alignItems: "center",
    },
  });

export default PerformanceReportCard;
