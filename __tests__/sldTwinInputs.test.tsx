/**
 * SLD web twin — what the page is fed (SldTwin/useSldTwinInputs.ts).
 *
 *  - `sld` is the RAW `siteComponents.sldV2` (same reference — the twin
 *    parses it itself; `selectSldGraph` would drop fields it reads);
 *  - `live` is `/protected/data/all` → `live.data` (same reference); once
 *    the query settled without one (`live: null`) it is the frozen
 *    EMPTY_LIVE (the web's store starts as `{}`), null only before any
 *    answer;
 *  - `siteName` is the SiteDetail route's param, found by site id even
 *    from the full-screen route above it; '' outside a navigator;
 *  - the result keeps its reference across unrelated re-renders and
 *    equal refetches, so the host never resends;
 *  - Grouped | Units (`mode`): Units = the raw objects; Grouped = the
 *    Diagram's own grouping (twinGrouped.ts), the same objects on every
 *    switch; a site with nothing to group is always Units.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContext } from '@react-navigation/native';

// /data/all fetches answer only when a test says so (never the network): a
// query with nothing cached stays 'pending' until then.
const mockFetch: { respond: (data: unknown) => void } = { respond: () => undefined };
jest.mock('../src/networking', () => {
  const actual = jest.requireActual('../src/networking') as object;
  return {
    ...actual,
    getSiteAllData: () =>
      new Promise(resolve => {
        mockFetch.respond = resolve;
      }),
  };
});

import {
  EMPTY_LIVE,
  liveEnvelope,
  rawSldV2,
  SldTwinInputs,
  siteNameFromNavigationState,
  useSldTwinInputs,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/useSldTwinInputs';
import { twinDataFor } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinGrouped';
import luckyFixture from '../scripts/web-twin/fixtures/lucky.json';
import { selectSldGraph } from '../src/utils/sld';
import { buildSldGrouping } from '../src/utils/sldGroup';
import type { SldViewMode } from '../src/hooks/useSldViewMode';
import { siteConfigQueryKey } from '../src/hooks/useSiteConfig';
import { siteDataQueryKey } from '../src/hooks/useSiteData';
import { useThemeStore } from '../src/hooks/useThemeStore';

const SITE = '146c5345-8f7f-40e9-9e32-b065e085235d';

const makeConfig = () => ({
  siteComponents: {
    sldV2: {
      nodes: [
        {
          id: '1',
          type: 'custom',
          position: { x: 479.2, y: 498.18 },
          // A field the app's own parser drops — the twin must still get it.
          data: { heading: 'LCL Plant', keys: [], type: 'logo', webOnly: { kept: true } },
        },
      ],
      edges: [],
    },
    cards: [],
  },
});

const makeSiteData = (value: number, lastUpdate: string) => ({
  live: {
    data: { live: { p30: { value, update_at: 1759310000 } }, update_at: 1759310000 },
    metadata: { last_update: lastUpdate },
  },
  processed: null,
  alarms: null,
});

const NAV_STATE = {
  routes: [
    { key: 'd', name: 'Dashboard' },
    { key: 's', name: 'SiteDetail', params: { siteId: SITE, siteName: 'Lucky Cement Nooriabad' } },
    { key: 'f', name: 'SLDFullscreen', params: { siteId: SITE } },
  ],
};

// React Query notifies observers on a 0 ms timer; deliver inside act().
beforeAll(() => notifyManager.setScheduler(cb => cb()));
afterAll(() => notifyManager.setScheduler(cb => setTimeout(cb, 0)));

describe('pure readers', () => {
  it('rawSldV2 passes the backend object through untouched', () => {
    const config = makeConfig();
    expect(rawSldV2(config)).toBe(config.siteComponents.sldV2);
    expect(rawSldV2(undefined)).toBeNull();
    expect(rawSldV2({})).toBeNull();
    expect(rawSldV2({ siteComponents: null })).toBeNull();
    expect(rawSldV2({ siteComponents: { sldV2: [] } })).toBeNull();
    expect(rawSldV2({ siteComponents: { sldV2: 'x' } })).toBeNull();
  });

  it('liveEnvelope is /data/all → live.data, untouched', () => {
    const data = makeSiteData(1, '2026-10-09T10:00:00Z');
    expect(liveEnvelope(data)).toBe(data.live.data);
    expect(liveEnvelope(null)).toBeNull();
    expect(liveEnvelope({ live: null })).toBeNull();
    expect(liveEnvelope({ live: { data: 5 } })).toBeNull();
  });

  it('siteNameFromNavigationState finds the SiteDetail params by site id', () => {
    expect(siteNameFromNavigationState(NAV_STATE, SITE)).toBe('Lucky Cement Nooriabad');
    expect(siteNameFromNavigationState(NAV_STATE, 'another-site')).toBeNull();
    // Nested navigator states are searched too.
    expect(
      siteNameFromNavigationState(
        { routes: [{ name: 'Drawer', state: { routes: [{ name: 'DashboardStack', state: NAV_STATE }] } }] },
        SITE,
      ),
    ).toBe('Lucky Cement Nooriabad');
    // The newest route wins; a blank name is no name.
    expect(
      siteNameFromNavigationState(
        {
          routes: [
            { name: 'SiteDetail', params: { siteId: SITE, siteName: 'Old' } },
            { name: 'SiteDetail', params: { siteId: SITE, siteName: '  ' } },
            { name: 'SiteDetail', params: { siteId: SITE, siteName: 'New' } },
          ],
        },
        SITE,
      ),
    ).toBe('New');
    [undefined, null, 'x', {}, { routes: 'x' }, { routes: [null, 3, { params: 7 }] }].forEach(s =>
      expect(siteNameFromNavigationState(s, SITE)).toBeNull(),
    );
  });
});

describe('useSldTwinInputs', () => {
  let tree: ReactTestRenderer | undefined;
  let client: QueryClient;
  const seen: SldTwinInputs[] = [];

  let mode: SldViewMode = 'grouped';
  const Probe = ({ m }: { m?: SldViewMode }) => {
    seen.push(useSldTwinInputs(SITE, m ?? mode));
    return null;
  };

  const navigation = { getState: () => NAV_STATE } as unknown as React.ContextType<typeof NavigationContext>;

  const mount = (withNavigator = true) => {
    const probe = <Probe />;
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={client}>
          {withNavigator ? (
            <NavigationContext.Provider value={navigation}>{probe}</NavigationContext.Provider>
          ) : (
            probe
          )}
        </QueryClientProvider>,
      );
    });
  };
  const last = () => seen[seen.length - 1];

  beforeEach(() => {
    seen.length = 0;
    mode = 'grouped';
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(siteConfigQueryKey(SITE), makeConfig());
    client.setQueryData(siteDataQueryKey(SITE), makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    act(() => {
      useThemeStore.setState({ isDark: true });
    });
  });
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    client.clear();
  });

  it('reads the raw sldV2, live.data, the route site name and the theme', () => {
    mount();
    const config = client.getQueryData(siteConfigQueryKey(SITE)) as ReturnType<typeof makeConfig>;
    const data = client.getQueryData(siteDataQueryKey(SITE)) as ReturnType<typeof makeSiteData>;
    expect(last().sld).toBe(config.siteComponents.sldV2);
    expect(last().live).toBe(data.live.data);
    expect(last().siteName).toBe('Lucky Cement Nooriabad');
    expect(last().theme).toBe('dark');
    // One node: nothing to group, so Grouped (the default) is Units.
    expect(last().mode).toBe('units');
  });

  it('keeps every reference across re-renders and equal refetches', () => {
    mount();
    const first = last();
    act(() => tree?.update(
      <QueryClientProvider client={client}>
        <NavigationContext.Provider value={navigation}>
          <Probe />
        </NavigationContext.Provider>
      </QueryClientProvider>,
    ));
    // An equal payload (new objects) is structurally shared away.
    act(() => {
      client.setQueryData(siteConfigQueryKey(SITE), makeConfig());
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    });
    expect(seen.length).toBeGreaterThan(1);
    seen.forEach(s => expect(s).toBe(first));
  });

  it('a live refetch changes only `live`; a theme flip only `theme`', () => {
    mount();
    const first = last();
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(250, '2026-10-09T10:05:00Z'));
    });
    const afterLive = last();
    expect(afterLive).not.toBe(first);
    expect(afterLive.sld).toBe(first.sld);
    expect(afterLive.live).not.toBe(first.live);
    expect(afterLive.live).toEqual({ live: { p30: { value: 250, update_at: 1759310000 } }, update_at: 1759310000 });
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    expect(last().theme).toBe('light');
    expect(last().sld).toBe(first.sld);
    expect(last().live).toBe(afterLive.live);
  });

  it('no live block (`live: null`) → EMPTY_LIVE, the same object every time', () => {
    client.setQueryData(siteDataQueryKey(SITE), { live: null, processed: null, alarms: null });
    mount();
    expect(last().live).toBe(EMPTY_LIVE);
    expect(EMPTY_LIVE).toEqual({});
    expect(Object.isFrozen(EMPTY_LIVE)).toBe(true);
    const first = last();
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), { live: { metadata: {} }, processed: null, alarms: null });
    });
    expect(last().live).toBe(EMPTY_LIVE);
    expect(last()).toBe(first);
    // Real live data replaces it.
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    });
    expect(last().live).toEqual(makeSiteData(218.1, '').live.data);
  });

  it('before /data/all has answered, `live` is null (the page waits)', async () => {
    client.removeQueries({ queryKey: siteDataQueryKey(SITE) });
    mount();
    expect(client.getQueryState(siteDataQueryKey(SITE))?.status).toBe('pending');
    expect(last().live).toBeNull();
    expect(last().sld).not.toBeNull();
    // The answer arrives (and the fetch settles before teardown).
    const data = makeSiteData(218.1, '2026-10-09T10:00:00Z');
    await act(async () => {
      mockFetch.respond(data);
    });
    expect(last().live).toEqual(data.live.data);
  });

  it('outside a navigator the name is empty (no throw)', () => {
    mount(false);
    expect(last().siteName).toBe('');
    expect(last().sld).not.toBeNull();
  });

  describe('Grouped | Units', () => {
    const luckyConfig = { siteComponents: { sldV2: luckyFixture.sld } };
    const luckyData = { live: { data: luckyFixture.live, metadata: {} }, processed: null, alarms: null };
    const rerender = (m: SldViewMode) =>
      act(() => tree?.update(
        <QueryClientProvider client={client}>
          <NavigationContext.Provider value={navigation}>
            <Probe m={m} />
          </NavigationContext.Provider>
        </QueryClientProvider>,
      ));
    beforeEach(() => {
      client.setQueryData(siteConfigQueryKey(SITE), luckyConfig);
      client.setQueryData(siteDataQueryKey(SITE), luckyData);
    });

    it('Grouped feeds the Diagram’s own grouping; Units the raw objects', () => {
      mount();
      const config = client.getQueryData(siteConfigQueryKey(SITE)) as typeof luckyConfig;
      const data = client.getQueryData(siteDataQueryKey(SITE)) as typeof luckyData;
      const grouping = buildSldGrouping(selectSldGraph(config)!);
      const expected = twinDataFor('grouped', config.siteComponents.sldV2 as never, grouping, data.live.data as never);
      expect(last().mode).toBe('grouped');
      expect(last().sld).toBe(expected.sld);
      expect(last().live).toBe(expected.live);
      expect((last().sld as { nodes: { data: { heading: string } }[] }).nodes.map(n => n.data.heading)).toEqual([
        'LCL Plant',
        'Wind · 6',
        'Solar · 9',
        'Captive Plant',
        'BESS',
        'WHR Plant',
        'SVG',
      ]);
      rerender('units');
      expect(last().mode).toBe('units');
      expect(last().sld).toBe(config.siteComponents.sldV2);
      expect(last().live).toBe(data.live.data);
    });

    it('switching back and forth hands back the same objects', () => {
      mount();
      const g = last();
      rerender('units');
      const u = last();
      rerender('grouped');
      expect(last().sld).toBe(g.sld);
      expect(last().live).toBe(g.live);
      rerender('units');
      expect(last().sld).toBe(u.sld);
      expect(last().live).toBe(u.live);
    });

    it('a config refetch that keeps the diagram (only cards / trends changed) sends nothing in Grouped', () => {
      mount();
      const first = last();
      const config = client.getQueryData(siteConfigQueryKey(SITE)) as typeof luckyConfig;
      act(() => {
        // A NEW config object around the SAME sldV2 (what React Query's
        // structural sharing hands back when only other fields changed).
        client.setQueryData(siteConfigQueryKey(SITE), {
          ...config,
          siteComponents: { ...config.siteComponents, cards: [{ name: 'New card' }] },
        });
      });
      const next = client.getQueryData(siteConfigQueryKey(SITE)) as typeof luckyConfig;
      expect(next).not.toBe(config);
      expect(next.siteComponents.sldV2).toBe(config.siteComponents.sldV2);
      expect(last().mode).toBe('grouped');
      expect(last().sld).toBe(first.sld);
      expect(last().live).toBe(first.live);
    });

    it('a live refetch in Grouped changes only `live`', () => {
      mount();
      const first = last();
      act(() => {
        client.setQueryData(siteDataQueryKey(SITE), {
          ...luckyData,
          live: { ...luckyData.live, data: { ...luckyFixture.live, update_at: 1759310460 } },
        });
      });
      expect(last().sld).toBe(first.sld);
      expect(last().live).not.toBe(first.live);
      expect(last().mode).toBe('grouped');
    });
  });
});
