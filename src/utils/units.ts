/**
 * Quantity formatting — every value + unit the app shows goes through
 * `formatQuantity` so numbers read the same on every screen.
 *
 *  - `compact`  3 significant digits, auto-rescaled UP within the unit
 *               family (850 kWh · 15.6 MWh · 1.05 GWh · 1.25 MW). Heroes,
 *               Dashboard totals/legend, environmental impact, chips, header
 *               capacity, chart tooltips.
 *  - `precise`  fixed `decimals` (default 2) with grouping; rescaled only
 *               once |v| ≥ 10,000 (1,498.70 kWh · 5.90 GWh). Cards / Live
 *               tiles; list rows pass `decimals: 1`.
 *
 * WEB-PORTAL PARITY: a figure the web portal also prints (Summary yield and
 * revenue, Cards-tab values, Live parameters) must read like the web —
 * pass `{ mode: 'precise', rescale: false }` so the number AND unit stay the
 * backend's ('147,786.00 kWh', '14,463.03 kW', '142,781.74 MWh'). With the
 * default rescale, precise mode would print '147.79 MWh' / '14.46 MW' —
 * the same value, but no longer the number a user sees on the web.
 *
 * Only the W / Wh / VAr / VArh / VA / VAh families are rescaled, and only
 * upward from the unit the backend sent (a 0.4 kWh reading never becomes
 * 400 Wh). Other units (%, V, A, Hz, °C, m/s, W/m²) are never rescaled and
 * never get a K/M suffix. Integer-valued numbers show no padding decimals
 * ('17 MWh', not '17.0 MWh'); measured fractions keep 3 significant digits
 * ('1.00 MWh' when 999.95 kWh rounds up).
 *
 * Grouping uses en-US separators ('142,781.74') to match the web portal.
 * Formatting is presentation-only: it never changes which value is shown.
 *
 * IRRADIANCE (product decision, 2026-10-01): an irradiance reading
 * (`isIrradiance`) always prints as a whole number with grouping —
 * '862 W/m²', '1,024 W/m²' — in both modes and whatever `decimals` asks
 * for. Cards, Live tiles, SLD key rows and the Dashboard all format
 * through here, so they agree — by unit everywhere; by NAME (a unitless
 * reading) only where the caller passes `name` (Cards, Live, SLD; not yet
 * the Dashboard chips). No other unit's decimals change.
 */

export type QuantityMode = 'compact' | 'precise';

export interface FormattedQuantity {
  /** Number text without the unit ('15.6', '1,498.70', '—'). */
  text: string;
  /** Display unit after rescaling ('MWh'); '' when unitless or missing. */
  unit: string;
  /** Screen-reader phrase ('15.6 megawatt hours', 'no data'). */
  spoken: string;
  /** True when the input could not be parsed as a finite number. */
  isMissing: boolean;
  /** The parsed input value in the ORIGINAL unit (unscaled), or null. */
  value: number | null;
}

export interface FormatQuantityOptions {
  mode?: QuantityMode;
  /** `precise` only — fraction digits (default 2). */
  decimals?: number;
  /**
   * false → keep the backend's unit (casing still normalised), never step
   * the prefix. For figures that must read exactly like the web portal,
   * e.g. the Summary lifetime yield '142,781.74 MWh'. Default true.
   */
  rescale?: boolean;
  /**
   * The reading's name / label. Only consulted to recognise a UNITLESS
   * irradiance reading by name ('POA Irradiance 4') — see `isIrradiance`.
   */
  name?: string | null;
}

export type UnitFamily = 'energy' | 'power' | 'reactive' | 'apparent' | 'other';

export const MISSING_TEXT = '—';

/* ─────────── unit tables ─────────── */

type ScalableBase = 'W' | 'Wh' | 'VAr' | 'VArh' | 'VA' | 'VAh';

const PREFIXES = ['', 'k', 'M', 'G', 'T'] as const;
const PREFIX_WORDS = ['', 'kilo', 'mega', 'giga', 'tera'] as const;

