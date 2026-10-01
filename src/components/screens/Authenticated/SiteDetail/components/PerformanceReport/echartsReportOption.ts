/**
 * ECharts `option` builder for the Performance Report "Energy over time"
 * stacked bar (rendered in a WebView via react-native-echarts-pro). The
 * Reports tab mounts exactly ONE chart WebView — the old distribution
 * donut (and its slice-select machinery) is gone; the source mix lives in
 * the hero PowerMixBar and the Sources list instead.
 *
 * Outage-honest: every API bucket is a category (a 0-production day keeps
 * its slot; a null reading is a gap, never a fake 0), negatives (export,
 * battery charge) stack below the axis, and the axis has no forced max.
 *
 * Values are rescaled ONCE for the whole chart with `pickScale` (kWh →
 * MWh → GWh by the largest stacked bucket) and the y-axis is named with
 * that unit. Colours come only from the theme object — no colour literals
 * in this file.
 */

import { Scheme } from 'src/theme';
import { EnergyStackData } from 'src/utils/aggregations';
import { pickScale } from 'src/utils/units';
import { COMPACT_VALUE_FN_SRC, Y_AXIS_LABEL_FORMATTER } from '../chartConfig';

/** The scheme subset the report chart needs (incl. brand for dataZoom). */
export interface ReportChartTheme {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  /** Raised surface — tooltip background. */
  surface: string;
  brand: string;
  brandSoft: string;
  isDark: boolean;
}

// `useScheme()` returns one of two module-level singletons, so caching per
// scheme keeps the theme referentially stable — safe in useMemo deps.
const themeCache = new WeakMap<Scheme, ReportChartTheme>();

/** Stable-reference {@link ReportChartTheme} for the active scheme. */
export const reportChartThemeFromScheme = (scheme: Scheme): ReportChartTheme => {
  const cached = themeCache.get(scheme);
  if (cached) return cached;
  const theme: ReportChartTheme = {
    textPrimary: scheme.textPrimary,
    textSecondary: scheme.textSecondary,
    textTertiary: scheme.textTertiary,
    border: scheme.border,
    surface: scheme.surfaceRaised,
    brand: scheme.brand,
    brandSoft: scheme.brandSoft,
    isDark: scheme.isDark,
  };
  themeCache.set(scheme, theme);
  return theme;
};

/** The inline chart only grows a zoom slider past this many buckets
 *  (Custom ≤ 31 days, Month ≤ 31, Year 12 never reach it); fullscreen
 *  always has one. Pinch / drag zoom works everywhere. */
export const INLINE_SLIDER_MAX_CATEGORIES = 40;

/* ─────────── legend layout estimate ─────────── */

const LEGEND_FONT = 11;
const LEGEND_ITEM_W = 12;
const LEGEND_ITEM_GAP = 10;
const LEGEND_TEXT_GAP = 5;
/** Average glyph advance of the WebView's sans-serif at 11px. */
const LEGEND_CHAR_W = 6.4;
const LEGEND_ROW_H = 14;
const LEGEND_PAD = 5;

/**
 * How many rows a `type: 'plain'` (wrapping) legend needs for `labels`
 * in a chart `width` px wide — greedy packing like echarts' box layout.
 * Always ≥ 1.
 */
export const estimateLegendRows = (labels: string[], width: number): number => {
  const avail = Math.max(1, width - LEGEND_PAD * 2);
  let rows = 1;
  let x = 0;
  for (const label of labels) {
    const w = LEGEND_ITEM_W + LEGEND_TEXT_GAP + label.length * LEGEND_CHAR_W;
    const next = x === 0 ? w : x + LEGEND_ITEM_GAP + w;
    if (x > 0 && next > avail) {
      rows += 1;
      x = w;
    } else {
      x = next;
    }
  }
  return rows;
};

/** Pixel height of a plain legend with `rows` rows (echarts box layout:
 *  padding + rows + vertical itemGap between them). */
export const legendHeight = (rows: number): number =>
  LEGEND_PAD * 2 + rows * LEGEND_ROW_H + Math.max(0, rows - 1) * LEGEND_ITEM_GAP;

/* ─────────── tooltip ─────────── */

/**
 * Axis-tooltip formatter as a self-contained function SOURCE string
 * (eval'd in the WebView via `enableParseStringFunction`, so it can't
 * close over RN values — the bucket names and the unit are spliced in as
 * literals). Header = the full bucket name ('1 Sep 2026' even when the
 * axis shows '1'); one marker row per series with a 3-significant-digit
 * value + unit ('16.9 MWh'); null → '—'; a Total row when stacked.
 * Single-line statements only: the library strips newlines before eval.
 */
