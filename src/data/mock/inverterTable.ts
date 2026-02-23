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

export const mockInverterData: InverterEntryData[] = [
  {
    title: 'Canteen, Pump Room (Inverter 9)',
    production: '241.56',
    yield: '2.20',
    performanceRatio: 86.56,
    uptimePercent: 61.56,
  },
  {
    title: 'Canteen, Pump Room (Inverter 9)',
    production: '241.56',
    yield: '2.20',
    performanceRatio: 86.56,
    uptimePercent: 61.56,
  },
];
