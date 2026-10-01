import React, { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  EmptyStateCard,
  IconButton,
  Pill,
  PillGroup,
  Skeleton,
} from 'src/components/common';
import { duration, radius as radiusTokens, space, useScheme } from 'src/theme';
import { TrendConfig, TrendDataRow } from 'src/types';
import {
  buildTrendRange,
  daysAgo,
  DEFAULT_TREND_PERIOD,
  formatTrendWindowLabel,
  friendlyError,
  getDeviceTimeZone,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  TREND_CUSTOM_MAX_RANGE,
  TREND_PERIODS,
  TrendPeriod,
  trendCaption,
  trendPeriodPillA11yLabel,
  trendWindowMs,
} from 'src/utils';
import { useInteractionReady, useTrendData } from 'src/hooks';
import { CalendarIcon } from 'src/assets/icons';
import DateFilterHeader from '../DateFilterHeader';
import DateRangePickerModal from '../DateRangePickerModal';
import TrendComboChart from './TrendComboChart';
import { trendChartLayout, trendChartWidth } from './helpers';
import { useSiteRefresh } from '../../siteRefresh';

// Stable fallback while the query has no data yet — a fresh `[]` per
// render would defeat TrendComboChart's React.memo bail-out.
const EMPTY_ROWS: TrendDataRow[] = [];

/** Before the first onLayout: the section spans the screen minus the
 *  tab body's 16pt gutters (SiteDetail scroll content padding). */
const SCREEN_GUTTERS = 2 * space.lg;

// The window is shown as a caption — there's no date pill to press.
const noop = () => {};

interface TrendSectionProps {
  siteId: string;
  /**
   * 0-based index into the ORIGINAL `siteComponents.trends[]` array —
   * the data endpoint's `idx` contract. NOT necessarily the render
   * position: `selectTrends` drops malformed entries but preserves each
   * survivor's original index (`sourceIdx`).
   */
  idx: number;
  /** Render position among the visible sections — drives the entrance
   *  stagger/deferral only, never the data fetch. */
  position: number;
  trend: TrendConfig;
}

interface TrendPeriodPillProps {
  period: TrendPeriod;
  selected: boolean;
  onSelect: (period: TrendPeriod) => void;
}

/** One period pill with a stable `onPress`, so the memoised `Pill`
 *  doesn't re-render on every section render. 'Custom' always opens the
 *  range picker (also when active — that's how the range is edited), so it
 *  carries the calendar glyph the date pills use elsewhere. */
const TrendPeriodPill = memo<TrendPeriodPillProps>(
  ({ period, selected, onSelect }) => {
    const scheme = useScheme();
    const handlePress = useCallback(() => onSelect(period), [onSelect, period]);
    const leading = useMemo(
      () =>
        period === 'Custom' ? (
          <CalendarIcon
            size={ICON_SIZE_XS}
            color={selected ? scheme.textOnBrand : scheme.textPrimary}
          />
        ) : undefined,
      [period, selected, scheme],
    );
    return (
      <Pill
        label={period}
        selected={selected}
        onPress={handlePress}
        leading={leading}
        accessibilityLabel={trendPeriodPillA11yLabel(period)}
      />
    );
  },
);
TrendPeriodPill.displayName = 'TrendPeriodPill';

/**
 * One trend section:
 *
 *   Heading                                   (⤢) (⟳)
 *   [subHeading — only when it adds information]
 *   30 Sep 14:35 – 1 Oct 14:35
 *   (24H) (48H) (72H) (Custom)
 *   ┌ chart card (wrapped legend · plot · zoom slider) ┐
 *
 * The header carries the title, the absolute window as a caption and the
 * full-screen + refresh buttons; the card holds only the chart. Tapping
 * 'Custom' opens the range picker (also when Custom is already active —
 * that's how the range is edited); the period only switches once a range
 * is applied.
 *
 * Height stability: the chart card's height comes from `trendChartLayout`
 * (series names + width, both known before data), and the skeleton, the
 * empty/error slot and the chart all use it. A period change keeps the
 * previous chart mounted, dimmed, until the new rows land.
 *
 * The data query fires on mount (so the request is in flight during the
 * tab transition); the chart mount is deferred behind `useInteractionReady`
 * with a position-based stagger so N sections don't all mount at once.
 */
