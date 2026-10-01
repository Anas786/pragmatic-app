/**
 * Dashboard SiteCard view-model — a PURE function of one site-list row, so
 * the card's layout, its screen-reader label and the unit tests all read
 * the same decisions.
 *
 * Web-portal parity (orchestrator rule O5): every number on the card is a
 * backend site-list `cards[]` value shown as-is (formatting only). The card
 * never sums, derives or re-labels a value:
 *   - no fleet/site total and no share-% text,
 *   - a label is the backend card name, shortened to its source word
 *     ('Solar' for 'Solar Energy Today') only when every other word in the
 *     name is generic (energy / power / period wording) and no other card
 *     on the site shortens to the same word — 'Grid Export Today' and
 *     'Solar Irradiance' keep their names (`legendLabel`),
 *   - a period caption ('Today') appears only when the backend NAME says
 *     so (`periodFromName`), never inferred from the unit.
 * The PowerMixBar is a picture of those same values side by side, drawn
 * only when they are directly comparable (same quantity, same period).
 */
import type { ISite } from 'src/types';
import {
  numericCardValue,
  PERIOD_LABEL,
  periodFromCard,
  periodFromName,
  shortSourceLabel,
  SOURCE_ORDER,
  sourceTokenFromName,
  type CardPeriod,
  type SourceToken,
} from 'src/utils/sources';
import {
  formatQuantity,
  normalizeUnit,
  splitLabelUnit,
  unitFamily,
  type FormattedQuantity,
} from 'src/utils/units';

/** Legend items shown before the '+N more' toggle takes the last slot. */
export const LEGEND_COLLAPSED_LIMIT = 4;
/** Metrics read out in the collapsed card's screen-reader label. */
export const SPOKEN_METRIC_LIMIT = 3;

export interface SiteCardMetric {
  /** Stable React key (backend index + name). */
  key: string;
  /** Backend card name, verbatim (trimmed). */
  name: string;
  /** Visible label: the source word, or the full backend name. */
  label: string;
  /** Energy source the NAME resolves to (dot colour); undefined = neutral. */
  source: SourceToken | undefined;
  /** Period the backend NAME states ('Grid Energy Today' → 'today'). */
  period: CardPeriod | undefined;
  /** Period shown after this item's label — set only when the card can't
   *  state one shared period for every item (see `sharedPeriod`) and the
   *  label doesn't already say it. */
  periodSuffix: CardPeriod | undefined;
  /** Compact value + unit ('63.2' 'MWh'); '—' with no unit when missing. */
  quantity: FormattedQuantity;
  /** Drawn as a PowerMixBar segment. */
  inMix: boolean;
  /** Screen-reader phrase: 'Solar 63.2 megawatt hours today'. */
  spoken: string;
}

export interface SiteCardMixSegment {
  key: string;
  source: SourceToken;
  /** Value in the family's base unit (Wh / W) — bar proportions only. */
  weight: number;
}

export interface SiteCardModel {
  /** Ordered: SOURCE_ORDER first, then non-source cards in backend order. */
  metrics: SiteCardMetric[];
  /** Bar segments, or null when the values aren't directly comparable. */
  mix: SiteCardMixSegment[] | null;
  /** The one period EVERY metric's name states (shown once), if any. */
  sharedPeriod: CardPeriod | undefined;
  /** Site capacity ('30 MW'); only meaningful when `showCapacity`. */
  capacity: FormattedQuantity;
  showCapacity: boolean;
  /** Numeric capacity in kW for navigation params (null when unparsable). */
  capacityKw: number | null;
  controller: boolean;
}

/* ─────────── unit scale ─────────── */

const PREFIX_FACTOR: Record<string, number> = {
  '': 1,
  k: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};
const SCALABLE_UNIT = /^([kMGT]?)(VArh|VAh|VAr|VA|Wh|W)$/;

/** Multiplier from `unit` to its family's base unit (kWh → 1000), or null
 *  for units that can't be put on one scale with others. */
const baseFactor = (unit: string | null | undefined): number | null => {
  const m = SCALABLE_UNIT.exec(normalizeUnit(unit));
  return m ? PREFIX_FACTOR[m[1]] : null;
};

/* ─────────── labels ─────────── */

/** Name words that ARE a source, and the source they name. */
const SOURCE_WORD: Record<string, SourceToken> = {
  solar: 'solar',
  pv: 'solar',
  wind: 'wind',
  grid: 'grid',
  genset: 'genset',
  dg: 'genset',
  battery: 'battery',
  bess: 'battery',
};

/**
 * Words that don't change WHAT a source card measures: the unit beside the
 * value already says energy vs power, and the period is captioned on its
 * own. Anything else — 'Export', 'Import', 'Discharge', 'Irradiance',
 * 'SOC', 'PV1' — is meaning the short label would drop.
 */
