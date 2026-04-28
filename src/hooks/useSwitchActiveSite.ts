import { useQueryClient } from '@tanstack/react-query';
import { getSiteAllData, getSiteConfig } from 'src/networking';
import { siteConfigQueryKey } from './useSiteConfig';
import { siteDataQueryKey } from './useSiteData';

/**
 * Tracks the most recently opened site so we know whether the user is
 * navigating to a different site (→ clear previous cache, refetch) or
 * the same one (→ serve from cache within staleTime).
 *
 * Module-scope on purpose: survives Dashboard re-mounts triggered by
 * navigation focus changes; reset only on logout via `resetActiveSite()`.
 */
let lastSiteId: string | null = null;

/**
 * Atomic "switch active site" handler used by the Dashboard's onPress.
 *
 * Behaviour:
 *  - **Same site as last time** — no cache eviction, no forced refetch.
 *    `prefetchQuery` is a no-op when the cache is still fresh, so the
 *    detail screen reads instantly.
 *  - **Different site than last time** — the previous site's two cached
 *    responses (`/protected/data/all/{prev}` and `/protected/config/site/{prev}`)
 *    are removed from the React Query cache, then both endpoints are
 *    refetched for the new siteId in parallel.
 *
 * Returning a single function keeps the call site at Dashboard a one-liner
 * and prevents drift between the two endpoints' lifecycle (you can't
 * accidentally clear one without the other).
 */
export const useSwitchActiveSite = () => {
  const queryClient = useQueryClient();

  return (siteId: string) => {
    if (!siteId) return;

    if (lastSiteId && lastSiteId !== siteId) {
      // Wipe the previous site's cache so it can't leak into the new
      // screen even briefly while the new fetches are in flight.
      queryClient.removeQueries({ queryKey: siteDataQueryKey(lastSiteId) });
      queryClient.removeQueries({
        queryKey: siteConfigQueryKey(lastSiteId),
      });
    }

    lastSiteId = siteId;

    // Fire both protected-site requests in parallel. After the cache
    // eviction above (when applicable) these will mint fresh responses
    // for the new siteId.
    queryClient.prefetchQuery({
      queryKey: siteDataQueryKey(siteId),
      queryFn: () => getSiteAllData(siteId),
      staleTime: 1000 * 30,
    });
    queryClient.prefetchQuery({
      queryKey: siteConfigQueryKey(siteId),
      queryFn: () => getSiteConfig(siteId),
      staleTime: 1000 * 60 * 30,
    });
  };
};

/**
 * Forget which site was last active. Call from logout flows so the very
 * first tap after the next sign-in always refetches, regardless of what
 * the previous user was viewing.
 */
export const resetActiveSite = () => {
  lastSiteId = null;
};
