/**
 * SLD web twin — the WebView host (SldTwin/SldTwinView.tsx).
 *
 *  - the generated page is required on first render, never at import, and
 *    served with the app's theme as its <body> class (no dark flash in
 *    light mode); a theme flip while it is up never reloads it;
 *  - nothing is sent before the page says `ready`; then ONE `init` with the
 *    RAW sldV2, live.data, theme, site name, host and visibility — once the
 *    diagram is loaded and /data/all has answered (no live data, or a
 *    failed fetch → `{}`: every reading "—", like the web);
 *  - afterwards only what changed (`live`, `sld`, `theme`, `visible`),
 *    never a resend on an unrelated render or an equal refetch;
 *  - Grouped | Units (`mode`) re-feeds the running page — into Grouped
 *    `live` then `sld`, back to Units `sld` then `live`, once each, never a
 *    reload; a site with nothing to group ignores it;
 *  - `error` → display() + onFail once (WebView dropped); `exit` → onExit;
 *    `warn` is logged, never fatal; garbage is ignored; `mounted` /
 *    `entered` are logged; a skeleton covers the panel until `mounted`;
 *  - a dead web content process remounts the WebView by key; only a crash
 *    LOOP (TWIN_MAX_CRASHES deaths in a row, none entered, each within
 *    TWIN_CRASH_WINDOW_MS of its page's start) reports onFail;
 *  - the WebView props the plan mandates.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContext } from '@react-navigation/native';

const mockWeb: { mounts: number; unmounts: number; injected: string[] } = {
  mounts: 0,
  unmounts: 0,
  injected: [],
};

// A WebView whose ref records injectJavaScript and whose (re)mounts count.
jest.mock('react-native-webview', () => {
  const R = require('react');
  const { View: RNView } = require('react-native');
  const WebView = R.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    R.useImperativeHandle(ref, () => ({
      injectJavaScript: (code: string) => mockWeb.injected.push(code),
    }));
    R.useEffect(() => {
      mockWeb.mounts += 1;
      return () => {
        mockWeb.unmounts += 1;
      };
    }, []);
    return R.createElement(RNView, { ...props, testID: 'twin-webview' });
  });
  return { __esModule: true, default: WebView, WebView };
});

// The generated page (written by scripts/web-twin/build.mjs) — a stub that
// counts how often it is evaluated.
const mockPage = { loads: 0 };
jest.mock(
  '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinHtml.generated',
  () => {
    mockPage.loads += 1;
    return {
      __esModule: true,
      TWIN_HTML: '<!doctype html><title>twin</title><body class="__THEME__"><div id="root"></div></body>',
      TWIN_THEME_PLACEHOLDER: '__THEME__',
      TWIN_BUILD_ID: 'test-build',
      TWIN_MANIFEST: {},
    };
  },
  { virtual: true },
);

// /data/all fetches resolve only when a test says so (never the network).
const mockGetSiteAllData = jest.fn<(id: string) => Promise<unknown>>();
jest.mock('../src/networking', () => {
  const actual = jest.requireActual('../src/networking') as object;
  return { ...actual, getSiteAllData: (id: string) => mockGetSiteAllData(id) };
});

const mockDisplay = jest.fn();
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  display: (...args: unknown[]) => mockDisplay(...args),
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}));

import SldTwinView, {
  TWIN_CRASH_WINDOW_MS,
  TWIN_MAX_CRASHES,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/SldTwinView';
import {
  TWIN_RECEIVE_FN,
  TwinCommand,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/protocol';
import { twinDataFor } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinGrouped';
import luckyFixture from '../scripts/web-twin/fixtures/lucky.json';
import { selectSldGraph } from '../src/utils/sld';
import { buildSldGrouping } from '../src/utils/sldGroup';
import type { SldViewMode } from '../src/hooks/useSldViewMode';
import { siteConfigQueryKey } from '../src/hooks/useSiteConfig';
import { siteDataQueryKey } from '../src/hooks/useSiteData';
import { useThemeStore } from '../src/hooks/useThemeStore';
import { webTwin } from '../src/theme';
import { Skeleton } from '../src/components/common';

const SITE = '146c5345-8f7f-40e9-9e32-b065e085235d';

const makeSld = (heading = 'LCL Plant') => ({
  nodes: [
    {
      id: '1',
      type: 'custom',
      position: { x: 479.2, y: 498.18 },
      data: {
        heading,
        keys: [{ unit: 'kW', param: 'live.p30.value', label: 'P' }],
        icon: { color: '#ff64ff', name: 'industry' },
        type: 'logo',
        // Dropped by the app's own parser; the twin must get it.
        webOnly: { kept: true },
      },
    },
  ],
  edges: [],
});
const makeConfig = (heading?: string) => ({ siteComponents: { sldV2: makeSld(heading) } });
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
  ],
};
const navigation = { getState: () => NAV_STATE } as unknown as React.ContextType<typeof NavigationContext>;

let tree: ReactTestRenderer | undefined;
let client: QueryClient;
const onExit = jest.fn();
const onFail = jest.fn();
const onGesture = jest.fn();

interface ViewProps {
  host?: 'inline' | 'fullscreen';
  visible?: boolean;
  mode?: SldViewMode;
}
const element = ({ host = 'inline', visible = true, mode = 'grouped' }: ViewProps = {}) => (
  <QueryClientProvider client={client}>
    <NavigationContext.Provider value={navigation}>
      <SldTwinView
        siteId={SITE}
        host={host}
        mode={mode}
        visible={visible}
        onExit={() => onExit()}
        onFail={r => onFail(r)}
        onGesture={a => onGesture(a)}
      />
    </NavigationContext.Provider>
  </QueryClientProvider>
);
const mount = (props?: ViewProps) => {
  act(() => {
    tree = renderer.create(element(props));
  });
};
const update = (props?: ViewProps) => act(() => tree?.update(element(props)));

const webViews = (): ReactTestInstance[] =>
  (tree as ReactTestRenderer).root.findAll(
    n => n.props.testID === 'twin-webview' && typeof n.type !== 'string',
  );
const web = (): ReactTestInstance => webViews()[0];
const post = (msg: unknown) =>
  act(() => web().props.onMessage({ nativeEvent: { data: typeof msg === 'string' ? msg : JSON.stringify(msg) } }));

/** The page as served, for a theme. */
const page = (theme: 'dark' | 'light') =>
  `<!doctype html><title>twin</title><body class="${theme}"><div id="root"></div></body>`;

