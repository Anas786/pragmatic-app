import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiteAllData } from 'src/networking';
import { ISiteAllData } from 'src/types';

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
 */
const SITE_DATA_STALE_TIME = 1000 * 60 * 3;

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
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

/**
 * Prefetch helper — call from Dashboard's onPress so the network request
 * fires the moment the user taps a card, not after SiteDetail mounts.
 *
 * Usage:
 *   const prefetchSite = usePrefetchSiteData();
 *   onPress={() => { prefetchSite(site.id); navigation.navigate(...); }}
 */
export const usePrefetchSiteData = () => {
  const queryClient = useQueryClient();
  return (siteId: string) => {
    if (!siteId) return;
    queryClient.prefetchQuery({
      queryKey: siteDataQueryKey(siteId),
      queryFn: () => getSiteAllData(siteId),
      staleTime: SITE_DATA_STALE_TIME,
    });
  };
};
