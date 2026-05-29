export { niceCeiling, aggregateEnergy, buildStackData } from 'src/utils';
export type {
  AggregatedSource,
  StackBar,
  StackSegment,
} from 'src/utils/aggregations';

/** Compact number for the hero total (e.g. "1.23M", "58.4K", "850"). */
export const formatCompactLocal = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};
