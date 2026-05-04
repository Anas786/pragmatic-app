import { useQuery } from '@tanstack/react-query';
import { getReportMapping } from 'src/networking';
import { ReportMapping } from 'src/types';

/**
 * Cache namespace for `/public/config/report-mapping`. Single global
 * entry — no `siteId` in the key — because the mapping itself is
 * tenant-/region-scoped, not per-site. Per the product spec we still
 * evict + refetch this cache whenever the user opens a different site
 * via {@link useSwitchActiveSite} so the Reports tab always sees a
 * fresh mapping.
 */
export const REPORT_MAPPING_QUERY_KEY = ['config', 'report-mapping'] as const;

/**
 * Subscribes the calling component to `/public/config/report-mapping`.
 *
 * Used by the Reports tab to translate raw backend codes (parameter
 * keys, KPI ids, column names) into UI-friendly labels. Public endpoint
 * — no auth required, the axios interceptor automatically skips token
 * attachment for `/public/*`.
 */
export const useReportMapping = () =>
  useQuery<ReportMapping, Error>({
    queryKey: REPORT_MAPPING_QUERY_KEY,
    queryFn: getReportMapping,
    // Cache lives for an hour — it's invalidated explicitly via
    // `useSwitchActiveSite` on every site change, so we don't rely on
    // staleTime alone to keep it fresh.
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 4,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
