import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import RNEChartsPro from 'react-native-echarts-pro';
import { AppText, OverlineLabel, PressableScale } from 'src/components/common';
import { radius as radiusTokens, space, useScheme } from 'src/theme';
import { TrendAggregation, TrendDataRow } from 'src/types';
import { FONT_SIZE_XXS } from 'src/utils';
import SectionCard from '../PerformanceReport/SectionCard';
import ChartFullscreenModal from '../ChartFullscreenModal';
import { chartThemeFromScheme, WEBVIEW_SETTINGS } from '../chartConfig';
import { buildTrendComboOption } from './echartsOption';
import { formatInvalidReadingsCaption } from './helpers';

const COMBO_CHART_HEIGHT = 300;

// Placeholder fed to the (closed) fullscreen modal while the detailed
// option hasn't been built yet — its chart only mounts when visible.
const EMPTY_CHART_OPTION = {};

interface TrendComboChartProps {
  rows: TrendDataRow[];
  aggregations: TrendAggregation[];
  windowMs: number;
  /** Section heading — shown as the full-screen view's title. */
  title: string;
}

/**
 * Combined line+area+bar chart (react-native-echarts-pro, WebView).
 *
 * Inline it renders compactly (shared dual y-axis, auto-thinned x
 * labels). The Fullscreen button opens a landscape modal with the SAME
 * axis layout at a denser presentation (larger tick font, every x label
 * shown) — and the Export (PNG) action lives there.
 */
const TrendComboChart: FC<TrendComboChartProps> = ({
  rows,
  aggregations,
  windowMs,
  title,
}) => {
  const scheme = useScheme();
  const [fullscreen, setFullscreen] = useState(false);

  // Referentially stable per scheme (chartConfig caches by the scheme
  // singleton) — safe as a single useMemo dep for both option builds.
  const chartTheme = chartThemeFromScheme(scheme);

  // `invalidCount` (points dropped by the impossible-reading guard, see
  // `IMPOSSIBLE_READING_CEILING` in `./helpers`) is data-driven — it comes
  // out identical for the compact and detailed builds given the same
  // rows/aggregations — so the compact build's count is reused for the
  // full-screen caption too instead of recomputing it there.
  const { option, invalidCount } = useMemo(
    () => buildTrendComboOption(rows, aggregations, windowMs, chartTheme),
    [rows, aggregations, windowMs, chartTheme],
  );

  // Detailed (denser presentation + every x label) — for the full-screen
  // view. Built lazily: gated on `fullscreen` so the expensive detailed
  // option isn't rebuilt on every render when the modal was never opened.
  const detailedOption = useMemo(
    () =>
      fullscreen
        ? buildTrendComboOption(rows, aggregations, windowMs, chartTheme, {
            detailed: true,
          }).option
        : null,
    [fullscreen, rows, aggregations, windowMs, chartTheme],
  );

  const invalidCaption =
    invalidCount > 0 ? formatInvalidReadingsCaption(invalidCount) : undefined;

  return (
    <SectionCard>
      <View style={styles.headerBlock}>
        <View style={styles.header}>
          <OverlineLabel color={scheme.textTertiary}>COMBINED</OverlineLabel>
          <PressableScale
            onPress={() => setFullscreen(true)}
            haptic="tap"
            scaleTo={0.94}
            accessibilityLabel="Open full screen"
            style={[styles.fsBtn, { backgroundColor: scheme.brandSoft }]}>
            <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.brand}>
              Fullscreen
            </AppText>
          </PressableScale>
        </View>
        <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
          Tap a series in the legend to show or hide it
        </AppText>
        {invalidCaption ? (
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
            {invalidCaption}
          </AppText>
        ) : null}
      </View>

      <View style={styles.chartWrap}>
        <RNEChartsPro
          height={COMBO_CHART_HEIGHT}
          option={option}
          backgroundColor="transparent"
          enableParseStringFunction
          webViewSettings={WEBVIEW_SETTINGS}
        />
      </View>

      <ChartFullscreenModal
        visible={fullscreen}
        onClose={() => setFullscreen(false)}
        title={title}
        option={detailedOption ?? EMPTY_CHART_OPTION}
        hint="Tap a series in the legend to show or hide it"
        warning={invalidCaption}
      />
    </SectionCard>
  );
};
TrendComboChart.displayName = 'TrendComboChart';

const styles = StyleSheet.create({
  headerBlock: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  fsBtn: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radiusTokens.pill,
  },
  chartWrap: {
    // WebView needs an explicit height; the chart fills it.
    height: COMBO_CHART_HEIGHT,
  },
});

// Memoized: re-renders rebuild the chart WebView's ~1MB injected source,
// so parent renders with unchanged props must bail out here.
export default React.memo(TrendComboChart);
