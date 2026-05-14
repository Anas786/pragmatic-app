/**
 * Backend parameter-mapping configuration.
 *
 * Returned as a flat dictionary keyed by backend parameter code (e.g.
 * `p10436`) where each value is the UI display name as a plain string:
 *
 *   { "p10436": "SVG 4 Active Power", "p2156": "Inverter 17 DC ...", ... }
 *
 * Consumers should still narrow defensively at the point of use — the
 * OpenAPI spec leaves the shape open ("Parameter mapping configuration"),
 * so the contract could grow into per-key objects in the future.
 */
export type ParamsMapping = Record<string, string | unknown>;

/**
 * Hierarchical structure of parameters (parent / child relationships).
 * Same caveat as ParamsMapping.
 */
export type ParamsHierarchy = Record<string, unknown>;

/**
 * Alarm code → human label mapping returned by /public/config/alarms.
 */
export type AlarmsMapping = Record<string, unknown>;

/**
 * Report metadata mapping returned by /public/config/report-mapping.
 */
export type ReportMapping = Record<string, unknown>;
