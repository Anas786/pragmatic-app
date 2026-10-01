import { ReportFilter } from 'src/networking';
import { ReportMapping } from 'src/types';
import { formatDateRange, formatMonthYear, MONTHS_LONG, MONTHS_SHORT } from './dates';

/**
 * Period-filter helpers shared by every "report-style" card on the
 * SiteDetail screen (Inverter Table, Performance Report, …). Lives here
 * so each card uses identical math when translating its `(activeFilter,
 * startDate, endDate)` UI state into the discriminated `ReportFilter`
 * payload the networking layer expects.
 */

/** Epoch-ms for 00:00:00.000 of the given calendar day. */
export const startOfDayMs = (d: Date): number => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

/** Epoch-ms for 23:59:59.999 of the given calendar day. */
export const endOfDayMs = (d: Date): number => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.getTime();
};

/**
 * Returns "now minus N calendar days" as a fresh `Date`. Used to seed
 * the default Custom-filter range across every Trend / Report card so
 * "open the screen, see the last two weeks" works without the user
 * having to touch the date picker.
 *
 * Pass `0` to get a copy of "now"; negative values shift forward.
 */
export const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/**
 * Maximum inclusive span (in calendar days) the report Custom range can
 * cover. MUST stay in lockstep with `DateRangePickerModal`'s default
 * `MAX_RANGE_DAYS` (counted as *additional* days after the start day,
 * i.e. `REPORT_CUSTOM_MAX_DAYS - 1` = 30) — the picker greys out anything
 * past that cap and its caption reads "Max range: N days".
 *
 * Mirrors the `TREND_CUSTOM_MAX_DAYS` / `TREND_CUSTOM_MAX_RANGE` parity
 * pattern in `src/utils/trends.ts`.
 */
export const REPORT_CUSTOM_MAX_DAYS = 31;

/**
 * Default span used to seed the Custom filter on every Report card:
 * `start = daysAgo(DEFAULT_CUSTOM_RANGE_DAYS)`, `end = today` — an
 * inclusive `REPORT_CUSTOM_MAX_DAYS`-day window. Derived from the cap
 * (cap − 1 additional days) so the default range is always exactly
 * reproducible inside the picker.
 */
export const DEFAULT_CUSTOM_RANGE_DAYS = REPORT_CUSTOM_MAX_DAYS - 1;

/**
 * The four UI pill labels both Reports cards expose. Kept as a `string`
 * union here (rather than re-importing the `InverterFilterOption` mock
 * type) so this util has no dependency on `src/data/mock`.
 */
export type ReportPeriodPill = 'Custom' | 'Month' | 'Year' | 'Life Time';

/**
 * Convert a UI pill + custom date range into the discriminated
 * `ReportFilter` shape that `getInverterReport` / `getEnergyReport` send
 * as query params.
 *
 *  - `Custom`   → start/end clamped to the selected calendar days
 *  - `Month`    → current month + year (1-12 / YYYY)
 *  - `Year`     → current year (YYYY)
 *  - `Life Time` → no time-scope params, only `type=` is sent
 */
/** A specific calendar month (1–12) within a year — used by the
 *  Month-filter picker to drive the API's `month` + `year` params. */
export interface MonthSelection {
  /** 1-based month: 1 = January … 12 = December. */
  month: number;
  year: number;
}

export const buildReportFilter = (
  pill: ReportPeriodPill | string,
  startDate: Date,
  endDate: Date,
  selectedMonth?: MonthSelection,
  selectedYear?: number,
): ReportFilter => {
  const now = new Date();
  switch (pill) {
    case 'Month': {
      const month = selectedMonth?.month ?? now.getMonth() + 1;
      const year = selectedMonth?.year ?? now.getFullYear();
      return { kind: 'month', month, year };
    }
    case 'Year':
      return { kind: 'year', year: selectedYear ?? now.getFullYear() };
    case 'Life Time':
      return { kind: 'lifeTime' };
    case 'Custom':
    default:
      return {
        kind: 'custom',
        start: startOfDayMs(startDate),
        end: endOfDayMs(endDate),
      };
  }
};