const BASE_BY_LOWER: Record<string, ScalableBase> = {
  w: 'W',
  wh: 'Wh',
  var: 'VAr',
  varh: 'VArh',
  va: 'VA',
  vah: 'VAh',
};

const BASE_WORDS: Record<ScalableBase, string> = {
  W: 'watts',
  Wh: 'watt hours',
  VAr: 'volt-amperes reactive',
  VArh: 'volt-ampere reactive hours',
  VA: 'volt-amperes',
  VAh: 'volt-ampere hours',
};

const BASE_FAMILY: Record<ScalableBase, UnitFamily> = {
  W: 'power',
  Wh: 'energy',
  VAr: 'reactive',
  VArh: 'reactive',
  VA: 'apparent',
  VAh: 'apparent',
};

/** Prefix letter (any case) → index into PREFIXES. A lowercase `m` is read
 *  as MEGA: milli-watt-hours never occur here, and the backend's 'mWh'
 *  label on lifetime plant yield is a casing typo for MWh. */
const PREFIX_INDEX: Record<string, number> = { '': 0, k: 1, m: 2, g: 3, t: 4 };

/** Canonical spellings for the non-scalable units we know. */
const OTHER_UNITS: Record<string, string> = {
  '%': '%',
  v: 'V',
  kv: 'kV',
  a: 'A',
  ka: 'kA',
  hz: 'Hz',
  '°c': '°C',
  degc: '°C',
  'deg c': '°C',
  celsius: '°C',
  'm/s': 'm/s',
};

/** Canonical irradiance unit. */
export const IRRADIANCE_UNIT = 'W/m²';

/**
 * Every spelling of watts per square metre the backend / configs use, matched
 * lowercased with whitespace removed: W/m², W/m2, W/M2, W/m^2, W/m**2,
 * Wm-2, W m-2, W·m-2, W.m^-2, Wm2, W/sqm, W/sq.m, watt(s)/m2. Never kW/m²
 * or Wh/m² (different quantities).
 */
const IRRADIANCE_UNIT_RE =
  /^w(?:atts?)?(?:\/(?:m(?:2|²|\^2|\*\*2)|sq\.?m)|[.·*]?m(?:\^?-2|⁻²|2|²))$/;

/** Canonical spelling of a known non-scalable unit, else undefined. */
const canonicalOtherUnit = (unit: string): string | undefined => {
  const lower = unit.trim().toLowerCase();
  const known = OTHER_UNITS[lower];
  if (known !== undefined) return known;
  return IRRADIANCE_UNIT_RE.test(lower.replace(/\s+/g, '')) ? IRRADIANCE_UNIT : undefined;
};

const OTHER_SPOKEN: Record<string, string> = {
  '%': 'percent',
  V: 'volts',
  kV: 'kilovolts',
  A: 'amps',
  kA: 'kiloamps',
  Hz: 'hertz',
  '°C': 'degrees Celsius',
  'W/m²': 'watts per square metre',
  'm/s': 'metres per second',
};

const SCALABLE_RE = /^([kmgt]?)(varh|vah|var|va|wh|w)$/;

interface ParsedScalable {
  prefixIndex: number;
  base: ScalableBase;
}

const parseScalable = (unit: string): ParsedScalable | null => {
  const m = SCALABLE_RE.exec(unit.trim().toLowerCase());
  if (!m) return null;
  return { prefixIndex: PREFIX_INDEX[m[1]], base: BASE_BY_LOWER[m[2]] };
};

/**
 * Canonical unit casing: kwh/KWH → kWh, mwh → MWh, kvar → kVAr,
 * w/m2 → W/m², hz → Hz. Unknown units come back trimmed but unchanged;
 * null/undefined → ''.
 */
export const normalizeUnit = (unit?: string | null): string => {
  if (unit === null || unit === undefined) return '';
  const t = unit.trim();
  if (t === '') return '';
  const scalable = parseScalable(t);
  if (scalable) return PREFIXES[scalable.prefixIndex] + scalable.base;
  return canonicalOtherUnit(t) ?? t;
};

