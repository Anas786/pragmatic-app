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
 * Backs the Performance Report pie chart on the Reports tab.
 */
export const useEnergyReport = (
  siteId: string | undefined | null,
  filter: ReportFilter,
) =>
  useQuery<EnergyReportResponse, Error>({
    queryKey: energyReportQueryKey(siteId ?? '', filter),
    queryFn: () => getEnergyReport(siteId as string, filter),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
