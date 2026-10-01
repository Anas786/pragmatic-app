import { keepPreviousData, useQuery } from '@tanstack/react-query';
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

/** A trend response tagged with the window it was fetched for. */
export interface TrendQueryData extends TrendDataResponse {
  /**
   * Span (ms) of the period these rows were requested for — drives the
   * x-label granularity. Carried WITH the data so that while a new period
   * loads (previous rows kept on screen, see `placeholderData`) the old
   * rows keep the labels of the window they actually cover.
   */
  windowMs: number;
}

export interface UseTrendDataOptions {
  /** Gate the fetch (e.g. while the site id is still resolving). */
  enabled?: boolean;
  /** Span of the requested window (`trendWindowMs`) — a pure function of
   *  `args`, so it is safe to close over in the query function. */
  windowMs?: number;
}

/**
 * Subscribes to /protected/data/v2/trends/{siteId}. Backs one trend
 * section's combined chart.
 *
 * The query fires on mount so the request is already in flight while the
 * tab-switch animation + skeleton render. Changing the period keeps the
 * previous rows on screen (`keepPreviousData` → `isPlaceholderData`) so
 * the chart is dimmed and updated in place instead of unmounting its
 * WebView and collapsing back to a skeleton.
 */
export const useTrendData = (
  siteId: string | undefined | null,
  idx: number,
  args: TrendDataArgs,
  { enabled = true, windowMs = 0 }: UseTrendDataOptions = {},
) =>
  useQuery<TrendQueryData, Error>({
    queryKey: trendDataQueryKey(siteId ?? '', idx, args),
    queryFn: async () => ({
      ...(await getTrendData(siteId as string, idx, args)),
      windowMs,
    }),
    enabled: !!siteId && enabled,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
