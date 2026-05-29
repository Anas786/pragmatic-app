import { ISiteAllData, ISiteConfig, TrendDataResponse } from 'src/types';
import { display, inspectError } from 'src/utils';
import { appAxios } from '../config';

/**
 * GET /protected/data/all/{siteId}
 *
 * Returns the full live-data envelope for a single site:
 *   { live, processed, alarms }
 *
 * Drives every tab on SiteDetail (Summary, Cards, Alarms, Trend).
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor via `getValidIdToken()`. 401s trigger a single
 * refresh-and-retry before the user is signed out.
 *
 * Spec: openapi.yaml#/paths/protected/data/all/{id}/get
 */
export const getSiteAllData = async (
  siteId: string,
): Promise<ISiteAllData> => {
  if (!siteId) throw new Error('getSiteAllData: siteId is required');
  try {
    const { data } = await appAxios.get<ISiteAllData>(
      `/protected/data/all/${encodeURIComponent(siteId)}`,
    );
    return {
      live: data?.live ?? null,
      processed: data?.processed ?? null,
      alarms: data?.alarms ?? null,
    };
  } catch (err) {
    display('site.getSiteAllData FAILED', inspectError(err));
    throw err;
  }
};

/**
 * GET /protected/config/site/{siteId}
 *
 * Site configuration — devices, inverters, parameter codes, dashboard
 * layout, etc. Used as input by every per-site API that follows.
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor. 401s trigger a single refresh-and-retry.
 *
 * Spec: openapi.yaml#/paths/protected/config/site/{id}/get
 */
export const getSiteConfig = async (
  siteId: string,
): Promise<ISiteConfig> => {
  if (!siteId) throw new Error('getSiteConfig: siteId is required');
  try {
    const { data } = await appAxios.get<ISiteConfig>(
      `/protected/config/site/${encodeURIComponent(siteId)}`,
    );
    return data ?? {};
  } catch (err) {
    display('site.getSiteConfig FAILED', inspectError(err));
    throw err;
  }
};

/* ─────────────── reports ─────────────── */

/**
 * Discriminated union describing the four time-filter shapes the
 * `/protected/data/v2/report/{id}` endpoint accepts. Each variant maps
 * 1:1 to a query-param combination per the spec.
 */
export type ReportFilter =
  | { kind: 'lifeTime' }
  | { kind: 'month'; month: number; year: number }
  | { kind: 'year'; year: number }
  | { kind: 'custom'; start: number; end: number };

/**
 * Convert a {@link ReportFilter} into the URL query params expected by
 * the report endpoint. `type` is always required; the rest depend on
 * the filter selection.
 */
const reportParamsFor = (
  type: 'inverter_queries' | 'energy_queries',
  filter: ReportFilter,
): Record<string, string> => {
  const params: Record<string, string> = { type };
  switch (filter.kind) {
    case 'month':
      params.month = String(filter.month);
      params.year = String(filter.year);
      break;
    case 'year':
      params.year = String(filter.year);
      break;
    case 'custom':
      params.start = String(filter.start);
      params.end = String(filter.end);
      break;
    case 'lifeTime':
    default:
      // No extra params — only `type` is sent.
      break;
  }
  return params;
};

/**
 * One row in the inverter report. Mirrors the backend payload as-is so
 * consumers can transform / format at their own layer (kWh → MWh,
 * percent rounding, etc.).
 */
export interface InverterReportRow {
  inverter_num: string;
  /** Energy yield in kWh for the requested period. */
  ed_solar: number;
  /** Performance Ratio (0–100). */
  pr: number;
  /** Uptime percentage (0–100). */
  up_percent: number;
  /** Specific yield (MWh/kWp or similar — backend-defined units). */
  yield: number;
}

export interface InverterReportResponse {
  metadata?: {
    responseType?: string;
    [key: string]: unknown;
  };
  data: InverterReportRow[];
}

/**
 * GET /protected/data/v2/report/{siteId}?type=inverter_queries&...
 *
 * Inverter-specific performance report. The query-param shape varies
 * with the active time filter:
 *   - Life Time → only `type=inverter_queries`
 *   - Month     → `month=<1-12>&year=<YYYY>`
 *   - Year      → `year=<YYYY>`
 *   - Custom    → `start=<epoch_ms>&end=<epoch_ms>`
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor.
 *
 * Spec: openapi.yaml#/paths/protected/data/v2/report/{id}/get
 */
