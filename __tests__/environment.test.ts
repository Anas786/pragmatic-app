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
import { Text, View } from 'react-native';
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
 * SLD fullscreen (SC-4) fakes: the viewport is a plain View — or throws on
 * render — and the model hands back a one-node graph. Summary never mounts
 * either (its 300 ms deferred diagram mount stays pending in Jest).
 */
const mockSld: { throwOnRender: boolean } = { throwOnRender: false };

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
      default: () => {
        if (mockSld.throwOnRender) throw new Error('malformed SLD payload');
        return ReactActual.createElement(MockView, { testID: 'sld-viewport' });
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
      mode: 'grouped',
      setMode: () => undefined,
      canGroup: true,
    };
    return {
      useSldLayout: () => ({ ...layout, groups: [] }),
      useSldModel: () => ({ ...layout, resolve: () => undefined }),
    };
  },
);

import SummaryView from '../src/components/screens/Authenticated/SiteDetail/components/SummaryView';
import SLDFullscreenScreen from '../src/components/screens/Authenticated/SiteDetail/components/SLDFullscreenScreen';
import { HeroStatusBadge } from '../src/components/common/HeroRow';
import PulseDot from '../src/components/common/PulseDot';
import Skeleton from '../src/components/common/Skeleton';
import {
  SLD_INLINE_MAX_HEIGHT,
  SLD_INLINE_MIN_HEIGHT,
  SLD_INLINE_WIDTH,
  SLDDiagramPlaceholder,
  sldInlineHeight,
} from '../src/components/screens/Authenticated/SiteDetail/components/SLDDiagram';

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

  it('diagram + live site stamp → Live tag and a same-size placeholder', () => {
    const root = renderSummary(
      withDiagram(),
      luckyLive({ metaLastUpdate: Date.now() - MIN }),
    );
    const texts = textsOf(root);
    expect(texts).toContain('Live');
    expect(a11yLabels(root)).toContain('Live data');
    expect(texts).not.toContain('No energy-flow diagram for this site');
    // Deferred mount pending → the placeholder already has the viewport's
    // geometry: the inline width and the DIAGRAM's own height (the panel
    // follows its phone layout), so the 300 ms swap doesn't jump.
    const skeleton = root.findByType(SLDDiagramPlaceholder).findByType(Skeleton);
    expect(skeleton.props.width).toBe(SLD_INLINE_WIDTH);
    const height = sldInlineHeight({ minX: -12, minY: -12, width: 360, height: 605 }, true);
    expect(skeleton.props.height).toBe(height);
    expect(height).toBeGreaterThanOrEqual(SLD_INLINE_MIN_HEIGHT);
    expect(height).toBeLessThanOrEqual(SLD_INLINE_MAX_HEIGHT);
  });

  it('diagram + stale site stamp → no Live tag (same stamp as the badge)', () => {
    const now = Date.now();
    const root = renderSummary(
      withDiagram(),
      // A parameter ticked 30 s ago, but the site stamp is 41 min old.
      luckyLive({ metaLastUpdate: now - 41 * MIN, paramUpdate: now - 30_000 }),
    );
    expect(textsOf(root)).not.toContain('Live');
    expect(a11yLabels(root)).not.toContain('Live data');
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
