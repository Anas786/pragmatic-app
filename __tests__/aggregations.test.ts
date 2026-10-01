/**
 * Reports tab data pipeline: `aggregateEnergy` / `buildStackData`
 * (src/utils/aggregations.ts), the period/bucket label formatters
 * (src/utils/reports.ts) and the Performance Report view-model helpers
 * (PerformanceReport/helpers.ts).
 *
 * The value path must stay web-portal-identical (O1): the hero totals are
 * checked BIT-FOR-BIT against a verbatim copy of the pre-v3 implementation
 * (`legacyTotals` below), while the chart becomes outage-honest (every API
 * bucket kept, 0 and negatives kept, null → gap).
 *
 * Dates are built with local-time constructors so the labels are
 * timezone-independent.
 */
import { describe, expect, it } from '@jest/globals';
import { EnergyReportRow } from '../src/networking';
import { aggregateEnergy, buildStackData } from '../src/utils/aggregations';
import {
  formatBucketLabel,
  formatChartLabel,
  formatDateFilterLabel,
  formatNoProductionCaption,
} from '../src/utils/reports';
import {
  buildEnergyChartSummary,
  countInvalidReportReadings,
  formatSharePercent,
  heroMixLabel,
  reportingSources,
  SHARE_UNAVAILABLE,
  sharesAvailable,
  sourceCountLabel,
  sourceSecondaryLabel,
  spokenHeroMixLabel,
  spokenPeriod,
  spokenSharePercent,
} from '../src/components/screens/Authenticated/SiteDetail/components/PerformanceReport/helpers';

/* ─────────── pre-v3 oracle (verbatim value logic from HEAD) ─────────── */

const LEGACY_TOKENS = ['solar', 'wind', 'grid', 'genset', 'battery'] as const;

const legacyFindSourceForColumn = (column: string) => {
  const n = column.toLowerCase();
  if (n.includes('solar') || n.includes('pv')) return 'solar';
  if (n.includes('wind')) return 'wind';
  if (n.includes('grid')) return 'grid';
  if (n.includes('genset') || n.includes('dg')) return 'genset';
  if (n.includes('battery') || n.includes('bess')) return 'battery';
  return undefined;
};

/** HEAD's aggregateEnergy value/percent math + the card's grand total. */
const legacyTotals = (rows: EnergyReportRow[]) => {
  const sums: Record<string, number> = {};
  for (const t of LEGACY_TOKENS) sums[t] = 0;
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (column === 'time') continue;
      const v = row[column];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const token = legacyFindSourceForColumn(column);
      if (!token) continue;
      sums[token] += v;
    }
  }
  const total = LEGACY_TOKENS.reduce((acc, t) => acc + sums[t], 0);
  const perSource = LEGACY_TOKENS.map(t => ({
    value: sums[t],
    percentNum: total > 0 ? (sums[t] / total) * 100 : 0,
  }));
  return { perSource, grandTotal: perSource.reduce((acc, s) => acc + s.value, 0) };
};

/* ─────────── fixtures ─────────── */

const day = (d: number, m = 9, y = 2026) => new Date(y, m - 1, d).getTime();

// Lucky-Cement-shaped: several columns per source, float noise, a grid
// export (negative), a full outage day (all 0), a day with no readings at
// all (all null), a missing column, a string the backend sometimes ships.
const ROWS: EnergyReportRow[] = [
  { time: day(1), ed_solar: 119560.9, ed_pv_block_b: 0.1 + 0.2, ed_wind: 147786, ed_genset: 105024, ed_grid: 200000 },
  { time: day(2), ed_solar: 16874.6, ed_pv_block_b: 1.15, ed_wind: 14463.03, ed_genset: 13726.96, ed_grid: -1250.5 },
  { time: day(3), ed_solar: 0, ed_pv_block_b: 0, ed_wind: 0, ed_genset: 0, ed_grid: 0 },
  { time: day(4), ed_solar: null, ed_pv_block_b: null, ed_wind: null, ed_genset: null, ed_grid: null },
  { time: day(5), ed_solar: 5500.25, ed_wind: null, ed_genset: 98.7, ed_grid: 333.33 },
  // Strings / NaN are not readings (unchanged rule).
  { time: day(6), ed_solar: '42' as unknown as number, ed_wind: Number.NaN, ed_genset: 7, ed_grid: 1 },
];

