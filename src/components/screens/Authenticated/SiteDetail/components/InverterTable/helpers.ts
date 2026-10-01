import type { InverterReportRow } from 'src/networking';
import type { InverterEntryData } from 'src/data/mock';
import type { ReportMapping } from 'src/types';
import { numericCardValue } from 'src/utils/sources';
import { resolveReportLabel } from 'src/utils/reports';
import {
  formatEnergy,
  formatQuantity,
  FormattedQuantity,
  MISSING_TEXT,
  pickScale,
  splitLabelUnit,
  spokenUnit,
} from 'src/utils/units';
import { PrStatus, statusFor } from 'src/utils/colors';

/**
 * Pure view-model for the Tables tab ("Inverter fleet"). Every value is
 * the backend's `inverter_queries` row as-is (ed_solar / pr / up_percent /
 * yield — the same fields and the same values the web portal's Inverter
 * Table shows); this module only parses, ranks and formats them.
 *
 * Missing vs zero: a field the backend didn't send ('NA', null, '') stays
 * `null` — excluded from the fleet stats, still rendered as a row with
 * '—' and a neutral 'No data' status. A real 0 is a value: it counts in
 * the average, can be the worst inverter, and flags the row as offline.
 */

export { statusFor } from 'src/utils/colors';
export type { PrStatus, StatusKey } from 'src/utils/colors';

/** Entrance stagger per row (first `ANIM_LIMIT` rows only). */
export const STAGGER_MS = 40;
/** Rows past this index share the last stagger slot (capped delay). */
export const STAGGER_CAP = 6;
/** Only rows below this index get an entrance / bar animation. */
export const ANIM_LIMIT = 10;
/** PR mini-bar fill duration. */
export const BAR_ANIM_MS = 600;
/** Fixed width of the per-row PR mini bar (pt). */
export const MINI_BAR_W = 56;

/**
 * Rows revealed per frame by InverterTableCard's chunked progressive
 * mount (same rAF-counter convention as LiveParameterView — the list
 * can't virtualise inside SiteDetail's ScrollView, so an unbounded
 * fleet must not land in one Fabric commit). Kept ≥ ANIM_LIMIT so the
 * first chunk still carries the full entrance stagger.
 */
export const MOUNT_CHUNK = 12;

/** Uptime at or above this reads as normal (textSecondary). */
export const UPTIME_OK_PCT = 98;
/** Uptime at or above this (and below OK) is a warning; below is danger. */
export const UPTIME_WARN_PCT = 90;

export interface InverterEntry extends InverterEntryData {
  /** Unique React key, stable across period changes and re-sorts. */
  key: string;
  /** Parsed inverter number, or null when the id isn't numeric. */
  num: number | null;
  /** Text inside the number badge ('3', or '—'). */
  badge: string;
}

/**
 * Map raw report rows into entries. The backend ships numerics
 * inconsistently (numbers OR numeric strings — CLAUDE.md §14), so every
 * numeric field goes through `numericCardValue`; anything unparseable is
 * `null`, never 0.
 */
export const mapRowsToEntries = (rows: readonly InverterReportRow[]): InverterEntry[] => {
  const seen = new Map<string, number>();
  return rows.map((row, i) => {
    const raw = row?.inverter_num;
    const rawText = raw === null || raw === undefined ? '' : String(raw).trim();
    const num = numericCardValue(rawText);
    const base = rawText === '' ? `#${i}` : rawText;
    const dup = seen.get(base) ?? 0;
    seen.set(base, dup + 1);
    const title =
      rawText === '' ? 'Inverter —' : num !== null ? `Inverter ${rawText}` : rawText;
    return {
      key: dup === 0 ? `inv-${base}` : `inv-${base}-${dup}`,
      num,
      badge: num !== null ? rawText : MISSING_TEXT,
      title,
      production: numericCardValue(row?.ed_solar),
      yield: numericCardValue(row?.yield),
      performanceRatio: numericCardValue(row?.pr),
      uptimePercent: numericCardValue(row?.up_percent),
    };
  });
};