/** Which rescaling family a unit belongs to. */
export const unitFamily = (unit?: string | null): UnitFamily => {
  const parsed = parseScalable(normalizeUnit(unit));
  return parsed ? BASE_FAMILY[parsed.base] : 'other';
};

/** True for instantaneous-rate units (W / VAr / VA with any prefix). */
export const isRateUnit = (unit?: string | null): boolean => {
  const parsed = parseScalable(normalizeUnit(unit));
  return !!parsed && !parsed.base.endsWith('h');
};

/** Name words that make a UNITLESS reading an irradiance reading (whole
 *  words, any case; a trailing sensor index is fine: 'POA1', 'GHI_2'). */
const IRRADIANCE_NAME_RE = /(?:^|[^a-z])(?:irradiance|poa|ghi|gti|insolation)(?=$|[^a-z])/i;
/** …unless the name is about the sensor's temperature ('POA Module Temp'). */
const TEMPERATURE_NAME_RE = /(?:^|[^a-z])(?:temp|temperature)(?=$|[^a-z])/i;

/** A bracketed token in a name ('(kW)', '[%]') — a unit candidate. */
const NAME_BRACKET_RE = /[([]\s*([^()[\]]{1,16}?)\s*[)\]]/g;
/** A per-area token anywhere in a name ('kWh/m2', 'kW/m²', 'Wh / sq.m'). */
const NAME_PER_AREA_RE = /([a-z]+)\s*\/\s*(?:m(?:2|²|\^2|\*\*2)?|sq\.?\s*m)(?![a-z0-9])/gi;

/**
 * True when a reading's NAME states a unit other than W/m² — a recognised
 * bracketed unit ('POA (%)', 'Irradiance [kW]') or any per-area token that
 * is not watts per m² ('Insolation (kWh/m2)', 'GHI kW/m²'). The bracket
 * parser (`splitLabelUnit`) doesn't know per-area units, so without this a
 * unitless 'Insolation (kWh/m2)' would be rounded as irradiance.
 */
const nameStatesOtherUnit = (name: string): boolean => {
  for (const m of name.matchAll(NAME_BRACKET_RE)) {
    const u = normalizeUnit(m[1]);
    const known = parseScalable(u) !== null || canonicalOtherUnit(u) !== undefined;
    if (known && u !== IRRADIANCE_UNIT) return true;
  }
  for (const m of name.matchAll(NAME_PER_AREA_RE)) {
    if (normalizeUnit(`${m[1]}/m2`) !== IRRADIANCE_UNIT) return true;
  }
  return false;
};

/**
 * THE irradiance predicate — every screen that prints a reading asks this
 * one function (via `formatQuantity`), so an irradiance value reads the
 * same everywhere.
 *
 *  - unit normalises to W/m² (any spelling — see IRRADIANCE_UNIT_RE) → true
 *  - any OTHER stated unit → false: a name never overrides the unit, so
 *    'POA Insolation' in kWh/m² or a POA temperature in °C keeps its decimals
 *  - no unit → true when the name says irradiance / POA / GHI / GTI /
 *    insolation as a whole word, is not a temperature, and does not itself
 *    state another unit ('Insolation (kWh/m2)' keeps its decimals)
 */
export const isIrradiance = (unit?: string | null, name?: string | null): boolean => {
  const u = normalizeUnit(unit);
  if (u !== '') return u === IRRADIANCE_UNIT;
  if (typeof name !== 'string') return false;
  return (
    IRRADIANCE_NAME_RE.test(name) &&
    !TEMPERATURE_NAME_RE.test(name) &&
    !nameStatesOtherUnit(name)
  );
};

/** Fraction digits an irradiance reading prints with (product decision). */
export const IRRADIANCE_DECIMALS = 0;

