import React, { FC, memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNEChartsPro from 'react-native-echarts-pro';
import { AppText, Surface } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { TrendAggregation, TrendDataRow } from 'src/types';
import ChartFullscreenModal from '../ChartFullscreenModal';
import { chartThemeFromScheme, WEBVIEW_SETTINGS } from '../chartConfig';
import { buildTrendComboOption } from './echartsOption';
import {
  buildTrendChartSummary,
  formatInvalidReadingsNote,
  TREND_CARD_CHROME,
  TREND_CARD_PADDING,
} from './helpers';

// Placeholder fed to the (closed) fullscreen modal while the detailed
// option hasn't been built yet — its chart only mounts when visible.
const EMPTY_CHART_OPTION = {};

/** Mirrors ChartFullscreenModal's minimum edge padding (its `PAD`). */
const FULLSCREEN_MIN_PAD = 12;

const LEGEND_HINT = 'Tap a series in the legend to show or hide it';

interface TrendComboChartProps {
  rows: TrendDataRow[];
  aggregations: TrendAggregation[];
  /** Span of the window `rows` cover — x-label granularity. */
  windowMs: number;
  /** Section heading — the full-screen title and the spoken chart name. */
  title: string;
  /** Spoken period, e.g. 'Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35'. */
  periodSpoken: string;
  /** WebView width — the legend wraps at this width. */
  chartWidth: number;
  /** WebView height from `trendChartLayout` (card = this + chrome). */
  chartHeight: number;
  /** A new period is loading: these rows are the previous period's. */
  updating: boolean;
  fullscreen: boolean;
  onCloseFullscreen: () => void;
}

interface InlineChartProps {
  option: object;
  height: number;
}

/**
 * The inline WebView chart, memoised on (option, height) so parent
 * re-renders (dimming, opening full screen) never rebuild its ~1MB
 * injected source. Keyed by height: the injected JS sizes the echarts
 * container once at load, so a different height needs a fresh WebView
 * (only when the legend's row count changes with the width).
 */
const InlineChart = memo<InlineChartProps>(({ option, height }) => (
  <RNEChartsPro
    key={height}
    height={height}
    option={option}
    backgroundColor="transparent"
    enableParseStringFunction
    webViewSettings={WEBVIEW_SETTINGS}
  />
));
InlineChart.displayName = 'TrendInlineChart';

/**
 * Combined line+area+bar chart (react-native-echarts-pro, WebView) in a
 * fixed-height card: the height comes from `trendChartLayout`, the same
 * number the section's skeleton and empty/error slot use.
 *
 * There is no in-card header any more — the section header carries the
 * title, period and the full-screen button (`fullscreen` is controlled by
 * the section). The legend wraps inside the chart and is omitted for a
 * single series. While a new period loads, the previous rows stay mounted,
 * dimmed, with an 'Updating…' badge (the WebView is never remounted).
 *
 * Screen readers get ONE image element whose label summarises the data
 * (`buildTrendChartSummary`); the WebView's DOM is hidden from them.
 */
const TrendComboChart: FC<TrendComboChartProps> = ({
  rows,
  aggregations,
  windowMs,
  title,
  periodSpoken,
  chartWidth,
  chartHeight,
  updating,
  fullscreen,
  onCloseFullscreen,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const insets = useSafeAreaInsets();
  const { width: windowW, height: windowH } = useWindowDimensions();

  // Referentially stable per scheme (chartConfig caches by the scheme
  // singleton) — safe as a single useMemo dep for both option builds.
  const chartTheme = chartThemeFromScheme(scheme);

  // `invalidCount` (invalid-looking readings — plotted as sent, only
  // counted for the note, see `SUSPECT_READING_ABS` in `./helpers`) is
  // data-driven — identical for the compact and detailed builds given the
  // same rows/aggregations — so the compact build's count also words the
  // full-screen note instead of recomputing it there.
  const { option, invalidCount } = useMemo(
    () =>
      buildTrendComboOption(rows, aggregations, windowMs, chartTheme, {
        width: chartWidth,
      }),
    [rows, aggregations, windowMs, chartTheme, chartWidth],
  );

  // The full-screen canvas is the landscape long edge minus the safe-area
  // insets ChartFullscreenModal pads it by (left = device top, right =
  // device bottom after its 90° turn) — the legend wraps at that width.
  const detailedWidth =
    Math.max(windowW, windowH) -
    Math.max(FULLSCREEN_MIN_PAD, insets.top) -
    Math.max(FULLSCREEN_MIN_PAD, insets.bottom);

  // Detailed (denser presentation + every x label) — for the full-screen
  // view. Built lazily: gated on `fullscreen` so the expensive detailed
  // option isn't rebuilt on every render when the modal was never opened.
  const detailedOption = useMemo(
    () =>
      fullscreen
        ? buildTrendComboOption(rows, aggregations, windowMs, chartTheme, {
            detailed: true,
            width: detailedWidth,
          }).option
        : null,
    [fullscreen, rows, aggregations, windowMs, chartTheme, detailedWidth],
  );

  const summary = useMemo(
    () =>
      buildTrendChartSummary({
        heading: title,
        periodSpoken,
        rows,
        aggregations,
        invalidCount,
      }),
    [title, periodSpoken, rows, aggregations, invalidCount],
  );

  const cardStyle = useMemo(
    () => [themed.card, { height: chartHeight + TREND_CARD_CHROME }],
    [themed.card, chartHeight],
  );
  const chartWrapStyle = useMemo(
    () => [{ height: chartHeight }, updating ? styles.dimmed : null],
    [chartHeight, updating],
  );

  return (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={TREND_CARD_PADDING}
      style={cardStyle}>
      <View
        style={chartWrapStyle}
        accessible
        accessibilityRole="image"
        accessibilityLabel={updating ? `${summary} Updating.` : summary}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden>
          <InlineChart option={option} height={chartHeight} />
        </View>
      </View>

      {updating ? (
        <View pointerEvents="none" style={styles.updatingOverlay}>
          <View style={themed.updatingBadge}>
            <AppText variant="caption" medium tone="secondary">
              Updating…
            </AppText>
          </View>
        </View>
      ) : null}

      <ChartFullscreenModal
        visible={fullscreen}
        onClose={onCloseFullscreen}
        title={title}
        option={detailedOption ?? EMPTY_CHART_OPTION}
        hint={aggregations.length > 1 ? LEGEND_HINT : undefined}
        warning={
          invalidCount > 0 ? formatInvalidReadingsNote(invalidCount) : undefined
        }
        summary={summary}
      />
    </Surface>
  );
};
TrendComboChart.displayName = 'TrendComboChart';

const styles = StyleSheet.create({
  // Static dim while the next period loads — no animation.
  dimmed: {
    opacity: 0.5,
  },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: scheme.border,
    },
    updatingBadge: {
      paddingHorizontal: space.md,
      paddingVertical: space.xs,
      borderRadius: radiusTokens.pill,
      borderWidth: 1,
      borderColor: scheme.border,
      backgroundColor: scheme.surfaceRaised,
    },
  });

// Memoized: TrendSection re-renders (period pills, header spinner) must
// not reach the chart unless its own props changed.
export default React.memo(TrendComboChart);