/* ─────────────── fleet stats ─────────────── */

export interface FleetStats {
  /** Every inverter row, including ones with no PR. */
  count: number;
  /** Inverters with a PR value (0 included). */
  prCount: number;
  /** Mean PR over `prCount` inverters; null when none reported a PR. */
  avgPr: number | null;
  best: InverterEntry | null;
  worst: InverterEntry | null;
  /** Inverters with a PR of 0 or an uptime of 0. */
  offlineCount: number;
  /** Sum of production (kWh) over inverters that reported it. */
  totalProduction: number | null;
}

/**
 * Fleet aggregates over NON-NULL values, with 0 included — the same mean
 * the web portal's 'Avg PR' shows. Ties keep the first inverter in report
 * order.
 */
export const computeFleetStats = (entries: readonly InverterEntry[]): FleetStats => {
  let prSum = 0;
  let prCount = 0;
  let best: InverterEntry | null = null;
  let bestPr = -Infinity;
  let worst: InverterEntry | null = null;
  let worstPr = Infinity;
  let offlineCount = 0;
  let total = 0;
  let hasProduction = false;

  for (const e of entries) {
    const pr = e.performanceRatio;
    if (pr !== null) {
      prSum += pr;
      prCount += 1;
      if (pr > bestPr) {
        best = e;
        bestPr = pr;
      }
      if (pr < worstPr) {
        worst = e;
        worstPr = pr;
      }
    }
    if (pr === 0 || e.uptimePercent === 0) offlineCount += 1;
    if (e.production !== null) {
      total += e.production;
      hasProduction = true;
    }
  }

  return {
    count: entries.length,
    prCount,
    avgPr: prCount > 0 ? prSum / prCount : null,
    best,
    worst,
    offlineCount,
    totalProduction: hasProduction ? total : null,
  };
};

/* ─────────────── sorting ─────────────── */

export type InverterSortMode = 'worst' | 'number' | 'energy';

export const DEFAULT_INVERTER_SORT: InverterSortMode = 'worst';

export const INVERTER_SORT_OPTIONS: ReadonlyArray<{ mode: InverterSortMode; label: string }> = [
  { mode: 'worst', label: 'Worst first' },
  { mode: 'number', label: 'Number' },
  { mode: 'energy', label: 'Energy' },
];

/** Ascending by a nullable key; nulls always last. */
const nullsLast = (a: number | null, b: number | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
};

const byNumber = (a: InverterEntry, b: InverterEntry): number =>
  nullsLast(a.num, b.num) || a.title.localeCompare(b.title, 'en', { numeric: true });

/**
 * A NEW array in the requested order (stable; the input is untouched):
 *  - 'worst'  — lowest PR first, inverters without a PR last;
 *  - 'number' — inverter number ascending (non-numeric ids last);
 *  - 'energy' — highest production first, missing production last.
 * Ties fall back to inverter number, then report order.
 */
export const sortEntries = (
  entries: readonly InverterEntry[],
  mode: InverterSortMode,
): InverterEntry[] => {
  const primary = (a: InverterEntry, b: InverterEntry): number => {
    switch (mode) {
      case 'worst':
        return nullsLast(a.performanceRatio, b.performanceRatio);
      case 'energy':
        return nullsLast(
          a.production === null ? null : -a.production,
          b.production === null ? null : -b.production,
        );
      case 'number':
      default:
        return 0;
    }
  };
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort(
      (x, y) => primary(x.entry, y.entry) || byNumber(x.entry, y.entry) || x.index - y.index,
    )
    .map(x => x.entry);
};

/* ─────────────── yield label / unit ─────────────── */

export interface YieldMeta {
  /** Label without its unit ('Yield', or the fallback 'Specific yield'). */
  label: string;
  /** Unit from the report mapping ('kWh/kWp'); null when it gives none. */
  unit: string | null;
  /** The unit as a screen reader should say it. */
  spokenUnit: string;
}

