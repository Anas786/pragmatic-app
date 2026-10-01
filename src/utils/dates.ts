/**
 * Calendar-safe date arithmetic + the app's ONE date-display vocabulary.
 *
 * Centralised here so every component that needs day-boundary math uses
 * the same JS `setDate` rollover behaviour (e.g. 30 Jan + 5 days → 4 Feb),
 * and every date the user sees reads the same way ('28 Sep',
 * '1 – 30 Sep 2026', 'September 2026'). DD/MM/YY is not used anywhere.
 *
 * Month names are a fixed English table rather than `Intl` so the output
 * is identical on Hermes iOS/Android and in Jest (ICU builds disagree on
 * e.g. 'Sep' vs 'Sept').
 */

export const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** En dash with thin spacing — the range separator used app-wide. */
const RANGE_SEP = ' – ';

/**
 * Coerce a backend timestamp to epoch milliseconds, or `null`.
 *
 * Accepts epoch-ms numbers, numeric strings ("1727780400000"), ISO-8601
 * strings and `Date`s. Values below 1e11 are treated as epoch SECONDS
 * (1e11 ms is March 1973 — no real reading is that old). `null`, `''`,
 * `'NA'`, non-finite and non-positive values give `null`.
 */
export const toEpochMs = (raw: unknown): number | null => {
  if (raw === null || raw === undefined) return null;
  let ms: number;
  if (raw instanceof Date) {
    ms = raw.getTime();
  } else if (typeof raw === 'number') {
    ms = raw;
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (t === '') return null;
    const n = Number(t);
    ms = Number.isFinite(n) ? n : Date.parse(t);
  } else {
    return null;
  }
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms < 1e11 ? ms * 1000 : ms;
};

/** '28 Sep' — or '28 Sep 2025' when the year differs from `now`'s year. */
export const formatShortDate = (ms: number, now: number = Date.now()): string => {
  const d = new Date(ms);
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear()
    ? base
    : `${base} ${d.getFullYear()}`;
};

/**
 * Human date range, collapsing whatever the two ends share:
 *   same day   → '1 Sep 2026'
 *   same month → '1 – 30 Sep 2026'
 *   same year  → '1 Sep – 1 Oct 2026'
 *   otherwise  → '28 Dec 2025 – 3 Jan 2026'
 * Reversed inputs are swapped, so the earlier date always comes first.
 */
export const formatDateRange = (start: Date, end: Date): string => {
  const [a, b] = start.getTime() <= end.getTime() ? [start, end] : [end, start];
  const aD = a.getDate();
  const bD = b.getDate();
  const aM = MONTHS_SHORT[a.getMonth()];
  const bM = MONTHS_SHORT[b.getMonth()];
  const aY = a.getFullYear();
  const bY = b.getFullYear();
  if (aY !== bY) return `${aD} ${aM} ${aY}${RANGE_SEP}${bD} ${bM} ${bY}`;
  if (a.getMonth() !== b.getMonth()) return `${aD} ${aM}${RANGE_SEP}${bD} ${bM} ${bY}`;
  if (aD !== bD) return `${aD}${RANGE_SEP}${bD} ${bM} ${bY}`;
  return `${bD} ${bM} ${bY}`;
};

/** `{ month: 9, year: 2026 }` (1-based month) → 'September 2026'. */
export const formatMonthYear = (sel: { month: number; year: number }): string => {
  const name = MONTHS_LONG[sel.month - 1];
  return name ? `${name} ${sel.year}` : String(sel.year);
};
