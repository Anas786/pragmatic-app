import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiteConfig } from 'src/networking';
import { ISiteConfig } from 'src/types';

/**
 * Stable query key for /protected/config/site/{siteId}. Co-located so
 * prefetch sites and consumer hooks always reference the same cache
 * entry — change it in one place if the cache shape ever needs to evolve.
 */
export const siteConfigQueryKey = (siteId: string) =>
  ['site', 'config', siteId] as const;

/**
 * Subscribes the calling component to /protected/config/site/{siteId}.
 *
 * Site config rarely changes (it tracks device/inverter wiring, parameter
 * codes, layout, etc.) so we use a much longer staleTime than the live
 * /protected/data/all/{siteId} cache: 30 minutes. Within the window the
 * cache is served instantly with no refetch.
 *
 * Future per-site APIs (trends, reports, alarms history, …) will read
 * from this cache via `useSiteConfig(siteId).data` to look up parameter
 * mappings, device IDs, etc.
 */
export const useSiteConfig = (siteId: string | undefined | null) =>
  useQuery<ISiteConfig, Error>({
    queryKey: siteConfigQueryKey(siteId ?? ''),
    queryFn: () => getSiteConfig(siteId as string),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });

/**
 * Prefetch helper — call from Dashboard's onPress so the network request
 * fires the moment the user taps a card, in parallel with the live-data
 * prefetch. By the time SiteDetail mounts both responses are typically
 * already in cache.
 *
 * Usage:
 *   const prefetchConfig = usePrefetchSiteConfig();
 *   onPress={() => { prefetchConfig(site.id); navigation.navigate(...); }}
 */
export const usePrefetchSiteConfig = () => {
  const queryClient = useQueryClient();
  return (siteId: string) => {
    if (!siteId) return;
    queryClient.prefetchQuery({
      queryKey: siteConfigQueryKey(siteId),
      queryFn: () => getSiteConfig(siteId),
      staleTime: 1000 * 60 * 30,
    });
  };
};
