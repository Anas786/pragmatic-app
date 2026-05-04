import { ReportFilter } from 'src/networking';
import { ReportMapping } from 'src/types';

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
 * "open the screen, see the last 15 days" works without the user
 * having to touch the date picker.
 *
 * Pass `0` to get a copy of "now"; negative values shift forward.
 */
export const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/** Default span (in days) used by the Custom filter on every Trend / Report card. */
export const DEFAULT_CUSTOM_RANGE_DAYS = 15;

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
 * Format an epoch-ms `time` field for the bar chart x-axis based on
 * the active filter:
 *   - Custom    → DD/MM         ("20/04")
 *   - Month     → DD            ("20")        — all bars share a month
 *   - Year      → short month   ("Apr")       — bars are months
 *   - Life Time → year          ("2024")      — bars are years
 */
export const formatChartLabel = (
  epochMs: number,
  pill: ReportPeriodPill | string,
): string => {
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  switch (pill) {
    case 'Month':
      return dd;
    case 'Year':
      return d.toLocaleString('default', { month: 'short' });
    case 'Life Time':
      return String(d.getFullYear());
    case 'Custom':
    default:
      return `${dd}/${mm}`;
  }
};

/**
 * Format a date pill string for the header based on the active
 * filter. Mirrors the picker semantics:
 *   - Custom    → "DD/MM/YY - DD/MM/YY"
 *   - Month     → "April 2026"
 *   - Year      → "2026"
 *   - Life Time → "Lifetime"
 */
export const formatDateFilterLabel = (
  pill: ReportPeriodPill | string,
  startDate: Date,
  endDate: Date,
  selectedMonth?: MonthSelection,
  selectedYear?: number,
): string => {
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const pad4 = (n: number) => String(n).padStart(4, '0').slice(-2);
  const fmtDate = (d: Date) =>
    `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${pad4(d.getFullYear())}`;

  const now = new Date();
  switch (pill) {
    case 'Month': {
      const month = selectedMonth?.month ?? now.getMonth() + 1;
      const year = selectedMonth?.year ?? now.getFullYear();
      const date = new Date(year, month - 1, 1);
      return `${date.toLocaleString('default', { month: 'long' })} ${year}`;
    }
    case 'Year':
      return String(selectedYear ?? now.getFullYear());
    case 'Life Time':
      return 'Lifetime';
    case 'Custom':
    default:
      return `${fmtDate(startDate)} - ${fmtDate(endDate)}`;
  }
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
