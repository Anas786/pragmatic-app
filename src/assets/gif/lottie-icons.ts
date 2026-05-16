/**
 * Backend-driven icon map for site-config-driven cards (and any other
 * surface that needs to translate an `icon` string from
 * `siteConfig.siteComponents.cards[].icon` into a renderable GIF.
 *
 * Each entry has two fields:
 *   - `path`  : `require()`d local GIF asset, ready to drop into `<Image source={...} />`
 *   - `name`  : Iconify-style identifier kept here for parity with the
 *               web frontend so backend and mobile share the same key set.
 *               Mobile doesn't have a generic Iconify renderer, so we
 *               fall back to rendering the path image instead — `name`
 *               is informational / for a future native fallback.
 *
 * Keys are the exact strings the backend ships in `card.icon` — do not
 * rename them without coordinating with the web frontend.
 */

export interface LottieIcon {
  path: number; // RN's require() returns a numeric asset reference
  name: string;
}

export const lottiePathGif: Record<string, LottieIcon> = {
  wind: {
    path: require('./raw/wind.gif'),
    name: 'mdi:wind-turbine',
  },
  hospital: {
    path: require('./raw/hospital.gif'),
    name: 'tabler:building-hospital',
  },
  switchLg: {
    path: require('./raw/arrow.gif'),
    name: 'pixelarticons:switch',
  },
  solarLg: {
    path: require('./raw/solar.gif'),
    name: 'fa-solid:solar-panel',
  },
  industry: {
    path: require('./raw/factory.gif'),
    name: 'iconoir:industry',
  },
  towerLg: {
    path: require('./raw/tower.gif'),
    name: 'mdi:transmission-tower',
  },
  powerLg: {
    path: require('./raw/battery.gif'),
    name: 'arcticons:batterycalibration',
  },
  battery: {
    path: require('./raw/battery.gif'),
    name: 'icon-park-outline:car-battery',
  },
  export: {
    path: require('./raw/export.gif'),
    name: 'ph:export-bold',
  },
  alarms: {
    path: require('./raw/bell.gif'),
    name: 'iwwa:alarm',
  },
  warning: {
    path: require('./raw/warning.gif'),
    name: 'mdi:warning-outline',
  },
  solar: {
    path: require('./raw/solar.gif'),
    name: 'game-icons:solar-power',
  },
  genset: {
    path: require('./raw/dynamo.gif'),
    name: 'mdi:generator-portable',
  },
  gridImport: {
    path: require('./raw/tower.gif'),
    name: 'mdi:transmission-tower-export',
  },
  grid: {
    path: require('./raw/tower.gif'),
    name: 'mdi:transmission-tower-export',
  },
  expectedGen: {
    path: require('./raw/energy.gif'),
    name: 'mdi:generator-mobile',
  },
  performanceRatio: {
    path: require('./raw/meter.gif'),
    name: 'carbon:meter',
  },
  curtailment: {
    path: require('./raw/sine.gif'),
    name: 'streamline:interface-signal-graph-heart-line-beat-square-graph-stats',
  },
  setPoint: {
    path: require('./raw/map.gif'),
    name: 'solar:map-point-wave-broken',
  },
  co2: {
    path: require('./raw/factory.gif'),
    name: 'iconoir:industry',
  },
  coalSaved: {
    path: require('./raw/chart.gif'),
    name: 'oui:vis-builder-saved-object',
  },
  totalPlantYeild: {
    path: require('./raw/energy.gif'),
    name: 'solar:cpu-bolt-linear',
  },
  gridExport: {
    path: require('./raw/tower.gif'),
    name: 'mdi:transmission-tower-export',
  },
  revenue: {
    path: require('./raw/revenue.gif'),
    name: 'basil:bank-outline',
  },
};

/**
 * Lookup helper — returns the matching entry, or `null` when the backend
 * sends an icon name we haven't mapped yet. Callers should render a
 * placeholder / alternative when this returns null.
 */
export const resolveLottieIcon = (
  iconName: string | undefined | null,
): LottieIcon | null => {
  if (!iconName) return null;
  return lottiePathGif[iconName] ?? null;
};
