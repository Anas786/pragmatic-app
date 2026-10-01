/**
 * Trends helpers — period → SQL-range translation, config selection,
 * aggregation type-splitting, readable x-axis labels, and the section
 * header copy (absolute-window caption, non-redundant subHeading, spoken
 * period names).
 *
 * The trends data endpoint takes SQL-ish `start`/`end` expressions and
 * an IANA `tz`, NOT the epoch-ms params the report endpoints use — so
 * this lives separate from `reports.ts`.
 */

import {
  ParamsMapping,
  TrendAggregation,
  TrendAggType,
  TrendConfig,
} from 'src/types';
import { formatDateRange, MONTHS_SHORT } from './dates';
import { buildSiteParamNames } from './liveParams';
import { endOfDayMs, startOfDayMs } from './reports';

/* ─────────────── period pills ─────────────── */

export type TrendPeriod = '24H' | '48H' | '72H' | 'Custom';

export const TREND_PERIODS: TrendPeriod[] = ['24H', '48H', '72H', 'Custom'];
export const DEFAULT_TREND_PERIOD: TrendPeriod = '24H';

/**
 * Custom range is capped at 3 calendar days (inclusive) — much tighter
 * than the report cap (`REPORT_CUSTOM_MAX_DAYS`, 31 days). The trends
 * endpoint returns fine-grained rows, so even a few days is a heavy
 * query and a dense chart next to the 24H/48H/72H presets beside it.
 */
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

/* ─────────────── header copy ─────────────── */

/**
 * Spoken / long name of each period pill. The pills show the short form
 * ('24H'); screen readers and the header caption use this one.
 */
export const TREND_PERIOD_SPOKEN: Record<TrendPeriod, string> = {
  '24H': 'Last 24 hours',
  '48H': 'Last 48 hours',
  '72H': 'Last 72 hours',
  Custom: 'Custom range',
};

/**
 * Screen-reader label of a period pill — always contains the visible text.
 * 'Custom' says what a tap does: it always opens the range picker (also
 * when it's already the active period — that's how a range is edited),
 * and there's no date pill in a trend header to do it instead.
 */
export const trendPeriodPillA11yLabel = (period: TrendPeriod): string =>
  period === 'Custom'
    ? `${TREND_PERIOD_SPOKEN.Custom}, opens date picker`
    : `${period}, ${TREND_PERIOD_SPOKEN[period].toLowerCase()}`;

