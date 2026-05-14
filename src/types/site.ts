/**
 * Per-site summary card shipped inline in the paginated site-list response.
 * Backend returns one card per energy source (Solar / Genset / Grid /
 * Battery / Wind). `value` is either a number or the literal string `"NA"`
 * when telemetry is unavailable.
 */
export interface ISiteCard {
  /** Hex string, e.g. "#00ff00". Used as the icon/value accent. */
  color: string;
  /** Backend icon key — resolved via {@link resolveLottieIcon}. */
  icon: string;
  /** Human-readable label, e.g. "Solar Energy Today". */
  name: string;
  /** Unit suffix, e.g. "kWh". */
  unit: string;
  /** Numeric reading, or `"NA"` when the source has no data. */
  value: number | string;
}

/**
 * Site as returned by GET /private/user/site-list (paginated v2).
 * Contract from openapi.yaml#/paths/private/user/site-list/get plus the
 * paginated extensions (`state`, `dataLastUpdate`, `cards`) that ship in
 * the "responseType": "paginated" payload.
 */
export interface ISite {
  id: string;
  name: string;
  /** Path to the site logo file relative to the assets bucket, e.g. "1/58/.png" */
  logo_ext: string;
  /** Size of the site in kW. Backend may return either a number or a numeric string. */
  size: number | string;
  /** True when the site has a controller installed. */
  controller: boolean;
  /** Realtime status string, e.g. "Online" / "Offline". Optional for backwards compat. */
  state?: string;
  /** Epoch milliseconds (as a string) of the last data update. */
  dataLastUpdate?: string;
  /** Per-source summary cards. Empty/missing when the backend has no data for the site. */
  cards?: ISiteCard[];
}

/**
 * Paginated envelope returned by /private/user/site-list. The legacy
 * bare-array response is treated as a one-page slice via
 * {@link normalizeSiteListResponse} on the networking side.
 */
export interface ISiteListPageMeta {
  source?: 'cache' | 'origin' | string;
  responseType?: 'paginated' | 'original' | string;
  total: number;
  page: number;
  pageSize: number;
}

export interface ISiteListResponse {
  metadata: ISiteListPageMeta;
  data: ISite[];
}

/**
 * Full live-data envelope returned by GET /protected/data/all/{id}.
 * Drives every tab on the SiteDetail screen (Summary, Cards, Alarms, Trend).
 *
 * Backend declares each branch as nullable — caller code must guard against
 * `null` and missing keys. Inner shapes are intentionally `unknown` until the
 * params-mapping config is consulted to resolve parameter codes.
 *
 * Spec: openapi.yaml#/paths/protected/data/all/{id}/get
 */
export interface ISiteAllData {
  /** Real-time telemetry, keyed by parameter code. */
  live: Record<string, unknown> | null;
  /** Processed / derived parameter values, keyed by code. */
  processed: Record<string, unknown> | null;
  /** Active alarms for the site. */
  alarms: Array<Record<string, unknown>> | null;
}

/**
 * Site-specific configuration returned by GET /protected/config/site/{id}.
 *
 * OpenAPI declares this as a generic object — the exact shape depends on
 * the site's controller and which integrations are enabled (devices,
 * inverters, parameter codes, weather sources, dashboard layout, etc.).
 * Treated as `Record<string, unknown>` until consumers narrow at the
 * point of use.
 *
 * Spec: openapi.yaml#/paths/protected/config/site/{id}/get
 */
export type ISiteConfig = Record<string, unknown>;