const GENERIC_WORDS = new Set([
  // quantity
  'energy',
  'power',
  'generation',
  'generated',
  'production',
  'produced',
  'output',
  'yield',
  'total',
  // period / freshness
  'realtime',
  'live',
  'now',
  'this',
  'today',
  'daily',
  'day',
  'tdy',
  'week',
  'weekly',
  'wtd',
  'month',
  'monthly',
  'mtd',
  'year',
  'yearly',
  'annual',
  'ytd',
  'lifetime',
  'cumulative',
]);

/**
 * True when `name` says nothing beyond its source and generic wording, so
 * the bare source word is a faithful label ('Wind Generation - RealTime',
 * 'PV Total Power', 'Genset Energy Today'). Every source word in it must
 * name the same `source`.
 */
const isPlainSourceName = (name: string, source: SourceToken): boolean => {
  const words = name
    .toLowerCase()
    .replace(/real[\s-]*time/g, 'realtime')
    .replace(/life[\s-]*time/g, 'lifetime')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 0);
  let named = false;
  for (const w of words) {
    const token = SOURCE_WORD[w];
    if (token !== undefined) {
      if (token !== source) return false;
      named = true;
    } else if (!GENERIC_WORDS.has(w)) {
      return false;
    }
  }
  return named;
};

/**
 * Legend label before the per-card dedupe: the source word for a plain
 * source name, otherwise the backend name (a trailing recognised '(kWh)'
 * dropped — the value already shows its unit).
 */
export const legendLabel = (name: string, source: SourceToken | undefined): string => {
  const base = splitLabelUnit(name).label;
  return source !== undefined && base && isPlainSourceName(base, source)
    ? shortSourceLabel(base)
    : base;
};

/* ─────────── builder ─────────── */

interface Draft {
  index: number;
  name: string;
  unit: string;
  value: number | null;
  source: SourceToken | undefined;
  period: CardPeriod | undefined;
  quantity: FormattedQuantity;
}

const orderIndex = (source: SourceToken | undefined): number =>
  source === undefined ? SOURCE_ORDER.length : SOURCE_ORDER.indexOf(source);

const allEqual = <T,>(xs: T[]): boolean => xs.every(x => x === xs[0]);

/**
 * Which drafts form the mix bar: the source cards that carry a value,
 * when they all measure the same quantity (all energy or all power, on a
 * known W/Wh scale) over the same period. Mixed units or periods → no
 * bar (null). Zero and negative values (e.g. grid export) stay in the
 * legend but get no segment; with nothing positive there is no bar.
 */
const buildMix = (drafts: Draft[]): Set<number> | null => {
  const candidates = drafts.filter(d => d.source !== undefined && d.value !== null);
  if (candidates.length === 0) return null;

  const families = candidates.map(d => unitFamily(d.unit));
  if (!allEqual(families)) return null;
  if (families[0] !== 'energy' && families[0] !== 'power') return null;
  if (candidates.some(d => baseFactor(d.unit) === null)) return null;

  const periods = candidates.map(d => periodFromCard(d.name, d.unit));
  if (!allEqual(periods)) return null;

  const positive = candidates.filter(d => (d.value as number) > 0);
  if (positive.length === 0) return null;
  return new Set(positive.map(d => d.index));
};

const periodWord = (period: CardPeriod | undefined): string =>
  period ? PERIOD_LABEL[period].toLowerCase() : '';

const spokenMetric = (label: string, q: FormattedQuantity, period: CardPeriod | undefined): string =>
  [label, q.isMissing ? 'no data' : q.spoken, q.isMissing ? '' : periodWord(period)]
    .filter(part => part.length > 0)
    .join(' ');

