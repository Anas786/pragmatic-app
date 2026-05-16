import React, { FC, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { AppText } from "src/components/common";
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_LG,
  formatDateFilterLabel,
  MonthSelection,
  normalizeHeight,
  normalizeWidth,
  PROGRESS_FILLED,
  ThemeColors,
  WHITE,
} from "src/utils";
import { useInverterReport, useThemeStore } from "src/hooks";
import { InverterReportRow } from "src/networking";
import { DashboardStackParamList } from "src/types";
import {
  InverterEntryData,
  InverterFilterOption,
  inverterFilters,
} from "src/data/mock";
import DateRangePickerModal from "./DateRangePickerModal";
import DateFilterHeader from "./DateFilterHeader";
import MonthYearPickerModal from "./MonthYearPickerModal";

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, "SiteDetail">;

/**
 * Format a backend-supplied number with locale separators + 2 decimals.
 * Returns em-dash for non-finite / missing values so the row gracefully
 * degrades when an inverter reports incomplete data.
 */
const formatNumber = (value: unknown): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Convert backend rows into the shape `<InverterEntry>` already knows
 * how to render. Keeps the rendering layer untouched while moving the
 * data source from `mockInverterData` to the live API.
 *
 *   inverter_num → "Inverter <n>" title
 *   ed_solar     → Production (kWh)
 *   yield        → Yield
 *   pr           → Performance Ratio (0–100, drives the green progress bar)
 *   up_percent   → Uptime % (0–100, drives the blue progress bar)
 */
const mapRowsToEntries = (rows: InverterReportRow[]): InverterEntryData[] =>
  rows.map(row => ({
    title: `Inverter ${row.inverter_num ?? "—"}`,
    production: formatNumber(row.ed_solar),
    yield: formatNumber(row.yield),
    performanceRatio:
      typeof row.pr === "number" && Number.isFinite(row.pr) ? row.pr : 0,
    uptimePercent:
      typeof row.up_percent === "number" && Number.isFinite(row.up_percent)
        ? row.up_percent
        : 0,
  }));

const PROGRESS_BAR_HEIGHT = normalizeHeight(6);
const PROGRESS_BAR_RADIUS = 1000;
const FILTER_PILL_PH = normalizeWidth(20);
const FILTER_PILL_PV = normalizeHeight(10);
const FILTER_PILL_RADIUS = 100;
const METRIC_CARD_RADIUS = normalizeWidth(12);
const METRIC_CARD_PV = normalizeHeight(14);
const METRIC_CARD_PH = normalizeWidth(12);

