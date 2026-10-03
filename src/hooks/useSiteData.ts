import { useQuery } from '@tanstack/react-query';
import {
  headerLastUpdate,
  isOlderSiteSnapshot,
} from 'src/components/screens/Authenticated/SiteDetail/siteDetailModel';
import { getSiteAllData } from 'src/networking';
import { cdnCopyWindowMs, keepNewerSnapshot } from 'src/networking/freshFetch';
import { ISiteAllData } from 'src/types';
import { display } from 'src/utils/logger';

/**
 * Stable query key builder. Co-located here so prefetch sites and consumer
 * hooks always reference the same cache entry — change it in one place if
 * the cache shape ever needs to evolve.
 */
export const siteDataQueryKey = (siteId: string) =>
  ['site', 'all', siteId] as const;

/**
 * Tabs unmount on switch (ViewsContent), so each switch re-mounts a
 * subscriber. Keep staleTime generous so switching tabs serves cache instead
 * of refiring the large /protected/data/all payload mid-transition. Must stay
 * below gcTime (5 min) or the entry would be collected while still fresh.
 *
 * Exported so `useSwitchActiveSite`'s prefetch shares the exact same
 * freshness window — a drifted literal there made same-site re-taps refetch
 * the full payload mid-navigation.
 */
export const SITE_DATA_STALE_TIME = 1000 * 60 * 3;

const isoOrNull = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

/**
 * How long after a `/data/all` response was cached a CDN copy can still be
 * older than it: 2 × `s-maxage=900` = 30 min (freshFetch.ts).
 */
export const SITE_DATA_CDN_WINDOW_MS = cdnCopyWindowMs(900);

/**
 * Site data never goes backwards — the `structuralSharing` hook for
 * `/protected/data/all`, i.e. the step where React Query swaps a fetched
 * response into the cache.
 *
 * Automatic fetches (mount, focus, resume, stale-time) keep the CDN on
 * purpose (freshFetch.ts), and CloudFront may answer with a copy up to
 * s-maxage = 15 min old. So after a user refresh brought the origin's
 * data, a later automatic refetch could swap in an OLDER copy — seen on
 * Lucky Cement: "Updated 7 min ago" → "23 min ago", tile ages 3 → 22 min,
 * values reverted. Rule (`keepNewerSnapshot`, freshFetch.ts):
 *
 *  - a response fetched past the CDN (`isFromOrigin`: opening a site, a
 *    user refresh) is the origin's current state → always replaces;
 *  - a CDN copy that is an older snapshot than the cached one
 *    (`isOlderSiteSnapshot`: site sync stamps when both have one, else the
 *    newest live readings) while the cached one is younger than
 *    {@link SITE_DATA_CDN_WINDOW_MS} → the cached data is kept (same
 *    reference, so nothing re-derives). The query still settles as a
 *    success: no error strip, and its `dataUpdatedAt` moves on, which keeps
 *    the Live tiles' ages right for the data shown;
 *  - otherwise (newer, equal, no common timestamp, or a cached snapshot
 *    older than the window — so a wrong stamp can't freeze the values) →
 *    React Query's default structural sharing.
 *
 * Passed by every fetcher of this key (`useSiteData` and the prefetch in
 * `useSwitchActiveSite`), so whichever options the query last ran with
 * still carry it.
 */
export const keepNewerSiteData = keepNewerSnapshot({
  isOlder: isOlderSiteSnapshot,
  windowMs: SITE_DATA_CDN_WINDOW_MS,
  onIgnored: (cached, next) =>
    display('useSiteData: older CDN copy ignored, cached snapshot kept', {
      cached: isoOrNull(headerLastUpdate(cached, null)),
      received: isoOrNull(headerLastUpdate(next, null)),
    }),
});

/**
 * Subscribes the calling component to /protected/data/all/{siteId}.
 *
 * React Query gives us the "store everywhere" property the requirement
 * called for: every tab on the SiteDetail screen (Summary, Cards, Alarms,
 * Trend) calls `useSiteData(siteId)` and reads from the same in-memory
 * cache entry — one network call, four subscribers. Cross-tab navigation
 * is instant.
 *
 * - `enabled` short-circuits when no siteId is supplied (avoids an
 *   accidental fetch on first mount before navigation params arrive).
 * - 3 min `staleTime` — tabs unmount on switch, so a short staleTime made
 *   every tab switch past the threshold refetch the full payload
 *   mid-transition. 3 minutes keeps tab switches cache-served while still
 *   refreshing on screen re-focus past the threshold.
 * - `keepNewerSiteData` stops an older CDN copy from replacing newer
 *   cached data (see above).
 * - 401s are intentionally not retried at the React Query layer; the axios
 *   response interceptor already does a single refresh-and-retry before
 *   logging the user out, so a layered retry would be redundant.
 */
export const useSiteData = (siteId: string | undefined | null) =>
  useQuery<ISiteAllData, Error>({
    queryKey: siteDataQueryKey(siteId ?? ''),
    queryFn: () => getSiteAllData(siteId as string),
    enabled: !!siteId,
    staleTime: SITE_DATA_STALE_TIME,
    structuralSharing: keepNewerSiteData,
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
