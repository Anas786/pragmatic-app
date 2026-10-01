/**
 * Live-tab view-model — everything `LiveParameterView` shows is derived
 * here, ONCE per fetch, so the memoised tiles render plain strings.
 *
 * Imported by direct path (deliberately NOT in the `src/utils` barrel).
 *
 * Web-portal parity (checked against the web "Live parameters" page for
 * Lucky Cement Nooriabad on 2026-10-01):
 *  - VALUES are the untouched `live.data.live.<code>.value` numbers, printed
 *    like the web: en-US grouping, exactly 2 decimals, never rescaled
 *    ('63,683,837.95', '1.00', '-7.68'). An exact 0 prints as a bare '0',
 *    as the web does ('Bus3 kW 0') and as the shared rule says ('0 kWh').
 *    Irradiance is the one deliberate departure (product decision): a
 *    whole number, '862 W/m²' (`isIrradiance`, units.ts).
 *  - NAMES resolve like the web: the site's own `globalParams.live` names
 *    first ('WHR kW', 'Captive Plant PF'), then the global params-mapping
 *    ('Wind 1 reactive power'), then the raw code.
 *  - UNITS are an app addition (the web shows none), so they come only from
 *    the site's own config and are dropped when they contradict the
 *    parameter — see `buildParamUnitIndex`.
 */
import { metricA11yLabel } from './a11y';
import { extractCardConfigs } from './cards';
import { toEpochMs } from './dates';
import { formatDateTimeShort, formatRelativeTime } from './format';
import { dataFreshness, FRESH_LIVE_MS } from './freshness';
import { tryNumber } from './parsers';
import { energyTypeFromName } from './sldGroup';
import {
  formatQuantity,
  formatScientific,
  isRateUnit,
  normalizeUnit,
  splitLabelUnit,
  spokenUnit,
  SUSPECT_READING_ABS,
  unitFamily,
} from './units';

/* ─────────── shared helpers ─────────── */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const nonEmptyString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

const pickString = (obj: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = nonEmptyString(obj[k]);
    if (v) return v;
  }
  return undefined;
};

/**
 * A live-store path → its parameter code. Accepts the config spellings
 * the backend uses: 'live.p10390.value' (cards / SLD), 'live.p10390' and a
 * bare 'p10390' (trend aggregations).
 */
export const codeFromLivePath = (path: unknown): string | null => {
  const p = nonEmptyString(path);
  if (!p) return null;
  const m = /^live\.([^.\s]+)(?:\.value)?$/.exec(p);
  if (m) return m[1];
  return /^[^.\s]+$/.test(p) ? p : null;
};

/** params-mapping entry → display name (plain string or `{ display | name … }`). */
const mappedName = (mapping: unknown, code: string): string | undefined => {
  if (!isObject(mapping)) return undefined;
  const entry = mapping[code];
  const direct = nonEmptyString(entry);
  if (direct) return direct;
  if (isObject(entry)) return pickString(entry, ['display', 'displayName', 'name', 'label']);
  return undefined;
};

/**
 * The site's own names for its custom/global parameters
 * (`siteConfig.globalParams.live`: `{ p1000009: 'WHR kW', … }`). The
 * global params-mapping only knows these codes as 'Custom Parameter 9';
 * the web portal shows the site names.
 */
export const buildSiteParamNames = (siteConfig: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!isObject(siteConfig)) return out;
  const global = siteConfig.globalParams;
  const live = isObject(global) ? global.live : undefined;
  if (!isObject(live)) return out;
  for (const [code, name] of Object.entries(live)) {
    const n = nonEmptyString(name);
    if (n) out[code] = n;
  }
  return out;
};

/** Site name → params-mapping name → the raw code. */
export const resolveLiveParamName = (
  code: string,
  mapping?: unknown,
  siteNames?: Record<string, string> | null,
): string => siteNames?.[code] ?? mappedName(mapping, code) ?? code;

