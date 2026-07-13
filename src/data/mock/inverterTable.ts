export type InverterFilterOption = 'Custom' | 'Month' | 'Year' | 'Life Time';

export interface InverterEntryData {
  title: string;
  production: string;
  yield: string;
  performanceRatio: number;
  uptimePercent: number;
}

export const inverterFilters: InverterFilterOption[] = [
  'Custom',
  'Month',
  'Year',
  'Life Time',
];
