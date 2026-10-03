/**
 * Site data never goes backwards (useSiteData.ts → keepNewerSiteData).
 *
 * Automatic fetches keep the CDN (freshFetch.ts), and CloudFront may answer
 * /protected/data/all with a copy up to 15 min old. Seen on Android
 * (Lucky Cement, Live tab): after a user refresh brought the origin's data,
 * an automatic refetch swapped in an OLDER copy — "Updated 7 min ago" →
 * "23 min ago", tile ages 3 → 22 min. Pinned:
 *  - an older automatic (CDN) response never replaces newer cached data,
 *    and the query still settles as a success;
 *  - a newer one replaces it;
 *  - a response fetched past the CDN (user refresh, opening a site) is the
 *    origin's current state and always replaces;
 *  - stamps are compared like with like (site sync stamp only when both
 *    payloads have one, else the readings); no common timestamp → normal
 *    replacement;
 *  - the guard only holds while a CDN copy can predate the cached data
 *    (SITE_DATA_CDN_WINDOW_MS after it was cached), so a wrong stamp can't
 *    freeze the values for longer.
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
import {
  FRESH_PARAM,
  isFromOrigin,
  markFromOrigin,
  runUserRefresh,
  sentPastCdn,
} from '../src/networking/freshFetch';
import {
  keepNewerSiteData,
  SITE_DATA_CDN_WINDOW_MS,
  useSiteData,
} from '../src/hooks/useSiteData';
import { resetActiveSite, useSwitchActiveSite } from '../src/hooks/useSwitchActiveSite';
import {
  headerLastUpdate,
  isOlderSiteSnapshot,
} from '../src/components/screens/Authenticated/SiteDetail/siteDetailModel';
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
// The guard logs what it ignored (display → console in __DEV__).
jest.mock('../src/utils/logger', () => ({
  ...(jest.requireActual('../src/utils/logger') as object),
  display: jest.fn(),
}));

const MIN = 60_000;
// 3 Oct 2026, 14:00 PKT.
const T0 = Date.UTC(2026, 9, 3, 9, 0, 0);

/** /data/all-shaped payload: site sync stamp + one live reading. */
const snapshot = (
  sync: number | string | null,
  newest: number | null,
  value = 1,
): Record<string, unknown> => ({
  live: {
    ...(sync === null ? {} : { metadata: { last_update: sync } }),
    data: { live: newest === null ? {} : { p10390: { value, update_at: newest } } },
  },
  processed: { data: { processed: { ed_solar: value } } },
  alarms: null,
});

/* ───────────── ordering (pure) ───────────── */