/* ─────────── units ─────────── */

/** Where a unit was found, highest trust first. */
export type ParamUnitSource = 'card' | 'sld' | 'trend' | 'name';

/** Config time-granularity words that are NOT measurement units
 *  (trend `payload.unit` is 'MINUTE' / 'HOUR' — an x-axis bucket size). */
const TIME_GRANULARITY_RE = /^(second|minute|hour|day|week|month|year)s?$/i;

/** The canonical unit when `unit` is one the app recognises (kWh, kVAr, %,
 *  V, A, Hz, °C, W/m², m/s …), else null — reuses the units.ts tables via
 *  the bracket parser rather than duplicating them. */
const knownUnit = (unit: string): string | null =>
  unit.length > 12 ? null : splitLabelUnit(`x (${unit})`).unit;

/**
 * What kind of quantity a parameter's NAME (or its SLD key label) says it
 * is. Only unambiguous signals are used — "Grid energy power 1" says
 * nothing, so it constrains nothing.
 */
type QuantityKind = 'pf' | 'reactive' | 'apparent' | 'activePower' | 'energy';

const kindFromName = (name: string): QuantityKind | null => {
  if (/\b(pf|power\s*factor|cos\s*(phi|φ))\b/i.test(name)) return 'pf';
  if (/\breactive\b|\b[kmg]?varh?\b/i.test(name)) return 'reactive';
  if (/\bapparent\b|\b[kmg]?vah?\b/i.test(name)) return 'apparent';
  if (/\bactive\s+power\b/i.test(name)) return 'activePower';
  if (/\benergy\b/i.test(name) && !/\bpower\b/i.test(name)) return 'energy';
  return null;
};

const kindFromSldLabel = (label: string): QuantityKind | null => {
  switch (label.trim().toUpperCase()) {
    case 'PF':
      return 'pf';
    case 'Q':
      return 'reactive';
    case 'S':
      return 'apparent';
    case 'P':
      return 'activePower';
    default:
      return null;
  }
};

/**
 * Does `unit` fit the quantity? A contradicting unit is DROPPED (the next
 * source is tried, else no unit) — never corrected. Real config ships
 * both kinds of error: the SLD tags turbine 'Q' (reactive power) as 'kW'
 * and power factors as '%'.
 */
const unitFitsKind = (unit: string, kind: QuantityKind | null): boolean => {
  if (kind === null) return true;
  switch (kind) {
    case 'pf':
      return false; // a power factor is dimensionless
    case 'reactive':
      return unitFamily(unit) === 'reactive';
    case 'apparent':
      return unitFamily(unit) === 'apparent';
    case 'activePower':
      return unitFamily(unit) === 'power' && isRateUnit(unit);
    case 'energy':
      return unitFamily(unit) !== 'other' && !isRateUnit(unit);
  }
};

interface UnitCandidate {
  unit: string;
  source: ParamUnitSource;
  /** Kind implied by the config entry itself (SLD key label). */
  hint: QuantityKind | null;
}

/**
 * code → display unit for live parameters, built from the site config
 * alone (no extra API calls). Sources, highest trust first:
 *
 *  1. `siteComponents.cards[]` — a `dataStore: 'live'` card whose objKey is
 *     'live.<code>.value' lends its `unit` (the web shows these cards).
 *  2. `siteComponents.sldV2.nodes[].data.keys[]` — `{ param, label, unit }`.
 *  3. `siteComponents.trends[].payload.aggregations[]` — an aggregation's
 *     own `unit`, or a recognised trailing '(unit)' in its `display`.
 *     `payload.unit` is the x-axis granularity ('MINUTE'), never used.
 *  4. A recognised trailing '(unit)' / '[unit]' in the parameter's name
 *     (site name, else params-mapping name).
 *
 * Every candidate is normalised (`normalizeUnit`) and must fit what the
 * parameter's name — or, failing that, its SLD key label — says it is
 * (power factor → no unit; reactive → VAr family; active power → W
 * family; energy → a cumulative unit). The first candidate that fits
 * wins. Codes with no fitting candidate are absent: the tile then shows a
 * bare number. A unit is never guessed from the Live-tab category.
 */
