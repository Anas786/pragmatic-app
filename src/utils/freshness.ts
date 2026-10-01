/**
 * Data-freshness model — the ONLY source of "is this live?" app-wide.
 *
 * Dashboard cards, the SiteDetail header, the Summary hero and the Live
 * tab all classify a backend timestamp with these thresholds and read
 * the same wording, so a site can't look "Live" on one screen and
 * "Offline" on the next.
 *
 *   live     age ≤ 30 min
 *   delayed  age ≤ 60 min
 *   stale    age  > 60 min
 *   offline  backend `state` matches /offline/i (whatever the age)
 *   unknown  missing / unparsable / more than 5 min in the future
 *
 * The thresholds match the web portal's site header (verified 2026-10-01
 * against its bundle: under 30 min "online", 30–60 min "warning", 60 min+
 * "offline", computed from /data/all `live.metadata.last_update`), so the
 * app and the web never disagree about whether a site is live. Keep them
 * as the named constants below, never inline numbers at call sites.
 */
import type { ColorScheme } from 'src/theme/tokens';
import { semantic } from 'src/theme/tokens';
import { formatShortDate, toEpochMs } from './dates';
import { formatRelativeTime } from './format';

export { toEpochMs } from './dates';

/** Newest-data age that still counts as live (web: "online" under 30 min). */
export const FRESH_LIVE_MS = 30 * 60_000;
/** Newest-data age that still counts as merely delayed (web: "warning" to 60 min). */
export const FRESH_DELAYED_MS = 60 * 60_000;
/** Future timestamps within this skew are treated as "now". */
export const FUTURE_SKEW_MS = 5 * 60_000;

export type FreshnessLevel = 'live' | 'delayed' | 'stale' | 'unknown';
export type SiteStatusLevel = FreshnessLevel | 'offline';

export interface Freshness {
  level: FreshnessLevel;
  /** Age in ms (future skew clamped to 0); `null` when unknown. */
  ageMs: number | null;
}

/** Classify a backend "last data" timestamp. */
export const dataFreshness = (
  lastUpdate: unknown,
  now: number = Date.now(),
): Freshness => {
  const ms = toEpochMs(lastUpdate);
  if (ms === null) return { level: 'unknown', ageMs: null };
  const raw = now - ms;
  if (raw < -FUTURE_SKEW_MS) return { level: 'unknown', ageMs: null };
  const ageMs = Math.max(0, raw);
  if (ageMs <= FRESH_LIVE_MS) return { level: 'live', ageMs };
  if (ageMs <= FRESH_DELAYED_MS) return { level: 'delayed', ageMs };
  return { level: 'stale', ageMs };
};

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Compact duration: '12 min', '4 h', '3 d'. */
const formatDuration = (ms: number): string => {
  if (ms < HOUR) return `${Math.max(1, Math.floor(ms / MINUTE))} min`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`;
  return `${Math.floor(ms / DAY)} d`;
};

/** Spoken duration: '12 minutes', '4 hours', '3 days'. */
const spokenDuration = (ms: number): string => {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (ms < HOUR) return plural(Math.max(1, Math.floor(ms / MINUTE)), 'minute');
  if (ms < DAY) return plural(Math.floor(ms / HOUR), 'hour');
  return plural(Math.floor(ms / DAY), 'day');
};

/** Relative age as it reads mid-sentence ('just now', '3 min ago', '28 Sep'). */
const ageText = (ageMs: number, now: number): string => {
  const rel = formatRelativeTime(now - ageMs, now);
  return rel === 'Just now' ? 'just now' : rel;
};

/**
 * The status line for a level:
 *
 * 'status' variant (default everywhere a status dot is shown):
 *   live     'Live · 3 min ago'          ('Live · just now' under a minute)
 *   delayed  'Delayed · 45 min ago'
 *   stale    'No data for 4 h'           ('No data for 3 d')
 *   offline  'Offline · last data 28 Sep' ('… last data 41 min ago' < 24 h)
 *   unknown  'Last update unknown'
 *
 * 'updated' variant: 'Updated 3 min ago' (offline → 'Offline · updated …').
 *
 * `now` is only needed to place an offline/stale date in the right year.
 */
export const freshnessText = (
  level: SiteStatusLevel,
  ageMs: number | null,
  variant: 'status' | 'updated' = 'status',
  now: number = Date.now(),
): string => {
  if (level === 'unknown' || ageMs === null) {
    return level === 'offline' ? 'Offline' : 'Last update unknown';
  }
  const age = ageText(ageMs, now);
  if (variant === 'updated') {
    return level === 'offline' ? `Offline · updated ${age}` : `Updated ${age}`;
  }
  switch (level) {
    case 'live':
      return `Live · ${age}`;
    case 'delayed':
      return `Delayed · ${age}`;
    case 'stale':
      return `No data for ${formatDuration(ageMs)}`;
    case 'offline':
      return `Offline · last data ${age}`;
  }
};

/** Screen-reader phrasing of `freshnessText` (no '·', no abbreviations). */
export const freshnessSpoken = (
  level: SiteStatusLevel,
  ageMs: number | null,
  now: number = Date.now(),
): string => {
  if (level === 'unknown' || ageMs === null) {
    return level === 'offline' ? 'Offline' : 'Last update unknown';
  }
  const ago = ageMs < MINUTE ? 'just now' : `${spokenDuration(ageMs)} ago`;
  switch (level) {
    case 'live':
      return `Live, updated ${ago}`;
    case 'delayed':
      return `Delayed, last updated ${ago}`;
    case 'stale':
      return `No data for ${spokenDuration(ageMs)}`;
    case 'offline':
      return ageMs < DAY
        ? `Offline, last data ${ago}`
        : `Offline, last data ${formatShortDate(now - ageMs, now)}`;
  }
};

export interface SiteStatus {
  level: SiteStatusLevel;
  ageMs: number | null;
  /** 'status'-variant text, e.g. 'Delayed · 45 min ago'. */
  label: string;
  /** Screen-reader text, e.g. 'Delayed, last updated 45 minutes ago'. */
  spoken: string;
}

const OFFLINE_RE = /offline/i;

/** Site-level status: an explicit backend OFFLINE wins over the data age. */
export const siteStatus = (
  state: string | null | undefined,
  lastUpdate: unknown,
  now: number = Date.now(),
): SiteStatus => {
  const fresh = dataFreshness(lastUpdate, now);
  const level: SiteStatusLevel =
    typeof state === 'string' && OFFLINE_RE.test(state) ? 'offline' : fresh.level;
  return {
    level,
    ageMs: fresh.ageMs,
    label: freshnessText(level, fresh.ageMs, 'status', now),
    spoken: freshnessSpoken(level, fresh.ageMs, now),
  };
};

/**
 * Status dot for a level. Solid = a definite state (live / delayed /
 * offline); hollow ring = "we can't vouch for this" (stale / unknown).
 */
export const freshnessDot = (
  level: SiteStatusLevel,
  scheme: ColorScheme,
): { color: string; hollow: boolean } => {
  switch (level) {
    case 'live':
      return { color: scheme.brand, hollow: false };
    case 'delayed':
      return { color: semantic.warning, hollow: false };
    case 'offline':
      return { color: semantic.danger, hollow: false };
    case 'stale':
    case 'unknown':
    default:
      return { color: scheme.textTertiary, hollow: true };
  }
};
