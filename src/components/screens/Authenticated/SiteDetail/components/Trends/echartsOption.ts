/**
 * Builds an ECharts `option` for a single trend section's COMBINED
 * chart — line + area + bar in one frame. This is the echarts-pro
 * prototype path (rendered in a WebView via react-native-echarts-pro).
 *
 * Why echarts: a true combo chart with a tap-to-toggle legend that
 * auto-rescales the axes, plus built-in zoom/pan (dataZoom) — none of
 * which gifted-charts can do in one frame.
 *
 * Axis strategy: ONE colour-coded y-axis per series, each titled with
 * that series' `display` name and on its own scale (a section can mix
 * params with wildly different units — a 0–1 ratio next to 0–1500
 * minutes — so a shared axis would flatten most of them). Axes
 * alternate left/right and stack with an offset. echarts rescales each
 * axis automatically as the legend hides series.
 */

import { TrendAggregation, TrendDataRow } from 'src/types';
import { formatTrendLabel, isBarType } from 'src/utils';
import { coerceValue } from './helpers';

export interface TrendChartTheme {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  /** Raised surface — used as the tooltip background. */
  surface: string;
  isDark: boolean;
}

/** Compact y-axis tick formatter, passed as a string fn (echarts-pro
 *  needs `enableParseStringFunction` to eval it inside the WebView). */
const Y_LABEL_FORMATTER =
  "function(v){var a=Math.abs(v);" +
  "if(a>=1e6)return (v/1e6).toFixed(1)+'M';" +
  "if(a>=1e3)return (v/1e3).toFixed(0)+'K';" +
  'return ""+v;}';

/**
 * Axis-trigger tooltip formatter (string fn, eval'd in the WebView via
 * `enableParseStringFunction`). Renders the x-label header then one
 * colour-marked row per series with a compact value; null → "–".
 */
const TOOLTIP_FORMATTER = `function(params){
  if(!params||!params.length)return '';
  function fmt(v){var a=Math.abs(v);if(a>=1e6)return (v/1e6).toFixed(2)+'M';if(a>=1e3)return (v/1e3).toFixed(1)+'K';return ''+(Math.round(v*100)/100);}
  var s='<div style="font-size:11px;font-weight:600;margin-bottom:4px">'+params[0].axisValueLabel+'</div>';
  for(var i=0;i<params.length;i++){var p=params[i];var val=(p.value==null?'–':fmt(p.value));s+='<div style="display:flex;align-items:center;gap:6px;line-height:1.7">'+p.marker+'<span style="flex:1">'+p.seriesName+'</span><b style="margin-left:10px">'+val+'</b></div>';}
  return s;
}`;

const sortByTime = (rows: TrendDataRow[]): TrendDataRow[] =>
  [...rows].sort((a, b) => (a?.time ?? 0) - (b?.time ?? 0));

export interface TrendComboOptions {
  /**
   * `false` (inline) → compact: a dual y-axis (bars left / lines right)
   * and auto-thinned x labels, sized to fit a phone-width card.
   * `true` (full-screen/landscape) → one colour-coded y-axis per series
   * (each titled with its `display`) and EVERY x label shown — there's
   * room for it in landscape.
   */
  detailed?: boolean;
}

