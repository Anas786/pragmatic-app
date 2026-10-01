/**
 * `buildTrendComboOption` (`Trends/echartsOption.ts`) — two invariants:
 *
 * 1. Axis assignment is ONE shared path for compact (`detailed: false`)
 *    and full-screen (`detailed: true`): bars share a left axis, lines
 *    get a right axis only when the section mixes bar + line/area
 *    series — never one axis per series. `detailed` may only change
 *    presentation density (tick font, grid margins), never the axis
 *    count or the series→yAxisIndex mapping.
 *
 * 2. The impossible-reading guard (`coerceChartValue` /
 *    `IMPOSSIBLE_READING_CEILING` in `./helpers`) — a ~4e31 "Wind Energy
 *    Day" reading was reported in production, which on a shared axis
 *    would flatten every other series to an invisible sliver. Such
 *    points become a chart gap (`null`), and the drop is counted and
 *    disclosed rather than hidden.
 *
 * 3. Chrome (TR-1): no x-axis name, a wrapping 'plain' legend (never
 *    paginated, never truncated, hidden for one series) whose rows set
 *    `grid.top`, theme-only dataZoom colours, the invalid-readings note
 *    drawn inside the chart, and ONE geometry (`trendChartLayout`) shared
 *    by the skeleton, the empty/error slot and the chart card. The legend
 *    row estimate is checked against widths measured in the WebView's
 *    real fonts, on a real site's series names.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { Dimensions, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import {
  buildTrendComboOption,
  TrendComboBuildResult,
} from '../src/components/screens/Authenticated/SiteDetail/components/Trends/echartsOption';
import {
  buildTrendChartSummary,
  coerceChartValue,
  DEFAULT_TREND_CHART_WIDTH,
  estimateTextWidth,
  estimateTrendLegend,
  formatInvalidReadingsCaption,
  IMPOSSIBLE_READING_CEILING,
  TREND_CARD_CHROME,
  TREND_GRID_BOTTOM,
  TREND_GRID_TOP_BARE,
  TREND_INVALID_NOTE_HEIGHT,
  TREND_LEGEND,
  TREND_LEGEND_PLOT_GAP,
  TREND_PLOT_HEIGHT,
  trendChartLayout,
  trendChartWidth,
} from '../src/components/screens/Authenticated/SiteDetail/components/Trends/helpers';
import { ChartTheme } from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';
import { TrendAggregation, TrendDataRow } from '../src/types';
import { trendPeriodPillA11yLabel } from '../src/utils/trends';

// Sentinel (non-hex) colours: any '#…' / 'rgba(' left in the option was
// hard-coded in the builder rather than taken from the theme.
const THEME: ChartTheme = {
  textPrimary: 'tok-textPrimary',
  textSecondary: 'tok-textSecondary',
  textTertiary: 'tok-textTertiary',
  border: 'tok-border',
  surface: 'tok-surface',
  brand: 'tok-brand',
  brandSoft: 'tok-brandSoft',
  isDark: false,
};

const agg = (
  param: string,
  type: TrendAggregation['type'],
): TrendAggregation => ({ param, type, color: '#123456', display: param });

const yAxisIndices = (result: TrendComboBuildResult): number[] =>
  (result.option as any).series.map((s: any) => s.yAxisIndex);

const yAxisCount = (result: TrendComboBuildResult): number =>
  (result.option as any).yAxis.length;

describe('buildTrendComboOption — shared axis assignment', () => {
  const rows: TrendDataRow[] = [{ time: 0, p1: 1, p2: 2, p3: 3, p4: 4, p5: 5 }];

  it.each<[string, TrendAggregation[], number, number[]]>([
    ['bar-only (2 series)', [agg('p1', 'bar'), agg('p2', 'column')], 1, [0, 0]],
    ['line-only (2 series)', [agg('p1', 'line'), agg('p2', 'area')], 1, [0, 0]],
    [
      'mixed bar+line (5 series)',
      [
        agg('p1', 'bar'),
        agg('p2', 'line'),
        agg('p3', 'column'),
        agg('p4', 'area'),
        agg('p5', 'bar'),
      ],
      2,
      [0, 1, 0, 1, 0],
    ],
  ])(
    '%s: compact and detailed agree on yAxis count and series→yAxisIndex mapping',
    (_label, aggregations, expectedAxisCount, expectedMapping) => {
      const compact = buildTrendComboOption(rows, aggregations, 1000, THEME);
      const detailed = buildTrendComboOption(rows, aggregations, 1000, THEME, {
        detailed: true,
      });

      expect(yAxisCount(compact)).toBe(expectedAxisCount);
      expect(yAxisCount(detailed)).toBe(expectedAxisCount);
      expect(yAxisIndices(compact)).toEqual(expectedMapping);
      expect(yAxisIndices(detailed)).toEqual(expectedMapping);

      // Never one axis per series (the reverted behaviour): axis count
      // must stay ≤ 2 regardless of how many series share it.
      expect(yAxisCount(compact)).toBeLessThanOrEqual(2);
      expect(yAxisCount(detailed)).toBeLessThanOrEqual(2);
    },
  );

  it('grid gutters are the same shared computation in both modes (no per-series offset stacking)', () => {
    const aggregations = [agg('p1', 'bar'), agg('p2', 'line')];
    const compact = buildTrendComboOption(rows, aggregations, 1000, THEME);
    const detailed = buildTrendComboOption(rows, aggregations, 1000, THEME, {
      detailed: true,
    });
    const gridOf = (r: TrendComboBuildResult) => (r.option as any).grid;
    expect(gridOf(compact).left).toBe(gridOf(detailed).left);
    expect(gridOf(compact).right).toBe(gridOf(detailed).right);
    expect(gridOf(compact).containLabel).toBe(true);
    expect(gridOf(detailed).containLabel).toBe(true);
  });

  it('detailed only bumps presentation density (tick font), not axis structure', () => {
    const aggregations = [agg('p1', 'bar'), agg('p2', 'line')];
    const compact = buildTrendComboOption(rows, aggregations, 1000, THEME);
    const detailed = buildTrendComboOption(rows, aggregations, 1000, THEME, {
      detailed: true,
    });
    const yAxis = (r: TrendComboBuildResult) => (r.option as any).yAxis;
    expect(yAxis(compact)[0].axisLabel.fontSize).toBeLessThan(
      yAxis(detailed)[0].axisLabel.fontSize,
    );
    expect(yAxis(compact).length).toBe(yAxis(detailed).length);
  });
});

describe('coerceChartValue — impossible-reading guard', () => {
  it('drops and flags a reading at/over the ceiling', () => {
    expect(coerceChartValue(4e31)).toEqual({ value: null, invalid: true });
    expect(coerceChartValue(IMPOSSIBLE_READING_CEILING)).toEqual({
      value: null,
      invalid: true,
    });
    // Ceiling applies symmetrically to the magnitude, not just positives.
    expect(coerceChartValue(-4e31)).toEqual({ value: null, invalid: true });
  });

  it('keeps ordinary-magnitude values, however large the real reading', () => {
    expect(coerceChartValue(7.5e8)).toEqual({ value: 7.5e8, invalid: false });
    expect(coerceChartValue(48000)).toEqual({ value: 48000, invalid: false });
    expect(coerceChartValue(0)).toEqual({ value: 0, invalid: false });
    expect(coerceChartValue(-500)).toEqual({ value: -500, invalid: false });
  });

  it('drops non-finite input without counting it as an "invalid reading"', () => {
    // NaN/Infinity were already missing/garbage before the ceiling check
    // ever runs (coerceValue maps them to null) — not a NEW anomaly this
    // guard caught, so they must not inflate the disclosed count.
    expect(coerceChartValue(NaN)).toEqual({ value: null, invalid: false });
    expect(coerceChartValue(Infinity)).toEqual({ value: null, invalid: false });
    expect(coerceChartValue(-Infinity)).toEqual({ value: null, invalid: false });
  });
});

describe('buildTrendComboOption — impossible-reading guard end-to-end', () => {
  const aggregations = [
    agg('wind', 'line'),
    agg('pv', 'line'),
    agg('genset', 'bar'),
  ];
  const rows: TrendDataRow[] = [
    { time: 0, wind: 3.9999999999999995e31, pv: 48000, genset: 7.5e8 },
    { time: 1000, wind: 12, pv: 51000, genset: 7.6e8 },
  ];

  it('nulls only the impossible point, tallies invalidCount, and leaves the rest untouched', () => {
    const { option, invalidCount } = buildTrendComboOption(
      rows,
      aggregations,
      1000,
      THEME,
    );
    expect(invalidCount).toBe(1);
    const series: any[] = (option as any).series;
    const windSeries = series.find(s => s.name === 'wind');
    const pvSeries = series.find(s => s.name === 'pv');
    const gensetSeries = series.find(s => s.name === 'genset');
    expect(windSeries.data).toEqual([null, 12]);
    expect(pvSeries.data).toEqual([48000, 51000]);
    expect(gensetSeries.data).toEqual([7.5e8, 7.6e8]);
  });

  it('reports the same invalidCount regardless of `detailed`', () => {
    const compact = buildTrendComboOption(rows, aggregations, 1000, THEME);
    const detailed = buildTrendComboOption(rows, aggregations, 1000, THEME, {
      detailed: true,
    });
    expect(compact.invalidCount).toBe(1);
    expect(detailed.invalidCount).toBe(1);
  });

  it('reports zero when nothing exceeds the ceiling', () => {
    const cleanRows: TrendDataRow[] = [
      { time: 0, wind: 10, pv: 48000, genset: 7.5e8 },
    ];
    const { invalidCount } = buildTrendComboOption(
      cleanRows,
      aggregations,
      1000,
      THEME,
    );
    expect(invalidCount).toBe(0);
  });
});

describe('formatInvalidReadingsCaption', () => {
  it('pluralizes correctly', () => {
    expect(formatInvalidReadingsCaption(1)).toBe('1 invalid reading hidden');
    expect(formatInvalidReadingsCaption(2)).toBe('2 invalid readings hidden');
    expect(formatInvalidReadingsCaption(5)).toBe('5 invalid readings hidden');
  });
});

/* ─────────────── TR-1: chart chrome ─────────────── */

