/**
 * Dashboard SiteCard view-model — a PURE function of one site-list row, so
 * the card's layout, its screen-reader label and the unit tests all read
 * the same decisions.
 *
 * Layout (the restored pre-v3 design): ONE hero metric in a source-tinted
 * tile — the card's largest value — and the rest as satellite chips (3
 * visible, a toggle for more when there are more than 3).
 *
 * Web-portal parity (orchestrator rule O5): every number on the card is a
 * backend site-list `cards[]` value shown as-is (formatting only). The card
 * never sums, derives or re-labels a value:
 *   - no fleet/site total and no share-% text,
 *   - the hero is CHOSEN by size (compared in base units, so 2 MWh beats
 *     500 kWh) but shows its own value — choosing is not deriving,
 *   - a label is the backend card name, shortened to its source word
 *     ('Solar' for 'Solar Energy Today') only when every other word in the
 *     name is generic (energy / power / period wording) and no other card
 *     on the site shortens to the same word — 'Grid Export Today' and
 *     'Solar Irradiance' keep their names (`legendLabel`),
 *   - a period caption ('Today') appears only when the backend NAME says
 *     so (`periodFromName`), never inferred from the unit.
 */
import type { ISite } from 'src/types';
import {
  numericCardValue,
  PERIOD_LABEL,
  periodFromName,
  resolveCardColor,
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
  type FormattedQuantity,
} from 'src/utils/units';

/** Satellite chips shown before the 'Show all' toggle appears. */
export const COLLAPSED_SATELLITES = 3;
/** Metrics read out in the collapsed card's screen-reader label. */
export const SPOKEN_METRIC_LIMIT = 3;

export interface SiteCardMetric {
  /** Stable React key (backend index + name). */
  key: string;
  /** Backend card name, verbatim (trimmed). */
  name: string;
  /** Visible label: the source word, or the full backend name. */
  label: string;
  /** True when `label` is the bare source word ('Solar') — app vocabulary,
   *  so it may be shown upper-cased. Full backend names keep their case. */
  sourceWord: boolean;
  /** Energy source the NAME resolves to; undefined = neutral. */
  source: SourceToken | undefined;
  /** Fill colour for the dot / hero tint: the energy palette for a source,
   *  else the backend's own 6-digit colour, else a neutral slate. Always
   *  `#RRGGBB`, so callers may alpha-suffix it. Never used as text ink. */
  accent: string;
  /** Period the backend NAME states ('Grid Energy Today' → 'today'). */
  period: CardPeriod | undefined;
  /** Period to show beside the label — the name's period unless the
   *  visible label already says it ('Grid Export Today'). */
  periodCaption: CardPeriod | undefined;
  /** Period a SATELLITE shows after its label: only when the card has no
   *  one shared period (see `sharedPeriod`); undefined otherwise. */
  periodSuffix: CardPeriod | undefined;
  /** Compact value + unit ('63.2' 'MWh'); '—' with no unit when missing. */
  quantity: FormattedQuantity;
  /** Screen-reader phrase: 'Solar 63.2 megawatt hours today'. */
  spoken: string;
}

export interface SiteCardModel {
  /** Every metric in reading order: the hero first, then the satellites. */
  metrics: SiteCardMetric[];
  /** The hero tile's metric (largest value); null when the site has none. */
  hero: SiteCardMetric | null;
  /** The chips: SOURCE_ORDER first, then non-source cards in backend order. */
  satellites: SiteCardMetric[];
  /** The one period EVERY metric's name states, if any. */
  sharedPeriod: CardPeriod | undefined;
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
 *  for units that have no prefix scale (%, V, W/m²…). */
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
 * Label before the per-card dedupe: the source word for a plain source
 * name, otherwise the backend name (a trailing recognised '(kWh)' dropped —
 * the value already shows its unit).
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
  accent: string;
  period: CardPeriod | undefined;
  quantity: FormattedQuantity;
}

const orderIndex = (source: SourceToken | undefined): number =>
  source === undefined ? SOURCE_ORDER.length : SOURCE_ORDER.indexOf(source);

const allEqual = <T,>(xs: T[]): boolean => xs.every(x => x === xs[0]);

/**
 * Index (into `ordered`) of the hero: the largest numeric value, compared
 * in base units (W / Wh …) so a 2 MWh card beats a 500 kWh one; a unit
 * with no prefix scale compares as-is. Ties keep the earlier card (source
 * order). With no numeric value at all, the first card.
 */
