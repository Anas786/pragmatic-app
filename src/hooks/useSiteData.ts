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
 * - 30 s `staleTime` matches "live" data semantics — we don't refetch on
 *   every tab switch but we do on screen re-focus past the threshold.
 * - 401s are intentionally not retried at the React Query layer; the axios
 *   response interceptor already does a single refresh-and-retry before
 *   logging the user out, so a layered retry would be redundant.
 */
export const useSiteData = (siteId: string | undefined | null) =>
  useQuery<ISiteAllData, Error>({
    queryKey: siteDataQueryKey(siteId ?? ''),
    queryFn: () => getSiteAllData(siteId as string),
    enabled: !!siteId,
    staleTime: 1000 * 30,
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
      staleTime: 1000 * 30,
    });
  };
};