export const buildParamUnitIndex = (
  siteConfig: unknown,
  paramsMapping?: unknown,
): Record<string, string> => {
  const siteNames = buildSiteParamNames(siteConfig);
  const candidates = new Map<string, UnitCandidate[]>();
  const add = (code: string | null, rawUnit: unknown, source: ParamUnitSource, hint: QuantityKind | null = null) => {
    if (!code) return;
    const raw = nonEmptyString(rawUnit);
    if (!raw || TIME_GRANULARITY_RE.test(raw)) return;
    const unit = source === 'trend' ? knownUnit(raw) : normalizeUnit(raw);
    if (!unit) return;
    const list = candidates.get(code);
    if (list) list.push({ unit, source, hint });
    else candidates.set(code, [{ unit, source, hint }]);
  };

  const components = isObject(siteConfig) ? siteConfig.siteComponents : undefined;

  // 1. Cards.
  for (const card of extractCardConfigs(isObject(siteConfig) ? siteConfig : null)) {
    if (card.dataStore !== 'live') continue;
    const m = /^live\.([^.\s]+)\.value$/.exec(card.objKey.trim());
    if (m) add(m[1], card.unit, 'card');
  }

  // 2. SLD node keys.
  const sld = isObject(components) ? components.sldV2 : undefined;
  const nodes = isObject(sld) && Array.isArray(sld.nodes) ? sld.nodes : [];
  for (const node of nodes) {
    const data = isObject(node) ? node.data : undefined;
    const keys = isObject(data) && Array.isArray(data.keys) ? data.keys : [];
    for (const key of keys) {
      if (!isObject(key)) continue;
      const label = nonEmptyString(key.label) ?? '';
      add(codeFromLivePath(key.param), key.unit, 'sld', kindFromSldLabel(label));
    }
  }

  // 3. Trend aggregations.
  const trends = isObject(components) && Array.isArray(components.trends) ? components.trends : [];
  for (const trend of trends) {
    const payload = isObject(trend) ? trend.payload : undefined;
    const aggs = isObject(payload) && Array.isArray(payload.aggregations) ? payload.aggregations : [];
    for (const agg of aggs) {
      if (!isObject(agg)) continue;
      const code = codeFromLivePath(agg.param);
      add(code, agg.unit, 'trend');
      const display = nonEmptyString(agg.display);
      if (display) add(code, splitLabelUnit(display).unit, 'trend');
    }
  }

  // 4. Name suffix — every named code (site names override the mapping).
  const nameOf = (code: string) => resolveLiveParamName(code, paramsMapping, siteNames);
  const named = new Set<string>(Object.keys(siteNames));
  if (isObject(paramsMapping)) for (const code of Object.keys(paramsMapping)) named.add(code);
  for (const code of named) {
    const name = nameOf(code);
    const last = name.charAt(name.length - 1);
    if (last !== ')' && last !== ']') continue; // cheap pre-filter (12k+ names)
    add(code, splitLabelUnit(name).unit, 'name');
  }

  const out: Record<string, string> = {};
  for (const [code, list] of candidates) {
    const nameKind = kindFromName(nameOf(code));
    for (const c of list) {
      if (unitFitsKind(c.unit, nameKind ?? c.hint)) {
        out[code] = c.unit;
        break;
      }
    }
  }
  return out;
};

/* ─────────── categories ─────────── */

export type LiveCategoryKey =
  | 'energy'
  | 'power'
  | 'voltage'
  | 'current'
  | 'temperature'
  | 'frequency'
  | 'other';

export interface LiveCategoryDef {
  key: LiveCategoryKey;
  label: string;
  match: (name: string) => boolean;
}