/** Trailing '(a/b)' ratio unit — 'Yield (kWh/kWp)'. */
const RATIO_UNIT_RE = /^(.*?)\s*[([]\s*([A-Za-z°%²³]+(?:\s*\/\s*[A-Za-z°%²³]+)+)\s*[)\]]\s*$/;

const PEAK_WORDS: Record<string, string> = {
  wp: 'watt peak',
  kwp: 'kilowatt peak',
  mwp: 'megawatt peak',
};

const spokenUnitPart = (part: string): string =>
  PEAK_WORDS[part.toLowerCase()] ?? (spokenUnit(part) || part);

/** 'kWh/kWp' → 'kilowatt hours per kilowatt peak'. */
export const spokenRatioUnit = (unit: string): string =>
  unit
    .split('/')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(spokenUnitPart)
    .join(' per ');

/**
 * Split a report-mapping display label into label + unit. Uses
 * `splitLabelUnit` first (recognised units), then accepts a trailing
 * ratio unit such as '(kWh/kWp)' exactly as the mapping spells it. A
 * label without a bracketed unit yields `unit: null` — no unit is ever
 * invented.
 */
export const parseYieldLabel = (display: string): { label: string; unit: string | null } => {
  const split = splitLabelUnit(display);
  if (split.unit) return split;
  const m = RATIO_UNIT_RE.exec(display.trim());
  if (m && m[1].trim() !== '') {
    return { label: m[1].trim(), unit: m[2].replace(/\s+/g, '') };
  }
  return { label: display.trim(), unit: null };
};

export const YIELD_FALLBACK_LABEL = 'Specific yield';

/** Yield label + unit from `/public/config/report-mapping` ('yield'). */
export const resolveYieldMeta = (mapping: ReportMapping | undefined | null): YieldMeta => {
  const { label, unit } = parseYieldLabel(
    resolveReportLabel(mapping, 'yield', YIELD_FALLBACK_LABEL),
  );
  return { label, unit, spokenUnit: unit ? spokenRatioUnit(unit) : '' };
};

/* ─────────────── number formatting ─────────────── */

/**
 * '77.2%' / '100%' / '0%' — `decimals` fraction digits with trailing
 * zeros trimmed (like the web portal's '81 %'); '—' when missing.
 */
export const formatPercentValue = (value: number | null, decimals = 1): string => {
  if (value === null || !Number.isFinite(value)) return MISSING_TEXT;
  const fixed = value.toFixed(decimals);
  const trimmed = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return Number(trimmed) === 0 ? '0' : trimmed;
};

export const formatPercent = (value: number | null, decimals = 1): string => {
  const text = formatPercentValue(value, decimals);
  return text === MISSING_TEXT ? text : `${text}%`;
};

const spokenPercent = (value: number | null): string => {
  const text = formatPercentValue(value);
  if (text === MISSING_TEXT) return 'no data';
  return `${text.startsWith('-') ? `minus ${text.slice(1)}` : text} percent`;
};

export interface ProductionScale {
  /** One display unit for the whole list ('MWh'). */
  unit: string;
  /** kWh → `unit` divisor. */
  divisor: number;
  /** Fraction digits: 1, or 2 when the largest value is a single digit. */
  decimals: number;
}

/**
 * ONE unit for every row (pickScale on the largest production), so rows
 * compare at a glance — never '9,876.0 kWh' next to '10.2 MWh'. Precise,
 * one decimal; two when the biggest value is below 10 in that unit, so a
 * lifetime list keeps three significant digits ('7.07 GWh'). The one
 * exception is a non-zero value too small for that unit — see
 * `formatProduction`.
 */