const named = (display: string, type: TrendAggregation['type'] = 'line'): TrendAggregation => ({
  param: display,
  type,
  color: 'tok-series',
  display,
});

// Short synthetic power-series names — real configs are usually longer
// (LUCKY_SECTIONS, just below, are a real site's sections).
const POWER_SERIES = [
  named('Wind Power'),
  named('Solar Power'),
  named('Genset Power', 'bar'),
  named('Grid Power'),
  named('Total Load'),
];

/**
 * Lucky Cement Nooriabad (siteId 146c5345-…): its three trend sections'
 * series names exactly as the site config ships them (read from the web
 * portal's tab view, 2026-10-01).
 */
const LUCKY_SECTIONS: Record<string, string[]> = {
  'Trend Analysis': [
    'Captive Plant kW',
    'Grid Active Power',
    'PV Active Power',
    'Wind Active Power',
    'PCS Active Power',
    'WHR kW',
    'Bus Frequency',
    'Bus Voltage',
    'System SOC',
  ],
  'Chart Analysis Test': ['Bus Voltage', 'SVG ReActive Power', 'PCS Reactive Power'],
  'Customised Report': [
    'Wind Energy Day',
    'PV Energy Day',
    'Genset Energy',
    'Cost of Total Energy($)',
    'Cost of Genset Energy($)',
    'Savings - Wind Energy($)',
    'Savings - PV Energy($)',
  ],
};

