import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  DEFAULT_SITE_LIST_PAGE_SIZE,
  getSiteList,
} from 'src/networking';
import { ISite, ISiteListResponse } from 'src/types';

/**
 * Base cache namespace. The active search query is appended at runtime
 * so different `q` values cache independently — flipping back to a
 * previous search shows results instantly.
 */
const SITE_LIST_BASE_KEY = ['user', 'site-list'] as const;

export const SITE_LIST_QUERY_KEY = SITE_LIST_BASE_KEY;

interface UseSiteListOptions {
  pageSize?: number;
  /**
   * Server-side search string. Length 1–128 (enforced by the networking
   * layer). Empty / undefined → no `q` param sent, full list returned.
   */
  q?: string;
}

interface UseSiteListResult {
  sites: ISite[];
  total: number;
  nextPage: number | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  refetch: () => void;
}

/**
 * Loads the authenticated user's site list as an infinite-scroll feed,
 * with optional server-side search.
 *
 * - Each unique `q` becomes its own cache entry (paginated independently).
 * - Page 1 fires on mount or whenever `q` changes; further pages on
 *   `fetchNextPage()`.
 * - Cached for 10 minutes per (q, pageSize) combo.
 */
export const useSiteList = (
  options: UseSiteListOptions = {},
): UseSiteListResult => {
  const { pageSize = DEFAULT_SITE_LIST_PAGE_SIZE, q } = options;
  // Normalise once so the cache key is stable across whitespace-only
  // changes ("foo " vs "foo" hit the same cache entry).
  const trimmedQ = q?.trim() ?? '';
  const searchKey = trimmedQ.length > 0 ? trimmedQ : null;

  const query = useInfiniteQuery<
    ISiteListResponse,
    Error,
    { pages: ISiteListResponse[]; pageParams: number[] },
    readonly [...typeof SITE_LIST_BASE_KEY, string | null, number],
    number
  >({
    queryKey: [...SITE_LIST_BASE_KEY, searchKey, pageSize] as const,
    queryFn: ({ pageParam }) =>
      getSiteList(pageParam, pageSize, trimmedQ || undefined),
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      const { page, total, pageSize: ps } = lastPage.metadata;
      const totalPages = Math.max(1, Math.ceil(total / Math.max(ps, 1)));
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });

  // Flatten loaded pages into a single array for the FlatList. Memoised
  // so the array reference is stable across unrelated re-renders, which
  // keeps the FlatList's per-row memo cells from re-evaluating.
  const sites = useMemo<ISite[]>(
    () => query.data?.pages.flatMap(p => p.data) ?? [],
    [query.data],
  );

  const total =
    query.data?.pages[query.data.pages.length - 1]?.metadata.total ??
    sites.length;

  return {
    sites,
    total,
    nextPage: query.hasNextPage
      ? (query.data?.pages[query.data.pages.length - 1]?.metadata.page ?? 0) + 1
      : undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    error: query.error,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refetch: query.refetch,
  };
};
