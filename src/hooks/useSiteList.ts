import { useQuery } from '@tanstack/react-query';
import { getSiteList } from 'src/networking';
import { ISite } from 'src/types';

export const SITE_LIST_QUERY_KEY = ['user', 'site-list'] as const;

/**
 * Loads the authenticated user's site list.
 *
 * - Cached for 10 minutes (matches the backend's `s-maxage=900` Cache-Control)
 * - Token attached automatically by the axios interceptor
 * - 401 triggers a silent refresh-token retry; if the retry also fails the
 *   user is signed out and React Query disables future runs because the
 *   navigator unmounts the Drawer.
 */
export const useSiteList = () =>
  useQuery<ISite[], Error>({
    queryKey: SITE_LIST_QUERY_KEY,
    queryFn: getSiteList,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      // Don't retry auth failures — the interceptor already attempted a
      // refresh-token retry and gave up.
      const status = error?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });
