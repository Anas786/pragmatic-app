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
 */

import { onlineManager } from '@tanstack/react-query';
import { display } from 'src/utils/logger';

/** Cache-busting query param added while a user refresh is in flight. */
export const FRESH_PARAM = '_r';

/** Request headers that make the device HTTP cache revalidate. */
export const NO_DEVICE_CACHE_HEADERS = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
} as const;

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