export const productionScale = (entries: readonly InverterEntry[]): ProductionScale => {
  let maxAbs = 0;
  for (const e of entries) {
    if (e.production !== null) maxAbs = Math.max(maxAbs, Math.abs(e.production));
  }
  const { unit, divisor } = pickScale(maxAbs, 'kWh');
  const scaledMax = maxAbs / divisor;
  return { unit, divisor, decimals: scaledMax > 0 && scaledMax < 10 ? 2 : 1 };
};

/** True when a NON-zero value prints as zero at `decimals` ('0.0'). */
const roundsToZero = (x: number, decimals: number): boolean =>
  x !== 0 && Number(Math.abs(x).toFixed(decimals)) === 0;

/**
 * One production value (kWh) in the list's shared scale. A non-zero value
 * that would round to zero there (a tripped inverter's 30 kWh beside a
 * 15.5 MWh one → '0.0 MWh') would read exactly like a real 0, so it keeps
 * its own unit instead: precise kWh, one decimal ('30.0 kWh'), or three
 * significant digits when even that rounds to zero ('0.0234 kWh'). Missing,
 * zero and small stay distinguishable on screen and in speech.
 */
export const formatProduction = (kWh: number | null, scale: ProductionScale): FormattedQuantity => {
  if (kWh === null) return formatEnergy(null);
  if (!roundsToZero(kWh / scale.divisor, scale.decimals)) {
    return formatQuantity(kWh / scale.divisor, scale.unit, {
      mode: 'precise',
      decimals: scale.decimals,
      rescale: false,
    });
  }
  return roundsToZero(kWh, 1)
    ? formatEnergy(kWh)
    : formatEnergy(kWh, { mode: 'precise', decimals: 1 });
};

/** '1 inverter' / '8 inverters'. */
export const inverterCountLabel = (n: number): string => `${n} inverter${n === 1 ? '' : 's'}`;

/** '1 Sep – 1 Oct 2026' → '1 Sep to 1 Oct 2026' for screen readers. */
export const spokenPeriodLabel = (periodLabel: string): string =>
  periodLabel.replace(/\s*–\s*/g, ' to ');

/* ─────────────── uptime ─────────────── */

export type UptimeTone = 'normal' | 'warning' | 'danger' | 'missing';

/** ≥ 98 normal, 90–98 warning, < 90 danger, null missing. */
export const uptimeTone = (uptime: number | null): UptimeTone => {
  if (uptime === null || !Number.isFinite(uptime)) return 'missing';
  if (uptime >= UPTIME_OK_PCT) return 'normal';
  if (uptime >= UPTIME_WARN_PCT) return 'warning';
  return 'danger';
};

/* ─────────────── row view-model ─────────────── */

export interface InverterRowModel {
  key: string;
  badge: string;
  title: string;
  /** '15.5 MWh · 4.96 kWh/kWp'. */
  secondary: string;
  status: PrStatus;
  /** '77.2%' or '—'. */
  prText: string;
  /** PR bar fill, 0–1 (0 when the PR is missing). */
  barFraction: number;
  /** 'Up 100%' / 'Up —'. */
  uptimeText: string;
  uptimeTone: UptimeTone;
  /** ONE composed screen-reader label for the whole row. */
  a11yLabel: string;
}

const clamp01 = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x);

