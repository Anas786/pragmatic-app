/**
 * SiteDetail shell (SDS): pinned tab strip semantics + geometry, the
 * skeleton strip matching it, per-tab ErrorBoundaries, and the screen's
 * header / refresh paths (exactly one /data/all request per refresh, never
 * waiting on a fetch paused offline, one refresh-failure notice).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';

const mockRouteParams: Record<string, unknown> = {};
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useIsFocused: () => true,
    useRoute: () => ({ key: 'SiteDetail-1', name: 'SiteDetail', params: mockRouteParams }),
    useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  };
});

// Network layer: count /data/all + config requests, never hit axios.
const mockGetSiteAllData = jest.fn<(id: string) => Promise<unknown>>();
const mockGetSiteConfig = jest.fn<(id: string) => Promise<unknown>>();
jest.mock('../src/networking', () => {
  const actual = jest.requireActual('../src/networking') as object;
  return {
    ...actual,
    getSiteAllData: (id: string) => mockGetSiteAllData(id),
    getSiteConfig: (id: string) => mockGetSiteConfig(id),
    getReportMapping: () => Promise.resolve({}),
  };
});

// Tab bodies are stand-ins: this suite is about the shell around them.
const mockCardsShouldThrow = { value: false };
const tabStub = (name: string) => () => {
  const { Text: RNText } = jest.requireActual('react-native') as typeof import('react-native');
  return <RNText>{`${name} body`}</RNText>;
};
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/SummaryView', () =>
  tabStub('Summary'),
);
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/CardsView', () => () => {
  if (mockCardsShouldThrow.value) throw new Error('bad cards payload');
  const { Text: RNText } = jest.requireActual('react-native') as typeof import('react-native');
  return <RNText>Cards body</RNText>;
});
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/LiveParameterView', () =>
  tabStub('Live'),
);
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/AlarmsView', () =>
  tabStub('Alarms'),
);
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/TrendView', () =>
  tabStub('Trend'),
);
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/ReportsView', () =>
  tabStub('Reports'),
);
// The Tables stand-in exercises the shell's contexts like a real tab: its
// own refresh icon (useSiteRefresh) and an SLD-style pull block.
const mockTabBlocksPull = { value: false };
jest.mock('../src/components/screens/Authenticated/SiteDetail/components/TablesView', () => () => {
  const RN = jest.requireActual('react-native') as typeof import('react-native');
  const { usePullToRefreshBlock } = jest.requireActual(
    '../src/components/screens/Authenticated/SiteDetail/pullToRefreshGate',
  ) as typeof import('../src/components/screens/Authenticated/SiteDetail/pullToRefreshGate');
  const { useSiteRefresh } = jest.requireActual(
    '../src/components/screens/Authenticated/SiteDetail/siteRefresh',
  ) as typeof import('../src/components/screens/Authenticated/SiteDetail/siteRefresh');
  usePullToRefreshBlock(mockTabBlocksPull.value);
  const refresh = useSiteRefresh(() => Promise.resolve());
  return (
    <RN.Pressable accessibilityLabel="Tab refresh" onPress={refresh}>
      <RN.Text>Tables body</RN.Text>
    </RN.Pressable>
  );
});

import SiteDetail from '../src/components/screens/Authenticated/SiteDetail';
import ViewsContent from '../src/components/screens/Authenticated/SiteDetail/components/ViewsContent';
import TabSelector, {
  TAB_COUNT,
  TAB_PILL_HEIGHT,
  TAB_STRIP_GUTTER,
  TAB_TRACK_INSET,
} from '../src/components/screens/Authenticated/SiteDetail/components/TabSelector';
import { TabStripSkeleton } from '../src/components/screens/Authenticated/SiteDetail/components/SiteDetailSkeleton';
import Skeleton from '../src/components/common/Skeleton';
import { touch } from '../src/theme/tokens';
import { haptics } from '../src/utils/haptics';


const MIN = 60_000;

/* ─────────── helpers ─────────── */

let tree: ReactTestRenderer | undefined;
const render = (el: React.ReactElement) => {
  act(() => {
    tree = renderer.create(el);
  });
  return tree as ReactTestRenderer;
};
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
});

const flat = (s: unknown): ViewStyle => (StyleSheet.flatten(s as ViewStyle) ?? {}) as ViewStyle;

const texts = (root: ReactTestInstance) =>
  root
    .findAllByType(Text)
    .map(t => {
      const c = t.props.children;
      return Array.isArray(c) ? c.join('') : String(c);
    });

const tabPressables = (root: ReactTestInstance) =>
  root.findAllByType(Pressable).filter(p => p.props.accessibilityState?.selected !== undefined);

/** Let react-query resolve + rAFs / timers run. */
const settle = async (rounds = 6) => {
  for (let i = 0; i < rounds; i += 1) {
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
  }
};

