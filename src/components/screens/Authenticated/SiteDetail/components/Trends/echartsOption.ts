/**
 * Builds an ECharts `option` for a single trend section's COMBINED
 * chart — line + area + bar in one frame. This is the echarts-pro
 * prototype path (rendered in a WebView via react-native-echarts-pro).
 *
 * Why echarts: a true combo chart with a tap-to-toggle legend that
 * auto-rescales the axes, plus built-in zoom/pan (dataZoom) — none of
 * which gifted-charts can do in one frame.
 *
 * Axis strategy: ONE shared code path for both inline (compact) and
 * full-screen (`detailed`) — bars share a single left axis, and lines
 * get a second (right) axis only when the section mixes bar + line/area
 * series. There is deliberately never one axis per series: per-series
 * scales draw a 48K bar and a 750M bar at the same height, which reads as
 * "comparable" when they differ ~15,000× — the full-screen view used to do
 * this and diverged from the card. A shared scale keeps relative
 * magnitudes honest (the value guard below — `coerceChartValue` /
 * `IMPOSSIBLE_READING_CEILING` — keeps one garbage-magnitude reading from
 * wrecking that shared scale for everyone else). `detailed` only changes
 * presentation density (a larger tick font, rotated x labels, every x
 * label shown) — never the axis count or the series→axis mapping.
 *
 * Chrome: the legend is echarts' 'plain' type and WRAPS (it never
 * paginates and never truncates a name); `grid.top` comes from
 * `estimateTrendLegend` for the chart's real width, and a single series
 * gets no legend at all. There is no x-axis name (the labels are plainly
 * times), so `grid.bottom` only has to clear the dataZoom slider. Every
 * colour comes from the `ChartTheme` — no hex literals in here.
 */

import { TrendAggregation, TrendDataRow } from 'src/types';
import { formatTrendLabel, isBarType } from 'src/utils';
import { ChartTheme, COMPACT_VALUE_FN_SRC, Y_AXIS_LABEL_FORMATTER } from '../chartConfig';
import {
  coerceChartValue,
  DEFAULT_TREND_CHART_WIDTH,
  estimateTrendLegend,
  formatInvalidReadingsCaption,
  TREND_GRID_BOTTOM,
  TREND_INVALID_NOTE_HEIGHT,
  TREND_LEGEND,
} from './helpers';

/** Stable id so a later merge-mode `setOption` updates (or hides) the
 *  in-chart invalid-readings note instead of stacking a second one. */
const INVALID_NOTE_ID = 'trend-invalid-note';

/**
 * Axis-trigger tooltip formatter (string fn, eval'd in the WebView via
 * `enableParseStringFunction`). Renders the x-label header then one
 * colour-marked row per series with a compact value; null → "–". Shares
 * the same compact-number rules as `Y_AXIS_LABEL_FORMATTER` (see
 * `COMPACT_VALUE_FN_SRC` in `chartConfig.ts`) — formatter strings can't
 * share a JS closure across WebView evals, so its source is spliced in.
 */
const TOOLTIP_FORMATTER = `function(params){
  ${COMPACT_VALUE_FN_SRC}
  if(!params||!params.length)return '';
  var s='<div style="font-size:11px;font-weight:600;margin-bottom:4px">'+params[0].axisValueLabel+'</div>';
  for(var i=0;i<params.length;i++){var p=params[i];var val=(p.value==null?'–':__fmtCompactVal(p.value));s+='<div style="display:flex;align-items:center;gap:6px;line-height:1.7">'+p.marker+'<span style="flex:1">'+p.seriesName+'</span><b style="margin-left:10px">'+val+'</b></div>';}
  return s;
}`;

const sortByTime = (rows: TrendDataRow[]): TrendDataRow[] =>
  [...rows].sort((a, b) => (a?.time ?? 0) - (b?.time ?? 0));

export interface TrendComboOptions {
  /**
   * `false` (inline) → compact: sized to fit a phone-width card.
   * `true` (full-screen/landscape) → same dual-axis strategy, denser
   * presentation only — larger tick font, wider grid margins, EVERY x
   * label shown (there's room for it in landscape).
   */
  detailed?: boolean;
  /**
   * Width of the chart (WebView) in px — the legend wraps at this width,
   * and `grid.top` leaves room for exactly the rows it will take.
   * Defaults to a 402pt phone's inline card.
   */
  width?: number;
}