/**
 * Measurement categories, in pill order. A category is shown by its ICON
 * ({@link LIVE_CATEGORY_ICON}), never by a colour: the energy-source
 * palette means energy SOURCE only, so tile colour comes from the
 * parameter's source ({@link liveSourceFromName}).
 * Energy is tested BEFORE power: registers like "Active Energy Import
 * (kWh)" / "Reactive Energy" must land in Energy.
 */
export const LIVE_CATEGORIES: readonly LiveCategoryDef[] = [
  { key: 'energy', label: 'Energy', match: n => /\b(energy|kwh|mwh|gwh|kvarh|kvah)\b/i.test(n) },
  // No bare active|reactive|apparent — those misclassified energy/current
  // registers ("Reactive Energy", "Reactive Current").
  { key: 'power', label: 'Power', match: n => /\b(power|kw|kvar|kva|pf)\b/i.test(n) },
  // kv needs a trailing boundary or it claims kVArh/kVAh registers.
  { key: 'voltage', label: 'Voltage', match: n => /\b(volt|voltage|kv\b|^v\b)/i.test(n) },
  { key: 'current', label: 'Current', match: n => /\b(current|amp|amps|^a\b)/i.test(n) },
  { key: 'temperature', label: 'Temperature', match: n => /(temp|temperature|°c|°f)/i.test(n) },
  { key: 'frequency', label: 'Frequency', match: n => /\b(freq|frequency|hz)\b/i.test(n) },
  { key: 'other', label: 'Other', match: () => true },
];

const CATEGORY_INDEX: Record<LiveCategoryKey, number> = LIVE_CATEGORIES.reduce(
  (acc, c, i) => ({ ...acc, [c.key]: i }),
  {} as Record<LiveCategoryKey, number>,
);

export const LIVE_CATEGORY_LABEL: Record<LiveCategoryKey, string> = LIVE_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<LiveCategoryKey, string>,
);

/** MaterialIcons glyph per category — tile icon + category pill. */
export const LIVE_CATEGORY_ICON: Record<LiveCategoryKey, string> = {
  energy: 'electric-meter',
  power: 'bolt',
  voltage: 'electrical-services',
  current: 'cable',
  temperature: 'device-thermostat',
  frequency: 'graphic-eq',
  other: 'sensors',
};

/** Energy sources a tile can be tinted with (the `energyPalette` keys). */
export type LiveSource = 'solar' | 'wind' | 'grid' | 'genset' | 'battery';

/**
 * The energy source a parameter belongs to, from its NAME — the same tag
 * rules as the SLD grouping (whole-token PV / WTG / WT / DG / GEN / BESS …,
 * substrings solar / wind / diesel / grid / utility …): 'DG 1 energy
 * power' → genset, 'PV Energy Day' → solar, 'Grid Import Total' → grid.
 * Null when the name names no source ('Bus3 Export Energy', 'Captive
 * Plant PF') and for WHR, which has no palette colour — those tiles take
 * the brand accent.
 */
export const liveSourceFromName = (name: string): LiveSource | null => {
  const type = energyTypeFromName(name);
  return type === null || type === 'whr' ? null : type;
};

export const classifyLiveCategory = (name: string): LiveCategoryKey => {
  for (const c of LIVE_CATEGORIES) {
    if (c.key === 'other') continue;
    if (c.match(name)) return c.key;
  }
  return 'other';
};

/* ─────────── extraction ─────────── */