/** The panel (root View) reports its size, as on a device. */
const layoutPanel = (height: number) => {
  const panel = (tree as ReactTestRenderer).root.find(
    n => typeof n.type !== 'string' && typeof n.props.onLayout === 'function',
  );
  act(() => panel.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 358, height } } }));
};
const skeletons = () => (tree as ReactTestRenderer).root.findAllByType(Skeleton);

const PREFIX = `window.${TWIN_RECEIVE_FN}(`;
const SUFFIX = ');true;';
const decode = (code: string): TwinCommand => {
  expect(code.startsWith(PREFIX)).toBe(true);
  expect(code.endsWith(SUFFIX)).toBe(true);
  return JSON.parse(code.slice(PREFIX.length, -SUFFIX.length)) as TwinCommand;
};
const sent = (): TwinCommand[] => mockWeb.injected.map(decode);
const sentTypes = () => sent().map(c => c.type);

// React Query notifies observers on a 0 ms timer; deliver inside act().
beforeAll(() => notifyManager.setScheduler(cb => cb()));
afterAll(() => notifyManager.setScheduler(cb => setTimeout(cb, 0)));

beforeEach(() => {
  mockWeb.mounts = 0;
  mockWeb.unmounts = 0;
  mockWeb.injected = [];
  mockDisplay.mockClear();
  mockGetSiteAllData.mockReset();
  onExit.mockClear();
  onFail.mockClear();
  onGesture.mockClear();
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

describe('SldTwinView — the page', () => {
  // First in the file: the module is imported above, the page not yet.
  it('requires the generated page on first render, never at import, and only once', () => {
    expect(mockPage.loads).toBe(0);
    mount();
    expect(mockPage.loads).toBe(1);
    act(() => tree?.unmount());
    mount();
    expect(mockPage.loads).toBe(1);
  });

  it('mounts the WebView with the plan’s props', () => {
    mount();
    const p = web().props;
    expect(p.source).toEqual({ html: page('dark'), baseUrl: 'about:blank' });
    expect(p.autoManageStatusBarEnabled).toBe(false);
    expect(p.originWhitelist).toEqual(['about:*']);
    expect(p.javaScriptEnabled).toBe(true);
    expect(p.scrollEnabled).toBe(false);
    expect(p.bounces).toBe(false);
    expect(p.overScrollMode).toBe('never');
    expect(p.setSupportMultipleWindows).toBe(false);
    expect(p.setBuiltInZoomControls).toBe(false);
    expect(p.webviewDebuggingEnabled).toBe(__DEV__);
    // 'software' would disable WebGL: the default stays.
    expect(p.androidLayerType).toBeUndefined();
    expect(typeof p.onContentProcessDidTerminate).toBe('function');
    expect(typeof p.onRenderProcessGone).toBe('function');
    // Only the page's own load passes.
    expect(p.onShouldStartLoadWithRequest({ url: 'about:blank' })).toBe(true);
    expect(p.onShouldStartLoadWithRequest({ url: 'https://example.com/' })).toBe(false);
    expect(p.onShouldStartLoadWithRequest({ url: 'file:///etc/hosts' })).toBe(false);
  });

  it('inline: nestedScrollEnabled (Android — the body ScrollView never takes over a drag on the 3D); full screen: not', () => {
    mount({ host: 'inline' });
    expect(web().props.nestedScrollEnabled).toBe(true);
    act(() => tree?.unmount());
    mount({ host: 'fullscreen' });
    expect(web().props.nestedScrollEnabled).toBe(false);
  });

  it('is painted with the page background of the current theme (no white flash)', () => {
    mount();
    expect(StyleSheet.flatten(web().props.style).backgroundColor).toBe(webTwin.bgDark);
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    expect(StyleSheet.flatten(web().props.style).backgroundColor).toBe(webTwin.bgLight);
    expect(webTwin).toEqual({ bgDark: '#0B0F14', bgLight: '#F6F8FB' });
  });

  it('serves the page in the app’s theme; a flip while it is up never reloads it', () => {
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    mount();
    const source = web().props.source;
    expect(source.html).toBe(page('light'));
    act(() => {
      useThemeStore.setState({ isDark: true });
    });
    // Same page (same object): the flip travels as a `theme` message.
    expect(web().props.source).toBe(source);
    expect(mockWeb.mounts).toBe(1);
    act(() => tree?.unmount());
    mount();
    expect(web().props.source.html).toBe(page('dark'));
  });

  it('a skeleton covers the panel until the twin’s root is up, and after a remount', () => {
    mount();
    expect(skeletons()).toHaveLength(0); // not laid out yet
    layoutPanel(640);
    expect(skeletons()).toHaveLength(1);
    expect(skeletons()[0].props).toMatchObject({ width: '100%', height: 640 });
    post({ type: 'ready' });
    expect(skeletons()).toHaveLength(1);
    post({ type: 'mounted', ms: 133 });
    expect(skeletons()).toHaveLength(0);
    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    expect(skeletons()).toHaveLength(1);
  });
});

describe('SldTwinView — messages', () => {
  it('sends nothing before `ready`, then one init with the raw inputs', () => {
    mount({ host: 'fullscreen', visible: false });
    expect(mockWeb.injected).toEqual([]);
    post({ type: 'ready', build: 'test-build', react: '19.3.0' });
    expect(sent()).toEqual([
      {
        type: 'init',
        sld: makeSld(),
        live: makeSiteData(218.1, '').live.data,
        theme: 'dark',
        siteName: 'Lucky Cement Nooriabad',
        host: 'fullscreen',
        visible: false,
      },
    ]);
    expect(mockDisplay.mock.calls.some(c => c[0] === 'sld twin ready')).toBe(true);
  });

  it('a site with no live data (`live: null`) still mounts: init with an empty store', () => {
    client.setQueryData(siteDataQueryKey(SITE), { live: null, processed: null, alarms: null });
    mount();
    post({ type: 'ready' });
    expect(sent()).toEqual([expect.objectContaining({ type: 'init', live: {}, sld: makeSld() })]);
    // Live data later → a plain `live` update.
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(250, '2026-10-09T10:05:00Z'));
    });
    expect(sent()[1]).toEqual({ type: 'live', live: makeSiteData(250, '').live.data });
  });

  it('a failed first /data/all fetch still mounts: init with an empty store', async () => {
    mockGetSiteAllData.mockImplementation(() => Promise.reject(Object.assign(new Error('Not Found'), { response: { status: 404 } })));
    client.removeQueries({ queryKey: siteDataQueryKey(SITE) });
    mount();
    post({ type: 'ready' });
    await act(async () => {
      await Promise.resolve();
    });
    expect(client.getQueryState(siteDataQueryKey(SITE))?.status).toBe('error');
    expect(sent()).toEqual([expect.objectContaining({ type: 'init', live: {} })]);
  });

  it('waits for the live data before init', async () => {
    let respond: (data: unknown) => void = () => undefined;
    mockGetSiteAllData.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          respond = resolve;
        }),
    );
    client.removeQueries({ queryKey: siteDataQueryKey(SITE) });
    mount();
    post({ type: 'ready' });
    expect(mockGetSiteAllData).toHaveBeenCalledWith(SITE);
    expect(mockWeb.injected).toEqual([]);
    await act(async () => {
      respond(makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    });
    expect(sentTypes()).toEqual(['init']);
  });

  it('resends nothing on unrelated renders or equal refetches', () => {
    mount();
    post({ type: 'ready' });
    update();
    update();
    act(() => {
      client.setQueryData(siteConfigQueryKey(SITE), makeConfig());
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    });
    expect(sentTypes()).toEqual(['init']);
  });

  it('sends live / sld / theme only when each changes', () => {
    mount();
    post({ type: 'ready' });
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(250, '2026-10-09T10:05:00Z'));
    });
    act(() => {
      client.setQueryData(siteConfigQueryKey(SITE), makeConfig('LCL Plant 2'));
    });
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    update();
    expect(sent().slice(1)).toEqual([
      { type: 'live', live: makeSiteData(250, '').live.data },
      { type: 'sld', sld: makeSld('LCL Plant 2') },
      { type: 'theme', theme: 'light' },
    ]);
  });

  it('toggles visibility', () => {
    mount({ visible: true });
    post({ type: 'ready' });
    update({ visible: false });
    update({ visible: false });
    update({ visible: true });
    expect(sent().slice(1)).toEqual([
      { type: 'visible', visible: false },
      { type: 'visible', visible: true },
    ]);
  });

  it('a reloaded page (a second `ready`) gets init again', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'ready' });
    expect(sentTypes()).toEqual(['init', 'init']);
  });

  it('logs mounted / entered with the page and host timings', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'mounted', ms: 133 });
    post({ type: 'entered', ms: 2410 });
    const mounted = mockDisplay.mock.calls.find(c => c[0] === 'sld twin mounted');
    const entered = mockDisplay.mock.calls.find(c => c[0] === 'sld twin entered');
    expect(mounted?.[1]).toMatchObject({ host: 'inline', pageMs: 133 });
    expect(entered?.[1]).toMatchObject({ host: 'inline', pageMs: 2410 });
    expect(typeof (entered?.[1] as { sinceViewMs: unknown }).sinceViewMs).toBe('number');
  });

  it('warn → logged, never fatal', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'warn', where: 'window', message: 'InvalidStateError: releasePointerCapture' });
    expect(onFail).not.toHaveBeenCalled();
    expect(webViews()).toHaveLength(1);
    const logged = mockDisplay.mock.calls.find(c => c[0] === 'sld twin warning');
    expect(logged?.[1]).toMatchObject({ host: 'inline', where: 'window' });
  });

  it('ignores garbage', () => {
    mount();
    ['', 'nope', '{"type":"viewChange","view":"diagram"}', '[1]', '{"type":"error"'].forEach(post);
    expect(mockWeb.injected).toEqual([]);
    expect(onFail).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('exit → onExit', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'exit' });
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onFail).not.toHaveBeenCalled();
  });

  it('gesture → onGesture, once per change (the host holds the page scroll in between)', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'gesture', active: true });
    post({ type: 'gesture', active: true });
    expect(onGesture.mock.calls).toEqual([[true]]);
    post({ type: 'gesture', active: false });
    post({ type: 'gesture', active: false });
    expect(onGesture.mock.calls).toEqual([[true], [false]]);
    post({ type: 'gesture', active: 'yes' }); // not a contract message
    expect(onGesture).toHaveBeenCalledTimes(2);
  });

  it('a page that goes away mid-gesture always releases the host (unmount, reload, failure)', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'gesture', active: true });
    post({ type: 'ready' }); // the page reloaded: no finger of the old page is down
    expect(onGesture.mock.calls).toEqual([[true], [false]]);

    post({ type: 'gesture', active: true });
    post({ type: 'error', where: 'onerror', message: 'boom' });
    expect(onGesture.mock.calls).toEqual([[true], [false], [true], [false]]);
    expect(onFail).toHaveBeenCalledTimes(1);

    act(() => tree?.unmount());
    tree = undefined;
    expect(onGesture).toHaveBeenCalledTimes(4); // already released: not again

    mount();
    post({ type: 'ready' });
    post({ type: 'gesture', active: true });
    act(() => tree?.unmount());
    tree = undefined;
    expect(onGesture.mock.calls.slice(-2)).toEqual([[true], [false]]);
  });

  it('error → display + onFail once; the WebView is dropped and later messages ignored', () => {
    mount();
    post({ type: 'ready' });
    post({ type: 'error', where: 'onerror', message: 'WebGL2 unavailable' });
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith('onerror: WebGL2 unavailable');
    expect(
      mockDisplay.mock.calls.some(
        c => c[0] === 'sld twin error' && (c[1] as { message: string }).message === 'WebGL2 unavailable' && c[3] === true,
      ),
    ).toBe(true);
    expect(webViews()).toHaveLength(0);
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(250, '2026-10-09T10:05:00Z'));
    });
    expect(sentTypes()).toEqual(['init']);
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('a page load error fails the twin', () => {
    mount();
    act(() => web().props.onError({ nativeEvent: { code: -1, description: 'load failed', url: 'about:blank' } }));
    expect(onFail).toHaveBeenCalledWith('load: load failed');
    expect(webViews()).toHaveLength(0);
  });
});

