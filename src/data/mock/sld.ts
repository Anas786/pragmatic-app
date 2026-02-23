import { ACCENT_BLUE, ACCENT_GREEN, ACCENT_RED } from 'src/utils/theme';

export interface SLDMetric {
  label: string;
  value: string;
  unit?: string;
}

export type SLDLineStyle = 'animated' | 'solid';

export interface SLDSourceNode {
  id: string;
  title: string;
  iconName: string;
  iconColor: string;
  lineColor: string;
  lineStyle: SLDLineStyle;
  metrics: SLDMetric[];
}

export interface SLDCenterNode {
  title: string;
  loadValue: string;
  iconName: string;
}

export const sldSources: SLDSourceNode[] = [
  {
    id: 'dg',
    title: "DG'S",
    iconName: 'engine',
    iconColor: ACCENT_RED,
    lineColor: ACCENT_RED,
    lineStyle: 'solid',
    metrics: [
      { label: 'P', value: '0.00', unit: 'kW' },
      { label: 'Q', value: '0.00', unit: 'kVar' },
      { label: 'PF', value: '1.00' },
    ],
  },
  {
    id: 'grid',
    title: 'NATIONAL GRID',
    iconName: 'transmission-tower',
    iconColor: '#00BCD4',
    lineColor: '#00BCD4',
    lineStyle: 'animated',
    metrics: [
      { label: 'P', value: '219.30', unit: 'kW' },
      { label: 'Q', value: '30.55', unit: 'kVar' },
      { label: 'PF', value: '0.99' },
    ],
  },
  {
    id: 'solar',
    title: 'SOLAR',
    iconName: 'solar-panel-large',
    iconColor: ACCENT_GREEN,
    lineColor: ACCENT_GREEN,
    lineStyle: 'solid',
    metrics: [
      { label: 'P', value: '0.00', unit: 'kW' },
      { label: 'Q', value: '0.00', unit: 'kVar' },
      { label: 'PF', value: '1.00' },
    ],
  },
  {
    id: 'bess',
    title: 'BESS',
    iconName: 'battery-charging',
    iconColor: ACCENT_BLUE,
    lineColor: ACCENT_BLUE,
    lineStyle: 'animated',
    metrics: [
      { label: 'P', value: '-1.20' },
      { label: 'Q', value: '0.16' },
      { label: 'SOC', value: '99.00' },
    ],
  },
];

export const sldCenter: SLDCenterNode = {
  title: 'Total load',
  loadValue: '218.10',
  iconName: 'factory',
};
