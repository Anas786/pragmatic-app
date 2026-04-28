import { FC } from 'react';
import {
  AlarmsTabIcon,
  AlertIcon,
  AlertIconCircle,
  BellIcon,
  BoltIcon,
  CalendarIcon,
  CardsTabIcon,
  ChartIcon,
  FanIcon,
  GridIcon,
  HomeIcon,
  InfoIcon,
  LockIcon,
  MapMarkerIcon,
  MessageAlertIcon,
  MoonIcon,
  PhoneIcon,
  ProfileIcon,
  RefreshIcon,
  RollercosterIcon,
  SolarIcon,
  SproutIcon,
  SummaryTabIcon,
  SunIcon,
  TrendTabIcon,
  WebIcon,
} from 'src/assets/icons';
import { IconProps } from 'src/types';

/**
 * Maps an icon identifier from the backend (e.g. `"solar"`, `"wind"`,
 * `"grid"`) to the actual SVG component imported from `src/assets/icons`.
 *
 * The lookup is case- and separator-insensitive: `"PV-Solar"`, `"pv solar"`,
 * `"pv_solar"` all resolve to the same key. Callers that pass an unknown
 * name fall back to `ChartIcon` rather than crashing — graceful degradation
 * for cards we don't yet have an icon for.
 */
const REGISTRY: Record<string, FC<IconProps>> = {
  // Energy / generation
  solar: SolarIcon,
  pv: SolarIcon,
  pvsize: SolarIcon,
  fan: FanIcon,
  wind: FanIcon,
  grid: GridIcon,
  bolt: BoltIcon,
  energy: BoltIcon,
  power: BoltIcon,
  chart: ChartIcon,

  // Environmental
  sprout: SproutIcon,
  tree: SproutIcon,
  co2: SproutIcon,

  // Generic / chrome
  home: HomeIcon,
  profile: ProfileIcon,
  info: InfoIcon,
  alert: AlertIcon,
  alertcircle: AlertIconCircle,
  bell: BellIcon,
  message: MessageAlertIcon,
  lock: LockIcon,
  refresh: RefreshIcon,
  calendar: CalendarIcon,
  map: MapMarkerIcon,
  phone: PhoneIcon,
  web: WebIcon,
  sun: SunIcon,
  moon: MoonIcon,
  rollercoster: RollercosterIcon,
  rollercoaster: RollercosterIcon,

  // Tab icons (in case the backend uses these)
  summary: SummaryTabIcon,
  cards: CardsTabIcon,
  alarms: AlarmsTabIcon,
  trend: TrendTabIcon,
};

const FALLBACK = ChartIcon;

/** Normalize keys to lowercase letters/digits only — strips spaces, dashes, underscores. */
const canonicalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const resolveIcon = (name: string | undefined | null): FC<IconProps> => {
  if (!name) return FALLBACK;
  return REGISTRY[canonicalize(name)] ?? FALLBACK;
};
