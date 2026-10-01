import { useQuery } from '@tanstack/react-query';
import {
  EnergyReportResponse,
  getEnergyReport,
  ReportFilter,
} from 'src/networking';

/**
 * Stable query key including both siteId and the full filter object —
 * each filter selection caches independently.
 */
export const energyReportQueryKey = (
  siteId: string,
  filter: ReportFilter,
) => ['energy-report', siteId, filter] as const;

/**
 * Subscribes to /protected/data/v2/report/{siteId}?type=energy_queries.
 * Backs the Performance Report (hero, Sources list, energy-over-time
 * chart) on the Reports tab.
 *
 * Keep-previous-data, per site: a period change keeps the previous
 * period's data on screen (`isPlaceholderData: true`) until the new key
 * resolves, so the hero and the chart WebView stay mounted (no skeleton
 * flash, no FadeInDown replay, no WebView reload); the card dims it and
 * marks it 'Updating…'. Placeholder data is never written to the cache.
 * It is only carried over when the previous query was for the SAME site —
 * another site's numbers must never stand in, even for a moment.
 */
export const useEnergyReport = (
  siteId: string | undefined | null,
  filter: ReportFilter,
) =>
  useQuery<EnergyReportResponse, Error>({
    queryKey: energyReportQueryKey(siteId ?? '', filter),
    queryFn: () => getEnergyReport(siteId as string, filter),
    enabled: !!siteId,
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[1] === (siteId ?? '') ? previousData : undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
