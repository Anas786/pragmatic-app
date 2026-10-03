/**
 * Fresh fetches — makes a refresh the USER asked for actually reach the API.
 *
 * The API marks its responses cacheable (measured 2026-10-01):
 *
 *   /protected/data/all, /protected/config/site   max-age=600, s-maxage=900
 *   /protected/data/v2/trends                      max-age=600, s-maxage=1800
 *   /private/user/site-list                        max-age=60
 *   /protected/data/v2/report                      max-age=0
 *
 * Two caches honour that, and both broke pull-to-refresh / the refresh
 * icons (same data, same "x min ago" for up to 10 minutes):
 *
 *  - The DEVICE HTTP cache (iOS NSURLCache, Android OkHttp's 10 MB cache)
 *    answered repeat GETs locally without touching the network. React
 *    Query is the app's cache, so every protected GET asks the device
 *    cache to revalidate ({@link NO_DEVICE_CACHE_HEADERS}).
 *  - CloudFront serves a shared copy for up to s-maxage and ignores a
 *    viewer's `Cache-Control: no-cache`. While a user refresh runs
 *    ({@link runUserRefresh}), protected GETs carry a unique
 *    {@link FRESH_PARAM} query param, so they miss the CDN (and any device
 *    cache) and hit the origin. The API ignores unknown params — verified
 *    on every protected endpoint above. Automatic fetches (mount, focus,
 *    stale-time) keep using the CDN.
 *
 * Because automatic fetches keep the CDN, one that runs AFTER a user
 * refresh can be answered with a copy OLDER than the origin data already
 * cached. Responses that bypassed the CDN are tagged
 * ({@link markFromOrigin}) so a cache can tell "the origin's current
 * state" (always accepted) from "a shared copy that may be behind" (only
 * accepted if it isn't older — {@link keepNewerSnapshot}, used by
 * `keepNewerSiteData` in useSiteData.ts and `keepNewerTrendData` in
 * useTrendData.ts).
 */

import { onlineManager, replaceEqualDeep } from '@tanstack/react-query';
import { display } from 'src/utils/logger';

/** Cache-busting query param added while a user refresh is in flight. */
export const FRESH_PARAM = '_r';

/** Request headers that make the device HTTP cache revalidate. */
export const NO_DEVICE_CACHE_HEADERS = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
} as const;

/**
 * True when a sent request carried {@link FRESH_PARAM} — a unique value,
 * so the CDN (whose cache key includes it) had to ask the origin. Pass the
 * axios response's `config` (the final one, after the interceptors).
 */
export const sentPastCdn = (config: { params?: unknown } | undefined): boolean => {
  const params = config?.params;
  return (
    typeof params === 'object' &&
    params !== null &&
    (params as Record<string, unknown>)[FRESH_PARAM] !== undefined
  );
};

/** Parsed responses that came straight from the origin (see below). */
const originResponses = new WeakSet<object>();

/**
 * Tag a parsed response object as the origin's current state (its request
 * went past the CDN — {@link sentPastCdn}). Weakly held: the tag goes away
 * with the object. Returns `data` for chaining.
 */
export const markFromOrigin = <T>(data: T): T => {
  if (typeof data === 'object' && data !== null) originResponses.add(data);
  return data;
};

/** True for an object tagged by {@link markFromOrigin}. */
export const isFromOrigin = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && originResponses.has(data);

/* ─────────── "never older" cache guard ─────────── */

/**
 * How long after a response was cached a CDN copy can still PREDATE it:
 * twice the endpoint's `s-maxage` — CloudFront's two cache tiers (regional
 * edge cache → edge location) can each hold a copy for up to s-maxage.
 * Past that, every CDN copy was fetched from the origin AFTER the cached
 * response, so it can't be older than it (only the origin itself going
 * back could make it so, and then the origin is the truth). Re-check if
 * the endpoint's Cache-Control changes (measured 2026-10-01, see top).
 */
export const cdnCopyWindowMs = (sMaxAgeSeconds: number): number => 2 * sMaxAgeSeconds * 1000;

/** When each cached response object was accepted (phone clock, ms). */
const acceptedAt = new WeakMap<object, number>();

/**
 * True while a CDN copy received `now` could still be older than `cached`
 * — i.e. `cached` was accepted at most `windowMs` ago. Only a DURATION on
 * the phone's own clock is measured (never compared with a server stamp);
 * a clock that went backwards (negative age) or an object this guard never
 * accepted → false.
 */