describe('isOlderSiteSnapshot — like with like: sync stamps, else the readings', () => {
  it('orders by live.metadata.last_update', () => {
    expect(isOlderSiteSnapshot(snapshot(T0, T0), snapshot(T0 + 16 * MIN, T0))).toBe(true);
    expect(isOlderSiteSnapshot(snapshot(T0 + 16 * MIN, T0), snapshot(T0, T0))).toBe(false);
  });

  it('the site stamp wins over the readings (it is what the header shows)', () => {
    // Newer sync, older readings → not older.
    expect(
      isOlderSiteSnapshot(snapshot(T0 + 5 * MIN, T0), snapshot(T0, T0 + 20 * MIN)),
    ).toBe(false);
  });

  it('equal site stamps: the newest live update_at decides', () => {
    expect(isOlderSiteSnapshot(snapshot(T0, T0 + 3 * MIN), snapshot(T0, T0 + 22 * MIN))).toBe(
      true,
    );
    expect(isOlderSiteSnapshot(snapshot(T0, T0 + 22 * MIN), snapshot(T0, T0 + 3 * MIN))).toBe(
      false,
    );
    expect(isOlderSiteSnapshot(snapshot(T0, T0), snapshot(T0, T0))).toBe(false);
  });

  it('compares instants, not spellings (seconds / ms / ISO)', () => {
    expect(isOlderSiteSnapshot(snapshot(T0 / 1000, T0), snapshot(T0, T0))).toBe(false);
    expect(
      isOlderSiteSnapshot(snapshot(new Date(T0).toISOString(), T0), snapshot(T0 + MIN, T0)),
    ).toBe(true);
  });

  it('without site stamps on both sides, the newest readings decide', () => {
    expect(isOlderSiteSnapshot(snapshot(null, T0), snapshot(null, T0 + MIN))).toBe(true);
    expect(isOlderSiteSnapshot(snapshot(null, T0 + MIN), snapshot(null, T0))).toBe(false);
  });

  it('a site stamp on ONE side is never compared with readings (different clocks)', () => {
    // Cached: no metadata, readings to 14:30. CDN: sync stamp 14:10 (lags)
    // but readings to 14:40 → newer readings, not older.
    const at = (h: number, m: number) => Date.UTC(2026, 9, 3, h - 5, m, 0); // PKT
    expect(
      isOlderSiteSnapshot(snapshot(at(14, 10), at(14, 40)), snapshot(null, at(14, 30))),
    ).toBe(false);
    // Reverse: cached sync + readings 14:30, next has no metadata and
    // readings to 14:20 → older readings, older snapshot.
    expect(
      isOlderSiteSnapshot(snapshot(null, at(14, 20)), snapshot(at(14, 30), at(14, 30))),
    ).toBe(true);
    // Cached sync 14:30 but readings 14:00; next: no sync, readings 14:05 → newer.
    expect(
      isOlderSiteSnapshot(snapshot(null, at(14, 5)), snapshot(at(14, 30), at(14, 0))),
    ).toBe(false);
  });

  it('no common timestamp is never "older" (caller replaces as usual)', () => {
    expect(isOlderSiteSnapshot(snapshot(null, null), snapshot(T0, T0))).toBe(false);
    expect(isOlderSiteSnapshot(snapshot(T0, T0), snapshot(null, null))).toBe(false);
    expect(isOlderSiteSnapshot(snapshot('NA', null), snapshot(T0, T0))).toBe(false);
    // Sync stamp only on one side, readings only on the other.
    expect(isOlderSiteSnapshot(snapshot(T0, null), snapshot(null, T0 + MIN))).toBe(false);
    expect(isOlderSiteSnapshot(snapshot(null, T0), snapshot(T0 + MIN, null))).toBe(false);
    expect(isOlderSiteSnapshot({ live: null, processed: null, alarms: null }, snapshot(T0, T0))).toBe(
      false,
    );
    expect(isOlderSiteSnapshot(undefined, snapshot(T0, T0))).toBe(false);
  });
});

/* ───────────── the cache rule (pure) ───────────── */

