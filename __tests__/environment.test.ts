/**
 * Summary tab (SC-1 / SC-4): the honest cumulative hero, environmental
 * impact presentation, one-shot Lotties and the energy-flow section.
 *
 * Fixture = Lucky Cement Nooriabad as cross-checked against the web portal
 * on 2026-10-01 (orchestrator O1–O3, O6): p24 = 142,781,736 kWh lifetime,
 * tariff 0.19 USD/kWh — which reproduces EVERY Summary number the web
 * shows (yield 142,781.74, revenue 27,128,529.84 USD, CO₂ 30,316.85,
 * coal 68,447,620.33, trees 162,251,972.73). Every figure must stay the web's number — this file
 * pins PRESENTATION only (labels, units, precision, semantics), never a
 * new computation.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, {
  act,
  ReactTestInstance,
  ReactTestRenderer,
} from 'react-test-renderer';
import { Dimensions, Text, View } from 'react-native';
import * as Reanimated from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

const MIN = 60_000;

const mockState: {
  config: unknown;
  live: unknown;
  routeLastUpdate?: unknown;
} = {
  config: undefined,
  live: undefined,
};

/**
 * SLD fullscreen (SC-4) fakes: the Diagram viewport and the 3D twin are
 * plain Views — or throw on render — and the model hands back a one-node
 * graph. Summary never mounts either (its 300 ms deferred diagram mount
 * stays pending in Jest).
 */
const mockSld: {
  throwOnRender: boolean;
  twinThrows: boolean;
  /** The model's Diagram | 3D view. */
  view: '2d' | '3d';
  can3D: boolean;
  /** Something groups (the Grouped | Units switch shows). */
  canGroup: boolean;
  /** The props the (mocked) viewport last rendered with. */
  lastProps: Record<string, unknown> | null;
  /** The props the (mocked) twin last rendered with. */
  twinProps: Record<string, unknown> | null;
} = {
  throwOnRender: false,
  twinThrows: false,
  view: '2d',
  can3D: true,
  canGroup: true,
  lastProps: null,
  twinProps: null,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useRoute: () => ({
      params: {
        siteId: '146c5345-8f7f-40e9-9e32-b065e085235d',
        dataLastUpdate: mockState.routeLastUpdate,
      },
    }),
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useIsFocused: () => true,
  };
});

jest.mock('src/hooks', () => {
  const actual = jest.requireActual('src/hooks') as object;
  const query = (data: unknown) => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  return {
    ...actual,
    // Tab ready at once; the 300 ms deferred SLD mount (the only call with
    // a delay) stays pending, so the Skia diagram never mounts in Jest and
    // the section shows its same-size placeholder.
    useInteractionReady: (delay?: number) => delay === undefined,
    useSiteConfig: () => query(mockState.config),
    useSiteData: () => query(mockState.live),
  };
});

jest.mock(
  '../src/components/screens/Authenticated/SiteDetail/components/SLDViewport',
  () => {
    const { View: MockView } = jest.requireActual<
      typeof import('react-native')
    >('react-native');
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockSld.lastProps = props;
        if (mockSld.throwOnRender) throw new Error('malformed SLD payload');
        return ReactActual.createElement(MockView, { testID: 'sld-viewport' });
      },
    };
  },
);

jest.mock(
  '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/SldTwinView',
  () => {
    const { View: MockView } = jest.requireActual<
      typeof import('react-native')
    >('react-native');
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    return {
      __esModule: true,
      default: (props: Record<string, unknown>) => {
        mockSld.twinProps = props;
        if (mockSld.twinThrows) throw new Error('twin failed to render');
        return ReactActual.createElement(MockView, { testID: 'sld-twin' });
      },
    };
  },
);

jest.mock(
  '../src/components/screens/Authenticated/SiteDetail/components/useSldModel',
  () => {
    const layout = {
      graph: { nodes: [{ id: 'n1' }], edges: [] },
      bounds: { minX: -12, minY: -12, width: 360, height: 605 },
      focus: { x: 180, y: 370 },
    };
    // The view is read at call time so a test can switch a host to 3D.
    const withView = () => ({
      ...layout,
      mode: mockSld.canGroup ? 'grouped' : 'units',
      setMode: () => undefined,
      canGroup: mockSld.canGroup,
      view: mockSld.view,
      can3D: mockSld.can3D,
      setView: () => undefined,
      fallBackTo2D: () => undefined,
    });
    return {
      useSldLayout: () => ({ ...withView(), groups: [] }),
      useSldModel: () => ({ ...withView(), resolve: () => undefined }),
    };
  },
);