/** Unit as a screen reader should say it ('kWh' → 'kilowatt hours'). */
export const spokenUnit = (unit: string): string => {
  const u = normalizeUnit(unit);
  if (u === '') return '';
  const parsed = parseScalable(u);
  if (parsed) return PREFIX_WORDS[parsed.prefixIndex] + BASE_WORDS[parsed.base];
  return OTHER_SPOKEN[u] ?? u;
};

/**
 * Common display scale for a SET of values (chart axis, legend, list):
 * steps the prefix up until `maxAbs / divisor < 1000`. Non-scalable units
 * return divisor 1.
 */
export const pickScale = (
  maxAbs: number,
  unit: string,
): { unit: string; divisor: number } => {
  const u = normalizeUnit(unit);
  const parsed = parseScalable(u);
  if (!parsed || !Number.isFinite(maxAbs)) return { unit: u, divisor: 1 };
  let idx = parsed.prefixIndex;
  let divisor = 1;
  while (Math.abs(maxAbs) / divisor >= 1000 && idx < PREFIXES.length - 1) {
    divisor *= 1000;
    idx += 1;
  }
  return { unit: PREFIXES[idx] + parsed.base, divisor };
};

/**
 * Split a trailing '(unit)' / '[unit]' off a backend label, but only when
 * the bracket holds a recognised unit — 'Inverter (Block A)' is left alone.
 *   'Active Power (kW)' → { label: 'Active Power', unit: 'kW' }
 */
export const splitLabelUnit = (label: string): { label: string; unit: string | null } => {
  const trimmed = label.trim();
  const m = /^(.*?)\s*[([]\s*([^()[\]]{1,12}?)\s*[)\]]\s*$/.exec(trimmed);
  if (!m || m[1].trim() === '') return { label: trimmed, unit: null };
  const candidate = m[2];
  const known =
    parseScalable(candidate) !== null || canonicalOtherUnit(candidate) !== undefined;
  if (!known) return { label: trimmed, unit: null };
  return { label: m[1].trim(), unit: normalizeUnit(candidate) };
};

/* ─────────── number formatting ─────────── */

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const fmtCache = new Map<number, Intl.NumberFormat>();
/** en-US grouped formatter with exactly `decimals` fraction digits. */
const fixedFormatter = (decimals: number): Intl.NumberFormat => {
  let f = fmtCache.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fmtCache.set(decimals, f);
  }
  return f;
};

/** Strip a negative zero ('-0.00' → '0.00'). */
const noNegZero = (s: string): string => (/^-0(\.0+)?$/.test(s) ? s.slice(1) : s);

const TINY_POSITIVE = '<0.001';
const TINY_NEGATIVE = '>-0.001';

/** `x` rounded to 3 significant digits (as a number) — used to decide
 *  whether rounding rolls a value over into the next prefix. */
const round3 = (x: number): number => (x === 0 ? 0 : Number(x.toPrecision(3)));

/**
 * |reading| at or above which a device value is physically implausible
 * (Lucky Cement's daily wind energy came back as ~4e31 and ~-1.2e35 on
 * 2026-10-01). DETECTION ONLY — such a value is never hidden, clamped or
 * dropped (user rule: show garbage exactly as the device sent it, like
 * the web). It is only WRITTEN in 'e' notation, because in full it is a
 * 30–50-digit string a tile can only truncate into a wrong-looking number,
 * and charts may add a "shown as sent by the device" note. Shared by the
 * Live tab, Cards, SLD, Dashboard chips, Reports and the chart note.
 */
export const SUSPECT_READING_ABS = 1e15;

/** True for a finite reading at or above {@link SUSPECT_READING_ABS}. */
export const isSuspectReading = (v: number): boolean =>
  Number.isFinite(v) && Math.abs(v) >= SUSPECT_READING_ABS;

/** '2.66e36' / '-1.2e35' — 3 significant digits, no '+', no trailing zeros. */
export const formatScientific = (v: number): string => {
  const [mantissa, exp] = v.toExponential(2).split('e');
  return `${mantissa.replace(/\.?0+$/, '')}e${Number(exp)}`;
};