describe('keepNewerSiteData — structuralSharing for /protected/data/all', () => {
  /** The phone clock the guard measures its window with. */
  let phoneNow = T0;
  beforeEach(() => {
    phoneNow = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => phoneNow);
  });
  afterEach(() => {
    jest.mocked(Date.now).mockRestore();
  });
  /** Cache `data` the way React Query does: through the hook. */
  const cached = (data: Record<string, unknown>) => {
    const kept = keepNewerSiteData(undefined, data) as Record<string, unknown>;
    expect(kept).toBe(data);
    return kept;
  };

  it('first data is taken as is', () => {
    const next = snapshot(T0, T0);
    expect(keepNewerSiteData(undefined, next)).toBe(next);
  });

  it('an older CDN copy keeps the cached object (same reference)', () => {
    const prev = cached(snapshot(T0 + 16 * MIN, T0 + 20 * MIN, 2));
    phoneNow += 3 * MIN;
    expect(keepNewerSiteData(prev, snapshot(T0, T0 + MIN, 1))).toBe(prev);
  });

  it('a newer copy replaces it', () => {
    const prev = cached(snapshot(T0, T0, 1));
    const next = snapshot(T0 + 5 * MIN, T0 + 5 * MIN, 2);
    expect(keepNewerSiteData(prev, next)).toEqual(next);
  });

  it('an older ORIGIN answer replaces it — the origin is the truth', () => {
    const prev = cached(snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2));
    const next = markFromOrigin(snapshot(T0, T0, 1));
    expect(isFromOrigin(next)).toBe(true);
    expect(keepNewerSiteData(prev, next)).toEqual(next);
  });

  it('missing timestamps fall back to normal replacement', () => {
    const prev = cached(snapshot(T0, T0, 1));
    const bare = snapshot(null, null, 9);
    expect(keepNewerSiteData(prev, bare)).toEqual(bare);
    expect(keepNewerSiteData(bare, prev)).toEqual(prev);
  });

  it('keeps React Query structural sharing for an identical payload', () => {
    const prev = cached(snapshot(T0, T0, 1));
    expect(keepNewerSiteData(prev, snapshot(T0, T0, 1))).toBe(prev);
  });

  it(`guards only while a CDN copy can predate the cache (${SITE_DATA_CDN_WINDOW_MS / MIN} min)`, () => {
    expect(SITE_DATA_CDN_WINDOW_MS).toBe(2 * 15 * MIN); // 2 × s-maxage=900
    const prev = cached(snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2));
    const older = () => snapshot(T0, T0, 1);
    phoneNow = T0 + SITE_DATA_CDN_WINDOW_MS;
    expect(keepNewerSiteData(prev, older())).toBe(prev);
    // Past the window every CDN copy was fetched after the cached one.
    phoneNow = T0 + SITE_DATA_CDN_WINDOW_MS + 1;
    expect(keepNewerSiteData(prev, older())).toEqual(older());
  });

  it('a wrong (future) stamp from the origin freezes the values for at most the window', () => {
    // A user refresh caches a payload stamped 4 h ahead (backend glitch).
    const glitch = cached(markFromOrigin(snapshot(T0 + 4 * 60 * MIN, T0 + 4 * 60 * MIN, 9)));
    // The backend corrects itself; automatic CDN copies are stamped "now".
    phoneNow = T0 + 5 * MIN;
    expect(keepNewerSiteData(glitch, snapshot(T0 + 5 * MIN, T0 + 5 * MIN, 1))).toBe(glitch);
    phoneNow = T0 + SITE_DATA_CDN_WINDOW_MS + MIN;
    const fixed = snapshot(T0 + 31 * MIN, T0 + 31 * MIN, 2);
    const shown = keepNewerSiteData(glitch, fixed);
    expect(shown).toEqual(fixed);
    expect(headerLastUpdate(shown, null)).toBe(T0 + 31 * MIN);
  });

  it('a big but real jump (site uploads hours of backlog) is still protected inside the window', () => {
    // Opening the site: the origin has the backlog, stamped now.
    const opened = cached(markFromOrigin(snapshot(T0, T0, 2)));
    // 4 min later an automatic refetch gets a CDN copy cached before the
    // upload — 3 h older. Never "Live" → "Offline · 3 h ago".
    phoneNow = T0 + 4 * MIN;
    expect(keepNewerSiteData(opened, snapshot(T0 - 3 * 60 * MIN, T0 - 3 * 60 * MIN, 1))).toBe(
      opened,
    );
  });

  it('a phone clock that went backwards never extends the guard', () => {
    const prev = cached(snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2));
    phoneNow = T0 - 2 * 60 * MIN; // user set the clock back 2 h
    expect(keepNewerSiteData(prev, snapshot(T0, T0, 1))).toEqual(snapshot(T0, T0, 1));
  });

  it('a kept snapshot keeps its own time (the window is not renewed by ignoring a copy)', () => {
    const prev = cached(snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2));
    phoneNow = T0 + 20 * MIN;
    expect(keepNewerSiteData(prev, snapshot(T0, T0, 1))).toBe(prev);
    phoneNow = T0 + SITE_DATA_CDN_WINDOW_MS + 1;
    expect(keepNewerSiteData(prev, snapshot(T0, T0, 1))).toEqual(snapshot(T0, T0, 1));
  });

  it('data the guard never accepted is never guarded', () => {
    const foreign = snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2);
    expect(keepNewerSiteData(foreign, snapshot(T0, T0, 1))).toEqual(snapshot(T0, T0, 1));
  });
});

