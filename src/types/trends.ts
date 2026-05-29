/**
 * Trends tab — config + data contract.
 *
 * Config comes from `siteConfig.siteComponents.trends[]` (one entry per
 * chart section). Per the agreed whitelist, ONLY these fields are read:
 *   - heading, subHeading
 *   - payload.unit              (optional — x-axis granularity hint)
 *   - payload.aggregations[].{ color, param, display, type }
 * Everything else the backend may ship (id, dataStore, poll, method,
 * chartType, interval, …) is intentionally ignored.
 *
 * Data comes from `/protected/data/v2/trends/{siteId}?idx&start&end&tz`
 * as `{ metadata, data: [{ time: <unix ms>, <param>: number|null }] }`.
 * Each row is one time bucket; keys after `time` match each
 * aggregation's `param`.
 */

/** A single series render type. `column` and `bar` are treated identically. */
export type TrendAggType = 'line' | 'area' | 'column' | 'bar';

export interface TrendAggregation {
  color: string;
  param: string;
  display: string;
  type: TrendAggType;
}

/** One trend section — normalized down to the whitelisted fields. */
export interface TrendConfig {
  heading: string;
  subHeading?: string;
  /** Optional unit hint (`payload.unit`). */
  unit?: string;
  aggregations: TrendAggregation[];
}

/** One time bucket. `time` is unix-ms; every other key is a param value. */
export interface TrendDataRow {
  time: number;
  [param: string]: number | null;
}

export interface TrendDataResponse {
  metadata?: Record<string, unknown>;
  data: TrendDataRow[];
}
