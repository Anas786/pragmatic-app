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
 * Inline it renders compactly (dual y-axis, auto-thinned x labels). The
 * Fullscreen button opens a landscape modal with the detailed per-series
 * axes + every label — and the Export (PNG) action lives there.
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

  const option = useMemo(
    () => buildTrendComboOption(rows, aggregations, windowMs, chartTheme),
    [rows, aggregations, windowMs, chartTheme],
  );

  // Detailed (per-series axes + every x label) — for the full-screen view.
  // Built lazily: gated on `fullscreen` so the expensive detailed option
  // isn't rebuilt on every render when the modal was never opened.
  const detailedOption = useMemo(
    () =>
      fullscreen
        ? buildTrendComboOption(rows, aggregations, windowMs, chartTheme, {
            detailed: true,
          })
        : null,
    [fullscreen, rows, aggregations, windowMs, chartTheme],
  );

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
