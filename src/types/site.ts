/**
 * Site as returned by GET /private/user/site-list.
 * Contract from openapi.yaml#/paths/private/user/site-list/get.
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
