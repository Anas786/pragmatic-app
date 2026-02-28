import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { formatDate } from 'src/utils/format';
import GradientRangeBar from './GradientRangeBar';
import TrendAnalysisCard from './TrendAnalysisCard';
import PerformanceReportCard from './PerformanceReportCard';
import InverterTableCard from './InverterTableCard';
import DateRangePickerModal from './DateRangePickerModal';
import { mockTrendsData } from 'src/data/mock';
import { CalendarIcon, RefreshIcon } from 'src/assets/icons';

const TrendView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [startDate, setStartDate] = useState(new Date(2025, 11, 16));
  const [endDate, setEndDate] = useState(new Date(2025, 11, 17));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateRange = `${formatDate(startDate, 'DD/MM/YY')} - ${formatDate(endDate, 'DD/MM/YY')}`;

  const handleDateApply = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleRefresh = () => {
    console.log('Refresh data');
  };

  return (
    <View style={styles.wrapper}>
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          Chart Analysis
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

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}>
            <RefreshIcon size={ICON_SIZE_MD} color={ACCENT_GREEN} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {mockTrendsData.map((trend, index) => (
          <GradientRangeBar
            key={index}
            title={trend.title}
            min={trend.min}
            avg={trend.avg}
            max={trend.max}
          />
        ))}
      </View>
    </View>

    <TrendAnalysisCard />

    <PerformanceReportCard />

    <InverterTableCard />

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
    wrapper: {
      gap: normalizeHeight(16),
    },
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.inputDarkBg,
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
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: ACCENT_GREEN,
      borderRadius: 100,
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
      gap: normalizeHeight(16),
    },
  });

export default TrendView;