const cdnCopyCanPredate = (cached: unknown, now: number, windowMs: number): boolean => {
  if (typeof cached !== 'object' || cached === null) return false;
  const at = acceptedAt.get(cached);
  if (at === undefined) return false;
  const age = now - at;
  return age >= 0 && age <= windowMs;
};

export interface KeepNewerSnapshotOptions {
  /** True when `next` is an OLDER snapshot than `cached` — server stamps only. */
  isOlder: (next: unknown, cached: unknown) => boolean;
  /** {@link cdnCopyWindowMs} of the endpoint. */
  windowMs: number;
  /** Logged (display, dev only) when a CDN copy is ignored. */
  onIgnored?: (cached: unknown, next: unknown) => void;
}

/**
 * Builds a React Query `structuralSharing` hook under which cached data
 * never goes backwards because of a CDN copy:
 *
 *  - a response fetched past the CDN ({@link isFromOrigin}: a user
 *    refresh, opening a site) is the origin's current state → always
 *    replaces — so a user refresh shows exactly what the origin has, and a
 *    bogus stamp is never kept past the next one;
 *  - a CDN copy that `isOlder` than the cached data → the cached object is
 *    kept (same reference, nothing re-derives; the query still settles as a
 *    success and its `dataUpdatedAt` moves on) — but ONLY while the cached
 *    data is young enough for a CDN copy to predate it (`windowMs` since it
 *    was accepted). Past that the copy is newer whatever its stamps say, so
 *    a cached snapshot with a wrong (e.g. future) stamp can't lock out the
 *    automatic refetches for longer than the window — while a big but real
 *    jump (a site uploading hours of backlog) is still protected inside it;
 *  - anything else → React Query's default structural sharing.
 *
 * The accepted object's time is recorded here (a cached copy kept by the
 * guard keeps its original time), so every fetcher of a key must pass the
 * same hook; data this hook never accepted is never guarded.
 */
export const keepNewerSnapshot = ({
  isOlder,
  windowMs,
  onIgnored,
}: KeepNewerSnapshotOptions) => (prev: unknown, next: unknown): unknown => {
  const now = Date.now();
  if (
    prev !== undefined &&
    !isFromOrigin(next) &&
    cdnCopyCanPredate(prev, now, windowMs) &&
    isOlder(next, prev)
  ) {
    onIgnored?.(prev, next);
    return prev;
  }
  const result = replaceEqualDeep(prev, next);
  if (typeof result === 'object' && result !== null) acceptedAt.set(result, now);
  return result;
};

let activeUserRefreshes = 0;
const settledListeners = new Set<() => void>();

/** True while at least one user-initiated refresh is in flight. */
export const isUserRefreshActive = (): boolean => activeUserRefreshes > 0;

/**
 * Run a user-initiated refresh (pull-to-refresh, a refresh icon, Retry) —
 * never an automatic one (mount, focus, resume, stale-time). Every
 * protected GET sent until `run`'s promise settles bypasses the CDN. React
 * Query's `refetch()` / `refetchQueries()` / `resetQueries()` promises
 * settle only after the request (and its retries) finish, so the whole
 * refresh is covered. Callers must make it START a request rather than
 * join one already in flight (`cancelRefetch: true`, React Query's
 * default) — a joined automatic fetch was sent without the bypass.
 *
 * Offline, the fetch pauses until reconnect; a bypass window held open
 * that long would also catch the reconnect burst of automatic refetches,
 * so an offline refresh runs without one.
 *
 * Listeners fire once it settles — the shared clock uses that to
 * re-render "x min ago" labels at once.
 */
export const runUserRefresh = async <T>(run: () => Promise<T>): Promise<T> => {
  const bypass = onlineManager.isOnline();
  if (bypass) activeUserRefreshes += 1;
  try {
    return await run();
  } finally {
    if (bypass) activeUserRefreshes = Math.max(0, activeUserRefreshes - 1);
    settledListeners.forEach(listener => {
      // One faulty listener must neither fail a refresh that succeeded nor
      // starve the others.
      try {
        listener();
      } catch (err) {
        display('freshFetch settle listener FAILED', err);
      }
    });
  }
};

/** Subscribe to "a user refresh just settled". Returns the unsubscribe. */
export const onUserRefreshSettled = (listener: () => void): (() => void) => {
  settledListeners.add(listener);
  return () => {
    settledListeners.delete(listener);
  };
};
