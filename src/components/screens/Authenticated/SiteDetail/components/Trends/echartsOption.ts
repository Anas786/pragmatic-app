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
 * series AND no reading is negative. Two axes share a baseline only while
 * both start at 0: with a negative reading (a device's -1.2e35, or real
 * export) the bar axis's 0 rises off the bottom while the line axis's 0
 * stays there, so the line would be read against the wrong baseline —
 * such a section puts every series on the left axis (the web portal's
 * layout) and hides the right one. There is deliberately never one axis
 * per series: per-series scales draw a 48K bar and a 750M bar at the same height, which reads as
 * "comparable" when they differ ~15,000× — the full-screen view used to do
 * this and diverged from the card. A shared scale keeps relative
 * magnitudes honest. Every finite reading is plotted at its TRUE value —
 * an invalid-looking one too (|v| ≥ `SUSPECT_READING_ABS`, e.g. a device
 * that sent -1.2e35), even though it flattens the other series: exactly
 * like the web portal's Analysis chart, nothing is hidden, and a note says
 * the values are shown as the device sent them. The axes have no forced
 * min, so negative readings extend below 0 instead of being clipped.
 * `detailed` only changes presentation density (a larger tick font,
 * rotated x labels, every x label shown) — never the axis count or the
 * series→axis mapping.
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
import { isIrradiance } from 'src/utils/units';
import { ChartTheme, COMPACT_VALUE_FN_SRC, Y_AXIS_LABEL_FORMATTER } from '../chartConfig';
import {
  coerceChartValue,
  DEFAULT_TREND_CHART_WIDTH,
  estimateTrendLegend,
  formatInvalidReadingsNote,
  layoutTrendNote,
  SUSPECT_READING_ABS,
  TREND_GRID_BOTTOM,
  TREND_LEGEND,
} from './helpers';

/** Stable id so a later merge-mode `setOption` updates (or hides) the
 *  in-chart invalid-readings note instead of stacking a second one. */
const INVALID_NOTE_ID = 'trend-invalid-note';

/**
 * Axis-trigger tooltip formatter (string fn, eval'd in the WebView via
 * `enableParseStringFunction`). Renders the x-label header then one
 * colour-marked row per series; null → "–". An ordinary value is compact
 * (the same rules as `Y_AXIS_LABEL_FORMATTER` — see `COMPACT_VALUE_FN_SRC`
 * in `chartConfig.ts`; formatter strings can't share a JS closure across
 * WebView evals, so its source is spliced in). An invalid-looking value
 * (|v| ≥ `SUSPECT_READING_ABS`) shows the EXACT number the device sent,
 * every significant digit, in e-notation ('-1.2345678901234567e35') — the
 * axis tick already gives the rounded magnitude.
 */
const TOOLTIP_FORMATTER = `function(params){
  ${COMPACT_VALUE_FN_SRC}
  function __fmtTipVal(v){if(typeof v!=='number'||!isFinite(v))return '–';if(Math.abs(v)>=${SUSPECT_READING_ABS})return v.toExponential().replace('e+','e');return __fmtCompactVal(v);}
  if(!params||!params.length)return '';
  var s='<div style="font-size:11px;font-weight:600;margin-bottom:4px">'+params[0].axisValueLabel+'</div>';
  for(var i=0;i<params.length;i++){var p=params[i];var val=(p.value==null?'–':__fmtTipVal(p.value));s+='<div style="display:flex;align-items:center;gap:6px;line-height:1.7">'+p.marker+'<span style="flex:1">'+p.seriesName+'</span><b style="margin-left:10px">'+val+'</b></div>';}
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
   * Count of invalid-looking readings (|v| ≥ `SUSPECT_READING_ABS` in
   * `./helpers`) across every series in this section. They are all
   * PLOTTED as sent — this only words the note ("N readings look invalid
   * — shown exactly as sent by the device"), which the inline build draws
   * inside the chart and callers show next to the full-screen chart.
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

  // Every finite reading goes into the series AS SENT — the ONE shared
  // path both modes' series go through. Invalid-looking ones are only
  // counted, for the note; missing / non-numeric input is a gap (`null`).
  let invalidCount = 0;
  let hasNegative = false;
  // Irradiance is the one display exception (user decision): whole W/m²,
  // so its tooltip reads '862', like the Cards / Live / SLD values. A
  // garbage-sized reading is left exactly as sent.
  const columns = aggregations.map(a => {
    const wholeNumbers = isIrradiance(undefined, a.display);
    return sorted.map(r => {
      const { value, looksInvalid } = coerceChartValue(r[a.param]);
      if (looksInvalid) invalidCount++;
      if (value !== null && value < 0) hasNegative = true;
      return wholeNumbers && value !== null && !looksInvalid ? Math.round(value) : value;
    });
  });

  // ONE shared axis-assignment path for both compact and full-screen:
  // bars share a left axis, lines get a second (right) axis only when
  // bar + line/area series are mixed and nothing is negative (two axes
  // only share a baseline while both start at 0 — see the module doc) —
  // never one axis per series. `detailed` only bumps the tick font.
  const mixed = hasBar && hasLine;
  const dualAxis = mixed && !hasNegative;
  // No forced min/max: echarts' value axis keeps 0 on the scale and
  // extends below it for negative readings (a forced `min: 0` clipped
  // them off the plot — a device's -1.2e35 vanished).
  const yAxisBase = {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: theme.textSecondary,
      fontSize: detailed ? 12 : 10,
      formatter: Y_AXIS_LABEL_FORMATTER,
    },
  };
  // A mixed section always declares BOTH axes and only hides the right
  // one while it shares the left: the inline chart is updated in merge
  // mode (same WebView), which never removes an axis, so the axis count
  // must stay fixed per section for a refetch to flip layouts cleanly.
  const yAxis: object[] = mixed
    ? [
        { ...yAxisBase, position: 'left', splitLine: splitLineStyle },
        {
          ...yAxisBase,
          show: dualAxis,
          position: 'right',
          splitLine: { show: false },
        },
      ]
    : [{ ...yAxisBase, splitLine: splitLineStyle }];
  const lineYIndex = dualAxis ? 1 : 0;
  const yIndexFor = (a: TrendAggregation): number =>
    isBarType(a.type) ? 0 : lineYIndex;
  // containLabel reserves the tick-label width, so keep base gutters slim
  // in both modes — there's no per-series offset stacking to account for.
  const gridLeft = 8;
  const gridRight = dualAxis ? 8 : 12;

  const series = aggregations.map((a, i) => {
    const data = columns[i];
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

  const width = options.width ?? DEFAULT_TREND_CHART_WIDTH;
  const legend = estimateTrendLegend(
    aggregations.map(a => a.display),
    width,
  );
  // Inline only: the invalid-readings note ("N readings look invalid —
  // shown exactly as sent by the device") is drawn INSIDE the chart,
  // wrapped to its width (the plot gives up those lines; the card height
  // never changes when data arrives). Full screen shows the same note as
  // RN text instead (ChartFullscreenModal `warning`). The element always
  // exists so a merge-mode update can hide it again.
  const showNote = !detailed && invalidCount > 0;
  const note = showNote
    ? layoutTrendNote(formatInvalidReadingsNote(invalidCount), width)
    : null;
  const gridTop = legend.gridTop + (note ? note.height : 0);

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
              text: note ? note.text : '',
              fill: theme.textSecondary,
              fontSize: TREND_LEGEND.fontSize,
              lineHeight: TREND_LEGEND.lineHeight,
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