describe('SldTwinView — Grouped | Units', () => {
  const luckyConfig = { siteComponents: { sldV2: luckyFixture.sld } };
  const luckyData = (update_at = 1759310000) => ({
    live: { data: { ...luckyFixture.live, update_at }, metadata: {} },
    processed: null,
    alarms: null,
  });
  /** What the twin is fed for a mode, from what the caches hold now. */
  const fed = (mode: SldViewMode) => {
    const config = client.getQueryData(siteConfigQueryKey(SITE)) as typeof luckyConfig;
    const data = client.getQueryData(siteDataQueryKey(SITE)) as ReturnType<typeof luckyData>;
    const grouping = buildSldGrouping(selectSldGraph(config)!);
    return twinDataFor(mode, config.siteComponents.sldV2 as never, grouping, data.live.data as never);
  };
  const headings = (cmd: TwinCommand) =>
    (cmd as unknown as { sld: { nodes: { data: { heading: string } }[] } }).sld.nodes.map(n => n.data.heading);
  beforeEach(() => {
    client.setQueryData(siteConfigQueryKey(SITE), luckyConfig);
    client.setQueryData(siteDataQueryKey(SITE), luckyData());
  });

  it('init carries the mode’s diagram and data', () => {
    mount({ mode: 'grouped' });
    post({ type: 'ready' });
    const grouped = fed('grouped');
    expect(sent()).toEqual([expect.objectContaining({ type: 'init', sld: grouped.sld, live: grouped.live })]);
    expect(headings(sent()[0])).toEqual(['LCL Plant', 'Wind · 6', 'Solar · 9', 'Captive Plant', 'BESS', 'WHR Plant', 'SVG']);
  });

  it('a switch re-feeds the running page once, in a consistent order, never reloading it', () => {
    mount({ mode: 'units' });
    layoutPanel(640);
    post({ type: 'ready' });
    post({ type: 'mounted', ms: 120 });
    expect(skeletons()).toHaveLength(0);
    expect(sent()).toEqual([expect.objectContaining({ type: 'init', sld: luckyFixture.sld })]);
    const source = web().props.source;

    // Into Grouped: the data (a superset) first, then the diagram that reads it.
    update({ mode: 'grouped' });
    const grouped = fed('grouped');
    expect(sent().slice(1)).toEqual([
      { type: 'live', live: grouped.live },
      { type: 'sld', sld: grouped.sld },
    ]);
    update({ mode: 'grouped' });
    expect(sent()).toHaveLength(3);

    // Back to Units: the diagram first (it reads only real params), then the data.
    update({ mode: 'units' });
    expect(sent().slice(3)).toEqual([
      { type: 'sld', sld: luckyFixture.sld },
      { type: 'live', live: fed('units').live },
    ]);

    // Same WebView, same page, no skeleton: a switch never reloads the twin.
    expect(mockWeb.mounts).toBe(1);
    expect(mockWeb.unmounts).toBe(0);
    expect(web().props.source).toBe(source);
    expect(skeletons()).toHaveLength(0);
  });

  it('in Grouped a live refetch sends only `live` (with the groups’ readings)', () => {
    mount({ mode: 'grouped' });
    post({ type: 'ready' });
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), luckyData(1759310460));
    });
    expect(sentTypes()).toEqual(['init', 'live']);
    const live = (sent()[1] as Extract<TwinCommand, { type: 'live' }>).live as { live: Record<string, unknown> };
    expect(live).toEqual(fed('grouped').live);
    expect(live.live['Wind units flowing']).toEqual({ value: 4 });
  });

  it('a site with nothing to group ignores the mode', () => {
    client.setQueryData(siteConfigQueryKey(SITE), makeConfig());
    client.setQueryData(siteDataQueryKey(SITE), makeSiteData(218.1, '2026-10-09T10:00:00Z'));
    mount({ mode: 'grouped' });
    post({ type: 'ready' });
    update({ mode: 'units' });
    update({ mode: 'grouped' });
    expect(sent()).toEqual([expect.objectContaining({ type: 'init', sld: makeSld() })]);
  });
});

