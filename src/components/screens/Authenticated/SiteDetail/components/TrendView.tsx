import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  formatDateFilterLabel,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import GradientRangeBar from './GradientRangeBar';
import TrendAnalysisCard from './TrendAnalysisCard';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import { mockTrendsData } from 'src/data/mock';

const TrendView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Default Custom-filter range: last 15 days through today. Lazy
  // initialisers so the Date constructions only run once on first
  // render, not on every re-render.
  const [startDate, setStartDate] = useState(() =>
    daysAgo(DEFAULT_CUSTOM_RANGE_DAYS),
  );
  const [endDate, setEndDate] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

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
        <DateFilterHeader
          title="Chart Analysis"
          dateLabel={formatDateFilterLabel('Custom', startDate, endDate)}
          onDatePress={() => setShowDatePicker(true)}
          onRefresh={handleRefresh}
        />

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
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
      gap: normalizeHeight(16),
    },
  });

export default TrendView;