/* ─────────── TabSelector ─────────── */

describe('TabSelector — pinned strip semantics + geometry', () => {
  it('is a tab bar of ≥ touch.min tabs, each labelled by its name with a selected state', () => {
    const t = render(<TabSelector selected="Summary" onSelect={() => {}} />);
    const strip = t.root.findByType(ScrollView);
    // Jest runs as iOS: 'tabbar' gives VoiceOver its 'Tab, 1 of 6'.
    expect(strip.props.accessibilityRole).toBe('tabbar');

    const chips = tabPressables(t.root);
    expect(chips.map(c => c.props.accessibilityLabel)).toEqual([
      'Summary',
      'Cards',
      'Live',
      'Analysis',
      'Reports',
      'Tables',
    ]);
    // The visible chip text matches what VoiceOver / TalkBack say.
    expect(texts(t.root)).toEqual(['Summary', 'Cards', 'Live', 'Analysis', 'Reports', 'Tables']);
    expect(chips).toHaveLength(TAB_COUNT);
    for (const c of chips) {
      expect(c.props.accessibilityRole).toBe('button');
      const sized = c.findAll(n => flat(n.props.style).minHeight !== undefined)[0];
      expect(flat(sized.props.style).minHeight).toBeGreaterThanOrEqual(touch.min);
    }
    expect(chips.filter(c => c.props.accessibilityState.selected)).toHaveLength(1);
    expect(chips[0].props.accessibilityState.selected).toBe(true);
  });

  it('draws a flat blob — no shadow / elevation halo', () => {
    const t = render(<TabSelector selected="Cards" onSelect={() => {}} />);
    const blob = t.root
      .findAll(n => typeof n.type !== 'string' && n.props.pointerEvents === 'none')
      .map(n => flat(n.props.style))
      .find(s => s.position === 'absolute' && s.height === TAB_PILL_HEIGHT);
    expect(blob).toBeDefined();
    expect(blob?.shadowOpacity).toBeUndefined();
    expect(blob?.shadowRadius).toBeUndefined();
    expect(blob?.elevation).toBeUndefined();
  });

  it("fires the 'select' haptic only when the selection changes", () => {
    const spy = jest.spyOn(haptics, 'select');
    const onSelect = jest.fn();
    const t = render(<TabSelector selected="Summary" onSelect={onSelect} />);
    const chips = tabPressables(t.root);
    act(() => chips[0].props.onPress());
    expect(spy).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenLastCalledWith('Summary');
    act(() => chips[1].props.onPress());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith('Cards');
    spy.mockRestore();
  });

  it("labels the 'Trend' tab \"Analysis\" (web name) but still selects the internal key", () => {
    const onSelect = jest.fn();
    const t = render(<TabSelector selected="Trend" onSelect={onSelect} />);
    const chips = tabPressables(t.root);
    const analysis = chips.find(c => c.props.accessibilityLabel === 'Analysis');
    expect(analysis?.props.accessibilityState.selected).toBe(true);
    expect(chips.some(c => c.props.accessibilityLabel === 'Trend')).toBe(false);
    expect(texts(t.root)).not.toContain('Trend');
    act(() => analysis?.props.onPress());
    expect(onSelect).toHaveBeenLastCalledWith('Trend');
  });

  it('the skeleton strip has the same gutter, inset and chip height (no jump)', () => {
    const t = render(<TabStripSkeleton />);
    const row = t.root.findAllByType(View)[0];
    expect(flat(row.props.style).paddingHorizontal).toBe(TAB_STRIP_GUTTER);
    const track = t.root.findAllByType(View)[1];
    expect(flat(track.props.style).padding).toBe(TAB_TRACK_INSET);
    const pills = t.root.findAllByType(Skeleton);
    expect(pills).toHaveLength(TAB_COUNT);
    for (const p of pills) expect(p.props.height).toBe(TAB_PILL_HEIGHT);
    // Decorative: hidden from screen readers.
    expect(row.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});

/* ─────────── ViewsContent ─────────── */

describe('ViewsContent — one ErrorBoundary per tab', () => {
  beforeEach(() => {
    Object.assign(mockRouteParams, { siteId: 'site-1' });
    mockCardsShouldThrow.value = false;
  });

  it('contains a crashing tab and gives the next tab a fresh attempt', () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCardsShouldThrow.value = true;
    const t = render(<ViewsContent tab="Cards" />);
    // __DEV__ fallback names the tab; the body did not render.
    expect(texts(t.root).join('|')).toContain('Cards crashed');
    expect(texts(t.root)).not.toContain('Cards body');

    act(() => t.update(<ViewsContent tab="Summary" />));
    expect(texts(t.root)).toContain('Summary body');

    mockCardsShouldThrow.value = false;
    act(() => t.update(<ViewsContent tab="Cards" />));
    expect(texts(t.root)).toContain('Cards body');
    err.mockRestore();
  });
});

/* ─────────── SiteDetail screen ─────────── */

describe('SiteDetail screen — header + refresh paths', () => {
  let client: QueryClient;
  const NOW = Date.UTC(2026, 9, 1, 11, 16, 0);
  const LAST_SYNC = NOW - 17 * MIN;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    client = new QueryClient();
    for (const k of Object.keys(mockRouteParams)) delete mockRouteParams[k];
    Object.assign(mockRouteParams, {
      siteId: 'site-1',
      siteName: 'Lucky Cement Nooriabad',
      siteSubtitle: '30000 kW',
      efficiency: 0,
      siteimage: null,
      state: 'Online',
      dataLastUpdate: String(NOW - 40 * MIN),
      capacityKw: 30000,
    });
    mockGetSiteAllData.mockReset();
    mockGetSiteConfig.mockReset();
    mockGetSiteAllData.mockResolvedValue({
      live: {
        metadata: { last_update: LAST_SYNC },
        data: { live: { p1: { value: 1, update_at: NOW - MIN } } },
      },
      processed: null,
      alarms: null,
    });
    mockGetSiteConfig.mockResolvedValue({ siteComponents: {} });
  });

  afterEach(() => {
    // Unmount BEFORE clearing: an observer removed after the clear would
    // re-schedule a 5-min gc timer on a detached query (open handle).
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    client.clear();
    // Back online AFTER the clear, so no paused fetch resumes post-test.
    onlineManager.setOnline(true);
    jest.restoreAllMocks();
  });

  const mount = () =>
    render(
      <QueryClientProvider client={client}>
        <SiteDetail />
      </QueryClientProvider>,
    );

  const headerTitle = (root: ReactTestInstance) =>
    root.findAll(
      n => n.type === Text && n.props.accessibilityRole === 'header',
    )[0];

  it('shows the route-param freshness on first paint, then the web "last sync"', async () => {
    const t = mount();
    // Before /data/all: the Dashboard's site-list value (40 min).
    expect(headerTitle(t.root).props.accessibilityLabel).toBe(
      'Lucky Cement Nooriabad, 30 megawatts, Delayed, last updated 40 minutes ago',
    );
    await settle();
    // After: live.metadata.last_update (what the web header shows), not
    // the newer per-parameter update_at (1 min).
    // 17 min is "online" on the web (< 30 min) → Live here too.
    expect(headerTitle(t.root).props.accessibilityLabel).toBe(
      'Lucky Cement Nooriabad, 30 megawatts, Live, updated 17 minutes ago',
    );
    expect(texts(t.root)).toContain('Updated 17 min ago · 30 MW');
    expect(texts(t.root)).toContain('Summary body');
    // No theme toggle in this header any more.
    expect(
      t.root.findAll(n => /theme|light mode|dark mode/i.test(String(n.props?.accessibilityLabel ?? ''))),
    ).toHaveLength(0);
  });

  it('header refresh issues exactly one /data/all request, even when tapped twice', async () => {
    const t = mount();
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(1);

    const refresh = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Refresh site data');
    expect(refresh).toBeDefined();
    act(() => {
      refresh?.props.onPress();
      refresh?.props.onPress();
    });
    // Busy while in flight.
    const busy = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Refresh site data');
    expect(busy?.props.accessibilityState.busy).toBe(true);
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(2);
    expect(mockGetSiteConfig).toHaveBeenCalledTimes(1);
  });

  it('pull-to-refresh issues exactly one /data/all request and stops spinning', async () => {
    const t = mount();
    await settle();
    const rc = () => t.root.findByType(RefreshControl);
    act(() => {
      rc().props.onRefresh();
      rc().props.onRefresh();
    });
    expect(rc().props.refreshing).toBe(true);
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(2);
    expect(rc().props.refreshing).toBe(false);
  });

  it('offline: the pull spinner stops, the header button stays usable, nothing is sent until reconnect', async () => {
    const t = mount();
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(1);

    act(() => onlineManager.setOnline(false));
    // Offline over cached data → the one-line note (no clock: the header
    // already says how old the data is).
    expect(texts(t.root)).toContain('Offline · showing the last data received');

    const rc = () => t.root.findByType(RefreshControl);
    act(() => rc().props.onRefresh());
    // true → false in separate commits, or iOS keeps spinning.
    expect(rc().props.refreshing).toBe(true);
    await settle();
    expect(rc().props.refreshing).toBe(false);

    // The guard was released: a header tap is not silently dropped.
    const refreshBtn = () =>
      t.root
        .findAllByType(Pressable)
        .find(p => p.props.accessibilityLabel === 'Refresh site data');
    act(() => refreshBtn()?.props.onPress());
    expect(refreshBtn()?.props.accessibilityState.busy).toBe(true);
    await settle();
    expect(refreshBtn()?.props.accessibilityState.busy).toBe(false);
    // Both triggers joined the one paused fetch — nothing sent offline.
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(1);

    // Reconnect: the paused fetch resumes by itself — exactly one request,
    // and its late-settling promise doesn't flip any spinner back on.
    act(() => onlineManager.setOnline(true));
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(2);
    expect(rc().props.refreshing).toBe(false);
    expect(refreshBtn()?.props.accessibilityState.busy).toBe(false);
    expect(texts(t.root)).not.toContain('Offline · showing the last data received');
  });

  it('a failed background refresh shows ONE notice — the shell strip, but not over Live (its own)', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    const FAILED = "Couldn't refresh · showing the last data received";
    const t = mount();
    await settle();

    mockGetSiteAllData.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 503'), {
        isAxiosError: true,
        response: { status: 503 },
      }),
    );
    const refreshBtn = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Refresh site data');
    act(() => refreshBtn?.props.onPress());
    await settle(12);
    // Cached content stays; a non-blocking strip with Retry says why.
    expect(texts(t.root)).toContain('Summary body');
    expect(texts(t.root)).toContain(FAILED);
    expect(texts(t.root).join('|')).not.toContain('503');
    const stripRetry = () =>
      t.root.findAllByType(Pressable).filter(p => p.props.accessibilityLabel === 'Retry');
    expect(stripRetry()).toHaveLength(1);

    // The Live tab reports this failure itself → no second notice.
    act(() =>
      tabPressables(t.root)
        .find(c => c.props.accessibilityLabel === 'Live')
        ?.props.onPress(),
    );
    await settle(2);
    expect(texts(t.root)).toContain('Live body');
    expect(texts(t.root)).not.toContain(FAILED);
    expect(stripRetry()).toHaveLength(0);
  });

  it('switches the body one frame after the chip, from the top', async () => {
    const t = mount();
    await settle();
    const chips = tabPressables(t.root);
    act(() => chips.find(c => c.props.accessibilityLabel === 'Live')?.props.onPress());
    // Chip state first …
    expect(
      tabPressables(t.root).find(c => c.props.accessibilityLabel === 'Live')?.props
        .accessibilityState.selected,
    ).toBe(true);
    expect(texts(t.root)).toContain('Summary body');
    // … body on the next frame.
    await settle(2);
    expect(texts(t.root)).toContain('Live body');
    expect(texts(t.root)).not.toContain('Summary body');
  });

  const openTables = async (t: ReactTestRenderer) => {
    const chips = tabPressables(t.root);
    act(() => chips.find(c => c.props.accessibilityLabel === 'Tables')?.props.onPress());
    await settle(2);
    expect(texts(t.root)).toContain('Tables body');
  };

  it("a tab's own refresh icon runs the shell refresh: /data/all + the header stamp", async () => {
    const t = mount();
    await settle();
    await openTables(t);
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(1);
    const tabRefresh = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Tab refresh');
    act(() => {
      tabRefresh?.props.onPress();
    });
    // The header button spins with it — one refresh, one guard.
    const header = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Refresh site data');
    expect(header?.props.accessibilityState.busy).toBe(true);
    await settle();
    expect(mockGetSiteAllData).toHaveBeenCalledTimes(2);
  });

  it('a tab that owns vertical drags switches pull-to-refresh off (Android enabled, iOS bounces)', async () => {
    mockTabBlocksPull.value = true;
    try {
      const t = mount();
      await settle();
      expect(t.root.findByType(RefreshControl).props.enabled).toBe(true);
      await openTables(t);
      expect(t.root.findByType(RefreshControl).props.enabled).toBe(false);
      // The body ScrollView (the one carrying the RefreshControl), not the
      // tab strip's horizontal scroller.
      const body = t.root.findAllByType(ScrollView).find(v => v.props.refreshControl);
      expect(body?.props.bounces).toBe(false);
    } finally {
      mockTabBlocksPull.value = false;
    }
  });

  it('a failed initial load shows friendly copy and Retry recovers', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetSiteAllData.mockReset();
    mockGetSiteAllData.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 503'), {
        isAxiosError: true,
        response: { status: 503 },
      }),
    );
    client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    const t = mount();
    await settle(12);
    const all = texts(t.root).join('|');
    expect(all).not.toContain('503');
    expect(all).not.toContain('status code');
    const retry = t.root
      .findAllByType(Pressable)
      .find(p => p.props.accessibilityLabel === 'Retry');
    expect(retry).toBeDefined();

    mockGetSiteAllData.mockResolvedValue({ live: null, processed: null, alarms: null });
    act(() => retry?.props.onPress());
    await settle();
    expect(texts(t.root)).toContain('Summary body');
  });
});
