import { ACCENT_BLUE, ACCENT_GREEN, ACCENT_RED } from 'src/utils/theme';

export interface ChartDataPoint {
  value: number;
  label?: string;
}

export interface TrendAnalysisSeriesConfig {
  year: string;
  color: string;
  data: ChartDataPoint[];
}

const labels = [
  '19 Dec',
  '20 Dec',
  '21 Dec',
  '22 Dec',
  '23 Dec',
  '24 Dec',
  '25 Dec',
  '26 Dec',
];

// 2021 - Green series
const data2021: ChartDataPoint[] = [
  { value: 70, label: labels[0] },
  { value: 65, label: labels[1] },
  { value: 68, label: labels[2] },
  { value: 90, label: labels[3] },
  { value: 65, label: labels[4] },
  { value: 55, label: labels[5] },
  { value: 62, label: labels[6] },
  { value: 65, label: labels[7] },
];

// 2022 - Red series
const data2022: ChartDataPoint[] = [
  { value: 15, label: labels[0] },
  { value: 38, label: labels[1] },
  { value: 42, label: labels[2] },
  { value: 70, label: labels[3] },
  { value: 68, label: labels[4] },
  { value: 50, label: labels[5] },
  { value: 35, label: labels[6] },
  { value: 85, label: labels[7] },
];

// 2023 - Blue series
const data2023: ChartDataPoint[] = [
  { value: 60, label: labels[0] },
  { value: 42, label: labels[1] },
  { value: 25, label: labels[2] },
  { value: 75, label: labels[3] },
  { value: 60, label: labels[4] },
  { value: 95, label: labels[5] },
  { value: 60, label: labels[6] },
  { value: 30, label: labels[7] },
];

export const trendAnalysisSeries: TrendAnalysisSeriesConfig[] = [
  { year: '2021', color: ACCENT_GREEN, data: data2021 },
  { year: '2022', color: ACCENT_RED, data: data2022 },
  { year: '2023', color: ACCENT_BLUE, data: data2023 },
];