export interface LiveParameter {
  code: string;
  /** Display name — a trailing '(unit)' is removed when that unit is
   *  rendered separately; otherwise the backend name verbatim. */
  name: string;
  /** Lower-cased haystack for search (name, raw name, code, unit). */
  searchText: string;
  /** Parsed numeric value (sorting), or null. */
  numeric: number | null;
  /** Epoch ms of the reading, or null when missing / unparsable. */
  updateAt: number | null;
  /** Age at fetch time; null when the time is unknown. */
  ageMs: number | null;
  /** Older than FRESH_LIVE_MS at fetch time. */
  stale: boolean;
  category: LiveCategoryKey;
  categoryLabel: string;
  /** Energy source named by the parameter (tile tint), or null. */
  source: LiveSource | null;
  /** '1,498.70' / '0', a verbatim text reading, or '—' when missing. */
  displayValue: string;
  /** Canonical unit ('kWh'); '' when unknown or the value is missing. */
  displayUnit: string;
  isMissing: boolean;
  /** |value| ≥ IMPLAUSIBLE_READING_ABS — shown in 'e' notation, flagged. */
  implausible: boolean;
  /** Long number — the tile steps the value size down instead of
   *  shrink-to-fit (adjustsFontSizeToFit is banned in grids). */
  longValue: boolean;
  /** 'Just now' / '12 min ago' / '2 h ago' under 24 h, then
   *  '30 Sep, 14:00'; 'Time unknown' when the timestamp can't be trusted. */
  displayTime: string;
  /** One composed screen-reader label for the whole tile. */
  a11yLabel: string;
}

export const LONG_VALUE_CHARS = 12;

/**
 * |value| at or above which a reading is physically implausible — the
 * shared {@link SUSPECT_READING_ABS} (utils/units.ts), also used by the
 * charts' "shown as sent by the device" note. Lucky Cement's "Wind 3 daily
 * energy" reported 2.66e36 on 2026-10-01. Such a value is never hidden: it
 * keeps its number, written in 'e' notation ('2.66e36'), and is flagged.
 */
export const IMPLAUSIBLE_READING_ABS = SUSPECT_READING_ABS;

const scientific = formatScientific;

const MISSING_TEXT = '—';
const MISSING_LIKE_RE = /^(na|n\/a|nan|null|undefined|-|—|–)$/i;
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** Screen-reader age: 'updated 12 minutes ago', 'updated 30 Sep, 14:00'. */
const spokenAge = (ageMs: number | null, updateAt: number | null, dateText: string): string => {
  if (ageMs === null || updateAt === null) return 'update time unknown';
  if (ageMs < MINUTE) return 'updated just now';
  if (ageMs < HOUR) return `updated ${plural(Math.floor(ageMs / MINUTE), 'minute')} ago`;
  if (ageMs < DAY) return `updated ${plural(Math.floor(ageMs / HOUR), 'hour')} ago`;
  return `updated ${dateText}`;
};

export interface ExtractLiveParamsOptions {
  /** `/public/config/params-mapping` (code → name). */
  mapping?: unknown;
  /** `buildSiteParamNames(siteConfig)`. */
  siteNames?: Record<string, string> | null;
  /** `buildParamUnitIndex(siteConfig, mapping)`. */
  unitIndex?: Record<string, string> | null;
  /** Reference time for ages — the query's `dataUpdatedAt`, so labels say
   *  how old each reading was when it was fetched. */
  fetchNow: number;
}

/**
 * `liveData.live.data.live` → one display-ready row per parameter.
 * Values are never altered — only formatted (precise, 2 decimals, no
 * rescale: exactly the web's number; irradiance as a whole number).
 */