const pickHero = (ordered: Draft[]): number => {
  let best = 0;
  let bestSize = -Infinity;
  ordered.forEach((d, i) => {
    if (d.value === null) return;
    const size = d.value * (baseFactor(d.unit) ?? 1);
    if (size > bestSize) {
      best = i;
      bestSize = size;
    }
  });
  return best;
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
      accent: resolveCardColor({ name, color: card?.color }),
      period: name ? periodFromName(name) : undefined,
      quantity: formatQuantity(card?.value, unit, { mode: 'compact', name }),
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

  const metrics: SiteCardMetric[] = ordered.map((d, i) => {
    const short = shortLabels[i];
    const deduped =
      (labelCount.get(short.toLowerCase()) ?? 0) > 1 ? splitLabelUnit(d.name).label : short;
    const label = deduped || 'Unnamed metric';
    // A full backend name already states its period ('Grid Export Today') —
    // don't repeat it as 'Grid Export Today · Today' / '… kilowatt hours today'.
    const labelSaysPeriod = d.period !== undefined && periodFromName(label) === d.period;
    const periodCaption = labelSaysPeriod ? undefined : d.period;
    return {
      key: `${d.index}:${d.name}`,
      name: d.name,
      label,
      sourceWord: d.source !== undefined && label === shortSourceLabel(label),
      source: d.source,
      accent: d.accent,
      period: d.period,
      periodCaption,
      periodSuffix: sharedPeriod === undefined ? periodCaption : undefined,
      quantity: d.quantity,
      spoken: spokenMetric(label, d.quantity, periodCaption),
    };
  });

  if (metrics.length === 0) {
    return { metrics, hero: null, satellites: [], sharedPeriod, controller: site.controller === true };
  }

  const heroAt = pickHero(ordered);
  const hero = metrics[heroAt];
  const satellites = metrics.filter((_, i) => i !== heroAt);

  return {
    metrics: [hero, ...satellites],
    hero,
    satellites,
    sharedPeriod,
    controller: site.controller === true,
  };
};

/* ─────────── hero tint ─────────── */

/**
 * The hero tile's source tint: a 3-stop gradient (strongest top-left) and
 * its border, as alpha-suffixed `accent` (`#RRGGBB`). The overline's
 * `energyInk` sits on the strongest stop, so light mode starts at 12.5%
 * (`20`) instead of the old 18% (`2E`) — at 18% genset and solar ink fell
 * to 4.3–4.4:1 (< AA). Dark mode keeps the old 18%. Pinned for every
 * source in both themes by __tests__/tokenContrast.test.ts.
 */
export const heroTint = (
  accent: string,
  isDark: boolean,
): { colors: string[]; border: string } => ({
  colors: [`${accent}${isDark ? '2E' : '20'}`, `${accent}0A`, `${accent}05`],
  border: `${accent}2E`,
});

/* ─────────── collapse / expand ─────────── */

/** The satellite chips on screen: all of them when they fit (≤ 3) or the
 *  card is expanded; otherwise the first 3. */
export const visibleSatellites = (
  model: SiteCardModel,
  expanded: boolean,
): { visible: SiteCardMetric[]; hiddenCount: number } => {
  const total = model.satellites.length;
  if (expanded || total <= COLLAPSED_SATELLITES) {
    return { visible: model.satellites, hiddenCount: 0 };
  }
  return {
    visible: model.satellites.slice(0, COLLAPSED_SATELLITES),
    hiddenCount: total - COLLAPSED_SATELLITES,
  };
};

/** Visible text of the expand / collapse toggle ('Show all 5' — every
 *  metric on the card, hero included), or null when nothing is hidden. */
export const toggleMetricsText = (model: SiteCardModel, expanded: boolean): string | null => {
  if (model.satellites.length <= COLLAPSED_SATELLITES) return null;
  return expanded ? 'Show less' : `Show all ${model.metrics.length}`;
};

/** Screen-reader label of the toggle (the card's custom action), or null
 *  when nothing is hidden. Contains the visible 'Show all N' text. */
export const toggleMetricsLabel = (model: SiteCardModel, expanded: boolean): string | null => {
  if (model.satellites.length <= COLLAPSED_SATELLITES) return null;
  return expanded ? 'Show fewer metrics' : `Show all ${model.metrics.length} metrics`;
};

/**
 * The card's single screen-reader label:
 *   'CCI FGF. Live, updated 3 minutes ago. Controller installed. Solar
 *    15.6 megawatt hours today, Wind 1.25 megawatt hours today, Battery
 *    300 kilowatt hours today, and 2 more'
 * Metrics are read hero first. Collapsed cards read the first 3 plus
 * 'and N more'; expanded cards read them all. `statusSpoken` comes from
 * `siteStatus().spoken`.
 */
export const siteCardA11yLabel = (
  siteName: string,
  statusSpoken: string,
  model: SiteCardModel,
  expanded: boolean,
): string => {
  const sentences: string[] = [siteName.trim(), statusSpoken.trim()];

  if (model.controller) sentences.push('Controller installed');

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