/**
 * Oracle: each name's real width (px) at the legend's 11px, measured with
 * CoreText in the fonts the chart WebView uses for `sans-serif` —
 * Helvetica (iOS WebKit) and Roboto-Regular (Android WebView) — taking the
 * larger of the kerned and unkerned widths.
 */
const MEASURED_11PX: Record<string, { ios: number; android: number }> = {
  'Captive Plant kW': { ios: 84.4, android: 82.8 },
  'Grid Active Power': { ios: 88, android: 86.9 },
  'PV Active Power': { ios: 81.9, android: 80.8 },
  'Wind Active Power': { ios: 92.3, android: 91.5 },
  'PCS Active Power': { ios: 89.9, android: 87.5 },
  'WHR kW': { ios: 45.2, android: 42.4 },
  'Bus Frequency': { ios: 74, android: 72.1 },
  'Bus Voltage': { ios: 59.3, android: 58.8 },
  'System SOC': { ios: 63.6, android: 60.4 },
  'SVG ReActive Power': { ios: 104.5, android: 100.4 },
  'PCS Reactive Power': { ios: 102.7, android: 98.9 },
  'Wind Energy Day': { ios: 85.6, android: 81.8 },
  'PV Energy Day': { ios: 75.2, android: 71 },
  'Genset Energy': { ios: 73.4, android: 70.5 },
  'Cost of Total Energy($)': { ios: 113.7, android: 113.1 },
  'Cost of Genset Energy($)': { ios: 124.7, android: 122.5 },
  'Savings - Wind Energy($)': { ios: 125.3, android: 121.3 },
  'Savings - PV Energy($)': { ios: 114.9, android: 110.6 },
};

