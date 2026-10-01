/**
 * Small shared bits for the trend charts. The charts themselves are now
 * echarts (react-native-echarts-pro); this file only holds the value
 * coercion used when packing series + the skeleton height.
 */

/** Skeleton placeholder height while a section's data is in flight. */
export const TREND_CHART_HEIGHT = 200;

/**
 * Backend may ship numbers as strings, and a time bucket with no sample
 * (sensor offline, param not applicable) is `null`. Missing data stays
 * `null` — echarts renders a line gap / absent bar and the tooltip shows
 * "–" — instead of a fake dip to 0 that's indistinguishable from real
 * zero production. Non-numeric garbage also maps to `null`.
 */
export const coerceValue = (
  v: number | string | null | undefined,
): number | null => {
  if (v == null) return null;
  // Number('') === 0 — an empty/blank string is missing data, not zero.
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Any |value| at or beyond this magnitude is physically impossible for a
 * trend metric in ANY unit the backend ships: even a 1 GW plant only
 * generates ~2.4e7 kWh/day, many orders of magnitude below this ceiling.
 * The backend/sensor pipeline occasionally emits garbage this large (a
 * ~4e31 "Wind Energy Day" reading was reported) which, on a shared
 * y-axis, silently flattens every other series to an invisible sliver.
 * Chosen far above any real reading so there are no false positives.
 */
export const IMPOSSIBLE_READING_CEILING = 1e15;

/**
 * `coerceValue`, plus the physically-impossible-reading guard above.
 * Only a value that WAS a real finite number but exceeds the ceiling is
 * reported as `invalid` (and mapped to `null`, i.e. a chart gap, same as
 * ordinary missing data) — a value that was already missing/non-numeric
 * is not double-counted. Callers tally `invalid` across a series/section
 * and disclose the count to the user (never drop it silently).
 */
export const coerceChartValue = (
  v: number | string | null | undefined,
): { value: number | null; invalid: boolean } => {
  const n = coerceValue(v);
  if (n !== null && Math.abs(n) >= IMPOSSIBLE_READING_CEILING) {
    return { value: null, invalid: true };
  }
  return { value: n, invalid: false };
};

/** "1 invalid reading hidden" / "N invalid readings hidden" — the
 *  disclosure caption for points `coerceChartValue` dropped. */
export const formatInvalidReadingsCaption = (count: number): string =>
  `${count} invalid reading${count === 1 ? '' : 's'} hidden`;