import SummaryView from '../src/components/screens/Authenticated/SiteDetail/components/SummaryView';
import SLDFullscreenScreen, {
  resetSldTurnHintForTests,
  SLD_TURN_HINT_TEXT,
} from '../src/components/screens/Authenticated/SiteDetail/components/SLDFullscreenScreen';
import { HeroStatusBadge } from '../src/components/common/HeroRow';
import PulseDot from '../src/components/common/PulseDot';
import Skeleton from '../src/components/common/Skeleton';
import {
  SLD_INLINE_MAX_HEIGHT,
  SLD_INLINE_MIN_HEIGHT,
  SLD_INLINE_WIDTH,
  SLD_TWIN_INLINE_HEIGHT,
  SLDDiagramPlaceholder,
  sldInlineHeight,
} from '../src/components/screens/Authenticated/SiteDetail/components/SLDDiagram';
import {
  sldViewHeaderGeometry,
  type SldViewHeaderGeometry,
} from '../src/components/screens/Authenticated/SiteDetail/components/ControlButtons';

/* ─────────── fixtures ─────────── */

const P24_KWH = 142_781_736; // web: Total Plant Yield 142,781.74 (MWh)

const luckyConfig = (revenue: unknown = { tariff: 0.19, currency: 'USD' }) => ({
  site_info: { revenue },
  siteComponents: { cards: [] },
});

const luckyLive = (
  opts: { metaLastUpdate?: unknown; paramUpdate?: number } = {},
) => ({
  live: {
    ...(opts.metaLastUpdate !== undefined
      ? { metadata: { last_update: opts.metaLastUpdate } }
      : {}),
    data: {
      live: {
        p24: {
          value: P24_KWH,
          update_at: opts.paramUpdate ?? Date.now() - MIN,
        },
      },
    },
  },
  processed: { data: { processed: {} } },
  alarms: [],
});

/* ─────────── helpers ─────────── */

let tree: ReactTestRenderer | undefined;
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  mockState.routeLastUpdate = undefined;
  mockSld.throwOnRender = false;
  mockSld.twinThrows = false;
  mockSld.view = '2d';
  mockSld.can3D = true;
  mockSld.canGroup = true;
  mockSld.lastProps = null;
  mockSld.twinProps = null;
  jest.restoreAllMocks();
});

const renderSummary = (config: unknown, live: unknown) => {
  mockState.config = config;
  mockState.live = live;
  act(() => {
    tree = renderer.create(React.createElement(SummaryView));
  });
  return (tree as ReactTestRenderer).root;
};

const textsOf = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map(t => {
      const c = t.props.children;
      if (Array.isArray(c)) return c.join('');
      return typeof c === 'string' || typeof c === 'number' ? String(c) : '';
    })
    .filter(s => s.length > 0);

const a11yLabels = (root: ReactTestInstance): string[] =>
  root
    .findAll(n => n.type === View && n.props.accessible === true)
    .map(n => n.props.accessibilityLabel)
    .filter((l): l is string => typeof l === 'string');

/* ─────────── hero ─────────── */

