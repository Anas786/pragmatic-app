import React, { FC, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  FONT_SIZE_XL,
  ICON_SIZE_XS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  TRANSPARENT,
  WHITE,
} from 'src/utils';
import { formatDate } from 'src/utils/format';
import { performanceReportData } from 'src/data/mock';
import DateRangePickerModal from './DateRangePickerModal';

const PIE_RADIUS = normalizeWidth(100);
const FOCUSED_PIE_EXTRA_RADIUS = normalizeWidth(10);
const PERCENT_BADGE_PH = normalizeWidth(10);
const PERCENT_BADGE_PV = normalizeHeight(3);
const PERCENT_BADGE_RADIUS = 100;
const INFO_BOX_RADIUS = normalizeWidth(14);
const INFO_BOX_PADDING = normalizeWidth(16);
const INFO_BOX_GAP = normalizeHeight(8);
const ACCENT_BAR_WIDTH = normalizeWidth(4);
const ACCENT_BAR_HEIGHT = normalizeHeight(44);
const ACCENT_BAR_RADIUS = normalizeWidth(2);
const LEGEND_GAP = normalizeWidth(8);
const LEGEND_PILL_PH = normalizeWidth(16);
const LEGEND_PILL_PV = normalizeHeight(8);
const LEGEND_PILL_RADIUS = 100;

const Legend: FC = () => (
  <View style={styles.legendContainer}>
    {performanceReportData.map((item, index) => (
      <View
        key={index}
        style={[styles.legendPill, { backgroundColor: item.color }]}>
        <AppText fontSize={FONT_SIZE_XXS} bold color={WHITE} numberOfLines={1}>
          {item.label}
        </AppText>
      </View>
    ))}
  </View>
);

const PerformanceReportCard: FC = () => {
  const [startDate, setStartDate] = useState(new Date(2025, 11, 16));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 17));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const dateRange = `${formatDate(startDate, 'DD/MM/YY')} - ${formatDate(endDate, 'DD/MM/YY')}`;

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const selected = performanceReportData[selectedIndex];

  const pieData = performanceReportData.map((item, index) => ({
    value: item.value,
    color: item.color,
    focused: index === selectedIndex,
    onPress: () => setSelectedIndex(index),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={WHITE}>
          Performance Report
        </AppText>

        <TouchableOpacity
          style={styles.dateRangeContainer}
          onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar-outline" size={ICON_SIZE_XS} color={WHITE} />
          <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
            {dateRange}
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.chartLayout}>
          {/* Selected info card */}
          <View style={styles.infoCard}>
            <View
              style={[
                styles.accentBar,
                { backgroundColor: selected.color },
              ]}
            />
            <View style={styles.infoContent}>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={TEXT_SECONDARY}
                numberOfLines={2}>
                {selected.label}
              </AppText>
              <View style={styles.infoValueRow}>
                <AppText fontSize={FONT_SIZE_XL} bold color={WHITE}>
                  {selected.displayValue}
                </AppText>
                <View style={styles.percentBadge}>
                  <AppText fontSize={FONT_SIZE_XXS} bold color={WHITE}>
                    {selected.percentage}
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {/* Pie chart */}
          <View style={styles.pieContainer}>
            <PieChart
              data={pieData}
              radius={PIE_RADIUS}
              focusOnPress
              extraRadius={FOCUSED_PIE_EXTRA_RADIUS}
              backgroundColor={TRANSPARENT}
            />
          </View>
        </View>

        <Legend />
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
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_DARK_BORDER,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: LEGEND_PILL_RADIUS,
    paddingHorizontal: normalizeWidth(14),
    paddingVertical: normalizeHeight(8),
    gap: normalizeWidth(8),
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(12),
    gap: normalizeHeight(20),
  },
  chartLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
    borderRadius: INFO_BOX_RADIUS,
    padding: INFO_BOX_PADDING,
    gap: normalizeWidth(12),
    marginRight: normalizeWidth(8),
  },
  accentBar: {
    width: ACCENT_BAR_WIDTH,
    height: ACCENT_BAR_HEIGHT,
    borderRadius: ACCENT_BAR_RADIUS,
  },
  infoContent: {
    flex: 1,
    gap: INFO_BOX_GAP,
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(8),
  },
  percentBadge: {
    backgroundColor: ACCENT_GREEN,
    paddingHorizontal: PERCENT_BADGE_PH,
    paddingVertical: PERCENT_BADGE_PV,
    borderRadius: PERCENT_BADGE_RADIUS,
  },
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: LEGEND_GAP,
  },
  legendPill: {
    paddingHorizontal: LEGEND_PILL_PH,
    paddingVertical: LEGEND_PILL_PV,
    borderRadius: LEGEND_PILL_RADIUS,
  },
});

export default PerformanceReportCard;