const ROW: TrendDataRow[] = [{ time: 0 }];

const legendOf = (r: TrendComboBuildResult) => (r.option as any).legend;
const gridOf = (r: TrendComboBuildResult) => (r.option as any).grid;

describe('buildTrendComboOption — chrome', () => {
  it('has no x-axis name and the same slider-only bottom gutter in both modes', () => {
    for (const detailed of [false, true]) {
      const { option } = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME, {
        detailed,
      }) as { option: any };
      expect(option.xAxis.name).toBeUndefined();
      expect(option.xAxis.nameGap).toBeUndefined();
      expect(option.grid.bottom).toBe(TREND_GRID_BOTTOM);
    }
  });

  it('uses a wrapping plain legend — never the paginating scroll type', () => {
    const r = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME);
    expect(legendOf(r).type).toBe('plain');
    expect(legendOf(r).show).toBe(true);
    expect(legendOf(r).padding).toBe(0);
    expect(legendOf(r).itemGap).toBe(TREND_LEGEND.itemGap);
  });

  it('hides the legend for a single series and gives the plot that room', () => {
    const r = buildTrendComboOption(ROW, [named('Irradiance')], 1000, THEME);
    expect(legendOf(r).show).toBe(false);
    expect(gridOf(r).top).toBe(TREND_GRID_TOP_BARE);
  });

  it('sets grid.top from the estimated legend rows at the chart width', () => {
    const wide = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME, { width: 900 });
    const narrow = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME, { width: 200 });
    const names = POWER_SERIES.map(a => a.display);
    expect(gridOf(wide).top).toBe(estimateTrendLegend(names, 900).gridTop);
    expect(gridOf(narrow).top).toBe(estimateTrendLegend(names, 200).gridTop);
    expect(estimateTrendLegend(names, 900).rows).toBe(1);
    expect(estimateTrendLegend(names, 200).rows).toBeGreaterThan(2);
    expect(gridOf(narrow).top).toBeGreaterThan(gridOf(wide).top);
  });

  it('wraps (never truncates) a name wider than the chart', () => {
    const long = named(
      'Main Incomer Feeder 11kV Active Power Import Total Aggregated Value',
    );
    const width = 200;
    const r = buildTrendComboOption(ROW, [named('Grid'), long], 1000, THEME, { width });
    const data = legendOf(r).data;
    expect(data[0]).toBe('Grid');
    expect(data[1].name).toBe(long.display);
    expect(data[1].textStyle.overflow).toBe('break');
    expect(data[1].textStyle.width).toBeLessThanOrEqual(
      width - TREND_LEGEND.iconWidth - TREND_LEGEND.textGap,
    );
    // The wrapped name spans several lines, and the plot is pushed below them.
    const layout = estimateTrendLegend(['Grid', long.display], width);
    expect(layout.height).toBeGreaterThan(2 * TREND_LEGEND.lineHeight);
    expect(gridOf(r).top).toBe(layout.gridTop);
  });

  it('takes every dataZoom colour from the theme (no hex / rgba literals)', () => {
    const { option } = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME) as {
      option: any;
    };
    const slider = option.dataZoom.find((z: any) => z.type === 'slider');
    expect(slider.fillerColor).toBe(THEME.brandSoft);
    expect(slider.handleStyle.color).toBe(THEME.brand);
    expect(slider.borderColor).toBe(THEME.border);
    const json = JSON.stringify(option.dataZoom);
    expect(json).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(json).not.toMatch(/rgba?\(/i);
    // …and nothing else in the option hard-codes a colour either.
    expect(JSON.stringify(option)).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });
});