export const reportTooltipFormatter = (headers: string[], unit: string): string => `function(ps){
  ${COMPACT_VALUE_FN_SRC}
  var H=${JSON.stringify(headers)};var U=${JSON.stringify(unit)};
  var f=function(v){if(typeof v!=='number'||!isFinite(v))return '—';var a=Math.abs(v);var t=(a===0)?'0':((a<1||a>=1000)?__fmtCompactVal(v):String(Number(v.toPrecision(3))));return U?t+' '+U:t;};
  if(!ps||!ps.length)return '';
  var i=ps[0].dataIndex;var h=(typeof i==='number'&&H[i]!==undefined)?H[i]:ps[0].axisValueLabel;
  var s='<div style="font-size:11px;font-weight:600;margin-bottom:4px">'+h+'</div>';
  var tot=0;var n=0;
  for(var k=0;k<ps.length;k++){var p=ps[k];var v=p.value;if(typeof v==='number'&&isFinite(v)){tot+=v;n++;}s+='<div style="display:flex;align-items:center;gap:6px;line-height:1.7">'+p.marker+'<span style="flex:1">'+p.seriesName+'</span><b style="margin-left:10px">'+f(v)+'</b></div>';}
  if(ps.length>1&&n>0){s+='<div style="display:flex;align-items:center;gap:6px;line-height:1.7;margin-top:2px"><span style="flex:1">Total</span><b style="margin-left:10px">'+f(tot)+'</b></div>';}
  return s;
}`;

/* ─────────── option ─────────── */

export interface ReportBarOptionArgs {
  /** Chart canvas width in px — sizes the wrapping legend estimate. */
  width: number;
  /** Fullscreen (landscape) build: always a zoom slider, larger ticks. */
  detailed?: boolean;
}

/** Shared display scale for the chart: unit + divisor from the largest
 *  stacked bucket (values arrive in kWh). */
export const reportChartScale = (stack: EnergyStackData) =>
  pickScale(stack.maxStackAbs, 'kWh');

/**
 * Stacked bar of energy over time: one bar series per reporting source
 * (stacked; ids = source tokens), x = every API bucket. The legend wraps
 * (`plain`) and is hidden for a single series; the plot top is pushed
 * down by the estimated legend height + the y-axis unit name.
 *
 * `optionSetting.replaceMerge` makes the library's setOption REPLACE the
 * series / dataZoom lists on an update (series matched by id), so a
 * period with fewer sources never leaves a stale series behind, while the
 * WebView itself is reused (no reload flash).
 */
export const buildReportStackBarOption = (
  stack: EnergyStackData,
  theme: ReportChartTheme,
  { width, detailed = false }: ReportBarOptionArgs,
): object => {
  const { unit, divisor } = reportChartScale(stack);
  const categories = stack.buckets.map(b => b.label);
  const headers = stack.buckets.map(b => b.header);
  const labels = stack.series.map(s => s.label);
  const showLegend = stack.series.length > 1;
  const legendH = showLegend ? legendHeight(estimateLegendRows(labels, width)) : 0;
  const tickFont = detailed ? 11 : 10;
  // Room above the plot for the y-axis unit name (nameGap + text).
  const nameRoom = 22;
  const withSlider = detailed || categories.length > INLINE_SLIDER_MAX_CATEGORIES;

  const series = stack.series.map(s => ({
    id: s.token,
    name: s.label,
    type: 'bar',
    stack: 'total',
    barMaxWidth: detailed ? 36 : 28,
    itemStyle: { color: s.color },
    data: s.values.map(v => (v === null ? null : v / divisor)),
  }));

  const dataZoom: object[] = [
    { id: 'zoomInside', type: 'inside', xAxisIndex: 0, filterMode: 'none', start: 0, end: 100 },
  ];
  if (withSlider) {
    dataZoom.push({
      id: 'zoomSlider',
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
      moveHandleStyle: { color: theme.brandSoft },
      dataBackground: {
        lineStyle: { color: theme.border },
        areaStyle: { color: theme.brandSoft },
      },
      selectedDataBackground: {
        lineStyle: { color: theme.brand },
        areaStyle: { color: theme.brandSoft },
      },
      emphasis: {
        handleStyle: { color: theme.brand, borderColor: theme.brand },
        moveHandleStyle: { color: theme.brand },
      },
      textStyle: { color: theme.textSecondary, fontSize: 9 },
    });
  }

  return {
    // Consumed by react-native-echarts-pro's message listener as the
    // setOption() second argument on updates (ignored on first render).
    optionSetting: { replaceMerge: ['series', 'dataZoom'] },
    backgroundColor: 'transparent',
    textStyle: { color: theme.textSecondary },
    legend: {
      show: showLegend,
      type: 'plain',
      top: 0,
      left: 'center',
      data: labels,
      textStyle: { color: theme.textSecondary, fontSize: LEGEND_FONT },
      inactiveColor: theme.textTertiary,
      icon: 'roundRect',
      itemWidth: LEGEND_ITEM_W,
      itemHeight: 8,
      itemGap: LEGEND_ITEM_GAP,
      padding: LEGEND_PAD,
    },
    grid: {
      top: legendH + nameRoom,
      left: 6,
      right: detailed ? 16 : 10,
      bottom: withSlider ? 40 : 8,
      containLabel: true,
    },
    tooltip: {
      show: true,
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.textPrimary, fontSize: 11 },
      formatter: reportTooltipFormatter(headers, unit),
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: tickFont,
        hideOverlap: true,
        interval: 'auto',
      },
    },
    yAxis: {
      type: 'value',
      // No forced min/max: echarts picks nice ticks from the data and
      // keeps 0 on the axis (negatives extend below it).
      name: unit,
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: theme.textSecondary, fontSize: tickFont, align: 'left' },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: tickFont,
        formatter: Y_AXIS_LABEL_FORMATTER,
      },
    },
    dataZoom,
    series,
  };
};
