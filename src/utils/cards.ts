import { ICardConfig, ISiteAllData, ISiteConfig } from 'src/types';

/**
 * Card config + live-data resolver pipeline.
 *
 * Site config returns: siteConfig.siteComponents.cards = [
 *   { name, unit, colour, icon, decimalPlaces, dataStore, objKey, ... }, ...
 * ]
 *
 * Live data has two branches at the top — `live` and `processed` — each
 * wrapping a nested `data` envelope:
 *
 *   {
 *     live:      { data: { live: { p10390: { value, update_at }, ... } } },
 *     processed: { data: { processed: { ed_genset: 109792.0, ... } } },
 *     alarms:    [...]
 *   }
 *
 * The path rule is **per-dataStore**:
 *
 *   dataStore="processed"
 *     → liveData.processed.data.processed.<objKey-segments>
 *     The inner [processed] wrapper is implicit and added by the resolver;
 *     `objKey` is just the leaf path inside that wrapper. Example:
 *       objKey="ed_genset"
 *         → liveData.processed.data.processed.ed_genset = 109792.0
 *
 *   dataStore="live"
 *     → liveData.live.data.<objKey-segments>
 *     `objKey` is expected to include the inner branch as its first
 *     segment. Example:
 *       objKey="live.p10390.value"
 *         → liveData.live.data.live.p10390.value = 20115.07
 */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Try to coerce a value to a finite number; returns undefined otherwise. */
const tryNumber = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/**
 * Pull a single card config out of the raw `cards` array entry. Tolerates
 * spelling variants (`decimal_places`, `"decimal places"`, `decimalPlaces`)
 * and both `colour` / `color`.
 */
export const normalizeCardConfig = (raw: unknown): ICardConfig | null => {
  if (!isObject(raw)) return null;
  const dataStore = raw.dataStore;
  const objKey = raw.objKey;
  if (typeof dataStore !== 'string' || typeof objKey !== 'string') return null;

  const decimalPlaces =
    tryNumber(raw.decimalPlaces) ??
    tryNumber(raw.decimal_places) ??
    tryNumber((raw as Record<string, unknown>)['decimal places']);

  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    unit: typeof raw.unit === 'string' ? raw.unit : undefined,
    colour:
      typeof raw.colour === 'string'
        ? raw.colour
        : typeof raw.color === 'string'
          ? raw.color
          : undefined,
    icon: typeof raw.icon === 'string' ? raw.icon : undefined,
    decimalPlaces,
    dataStore,
    objKey,
  };
};

/**
 * Pull and normalize the cards array out of the site-config response.
 * Returns [] when the path is missing — keeps the screen safe under
 * partial / staged backend rollouts.
 */
export const extractCardConfigs = (
  siteConfig: ISiteConfig | undefined | null,
): ICardConfig[] => {
  if (!isObject(siteConfig)) return [];
  const components = (siteConfig as Record<string, unknown>).siteComponents;
  if (!isObject(components)) return [];
  const rawCards = components.cards;
  if (!Array.isArray(rawCards)) return [];
  return rawCards
    .map(normalizeCardConfig)
    .filter((c): c is ICardConfig => c !== null);
};

/** Walk a dotted segment list down an object/array tree. Returns
 * `undefined` the moment a segment lands on a non-traversable value
 * (primitive, null, missing key). */
const walkSegments = (start: unknown, segments: string[]): unknown => {
  let cursor = start;
  for (const segment of segments) {
    if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

/**
 * Resolves a card's value out of the live-data response.
 *
 * Branch rules (see file-level docblock):
 *  - dataStore === "processed" → liveData.processed.data.processed.<segments>
 *  - dataStore === "live"      → liveData.live.data.<segments>
 *
 * Any other dataStore falls back to a flat walk under `data` so unknown
 * branches at least don't crash the screen.
 *
 * Returns `undefined` when the path doesn't exist. Explicit `null` / `0` /
 * `""` values from the backend pass through unchanged so the formatter
 * can render them appropriately.
 */
export const resolveCardValue = (
  card: ICardConfig,
  liveData: ISiteAllData | undefined | null,
): unknown => {
  if (!liveData) return undefined;
  const branch = (liveData as unknown as Record<string, unknown>)[card.dataStore];
  if (!isObject(branch)) return undefined;
  const dataEnvelope = branch.data;
  if (dataEnvelope === null || typeof dataEnvelope !== 'object') {
    return undefined;
  }

  const segments = card.objKey.split('.').filter(s => s.length > 0);
  if (segments.length === 0) return undefined;

  if (card.dataStore === 'processed') {
    // liveData.processed.data.processed.<segments>
    // The inner [processed] wrapper is implicit; objKey is just the leaf
    // path inside that wrapper.
    const inner = (dataEnvelope as Record<string, unknown>).processed;
    if (inner === null || typeof inner !== 'object') return undefined;
    return walkSegments(inner, segments);
  }

  if (card.dataStore === 'live') {
    // liveData.live.data.<segments>
    // objKey is expected to include the inner branch as its first segment
    // (e.g. "live.p10390.value").
    return walkSegments(dataEnvelope, segments);
  }

  // Unknown dataStore — best-effort flat walk.
  return walkSegments(dataEnvelope, segments);
};

/**
 * Render a value with the card's configured decimal places. Numbers get
 * locale-formatted thousand separators; non-numeric values pass through
 * as strings; null / undefined / empty render as an em-dash.
 */
export const formatCardValue = (
  raw: unknown,
  decimalPlaces: number | undefined,
): string => {
  if (raw === null || raw === undefined || raw === '') return '—';
  const num = tryNumber(raw);
  if (num !== undefined) {
    const dp =
      typeof decimalPlaces === 'number' && decimalPlaces >= 0
        ? decimalPlaces
        : 2;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: dp,
      maximumFractionDigits: dp,
    });
  }
  return String(raw);
};