export const extractLiveParams = (
  liveData: unknown,
  { mapping, siteNames, unitIndex, fetchNow }: ExtractLiveParamsOptions,
): LiveParameter[] => {
  if (!isObject(liveData)) return [];
  const liveBranch = liveData.live;
  if (!isObject(liveBranch)) return [];
  const envelope = liveBranch.data;
  if (!isObject(envelope)) return [];
  const inner = envelope.live;
  if (!isObject(inner)) return [];

  // Readings usually share a handful of timestamps — format each once.
  const timeCache = new Map<number, { text: string; dateText: string }>();

  const out: LiveParameter[] = [];
  for (const [code, entry] of Object.entries(inner)) {
    let raw: unknown = null;
    let rawTime: unknown = null;
    if (isObject(entry)) {
      raw = entry.value;
      rawTime = entry.update_at ?? entry.updateAt;
    }

    const rawName = resolveLiveParamName(code, mapping, siteNames);
    const unit = unitIndex?.[code] ?? '';
    const split = splitLabelUnit(rawName);
    // Strip the name's '(unit)' only when the tile shows that same unit;
    // a conflicting suffix stays visible, exactly as the backend wrote it.
    const name = unit !== '' && split.unit === unit ? split.label : rawName;

    // Value — formatted, never transformed.
    const numeric = tryNumber(raw) ?? null;
    let displayValue: string;
    let displayUnit = '';
    let isMissing = false;
    let implausible = false;
    let spokenValue: string;
    if (numeric !== null && Math.abs(numeric) >= IMPLAUSIBLE_READING_ABS) {
      implausible = true;
      displayValue = scientific(numeric);
      displayUnit = normalizeUnit(unit);
      const [m, e] = displayValue.split('e');
      const spokenU = displayUnit ? ` ${spokenUnit(displayUnit)}` : '';
      spokenValue = `${name}, ${m} times 10 to the power ${e}${spokenU}, implausible reading`;
    } else if (numeric !== null) {
      const q = formatQuantity(numeric, unit, {
        mode: 'precise',
        rescale: false,
        // A real zero reads '0' (web + shared rule); anything that merely
        // rounds to zero keeps its 2 decimals ('0.00') — it isn't zero.
        decimals: numeric === 0 ? 0 : 2,
        // Irradiance ('W/m²', or a unitless 'POA Irradiance 4') prints as a
        // whole number — formatQuantity applies the shared rule.
        name: rawName,
      });
      displayValue = q.text;
      displayUnit = q.unit;
      spokenValue = metricA11yLabel(name, q);
    } else {
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (text === '' || MISSING_LIKE_RE.test(text)) {
        displayValue = MISSING_TEXT;
        isMissing = true;
        spokenValue = `${name}, no data`;
      } else {
        // A genuine text reading (e.g. a status word) — shown verbatim.
        displayValue = text;
        spokenValue = `${name}, ${text}`;
      }
    }

    // Time — age at fetch time, classified by the shared freshness model
    // (unknown = missing, unparsable or > 5 min in the future).
    const fresh = dataFreshness(rawTime, fetchNow);
    const updateAt = fresh.ageMs === null ? null : toEpochMs(rawTime);
    let displayTime = 'Time unknown';
    let dateText = '';
    if (fresh.ageMs !== null && updateAt !== null) {
      let cached = timeCache.get(updateAt);
      if (!cached) {
        const date = formatDateTimeShort(updateAt, fetchNow);
        cached = {
          text: fresh.ageMs < DAY ? formatRelativeTime(updateAt, fetchNow) : date,
          dateText: date,
        };
        timeCache.set(updateAt, cached);
      }
      displayTime = cached.text;
      dateText = cached.dateText;
    }
    const stale = fresh.ageMs !== null && fresh.ageMs > FRESH_LIVE_MS;

    const category = classifyLiveCategory(rawName);
    const a11yLabel = [spokenValue, spokenAge(fresh.ageMs, updateAt, dateText), stale ? 'stale' : '']
      .filter(Boolean)
      .join(', ');

    out.push({
      code,
      name,
      searchText: `${rawName} ${code} ${displayUnit}`.toLowerCase(),
      numeric,
      updateAt,
      ageMs: fresh.ageMs,
      stale,
      category,
      categoryLabel: LIVE_CATEGORY_LABEL[category],
      source: liveSourceFromName(rawName),
      displayValue,
      displayUnit,
      isMissing,
      implausible,
      longValue: displayValue.length > LONG_VALUE_CHARS,
      displayTime,
      a11yLabel,
    });
  }
  return out;
};

