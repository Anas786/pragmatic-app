import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  ACCENT_LIGHT_BLUE,
  ACCENT_RED,
  ACCENT_TEAL,
} from 'src/utils';

export interface PerformanceSliceData {
  label: string;
  value: number;
  displayValue: string;
  percentage: string;
  color: string;
}

export const performanceReportData: PerformanceSliceData[] = [
  {
    label: 'Genset Production (kWh)',
    value: 23424,
    displayValue: '23,424',
    percentage: '67%',
    color: ACCENT_RED,
  },
  {
    label: 'Solar Power Generation (kWh)',
    value: 15300,
    displayValue: '15,300',
    percentage: '45%',
    color: ACCENT_GREEN,
  },
  {
    label: 'Wind Turbine Output (kWh)',
    value: 12560,
    displayValue: '12,560',
    percentage: '38%',
    color: ACCENT_BLUE,
  },
  {
    label: 'Wind Turbine Output (kWh)',
    value: 12560,
    displayValue: '12,560',
    percentage: '38%',
    color: ACCENT_LIGHT_BLUE,
  },
  {
    label: 'Wind Turbine Output (kWh)',
    value: 12560,
    displayValue: '12,560',
    percentage: '38%',
    color: ACCENT_TEAL,
  },
];
