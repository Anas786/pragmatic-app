import { energyPalette } from 'src/theme';

export { niceCeiling, aggregateEnergy, buildStackData } from 'src/utils';
export type { AggregatedSource, StackBar, StackSegment } from 'src/utils/aggregations';

export const PIE_RADIUS = 110;
export const PIE_INNER_RADIUS = 80;
export const FOCUSED_PIE_EXTRA_RADIUS = 8;
export const BAR_CHART_HEIGHT = 220;
export const BAR_CHART_SECTIONS = 4;
export const BAR_AVAILABLE_WIDTH = 280;
export const BAR_MIN_WIDTH = 16;
export const BAR_MAX_WIDTH = 56;
export const BAR_MIN_SPACING = 8;
export const MIN_BAR_ZOOM = 1;
export const MAX_BAR_ZOOM = 3;
export const BAR_ZOOM_STEP = 0.5;

export interface SourceConfig {
  token: string;
  fallbackLabel: string;
  color: string;
}

export const SOURCES: SourceConfig[] = [
  { token: 'solar', fallbackLabel: 'Solar', color: energyPalette.solar },
  { token: 'wind', fallbackLabel: 'Wind', color: energyPalette.wind },
  { token: 'grid', fallbackLabel: 'Grid', color: energyPalette.grid },
  { token: 'genset', fallbackLabel: 'Genset', color: energyPalette.genset },
  { token: 'battery', fallbackLabel: 'Battery', color: energyPalette.battery },
];

export const formatCompactLocal = (n: number): string => {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
};

export const formatYAxis = (raw: string): string => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};
