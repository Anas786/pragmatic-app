/**
 * useSiteList — the list's freshness stamp (`listUpdatedAt`) must mean
 * "page 1 was last fetched successfully at …". It drives the Dashboard's
 * 'Updated 14:36' header, the offline strip's 'showing data from 14:36'
 * and the foreground-resume refresh gate, so it must NOT move when:
 *   - a pull-to-refresh fails (refresh() prunes via setQueryData, which is
 *     a manual 'success' write stamped with Date.now()), or
 *   - a deeper page loads (react-query's own dataUpdatedAt moves then).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ISite, ISiteListResponse } from '../src/types';
import { useSiteList } from '../src/hooks/useSiteList';

// jest.mock is hoisted above the imports, so the hook binds this stub.
const mockGetSiteList =
  jest.fn<(page: number, pageSize: number, q?: string) => Promise<ISiteListResponse>>();
jest.mock('../src/networking', () => {
  const actual = jest.requireActual('../src/networking') as object;
  return {
    ...actual,
    getSiteList: (page: number, pageSize: number, q?: string) => mockGetSiteList(page, pageSize, q),
  };
});

const PAGE_SIZE = 2;
const TOTAL = 6;

const siteRow = (n: number): ISite => ({
  id: `site-${n}`,
  name: `Site ${n}`,
  logo_ext: '',
  size: 1000,
  controller: false,
});

const pageOf = (page: number): ISiteListResponse => ({
  metadata: { total: TOTAL, page, pageSize: PAGE_SIZE },
  data: [siteRow(page * 10 + 1), siteRow(page * 10 + 2)],
});

type Result = ReturnType<typeof useSiteList>;
const latest: { current: Result | null } = { current: null };
const Probe = () => {
  latest.current = useSiteList({ pageSize: PAGE_SIZE });
  return null;
};
const hook = (): Result => {
  if (!latest.current) throw new Error('hook not rendered');
  return latest.current;
};

/** Let react-query's batched notifications reach the component. */
const flush = () =>
  act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });

const T0 = Date.UTC(2026, 9, 1, 9, 0, 0);
const MIN = 60_000;

describe('useSiteList — listUpdatedAt', () => {
  let clock = T0;
  let client: QueryClient;
  let tree: ReactTestRenderer | undefined;

  beforeEach(() => {
    clock = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    mockGetSiteList.mockReset();
    mockGetSiteList.mockImplementation(page => Promise.resolve(pageOf(page)));
    // retryDelay 0: the hook's own retry policy still runs, just instantly.
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    latest.current = null;
  });

  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    client.clear();
    jest.restoreAllMocks();
  });

  const mount = async () => {
    act(() => {
      tree = renderer.create(
        React.createElement(QueryClientProvider, { client }, React.createElement(Probe)),
      );
    });
    await flush();
    await flush();
  };

  const queryUpdatedAt = () =>
    client.getQueryState(['user', 'site-list', null, PAGE_SIZE])?.dataUpdatedAt;

  it('is 0 before the first success, then the page-1 fetch time', async () => {
    let resolveFirst: (res: ISiteListResponse) => void = () => {};
    mockGetSiteList.mockImplementationOnce(
      () => new Promise<ISiteListResponse>(resolve => {
        resolveFirst = resolve;
      }),
    );
    await mount();
    expect(hook().isLoading).toBe(true);
    expect(hook().listUpdatedAt).toBe(0);

    clock = T0 + 4_000;
    await act(async () => {
      resolveFirst(pageOf(1));
    });
    await flush();
    expect(hook().sites).toHaveLength(2);
    expect(hook().listUpdatedAt).toBe(T0 + 4_000);
  });

  it('does not move when a deeper page loads', async () => {
    await mount();
    clock = T0 + 3 * MIN;
    await act(async () => {
      hook().fetchNextPage();
    });
    await flush();
    expect(hook().sites).toHaveLength(4);
    // react-query's own stamp DID move — the reason it isn't used.
    expect(queryUpdatedAt()).toBe(T0 + 3 * MIN);
    expect(hook().listUpdatedAt).toBe(T0);
  });

  it('does not move when a pull-to-refresh fails (single page)', async () => {
    await mount();
    clock = T0 + 7 * MIN;
    mockGetSiteList.mockRejectedValue(Object.assign(new Error('Service Unavailable'), {
      response: { status: 503 },
    }));
    await act(async () => {
      await hook().refresh();
    });
    await flush();
    expect(hook().isRefetchError).toBe(true);
    expect(hook().listUpdatedAt).toBe(T0);
    // Nothing to prune → refresh() wrote nothing, so the cache isn't
    // stamped with the failed attempt's time either.
    expect(queryUpdatedAt()).toBe(T0);
    expect(hook().sites).toHaveLength(2);
  });

  it('keeps the page-1 stamp when a refresh prunes deeper pages and then fails', async () => {
    await mount();
    clock = T0 + 2 * MIN;
    await act(async () => {
      hook().fetchNextPage();
    });
    await flush();
    expect(hook().sites).toHaveLength(4);

    clock = T0 + 9 * MIN;
    mockGetSiteList.mockRejectedValue(Object.assign(new Error('Service Unavailable'), {
      response: { status: 503 },
    }));
    await act(async () => {
      await hook().refresh();
    });
    await flush();
    expect(hook().isRefetchError).toBe(true);
    // Pruned to page 1 (only one request per refresh)…
    expect(hook().sites).toHaveLength(2);
    // …whose rows still date from T0 — not from the failed attempt.
    expect(hook().listUpdatedAt).toBe(T0);
    // The prune kept the query's previous stamp (the page-2 load).
    expect(queryUpdatedAt()).toBe(T0 + 2 * MIN);
  });

  it('moves to the refresh time when a refresh succeeds', async () => {
    await mount();
    clock = T0 + 2 * MIN;
    await act(async () => {
      hook().fetchNextPage();
    });
    await flush();

    clock = T0 + 11 * MIN;
    await act(async () => {
      await hook().refresh();
    });
    await flush();
    expect(hook().isRefetchError).toBe(false);
    expect(hook().sites).toHaveLength(2);
    expect(hook().listUpdatedAt).toBe(T0 + 11 * MIN);
    // Exactly one request for the refresh: page 1.
    expect(mockGetSiteList.mock.calls.map(c => c[0])).toEqual([1, 2, 1]);
  });
});