export interface TrendWindowLabel {
  /** Visible caption: '30 Sep 14:35 – 1 Oct 14:35' / '29 Sep – 1 Oct 2026'. */
  text: string;
  /** Spoken form: 'Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35'. */
  spoken: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** '30 Sep 14:35' (+ ' 2025' after the month when `withYear`). Device-local
 *  time, 24-hour — the same clock the chart's x-axis labels use. */
const formatTrendStamp = (ms: number, withYear: boolean): string => {
  const d = new Date(ms);
  const day = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return `${withYear ? `${day} ${d.getFullYear()}` : day} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * The absolute window the active period covers — the Trends section's
 * header caption (the pills already name the period, so the caption says
 * WHICH hours).
 *
 *  - presets  → the rolling window ending at `anchorMs`, the moment the
 *    backend evaluated `now()` (the query's `dataUpdatedAt`, or the time
 *    the pill was tapped while that fetch is in flight):
 *    '30 Sep 14:35 – 1 Oct 14:35'. Years are added to BOTH ends when the
 *    window crosses a year or isn't in `now`'s year.
 *  - Custom   → the picked calendar days via `formatDateRange`
 *    ('29 Sep – 1 Oct 2026'); DD/MM/YY is not used anywhere.
 */
export const formatTrendWindowLabel = (
  period: TrendPeriod,
  startDate: Date,
  endDate: Date,
  anchorMs: number,
  now: number = Date.now(),
): TrendWindowLabel => {
  if (period === 'Custom') {
    const text = formatDateRange(startDate, endDate);
    return {
      text,
      spoken: `${TREND_PERIOD_SPOKEN.Custom}, ${text.replace(' – ', ' to ')}`,
    };
  }
  const endMs = anchorMs;
  const startMs = endMs - PRESET_HOURS[period] * 60 * 60 * 1000;
  const startYear = new Date(startMs).getFullYear();
  const endYear = new Date(endMs).getFullYear();
  const withYear = startYear !== endYear || endYear !== new Date(now).getFullYear();
  const a = formatTrendStamp(startMs, withYear);
  const b = formatTrendStamp(endMs, withYear);
  return { text: `${a} – ${b}`, spoken: `${TREND_PERIOD_SPOKEN[period]}, ${a} to ${b}` };
};

/**
 * Letters/digits kept when comparing headings: ASCII, accented Latin,
 * Greek, Cyrillic, Arabic/Urdu, kana and CJK. Everything else (spaces,
 * punctuation, dashes, symbols) separates words. Explicit ranges rather
 * than `\p{L}` so it behaves the same on every Hermes build.
 */
const NON_WORD =
  /[^a-z0-9\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u04FF\u0600-\u06FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+/g;

/** Lower-case, punctuation → single spaces (keeps accented letters). */
const normalizeHeadingText = (s: string): string =>
  s.toLowerCase().replace(NON_WORD, ' ').trim();

/**
 * The section caption under a trend heading: the config's `subHeading`,
 * but only when it adds information. After normalising case and
 * punctuation it must be neither equal to the heading nor contained in it
 * as whole words ('Power' under 'Power Trend' is dropped; 'Active power
 * of all inverters' under 'Power' is kept). Returns `undefined` to omit.
 */
export const trendCaption = (
  heading: string,
  subHeading?: string | null,
): string | undefined => {
  if (typeof subHeading !== 'string') return undefined;
  const sub = normalizeHeadingText(subHeading);
  if (sub === '') return undefined;
  const head = normalizeHeadingText(heading);
  if (sub === head || ` ${head} `.includes(` ${sub} `)) return undefined;
  return subHeading.trim();
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

/**
 * Human label for a param code from `/public/config/params-mapping`
 * (`"p10436"` → `"SVG 4 Active Power"`). The dict is typed
 * `Record<string, string | unknown>`, so guard at runtime.
 */
const mappedParamLabel = (
  mapping: ParamsMapping | null | undefined,
  param: string,
): string | null => {
  const label = mapping?.[param];
  return typeof label === 'string' && label.trim().length > 0 ? label : null;
};

const normalizeAggregation = (
  raw: unknown,
  mapping: ParamsMapping | null | undefined,
  siteNames: Record<string, string>,
): TrendAggregation | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const param = typeof o.param === 'string' ? o.param : null;
  const type = typeof o.type === 'string' ? o.type.toLowerCase() : null;
  if (!param || !type || !VALID_TYPES.has(type)) return null;

  // Series label priority: an explicit, MEANINGFUL config `display` (some
  // configs fill it with the raw p-code — treat that as absent) → the
  // site's own name for the param (`globalParams.live`, e.g. p1000005 →
  // 'Captive Plant kW'; the global params-mapping only knows it as
  // 'Custom Parameter 5', and the web portal shows the site name) → the
  // params-mapping label → the raw code as a last resort. Same order as the
  // Live tab (resolveLiveParamName). Legends, series names and tooltips all
  // render this value.
  const explicitDisplay =
    typeof o.display === 'string' &&
    o.display.trim().length > 0 &&
    o.display.trim() !== param
      ? o.display
      : null;
  const display =
    explicitDisplay ??
    siteNames[param] ??
    mappedParamLabel(mapping, param) ??
    param;

  return {
    param,
    type: type as TrendAggType,
    color: typeof o.color === 'string' ? o.color : '#9CA3AF',
    display,
  };
};

const normalizeTrend = (
  raw: unknown,
  mapping: ParamsMapping | null | undefined,
  siteNames: Record<string, string>,
): TrendConfig | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const payload =
    o.payload && typeof o.payload === 'object'
      ? (o.payload as Record<string, unknown>)
      : {};
  const rawAggs = Array.isArray(payload.aggregations) ? payload.aggregations : [];
  const aggregations = rawAggs
    .map(a => normalizeAggregation(a, mapping, siteNames))
    .filter((a): a is TrendAggregation => a !== null);
  if (aggregations.length === 0) return null;
  return {
    // Untitled section: named after its tab ("Analysis", like the web).
    heading: typeof o.heading === 'string' ? o.heading : 'Analysis',
    subHeading: typeof o.subHeading === 'string' ? o.subHeading : undefined,
    unit: typeof payload.unit === 'string' ? payload.unit : undefined,
    aggregations,
  };
};

/**
 * A normalized trend section plus its position in the ORIGINAL
 * `siteComponents.trends[]` array. The data endpoint's `idx` param is
 * defined against that raw array (1:1), so when a malformed sibling is
 * dropped the surviving sections must keep their original index —
 * otherwise every later section silently fetches the wrong data.
 */
export interface IndexedTrendConfig extends TrendConfig {
  /** 0-based index into the raw config array — use as the endpoint `idx`. */
  sourceIdx: number;
}

/**
 * Safely read + normalize `siteConfig.siteComponents.trends[]` down to
 * the whitelisted shape. Drops any malformed entry while preserving each
 * survivor's original array index as `sourceIdx`. Returns [] when the
 * config is missing or the wrong shape.
 *
 * `mapping` is the `/public/config/params-mapping` dict (from
 * `useParamsMapping()`). When the trend config carries no meaningful
 * `display`, a series label resolves through the site's own param names
 * (`config.globalParams.live`) first, then through `mapping`.
 */
export const selectTrends = (
  config: unknown,
  mapping?: ParamsMapping | null,
): IndexedTrendConfig[] => {
  if (!config || typeof config !== 'object') return [];
  const components = (config as Record<string, unknown>).siteComponents;
  if (!components || typeof components !== 'object') return [];
  const trends = (components as Record<string, unknown>).trends;
  if (!Array.isArray(trends)) return [];
  const siteNames = buildSiteParamNames(config);
  return trends
    .map((raw, sourceIdx): IndexedTrendConfig | null => {
      const trend = normalizeTrend(raw, mapping, siteNames);
      return trend ? { ...trend, sourceIdx } : null;
    })
    .filter((t): t is IndexedTrendConfig => t !== null);
};
