/**
 * Small shared bits for the trend charts. The charts themselves are now
 * echarts (react-native-echarts-pro); this file only holds the value
 * coercion used when packing series + the skeleton height.
 */

/** Skeleton placeholder height while a section's data is in flight. */
export const TREND_CHART_HEIGHT = 200;

/** Backend may ship numbers as strings or null → coerce to a finite number. */
export const coerceValue = (
  v: number | string | null | undefined,
): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