describe('Summary hero — cumulative yield + revenue (SC-1, O3)', () => {
  it("shows the web's numbers with honest cumulative wording", () => {
    const root = renderSummary(
      luckyConfig(),
      luckyLive({ metaLastUpdate: Date.now() - 2 * MIN }),
    );
    const texts = textsOf(root);

    // Same number as the web, unit fixed to MWh (web's 'mWh' is a typo).
    expect(texts).toContain('142,781.74');
    expect(texts).toContain('MWh');
    expect(texts).not.toContain('mWh');
    expect(texts.some(t => /GWh|kWh/.test(t))).toBe(false);

    // Revenue = p24 × tariff, currency from the backend.
    expect(texts).toContain('27,128,529.84');
    expect(texts).toContain('USD');

    // Cumulative, not "today".
    expect(texts).toContain('To date');
    expect(texts).toContain('Revenue · to date');
    expect(texts).toContain('Total plant yield');
    expect(texts.some(t => /^today$/i.test(t))).toBe(false);
    expect(texts.some(t => /today's earnings/i.test(t))).toBe(false);

    const labels = a11yLabels(root);
    expect(labels).toContain(
      'Total plant yield, 142,781.74 megawatt hours, to date',
    );
    expect(labels).toContain('Revenue to date, 27,128,529.84 USD');
  });

  it('never invents a currency when the backend sends none', () => {
    const root = renderSummary(luckyConfig({ tariff: 0.19 }), luckyLive());
    const texts = textsOf(root);
    expect(texts).toContain('27,128,529.84');
    expect(texts).not.toContain('USD');
    expect(texts).not.toContain('PKR');
  });

  it("shows a muted '—' (no unit) when the yield counter is missing", () => {
    const live = luckyLive();
    (live.live.data.live as Record<string, unknown>).p24 = { value: 'NA' };
    const root = renderSummary(luckyConfig(), live);
    const texts = textsOf(root);
    expect(texts).not.toContain('MWh');
    expect(texts).not.toContain('USD');
    expect(texts.filter(t => t === '—').length).toBeGreaterThanOrEqual(2);
    expect(texts.filter(t => t === 'No data')).toHaveLength(3); // impact cards
  });
});

/* ─────────── freshness badge (O6) ─────────── */

describe('Summary hero badge — same stamp as the header / web (O6)', () => {
  it('reads live.metadata.last_update, not a fresher per-parameter update_at', () => {
    const now = Date.now();
    const root = renderSummary(
      luckyConfig(),
      luckyLive({ metaLastUpdate: now - 41 * MIN, paramUpdate: now - 30_000 }),
    );
    const badge = root.findByType(HeroStatusBadge);
    expect(badge.props.lastUpdate).toBe(now - 41 * MIN);
    // 41 min old is not live → no pulse anywhere on the tab.
    expect(root.findAllByType(PulseDot)).toHaveLength(0);
    expect(textsOf(root).some(t => /^Live · /i.test(t))).toBe(false);
  });

  it('pulses (once) while the site stamp is live', () => {
    const root = renderSummary(
      luckyConfig(),
      luckyLive({ metaLastUpdate: Date.now() - 2 * MIN }),
    );
    expect(root.findAllByType(PulseDot)).toHaveLength(1);
    expect(textsOf(root)).toContain('Live · Yield');
  });

  it('falls back to the newest update_at when metadata is absent', () => {
    const paramUpdate = Date.now() - 5 * MIN;
    const root = renderSummary(luckyConfig(), luckyLive({ paramUpdate }));
    expect(root.findByType(HeroStatusBadge).props.lastUpdate).toBe(paramUpdate);
  });

  it("uses the header's resolver end to end: no payload stamp → route value", () => {
    // Same function as the SiteDetail header (siteDetailModel.headerLastUpdate),
    // so the badge and the header can never show different ages.
    const routeStamp = Date.now() - 7 * MIN;
    mockState.routeLastUpdate = new Date(routeStamp).toISOString();
    const live = luckyLive();
    delete (live.live.data.live.p24 as { update_at?: number }).update_at;
    const root = renderSummary(luckyConfig(), live);
    expect(root.findByType(HeroStatusBadge).props.lastUpdate).toBe(routeStamp);
  });
});

/* ─────────── environmental impact (O2: values unchanged) ─────────── */

describe('Environmental impact — same values, clearer presentation', () => {
  it('keeps the web values (exact in a11y) and shows them compact at one size', () => {
    const root = renderSummary(luckyConfig(), luckyLive());
    const texts = textsOf(root);

    expect(texts).toContain('Environmental impact');
    expect(texts).toContain('Since commissioning');
    // Compact visible values, unit on the baseline.
    expect(texts).toEqual(
      expect.arrayContaining(['30.3K', '68.4M', '162M', 't', 'trees']),
    );
    expect(texts).not.toContain('Nos.');
    expect(texts).not.toContain('Tons');

    // Exact web figures for screen readers (O1/O2: values unchanged).
    const labels = a11yLabels(root);
    expect(labels).toContain(
      'CO2 avoided, 30,316.85 tons, since commissioning',
    );
    expect(labels).toContain(
      'Coal offset, 68,447,620.33 tons, since commissioning',
    );
    // An equivalence, not a planting claim; a count is spoken whole.
    expect(labels).toContain(
      'Tree equivalent, 162,251,973 trees, since commissioning',
    );
    expect(texts).toContain('Tree equivalent');
    expect(texts).not.toContain('Trees planted');

    // One fixed size for all three values — no auto-shrink.
    const valueTexts = root
      .findAllByType(Text)
      .filter(t =>
        ['30.3K', '68.4M', '162M'].includes(String(t.props.children)),
      );
    expect(valueTexts).toHaveLength(3);
    for (const t of valueTexts)
      expect(t.props.adjustsFontSizeToFit).toBeFalsy();
    const sizes = new Set(
      valueTexts.map(t => {
        const style = ([] as unknown[])
          .concat(t.props.style)
          .flat(Infinity) as Record<string, unknown>[];
        return style.reduce<unknown>(
          (acc, s) => (s && s.fontSize !== undefined ? s.fontSize : acc),
          undefined,
        );
      }),
    );
    expect(sizes.size).toBe(1);
  });
});

/* ─────────── Lotties ─────────── */

describe('Summary Lotties play once', () => {
  it('never loop, and autoplay unless reduce-motion is on', () => {
    let root = renderSummary(luckyConfig(), luckyLive());
    let lotties = root.findAllByType(
      LottieView as unknown as React.ComponentType,
    );
    expect(lotties).toHaveLength(4); // revenue + CO₂ + coal + trees
    for (const l of lotties) {
      expect(l.props.loop).toBe(false);
      expect(l.props.autoPlay).toBe(true);
    }
    act(() => tree?.unmount());
    tree = undefined;

    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    root = renderSummary(luckyConfig(), luckyLive());
    lotties = root.findAllByType(LottieView as unknown as React.ComponentType);
    expect(lotties).toHaveLength(4);
    for (const l of lotties) {
      expect(l.props.loop).toBe(false);
      expect(l.props.autoPlay).toBe(false);
      expect(l.props.progress).toBe(1);
    }
  });
});

/* ─────────── energy flow (SC-4) ─────────── */

describe('Energy-flow section', () => {
  it('shows the compact not-configured state and no Live tag without a diagram', () => {
    const root = renderSummary(
      luckyConfig(),
      luckyLive({ metaLastUpdate: Date.now() - MIN }),
    );
    const texts = textsOf(root);
    expect(texts).toContain('Energy flow');
    expect(texts).toContain('No energy-flow diagram for this site');
    expect(texts).not.toContain('Live');
    expect(a11yLabels(root)).not.toContain('Live data');
  });

  const withDiagram = () => ({
    ...luckyConfig(),
    siteComponents: {
      cards: [],
      sldV2: {
        nodes: [
          { id: 'n1', position: { x: 0, y: 0 }, data: { heading: 'Solar', keys: [] } },
        ],
        edges: [],
      },
    },
  });

  /** The header the mounted block draws for this device (same width, same OS text scale). */
  const headerFor = (withView: boolean, withGroup: boolean): SldViewHeaderGeometry =>
    sldViewHeaderGeometry({
      width: SLD_INLINE_WIDTH,
      fontScale: Dimensions.get('window').fontScale,
      withView,
      withGroup,
    });

  /** The placeholder's skeletons: the header row's (if any) and the panel. */
  const placeholderParts = (root: ReactTestInstance) => {
    const placeholder = root.findByType(SLDDiagramPlaceholder);
    const all = placeholder.findAllByType(Skeleton);
    const panel = all.filter(sk => sk.props.width === SLD_INLINE_WIDTH);
    expect(panel).toHaveLength(1);
    // (memo components: matched by their props, not their type)
    const rows = placeholder.findAll(
      n => typeof n.type !== 'string' && n.props.geometry !== undefined && 'withButton' in n.props,
    );
    return {
      panel: panel[0],
      header: all.filter(sk => sk.props.width !== SLD_INLINE_WIDTH),
      geometry: rows.length ? (rows[0].props.geometry as SldViewHeaderGeometry) : null,
    };
  };
  const sizes = (skeletons: ReactTestInstance[]) => skeletons.map(sk => [sk.props.width, sk.props.height]);

  it('diagram + live site stamp → Live tag and a same-size placeholder', () => {
    const root = renderSummary(
      withDiagram(),
      luckyLive({ metaLastUpdate: Date.now() - MIN }),
    );
    const texts = textsOf(root);
    expect(texts).toContain('Live');
    expect(a11yLabels(root)).toContain('Live data');
    expect(texts).not.toContain('No energy-flow diagram for this site');
    // Deferred mount pending → the placeholder already has the block's
    // geometry: the header row (Diagram | 3D AND Grouped | Units, sized like
    // the real pills), the inline width and the DIAGRAM's own height (the
    // panel follows its phone layout — no strip for an in-panel pill any
    // more: Grouped | Units heads the panel), so the 300 ms swap doesn't jump.
    const { panel, header, geometry } = placeholderParts(root);
    const height = sldInlineHeight({ minX: -12, minY: -12, width: 360, height: 605 });
    expect(panel.props.height).toBe(height);
    expect(height).toBeGreaterThanOrEqual(SLD_INLINE_MIN_HEIGHT);
    expect(height).toBeLessThanOrEqual(SLD_INLINE_MAX_HEIGHT);
    const expected = headerFor(true, true);
    expect(geometry).toEqual(expected);
    // Diagram: no full-screen button in the row (the column has it).
    expect(sizes(header)).toEqual([
      [expected.view?.width, expected.view?.height],
      [expected.group?.width, expected.group?.height],
    ]);
  });

  it('3D: the placeholder is the twin’s TALL card (the web’s clamp(600, 78 % of the window, 920))', () => {
    mockSld.view = '3d';
    const root = renderSummary(withDiagram(), luckyLive({ metaLastUpdate: Date.now() - MIN }));
    const { panel, header, geometry } = placeholderParts(root);
    // The same height SLDDiagram gives the twin — no 300 ms jump.
    expect(panel.props.height).toBe(SLD_TWIN_INLINE_HEIGHT);
    expect(SLD_TWIN_INLINE_HEIGHT).toBeGreaterThanOrEqual(600);
    expect(SLD_TWIN_INLINE_HEIGHT).toBeLessThanOrEqual(920);
    // Both switches + the sideways full-screen button.
    expect(geometry).toEqual(headerFor(true, true));
    expect(header).toHaveLength(3);
  });

  it('twin failed this session: no Diagram | 3D in the placeholder — Grouped | Units only', () => {
    mockSld.can3D = false;
    const root = renderSummary(withDiagram(), luckyLive({ metaLastUpdate: Date.now() - MIN }));
    const { header, geometry } = placeholderParts(root);
    const expected = headerFor(false, true);
    expect(geometry).toEqual(expected);
    expect(expected.view).toBeNull();
    expect(sizes(header)).toEqual([[expected.group?.width, expected.group?.height]]);
  });

  it('nothing to group and no 3D: no header row at all', () => {
    mockSld.can3D = false;
    mockSld.canGroup = false;
    const root = renderSummary(withDiagram(), luckyLive({ metaLastUpdate: Date.now() - MIN }));
    const { header, geometry } = placeholderParts(root);
    expect(geometry).toBeNull();
    expect(header).toHaveLength(0);
  });

  it('nothing to group: the placeholder row holds Diagram | 3D only', () => {
    mockSld.canGroup = false;
    const root = renderSummary(withDiagram(), luckyLive({ metaLastUpdate: Date.now() - MIN }));
    const { header, geometry } = placeholderParts(root);
    expect(geometry).toEqual(headerFor(true, false));
    expect(geometry?.group).toBeNull();
    expect(header).toHaveLength(1);
  });

  it('diagram + stale site stamp → no Live tag but the honest status (same stamp as the badge)', () => {
    const now = Date.now();
    const root = renderSummary(
      withDiagram(),
      // A parameter ticked 30 s ago, but the site stamp is 41 min old.
      luckyLive({ metaLastUpdate: now - 41 * MIN, paramUpdate: now - 30_000 }),
    );
    expect(textsOf(root)).not.toContain('Live');
    expect(a11yLabels(root)).not.toContain('Live data');
    // The 3D twin animates whatever the age (like the web): beside it the
    // section still says how old the data is.
    const status = root.findAll(n => n.props.testID === 'sld-freshness' && typeof n.type !== 'string');
    expect(status.length).toBeGreaterThan(0);
    expect(status[0].props.lastUpdate).toBe(now - 41 * MIN);
    // (the shared `useNow` clock may lag this test's Date.now() by a tick)
    expect(textsOf(status[0])).toEqual([expect.stringMatching(/^Delayed · 4[01] min ago$/)]);
  });
});

/* ─────────── SLD fullscreen error escape (SC-4) ─────────── */

describe('SLD fullscreen — Close escape over the error fallback', () => {
  const closeButtons = (root: ReactTestInstance) =>
    root.findAll(
      n => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Close',
    );
  const renderFullscreen = () => {
    act(() => {
      tree = renderer.create(React.createElement(SLDFullscreenScreen));
    });
    return (tree as ReactTestRenderer).root;
  };

  it('healthy mount: the viewport shows and no extra Close button', () => {
    const root = renderFullscreen();
    expect(
      root.findAll(n => n.props.testID === 'sld-viewport').length,
    ).toBeGreaterThan(0);
    expect(closeButtons(root)).toHaveLength(0);
  });

  it('crash on the FIRST render still offers Close (fullScreenModal has no swipe-dismiss)', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSld.throwOnRender = true;
    const root = renderFullscreen();
    expect(root.findAll(n => n.props.testID === 'sld-viewport')).toHaveLength(0);
    expect(closeButtons(root).length).toBeGreaterThan(0);
  });

  it('crash on a later update offers Close too', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const root = renderFullscreen();
    expect(closeButtons(root)).toHaveLength(0);
    mockSld.throwOnRender = true;
    act(() => {
      tree?.update(React.createElement(SLDFullscreenScreen));
    });
    expect(root.findAll(n => n.props.testID === 'sld-viewport')).toHaveLength(0);
    expect(closeButtons(root).length).toBeGreaterThan(0);
  });
});