const MAPPING = {
  ed_solar: { display: 'Solar Production Today System (kWh)', ingestName: 'ed_solar' },
  ed_wind: { display: 'Wind', ingestName: 'ed_wind' },
};

/* ─────────── aggregateEnergy ─────────── */

describe('aggregateEnergy — hero totals unchanged vs pre-v3 (web parity)', () => {
  it('per-source values, shares and the grand total are bit-identical', () => {
    const agg = aggregateEnergy(ROWS, MAPPING);
    const legacy = legacyTotals(ROWS);
    expect(agg.map(s => s.token)).toEqual([...LEGACY_TOKENS]);
    agg.forEach((s, i) => {
      expect(s.value).toBe(legacy.perSource[i].value);
      expect(s.percentNum).toBe(legacy.perSource[i].percentNum);
    });
    expect(agg.reduce((acc, s) => acc + s.value, 0)).toBe(legacy.grandTotal);
  });

  it('is bit-identical on a 31-day float-noise fixture too', () => {
    const rows: EnergyReportRow[] = Array.from({ length: 31 }, (_, i) => ({
      time: day(1 + (i % 30)),
      et_solar: 1000 / 3 + i * 0.1,
      ed_pv: 0.7 * i,
      ed_wind: i % 4 === 0 ? 0 : 12345.678 / (i + 1),
      et_grid_import: 1e5 / 7,
      et_dg: i % 5 === 0 ? null : 0.3,
      hi_bess: -0.1 * i,
    }));
    const agg = aggregateEnergy(rows, null);
    const legacy = legacyTotals(rows);
    agg.forEach((s, i) => expect(s.value).toBe(legacy.perSource[i].value));
    expect(agg.reduce((acc, s) => acc + s.value, 0)).toBe(legacy.grandTotal);
  });

  it('labels: mapping label of the first matched column, else the short label', () => {
    const agg = aggregateEnergy(ROWS, MAPPING);
    const solar = agg.find(s => s.token === 'solar')!;
    expect(solar.label).toBe('Solar Production Today System (kWh)');
    expect(solar.shortLabel).toBe('Solar');
    expect(agg.find(s => s.token === 'grid')!.label).toBe('Grid');
  });

  it('hasData separates "reported 0" from "never reported"', () => {
    const agg = aggregateEnergy(
      [
        { time: day(1), ed_solar: 0, ed_wind: null },
        { time: day(2), ed_solar: 0 },
      ],
      null,
    );
    const byToken = Object.fromEntries(agg.map(s => [s.token, s]));
    expect(byToken.solar.hasData).toBe(true);
    expect(byToken.solar.value).toBe(0);
    expect(byToken.wind.hasData).toBe(false);
    expect(byToken.battery.hasData).toBe(false);
  });
});

/* ─────────── buildStackData ─────────── */

