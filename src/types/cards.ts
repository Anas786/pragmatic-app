/**
 * One card entry from `siteConfig.siteComponents.cards`.
 *
 * Field names are kept loose because the backend mixes case styles
 * (e.g. `colour` British spelling, `decimalPlaces` vs `decimal_places`
 * vs `"decimal places"`). Normalization happens in
 * `src/utils/cards.ts#normalizeCardConfig`.
 */
export interface ICardConfig {
  /** Display label, e.g. "Wind Generation - RealTime" */
  name: string;
  /** Unit suffix, e.g. "kW" / "kWh" */
  unit?: string;
  /** Accent + icon colour, hex or CSS-named. */
  colour?: string;
  /** Icon identifier resolved against the icon registry. */
  icon?: string;
  /** How many decimal places to render. Defaults to 2 when missing. */
  decimalPlaces?: number;
  /**
   * Which branch of the live-data response to pull from.
   * Either "live" or "processed" — see openapi.yaml#/paths/protected/data/all/{id}.
   */
  dataStore: 'live' | 'processed' | string;
  /** Key inside the chosen branch — e.g. "p40", "p16". */
  objKey: string;
}
