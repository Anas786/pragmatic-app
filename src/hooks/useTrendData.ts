import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getTrendData, TrendDataArgs } from 'src/networking';
import {
  cdnCopyWindowMs,
  isFromOrigin,
  keepNewerSnapshot,
  markFromOrigin,
} from 'src/networking/freshFetch';
import { TrendDataResponse } from 'src/types';
import { display } from 'src/utils/logger';

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

/** Newest bucket `time` (unix-ms) of a trend response; `null` when none. */
export const newestTrendRowAt = (data: unknown): number | null => {
  const rows = (data as { data?: unknown } | null | undefined)?.data;
  if (!Array.isArray(rows)) return null;
  let newest: number | null = null;
  for (const row of rows) {
    const t = (row as { time?: unknown } | null)?.time;
    if (typeof t === 'number' && Number.isFinite(t) && (newest === null || t > newest)) {
      newest = t;
    }
  }
  return newest;
};

/**
 * True when trend response `next` ends EARLIER than `prev` (its newest
 * bucket is older) — swapping it in would drop the newest buckets. No rows
 * on either side → `false` (can't tell; replace as usual).
 */
export const isOlderTrendSnapshot = (next: unknown, prev: unknown): boolean => {
  const nextNewest = newestTrendRowAt(next);
  const prevNewest = newestTrendRowAt(prev);
  return nextNewest !== null && prevNewest !== null && nextNewest < prevNewest;
};

/**
 * How long after a trend response was cached a CDN copy can still be
 * older than it: 2 × `s-maxage=1800` = 60 min (freshFetch.ts).
 */
export const TREND_DATA_CDN_WINDOW_MS = cdnCopyWindowMs(1800);

const isoOrNull = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

/**
 * Trend rows never go backwards — `structuralSharing` for the trend query,
 * the same rule as `/data/all` (`keepNewerSiteData`, `keepNewerSnapshot`).
 * Preset URLs never change (`now() - INTERVAL N HOUR` … `now()`), the
 * staleTime is 2 min and the endpoint's s-maxage 30 min: after a refresh
 * brought the origin's rows, a remount / focus refetch through the CDN
 * could otherwise swap in a copy up to 30 min old, dropping the newest
 * buckets while the window label says it ends now. A copy fetched past the
 * CDN (a user refresh) always replaces. `prev` is the SAME key's data, so
 * `keepPreviousData` placeholders (another period's rows) never take part.
 */
export const keepNewerTrendData = keepNewerSnapshot({
  isOlder: isOlderTrendSnapshot,
  windowMs: TREND_DATA_CDN_WINDOW_MS,
  onIgnored: (cached, next) =>
    display('useTrendData: older CDN copy ignored, cached rows kept', {
      cached: isoOrNull(newestTrendRowAt(cached)),
      received: isoOrNull(newestTrendRowAt(next)),
    }),
});

/**
 * Subscribes to /protected/data/v2/trends/{siteId}. Backs one trend
 * section's combined chart.
 *
 * The query fires on mount so the request is already in flight while the
 * tab-switch animation + skeleton render. Changing the period keeps the
 * previous rows on screen (`keepPreviousData` → `isPlaceholderData`) so
 * the chart is dimmed and updated in place instead of unmounting its
 * WebView and collapsing back to a skeleton. An older CDN copy never
 * replaces newer cached rows (`keepNewerTrendData`).
 */
export const useTrendData = (
  siteId: string | undefined | null,
  idx: number,
  args: TrendDataArgs,
  { enabled = true, windowMs = 0 }: UseTrendDataOptions = {},
) =>
  useQuery<TrendQueryData, Error>({
    queryKey: trendDataQueryKey(siteId ?? '', idx, args),
    queryFn: async () => {
      const response = await getTrendData(siteId as string, idx, args);
      const result: TrendQueryData = { ...response, windowMs };
      // The spread is a new object: carry the origin tag over to it.
      return isFromOrigin(response) ? markFromOrigin(result) : result;
    },
    enabled: !!siteId && enabled,
    placeholderData: keepPreviousData,
    structuralSharing: keepNewerTrendData,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
