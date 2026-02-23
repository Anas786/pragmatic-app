import { ACCENT_BLUE, ACCENT_GREEN, ACCENT_ORANGE, ACCENT_RED } from 'src/utils/theme';

export interface AlarmCardData {
  priority: 'Priority' | 'Major' | 'Minor' | 'Warning';
  title: string;
  time: string;
  status: 'Solved' | 'Unsolved';
  statusTime: string;
  iconName: string;
  iconColor: string;
  accentColor: string;
  priorityColor: string;
  statusColor: string;
}

export const mockAlarmsData: AlarmCardData[] = [
  {
    priority: 'Priority',
    title: 'Wind Turbine 01',
    time: '10:15 AM',
    status: 'Solved',
    statusTime: 'At 12:15 PM',
    iconName: 'alert',
    iconColor: ACCENT_RED,
    accentColor: ACCENT_RED,
    priorityColor: ACCENT_RED,
    statusColor: ACCENT_GREEN,
  },
  {
    priority: 'Major',
    title: 'Solar 01',
    time: '11:15 AM',
    status: 'Unsolved',
    statusTime: 'ETA 2:15 PM',
    iconName: 'alert-circle',
    iconColor: ACCENT_ORANGE,
    accentColor: ACCENT_ORANGE,
    priorityColor: ACCENT_ORANGE,
    statusColor: ACCENT_RED,
  },
  {
    priority: 'Minor',
    title: 'Solar 02 Dusty',
    time: '11:15 AM',
    status: 'Solved',
    statusTime: 'At 12:15 PM',
    iconName: 'bell-outline',
    iconColor: ACCENT_GREEN,
    accentColor: ACCENT_GREEN,
    priorityColor: ACCENT_GREEN,
    statusColor: ACCENT_GREEN,
  },
  {
    priority: 'Warning',
    title: 'Solar Battery Weak',
    time: '11:39 AM',
    status: 'Unsolved',
    statusTime: 'ETA 1:05 PM',
    iconName: 'message-alert-outline',
    iconColor: ACCENT_BLUE,
    accentColor: ACCENT_BLUE,
    priorityColor: ACCENT_BLUE,
    statusColor: ACCENT_RED,
  },
];