describe('buildTrendComboOption — invalid-readings note inside the chart', () => {
  const aggs = [named('Wind Energy Day'), named('PV Energy Day')];
  const bad: TrendDataRow[] = [{ time: 0, 'Wind Energy Day': 4e31, 'PV Energy Day': 5 }];
  const good: TrendDataRow[] = [{ time: 0, 'Wind Energy Day': 3, 'PV Energy Day': 5 }];

  it('shows the note and gives up one line of plot (not card height) when points were dropped', () => {
    const withNote = buildTrendComboOption(bad, aggs, 1000, THEME);
    const clean = buildTrendComboOption(good, aggs, 1000, THEME);
    const note = (withNote.option as any).graphic[0];
    expect(note.invisible).toBe(false);
    expect(note.style.text).toBe('1 invalid reading hidden');
    expect(gridOf(withNote).top).toBe(gridOf(clean).top + TREND_INVALID_NOTE_HEIGHT);
  });

  it('keeps a hidden note element with the same id so a merge update can clear it', () => {
    const withNote = buildTrendComboOption(bad, aggs, 1000, THEME);
    const clean = buildTrendComboOption(good, aggs, 1000, THEME);
    const a = (withNote.option as any).graphic[0];
    const b = (clean.option as any).graphic[0];
    expect(b.id).toBe(a.id);
    expect(b.invisible).toBe(true);
    expect(b.style.text).toBe('');
  });

  it('full screen discloses it as RN text instead (no in-chart note)', () => {
    const detailed = buildTrendComboOption(bad, aggs, 1000, THEME, { detailed: true });
    expect((detailed.option as any).graphic).toBeUndefined();
    expect(detailed.invalidCount).toBe(1);
  });
});

describe('trendChartLayout — one geometry for skeleton, empty slot and chart', () => {
  it('card = chart + chrome, chart = legend band + plot + slider gutter', () => {
    const width = trendChartWidth(370);
    const layout = trendChartLayout(POWER_SERIES, width);
    expect(layout.cardHeight).toBe(layout.chartHeight + TREND_CARD_CHROME);
    expect(layout.chartHeight).toBe(
      layout.legend.gridTop + TREND_PLOT_HEIGHT + TREND_GRID_BOTTOM,
    );
    // The option built for that width reserves exactly the same legend band.
    const r = buildTrendComboOption(ROW, POWER_SERIES, 1000, THEME, { width });
    expect(gridOf(r).top).toBe(layout.legend.gridTop);
  });

  it('depends only on the series and the width — never on the data', () => {
    const a = trendChartLayout(POWER_SERIES, 336);
    const b = trendChartLayout([...POWER_SERIES], 336);
    expect(b).toEqual(a);
  });

  it('a 402pt phone (336px chart) fits 5 power series in at most 2 rows, no wrapped names', () => {
    expect(DEFAULT_TREND_CHART_WIDTH).toBe(336);
    const { legend } = trendChartLayout(POWER_SERIES, DEFAULT_TREND_CHART_WIDTH);
    expect(legend.rows).toBeLessThanOrEqual(2);
    expect(legend.wrapWidths.every(w => w === null)).toBe(true);
  });

  // Only up to 2 legend rows (and no extra subHeading line): every extra
  // legend row costs 24pt, and a 3-row legend — all 9 names of Lucky
  // Cement's 'Trend Analysis' at 336px — saves 60pt, not 80. Those names
  // used to sit in ONE paginated row that hid most of them.
  it('removes ≥ 80pt of chrome versus the old card while the legend takes ≤ 2 rows', () => {
    // Old card around the same 190pt plot: in-card header block
    // (COMBINED + Fullscreen row 27, gap 4, legend hint 15, gap 12 = 58)
    // + scroll-legend band 40 + 'Time' name & slider gutter 70.
    const OLD_CHROME = 58 + 40 + 70;
    // The section's own gaps also shrank 12 → 8 (two gaps).
    const SECTION_GAP_SAVING = 2 * 4;
    const saving = (aggs: TrendAggregation[]) =>
      OLD_CHROME -
      (trendChartLayout(aggs, DEFAULT_TREND_CHART_WIDTH).chartHeight - TREND_PLOT_HEIGHT) +
      SECTION_GAP_SAVING;
    expect(saving([named('Irradiance')])).toBeGreaterThanOrEqual(80); // no legend
    expect(saving(POWER_SERIES.slice(0, 3))).toBeGreaterThanOrEqual(80); // 1 row
    expect(saving(POWER_SERIES)).toBeGreaterThanOrEqual(80); // 2 rows
    const lucky3Rows = LUCKY_SECTIONS['Trend Analysis'].map(n => named(n));
    expect(trendChartLayout(lucky3Rows, DEFAULT_TREND_CHART_WIDTH).legend.rows).toBe(3);
    expect(saving(lucky3Rows)).toBe(60);
  });
});

