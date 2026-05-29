/**
 * ECharts `option` builders for the Performance Report charts (rendered
 * in a WebView via react-native-echarts-pro):
 *   - donut pie of energy-by-source (tap a slice → onPress dataIndex)
 *   - stacked bar of energy-over-time with a zoom/scroll slider
 *
 * Replaces the previous gifted-charts PieChart + BarChart so the app has
 * a single charting stack.
 */

import { AggregatedSource, StackBar } from 'src/utils';

export interface ReportChartTheme {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  /** Raised surface — tooltip background. */
  surface: string;
  isDark: boolean;
}

/** Compact y-axis tick formatter (string fn — needs enableParseStringFunction). */
const Y_LABEL_FORMATTER =
  "function(v){var a=Math.abs(v);" +
  "if(a>=1e6)return (v/1e6).toFixed(1)+'M';" +
  "if(a>=1e3)return (v/1e3).toFixed(0)+'K';" +
  'return ""+v;}';

/**
 * Donut pie. `sources` is passed in full (including zero-value entries)
 * so a slice's `dataIndex` lines up 1:1 with the caller's source array.
 */
export const buildReportPieOption = (
  sources: AggregatedSource[],
  theme: ReportChartTheme,
): object => ({
  backgroundColor: 'transparent',
  tooltip: {
    show: true,
    trigger: 'item',
    confine: true,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: { color: theme.textPrimary, fontSize: 11 },
    formatter: '{b} · {d}%',
  },
  series: [
    {
      type: 'pie',
      radius: ['54%', '80%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: false,
      selectedMode: 'single',
      selectedOffset: 8,
      label: { show: false },
      labelLine: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: sources.map(s => ({
        name: s.shortLabel,
        value: s.value,
        itemStyle: { color: s.color },
      })),
    },
  ],
});

/**
 * Stacked bar of energy over time. One bar series per source (stacked),
 * x-axis = time buckets. dataZoom slider + pinch handle zoom/scroll.
 */
export const buildReportStackBarOption = (
  stackData: StackBar[],
  maxValue: number,
  theme: ReportChartTheme,
): object => {
  const categories = stackData.map(b => b.label);

  // Distinct sources in first-seen order, with their colour.
  const seriesColors = new Map<string, string>();
  for (const bucket of stackData) {
    for (const seg of bucket.stacks) {
      if (!seriesColors.has(seg.sourceLabel)) {
        seriesColors.set(seg.sourceLabel, seg.color);
      }
    }
  }
  const labels = [...seriesColors.keys()];
  const series = labels.map(label => ({
    name: label,
    type: 'bar',
    stack: 'total',
    barMaxWidth: 28,
    itemStyle: { color: seriesColors.get(label) },
    data: stackData.map(bucket => {
      const seg = bucket.stacks.find(s => s.sourceLabel === label);
      return seg ? seg.value : 0;
    }),
  }));

  return {
    backgroundColor: 'transparent',
    textStyle: { color: theme.textSecondary },
    legend: {
      type: 'scroll',
      top: 0,
      data: labels,
      textStyle: { color: theme.textSecondary, fontSize: 11 },
      inactiveColor: theme.textTertiary,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 8,
    },
    grid: { top: 40, left: 6, right: 10, bottom: 48, containLabel: true },
    tooltip: {
      show: true,
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.textPrimary, fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: 10,
        hideOverlap: true,
        interval: 'auto',
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: maxValue || undefined,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
      axisLabel: {
        color: theme.textSecondary,
        fontSize: 10,
        formatter: Y_LABEL_FORMATTER,
      },
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 16,
        bottom: 8,
        filterMode: 'none',
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
