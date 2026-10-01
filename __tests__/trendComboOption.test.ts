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
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildTrendComboOption,
  TrendComboBuildResult,
} from '../src/components/screens/Authenticated/SiteDetail/components/Trends/echartsOption';
import {
  coerceChartValue,
  formatInvalidReadingsCaption,
  IMPOSSIBLE_READING_CEILING,
} from '../src/components/screens/Authenticated/SiteDetail/components/Trends/helpers';
import { TrendAggregation, TrendDataRow } from '../src/types';

const THEME = {
  textPrimary: '#000000',
  textSecondary: '#000000',
  textTertiary: '#000000',
  border: '#000000',
  surface: '#ffffff',
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