export const buildInverterRow = (
  entry: InverterEntry,
  scale: ProductionScale,
  yieldMeta: YieldMeta,
): InverterRowModel => {
  const status = statusFor(entry.performanceRatio);
  const production = formatProduction(entry.production, scale);
  const yieldQ = formatQuantity(entry.yield, null, { mode: 'precise', decimals: 2 });

  const productionText = production.isMissing
    ? MISSING_TEXT
    : `${production.text} ${production.unit}`;
  let yieldText: string;
  if (yieldQ.isMissing) yieldText = `${yieldMeta.label} ${MISSING_TEXT}`;
  else if (yieldMeta.unit) yieldText = `${yieldQ.text} ${yieldMeta.unit}`;
  else yieldText = `${yieldMeta.label} ${yieldQ.text}`;

  const yieldSpoken = yieldQ.isMissing
    ? `${yieldMeta.label}, no data`
    : [yieldMeta.label, yieldQ.spoken, yieldMeta.spokenUnit].filter(s => s !== '').join(' ');

  const a11yLabel = [
    entry.title,
    status.role ? status.label.toLowerCase() : 'no performance data',
    entry.performanceRatio !== null
      ? `performance ratio ${spokenPercent(entry.performanceRatio)}`
      : '',
    `uptime ${spokenPercent(entry.uptimePercent)}`,
    production.isMissing ? 'production, no data' : production.spoken,
    yieldSpoken,
  ]
    .filter(part => part !== '')
    .join(', ');

  return {
    key: entry.key,
    badge: entry.badge,
    title: entry.title,
    secondary: `${productionText} · ${yieldText}`,
    status,
    prText: formatPercent(entry.performanceRatio),
    barFraction: entry.performanceRatio === null ? 0 : clamp01(entry.performanceRatio / 100),
    uptimeText: `Up ${formatPercent(entry.uptimePercent)}`,
    uptimeTone: uptimeTone(entry.uptimePercent),
    a11yLabel,
  };
};

/** Row models for an (already sorted) list — formatted once per fetch/sort. */
export const buildInverterRows = (
  entries: readonly InverterEntry[],
  yieldMeta: YieldMeta,
): InverterRowModel[] => {
  const scale = productionScale(entries);
  return entries.map(e => buildInverterRow(e, scale, yieldMeta));
};

/* ─────────────── hero view-model ─────────────── */

export interface FleetAggregate {
  title: string;
  prText: string;
  a11yLabel: string;
}

export interface FleetHeroModel {
  /** '9 inverters'. */
  countLabel: string;
  /** '78.1' (the '%' renders separately); null → 'No PR data for this period'. */
  avgText: string | null;
  avgStatus: PrStatus;
  avgA11yLabel: string;
  /** Only when ≥ 2 inverters reported a PR (one inverter is both). */
  best: FleetAggregate | null;
  worst: FleetAggregate | null;
  /** '1 inverter' when any PR or uptime is 0, else null. */
  offlineText: string | null;
  offlineA11yLabel: string | null;
  total: FormattedQuantity;
  totalA11yLabel: string;
}

const aggregate = (kind: string, entry: InverterEntry | null): FleetAggregate | null => {
  if (!entry) return null;
  return {
    title: entry.title,
    prText: formatPercent(entry.performanceRatio),
    a11yLabel: `${kind}, ${entry.title}, ${spokenPercent(entry.performanceRatio)}`,
  };
};

export const buildFleetHero = (stats: FleetStats): FleetHeroModel => {
  const avgStatus = statusFor(stats.avgPr);
  const countLabel = inverterCountLabel(stats.count);
  const avgA11yLabel =
    stats.avgPr === null
      ? `Average performance ratio, no data for this period, ${countLabel}`
      : [
          'Average performance ratio',
          spokenPercent(stats.avgPr),
          avgStatus.label.toLowerCase(),
          `across ${inverterCountLabel(stats.prCount)}`,
        ].join(', ');
  const hasPair = stats.prCount >= 2;
  const offlineText = stats.offlineCount > 0 ? inverterCountLabel(stats.offlineCount) : null;
  const total = formatEnergy(stats.totalProduction);
  return {
    countLabel,
    avgText: stats.avgPr === null ? null : formatPercentValue(stats.avgPr),
    avgStatus,
    avgA11yLabel,
    best: hasPair ? aggregate('Best', stats.best) : null,
    worst: hasPair ? aggregate('Worst', stats.worst) : null,
    offlineText,
    offlineA11yLabel: offlineText
      ? `Offline or zero performance ratio, ${offlineText}`
      : null,
    total,
    totalA11yLabel: `Total production, ${
      total.isMissing
        ? 'no data'
        : formatEnergy(stats.totalProduction, { mode: 'precise', decimals: 0, rescale: false })
            .spoken
    }`,
  };
};