describe('buildStackData — outage-honest buckets', () => {
  const stack = buildStackData(ROWS, 'Custom');

  it('keeps every API bucket (bar count = row count), in API order', () => {
    expect(stack.buckets).toHaveLength(ROWS.length);
    expect(stack.buckets.map(b => b.time)).toEqual(ROWS.map(r => r.time));
  });

  it('retains an all-zero bucket as 0 (an outage), not a gap', () => {
    const outage = stack.buckets[2];
    expect(outage.total).toBe(0);
    for (const s of stack.series) expect(s.values[2]).toBe(0);
    expect(stack.zeroBuckets).toBe(1);
  });

  it('turns null / absent / non-numeric readings into gaps (null), never 0', () => {
    expect(stack.buckets[3].total).toBeNull();
    for (const s of stack.series) expect(s.values[3]).toBeNull();
    const wind = stack.series.find(s => s.token === 'wind')!;
    expect(wind.values[4]).toBeNull(); // ed_wind: null
    expect(wind.values[5]).toBeNull(); // NaN
    const solar = stack.series.find(s => s.token === 'solar')!;
    expect(solar.values[5]).toBeNull(); // '42' string is not a reading
  });

  it('retains a negative grid export', () => {
    const grid = stack.series.find(s => s.token === 'grid')!;
    expect(grid.values[1]).toBe(-1250.5);
  });

  it('sums every column of a source in a bucket (same rule as the totals)', () => {
    const solar = stack.series.find(s => s.token === 'solar')!;
    expect(solar.values[0]).toBe(119560.9 + (0.1 + 0.2));
    // Each series' buckets add up to the hero total for that source.
    const agg = aggregateEnergy(ROWS, null);
    for (const s of stack.series) {
      const sum = s.values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
      expect(sum).toBeCloseTo(agg.find(a => a.token === s.token)!.value, 6);
    }
  });

  it('series = sources with any non-null value, canonical order, short labels', () => {
    expect(stack.series.map(s => s.token)).toEqual(['solar', 'wind', 'grid', 'genset']);
    expect(stack.series.map(s => s.label)).toEqual(['Solar', 'Wind', 'Grid', 'Genset']);
  });

  it('maxStackAbs = the largest positive stack or |negative stack| of any bucket', () => {
    expect(stack.maxStackAbs).toBeCloseTo(119560.9 + 0.3 + 147786 + 105024 + 200000, 6);
    const neg = buildStackData([{ time: day(1), ed_grid: -900, ed_solar: 100 }], 'Custom');
    expect(neg.maxStackAbs).toBe(900);
  });

  it('labels buckets per pill: short axis label + full header', () => {
    expect(stack.buckets[0].label).toBe('1 Sep');
    expect(stack.buckets[0].header).toBe('1 Sep 2026');
    const year = buildStackData([{ time: day(1, 9), ed_solar: 1 }], 'Year');
    expect(year.buckets[0].label).toBe('Sep');
    expect(year.buckets[0].header).toBe('September 2026');
  });

  it("keeps a device's invalid-looking reading exactly as sent (summed, plotted, never dropped)", () => {
    const garbage: EnergyReportRow[] = [
      { time: day(1), ed_wind: -1.2345678901234567e35, ed_solar: 63000 },
      { time: day(2), ed_wind: 41000, ed_solar: 64000 },
    ];
    const g = buildStackData(garbage, 'Custom');
    const wind = g.series.find(s => s.token === 'wind')!;
    expect(wind.values).toEqual([-1.2345678901234567e35, 41000]);
    expect(g.buckets[0].total).toBe(-1.2345678901234567e35 + 63000);
    expect(g.maxStackAbs).toBe(1.2345678901234567e35);
    const totals = aggregateEnergy(garbage, null);
    expect(totals.find(a => a.token === 'wind')!.value).toBe(-1.2345678901234567e35 + 41000);
    expect(countInvalidReportReadings(garbage)).toBe(1);
  });

  it('an empty report is an empty stack', () => {
    const empty = buildStackData([], 'Custom');
    expect(empty).toEqual({ buckets: [], series: [], zeroBuckets: 0, maxStackAbs: 0 });
  });
});

/* ─────────── reports.ts formatters ─────────── */

