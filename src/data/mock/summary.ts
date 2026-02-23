import { ACCENT_GREEN, ACCENT_RED } from 'src/utils/theme';

export interface MetricItem {
  label: string;
  value: string;
  unit?: string;
  iconName: string;
  iconColor: string;
  accentColor: string;
}

export const mockYieldMetrics: MetricItem[] = [
  {
    label: 'Total Plant Yeild',
    value: '106,104.46',
    unit: 'mWh',
    iconName: 'flash',
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'Revenue',
    value: '20,159,846.83',
    unit: 'USD',
    iconName: 'finance',
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
];

export const mockEnvironmentalMetrics: MetricItem[] = [
  {
    label: 'CO₂ Reduction',
    value: '22,529.16',
    unit: 'Tons',
    iconName: 'sprout',
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'Coal Saved',
    value: '50,865,032.12',
    unit: 'Tons',
    iconName: 'factory',
    iconColor: ACCENT_RED,
    accentColor: ACCENT_RED,
  },
  {
    label: 'Trees Planted',
    value: '120,573,246.59',
    unit: 'Nos.',
    iconName: 'sprout',
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
];
