/**
 * Icon glyph + icon-well colours of the SLD node cards (SummaryView/SLDCanvas).
 *
 * The cards used to draw the backend icon's GIF on a tint of the card's
 * accent. Those GIFs are fixed-colour artwork — the wind turbine is
 * near-white, solar / genset / tower are mostly navy — so on a pale
 * light-mode well (Lucky Cement's grouped "Wind · 6": a white turbine on pale
 * cyan) or a dark dark-mode well they all but vanished, and no artwork
 * colour can work on every well. Every card now draws a MaterialIcons glyph
 * in a THEME-AWARE ink, exactly like the Live tiles' IconWell:
 *
 *   - a node that classifies as an energy source with a palette token
 *     (`classifySldNode`: name tags first, the backend icon key only as a
 *     fallback — the same rule the grouping uses) → the source's
 *     `energyPalette` fill as the well tint and `scheme.energyInk[source]`
 *     as the glyph;
 *   - everything else — the plant hub, WHR (a source with no palette
 *     token), SVG / switch gear, buildings, anything unrecognised → a brand
 *     well + `scheme.brandText` glyph (colour = source; non-source = brand).
 *
 * The card's own accent (top bar, dark-mode wash, border, edges) still
 * comes from the backend's `icon.color`; only the well + glyph changed.
 * Every glyph/well pair is ≥ 3:1 (non-text) in both themes, enforced by
 * `__tests__/tokenContrast.test.ts`, which also checks that every glyph name
 * exists in the bundled MaterialIcons font.
 *
 * Pure TS: no React / React Native imports. Imported by path (not through
 * the `src/utils` barrel).
 */

import { SLDNode } from 'src/types';
import { ColorScheme, EnergySource, energyPalette } from 'src/theme/tokens';
import { isLogoNode } from './sld';
import { classifySldNode, SldEnergyType } from './sldGroup';

/** Well tint alpha (hex suffix) over the card surface, per theme. */
export const SLD_ICON_WELL_ALPHA = { light: '2E', dark: '24' } as const;

/** Glyph per classified energy type (MaterialIcons names). */
export const SLD_TYPE_GLYPH: Readonly<Record<SldEnergyType, string>> = {
  solar: 'solar-power',
  wind: 'wind-power',
  grid: 'electrical-services',
  genset: 'local-gas-station',
  battery: 'battery-charging-full',
  // Waste-heat recovery: a steam turbine fed by process exhaust heat.
  whr: 'local-fire-department',
};

/**
 * Glyph per backend icon key (see `src/assets/gif/lottie-icons.ts`) for
 * nodes that don't classify as an energy source.
 */
export const SLD_ICON_KEY_GLYPH: Readonly<Record<string, string>> = {
  industry: 'factory',
  busbar: 'factory',
  co2: 'factory',
  building: 'apartment',
  hospital: 'apartment',
  // "pixelarticons:switch" — switch gear, SVG (static var generator) …
  switchLg: 'swap-horiz',
  powerLg: 'power',
  export: 'upload',
  expectedGen: 'bolt',
  totalPlantYeild: 'bolt',
  performanceRatio: 'speed',
  curtailment: 'show-chart',
  alarms: 'notifications',
  warning: 'warning',
};

/** Glyph of a non-source node with an unmapped icon key. */
export const SLD_DEFAULT_GLYPH = 'bolt';
/** Glyph of the plant hub when its icon key is unmapped. */
export const SLD_HUB_GLYPH = 'factory';

/** Colour key of a well: a palette energy source, or the brand. */
export type SldIconAccentKey = EnergySource | 'brand';

export interface SldIconAccent {
  /** Well fill, alpha suffix included (`#RRGGBBAA`). */
  well: string;
  /** Glyph ink. */
  ink: string;
}

export interface SldNodeIcon extends SldIconAccent {
  /** MaterialIcons glyph name. */
  glyph: string;
  accent: SldIconAccentKey;
}

const PALETTE_SOURCES = Object.keys(energyPalette) as EnergySource[];

/** The energy type of a node as a palette key, or null (no palette token). */
const paletteSource = (type: SldEnergyType | null): EnergySource | null =>
  type && (PALETTE_SOURCES as string[]).includes(type) ? (type as EnergySource) : null;

/**
 * One accent table per scheme object (`useScheme()` returns two stable
 * singletons), built on first use — memoised cards get identity-stable
 * strings and nothing is allocated per render.
 */
const accentTables = new WeakMap<ColorScheme, Record<SldIconAccentKey, SldIconAccent>>();

export const sldIconAccents = (
  scheme: ColorScheme,
  isDark: boolean,
): Readonly<Record<SldIconAccentKey, SldIconAccent>> => {
  let table = accentTables.get(scheme);
  if (!table) {
    const alpha = isDark ? SLD_ICON_WELL_ALPHA.dark : SLD_ICON_WELL_ALPHA.light;
    const make = (fill: string, ink: string): SldIconAccent => ({ well: fill + alpha, ink });
    table = {
      solar: make(energyPalette.solar, scheme.energyInk.solar),
      wind: make(energyPalette.wind, scheme.energyInk.wind),
      grid: make(energyPalette.grid, scheme.energyInk.grid),
      genset: make(energyPalette.genset, scheme.energyInk.genset),
      battery: make(energyPalette.battery, scheme.energyInk.battery),
      brand: make(scheme.brand, scheme.brandText),
    };
    accentTables.set(scheme, table);
  }
  return table;
};

/**
 * Glyph + well of one SLD card. The plant hub (logo node) is never coloured
 * as a source: it is the plant the sources feed.
 */
export const sldNodeIcon = (
  node: SLDNode,
  scheme: ColorScheme,
  isDark: boolean,
): SldNodeIcon => {
  const iconKey = node.data.icon?.name ?? '';
  const keyGlyph = Object.prototype.hasOwnProperty.call(SLD_ICON_KEY_GLYPH, iconKey)
    ? SLD_ICON_KEY_GLYPH[iconKey]
    : null;
  const accents = sldIconAccents(scheme, isDark);
  if (isLogoNode(node)) {
    return { glyph: keyGlyph ?? SLD_HUB_GLYPH, accent: 'brand', ...accents.brand };
  }
  const type = classifySldNode(node);
  const accent: SldIconAccentKey = paletteSource(type) ?? 'brand';
  const glyph = type ? SLD_TYPE_GLYPH[type] : keyGlyph ?? SLD_DEFAULT_GLYPH;
  return { glyph, accent, ...accents[accent] };
};