/* ─────────── SLD full screen: the 3D twin sideways, the Diagram upright ─────────── */

describe('SLD full screen — the sideways twin and its escapes', () => {
  const closeButtons = (root: ReactTestInstance) =>
    root.findAll(
      n => typeof n.type !== 'string' && n.props.accessibilityLabel === 'Close',
    );
  const renderFullscreen = () => {
    act(() => {
      tree = renderer.create(React.createElement(SLDFullscreenScreen));
    });
    return (tree as ReactTestRenderer).root;
  };
  /** The turned container: a View whose style rotates it by `deg`. */
  const isTurned = (n: ReactTestInstance, deg: string) => {
    if (n.type !== View) return false;
    const flat = ([] as unknown[]).concat(n.props.style).flat(3) as Array<{ transform?: Array<{ rotate?: string }> } | null>;
    return flat.some(st => !!st && Array.isArray(st.transform) && st.transform.some(t => t.rotate === deg));
  };
  const insideTurned = (n: ReactTestInstance) => {
    for (let p: ReactTestInstance | null = n.parent; p; p = p.parent) if (isTurned(p, '90deg')) return true;
    return false;
  };

  it('3D: the twin (host fullscreen) inside the turned container — no Diagram viewport', () => {
    mockSld.view = '3d';
    const root = renderFullscreen();
    const twin = root.findAll(n => n.props.testID === 'sld-twin');
    expect(twin.length).toBeGreaterThan(0);
    expect(insideTurned(twin[0])).toBe(true);
    expect(mockSld.twinProps?.host).toBe('fullscreen');
    expect(mockSld.twinProps?.visible).toBe(true);
    expect(root.findAll(n => n.props.testID === 'sld-viewport')).toHaveLength(0);
    // The rail's Close is always there (outside the twin), turned with it.
    const close = closeButtons(root);
    expect(close.length).toBeGreaterThan(0);
    expect(close.every(insideTurned)).toBe(true);
  });

  it('3D: a twin that throws while rendering still leaves the rail’s Close (in the turned frame)', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSld.view = '3d';
    mockSld.twinThrows = true;
    const root = renderFullscreen();
    expect(root.findAll(n => n.props.testID === 'sld-twin')).toHaveLength(0);
    const close = closeButtons(root);
    expect(close.length).toBeGreaterThan(0);
    expect(close.every(insideTurned)).toBe(true);
  });

  it('2D: the fallback Close stays in the portrait frame', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockSld.view = '2d';
    mockSld.throwOnRender = true;
    const root = renderFullscreen();
    const close = closeButtons(root);
    expect(close.length).toBeGreaterThan(0);
    expect(close.some(insideTurned)).toBe(false);
  });

  it('sideways: "Turn your phone to the left" shows (and is announced) once per session', () => {
    resetSldTurnHintForTests();
    const { AccessibilityInfo } = jest.requireActual<typeof import('react-native')>('react-native');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    mockSld.view = '3d';
    let root = renderFullscreen();
    expect(textsOf(root)).toContain(SLD_TURN_HINT_TEXT);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining(SLD_TURN_HINT_TEXT));
    // Portrait-readable: outside the turned container.
    const hint = root.findAll(n => n.type === Text && n.props.children === SLD_TURN_HINT_TEXT)[0];
    expect(insideTurned(hint)).toBe(false);
    act(() => tree?.unmount());
    root = renderFullscreen();
    expect(textsOf(root)).not.toContain(SLD_TURN_HINT_TEXT);
    // The upright Diagram never shows it.
    act(() => tree?.unmount());
    resetSldTurnHintForTests();
    mockSld.view = '2d';
    root = renderFullscreen();
    expect(textsOf(root)).not.toContain(SLD_TURN_HINT_TEXT);
  });
});