/** Build the view-model for one site-list row. Pure; memoise on `site`. */
export const buildSiteCardModel = (site: ISite): SiteCardModel => {
  const cards = Array.isArray(site.cards) ? site.cards : [];

  const drafts: Draft[] = cards.map((card, index) => {
    const name = (card?.name ?? '').trim();
    const unit = card?.unit ?? '';
    return {
      index,
      name,
      unit,
      value: numericCardValue(card?.value),
      source: name ? sourceTokenFromName(name) : undefined,
      period: name ? periodFromName(name) : undefined,
      quantity: formatQuantity(card?.value, unit, { mode: 'compact' }),
    };
  });

  // Fixed order: known sources in SOURCE_ORDER, then everything else in
  // backend order (Array#sort is stable, so ties keep backend order).
  const ordered = [...drafts].sort((a, b) => orderIndex(a.source) - orderIndex(b.source));

  // A source word is only a faithful label when it's unique on this card
  // ('Solar Energy Today' + 'PV Energy Today' must not both read 'Solar').
  const shortLabels = ordered.map(d => legendLabel(d.name, d.source));
  const labelCount = new Map<string, number>();
  shortLabels.forEach(l => labelCount.set(l.toLowerCase(), (labelCount.get(l.toLowerCase()) ?? 0) + 1));

  const periods = ordered.map(d => d.period);
  const sharedPeriod =
    ordered.length > 0 && periods[0] !== undefined && allEqual(periods) ? periods[0] : undefined;

  const mixSet = buildMix(drafts);

  const metrics: SiteCardMetric[] = ordered.map((d, i) => {
    const short = shortLabels[i];
    const label =
      (labelCount.get(short.toLowerCase()) ?? 0) > 1 ? splitLabelUnit(d.name).label : short;
    const visibleLabel = label || 'Unnamed metric';
    // A full backend name already states its period ('Grid Export Today') —
    // don't repeat it as 'Grid Export Today · Today' / '… kilowatt hours today'.
    const labelSaysPeriod = d.period !== undefined && periodFromName(visibleLabel) === d.period;
    return {
      key: `${d.index}:${d.name}`,
      name: d.name,
      label: visibleLabel,
      source: d.source,
      period: d.period,
      periodSuffix: sharedPeriod === undefined && !labelSaysPeriod ? d.period : undefined,
      quantity: d.quantity,
      inMix: mixSet?.has(d.index) ?? false,
      spoken: spokenMetric(visibleLabel, d.quantity, labelSaysPeriod ? undefined : d.period),
    };
  });

  const mix: SiteCardMixSegment[] | null = mixSet
    ? ordered
        .filter(d => mixSet.has(d.index))
        .map(d => {
          const factor = baseFactor(d.unit) as number;
          const weight = (d.value as number) * factor;
          return { key: `${d.index}:${d.name}`, source: d.source as SourceToken, weight };
        })
    : null;

  const capacity = formatQuantity(site.size, 'kW', { mode: 'compact' });
  const capacityKw = numericCardValue(site.size);

  return {
    metrics,
    mix,
    sharedPeriod,
    capacity,
    showCapacity: capacityKw !== null && capacityKw > 0,
    capacityKw,
    controller: site.controller === true,
  };
};

/* ─────────── collapse / expand ─────────── */

/** The legend items on screen: everything when it fits (≤ 4) or the card
 *  is expanded; otherwise the first 3 plus a '+N more' toggle. */
export const visibleMetrics = (
  model: SiteCardModel,
  expanded: boolean,
): { visible: SiteCardMetric[]; hiddenCount: number } => {
  const total = model.metrics.length;
  if (expanded || total <= LEGEND_COLLAPSED_LIMIT) {
    return { visible: model.metrics, hiddenCount: 0 };
  }
  const shown = LEGEND_COLLAPSED_LIMIT - 1;
  return { visible: model.metrics.slice(0, shown), hiddenCount: total - shown };
};

/** Label of the expand/collapse toggle (visual + custom a11y action), or
 *  null when every metric already fits. */
export const toggleMetricsLabel = (model: SiteCardModel, expanded: boolean): string | null => {
  if (model.metrics.length <= LEGEND_COLLAPSED_LIMIT) return null;
  return expanded ? 'Show fewer metrics' : `Show all ${model.metrics.length} metrics`;
};

/** Capacity as visible text ('30 MW'), or undefined when not shown. */
export const capacityText = (model: SiteCardModel): string | undefined =>
  model.showCapacity
    ? [model.capacity.text, model.capacity.unit].filter(Boolean).join(' ')
    : undefined;

const capitalise = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * The card's single screen-reader label:
 *   'CCI FGF. Live, updated 3 minutes ago. Capacity 2.5 megawatts,
 *    controller installed. Solar 15.6 megawatt hours today, Genset 0
 *    kilowatt hours today, Grid no data, and 2 more'
 * Collapsed cards read the first 3 metrics plus 'and N more'; expanded
 * cards read them all. `statusSpoken` comes from `siteStatus().spoken`.
 */
export const siteCardA11yLabel = (
  siteName: string,
  statusSpoken: string,
  model: SiteCardModel,
  expanded: boolean,
): string => {
  const sentences: string[] = [siteName.trim(), statusSpoken.trim()];

  const facts: string[] = [];
  if (model.showCapacity) facts.push(`capacity ${model.capacity.spoken}`);
  if (model.controller) facts.push('controller installed');
  if (facts.length > 0) sentences.push(capitalise(facts.join(', ')));

  const total = model.metrics.length;
  if (total === 0) {
    sentences.push('No summary metrics');
  } else {
    const read = expanded ? model.metrics : model.metrics.slice(0, SPOKEN_METRIC_LIMIT);
    const phrases = read.map(m => m.spoken);
    const rest = total - read.length;
    if (rest > 0) phrases.push(`and ${rest} more`);
    sentences.push(phrases.join(', '));
  }

  return sentences.filter(s => s.length > 0).join('. ');
};