/* ─────────────── legend calibration on a real site ─────────────── */

describe('legend estimate — calibrated to the real fonts (Lucky Cement Nooriabad)', () => {
  const { fontSize } = TREND_LEGEND;
  const allNames = Object.values(LUCKY_SECTIONS).flat();

  it('has a measured width for every name', () => {
    for (const n of allNames) expect(MEASURED_11PX[n]).toBeDefined();
  });

  it('iOS: matches Helvetica — never narrower (no overlap), not padded (no blank row)', () => {
    for (const n of allNames) {
      const est = estimateTextWidth(n, fontSize, 'ios');
      // The oracle is rounded to 0.1px.
      expect(est).toBeGreaterThanOrEqual(MEASURED_11PX[n].ios - 0.1);
      expect(est).toBeLessThanOrEqual(MEASURED_11PX[n].ios + 0.1);
    }
  });

  it('Android: never narrower than Roboto, at most 10% wider', () => {
    for (const n of allNames) {
      const est = estimateTextWidth(n, fontSize, 'android');
      expect(est).toBeGreaterThanOrEqual(MEASURED_11PX[n].android - 0.1);
      expect(est).toBeLessThanOrEqual(MEASURED_11PX[n].android * 1.1);
    }
  });

  it("reserves exactly the rows echarts packs them into (iPhone 17 Pro 336px, SE 309px)", () => {
    // Rows echarts 5.4.3's own box layout gives these names at those
    // widths (also what packing the measured Helvetica widths gives).
    const expected: Record<string, [number, number]> = {
      'Trend Analysis': [3, 4],
      'Chart Analysis Test': [2, 2],
      'Customised Report': [3, 3],
    };
    for (const [section, names] of Object.entries(LUCKY_SECTIONS)) {
      const aggs = names.map(n => named(n));
      const at336 = trendChartLayout(aggs, 336).legend;
      const at309 = trendChartLayout(aggs, 309).legend;
      expect([section, at336.rows, at309.rows]).toEqual([section, ...expected[section]]);
      expect(at336.wrapWidths.every(w => w === null)).toBe(true);
      // Pitch: lineHeight + itemGap per extra row, then the plot gap.
      expect(at336.gridTop).toBe(
        at336.rows * TREND_LEGEND.lineHeight +
          (at336.rows - 1) * TREND_LEGEND.itemGap +
          TREND_LEGEND_PLOT_GAP,
      );
    }
  });

  it('Android (Pixel 7a, 346px): same rows as Roboto packs them into', () => {
    const expected: Record<string, number> = {
      'Trend Analysis': 3,
      'Chart Analysis Test': 1,
      'Customised Report': 3,
    };
    for (const [section, names] of Object.entries(LUCKY_SECTIONS)) {
      expect([section, estimateTrendLegend(names, 346, 'android').rows]).toEqual([
        section,
        expected[section],
      ]);
    }
  });
});

describe('estimateTextWidth', () => {
  it('is wider for wide glyphs and scales with font size', () => {
    expect(estimateTextWidth('WWW', 11)).toBeGreaterThan(estimateTextWidth('iii', 11));
    expect(estimateTextWidth('Solar', 22)).toBeCloseTo(2 * estimateTextWidth('Solar', 11));
    expect(estimateTextWidth('', 11)).toBe(0);
  });
});

