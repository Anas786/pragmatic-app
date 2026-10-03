/**
 * Trend rows never go backwards (useTrendData.ts → keepNewerTrendData).
 *
 * Preset trend URLs never change (`now() - INTERVAL 24 HOUR` … `now()`),
 * the query's staleTime is 2 min and /protected/data/v2/trends has
 * s-maxage=1800 — so after a refresh brought the origin's rows, a
 * remount / focus refetch through the CDN could get a copy up to 30 min
 * old: the newest buckets vanished while the window label claimed the
 * window ends now. Pinned:
 *  - an older automatic (CDN) copy never replaces newer cached rows (same
 *    object kept, query still a success);
 *  - a newer copy, and anything fetched past the CDN (a user refresh),
 *    replaces them — the origin tag survives the hook's `{ ...rows,
 *    windowMs }` spread;
 *  - no rows on either side → normal replacement;
 *  - past TREND_DATA_CDN_WINDOW_MS the guard lets go;
 *  - a period switch (`keepPreviousData` placeholder) is unaffected.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appAxios } from '../src/networking/config';
import { FRESH_PARAM, isFromOrigin, markFromOrigin, runUserRefresh } from '../src/networking/freshFetch';
import { getTrendData, TrendDataArgs } from '../src/networking/site';
import {
  isOlderTrendSnapshot,
  keepNewerTrendData,
  newestTrendRowAt,
  TREND_DATA_CDN_WINDOW_MS,
  useTrendData,
} from '../src/hooks/useTrendData';
import { display } from '../src/utils/logger';

jest.unmock('axios');
jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));
jest.mock('../src/networking/auth/session', () => ({
  getValidAccessToken: async () => 'access-token',
}));
jest.mock('../src/networking/auth/cognito', () => ({
  cognitoSignOut: async () => undefined,
  onSessionEnded: () => () => undefined,
}));
jest.mock('../src/utils/logger', () => ({
  ...(jest.requireActual('../src/utils/logger') as object),
  display: jest.fn(),
}));

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 3, 9, 0, 0);

/** Trend response with 1-min buckets from `first` to `last` (inclusive). */
const rows = (first: number, last: number, value = 1) => {
  const data: { time: number; p2: number }[] = [];
  for (let t = first; t <= last; t += MIN) data.push({ time: t, p2: value });
  return { metadata: {}, data };
};

/* ───────────── pure ───────────── */

describe('isOlderTrendSnapshot — newest bucket decides', () => {
  it('reads the newest bucket time', () => {
    expect(newestTrendRowAt(rows(T0, T0 + 5 * MIN))).toBe(T0 + 5 * MIN);
    expect(newestTrendRowAt({ data: [{ time: T0 + MIN }, { time: T0 }] })).toBe(T0 + MIN);
    expect(newestTrendRowAt({ data: [] })).toBeNull();
    expect(newestTrendRowAt({ data: [{ time: 'x' }] })).toBeNull();
    expect(newestTrendRowAt(undefined)).toBeNull();
  });

  it('older only when its newest bucket is earlier', () => {
    expect(isOlderTrendSnapshot(rows(T0, T0 + 10 * MIN), rows(T0, T0 + 30 * MIN))).toBe(true);
    expect(isOlderTrendSnapshot(rows(T0, T0 + 30 * MIN), rows(T0, T0 + 10 * MIN))).toBe(false);
    expect(isOlderTrendSnapshot(rows(T0, T0 + 10 * MIN), rows(T0, T0 + 10 * MIN))).toBe(false);
    expect(isOlderTrendSnapshot({ data: [] }, rows(T0, T0 + 10 * MIN))).toBe(false);
    expect(isOlderTrendSnapshot(rows(T0, T0 + 10 * MIN), { data: [] })).toBe(false);
  });
});

describe('keepNewerTrendData — structuralSharing for the trend query', () => {
  let phoneNow = T0;
  beforeEach(() => {
    phoneNow = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => phoneNow);
  });
  afterEach(() => {
    jest.mocked(Date.now).mockRestore();
  });
  const cached = (data: object) => {
    expect(keepNewerTrendData(undefined, data)).toBe(data);
    return data;
  };

  it('an older CDN copy keeps the cached rows; an origin copy always replaces', () => {
    const prev = cached(rows(T0, T0 + 30 * MIN, 2));
    phoneNow += 5 * MIN;
    expect(keepNewerTrendData(prev, rows(T0 - 20 * MIN, T0 + 10 * MIN, 1))).toBe(prev);
    const origin = markFromOrigin(rows(T0 - 20 * MIN, T0 + 10 * MIN, 1));
    expect(keepNewerTrendData(prev, origin)).toEqual(origin);
  });

  it(`lets go after ${TREND_DATA_CDN_WINDOW_MS / MIN} min (2 × s-maxage=1800)`, () => {
    expect(TREND_DATA_CDN_WINDOW_MS).toBe(60 * MIN);
    const prev = cached(rows(T0, T0 + 30 * MIN, 2));
    phoneNow = T0 + TREND_DATA_CDN_WINDOW_MS;
    expect(keepNewerTrendData(prev, rows(T0, T0 + 10 * MIN))).toBe(prev);
    phoneNow = T0 + TREND_DATA_CDN_WINDOW_MS + 1;
    expect(keepNewerTrendData(prev, rows(T0, T0 + 10 * MIN))).toEqual(rows(T0, T0 + 10 * MIN));
  });

  it('a newer copy or no rows → normal replacement', () => {
    const prev = cached(rows(T0, T0 + 10 * MIN, 1));
    expect(keepNewerTrendData(prev, rows(T0, T0 + 12 * MIN, 2))).toEqual(rows(T0, T0 + 12 * MIN, 2));
    const fresh = cached(rows(T0, T0 + 10 * MIN, 1));
    expect(keepNewerTrendData(fresh, { metadata: {}, data: [] })).toEqual({ metadata: {}, data: [] });
  });
});

