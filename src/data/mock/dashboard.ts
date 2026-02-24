export interface SiteCardData {
  name: string;
  timestamp: string;
  efficiency: number;
  metrics: Array<{ label: string; value: string; unit: string; icon: string }>;
}

export const mockSitesData: SiteCardData[] = [
  {
    name: 'Lucky Cement Nooribad',
    timestamp: '17/12/2025, 07:49 PM',
    efficiency: 86.56,
    metrics: [
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'Wind', value: '3.2345', unit: 'kWp', icon: 'weather-windy' },
      { label: 'Grid', value: '4,553.2', unit: 'kWp', icon: 'flash' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'PV Size', value: '18,235', unit: 'kW', icon: 'chart-bar' },
      { label: 'PV Size', value: '18,235', unit: 'kW', icon: 'chart-bar' },
      { label: 'Wind', value: '3.2345', unit: 'kWp', icon: 'weather-windy' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
    ],
  },
  {
    name: 'Master Molty Foam',
    timestamp: '17/12/2025, 07:49 PM',
    efficiency: 86.56,
    metrics: [
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'PV Size', value: '18,235', unit: 'kW', icon: 'chart-bar' },
      { label: 'PV Size', value: '18,235', unit: 'kW', icon: 'chart-bar' },
      { label: 'Wind', value: '3.2345', unit: 'kWp', icon: 'weather-windy' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
    ],
  },
  {
    name: 'Young Food Pvt.',
    timestamp: '17/12/2025, 07:49 PM',
    efficiency: 86.56,
    metrics: [
      { label: 'PV Size', value: '18,235', unit: 'kW', icon: 'chart-bar' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
      { label: 'Solar', value: '3.2345', unit: 'kWp', icon: 'white-balance-sunny' },
    ],
  },
];