describe('origin tagging (freshFetch)', () => {
  it('sentPastCdn reads the cache-busting param off the final request config', () => {
    expect(sentPastCdn({ params: { [FRESH_PARAM]: 123 } })).toBe(true);
    expect(sentPastCdn({ params: { page: 1 } })).toBe(false);
    expect(sentPastCdn({})).toBe(false);
    expect(sentPastCdn(undefined)).toBe(false);
  });

  it('markFromOrigin tags objects only', () => {
    expect(isFromOrigin({})).toBe(false);
    expect(isFromOrigin(markFromOrigin({}))).toBe(true);
    expect(markFromOrigin(null)).toBeNull();
    expect(isFromOrigin(null)).toBe(false);
  });
});

/* ───────────── through the real hook + axios ───────────── */

const isSiteData = (c: InternalAxiosRequestConfig) =>
  !!c.url?.includes('/protected/data/all/');

/** /data/all payloads served in order, each a fresh copy (as off the wire). */
let queue: Record<string, unknown>[] = [];
/** Every /data/all request, as sent. */
const sent: InternalAxiosRequestConfig[] = [];
const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const reply = (data: unknown): AxiosResponse => ({
    status: 200,
    statusText: 'OK',
    headers: new AxiosHeaders(),
    config,
    data,
  });
  // Config / report-mapping prefetches (opening a site) are not under test.
  if (!isSiteData(config)) return reply({});
  sent.push({ ...config, params: config.params ? { ...config.params } : config.params });
  const next = queue.shift();
  if (!next) throw new Error(`unexpected request ${config.url}`);
  return reply(JSON.parse(JSON.stringify(next)));
};

const SITE = '146c5345-8f7f-40e9-9e32-b065e085235d';

type SiteQuery = ReturnType<typeof useSiteData>;
const out: { q?: SiteQuery; open?: (id: string) => void } = {};
const Probe = ({ mountHook }: { mountHook: boolean }) => {
  out.open = useSwitchActiveSite();
  return mountHook ? React.createElement(HookProbe) : null;
};
const HookProbe = () => {
  const q = useSiteData(SITE);
  // React Query re-renders only for result fields read during render.
  const { data, status, isError, isRefetchError, isFetching, dataUpdatedAt } = q;
  out.q = q;
  return data === undefined
    ? null
    : React.createElement(Text, null, [status, isError, isRefetchError, isFetching, dataUpdatedAt].join());
};

let client: QueryClient;
let tree: ReactTestRenderer | undefined;
let prevAdapter: typeof appAxios.defaults.adapter;

const render = (mountHook: boolean) => {
  act(() => {
    tree = renderer.create(
      React.createElement(QueryClientProvider, { client }, React.createElement(Probe, { mountHook })),
    );
  });
};
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await new Promise(r => setTimeout(r, 0));
  });
};
/** An automatic refetch (focus / stale-time): no CDN bypass. */
const autoRefetch = async () => {
  await act(async () => {
    await out.q?.refetch();
  });
  await flush(); // React Query notifies observers on a 0 ms timer
};
/** Pull-to-refresh / a refresh icon: past the CDN. */
const userRefresh = async () => {
  await act(async () => {
    await runUserRefresh(() => out.q!.refetch());
  });
  await flush();
};
const stamp = () => headerLastUpdate(out.q?.data, null);
const lastSent = () => sent[sent.length - 1];

