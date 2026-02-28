import React, { FC, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { AppText } from "src/components/common";
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_LG,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  WHITE,
} from "src/utils";
import { useThemeStore } from "src/hooks";
import { formatDate } from "src/utils/format";
import {
  InverterEntryData,
  InverterFilterOption,
  inverterFilters,
  mockInverterData,
} from "src/data/mock";
import DateRangePickerModal from "./DateRangePickerModal";
import { CalendarIcon, RefreshIcon } from "src/assets/icons";

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
  const [startDate, setStartDate] = useState(new Date(2025, 11, 16));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 17));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeFilter, setActiveFilter] =
    useState<InverterFilterOption>("Custom");

  const dateRange = `${formatDate(startDate, "DD/MM/YY")} - ${formatDate(
    endDate,
    "DD/MM/YY",
  )}`;

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
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
        value={`${performanceRatio}%`}
        color={ACCENT_GREEN}
        percent={performanceRatio}
      />

      <ProgressRow
        label="Uptime %"
        value={`${uptimePercent}%`}
        color={ACCENT_BLUE}
        percent={uptimePercent}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          Inverter Table
        </AppText>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dateRangeContainer}
            onPress={() => setShowDatePicker(true)}>
            <CalendarIcon size={ICON_SIZE_XS} color={colors.dateFilterText} />
            <AppText fontSize={FONT_SIZE_XS} color={colors.dateFilterText}>
              {dateRange}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton}>
            <RefreshIcon size={ICON_SIZE_MD} color={ACCENT_GREEN} />
          </TouchableOpacity>
        </View>
      </View>

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

        {/* Inverter entries */}
        {mockInverterData.map((entry, index) => (
          <InverterEntry key={index} {...entry} />
        ))}
      </View>

      <DateRangePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        startDate={startDate}
        endDate={endDate}
        onApply={handleDateApply}
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
    header: {
      backgroundColor: colors.inputDarkBg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(10),
    },
    dateRangeContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.dateFilterBg,
      borderWidth: 1,
      borderColor: colors.dateFilterBg,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(14),
      paddingVertical: normalizeHeight(8),
      gap: normalizeWidth(8),
    },
    refreshButton: {
      width: normalizeWidth(38),
      height: normalizeWidth(38),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: ACCENT_GREEN,
      borderRadius: 100,
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
  });

export default InverterTableCard;
