import React, { FC, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  FONT_SIZE_LG,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  PROGRESS_BG,
  TAB_ACTIVE_BG,
  TAB_INACTIVE_BG,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { formatDate } from 'src/utils/format';
import {
  InverterEntryData,
  InverterFilterOption,
  inverterFilters,
  mockInverterData,
} from 'src/data/mock';
import DateRangePickerModal from './DateRangePickerModal';

const PROGRESS_BAR_HEIGHT = normalizeHeight(6);
const PROGRESS_BAR_RADIUS = 1000;
const FILTER_PILL_PH = normalizeWidth(20);
const FILTER_PILL_PV = normalizeHeight(10);
const FILTER_PILL_RADIUS = 100;
const METRIC_CARD_RADIUS = normalizeWidth(12);
const METRIC_CARD_PV = normalizeHeight(14);
const METRIC_CARD_PH = normalizeWidth(12);

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
      <AppText fontSize={FONT_SIZE_SM} bold color={WHITE}>
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
    <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
      {title}
    </AppText>

    <View style={styles.metricsRow}>
      <View style={styles.metricCard}>
        <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
          Production
        </AppText>
        <AppText fontSize={FONT_SIZE_LG} bold color={WHITE}>
          {production}
        </AppText>
      </View>
      <View style={styles.metricCard}>
        <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
          Yield
        </AppText>
        <AppText fontSize={FONT_SIZE_LG} bold color={WHITE}>
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

const InverterTableCard: FC = () => {
  const [startDate, setStartDate] = useState(new Date(2025, 11, 16));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 17));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeFilter, setActiveFilter] =
    useState<InverterFilterOption>('Custom');

  const dateRange = `${formatDate(startDate, 'DD/MM/YY')} - ${formatDate(endDate, 'DD/MM/YY')}`;

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={WHITE}>
          Inverter Table
        </AppText>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dateRangeContainer}
            onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar-outline" size={ICON_SIZE_XS} color={WHITE} />
            <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
              {dateRange}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshButton}>
            <Icon name="sync" size={ICON_SIZE_MD} color={ACCENT_GREEN} />
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
                  color={isActive ? WHITE : TEXT_SECONDARY}>
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: normalizeWidth(16),
    overflow: 'hidden',
  },
  header: {
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(16),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(10),
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_DARK_BORDER,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 100,
    paddingHorizontal: normalizeWidth(14),
    paddingVertical: normalizeHeight(8),
    gap: normalizeWidth(8),
  },
  refreshButton: {
    width: normalizeWidth(38),
    height: normalizeWidth(38),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ACCENT_GREEN,
    borderRadius: 100,
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(12),
    gap: normalizeHeight(16),
  },
  filterRow: {
    flexDirection: 'row',
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
    backgroundColor: TAB_ACTIVE_BG,
    borderColor: TAB_ACTIVE_BG,
  },
  filterInactive: {
    backgroundColor: TAB_INACTIVE_BG,
    borderColor: INPUT_DARK_BORDER,
  },
  entryContainer: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
    borderRadius: normalizeWidth(16),
    padding: normalizeWidth(16),
    gap: normalizeHeight(16),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: normalizeWidth(10),
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
    borderRadius: METRIC_CARD_RADIUS,
    paddingVertical: METRIC_CARD_PV,
    paddingHorizontal: METRIC_CARD_PH,
    gap: normalizeHeight(6),
  },
  progressSection: {
    gap: normalizeHeight(6),
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: PROGRESS_BAR_HEIGHT,
    backgroundColor: PROGRESS_BG,
    borderRadius: PROGRESS_BAR_RADIUS,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_BAR_RADIUS,
  },
});

export default InverterTableCard;