/** Newest trustworthy reading time across all parameters, or null. */
export const newestUpdateAt = (params: readonly LiveParameter[]): number | null => {
  let newest: number | null = null;
  for (const p of params) {
    if (p.updateAt !== null && (newest === null || p.updateAt > newest)) newest = p.updateAt;
  }
  return newest;
};

/* ─────────── sort ─────────── */

export type LiveSortKey = 'name' | 'valueDesc' | 'valueAsc' | 'recent' | 'staleFirst';

/** Tap order of the single sort control. */
export const LIVE_SORT_ORDER: readonly LiveSortKey[] = [
  'name',
  'valueDesc',
  'valueAsc',
  'recent',
  'staleFirst',
];

/** Visible (short) label on the sort control. */
export const LIVE_SORT_LABEL: Record<LiveSortKey, string> = {
  name: 'Name',
  valueDesc: 'Highest',
  valueAsc: 'Lowest',
  recent: 'Newest',
  staleFirst: 'Stale first',
};

/** Screen-reader description of the current order (accessibilityValue). */
export const LIVE_SORT_SPOKEN: Record<LiveSortKey, string> = {
  name: 'Name, A to Z',
  valueDesc: 'Value, high to low',
  valueAsc: 'Value, low to high',
  recent: 'Recently updated first',
  staleFirst: 'Stale first',
};

export const nextLiveSort = (key: LiveSortKey): LiveSortKey =>
  LIVE_SORT_ORDER[(LIVE_SORT_ORDER.indexOf(key) + 1) % LIVE_SORT_ORDER.length];

/** One shared collator ('Inverter 2' before 'Inverter 10'); building one
 *  per comparison is expensive on Hermes. */
const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

const byName = (a: LiveParameter, b: LiveParameter) =>
  COLLATOR.compare(a.name, b.name) || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);

/**
 * Comparator for a sort key. Ties (and missing values / times, which
 * always sort last — except 'Stale first', where an unknown time is a
 * problem worth seeing first) fall back to name order, so the grid order
 * is deterministic.
 */
export const compareLiveParams = (key: LiveSortKey) => {
  switch (key) {
    case 'valueDesc':
    case 'valueAsc': {
      const dir = key === 'valueDesc' ? -1 : 1;
      return (a: LiveParameter, b: LiveParameter) => {
        if (a.numeric === null || b.numeric === null) {
          if (a.numeric === b.numeric) return byName(a, b);
          return a.numeric === null ? 1 : -1;
        }
        return dir * (a.numeric - b.numeric) || byName(a, b);
      };
    }
    case 'recent':
      return (a: LiveParameter, b: LiveParameter) => {
        if (a.updateAt === null || b.updateAt === null) {
          if (a.updateAt === b.updateAt) return byName(a, b);
          return a.updateAt === null ? 1 : -1;
        }
        return b.updateAt - a.updateAt || byName(a, b);
      };
    case 'staleFirst':
      // Unknown time first, then oldest → newest.
      return (a: LiveParameter, b: LiveParameter) => {
        const at = a.updateAt ?? Number.NEGATIVE_INFINITY;
        const bt = b.updateAt ?? Number.NEGATIVE_INFINITY;
        if (at === bt) return byName(a, b);
        return at < bt ? -1 : 1;
      };
    case 'name':
    default:
      return byName;
  }
};

/* ─────────── grid model ─────────── */

export type LiveCategoryCounts = Record<LiveCategoryKey, number>;

const zeroCounts = (): LiveCategoryCounts => ({
  energy: 0,
  power: 0,
  voltage: 0,
  current: 0,
  temperature: 0,
  frequency: 0,
  other: 0,
});

export const countLiveCategories = (params: readonly LiveParameter[]): LiveCategoryCounts => {
  const counts = zeroCounts();
  for (const p of params) counts[p.category] += 1;
  return counts;
};