/**
 * Short x-axis label for one report bucket (epoch-ms `time`, local time):
 *   - Custom    → day + month   ("1 Sep")
 *   - Month     → day           ("1" … "30")  — every bar shares the month
 *   - Year      → short month   ("Sep")       — bars are months
 *   - Life Time → year          ("2026")      — bars are years
 * Month names come from the fixed `MONTHS_SHORT` table (identical on
 * Hermes and in Jest). DD/MM is never used.
 */
export const formatChartLabel = (
  epochMs: number,
  pill: ReportPeriodPill | string,
): string => {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  switch (pill) {
    case 'Month':
      return String(d.getDate());
    case 'Year':
      return MONTHS_SHORT[d.getMonth()];
    case 'Life Time':
      return String(d.getFullYear());
    case 'Custom':
    default:
      return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  }
};

/**
 * Full name of one report bucket — the chart tooltip header and the
 * screen-reader summary, where the short axis label ("1", "Sep") would be
 * ambiguous:
 *   - Custom / Month → "1 Sep 2026"
 *   - Year           → "September 2026"
 *   - Life Time      → "2026"
 */
export const formatBucketLabel = (
  epochMs: number,
  pill: ReportPeriodPill | string,
): string => {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  switch (pill) {
    case 'Year':
      return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
    case 'Life Time':
      return String(d.getFullYear());
    case 'Month':
    case 'Custom':
    default:
      return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  }
};

/**
 * Period label for the header date pill AND the hero period badge (one
 * formatter, so they always agree):
 *   - Custom    → "1 Sep – 1 Oct 2026" / "1 – 30 Sep 2026" (`formatDateRange`)
 *   - Month     → "September 2026"                      (`formatMonthYear`)
 *   - Year      → "2026"
 *   - Life Time → "Lifetime"  ('Life Time' is only the internal switch key)
 * Consumed through `useDateFilter`, so Reports, Tables and any other
 * report-style card read the same.
 */
export const formatDateFilterLabel = (
  pill: ReportPeriodPill | string,
  startDate: Date,
  endDate: Date,
  selectedMonth?: MonthSelection,
  selectedYear?: number,
): string => {
  const now = new Date();
  switch (pill) {
    case 'Month':
      return formatMonthYear({
        month: selectedMonth?.month ?? now.getMonth() + 1,
        year: selectedMonth?.year ?? now.getFullYear(),
      });
    case 'Year':
      return String(selectedYear ?? now.getFullYear());
    case 'Life Time':
      return 'Lifetime';
    case 'Custom':
    default:
      return formatDateRange(startDate, endDate);
  }
};

/**
 * Muted outage caption under the energy chart: "1 day with no production",
 * "3 months with no production" (Year), "2 years …" (Life Time). `null`
 * when no bucket totalled exactly 0.
 */
export const formatNoProductionCaption = (
  zeroBuckets: number,
  pill: ReportPeriodPill | string,
): string | null => {
  if (!Number.isFinite(zeroBuckets) || zeroBuckets <= 0) return null;
  const noun = pill === 'Year' ? 'month' : pill === 'Life Time' ? 'year' : 'day';
  return `${zeroBuckets} ${noun}${zeroBuckets === 1 ? '' : 's'} with no production`;
};

/**
 * Resolve a UI label for a backend column code via the report-mapping
 * config. Each mapping entry is shaped like:
 *
 *   "ed_grid": {
 *     "display": "Grid Production (kWh)",
 *     "ingestName": "ed_grid"
 *   }
 *
 * Falls back to the supplied default whenever the mapping is missing,
 * the entry isn't an object, or `display` isn't a non-empty string —
 * keeps the UI rendering safe even before the public report-mapping
 * cache has hydrated.
 */
export const resolveReportLabel = (
  mapping: ReportMapping | undefined | null,
  key: string,
  fallback: string,
): string => {
  if (!mapping || typeof mapping !== 'object') return fallback;
  const entry = (mapping as Record<string, unknown>)[key];
  if (!entry || typeof entry !== 'object') return fallback;
  const display = (entry as Record<string, unknown>).display;
  if (typeof display === 'string' && display.length > 0) return display;
  return fallback;
};
