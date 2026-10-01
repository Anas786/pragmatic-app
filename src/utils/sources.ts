/**
 * Energy-source helpers shared across the Dashboard SiteCard, the
 * SiteDetail Cards / Live tabs, Reports, and any other surface that
 * classifies a backend card by its source name.
 *
 * Backend `card.name` shipping is text-only ("Solar Energy Today",
 * "Grid Import — RealTime", "Wind Generation", …). These helpers
 * normalise the text into a stable token from the v2 `energyPalette`
 * so colours + short labels stay consistent on every screen.
 */

import { energyPalette } from 'src/theme';
import { formatSig3, isRateUnit, MISSING_TEXT } from './units';

export type SourceToken = keyof typeof energyPalette;

/**
 * Canonical display order for energy sources (generation first, the grid
 * last) — use it wherever several sources are listed side by side.
 */
export const SOURCE_ORDER: SourceToken[] = ['solar', 'wind', 'battery', 'genset', 'grid'];

/**
 * Short tags must stand alone as a "word": letters may not touch them on
 * either side, but digits, `_`, `-`, spaces and edges may ('ed_pv', 'PV1',
 * 'DG-1', 'BESS SOC'). Otherwise 'Bridge load' / 'Edge meter' read as
 * genset (they contain 'dg') and 'spv'-style words as solar.
 */
const tag = (t: string) => new RegExp(`(^|[^a-z])${t}($|[^a-z])`);
const PV_TAG = tag('pv');
const DG_TAG = tag('dg');
const BESS_TAG = tag('bess');

/**
 * Match the lowercased `name` against the source dictionary. Returns
 * `undefined` for unrecognised values — callers should fall back to a
 * neutral colour / label. Long words ('solar', 'wind', 'grid', 'genset',
 * 'battery') match as substrings; the short tags pv / dg / bess only as
 * letter-bounded tokens.
 */
export const sourceTokenFromName = (
  name: string,
): SourceToken | undefined => {
  const n = name.toLowerCase();
  if (n.includes('solar') || PV_TAG.test(n)) return 'solar';
  if (n.includes('wind')) return 'wind';
  if (n.includes('grid')) return 'grid';
  if (n.includes('genset') || DG_TAG.test(n)) return 'genset';
  if (n.includes('battery') || BESS_TAG.test(n)) return 'battery';
  return undefined;
};

/* ─────────── card period (what time window a backend card covers) ─────────── */

export type CardPeriod = 'now' | 'today' | 'week' | 'month' | 'year' | 'lifetime';

export const PERIOD_LABEL: Record<CardPeriod, string> = {
  now: 'Now',
  today: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  lifetime: 'Lifetime',
};

/** Checked in this order — the first match wins ('Total Energy Today' is
 *  'today', not 'lifetime'). Lifetime is deliberately narrow: a bare
 *  'Total' does NOT imply lifetime ('Total Energy Consumed' stays
 *  undefined) — a period caption is shown only when the name says so. */
const PERIOD_PATTERNS: [CardPeriod, RegExp][] = [
  ['today', /\b(today|daily|day|tdy)\b/i],
  ['week', /\b(week|weekly|wtd)\b/i],
  ['month', /\b(month|monthly|mtd)\b/i],
  ['year', /\b(year|yearly|annual|ytd)\b/i],
  [
    'lifetime',
    /\b(lifetime|life[\s-]time|cumulative|since commissioning|all[\s-]time|total (plant )?yield|plant yield)\b/i,
  ],
];

/**
 * The time window a card covers, derived ONLY from the backend card NAME
 * (the first matching pattern wins). Returns `undefined` when the name
 * states no period. This is the variant for user-visible period captions
 * (Dashboard SiteCard, tile overlines): a caption may only say what the
 * backend name says (orchestrator rule O5).
 *
 *   'Grid Energy Today'      → 'today'
 *   'Max Demand This Month'  → 'month'
 *   'PV Energy YTD Shams'    → 'year'
 *   'Total Plant Yield'      → 'lifetime'
 *   'PV Total Power'         → undefined
 */
export const periodFromName = (name: string): CardPeriod | undefined => {
  for (const [period, re] of PERIOD_PATTERNS) {
    if (re.test(name)) return period;
  }
  return undefined;
};

/**
 * The time window a backend card's value covers, for grouping/bucketing:
 * the card NAME's period wording first (`periodFromName`), and only when
 * the name states none, a power-family unit (W / VAr / VA, any prefix)
 * marks an instantaneous reading ('now'). Returns `undefined` when neither
 * says. For a visible period caption use `periodFromName` — 'now' here is
 * inferred from the unit, not stated by the backend name.
 *
 *   ('Peak Power Today', 'kW')        → 'today'   (the name wins)
 *   ('PV Total Power', 'kW')          → 'now'
 *   ('Grid Energy Today', 'kWh')      → 'today'
 *   ('Total Plant Yield', 'kWh')      → 'lifetime'
 *   ('Industrial consumption', 'kWh') → undefined
 */