/* ───────────── through the real hook + axios ───────────── */

let queue: object[] = [];
const sent: InternalAxiosRequestConfig[] = [];
const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  sent.push({ ...config, params: config.params ? { ...config.params } : config.params });
  const next = queue.shift();
  if (!next) throw new Error(`unexpected request ${config.url}`);
  return {
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
    data: JSON.parse(JSON.stringify(next)),
  };
};

const SITE = '146c5345-8f7f-40e9-9e32-b065e085235d';
const H24: TrendDataArgs = { start: 'now() - INTERVAL 24 HOUR', end: 'now()', tz: 'Asia/Karachi' };
const H48: TrendDataArgs = { start: 'now() - INTERVAL 48 HOUR', end: 'now()', tz: 'Asia/Karachi' };

type TrendQuery = ReturnType<typeof useTrendData>;
const out: { q?: TrendQuery } = {};
const Probe = ({ args }: { args: TrendDataArgs }) => {
  const q = useTrendData(SITE, 0, args, { windowMs: 24 * 60 * MIN });
  const { data, status, isError, isFetching, isPlaceholderData } = q;
  out.q = q;
  return data === undefined
    ? null
    : React.createElement(Text, null, [status, isError, isFetching, isPlaceholderData].join());
};

let client: QueryClient;
let tree: ReactTestRenderer | undefined;
let prevAdapter: typeof appAxios.defaults.adapter;

const render = (args: TrendDataArgs) => {
  act(() => {
    const el = React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(Probe, { args }),
    );
    if (tree) tree.update(el);
    else tree = renderer.create(el);
  });
};
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise(r => setTimeout(r, 0));
  });
};
const autoRefetch = async () => {
  await act(async () => {
    await out.q?.refetch();
  });
  await flush();
};
const userRefresh = async () => {
  await act(async () => {
    await runUserRefresh(() => out.q!.refetch());
  });
  await flush();
};
const newest = () => newestTrendRowAt(out.q?.data);

beforeEach(() => {
  jest.mocked(display).mockClear();
  queue = [];
  sent.length = 0;
  out.q = undefined;
  onlineManager.setOnline(true);
  prevAdapter = appAxios.defaults.adapter;
  appAxios.defaults.adapter = adapter;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  expect(queue).toHaveLength(0);
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  client.clear();
  appAxios.defaults.adapter = prevAdapter;
});

describe('getTrendData — origin tag', () => {
  it('tags a response sent during a user refresh, not an automatic one', async () => {
    queue = [rows(T0, T0 + MIN), rows(T0, T0 + MIN)];
    const auto = await getTrendData(SITE, 0, H24);
    expect(isFromOrigin(auto)).toBe(false);
    const fresh = await runUserRefresh(() => getTrendData(SITE, 0, H24));
    expect(sent[1].params?.[FRESH_PARAM]).toEqual(expect.any(Number));
    expect(isFromOrigin(fresh)).toBe(true);
  });
});

describe('useTrendData — rows never go backwards', () => {
  it('a refresh brings the origin rows; a later automatic CDN copy that ends earlier is ignored', async () => {
    const cdnOld = rows(T0, T0 + 10 * MIN, 1);
    const origin = rows(T0 + 20 * MIN, T0 + 40 * MIN, 2);
    queue = [cdnOld, origin, cdnOld];
    render(H24);
    await flush();
    expect(newest()).toBe(T0 + 10 * MIN);

    await userRefresh();
    expect(sent[1].params?.[FRESH_PARAM]).toEqual(expect.any(Number));
    expect(newest()).toBe(T0 + 40 * MIN);
    const shown = out.q?.data;

    await autoRefetch();
    expect(sent[2].params?.[FRESH_PARAM]).toBeUndefined();
    expect(out.q?.data).toBe(shown);
    expect(out.q?.data?.windowMs).toBe(24 * 60 * MIN);
    expect(out.q?.status).toBe('success');
    expect(out.q?.isError).toBe(false);
    expect(display).toHaveBeenCalledWith('useTrendData: older CDN copy ignored, cached rows kept', {
      cached: new Date(T0 + 40 * MIN).toISOString(),
      received: new Date(T0 + 10 * MIN).toISOString(),
    });
  });

  it('a user refresh shows exactly what the origin has, even if it ends earlier', async () => {
    queue = [rows(T0, T0 + 40 * MIN, 2), rows(T0, T0 + 10 * MIN, 1)];
    render(H24);
    await flush();
    await userRefresh();
    expect(newest()).toBe(T0 + 10 * MIN);
  });

  it('a newer automatic copy replaces the rows', async () => {
    queue = [rows(T0, T0 + 10 * MIN, 1), rows(T0, T0 + 12 * MIN, 2)];
    render(H24);
    await flush();
    await autoRefetch();
    expect(newest()).toBe(T0 + 12 * MIN);
  });

  it('a period switch shows the previous rows as a placeholder, then the new period — even if it ends earlier', async () => {
    queue = [rows(T0, T0 + 40 * MIN, 2), rows(T0 - 60 * MIN, T0 + 5 * MIN, 3)];
    render(H24);
    await flush();
    expect(newest()).toBe(T0 + 40 * MIN);
    render(H48);
    // The 24H rows stand in while 48H loads…
    expect(out.q?.isPlaceholderData).toBe(true);
    expect(newest()).toBe(T0 + 40 * MIN);
    await flush();
    // …and never block the new key's own (earlier-ending) rows.
    expect(out.q?.isPlaceholderData).toBe(false);
    expect(newest()).toBe(T0 + 5 * MIN);
  });
});
