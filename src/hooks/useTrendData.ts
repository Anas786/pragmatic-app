import { useQuery } from '@tanstack/react-query';
import { getTrendData, TrendDataArgs } from 'src/networking';
import { TrendDataResponse } from 'src/types';

/**
 * Stable query key per (site, trend index, resolved range, tz). Each
 * period selection caches independently — switching back to a previously
 * viewed window serves instantly from cache.
 */
export const trendDataQueryKey = (
  siteId: string,
  idx: number,
  args: TrendDataArgs,
) => ['trend-data', siteId, idx, args.start, args.end, args.tz] as const;

/**
 * Subscribes to /protected/data/v2/trends/{siteId}. Backs one trend
 * section's two charts (line/area + bar) — both read the same response.
 *
 * `enabled` lets the caller gate the fetch (e.g. while the site id is
 * still resolving); the query otherwise fires on mount so the request is
 * already in flight while the tab-switch animation + skeleton render.
 */
export const useTrendData = (
  siteId: string | undefined | null,
  idx: number,
  args: TrendDataArgs,
  enabled = true,
) =>
  useQuery<TrendDataResponse, Error>({
    queryKey: trendDataQueryKey(siteId ?? '', idx, args),
    queryFn: () => getTrendData(siteId as string, idx, args),
    enabled: !!siteId && enabled,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