const InverterTableCard: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  // Default Custom-filter range: last 15 days through today.
  const [startDate, setStartDate] = useState(() =>
    daysAgo(DEFAULT_CUSTOM_RANGE_DAYS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
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
  const [activeFilter, setActiveFilter] =
    useState<InverterFilterOption>("Custom");

  // Memoise the filter shape so React Query treats identical selections
  // as the same cache entry. New object only when pill or dates change.
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

  // Fires GET /protected/data/v2/report/{siteId}?type=inverter_queries&...
  // automatically on mount, on filter change, and on date change.
  const {
    data: reportData,
    refetch,
    isLoading,
    isFetching,
    error,
  } = useInverterReport(siteId, reportFilter);

  // Map backend rows → render-friendly entries. Memoised on the actual
  // data reference so flips between cache-hit selections don't recompute.
  const inverterEntries = useMemo<InverterEntryData[]>(
    () => mapRowsToEntries(reportData?.data ?? []),
    [reportData],
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

  const ProgressBar: FC<{ percent: number; color: string }> = ({
    percent,
    color,
  }) => (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${percent}%`, backgroundColor: color },
        ]}
      />
    </View>
  );

  const ProgressRow: FC<{
    label: string;
    value: string;
    color: string;
    percent: number;
  }> = ({ label, value, color, percent }) => (
    <View style={styles.progressSection}>
      <View style={styles.progressLabelRow}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          {label}
        </AppText>
        <AppText fontSize={FONT_SIZE_XS} bold color={color}>
          {value}
        </AppText>
      </View>
      <ProgressBar percent={percent} color={color} />
    </View>
  );

  const InverterEntry: FC<InverterEntryData> = ({
    title,
    production,
    yield: yieldValue,
    performanceRatio,
    uptimePercent,
  }) => (
    <View style={styles.entryContainer}>
      <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
        {title}
      </AppText>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <AppText fontSize={FONT_SIZE_XS} color={colors.primaryText}>
            Production
          </AppText>
          <AppText fontSize={FONT_SIZE_LG} bold color={colors.primaryText}>
            {production}
          </AppText>
        </View>
        <View style={styles.metricCard}>
          <AppText fontSize={FONT_SIZE_XS} color={colors.primaryText}>
            Yield
          </AppText>
          <AppText fontSize={FONT_SIZE_LG} bold color={colors.primaryText}>
            {yieldValue}
          </AppText>
        </View>
      </View>

      <ProgressRow
        label="Performance Ratio"
        // 2-decimal display so a raw 79.50382950726677 from the API
        // renders as "79.50%" instead of dumping the full float.
        value={`${performanceRatio.toFixed(2)}%`}
        color={ACCENT_GREEN}
        percent={performanceRatio}
      />

      <ProgressRow
        label="Uptime %"
        value={`${uptimePercent.toFixed(2)}%`}
        color={ACCENT_BLUE}
        percent={uptimePercent}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <DateFilterHeader
        title="Inverter Table"
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
        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {inverterFilters.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterPill,
                  isActive ? styles.filterActive : styles.filterInactive,
                ]}
                onPress={() => setActiveFilter(filter)}>
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

        {/* Inverter entries — driven by the inverter_queries report API */}
        {isLoading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color={colors.primaryText} />
            <AppText
              fontSize={FONT_SIZE_XS}
              color={colors.textSecondary}
              center>
              Loading inverters...
            </AppText>
          </View>
        ) : error ? (
          <View style={styles.statusContainer}>
            <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary} center>
              Couldn't load inverter report.
            </AppText>
            <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
              <AppText fontSize={FONT_SIZE_XS} medium color={PROGRESS_FILLED}>
                Retry
              </AppText>
            </TouchableOpacity>
          </View>
        ) : inverterEntries.length === 0 ? (
          <View style={styles.statusContainer}>
            <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary} center>
              No inverter data for this period.
            </AppText>
          </View>
        ) : (
          inverterEntries.map((entry, index) => (
            <InverterEntry key={`${entry.title}-${index}`} {...entry} />
          ))
        )}

        {/* Subtle background-refetch indicator: shows while a silent
            refetch (e.g. stale cache crossed 5 min) is in flight. */}
        {!isLoading && isFetching ? (
          <View style={styles.bgFetchHint}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : null}
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
    entryContainer: {
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16),
      padding: normalizeWidth(16),
      gap: normalizeHeight(16),
    },
    metricsRow: {
      flexDirection: "row",
      gap: normalizeWidth(10),
    },
    metricCard: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: METRIC_CARD_RADIUS,
      paddingVertical: METRIC_CARD_PV,
      paddingHorizontal: METRIC_CARD_PH,
      gap: normalizeHeight(6),
    },
    progressSection: {
      gap: normalizeHeight(6),
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressTrack: {
      height: PROGRESS_BAR_HEIGHT,
      backgroundColor: colors.progressBg,
      borderRadius: PROGRESS_BAR_RADIUS,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: PROGRESS_BAR_RADIUS,
    },
    statusContainer: {
      paddingVertical: normalizeHeight(24),
      alignItems: "center",
      gap: normalizeHeight(8),
    },
    retryBtn: {
      paddingHorizontal: normalizeWidth(20),
      paddingVertical: normalizeHeight(8),
      borderWidth: 1,
      borderColor: PROGRESS_FILLED,
      borderRadius: 100,
    },
    bgFetchHint: {
      alignItems: "center",
      paddingTop: normalizeHeight(4),
    },
  });

export default InverterTableCard;
