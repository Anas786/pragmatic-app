/**
 * Backend parameter-mapping configuration.
 *
 * Returned as a generic JSON object — the OpenAPI spec for
 * GET /public/config/params-mapping declares no specific schema, only
 * "Parameter mapping configuration". Until we have a concrete contract
 * we treat values as `unknown` and rely on consumers to narrow at the
 * point of use.
 *
 * Observed shape (subject to change): a flat dictionary keyed by
 * backend parameter codes, where each value is an object describing the
 * UI-friendly metadata (display name, units, data type, etc.).
 */
export type ParamsMapping = Record<string, unknown>;

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