describe('buildTrendChartSummary', () => {
  const aggs = [named('Solar Power (kW)'), named('Wind'), named('Grid')];
  const rows: TrendDataRow[] = [
    { time: 2000, 'Solar Power (kW)': 18900, Wind: 4e31, Grid: null },
    { time: 1000, 'Solar Power (kW)': 25300, Wind: 1500, Grid: null },
  ];

  it('names the chart, period, series count, latest + peak per series and the disclosure', () => {
    const text = buildTrendChartSummary({
      heading: 'Power',
      periodSpoken: 'Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35',
      rows,
      aggregations: aggs,
      invalidCount: 1,
    });
    expect(text).toBe(
      'Power chart. Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35. 3 series. ' +
        'Solar Power (kW): latest 18.9 megawatts, peak 25.3 megawatts. ' +
        // the impossible 4e31 is excluded, exactly as the chart excludes it
        'Wind: latest 1.50 thousand, peak 1.50 thousand. ' +
        'Grid: no data. 1 invalid reading hidden.',
    );
  });

  it('caps the listed series', () => {
    const many = Array.from({ length: 10 }, (_, i) => named(`S${i}`));
    const text = buildTrendChartSummary({
      heading: 'Load',
      periodSpoken: 'Custom range, 29 Sep to 1 Oct 2026',
      rows: [],
      aggregations: many,
      invalidCount: 0,
    });
    expect(text).toContain('10 series');
    expect(text).toContain('S7: no data');
    expect(text).not.toContain('S8:');
    expect(text).toContain('and 2 more');
  });
});

/* ─────────────── TrendSection (rendered): no layout jump ─────────────── */

const mockTrendQuery: { current: Record<string, unknown> } = { current: {} };
const mockChartLife = { mounts: 0, unmounts: 0 };

jest.mock('src/hooks', () => {
  const actual = jest.requireActual('src/hooks') as object;
  return {
    ...actual,
    useInteractionReady: () => true,
    useTrendData: () => mockTrendQuery.current,
  };
});

// The WebView chart, reduced to a View that counts its mounts — a period
// change must update the chart in place, never remount it.
jest.mock('react-native-echarts-pro', () => {
  const R = require('react');
  const { View } = require('react-native');
  const MockECharts = (props: { height: number }) => {
    R.useEffect(() => {
      mockChartLife.mounts += 1;
      return () => {
        mockChartLife.unmounts += 1;
      };
    }, []);
    return R.createElement(View, { testID: 'echarts', height: props.height });
  };
  return { __esModule: true, default: MockECharts };
});

import RNEChartsPro from 'react-native-echarts-pro';
import { CalendarIcon } from '../src/assets/icons';
import EmptyStateCard from '../src/components/common/EmptyStateCard';
import Skeleton from '../src/components/common/Skeleton';
import Surface from '../src/components/common/Surface';
import TrendSection from '../src/components/screens/Authenticated/SiteDetail/components/Trends/TrendSection';