describe('report label formatters', () => {
  const t = day(1, 9, 2026);

  it('formatChartLabel: Custom "1 Sep", Month "1", Year "Sep", Lifetime "2026" — never DD/MM', () => {
    expect(formatChartLabel(t, 'Custom')).toBe('1 Sep');
    expect(formatChartLabel(day(30, 9), 'Month')).toBe('30');
    expect(formatChartLabel(t, 'Year')).toBe('Sep');
    expect(formatChartLabel(t, 'Life Time')).toBe('2026');
    expect(formatChartLabel(Number.NaN, 'Custom')).toBe('');
  });

  it('formatBucketLabel gives the unambiguous bucket name', () => {
    expect(formatBucketLabel(t, 'Custom')).toBe('1 Sep 2026');
    expect(formatBucketLabel(t, 'Month')).toBe('1 Sep 2026');
    expect(formatBucketLabel(t, 'Year')).toBe('September 2026');
    expect(formatBucketLabel(t, 'Life Time')).toBe('2026');
  });

  it('formatDateFilterLabel uses formatDateRange / formatMonthYear / "Lifetime"', () => {
    const start = new Date(2026, 8, 1);
    const end = new Date(2026, 9, 1);
    expect(formatDateFilterLabel('Custom', start, end)).toBe('1 Sep – 1 Oct 2026');
    expect(formatDateFilterLabel('Custom', new Date(2026, 8, 1), new Date(2026, 8, 30))).toBe(
      '1 – 30 Sep 2026',
    );
    expect(formatDateFilterLabel('Month', start, end, { month: 8, year: 2026 })).toBe(
      'August 2026',
    );
    expect(formatDateFilterLabel('Year', start, end, undefined, 2025)).toBe('2025');
    expect(formatDateFilterLabel('Life Time', start, end)).toBe('Lifetime');
    expect(formatDateFilterLabel('Custom', start, end)).not.toMatch(/\d{2}\/\d{2}/);
  });

  it('formatNoProductionCaption counts days / months / years', () => {
    expect(formatNoProductionCaption(0, 'Custom')).toBeNull();
    expect(formatNoProductionCaption(1, 'Custom')).toBe('1 day with no production');
    expect(formatNoProductionCaption(2, 'Month')).toBe('2 days with no production');
    expect(formatNoProductionCaption(3, 'Year')).toBe('3 months with no production');
    expect(formatNoProductionCaption(1, 'Life Time')).toBe('1 year with no production');
  });
});

/* ─────────── PerformanceReport/helpers ─────────── */

