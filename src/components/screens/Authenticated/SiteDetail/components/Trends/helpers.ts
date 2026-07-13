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