beforeEach(() => {
  jest.mocked(display).mockClear();
  queue = [];
  sent.length = 0;
  out.q = undefined;
  out.open = undefined;
  onlineManager.setOnline(true);
  prevAdapter = appAxios.defaults.adapter;
  appAxios.defaults.adapter = adapter;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(() => {
  // Every queued /data/all payload was requested — no extra or missing fetch.
  expect(queue).toHaveLength(0);
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  client.clear();
  resetActiveSite();
  appAxios.defaults.adapter = prevAdapter;
});

describe('useSiteData — the cache never goes backwards', () => {
  it('a user refresh brings origin data; a later automatic refetch with an older CDN copy keeps it', async () => {
    const cdnOld = snapshot(T0, T0 + 3 * MIN, 1);
    const origin = snapshot(T0 + 16 * MIN, T0 + 19 * MIN, 2);
    queue = [cdnOld, origin, cdnOld];

    render(true);
    await flush();
    expect(stamp()).toBe(T0);

    await userRefresh();
    expect(lastSent().params?.[FRESH_PARAM]).toEqual(expect.any(Number));
    expect(stamp()).toBe(T0 + 16 * MIN);
    const shown = out.q?.data;
    const updatedBefore = out.q?.dataUpdatedAt ?? 0;

    await autoRefetch();
    expect(lastSent().params?.[FRESH_PARAM]).toBeUndefined(); // still the CDN
    expect(sent).toHaveLength(3);
    // Kept: same object, newer stamp and values.
    expect(out.q?.data).toBe(shown);
    expect(display).toHaveBeenCalledWith(
      'useSiteData: older CDN copy ignored, cached snapshot kept',
      { cached: new Date(T0 + 16 * MIN).toISOString(), received: new Date(T0).toISOString() },
    );
    expect(stamp()).toBe(T0 + 16 * MIN);
    // …and the query settled as a success (no error / refresh-failed strip).
    expect(out.q?.status).toBe('success');
    expect(out.q?.isError).toBe(false);
    expect(out.q?.isRefetchError).toBe(false);
    expect(out.q?.isFetching).toBe(false);
    expect(out.q?.dataUpdatedAt ?? 0).toBeGreaterThanOrEqual(updatedBefore);
  });

  it('a newer automatic copy replaces the cache', async () => {
    queue = [snapshot(T0, T0, 1), snapshot(T0 + 5 * MIN, T0 + 6 * MIN, 2)];
    render(true);
    await flush();
    await autoRefetch();
    expect(stamp()).toBe(T0 + 5 * MIN);
    expect((out.q?.data?.processed as any)?.data?.processed?.ed_solar).toBe(2);
  });

  it('a user refresh shows exactly what the origin has, even if older than the cache', async () => {
    queue = [snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2), snapshot(T0, T0, 1)];
    render(true);
    await flush();
    await userRefresh();
    expect(stamp()).toBe(T0);
  });

  it('missing timestamps fall back to normal replacement', async () => {
    queue = [snapshot(T0 + 16 * MIN, T0 + 16 * MIN, 2), snapshot(null, null, 7)];
    render(true);
    await flush();
    await autoRefetch();
    expect(stamp()).toBeNull();
    expect((out.q?.data?.processed as any)?.data?.processed?.ed_solar).toBe(7);
  });

  it('opening a site (prefetch past the CDN) then an older automatic CDN copy keeps the opened data', async () => {
    queue = [snapshot(T0 + 16 * MIN, T0 + 19 * MIN, 2), snapshot(T0, T0 + 3 * MIN, 1)];
    render(false);
    await act(async () => {
      out.open?.(SITE);
    });
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toContain(`/protected/data/all/${SITE}`);
    expect(sent[0].params?.[FRESH_PARAM]).toEqual(expect.any(Number));

    // SiteDetail mounts: cache is fresh, nothing is sent.
    act(() => {
      tree?.update(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(Probe, { mountHook: true }),
        ),
      );
    });
    await flush();
    expect(sent).toHaveLength(1);
    expect(stamp()).toBe(T0 + 16 * MIN);

    await autoRefetch();
    expect(sent).toHaveLength(2);
    expect(lastSent().params?.[FRESH_PARAM]).toBeUndefined();
    expect(stamp()).toBe(T0 + 16 * MIN);
    expect(out.q?.status).toBe('success');
    expect(out.q?.isError).toBe(false);
    expect(queue).toHaveLength(0);
  });
});