/**
 * Three-significant-digit text: '850', '15.6', '1.05', '0.987'. Integers
 * below 1000 print as-is ('17', '5'); magnitudes ≥ 1000 (only reachable for
 * non-scalable units or past the top prefix) print grouped with no
 * decimals ('12,345'). A non-zero magnitude below 0.001 prints as
 * '<0.001' / '>-0.001' — never a false-precision '0.000' that would read
 * like a real zero (which prints '0').
 */
export const formatSig3 = (x: number): string => {
  if (!Number.isFinite(x)) return MISSING_TEXT;
  if (x === 0) return '0';
  if (isSuspectReading(x)) return formatScientific(x);
  if (Math.abs(round3(x)) >= 1000) return noNegZero(fixedFormatter(0).format(x));
  if (Number.isInteger(x)) return String(x);
  if (Math.abs(x) < 0.001) return x > 0 ? TINY_POSITIVE : TINY_NEGATIVE;
  return noNegZero(x.toPrecision(3));
};

const MISSING: FormattedQuantity = Object.freeze({
  text: MISSING_TEXT,
  unit: '',
  spoken: 'no data',
  isMissing: true,
  value: null,
}) as FormattedQuantity;

const spokenNumber = (text: string): string => {
  if (text === TINY_POSITIVE) return 'less than 0.001';
  if (text === TINY_NEGATIVE) return 'between minus 0.001 and 0';
  return text.startsWith('-') ? `minus ${text.slice(1)}` : text;
};

/**
 * Format a value + unit for display. Non-numeric input ('NA', null, '',
 * NaN) → `{ text: '—', unit: '', isMissing: true, spoken: 'no data' }`;
 * a real 0 is a value ('0 kWh'). An irradiance reading (`isIrradiance(unit,
 * opts.name)`) prints as a grouped whole number in either mode.
 */
export const formatQuantity = (
  value: unknown,
  unit?: string | null,
  opts: FormatQuantityOptions = {},
): FormattedQuantity => {
  const num = toFiniteNumber(value);
  if (num === null) return MISSING;
  const mode = opts.mode ?? 'compact';
  const u = normalizeUnit(unit);
  const parsed = opts.rescale === false ? null : parseScalable(u);

  let scaled = num;
  let idx = parsed?.prefixIndex ?? 0;
  let text: string;

  if (isSuspectReading(num)) {
    // A garbage reading is shown, never hidden — in 'e' notation in the
    // backend's own unit (no prefix rescaling of a value nobody can trust).
    text = formatScientific(num);
  } else if (isIrradiance(u, opts.name)) {
    // W/m² is never rescaled (not a scalable family) — just round.
    text = noNegZero(fixedFormatter(IRRADIANCE_DECIMALS).format(num));
  } else if (mode === 'precise') {
    const decimals = Math.max(0, Math.min(6, opts.decimals ?? 2));
    const f = fixedFormatter(decimals);
    if (parsed && Math.abs(num) >= 10_000) {
      while (
        Math.abs(Number(scaled.toFixed(decimals))) >= 1000 &&
        idx < PREFIXES.length - 1
      ) {
        scaled /= 1000;
        idx += 1;
      }
    }
    text = noNegZero(f.format(scaled));
  } else {
    if (parsed) {
      while (Math.abs(round3(scaled)) >= 1000 && idx < PREFIXES.length - 1) {
        scaled /= 1000;
        idx += 1;
      }
    }
    text = formatSig3(scaled);
  }

  const displayUnit = parsed ? PREFIXES[idx] + parsed.base : u;
  const spokenU = displayUnit ? spokenUnit(displayUnit) : '';
  return {
    text,
    unit: displayUnit,
    spoken: spokenU ? `${spokenNumber(text)} ${spokenU}` : spokenNumber(text),
    isMissing: false,
    value: num,
  };
};

/** `formatQuantity` for a value the backend reports in kWh. */
export const formatEnergy = (
  kWh: unknown,
  opts?: FormatQuantityOptions,
): FormattedQuantity => formatQuantity(kWh, 'kWh', opts);