describe('Performance Report view-model helpers', () => {
  const agg = aggregateEnergy(ROWS, MAPPING);

  it('sourceCountLabel uses words, never a Σ glyph', () => {
    expect(sourceCountLabel(1)).toBe('1 source');
    expect(sourceCountLabel(3)).toBe('3 sources');
  });

  it('formatSharePercent / spokenSharePercent', () => {
    expect(formatSharePercent(100)).toBe('100%');
    expect(formatSharePercent(72.44)).toBe('72.4%');
    expect(formatSharePercent(5)).toBe('5%');
    expect(formatSharePercent(0)).toBe('0%');
    expect(formatSharePercent(0.04)).toBe('<0.1%');
    expect(formatSharePercent(-3.21)).toBe('-3.2%');
    expect(spokenSharePercent(72.44)).toBe('72.4 percent');
    expect(spokenSharePercent(0.04)).toBe('less than 0.1 percent');
    expect(spokenSharePercent(-3.21)).toBe('minus 3.2 percent');
  });

  it('heroMixLabel: "Mostly X" at ≥ 50 %, else "Largest: X"; never TOP ·', () => {
    const solarOnly = aggregateEnergy([{ time: day(1), ed_solar: 450749.7 }], MAPPING);
    expect(heroMixLabel(solarOnly)).toBe('Mostly Solar · 100%');
    const mixed = heroMixLabel(agg)!;
    expect(mixed.startsWith('Largest: Grid · ')).toBe(true);
    expect(mixed).not.toMatch(/TOP/);
    expect(heroMixLabel(aggregateEnergy([{ time: day(1), ed_solar: 0 }], null))).toBeNull();
  });

  it('spokenHeroMixLabel: same lead and share as the visible line, no "·" or "%"', () => {
    const solarOnly = aggregateEnergy([{ time: day(1), ed_solar: 450749.7 }], MAPPING);
    expect(spokenHeroMixLabel(solarOnly)).toBe('Mostly Solar, 100 percent');
    const visible = heroMixLabel(agg)!;
    const spoken = spokenHeroMixLabel(agg)!;
    expect(spoken.startsWith('Largest: Grid, ')).toBe(true);
    expect(spoken).not.toMatch(/·|%/);
    // Same share figure as the visible label, just spoken.
    const share = visible.split(' · ')[1].replace('%', '');
    expect(spoken).toBe(`Largest: Grid, ${share} percent`);
    expect(spokenHeroMixLabel(aggregateEnergy([{ time: day(1), ed_solar: 0 }], null))).toBeNull();
  });

  it('a non-positive total has no shares: no hero mix line, never a false "0%"', () => {
    // Lucky Cement: a device's -1.2e35 wind reading is summed AS SENT, so
    // the total goes negative and aggregateEnergy leaves every share at 0
    // — uncomputed, not "0%". The hero then quotes no share at all.
    const garbage = aggregateEnergy(
      [{ time: day(1), ed_wind: -1.2e35, ed_solar: 63000, ed_grid: 1000 }],
      null,
    );
    expect(garbage.every(s => s.percentNum === 0)).toBe(true);
    expect(sharesAvailable(garbage)).toBe(false);
    expect(heroMixLabel(garbage)).toBeNull();
    expect(spokenHeroMixLabel(garbage)).toBeNull();
    // the values themselves are untouched (shown as sent)
    expect(garbage.find(s => s.token === 'wind')!.value).toBe(-1.2e35);
    expect(garbage.find(s => s.token === 'solar')!.value).toBe(63000);
    expect(SHARE_UNAVAILABLE).toBe('—');
    // a positive total keeps its shares (incl. a legit negative export)
    expect(sharesAvailable(agg)).toBe(true);
    expect(
      sharesAvailable(aggregateEnergy([{ time: day(1), ed_solar: 500, ed_grid: -100 }], null)),
    ).toBe(true);
    expect(sharesAvailable(aggregateEnergy([{ time: day(1), ed_solar: 0 }], null))).toBe(false);
  });

  it('reportingSources: only sources with data, largest first', () => {
    expect(reportingSources(agg).map(s => s.token)).toEqual(['grid', 'wind', 'solar', 'genset']);
  });

  it('sourceSecondaryLabel strips the trailing unit and never repeats the short label', () => {
    const solar = agg.find(s => s.token === 'solar')!;
    expect(sourceSecondaryLabel(solar)).toBe('Solar Production Today System');
    expect(sourceSecondaryLabel(agg.find(s => s.token === 'wind')!)).toBeNull();
    expect(sourceSecondaryLabel(agg.find(s => s.token === 'grid')!)).toBeNull();
  });

  it('spokenPeriod reads the range dash as "to"', () => {
    expect(spokenPeriod('1 Sep – 1 Oct 2026')).toBe('1 Sep to 1 Oct 2026');
    expect(spokenPeriod('September 2026')).toBe('September 2026');
  });

  it('buildEnergyChartSummary describes period, total, extremes and outages', () => {
    const stack = buildStackData(ROWS, 'Custom');
    const total = agg.reduce((acc, s) => acc + s.value, 0);
    const summary = buildEnergyChartSummary({
      stack,
      periodLabel: '1 – 6 Sep 2026',
      pill: 'Custom',
      total,
      noProductionCaption: formatNoProductionCaption(stack.zeroBuckets, 'Custom'),
    });
    expect(summary).toBe(
      'Energy over time, 1 to 6 Sep 2026, 6 days. ' +
        'Total 622 megawatt hours. ' +
        'Highest 572 megawatt hours on 1 Sep 2026. ' +
        'Lowest 0 kilowatt hours on 3 Sep 2026. ' +
        '1 day with no production.',
    );
  });

  it('countInvalidReportReadings counts only finite source readings at/over 1e15', () => {
    expect(countInvalidReportReadings(ROWS)).toBe(0);
    expect(
      countInvalidReportReadings([
        // summed columns: counted, either sign
        { time: day(1), ed_wind: 4e31, ed_grid: -1e15, ed_solar: 9.99e14 },
        // a column no source sums (not on the chart) is not counted
        { time: day(2), ed_irradiance: 5e20, ed_genset: null },
        // missing / non-finite data is a gap, not a device reading
        { time: day(3), ed_wind: NaN, ed_solar: Infinity } as unknown as EnergyReportRow,
      ]),
    ).toBe(2);
    expect(countInvalidReportReadings([])).toBe(0);
  });

  it('buildEnergyChartSummary ends with the invalid-readings note when there is one', () => {
    const stack = buildStackData([{ time: day(1), ed_wind: 4e31 }], 'Custom');
    const summary = buildEnergyChartSummary({
      stack,
      periodLabel: '1 Sep 2026',
      pill: 'Custom',
      total: 4e31,
      invalidNote: '1 reading looks invalid — shown exactly as sent by the device',
    });
    expect(summary.endsWith('1 reading looks invalid — shown exactly as sent by the device.')).toBe(
      true,
    );
  });
});