export const periodFromCard = (
  name: string,
  unit?: string | null,
): CardPeriod | undefined =>
  periodFromName(name) ?? (isRateUnit(unit) ? 'now' : undefined);

/**
 * Concise label for the source. Drops common decoration ("- RealTime",
 * "Today", etc.) and falls back to a 14-char prefix when the source
 * doesn't match the known set.
 */
export const shortSourceLabel = (name: string): string => {
  const token = sourceTokenFromName(name);
  if (token === 'solar') return 'Solar';
  if (token === 'wind') return 'Wind';
  if (token === 'grid') return 'Grid';
  if (token === 'genset') return 'Genset';
  if (token === 'battery') return 'Battery';
  const words = name.split(' ').slice(0, 2).join(' ');
  return words.length > 14 ? words.slice(0, 14) + '…' : words;
};

/**
 * Compact K/M/B/T formatter for cramped, UNITLESS slots — 3 significant
 * digits, same rules as `formatQuantity` compact mode. Values that carry a
 * unit should use `formatQuantity` instead (no 'K' next to a unit).
 *
 *   15642          → "15.6K"
 *   17_000         → "17K"
 *   1_049_999      → "1.05M"
 *   850            → "850"
 *   'NA' / null    → "—"
 */
export const formatCompact = (value: number | string | null | undefined): string => {
  let n: number;
  if (typeof value === 'number') {
    n = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    n = Number(value);
  } else {
    return MISSING_TEXT;
  }
  if (!Number.isFinite(n)) return MISSING_TEXT;
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let i = 0;
  let x = n;
  // Compare the ROUNDED magnitude so 999,950 becomes "1.00M", not "1000K".
  while (i < suffixes.length - 1 && Math.abs(Number(x.toPrecision(3))) >= 1000) {
    x /= 1000;
    i += 1;
  }
  return formatSig3(x) + suffixes[i];
};

/**
 * Match a backend REPORT column name (e.g. `ed_solar`, `et_grid_import`)
 * to the source bucket its values are SUMMED into (aggregateEnergy /
 * buildStackData in utils/aggregations.ts).
 *
 * This is a VALUE path, so it deliberately keeps the original plain
 * substring matching — 'pv' / 'dg' / 'bess' anywhere in the column
 * ('ed_spv', 'ed_dgset', 'ed_bessa' included) — so the set of columns that
 * feed each Reports total is exactly what it was (web-portal parity, O1).
 * The word-bounded `sourceTokenFromName` is for DISPLAY classification only
 * (accent colour, icon, short label) and must not drive totals.
 */
export const findSourceForColumn = (column: string): SourceToken | undefined => {
  const n = column.toLowerCase();
  if (n.includes('solar') || n.includes('pv')) return 'solar';
  if (n.includes('wind')) return 'wind';
  if (n.includes('grid')) return 'grid';
  if (n.includes('genset') || n.includes('dg')) return 'genset';
  if (n.includes('battery') || n.includes('bess')) return 'battery';
  return undefined;
};

/**
 * Neutral accent for cards whose name doesn't resolve to a source token
 * AND whose backend `color` is missing/malformed. Mirrors the design
 * tokens' slate-500 neutral (scheme.textSecondary in light mode). MUST
 * stay a 6-digit hex — callers alpha-suffix it (e.g. `${color}2E` in
 * SiteCard's hero tint/border fills).
 */
const NEUTRAL_CARD_HEX = '#6B7280';

/**
 * Backend-shipped card colours are only trusted when they're a full
 * `#RRGGBB` hex: callers append 2-digit alpha suffixes, which silently
 * breaks on shorthand (`#0f0`), named (`red`) or `rgba()` values.
 */
const SIX_DIGIT_HEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Accent colour for a backend card:
 *   1. the v2 `energyPalette` entry when `name` resolves to a source token,
 *   2. else the card's own backend-provided `color` (if a valid 6-digit hex),
 *   3. else a neutral slate.
 *
 * Always returns a 6-digit hex so callers may alpha-suffix it.
 */
export const resolveCardColor = (card: {
  name: string;
  color?: string | null;
}): string => {
  const token = sourceTokenFromName(card.name);
  if (token) return energyPalette[token];
  if (card.color && SIX_DIGIT_HEX.test(card.color)) return card.color;
  return NEUTRAL_CARD_HEX;
};

/** Coerce a card-style value (`number | "NA" | etc.`) to a finite
 *  number, or `null` when it can't be parsed. */
export const numericCardValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};