/**
 * Default category: Energy, else Power, else the first non-empty one in
 * pill order; null only when there are no parameters at all.
 */
export const defaultLiveCategory = (counts: LiveCategoryCounts): LiveCategoryKey | null => {
  if (counts.energy > 0) return 'energy';
  if (counts.power > 0) return 'power';
  return LIVE_CATEGORIES.find(c => counts[c.key] > 0)?.key ?? null;
};

/** Search scope while a query is active: every category, or one. */
export type LiveSearchScope = LiveCategoryKey | 'all';

export interface LiveGridInput {
  params: readonly LiveParameter[];
  /** Debounced query. Non-empty → search across ALL categories. */
  query: string;
  /** Category picked in normal mode (null → the data-derived default). */
  pickedCategory: LiveCategoryKey | null;
  /** Category narrowing while searching ('all' by default). */
  searchScope: LiveSearchScope;
  sortKey: LiveSortKey;
}

export interface LiveGridModel {
  searching: boolean;
  /** Categories that have parameters at all (pill set — stable while
   *  searching so pills don't jump). */
  categories: LiveCategoryKey[];
  /** Per-category totals (normal) or match counts (searching). */
  counts: LiveCategoryCounts;
  /** Normal mode: the shown category. */
  activeCategory: LiveCategoryKey | null;
  /** Searching: the effective scope ('all' when the picked one has no match). */
  scope: LiveSearchScope;
  /** Searching: matches across all categories. */
  matchTotal: number;
  /** The tiles, in display order. */
  tiles: LiveParameter[];
  /** Header text: 'Energy · 27 of 276', '12 matches', 'Power · 3 of 12 matches'. */
  title: string;
}

/**
 * Pure grid derivation. Normal mode shows ONE category (no 'All' pill).
 * A non-empty query searches every category: pills show match counts, the
 * grid is grouped in pill order, and a scope pill can narrow it.
 */
export const buildLiveGrid = ({
  params,
  query,
  pickedCategory,
  searchScope,
  sortKey,
}: LiveGridInput): LiveGridModel => {
  const totals = countLiveCategories(params);
  const categories = LIVE_CATEGORIES.filter(c => totals[c.key] > 0).map(c => c.key);
  const cmp = compareLiveParams(sortKey);
  const q = query.trim().toLowerCase();

  if (q === '') {
    // A pick only survives while its category still has parameters — a
    // refetch that empties it also removes its pill.
    const activeCategory =
      pickedCategory && totals[pickedCategory] > 0 ? pickedCategory : defaultLiveCategory(totals);
    const tiles = activeCategory
      ? params.filter(p => p.category === activeCategory).sort(cmp)
      : [];
    return {
      searching: false,
      categories,
      counts: totals,
      activeCategory,
      scope: 'all',
      matchTotal: 0,
      tiles,
      title: activeCategory
        ? `${LIVE_CATEGORY_LABEL[activeCategory]} · ${tiles.length} of ${params.length}`
        : 'Live parameters',
    };
  }

  const matches = params.filter(p => p.searchText.includes(q));
  const counts = countLiveCategories(matches);
  const scope: LiveSearchScope =
    searchScope !== 'all' && counts[searchScope] > 0 ? searchScope : 'all';
  const tiles = (scope === 'all' ? matches : matches.filter(p => p.category === scope)).sort(
    (a, b) => CATEGORY_INDEX[a.category] - CATEGORY_INDEX[b.category] || cmp(a, b),
  );
  const matchWord = (n: number) => `${n} ${n === 1 ? 'match' : 'matches'}`;
  return {
    searching: true,
    categories,
    counts,
    activeCategory: null,
    scope,
    matchTotal: matches.length,
    tiles,
    title:
      scope === 'all'
        ? matchWord(matches.length)
        : `${LIVE_CATEGORY_LABEL[scope]} · ${tiles.length} of ${matchWord(matches.length)}`,
  };
};
