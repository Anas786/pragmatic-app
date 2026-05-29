import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { EmptyStateCard, Skeleton } from 'src/components/common';
import { duration, radius as radiusTokens, space, useScheme } from 'src/theme';
import { TrendConfig } from 'src/types';
import {
  buildTrendRange,
  daysAgo,
  DEFAULT_TREND_PERIOD,
  formatTrendPeriodLabel,
  getDeviceTimeZone,
  TREND_CUSTOM_MAX_RANGE,
  TREND_PERIODS,
  TrendPeriod,
  trendWindowMs,
} from 'src/utils';
import { useInteractionReady, useTrendData } from 'src/hooks';
import DateFilterHeader from '../DateFilterHeader';
import DateRangePickerModal from '../DateRangePickerModal';
import ReportFilterPill from '../PerformanceReport/ReportFilterPill';
import TrendComboChart from './TrendComboChart';
import { TREND_CHART_HEIGHT } from './helpers';

interface TrendSectionProps {
  siteId: string;
  /** 0-based index into `siteComponents.trends[]` — drives the data idx. */
  idx: number;
  trend: TrendConfig;
}

/**
 * One trend section: heading + independent period filter + a single
 * combined echarts chart (line+area+bar in one frame). The data query
 * fires on mount (so the request is in flight during the tab
 * transition); the chart mount is deferred behind `useInteractionReady`
 * with an index-based stagger so N sections don't all mount at once.
 */
const TrendSection: FC<TrendSectionProps> = ({ siteId, idx, trend }) => {
  const scheme = useScheme();

  const [period, setPeriod] = useState<TrendPeriod>(DEFAULT_TREND_PERIOD);
  const [customStart, setCustomStart] = useState(() =>
    daysAgo(TREND_CUSTOM_MAX_RANGE),
  );
  const [customEnd, setCustomEnd] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);

  const tz = useMemo(() => getDeviceTimeZone(), []);
  const range = useMemo(
    () => buildTrendRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );
  const windowMs = useMemo(
    () => trendWindowMs(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  const args = useMemo(
    () => ({ start: range.start, end: range.end, tz }),
    [range.start, range.end, tz],
  );

  const { data, isLoading, isFetching, error, refetch } = useTrendData(
    siteId,
    idx,
    args,
  );

  // Defer chart mount until the tab transition settles; stagger by index.
  const ready = useInteractionReady(140 + idx * 70);

  const rows = data?.data ?? [];

  const handleSelectPeriod = (next: TrendPeriod) => {
    setPeriod(next);
    if (next === 'Custom') setShowPicker(true);
  };

  const handleApplyCustom = (start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod('Custom');
  };

  const renderBody = () => {
    if (!ready || (isLoading && rows.length === 0)) {
      return <Skeleton width="100%" height={TREND_CHART_HEIGHT} radius="lg" />;
    }
    if (error) {
      return (
        <EmptyStateCard
          title="Couldn't load trend"
          message="Tap retry to try again."
          onRetry={() => refetch()}
        />
      );
    }
    if (rows.length === 0) {
      return <EmptyStateCard message="No data for this period." />;
    }
    return (
      <TrendComboChart
        rows={rows}
        aggregations={trend.aggregations}
        windowMs={windowMs}
        title={trend.heading}
      />
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(40 * idx)
        .duration(duration.fast)
        .springify()
        .damping(20)}
      style={[styles.section, { borderTopColor: scheme.hairline }]}>
      <DateFilterHeader
        title={trend.heading}
        caption={trend.subHeading}
        dateLabel={formatTrendPeriodLabel(period, customStart, customEnd)}
        pillDisabled={period !== 'Custom'}
        onDatePress={() => setShowPicker(true)}
        onRefresh={refetch}
        refreshing={isFetching}
      />

      <View style={styles.pills}>
        {TREND_PERIODS.map(p => (
          <ReportFilterPill
            key={p}
            active={period === p}
            label={p}
            onPress={() => handleSelectPeriod(p)}
          />
        ))}
      </View>

      {renderBody()}

      <DateRangePickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        startDate={customStart}
        endDate={customEnd}
        maxRangeDays={TREND_CUSTOM_MAX_RANGE}
        onApply={handleApplyCustom}
      />
    </Animated.View>
  );
};
TrendSection.displayName = 'TrendSection';

const styles = StyleSheet.create({
  section: {
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusTokens.sm,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingHorizontal: space.xs,
  },
});

export default React.memo(TrendSection);