describe('TrendSection (rendered)', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const NOW = new Date(2026, 9, 1, 14, 35).getTime();
  const rowsA: TrendDataRow[] = [
    { time: NOW - 2 * 3600e3, 'Wind Power': 14463.03, 'Solar Power': 18942.4 },
    { time: NOW - 3600e3, 'Wind Power': 14000, 'Solar Power': 19000 },
  ];
  const rowsB: TrendDataRow[] = [
    { time: NOW - 30 * 3600e3, 'Wind Power': 12000, 'Solar Power': 9000 },
    { time: NOW - 3600e3, 'Wind Power': 13000, 'Solar Power': 9500 },
  ];
  const trendBase = {
    heading: 'Power',
    subHeading: 'power',
    aggregations: POWER_SERIES,
  };
  const query = (over: Record<string, unknown>) => ({
    data: undefined,
    error: null,
    fetchStatus: 'idle',
    isFetching: false,
    isPlaceholderData: false,
    dataUpdatedAt: 0,
    refetch: jest.fn(),
    ...over,
  });

  let tree: ReactTestRenderer | undefined;
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
  });

  // A fresh `trend` object (same aggregations array) defeats the section's
  // React.memo so each state is actually rendered.
  const show = (state: Record<string, unknown>) => {
    mockTrendQuery.current = query(state);
    const el = React.createElement(TrendSection, {
      siteId: 's1',
      idx: 0,
      position: 0,
      trend: { ...trendBase },
    });
    act(() => {
      if (tree) tree.update(el);
      else tree = renderer.create(el);
    });
    return (tree as ReactTestRenderer).root;
  };

  // Same width TrendSection derives before its first onLayout.
  const layout = trendChartLayout(
    POWER_SERIES,
    trendChartWidth(Dimensions.get('window').width - 32),
  );
  const heightOf = (style: unknown) =>
    (StyleSheet.flatten(style as StyleProp<ViewStyle>) as ViewStyle | undefined)
      ?.height;

  it('keeps the body the same height from skeleton → chart → refetch → empty', () => {
    // 1. first load: skeleton exactly as tall as the chart card
    let root = show({ fetchStatus: 'fetching', isFetching: true });
    expect(root.findByType(Skeleton).props.height).toBe(layout.cardHeight);

    // 2. data: the chart card (and its WebView) use the same geometry
    root = show({ data: { data: rowsA, windowMs: DAY }, dataUpdatedAt: NOW });
    const card = root.findByType(Surface);
    expect(heightOf(card.props.style)).toBe(layout.cardHeight);
    expect(root.findByType(RNEChartsPro).props.height).toBe(layout.chartHeight);
    expect(mockChartLife.mounts).toBe(1);

    // 3. period change: previous rows stay, dimmed + 'Updating…', same WebView
    root = show({
      data: { data: rowsA, windowMs: DAY },
      isPlaceholderData: true,
      isFetching: true,
      fetchStatus: 'fetching',
      dataUpdatedAt: NOW,
    });
    expect(root.findAllByType(Skeleton)).toHaveLength(0);
    expect(heightOf(root.findByType(Surface).props.style)).toBe(layout.cardHeight);
    const texts = root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toContain('Updating…');
    expect(
      root.findAll(
        n => n.props.accessibilityRole === 'image' && heightOf(n.props.style) === layout.chartHeight,
      )[0].props.style,
    ).toEqual(expect.arrayContaining([expect.objectContaining({ opacity: 0.5 })]));

    // 4. the new period's rows land in the SAME chart instance
    root = show({ data: { data: rowsB, windowMs: 2 * DAY }, dataUpdatedAt: NOW });
    expect(mockChartLife).toEqual({ mounts: 1, unmounts: 0 });
    expect(root.findAllByType(Text).map(t => t.props.children)).not.toContain('Updating…');

    // 5. an empty period: the empty state fills the card's exact height
    root = show({ data: { data: [], windowMs: DAY }, dataUpdatedAt: NOW });
    const empty = root.findByType(EmptyStateCard);
    expect(heightOf(empty.parent?.props.style)).toBe(layout.cardHeight);
  });

  it('header: heading once, redundant subHeading dropped, window caption, full-screen button', () => {
    const root = show({ data: { data: rowsA, windowMs: DAY }, dataUpdatedAt: NOW });
    const texts = root
      .findAllByType(Text)
      .map(t => t.props.children)
      .filter(c => typeof c === 'string');
    expect(texts.filter(t => /power/i.test(t))).toEqual(['Power']);
    expect(texts).toContain('30 Sep 14:35 – 1 Oct 14:35');
    // the old in-card chrome is gone
    for (const gone of ['COMBINED', 'Fullscreen', 'Tap a series in the legend to show or hide it']) {
      expect(texts).not.toContain(gone);
    }
    expect(
      root.findAll(n => n.props.accessibilityLabel === 'Open Power full screen').length,
    ).toBeGreaterThan(0);
    // period pills are a radio group
    expect(
      root.findAll(
        n => n.props.accessibilityRole === 'radiogroup' && n.props.accessibilityLabel === 'Power period',
      ).length,
    ).toBeGreaterThan(0);
  });

  it("'Custom' is the range editor: calendar glyph + a label that says it opens the picker", () => {
    const root = show({ data: { data: rowsA, windowMs: DAY }, dataUpdatedAt: NOW });
    const byLabel = (label: string) =>
      root.findAll(n => n.props.accessibilityLabel === label)[0];
    const custom = byLabel('Custom range, opens date picker');
    expect(custom).toBeDefined();
    expect(custom.findAllByType(CalendarIcon)).toHaveLength(1);
    // the presets apply at once — no picker glyph on them, and the
    // caption-mode header has no date pill: Custom's is the only one.
    for (const p of ['24H', '48H', '72H'] as const) {
      expect(byLabel(trendPeriodPillA11yLabel(p)).findAllByType(CalendarIcon)).toHaveLength(0);
    }
    expect(root.findAllByType(CalendarIcon)).toHaveLength(1);
  });
});