export const buildTrendComboOption = (
  rows: TrendDataRow[],
  aggregations: TrendAggregation[],
  windowMs: number,
  theme: TrendChartTheme,
  options: TrendComboOptions = {},
): object => {
  const detailed = options.detailed === true;
  const sorted = sortByTime(rows);
  const categories = sorted.map(r => formatTrendLabel(r.time, windowMs));

  // Default the x zoom to a readable window so bars aren't crammed
  // edge-to-edge; the slider/pinch pans the rest. Wider in detailed
  // (landscape) mode where there's more room.
  const visibleTarget = detailed ? 96 : 40;
  const zoomStart =
    categories.length > visibleTarget
      ? Math.round(
          ((categories.length - visibleTarget) / categories.length) * 100,
        )
      : 0;

  const axisLabelStyle = { color: theme.textSecondary, fontSize: 10 };
  const nameStyle = { color: theme.textTertiary, fontSize: 10 };
  const splitLineStyle = {
    lineStyle: { color: theme.border, type: 'dashed' as const },
  };

  const hasBar = aggregations.some(a => isBarType(a.type));
  const hasLine = aggregations.some(a => !isBarType(a.type));

  let yAxis: object[];
  let yIndexFor: (a: TrendAggregation, i: number) => number;
  let gridLeft: number;
  let gridRight: number;

  if (detailed) {
    // One colour-coded y-axis per series, alternating left/right and
    // stacking outward with an offset — each param on its own scale.
    const PER_AXIS_OFFSET = 56;
    let leftCount = 0;
    let rightCount = 0;
    yAxis = aggregations.map((a, i) => {
      const side = i % 2 === 0 ? 'left' : 'right';
      const slot = side === 'left' ? leftCount++ : rightCount++;
      return {
        type: 'value' as const,
        min: 0,
        position: side,
        offset: slot * PER_AXIS_OFFSET,
        name: a.display,
        nameLocation: 'middle' as const,
        nameRotate: side === 'left' ? 90 : -90,
        nameGap: 40,
        nameTextStyle: { color: a.color, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: a.color } },
        axisTick: { show: false },
        axisLabel: { color: a.color, fontSize: 11, formatter: Y_LABEL_FORMATTER },
        // Gridlines from the first axis only — overlapping rules from
        // multiple scales would be meaningless.
        splitLine: i === 0 ? splitLineStyle : { show: false },
      };
    });
    yIndexFor = (_a, i) => i;
    gridLeft = Math.max(16, leftCount * PER_AXIS_OFFSET + 14);
    gridRight = Math.max(16, rightCount * PER_AXIS_OFFSET + 14);
  } else {
    // Compact: dual axis — bars on the left, lines on the right (a
    // single axis when only one family is present). Tick labels are
    // shown but the axis titles are dropped — the legend already names
    // the series, and the titles just ate horizontal room.
    const dualAxis = hasBar && hasLine;
    const yAxisBase = {
      type: 'value' as const,
      min: 0,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...axisLabelStyle, formatter: Y_LABEL_FORMATTER },
    };
    yAxis = dualAxis
      ? [
          { ...yAxisBase, position: 'left', splitLine: splitLineStyle },
          { ...yAxisBase, position: 'right', splitLine: { show: false } },
        ]
      : [{ ...yAxisBase, splitLine: splitLineStyle }];
    const lineYIndex = dualAxis ? 1 : 0;
    yIndexFor = a => (isBarType(a.type) ? 0 : lineYIndex);
    // containLabel reserves the tick-label width, so keep base gutters slim.
    gridLeft = 8;
    gridRight = dualAxis ? 8 : 12;
  }

  const series = aggregations.map((a, i) => {
    const data = sorted.map(r => coerceValue(r[a.param]));
    if (isBarType(a.type)) {
      return {
        name: a.display,
        type: 'bar',
        data,
        yAxisIndex: yIndexFor(a, i),
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
      yAxisIndex: yIndexFor(a, i),
      smooth: true,
      showSymbol: false,
      lineStyle: { color: a.color, width: 2 },
      itemStyle: { color: a.color },
      areaStyle: isArea ? { color: a.color, opacity: 0.18 } : undefined,
      z: 3,
    };
  });

  return {
    backgroundColor: 'transparent',
    textStyle: { color: theme.textSecondary },
    legend: {
      type: 'scroll',
      top: 0,
      data: aggregations.map(a => a.display),
      textStyle: { color: theme.textSecondary, fontSize: 11 },
      inactiveColor: theme.textTertiary,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: {
      top: 40,
      left: gridLeft,
      right: gridRight,
      bottom: detailed ? 88 : 70,
      // Detailed mode reserves manual gutters for the offset axes, so
      // containLabel must be off (it can't reason about offset axes).
      containLabel: !detailed,
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
      name: 'Time',
      nameLocation: 'middle',
      nameGap: detailed ? 56 : 34,
      nameTextStyle: nameStyle,
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
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none', start: zoomStart, end: 100 },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 16,
        bottom: 8,
        filterMode: 'none',
        start: zoomStart,
        end: 100,
        borderColor: theme.border,
        fillerColor: theme.isDark
          ? 'rgba(52,211,153,0.18)'
          : 'rgba(16,185,129,0.14)',
        handleStyle: { color: theme.isDark ? '#34D399' : '#10B981' },
        textStyle: { color: theme.textTertiary, fontSize: 9 },
      },
    ],
    series,
  };
};
