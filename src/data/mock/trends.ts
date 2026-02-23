export interface TrendData {
  title: string;
  min: number;
  avg: number;
  max: number;
}

export const mockTrendsData: TrendData[] = [
  {
    title: 'Captive Plant kW',
    min: 0.0,
    avg: 579.74,
    max: 14784.25,
  },
  {
    title: 'Grid Active Power',
    min: 0.0,
    avg: 579.74,
    max: 14784.25,
  },
];
