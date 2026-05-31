/**
 * Trends helpers — period → SQL-range translation, config selection,
 * aggregation type-splitting, and readable x-axis labels.
 *
 * The trends data endpoint takes SQL-ish `start`/`end` expressions and
 * an IANA `tz`, NOT the epoch-ms params the report endpoints use — so
 * this lives separate from `reports.ts`.
 */

import { TrendAggregation, TrendAggType, TrendConfig } from 'src/types';
import { endOfDayMs, startOfDayMs } from './reports';

/* ─────────────── period pills ─────────────── */

export type TrendPeriod = '24H' | '48H' | '72H' | 'Custom';

export const TREND_PERIODS: TrendPeriod[] = ['24H', '48H', '72H', 'Custom'];
export const DEFAULT_TREND_PERIOD: TrendPeriod = '24H';

/** Custom range is capped at 3 calendar days (inclusive). */
export const TREND_CUSTOM_MAX_DAYS = 3;
/** Extra days after the start day the date picker allows (cap − 1). */
export const TREND_CUSTOM_MAX_RANGE = TREND_CUSTOM_MAX_DAYS - 1;

export interface TrendRange {
  start: string;
  end: string;
}

/** Hours covered by each preset — also drives label granularity. */
const PRESET_HOURS: Record<Exclude<TrendPeriod, 'Custom'>, number> = {
  '24H': 24,
  '48H': 48,
  '72H': 72,
};

/**
 * Translate a period selection into the `{ start, end }` values the
 * trends endpoint expects.
 *   - presets → relative SQL expressions `now() - INTERVAL N HOUR` … `now()`
 *   - custom  → absolute epoch-ms (same as the report endpoints),
 *     day-clamped: start 00:00:00.000, end 23:59:59.999
 */
export const buildTrendRange = (
  period: TrendPeriod,
  startDate: Date,
  endDate: Date,
): TrendRange => {
  if (period === 'Custom') {
    return {
      start: String(startOfDayMs(startDate)),
      end: String(endOfDayMs(endDate)),
    };
  }
  return {
    start: `now() - INTERVAL ${PRESET_HOURS[period]} HOUR`,
    end: 'now()',
  };
};

/** Window span in ms — used to decide x-axis label granularity. */
export const trendWindowMs = (
  period: TrendPeriod,
  startDate: Date,
  endDate: Date,
): number => {
  if (period === 'Custom') {
    return Math.max(0, endOfDayMs(endDate) - startOfDayMs(startDate));
  }
  return PRESET_HOURS[period] * 60 * 60 * 1000;
};

/** Device IANA time zone, with a safe UTC fallback. */
export const getDeviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/* ─────────────── x-axis labels ─────────────── */

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Readable x-axis label. Single-day windows (24H) show `HH:mm`;
 * multi-day windows (48H/72H/custom) prefix the day so repeated times
 * stay distinguishable → `DD HH:mm`. Returns '' for non-finite input.
 */
export const formatTrendLabel = (epochMs: number, windowMs: number): string => {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  const time = `${p(d.getHours())}:${p(d.getMinutes())}`;
  if (windowMs <= ONE_DAY_MS) return time;
  return `${p(d.getDate())} ${time}`;
};

/** Header pill label for the active period. */
export const formatTrendPeriodLabel = (
  period: TrendPeriod,
  startDate: Date,
  endDate: Date,
): string => {
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
  };
  switch (period) {
    case '24H':
      return 'Last 24 hours';
    case '48H':
      return 'Last 48 hours';
    case '72H':
      return 'Last 72 hours';
    case 'Custom':
    default:
      return `${fmt(startDate)} - ${fmt(endDate)}`;
  }
};

/* ─────────────── aggregation helpers ─────────────── */

/** `bar` ≡ `column`; anything else (`line`/`area`) is a line-family series. */
export const isBarType = (t: TrendAggType): boolean =>
  t === 'bar' || t === 'column';

/* ─────────────── config selection ─────────────── */

const VALID_TYPES: ReadonlySet<string> = new Set([
  'line',
  'area',
  'column',
  'bar',
]);

const normalizeAggregation = (raw: unknown): TrendAggregation | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const param = typeof o.param === 'string' ? o.param : null;
  const type = typeof o.type === 'string' ? o.type.toLowerCase() : null;
  if (!param || !type || !VALID_TYPES.has(type)) return null;
  return {
    param,
    type: type as TrendAggType,
    color: typeof o.color === 'string' ? o.color : '#9CA3AF',
    display: typeof o.display === 'string' ? o.display : param,
  };
};

const normalizeTrend = (raw: unknown): TrendConfig | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const payload =
    o.payload && typeof o.payload === 'object'
      ? (o.payload as Record<string, unknown>)
      : {};
  const rawAggs = Array.isArray(payload.aggregations) ? payload.aggregations : [];
  const aggregations = rawAggs
    .map(normalizeAggregation)
    .filter((a): a is TrendAggregation => a !== null);
  if (aggregations.length === 0) return null;
  return {
    heading: typeof o.heading === 'string' ? o.heading : 'Trend',
    subHeading: typeof o.subHeading === 'string' ? o.subHeading : undefined,
    unit: typeof payload.unit === 'string' ? payload.unit : undefined,
    aggregations,
  };
};

/**
 * Safely read + normalize `siteConfig.siteComponents.trends[]` down to
 * the whitelisted shape. Drops any malformed entry. Returns [] when the
 * config is missing or the wrong shape.
 */
export const selectTrends = (config: unknown): TrendConfig[] => {
  if (!config || typeof config !== 'object') return [];
  const components = (config as Record<string, unknown>).siteComponents;
  if (!components || typeof components !== 'object') return [];
  const trends = (components as Record<string, unknown>).trends;
  if (!Array.isArray(trends)) return [];
  return trends
    .map(normalizeTrend)
    .filter((t): t is TrendConfig => t !== null);
};