describe('SldTwinView — a dead web content process', () => {
  it('remounts by key, re-inits the new page, and gives up at the cap', () => {
    expect(TWIN_MAX_CRASHES).toBe(2);
    mount();
    post({ type: 'ready' });
    expect(mockWeb.mounts).toBe(1);

    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    expect(mockWeb.mounts).toBe(2);
    expect(mockWeb.unmounts).toBe(1);
    expect(onFail).not.toHaveBeenCalled();
    // The new page starts empty: nothing until its own `ready`, then init.
    act(() => {
      client.setQueryData(siteDataQueryKey(SITE), makeSiteData(250, '2026-10-09T10:05:00Z'));
    });
    expect(sentTypes()).toEqual(['init']);
    post({ type: 'ready' });
    expect(sentTypes()).toEqual(['init', 'init']);
    expect((sent()[1] as Extract<TwinCommand, { type: 'init' }>).live).toEqual(
      makeSiteData(250, '').live.data,
    );

    act(() => web().props.onRenderProcessGone({ nativeEvent: { didCrash: true } }));
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith('crash: renderer crashed');
    expect(mockWeb.mounts).toBe(2); // no further remount
    expect(webViews()).toHaveLength(0);
  });

  it('a page that came back (`entered`) was not a crash loop: the next death remounts', () => {
    mount();
    post({ type: 'ready' });
    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    post({ type: 'ready' });
    post({ type: 'mounted', ms: 120 });
    post({ type: 'entered', ms: 2400 });
    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    expect(onFail).not.toHaveBeenCalled();
    expect(mockWeb.mounts).toBe(3);
    // …but two quick deaths in a row (nothing entered) still give up.
    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    expect(onFail).toHaveBeenCalledWith('crash: web content process terminated');
  });

  it('a page that ran past the window was killed, not crash-looping', () => {
    let t = Date.now();
    const now = jest.spyOn(Date, 'now');
    try {
      now.mockImplementation(() => t);
      mount();
      act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
      // The new page never enters (hidden under the full screen) but runs
      // past the window before it is killed too.
      t += TWIN_CRASH_WINDOW_MS + 1;
      act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
      expect(onFail).not.toHaveBeenCalled();
      expect(mockWeb.mounts).toBe(3);
      // A death right after that remount is the 2nd in a row → gives up.
      t += 1_000;
      act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
      expect(onFail).toHaveBeenCalledTimes(1);
    } finally {
      now.mockRestore();
    }
  });

  it('the remounted page boots in the theme of now', () => {
    mount();
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    act(() => web().props.onContentProcessDidTerminate({ nativeEvent: {} }));
    expect(web().props.source.html).toBe(page('light'));
  });
});