/** Result of {@link buildTrendComboOption}. */
export interface TrendComboBuildResult {
  /** The echarts option — pass straight to `RNEChartsPro`. */
  option: object;
  /**
   * Count of points dropped by the impossible-reading guard (see
   * `IMPOSSIBLE_READING_CEILING` in `./helpers`) across every series in
   * this section. Callers must disclose this to the user (e.g. a small
   * "N invalid readings hidden" caption) rather than drop it silently.
   */
  invalidCount: number;
}

export const buildTrendComboOption = (
  rows: TrendDataRow[],
  aggregations: TrendAggregation[],
  windowMs: number,
  theme: ChartTheme,
  options: TrendComboOptions = {},
): TrendComboBuildResult => {
  const detailed = options.detailed === true;
  const sorted = sortByTime(rows);
  const categories = sorted.map(r => formatTrendLabel(r.time, windowMs));

  const axisLabelStyle = { color: theme.textSecondary, fontSize: 10 };
  const splitLineStyle = {
    lineStyle: { color: theme.border, type: 'dashed' as const },
  };

  const hasBar = aggregations.some(a => isBarType(a.type));
  const hasLine = aggregations.some(a => !isBarType(a.type));

  // ONE shared axis-assignment path for both compact and full-screen:
  // bars share a left axis, lines get a second (right) axis only when
  // bar + line/area series are mixed — never one axis per series (see
  // the module doc above for why). `detailed` only bumps the tick font.
  const dualAxis = hasBar && hasLine;
  const yAxisBase = {
    type: 'value' as const,
    min: 0,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: theme.textSecondary,
      fontSize: detailed ? 12 : 10,
      formatter: Y_AXIS_LABEL_FORMATTER,
    },
  };
  const yAxis: object[] = dualAxis
    ? [
        { ...yAxisBase, position: 'left', splitLine: splitLineStyle },
        { ...yAxisBase, position: 'right', splitLine: { show: false } },
      ]
    : [{ ...yAxisBase, splitLine: splitLineStyle }];
  const lineYIndex = dualAxis ? 1 : 0;
  const yIndexFor = (a: TrendAggregation): number =>
    isBarType(a.type) ? 0 : lineYIndex;
  // containLabel reserves the tick-label width, so keep base gutters slim
  // in both modes — there's no per-series offset stacking to account for.
  const gridLeft = 8;
  const gridRight = dualAxis ? 8 : 12;

  // Physically-impossible readings (see `IMPOSSIBLE_READING_CEILING`) are
  // dropped to a chart gap here — the ONE shared path both modes' series
  // go through — and tallied so the caller can disclose the count.
  let invalidCount = 0;
  const series = aggregations.map(a => {
    const data = sorted.map(r => {
      const { value, invalid } = coerceChartValue(r[a.param]);
      if (invalid) invalidCount++;
      return value;
    });
    if (isBarType(a.type)) {
      return {
        name: a.display,
        type: 'bar',
        data,
        yAxisIndex: yIndexFor(a),
        barMaxWidth: 18,
        itemStyle: { color: a.color, borderRadius: [3, 3, 0, 0] },
        z: 2,
      };
    }
    const isArea = a.type === 'area';
    return {
      name: a.display,
      type: 'line',
      data,
      yAxisIndex: yIndexFor(a),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: a.color, width: 2 },
      itemStyle: { color: a.color },
      areaStyle: isArea ? { color: a.color, opacity: 0.18 } : undefined,
      z: 3,
    };
  });

  const legend = estimateTrendLegend(
    aggregations.map(a => a.display),
    options.width ?? DEFAULT_TREND_CHART_WIDTH,
  );
  // Inline only: the "N invalid readings hidden" disclosure is drawn
  // INSIDE the chart (the plot gives up one line; the card height never
  // changes when data arrives). Full screen shows it as RN text instead
  // (ChartFullscreenModal `warning`). The element always exists so a
  // merge-mode update can hide it again.
  const showNote = !detailed && invalidCount > 0;
  const gridTop = legend.gridTop + (showNote ? TREND_INVALID_NOTE_HEIGHT : 0);

  const option = {
    backgroundColor: 'transparent',
    textStyle: { color: theme.textSecondary },
    legend: {
      show: legend.show,
      // 'plain' wraps onto extra rows — never paginates, never truncates.
      type: 'plain',
      orient: 'horizontal',
      left: 0,
      top: 0,
      padding: 0,
      itemGap: TREND_LEGEND.itemGap,
      // A name too long for one line wraps within the chart width instead
      // of running off the edge.
      data: aggregations.map((a, i) => {
        const wrapWidth = legend.wrapWidths[i];
        return wrapWidth === null
          ? a.display
          : {
              name: a.display,
              textStyle: { width: wrapWidth, overflow: 'break' },
            };
      }),
      textStyle: {
        color: theme.textSecondary,
        fontSize: TREND_LEGEND.fontSize,
        lineHeight: TREND_LEGEND.lineHeight,
      },
      inactiveColor: theme.textTertiary,
      icon: 'roundRect',
      itemWidth: TREND_LEGEND.iconWidth,
      itemHeight: TREND_LEGEND.iconHeight,
    },
    graphic: detailed
      ? undefined
      : [
          {
            id: INVALID_NOTE_ID,
            type: 'text',
            left: 0,
            top: legend.show ? legend.height + 2 : 0,
            silent: true,
            invisible: !showNote,
            style: {
              text: showNote ? formatInvalidReadingsCaption(invalidCount) : '',
              fill: theme.textSecondary,
              fontSize: TREND_LEGEND.fontSize,
            },
          },
        ],
    grid: {
      top: gridTop,
      left: gridLeft,
      right: gridRight,
      // With containLabel, `bottom` is measured from the tick labels (the
      // rotated full-screen labels included), so both modes need the same
      // room below them — just the dataZoom slider now that the x-axis
      // has no name.
      bottom: TREND_GRID_BOTTOM,
      // Both modes use the same (at most 2-axis) layout now — no offset
      // stacking to account for — so echarts can auto-size the gutter
      // around whichever tick labels render widest.
      containLabel: true,
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'line', lineStyle: { color: theme.border, width: 1 } },
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.textPrimary, fontSize: 11 },
      formatter: TOOLTIP_FORMATTER,
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: true,
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      // Both modes let echarts auto-thin labels + drop overlaps so the
      // axis stays readable at any bucket count; detailed adds a mild
      // rotate since landscape packs more in.
      axisLabel: detailed
        ? { ...axisLabelStyle, interval: 'auto', rotate: 30, hideOverlap: true }
        : { ...axisLabelStyle, interval: 'auto', hideOverlap: true },
    },
    yAxis,
    // `inside` → pinch / drag zoom+pan; `slider` → explicit handle (avoids
    // fighting the parent vertical ScrollView for horizontal swipes).
    //
    // start/end are pinned to the full 0–100 range: the chart opens fully
    // zoomed OUT so every bucket in the selected period is on screen at
    // once. Both entries must carry the same window or ECharts reconciles
    // them on first paint and the view jumps. (This used to default to a
    // trailing window of the last 40 buckets — 96 in landscape — which
    // read better at high bucket counts but hid the start of the range.)
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none', start: 0, end: 100 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 16,
        bottom: 8,
        filterMode: 'none',
        start: 0,
        end: 100,
        borderColor: theme.border,
        fillerColor: theme.brandSoft,
        handleStyle: { color: theme.brand, borderColor: theme.brand },
        moveHandleStyle: { color: theme.brand, opacity: 0.6 },
        emphasis: {
          handleStyle: { color: theme.brand, borderColor: theme.brand },
          moveHandleStyle: { color: theme.brand, opacity: 0.9 },
        },
        dataBackground: {
          lineStyle: { color: theme.border },
          areaStyle: { color: theme.border },
        },
        selectedDataBackground: {
          lineStyle: { color: theme.brand },
          areaStyle: { color: theme.brandSoft },
        },
        textStyle: { color: theme.textTertiary, fontSize: 10 },
      },
    ],
    series,
  };

  return { option, invalidCount };
};