const TrendSection: FC<TrendSectionProps> = ({
  siteId,
  idx,
  position,
  trend,
}) => {
  const scheme = useScheme();
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

  const [period, setPeriod] = useState<TrendPeriod>(DEFAULT_TREND_PERIOD);
  const [customStart, setCustomStart] = useState(() =>
    daysAgo(TREND_CUSTOM_MAX_RANGE),
  );
  const [customEnd, setCustomEnd] = useState(() => new Date());
  // When the active period was picked — the window caption's end until
  // that period's response (and its `dataUpdatedAt`) arrives.
  const [selectedAt, setSelectedAt] = useState(() => Date.now());
  const [showPicker, setShowPicker] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const chartWidth = trendChartWidth(measuredWidth ?? windowWidth - SCREEN_GUTTERS);
  const layout = useMemo(
    () => trendChartLayout(trend.aggregations, chartWidth),
    [trend.aggregations, chartWidth],
  );

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

  const {
    data,
    error,
    fetchStatus,
    isFetching,
    isPlaceholderData,
    dataUpdatedAt,
    refetch,
  } = useTrendData(siteId, idx, args, { windowMs });

  // Defer chart mount until the tab transition settles; stagger by
  // render position.
  const ready = useInteractionReady(140 + position * 70);

  const rows = data?.data ?? EMPTY_ROWS;
  // The rows on screen may still be the PREVIOUS period's (placeholder)
  // — label them by the window they were fetched for.
  const shownWindowMs = data?.windowMs ?? windowMs;
  const canChart = ready && rows.length > 0;
  // A refetch of rows already on screen (period change, refresh) spins the
  // header's refresh button; the first load shows the skeleton instead.
  const refreshing = isFetching && data !== undefined;

  // Full screen closes for good if the chart goes away underneath it —
  // otherwise the modal would pop open by itself when a chart returns.
  useEffect(() => {
    if (!canChart) setFullscreen(false);
  }, [canChart]);

  // Presets are rolling windows ending when the backend evaluated now():
  // the settled response's timestamp, else when the pill was tapped.
  const anchorMs =
    !isPlaceholderData && dataUpdatedAt > 0 ? dataUpdatedAt : selectedAt;
  const windowLabel = useMemo(
    () => formatTrendWindowLabel(period, customStart, customEnd, anchorMs),
    [period, customStart, customEnd, anchorMs],
  );
  const caption = useMemo(
    () => trendCaption(trend.heading, trend.subHeading),
    [trend.heading, trend.subHeading],
  );
  const friendly = useMemo(() => (error ? friendlyError(error) : null), [error]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setMeasuredWidth(prev => (prev === w ? prev : w));
  }, []);

  const handleSelectPeriod = useCallback((next: TrendPeriod) => {
    // For "Custom", just open the picker — defer switching the active
    // period (and the fetch it triggers) until the user actually applies
    // a range in `handleApplyCustom`. Committing `period='Custom'` here
    // would fire a request against the stale/default custom range first.
    if (next === 'Custom') {
      setShowPicker(true);
      return;
    }
    setPeriod(next);
    setSelectedAt(Date.now());
  }, []);

  const handleApplyCustom = useCallback((start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod('Custom');
    setSelectedAt(Date.now());
  }, []);

  const handleClosePicker = useCallback(() => setShowPicker(false), []);
  const handleOpenFullscreen = useCallback(() => setFullscreen(true), []);
  const handleCloseFullscreen = useCallback(() => setFullscreen(false), []);
  // The SiteDetail-wide refresh: every mounted trend section + /data/all
  // (siteRefresh.ts).
  const handleRefresh = useSiteRefresh(refetch);

  const slotStyle = useMemo(
    () => [styles.stateSlot, { height: layout.cardHeight }],
    [layout.cardHeight],
  );
  const sectionStyle = useMemo(
    () => [styles.section, { borderTopColor: scheme.hairline }],
    [scheme.hairline],
  );

  const fullscreenButton = (
    <IconButton
      variant="soft"
      onPress={handleOpenFullscreen}
      disabled={!canChart}
      style={canChart ? undefined : styles.unavailable}
      accessibilityLabel={`Open ${trend.heading} full screen`}>
      <Icon name="open-in-full" size={ICON_SIZE_MD} color={scheme.brandText} />
    </IconButton>
  );

  const renderBody = () => {
    // Nothing fetched yet (a period change keeps the previous rows as
    // placeholder data, so this is only the first load).
    if (data === undefined && !error) {
      if (fetchStatus === 'paused') {
        return (
          <View style={slotStyle}>
            <EmptyStateCard
              kind="offline"
              size="inline"
              title="You're offline"
              message="This chart will load when you're back online."
            />
          </View>
        );
      }
      return (
        <Skeleton width="100%" height={layout.cardHeight} radius="xl" />
      );
    }
    if (!ready) {
      return (
        <Skeleton width="100%" height={layout.cardHeight} radius="xl" />
      );
    }
    // Only surface the error card when there's nothing to render — a
    // failed BACKGROUND refetch keeps `error` set while react-query v5
    // retains the previous data, and tearing down a working chart (and
    // its in-WebView zoom/legend state) over that would be worse than
    // showing slightly stale rows. The header refresh button remains the
    // retry affordance in that state.
    if (friendly && rows.length === 0) {
      return (
        <View style={slotStyle}>
          <EmptyStateCard
            kind={friendly.kind === 'offline' ? 'offline' : 'error'}
            size="inline"
            title={friendly.title}
            message={friendly.message}
            onRetry={handleRefresh}
          />
        </View>
      );
    }
    if (rows.length === 0) {
      return (
        <View style={slotStyle}>
          <EmptyStateCard
            kind="empty"
            size="inline"
            title="No data for this period"
            message="Try another period."
          />
        </View>
      );
    }
    return (
      <TrendComboChart
        rows={rows}
        aggregations={trend.aggregations}
        windowMs={shownWindowMs}
        title={trend.heading}
        periodSpoken={windowLabel.spoken}
        chartWidth={chartWidth}
        chartHeight={layout.chartHeight}
        updating={isPlaceholderData}
        fullscreen={fullscreen}
        onCloseFullscreen={handleCloseFullscreen}
      />
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(40 * position)
        .duration(duration.fast)
        .springify()
        .damping(20)}
      onLayout={handleLayout}
      style={sectionStyle}>
      <DateFilterHeader
        title={trend.heading}
        caption={caption}
        datePillMode="caption"
        dateLabel={windowLabel.text}
        dateA11yLabel={windowLabel.spoken}
        onDatePress={noop}
        right={fullscreenButton}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <PillGroup label={`${trend.heading} period`}>
        {TREND_PERIODS.map(p => (
          <TrendPeriodPill
            key={p}
            period={p}
            selected={period === p}
            onSelect={handleSelectPeriod}
          />
        ))}
      </PillGroup>

      {renderBody()}

      <DateRangePickerModal
        visible={showPicker}
        onClose={handleClosePicker}
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
    gap: space.sm,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusTokens.sm,
  },
  // Empty / error / offline states fill the chart card's exact height.
  stateSlot: {
    justifyContent: 'center',
  },
  unavailable: {
    opacity: 0.4,
  },
});

export default React.memo(TrendSection);
