import { ICardConfig, ISiteAllData, ISiteConfig } from 'src/types';
import { tryNumber } from './parsers';
import { CardPeriod, periodFromCard, periodFromName } from './sources';
import {
  formatQuantity,
  FormattedQuantity,
  isRateUnit,
  unitFamily,
} from './units';

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
  const branch = (liveData as unknown as Record<string, unknown>)[
    card.dataStore
  ];
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
 * Render a value with the card's configured decimal places.
 *
 *  - Numbers are formatted with locale thousand separators at full precision.
 *  - Non-numeric values pass through as strings.
 *  - null / undefined / empty render as an em-dash.
 *
 * Full precision is the project default (CLAUDE.md §10/§14). For cramped
 * slots (hero values, chips) use `formatCompact` from `utils/sources.ts`
 * instead — this formatter never abbreviates.
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

/* ─────────── Cards-tab sections (what time window a tile covers) ─────────── */

/**
 * Which Cards-tab section a card belongs to:
 *
 *  - `now`      instantaneous power (W / VAr / VA, any prefix) whose name
 *               states no other window ('PV Total Power' kW, 'Wind' kW)
 *  - `today`    an accumulating unit (Wh / VArh / VAh) + a 'today' name
 *  - `period`   … + a week / month / year name ('Grid Energy YTD')
 *  - `lifetime` … + a lifetime name ('Total Plant Yield')
 *  - `energy`   … with no period in the name ('PV-SG-CI-01' kWh) — we
 *               don't know the window, so we don't claim one
 *  - `other`    everything else (W/m², °C, %, unitless, and power readings
 *               pinned to a window such as 'Peak Power Today' kW — a
 *               peak is neither the current power nor an energy total)
 */
export type CardBucket =
  | 'now'
  | 'today'
  | 'period'
  | 'lifetime'
  | 'energy'
  | 'other';

/** Display order of the Cards-tab sections. */
export const CARD_BUCKET_ORDER: readonly CardBucket[] = [
  'now',
  'today',
  'period',
  'lifetime',
  'energy',
  'other',
];

/** Minimal card shape the bucketing needs (an `ICardConfig` satisfies it). */
export interface CardNameUnit {
  name: string;
  unit?: string | null;
}

/** Wh / VArh / VAh with any prefix — a counter that accumulates over time. */
const isAccumulatingUnit = (unit?: string | null): boolean =>
  unitFamily(unit) !== 'other' && !isRateUnit(unit);

/**
 * Section bucket for a card — from the NAME's period wording first
 * (`periodFromCard`: 'today' / 'week' / 'month' / 'year' / 'lifetime'),
 * then the unit. Presentation only: it never changes a card's value.
 */
export const cardBucket = (card: CardNameUnit): CardBucket => {
  const period = periodFromCard(card.name, card.unit);
  if (isRateUnit(card.unit)) {
    // periodFromCard returns 'now' for a rate unit only when the name
    // pins no window of its own.
    return period === 'now' ? 'now' : 'other';
  }
  if (!isAccumulatingUnit(card.unit)) return 'other';
  switch (period) {
    case 'today':
      return 'today';
    case 'week':
    case 'month':
    case 'year':
      return 'period';
    case 'lifetime':
      return 'lifetime';
    default:
      return 'energy';
  }
};

const PERIOD_SECTION_TITLE: Partial<Record<CardPeriod, string>> = {
  week: 'Energy this week',
  month: 'Energy this month',
  year: 'Energy this year',
};

/**
 * Sentence-case section heading for a bucket. The `period` bucket names
 * its window only when EVERY card in it states the same one ('Energy this
 * year' for a set of YTD counters); a mix reads 'Energy this period'.
 */
export const cardBucketTitle = (
  bucket: CardBucket,
  cards: readonly CardNameUnit[] = [],
): string => {
  switch (bucket) {
    case 'now':
      return 'Power now';
    case 'today':
      return 'Energy today';
    case 'period': {
      const periods = new Set(cards.map(c => periodFromName(c.name)));
      if (periods.size === 1) {
        const [only] = periods;
        const title = only ? PERIOD_SECTION_TITLE[only] : undefined;
        if (title) return title;
      }
      return 'Energy this period';
    }
    case 'lifetime':
      return 'Energy lifetime';
    case 'energy':
      return 'Energy';
    case 'other':
    default:
      return 'Other metrics';
  }
};

export interface CardSection<T> {
  bucket: CardBucket;
  title: string;
  items: T[];
  /**
   * Position of this section's first item in the whole tab, so entrance
   * animation caps (ANIM_LIMIT) count across sections, not per section.
   */
  startIndex: number;
}

/**
 * Group items into ordered, non-empty Cards-tab sections. Item order
 * within a section follows the backend's card order.
 */
export const groupCardSections = <T>(
  items: readonly T[],
  cardOf: (item: T) => CardNameUnit,
): CardSection<T>[] => {
  const byBucket = new Map<CardBucket, T[]>();
  for (const item of items) {
    const bucket = cardBucket(cardOf(item));
    const list = byBucket.get(bucket);
    if (list) list.push(item);
    else byBucket.set(bucket, [item]);
  }
  const sections: CardSection<T>[] = [];
  let startIndex = 0;
  for (const bucket of CARD_BUCKET_ORDER) {
    const list = byBucket.get(bucket);
    if (!list || list.length === 0) continue;
    sections.push({
      bucket,
      title: cardBucketTitle(bucket, list.map(cardOf)),
      items: list,
      startIndex,
    });
    startIndex += list.length;
  }
  return sections;
};

/**
 * Tile label for a backend card name, in its ORIGINAL case. Strips only
 * words the context already says: a ' - RealTime' tag (every tile is a
 * current reading), and a trailing 'Today' inside the 'Energy today'
 * section. Never truncates — the tile wraps to two lines instead. Falls
 * back to the full name when stripping would leave nothing.
 */
export const cardTileLabel = (name: string, bucket: CardBucket): string => {
  let label = name.replace(/\s*[-–—]\s*real[\s-]?time\b/i, '');
  if (bucket === 'today') {
    label = label.replace(/[\s\-–—·:(]*\btoday\b\)?\s*$/i, '');
  }
  label = label.trim();
  return label.length > 0 ? label : name.trim();
};

/** Backend placeholders for "no reading" — shown as 'No data', never as text. */
const MISSING_WORDS = /^(na|n\/a|nan|null|undefined|none|-+|—)$/i;

/**
 * A Cards-tab value as displayed: `formatQuantity` precise, 2 decimals,
 * in the backend's own unit (`rescale: false`) so every tile reads exactly
 * like the web portal ('147,786.00 kWh', '14,463.03 kW'). Non-numeric
 * backend TEXT (a status such as 'Running') is shown verbatim without a
 * unit; 'NA' / null / '' are missing ('No data'). The value itself is
 * never altered.
 */
export const formatCardDisplay = (
  raw: unknown,
  unit?: string | null,
): FormattedQuantity => {
  const q = formatQuantity(raw, unit, {
    mode: 'precise',
    decimals: 2,
    rescale: false,
  });
  if (!q.isMissing) return q;
  const text =
    typeof raw === 'string'
      ? raw.trim()
      : typeof raw === 'boolean'
      ? String(raw)
      : '';
  if (text === '' || MISSING_WORDS.test(text)) return q;
  return { text, unit: '', spoken: text, isMissing: false, value: null };
};