export const getInverterReport = async (
  siteId: string,
  filter: ReportFilter,
): Promise<InverterReportResponse> => {
  if (!siteId) throw new Error('getInverterReport: siteId is required');
  try {
    const params = reportParamsFor('inverter_queries', filter);
    const { data } = await appAxios.get<InverterReportResponse>(
      `/protected/data/v2/report/${encodeURIComponent(siteId)}`,
      { params },
    );
    return {
      metadata: data?.metadata,
      data: Array.isArray(data?.data) ? data.data : [],
    };
  } catch (err) {
    display('site.getInverterReport FAILED', inspectError(err));
    throw err;
  }
};

/**
 * One row in the energy report — energy by source for a single time
 * bucket (typically one day). Backends may emit different prefixes for
 * the source columns (`ed_solar`, `et_solar`, `hi_solar`, …) so the
 * actual property names are dynamic — the aggregator matches them by
 * substring (`solar` / `wind` / `grid` / `genset` / `battery`) at
 * render time rather than relying on an exact field list here.
 *
 * Any source can be `null` for a given bucket (e.g. a site with no
 * battery storage always sends `null` for the battery column).
 *
 * Units: kWh.
 */
export interface EnergyReportRow {
  time: number;
  [key: string]: number | null;
}

export interface EnergyReportResponse {
  metadata?: {
    responseType?: string;
    [key: string]: unknown;
  };
  data: EnergyReportRow[];
}

/**
 * GET /protected/data/v2/report/{siteId}?type=energy_queries&...
 *
 * Time-series breakdown of energy production / import by source
 * (Solar, Wind, Grid, Genset). Same query-param shape as
 * `getInverterReport` — only `type` differs. Drives the Performance
 * Report pie chart by aggregating the rows.
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor.
 *
 * Spec: openapi.yaml#/paths/protected/data/v2/report/{id}/get
 */
export const getEnergyReport = async (
  siteId: string,
  filter: ReportFilter,
): Promise<EnergyReportResponse> => {
  if (!siteId) throw new Error('getEnergyReport: siteId is required');
  try {
    const params = reportParamsFor('energy_queries', filter);
    const { data } = await appAxios.get<EnergyReportResponse>(
      `/protected/data/v2/report/${encodeURIComponent(siteId)}`,
      { params },
    );
    return {
      metadata: data?.metadata,
      data: Array.isArray(data?.data) ? data.data : [],
    };
  } catch (err) {
    display('site.getEnergyReport FAILED', inspectError(err));
    throw err;
  }
};

/* ─────────────── trends ─────────────── */

/**
 * Time/range args for the trends data endpoint. `start`/`end` are
 * SQL-ish expressions (NOT epoch-ms like the report endpoints):
 *   - presets → `now() - INTERVAL 24 HOUR` … `end = now()`
 *   - custom  → quoted absolute literals `'YYYY-MM-DD HH:MM:SS'`
 * `tz` is an IANA zone (e.g. `Asia/Karachi`) so the backend buckets in
 * the device's local time.
 */
export interface TrendDataArgs {
  start: string;
  end: string;
  tz: string;
}

/**
 * GET /protected/data/v2/trends/{siteId}?idx&start&end&tz
 *
 * Time-series for one trend section. `idx` is the 0-based index into
 * `siteConfig.siteComponents.trends[]` (1:1 mapping). Each response row
 * is one time bucket keyed by `time` (unix-ms) plus one key per the
 * section's aggregation `param`s.
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor.
 */
export const getTrendData = async (
  siteId: string,
  idx: number,
  args: TrendDataArgs,
): Promise<TrendDataResponse> => {
  if (!siteId) throw new Error('getTrendData: siteId is required');
  try {
    const { data } = await appAxios.get<TrendDataResponse>(
      `/protected/data/v2/trends/${encodeURIComponent(siteId)}`,
      { params: { idx, start: args.start, end: args.end, tz: args.tz } },
    );
    return {
      metadata: data?.metadata,
      data: Array.isArray(data?.data) ? data.data : [],
    };
  } catch (err) {
    display('site.getTrendData FAILED', inspectError(err));
    throw err;
  }
};
