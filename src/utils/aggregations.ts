/**
 * Energy-report aggregation helpers shared by the Performance Report card.
 * Depend only on the networking types and the shared report/source utils
 * so they stay testable in isolation.
 *
 * VALUE PATH (web-portal parity): which report columns feed which source
 * bucket, and how they are summed, is fixed — `findSourceForColumn` on
 * every non-`time` column, finite numbers only, plain addition, in the
 * same order as before v3. Everything else here is presentation (labels,
 * null-vs-zero, bucket bookkeeping); the hero totals and the chart buckets
 * use the same column rule, so a source's buckets always add up to its
 * total.
 */

import { EnergyReportRow } from 'src/networking';
import { ReportMapping } from 'src/types';
import { energyPalette } from 'src/theme';
import { formatBucketLabel, formatChartLabel, resolveReportLabel } from './reports';
import { findSourceForColumn, SourceToken } from './sources';

export interface AggregatedSource {
  /** Canonical source bucket. */
  token: SourceToken;
  /** Backend report-mapping label of the first column that fed the bucket
   *  ('Solar Production Today System (kWh)'), or the short label. */
  label: string;
  /** Canonical short label: 'Solar' / 'Wind' / 'Grid' / 'Genset' / 'Battery'. */
  shortLabel: string;
  color: string;
  /** Sum over every row of every finite column in this bucket (kWh). */
  value: number;
  /** Share of the all-source total, in percent (0 when the total is 0). */
  percentNum: number;
  /** At least one finite reading existed for this source — a real 0 total
   *  is data; a source with no readings at all is not. */
  hasData: boolean;
}

/** One stacked-bar series: a source's per-bucket value, `null` = gap. */
export interface EnergySeries {
  token: SourceToken;
  /** Canonical short label ('Solar') — the legend / tooltip name. */
  label: string;
  color: string;
  /** Aligned 1:1 with `EnergyStackData.buckets`. kWh; `null` when the
   *  bucket had no finite reading for this source (never coerced to 0). */
  values: (number | null)[];
}

/** One API row = one time bucket on the chart axis. */
export interface EnergyBucket {
  /** Backend epoch-ms bucket start. */
  time: number;
  /** Short x-axis label ('1 Sep' / '1' / 'Sep' / '2026'). */
  label: string;
  /** Full bucket name for tooltips and screen readers ('1 Sep 2026'). */
  header: string;
  /** Sum of the non-null source values (kWh); `null` when all are null. */
  total: number | null;
}

export interface EnergyStackData {
  /** Every row the API returned, in API order — none dropped. */
  buckets: EnergyBucket[];
  /** Sources with at least one non-null value, in canonical order. */
  series: EnergySeries[];
  /** Buckets whose total is exactly 0 (outage / no production). */
  zeroBuckets: number;
  /** Largest stacked magnitude in any bucket (positive stack vs |negative
   *  stack|), kWh — drives the shared display scale (`pickScale`). */
  maxStackAbs: number;
}

/** Internal source table — the canonical bucket order + colours. */
const AGG_SOURCES = [
  { token: 'solar', fallbackLabel: 'Solar', color: energyPalette.solar },
  { token: 'wind', fallbackLabel: 'Wind', color: energyPalette.wind },
  { token: 'grid', fallbackLabel: 'Grid', color: energyPalette.grid },
  { token: 'genset', fallbackLabel: 'Genset', color: energyPalette.genset },
  { token: 'battery', fallbackLabel: 'Battery', color: energyPalette.battery },
] as const;

/**
 * THE value rule for one row: finite numeric columns, matched by
 * `findSourceForColumn`, summed per source in column order (identical to
 * the pre-v3 per-bucket loop). A token with no finite column is absent —
 * the caller turns that into a `null` gap, never a 0.
 */
const sumSourceColumns = (row: EnergyReportRow): Partial<Record<SourceToken, number>> => {
  const sums: Partial<Record<SourceToken, number>> = {};
  for (const column of Object.keys(row)) {
    if (column === 'time') continue;
    const v = row[column];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const token = findSourceForColumn(column);
    if (!token) continue;
    sums[token] = (sums[token] ?? 0) + v;
  }
  return sums;
};

/**
 * Per-source totals over the whole report (hero + source list). Always
 * returns all five sources in canonical order; `hasData` says which ones
 * actually reported.
 */
export const aggregateEnergy = (
  rows: EnergyReportRow[],
  mapping: ReportMapping | undefined | null,
): AggregatedSource[] => {
  const sums: Record<string, number> = {};
  const seen: Record<string, boolean> = {};
  const firstMatchedColumn: Record<string, string> = {};
  for (const s of AGG_SOURCES) sums[s.token] = 0;

  // Accumulated column by column across rows, in exactly the pre-v3 order,
  // so the floating-point totals are bit-identical to what shipped (and to
  // the web portal's sums). Do not regroup into per-row subtotals.
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (column === 'time') continue;
      const v = row[column];
      if (typeof v !== 'number' || !Number.isFinite(v)) continue;
      const token = findSourceForColumn(column);
      if (!token) continue;
      sums[token] += v;
      seen[token] = true;
      if (!firstMatchedColumn[token]) {
        firstMatchedColumn[token] = column;
      }
    }
  }

  const total = AGG_SOURCES.reduce((acc, s) => acc + sums[s.token], 0);

  return AGG_SOURCES.map(src => {
    const value = sums[src.token];
    const matchedColumn = firstMatchedColumn[src.token];
    return {
      token: src.token,
      label: matchedColumn
        ? resolveReportLabel(mapping, matchedColumn, src.fallbackLabel)
        : src.fallbackLabel,
      shortLabel: src.fallbackLabel,
      color: src.color,
      value,
      percentNum: total > 0 ? (value / total) * 100 : 0,
      hasData: seen[src.token] === true,
    };
  });
};

/**
 * Stacked energy-over-time data. Outage-honest:
 *  - EVERY row the API returned becomes a bucket (bar count = row count),
 *    including all-zero and all-null rows;
 *  - a source's bucket value is the sum of its finite columns, `null` when
 *    it had none (a gap, never a fake 0); real 0s and negatives (export /
 *    battery charge) are kept;
 *  - the series list is every source with at least one non-null value.
 */
export const buildStackData = (
  rows: EnergyReportRow[],
  pill: string,
): EnergyStackData => {
  const perRow = rows.map(sumSourceColumns);

  const series: EnergySeries[] = [];
  for (const src of AGG_SOURCES) {
    const values = perRow.map(sums => {
      const v = sums[src.token];
      return v === undefined ? null : v;
    });
    if (values.some(v => v !== null)) {
      series.push({ token: src.token, label: src.fallbackLabel, color: src.color, values });
    }
  }

  let zeroBuckets = 0;
  let maxStackAbs = 0;
  const buckets: EnergyBucket[] = rows.map((row, i) => {
    let total: number | null = null;
    let pos = 0;
    let neg = 0;
    for (const s of series) {
      const v = s.values[i];
      if (v === null) continue;
      total = (total ?? 0) + v;
      if (v >= 0) pos += v;
      else neg += v;
    }
    if (total === 0) zeroBuckets += 1;
    maxStackAbs = Math.max(maxStackAbs, pos, -neg);
    return {
      time: row.time,
      label: formatChartLabel(row.time, pill),
      header: formatBucketLabel(row.time, pill),
      total,
    };
  });

  return { buckets, series, zeroBuckets, maxStackAbs };
};
