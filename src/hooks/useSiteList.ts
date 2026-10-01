import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  DEFAULT_SITE_LIST_PAGE_SIZE,
  getSiteList,
} from 'src/networking';
import { ISite, ISiteListResponse } from 'src/types';
import { toEpochMs } from 'src/utils/dates';
import { display } from 'src/utils/logger';

/**
 * Base cache namespace. The active search query is appended at runtime
 * so different `q` values cache independently — flipping back to a
 * previous search shows results instantly.
 */
const SITE_LIST_BASE_KEY = ['user', 'site-list'] as const;

export const SITE_LIST_QUERY_KEY = SITE_LIST_BASE_KEY;

/** One cached page, stamped with when ITS request succeeded. */
type SiteListPage = ISiteListResponse & { fetchedAt: number };

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
  /**
   * The fetch is waiting for the network: App.tsx wires react-query's
   * onlineManager to NetInfo, so offline it PAUSES instead of failing —
   * `isLoading` is false and `error` null — and resumes on its own once
   * the device is back online.
   */
  isPaused: boolean;
  /**
   * Epoch ms when page 1 — the rows at the top of the list — was last
   * fetched successfully (0 before the first success). Drives the list
   * header's 'Updated 14:36', the offline strip's 'showing data from
   * 14:36' and the Dashboard's foreground-resume refresh gate.
   *
   * Deliberately NOT react-query's `dataUpdatedAt`: that one also moves on
   * every `fetchNextPage` (page 5 loading would claim the top rows were
   * just updated) and on manual `setQueryData` writes.
   */
  listUpdatedAt: number;
  /** A refetch failed while cached rows are still shown. */
  isRefetchError: boolean;
  /** Loading the next page failed — the list footer offers a Retry. */
  isFetchNextPageError: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  /**
   * Pull-to-refresh path. Unlike `refetch()` — which refetches EVERY
   * cached page sequentially (7 pages deep = 7 serial round-trips) —
   * this prunes the cache down to page one first, so only a single
   * request fires. Deeper pages reload lazily as the user scrolls.
   *
   * Returns the refetch promise (settles even on fetch error) so callers
   * can drive a spinner — e.g. Dashboard's RefreshControl.
   */
  refresh: () => Promise<unknown>;
}

/**
 * Dev-only: which backend layer served a page (`metadata.source` flips
 * between the Redis snapshot and origin) next to the rows' newest/oldest
 * `dataLastUpdate`, so a 'Just now' vs '4 h ago' discrepancy between two
 * fetches can be traced to the cache with the backend team.
 */
const logPageFreshness = (res: ISiteListResponse) => {
  const stamps = res.data
    .map(s => toEpochMs(s.dataLastUpdate))
    .filter((n): n is number => n !== null);
  const newest = stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
  const oldest = stamps.length ? new Date(Math.min(...stamps)).toISOString() : null;
  display(
    'site-list page',
    {
      source: res.metadata.source ?? null,
      page: res.metadata.page,
      rows: res.data.length,
      newestDataLastUpdate: newest,
      oldestDataLastUpdate: oldest,
      dataLastUpdate: res.data.slice(0, 5).map(s => ({ name: s.name, dataLastUpdate: s.dataLastUpdate })),
    },
    `source=${res.metadata.source ?? '?'} page=${res.metadata.page}`,
  );
};

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
  const queryClient = useQueryClient();
  // Normalise once so the cache key is stable across whitespace-only
  // changes ("foo " vs "foo" hit the same cache entry).
  const trimmedQ = q?.trim() ?? '';
  const searchKey = trimmedQ.length > 0 ? trimmedQ : null;

  const query = useInfiniteQuery<
    SiteListPage,
    Error,
    { pages: SiteListPage[]; pageParams: number[] },
    readonly [...typeof SITE_LIST_BASE_KEY, string | null, number],
    number
  >({
    queryKey: [...SITE_LIST_BASE_KEY, searchKey, pageSize] as const,
    queryFn: async ({ pageParam }) => {
      const res = await getSiteList(pageParam, pageSize, trimmedQ || undefined);
      if (__DEV__) logPageFreshness(res);
      // Stamped once the request has SUCCEEDED — a failed fetch never
      // reaches here, so the cached page keeps its previous stamp.
      return { ...res, fetchedAt: Date.now() };
    },
    initialPageParam: 1,
    getNextPageParam: lastPage => {
      const { page, total, pageSize: ps } = lastPage.metadata;
      const totalPages = Math.max(1, Math.ceil(total / Math.max(ps, 1)));
      return page < totalPages ? page + 1 : undefined;
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    // Automatic focus/reconnect refetches replay EVERY cached page of an
    // infinite query serially (7 pages deep = 7 back-to-back round-trips,
    // each with a 15s axios timeout) — exactly the pathology `refresh()`
    // was built to avoid, while also pinning any fetching-derived UI.
    // Pull-to-refresh + pagination cover freshness, so both automatic
    // replay triggers are disabled (App.tsx wires focusManager to AppState
    // and onlineManager to NetInfo, so both would otherwise fire).
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: (failureCount, error: any) => {
      const status = error?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });

  const { refetch } = query;

  // Pull-to-refresh: drop every cached page beyond the first, THEN refetch.
  // The remaining page keeps the list rendered (no skeleton flash) and the
  // refetch only fires a single page-1 request instead of replaying the
  // whole pagination history serially. CDN-neutral on purpose: the
  // Dashboard's automatic foreground-resume refresh calls it too; the
  // user gestures wrap it in `runUserRefresh` (freshFetch.ts) themselves.
  //
  // `setQueryData` is a manual 'success' write that stamps the query with
  // Date.now() — so with nothing to prune the updater returns undefined
  // (no write at all), and a real prune keeps the existing timestamp: a
  // refresh that then fails must not make the cache look freshly fetched.
  const refresh = useCallback(() => {
    const key = [...SITE_LIST_BASE_KEY, searchKey, pageSize] as const;
    queryClient.setQueryData<InfiniteData<SiteListPage, number>>(
      key,
      data =>
        data && data.pages.length > 1
          ? {
              pages: data.pages.slice(0, 1),
              pageParams: data.pageParams.slice(0, 1),
            }
          : undefined,
      { updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt },
    );
    return refetch();
  }, [queryClient, searchKey, pageSize, refetch]);

  // Flatten loaded pages into a single array for the FlatList. Memoised
  // so the array reference is stable across unrelated re-renders, which
  // keeps the FlatList's per-row memo cells from re-evaluating.
  //
  // Deduped by id: offset pagination against a cache/origin-mixed backend
  // (metadata.source flips between Redis snapshot and origin) can serve a
  // site on two adjacent pages, which would duplicate FlatList keys
  // (keyExtractor = site.id). Map keeps the first occurrence's position
  // while the later (fresher) object wins.
  const sites = useMemo<ISite[]>(() => {
    const flat = query.data?.pages.flatMap(p => p.data) ?? [];
    if (flat.length === 0) return flat;
    const byId = new Map(flat.map(s => [s.id, s]));
    return byId.size === flat.length ? flat : Array.from(byId.values());
  }, [query.data]);

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
    isPaused: query.isPaused,
    listUpdatedAt: query.data?.pages[0]?.fetchedAt ?? 0,
    isRefetchError: query.isRefetchError,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        query.fetchNextPage();
      }
    },
    refetch: query.refetch,
    refresh,
  };
};
