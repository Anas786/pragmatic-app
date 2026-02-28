import { FC } from 'react';
import { FanIcon, GridIcon, SolarIcon } from 'src/assets/icons';
import { IconProps } from 'src/types';
import { ACCENT_BLUE, ACCENT_GREEN, ACCENT_RED } from 'src/utils/theme';

export interface PowerCardData {
  label: string;
  value: string;
  unit: string;
  iconName: FC<IconProps>;
  iconColor: string;
  accentColor: string;
}

export const mockCardsData: PowerCardData[] = [
  {
    label: 'Wind Generation - RealTime',
    value: '4,484.25',
    unit: 'kW',
    iconName: FanIcon,
    iconColor: ACCENT_BLUE,
    accentColor: ACCENT_BLUE,
  },
  {
    label: 'Wind Energy Today',
    value: '7,514.00',
    unit: 'kWh',
    iconName: FanIcon,
    iconColor: ACCENT_BLUE,
    accentColor: ACCENT_BLUE,
  },
  {
    label: 'PV-SG-CI-01',
    value: '16,124.80',
    unit: 'kWh',
    iconName: SolarIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'PV-SG-CI-05',
    value: '15,217.80',
    unit: 'kWh',
    iconName: SolarIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'PV-SG-CI-01',
    value: '16,124.80',
    unit: 'kWh',
    iconName: SolarIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'PV-SG-CI-05',
    value: '15,217.80',
    unit: 'kWh',
    iconName: SolarIcon,
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
  },
  {
    label: 'PV-SG-CI-01',
    value: '16,124.80',
    unit: 'kWh',
    iconName: GridIcon,
    iconColor: ACCENT_RED,
    accentColor: ACCENT_RED,
  },
  {
    label: 'PV-SG-CI-05',
    value: '15,217.80',
    unit: 'kWh',
    iconName: GridIcon,
    iconColor: ACCENT_RED,
    accentColor: ACCENT_RED,
  },
  {
    label: 'Wind Generation - RealTime',
    value: '4,484.25',
    unit: 'kW',
    iconName: FanIcon,
    iconColor: ACCENT_BLUE,
    accentColor: ACCENT_BLUE,
  },
  {
    label: 'Wind Energy Today',
    value: '7,514.00',
    unit: 'kWh',
    iconName: FanIcon,
    iconColor: ACCENT_BLUE,
    accentColor: ACCENT_BLUE,
  },
];
