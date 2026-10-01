import { useQuery } from '@tanstack/react-query';
import {
  getInverterReport,
  InverterReportResponse,
  ReportFilter,
} from 'src/networking';

/**
 * Stable query key that includes both siteId and the full filter shape.
 * React Query treats different filters as separate cache entries, so
 * switching from "Custom" to "Year" doesn't show stale results.
 */
export const inverterReportQueryKey = (
  siteId: string,
  filter: ReportFilter,
) => ['inverter-report', siteId, filter] as const;

/**
 * Subscribes the calling component to /protected/data/v2/report/{siteId}
 * for `type=inverter_queries`. The active filter (Life Time / Month /
 * Year / Custom) is part of the cache key so each pill press caches its
 * own response and switching back is instant.
 *
 * `enabled` short-circuits when no siteId is supplied so deep-links
 * don't fire a request before the route params arrive.
 *
 * Keep-previous-data, per site: a period change keeps the previous
 * period's rows on screen (`isPlaceholderData: true`) until the new key
 * resolves, so the hero and the inverter rows stay mounted (no skeleton
 * flash, no entrance replay); the Tables card dims them and marks the
 * hero 'Updating…'. Placeholder data is never written to the cache, and
 * it is only carried over from a query for the SAME site — another
 * site's inverters must never stand in, even for a moment.
 */
export const useInverterReport = (
  siteId: string | undefined | null,
  filter: ReportFilter,
) =>
  useQuery<InverterReportResponse, Error>({
    queryKey: inverterReportQueryKey(siteId ?? '', filter),
    queryFn: () => getInverterReport(siteId as string, filter),
    enabled: !!siteId,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === (siteId ?? '') ? previousData : undefined,
    staleTime: 1000 * 60 * 5, // reports tolerate a 5-min cache
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
