/**
 * The SLD hosts (SLDDiagram inline, SLDFullscreenScreen) with the REAL model
 * (`useSldModel`) and view store (`useSldViewMode`, persisted):
 *
 *  - the "Diagram | 3D" switch — Diagram first, 3D by default, the choice
 *    persisted — heads the inline panel;
 *  - 3D = the web twin (`SldTwinView`, host + visibility), Diagram = the
 *    2D viewport;
 *  - the twin's "Show the diagram" (exit) switches the persisted view; a
 *    twin that can't be shown (fail) falls back to the Diagram for THAT
 *    site, this session, and hides the switch;
 *  - full screen: the twin sideways (turned container) with Close and a
 *    "Diagram" button on its rail; the upright Diagram's pill turns it
 *    sideways again;
 *  - Grouped | Units: ONE shared mode for both views (default grouped) —
 *    in the inline header row for both views (wrapping on a narrow row),
 *    on the sideways rail (Close, Diagram, Group | Units), the 2D full
 *    screen's own pill; the hosts pass the effective mode to the twin; the
 *    inline Diagram has no in-panel pill any more; hidden (and the mode
 *    forced to units) when nothing groups.
 *
 * The viewport and the twin are recording stubs (their own suites cover
 * them: sldViewportFit, sldTwinView).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SITE_A = 'site-a';
const SITE_B = 'site-b';

const mockNav: { siteId: string; focused: boolean; navigate: jest.Mock; goBack: jest.Mock } = {
  siteId: SITE_A,
  focused: true,
  navigate: jest.fn(),
  goBack: jest.fn(),
};

/** The stubs' last props (and how often each rendered). */
const mockSeen: {
  viewport: Record<string, unknown> | null;
  twin: Record<string, unknown> | null;
} = { viewport: null, twin: null };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useRoute: () => ({ params: { siteId: mockNav.siteId } }),
    useNavigation: () => ({ navigate: mockNav.navigate, goBack: mockNav.goBack }),
    useIsFocused: () => mockNav.focused,
  };
});

// A two-node diagram (nothing to group) for every site by default; a test
// switches to a groupable one (two PV units feeding the plant). The model's
// real selectors read it.
const mockConfigs = {
  plain: {
    siteComponents: {
      sldV2: {
        nodes: [
          { id: 'hub', type: 'logo', position: { x: 0, y: 0 }, data: { heading: 'Plant', keys: [] } },
          { id: 'pv', position: { x: 0, y: 200 }, data: { heading: 'Solar', keys: [] } },
        ],
        edges: [{ id: 'e1', source: 'pv', target: 'hub' }],
      },
    },
  },
  groupable: {
    siteComponents: {
      sldV2: {
        nodes: [
          { id: 'hub', type: 'logo', position: { x: 0, y: 0 }, data: { heading: 'Plant', keys: [] } },
          { id: 'pv1', position: { x: -100, y: 200 }, data: { heading: 'PV 1', keys: [] } },
          { id: 'pv2', position: { x: 100, y: 200 }, data: { heading: 'PV 2', keys: [] } },
        ],
        edges: [
          { id: 'e1', source: 'pv1', target: 'hub', sourceHandle: 'b', targetHandle: 't' },
          { id: 'e2', source: 'pv2', target: 'hub', sourceHandle: 'b', targetHandle: 't' },
        ],
      },
    },
  },
};
const mockConfig: { current: unknown } = { current: mockConfigs.plain };

jest.mock('src/hooks', () => {
  const actual = jest.requireActual('src/hooks') as object;
  const query = (data: unknown) => ({ data, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  return {
    ...actual,
    useSiteConfig: () => query(mockConfig.current),
    useSiteData: () => query(undefined),
  };
});

jest.mock('../src/components/screens/Authenticated/SiteDetail/components/SLDViewport', () => {
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockSeen.viewport = props;
      return ReactActual.createElement(MockView, { testID: 'sld-viewport' });
    },
  };
});

jest.mock('../src/components/screens/Authenticated/SiteDetail/components/SldTwin/SldTwinView', () => {
  const { View: MockView } = jest.requireActual<typeof import('react-native')>('react-native');
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockSeen.twin = props;
      return ReactActual.createElement(MockView, { testID: 'sld-twin' });
    },
  };
});

import SLDDiagram, {
  SLD_INLINE_WIDTH,
  SLD_TWIN_INLINE_HEIGHT,
  SLDDiagramPlaceholder,
} from '../src/components/screens/Authenticated/SiteDetail/components/SLDDiagram';
import SLDFullscreenScreen from '../src/components/screens/Authenticated/SiteDetail/components/SLDFullscreenScreen';
import {
  SLD_SIDEWAYS_FULLSCREEN_HINT,
  sldViewHeaderGeometry,
  SldViewHeader,
  SldViewHeaderSkeleton,
  type SldViewHeaderGeometry,
} from '../src/components/screens/Authenticated/SiteDetail/components/ControlButtons';
import { resetSldTwinFallbackForTests } from '../src/components/screens/Authenticated/SiteDetail/components/useSldModel';
import PressableScale from '../src/components/common/PressableScale';
import {
  DEFAULT_SLD_MODE,
  DEFAULT_SLD_VIEW,
  SLD_VIEW_STORAGE_KEY,
  useSldViewMode,
} from '../src/hooks/useSldViewMode';
import Skeleton from '../src/components/common/Skeleton';
import {
  BodyScrollGateContext,
  PullToRefreshGateContext,
  usePullToRefreshGate,
} from '../src/components/screens/Authenticated/SiteDetail/pullToRefreshGate';
import {
  BodyViewportContext,
  createBodyViewportStore,
  type BodyViewportPublisher,
} from '../src/components/screens/Authenticated/SiteDetail/bodyViewport';
import {
  SLD_TWIN_SCROLL_RESERVE,
} from '../src/components/screens/Authenticated/SiteDetail/components/sldViewportFit';
import { SLD_TWIN_IOS_SCROLL_GUARD_PT } from '../src/components/screens/Authenticated/SiteDetail/components/SLDDiagram';
import { radius as radiusTokens } from '../src/theme/tokens';

/** Let zustand persist's async storage write land. */
const flush = () => new Promise(r => setTimeout(r, 0));
const storedView = async (): Promise<unknown> => {
  const raw = await AsyncStorage.getItem(SLD_VIEW_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: { view?: unknown } }).state.view : null;
};

let tree: ReactTestRenderer | undefined;
const render = (el: React.ReactElement) => {
  act(() => {
    tree = renderer.create(el);
  });
  return (tree as ReactTestRenderer).root;
};

/** Composite elements with this accessibility label and a press handler. */
const pressables = (root: ReactTestInstance, label: string) =>
  root.findAll(
    n => typeof n.type !== 'string' && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
const press = (root: ReactTestInstance, label: string) => {
  const found = pressables(root, label);
  expect(found.length).toBeGreaterThan(0);
  act(() => {
    (found[0].props.onPress as () => void)();
  });
};
const byTestId = (root: ReactTestInstance, id: string) => root.findAll(n => n.props.testID === id && n.type === View);
/** Segments with these labels, in tree (reading) order, with whether each is selected. */
const segmentsOf = (root: ReactTestInstance, labels: string[]): [string, boolean][] =>
  root
    .findAllByType(PressableScale)
    .filter(n => labels.includes(n.props.accessibilityLabel))
    .map(n => [n.props.accessibilityLabel as string, n.props.selected === true]);
/** The Diagram | 3D switch's segments. */
const segments = (root: ReactTestInstance) => segmentsOf(root, ['Diagram', '3D']);
/** Both header switches' segments. */
const headerSegments = (root: ReactTestInstance) => segmentsOf(root, ['Diagram', '3D', 'Grouped', 'Units']);
/** The rendered header row's geometry (the memo'd SldViewHeader, found by its props). */
const headerGeometry = (root: ReactTestInstance): SldViewHeaderGeometry | null => {
  const rows = root.findAll(n => typeof n.type !== 'string' && n.props.onModeChange !== undefined && n.props.geometry);
  return rows.length ? (rows[0].props.geometry as SldViewHeaderGeometry) : null;
};
/** The header row's left cluster: the first View (after the row) that spaces its items. */
const clusterOf = (views: ReactTestInstance[]): ReactTestInstance => {
  const found = views.slice(1).find(v => flatStyle(v).gap !== undefined);
  expect(found).toBeDefined();
  return found as ReactTestInstance;
};
/** Flattened style of a host element. */
const flatStyle = (n: ReactTestInstance): Record<string, unknown> =>
  Object.assign({}, ...(([] as unknown[]).concat(n.props.style).flat(3).filter(Boolean) as object[]));

beforeEach(async () => {
  mockConfig.current = mockConfigs.plain;
  mockNav.siteId = SITE_A;
  mockNav.focused = true;
  mockNav.navigate.mockReset();
  mockNav.goBack.mockReset();
  mockSeen.viewport = null;
  mockSeen.twin = null;
  resetSldTwinFallbackForTests();
  useSldViewMode.setState({ mode: DEFAULT_SLD_MODE, view: DEFAULT_SLD_VIEW, motionPaused: false });
  await flush();
  await AsyncStorage.clear();
});

afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
});

describe('inline — the Diagram | 3D switch above the panel', () => {
  it('reads "Diagram", then "3D"; opens on 3D = the web twin, a tall card', () => {
    const root = render(<SLDDiagram />);
    expect(segments(root)).toEqual([
      ['Diagram', false],
      ['3D', true],
    ]);
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    expect(byTestId(root, 'sld-viewport')).toHaveLength(0);
    expect(mockSeen.twin).toMatchObject({ siteId: SITE_A, host: 'inline', visible: true });
    const style = ([] as unknown[]).concat(mockSeen.twin?.style).flat(3) as Array<Record<string, unknown>>;
    const flat = Object.assign({}, ...style.filter(Boolean));
    expect([flat.width, flat.height]).toEqual([SLD_INLINE_WIDTH, SLD_TWIN_INLINE_HEIGHT]);
  });

  it('3D: the header’s full-screen button opens the sideways route (and says so)', () => {
    const root = render(<SLDDiagram />);
    const full = pressables(root, 'Fullscreen');
    expect(full.length).toBeGreaterThan(0);
    expect(full[0].props.accessibilityHint).toBe(SLD_SIDEWAYS_FULLSCREEN_HINT);
    press(root, 'Fullscreen');
    expect(mockNav.navigate).toHaveBeenCalledWith('SLDFullscreen', { siteId: SITE_A });
  });

  it('"Diagram" shows the 2D viewport and is persisted; "3D" goes back', async () => {
    const root = render(<SLDDiagram />);
    press(root, 'Diagram');
    expect(useSldViewMode.getState().view).toBe('2d');
    await flush();
    expect(await storedView()).toBe('2d');
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(byTestId(root, 'sld-viewport')).toHaveLength(1);
    // The inline viewport has no pill of its own (the switch heads the panel)
    // and keeps its own full-screen control (upright Diagram).
    expect(mockSeen.viewport?.width).toBe(SLD_INLINE_WIDTH);
    expect(mockSeen.viewport?.view).toBeUndefined();
    expect(typeof mockSeen.viewport?.onFullscreen).toBe('function');
    expect(pressables(root, 'Fullscreen').filter(n => n.props.accessibilityHint === SLD_SIDEWAYS_FULLSCREEN_HINT)).toHaveLength(0);
    expect(segments(root)).toEqual([
      ['Diagram', true],
      ['3D', false],
    ]);
    press(root, '3D');
    expect(useSldViewMode.getState().view).toBe('3d');
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
  });

  it('the twin’s own "Show the diagram" (exit) switches the persisted view to the Diagram', async () => {
    const root = render(<SLDDiagram />);
    act(() => {
      (mockSeen.twin?.onExit as () => void)();
    });
    expect(useSldViewMode.getState().view).toBe('2d');
    await flush();
    expect(await storedView()).toBe('2d');
    expect(byTestId(root, 'sld-viewport')).toHaveLength(1);
  });

  it('a twin that fails: the Diagram for THIS site, this session — switch hidden, stored choice kept', () => {
    let root = render(<SLDDiagram />);
    act(() => {
      (mockSeen.twin?.onFail as (reason: string) => void)('page: boom');
    });
    expect(byTestId(root, 'sld-viewport')).toHaveLength(1);
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(segments(root)).toEqual([]);
    expect(useSldViewMode.getState().view).toBe('3d');
    // Another site still opens in 3D.
    act(() => tree?.unmount());
    mockNav.siteId = SITE_B;
    mockSeen.twin = null;
    root = render(<SLDDiagram />);
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    expect(mockSeen.twin).toMatchObject({ siteId: SITE_B });
  });

  it('under the full-screen route: a twin that was up stays mounted, paused; none is CREATED there', () => {
    /** The static stand-in at the twin's size. */
    const twinBoxes = (root: ReactTestInstance) =>
      root.findAll(n => {
        if (n.type !== View) return false;
        const flat = Object.assign({}, ...(([] as unknown[]).concat(n.props.style).flat(3).filter(Boolean) as object[]));
        return flat.width === SLD_INLINE_WIDTH && flat.height === SLD_TWIN_INLINE_HEIGHT;
      });
    let root = render(<SLDDiagram />);
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    // The full screen is pushed on top: the inline twin stays, paused.
    mockNav.focused = false;
    act(() => tree?.update(<SLDDiagram />));
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    expect(mockSeen.twin?.visible).toBe(false);
    // "Diagram" then "3D" inside the full screen: the inline twin goes with
    // the Diagram and is NOT recreated under the full screen (one page at a
    // time); the Diagram drops to a static box meanwhile.
    act(() => {
      useSldViewMode.setState({ view: '2d' });
    });
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(byTestId(root, 'sld-viewport')).toHaveLength(0);
    act(() => {
      useSldViewMode.setState({ view: '3d' });
    });
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(twinBoxes(root)).toHaveLength(1);
    // Back in focus → the twin comes up.
    mockNav.focused = true;
    act(() => tree?.update(<SLDDiagram />));
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    expect(mockSeen.twin?.visible).toBe(true);
    // A first render under the full screen creates none either.
    act(() => tree?.unmount());
    mockNav.focused = false;
    mockSeen.twin = null;
    root = render(<SLDDiagram />);
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(mockSeen.twin).toBeNull();
    expect(twinBoxes(root)).toHaveLength(1);
    expect(segments(root).map(seg => seg[0])).toEqual(['Diagram', '3D']);
  });
});

describe('full screen — the twin sideways, the Diagram upright', () => {
  /** A View whose style turns it +90°. */
  const isTurned = (n: ReactTestInstance) => {
    if (n.type !== View) return false;
    const flat = ([] as unknown[]).concat(n.props.style).flat(3) as Array<{ transform?: Array<{ rotate?: string }> } | null>;
    return flat.some(st => !!st && Array.isArray(st.transform) && st.transform.some(t => t.rotate === '90deg'));
  };
  const insideTurned = (n: ReactTestInstance) => {
    for (let p: ReactTestInstance | null = n.parent; p; p = p.parent) if (isTurned(p)) return true;
    return false;
  };

  it('3D: the twin (host fullscreen, visible) turned sideways, with Close and "Diagram" on the rail', () => {
    const root = render(<SLDFullscreenScreen />);
    const twin = byTestId(root, 'sld-twin');
    expect(twin).toHaveLength(1);
    expect(insideTurned(twin[0])).toBe(true);
    expect(mockSeen.twin).toMatchObject({ siteId: SITE_A, host: 'fullscreen', visible: true });
    expect(byTestId(root, 'sld-viewport')).toHaveLength(0);
    for (const label of ['Close', 'Diagram']) {
      const found = pressables(root, label);
      expect([label, found.length > 0 && found.every(insideTurned)]).toEqual([label, true]);
    }
    // No Diagram-only controls in 3D (the twin has its own tools); nothing
    // groups on this site, so no Group | Units either.
    for (const label of ['Group', 'Grouped', 'Units', 'Pause animation', 'Recentre']) {
      expect([label, pressables(root, label)]).toEqual([label, []]);
    }
    press(root, 'Close');
    expect(mockNav.goBack).toHaveBeenCalled();
  });

  it('"Diagram" turns it upright into the Diagram (persisted); its "3D" pill turns it sideways again', async () => {
    const root = render(<SLDFullscreenScreen />);
    press(root, 'Diagram');
    expect(useSldViewMode.getState().view).toBe('2d');
    await flush();
    expect(await storedView()).toBe('2d');
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    const viewport = byTestId(root, 'sld-viewport');
    expect(viewport).toHaveLength(1);
    expect(insideTurned(viewport[0])).toBe(false);
    expect(mockSeen.viewport).toMatchObject({ fullscreen: true, view: '2d' });
    act(() => {
      (mockSeen.viewport?.onViewChange as (v: string) => void)('3d');
    });
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
  });

  it('the twin’s exit and failure both leave it upright as the Diagram; a failure hides the pill', () => {
    let root = render(<SLDFullscreenScreen />);
    act(() => {
      (mockSeen.twin?.onExit as () => void)();
    });
    expect(byTestId(root, 'sld-viewport')).toHaveLength(1);
    expect(mockSeen.viewport?.view).toBe('2d');
    act(() => tree?.unmount());
    useSldViewMode.setState({ view: '3d' });
    root = render(<SLDFullscreenScreen />);
    act(() => {
      (mockSeen.twin?.onFail as (reason: string) => void)('crash: renderer killed');
    });
    expect(byTestId(root, 'sld-viewport')).toHaveLength(1);
    expect(mockSeen.viewport?.view).toBeUndefined();
    expect(useSldViewMode.getState().view).toBe('3d');
  });
});

describe('Grouped | Units — one shared mode for both views', () => {
  beforeEach(() => {
    mockConfig.current = mockConfigs.groupable;
  });

  it('inline header: [Diagram | 3D] [Grouped | Units] … [Fullscreen] in that order; grouped by default', () => {
    const root = render(<SLDDiagram />);
    expect(useSldViewMode.getState().mode).toBe('grouped');
    expect(headerSegments(root)).toEqual([
      ['Diagram', false],
      ['3D', true],
      ['Grouped', true],
      ['Units', false],
    ]);
    // Reading order: both switches, then the sideways full-screen button.
    const order = root
      .findAllByType(PressableScale)
      .map(n => n.props.accessibilityLabel as string)
      .filter(l => ['Diagram', '3D', 'Grouped', 'Units', 'Fullscreen'].includes(l));
    expect(order).toEqual(['Diagram', '3D', 'Grouped', 'Units', 'Fullscreen']);
    // The 3D host hands the twin the effective mode.
    expect(mockSeen.twin).toMatchObject({ host: 'inline', mode: 'grouped' });
  });

  it('the Diagram shows the same header switches; its viewport has no in-panel pill (no strip)', () => {
    const root = render(<SLDDiagram />);
    const in3D = headerGeometry(root);
    press(root, 'Diagram');
    expect(headerSegments(root)).toEqual([
      ['Diagram', true],
      ['3D', false],
      ['Grouped', true],
      ['Units', false],
    ]);
    // Inline 2D: Grouped | Units heads the panel, so the viewport draws no
    // pill of its own (and its fit reserves no strip / mask band for one).
    expect(mockSeen.viewport?.groupMode).toBeUndefined();
    expect(mockSeen.viewport?.onGroupModeChange).toBeUndefined();
    // The row's layout is the same in both views (the full-screen slot is
    // reserved even where the button doesn't show) — no re-flow on a switch.
    expect(headerGeometry(root)).toEqual(in3D);
    expect(pressables(root, 'Fullscreen').filter(n => n.props.accessibilityHint === SLD_SIDEWAYS_FULLSCREEN_HINT)).toHaveLength(0);
  });

  it('switching in 3D switches the Diagram too, and vice versa (in memory, never persisted)', async () => {
    const root = render(<SLDDiagram />);
    press(root, 'Units');
    expect(useSldViewMode.getState().mode).toBe('units');
    expect(mockSeen.twin?.mode).toBe('units');
    // The Diagram opens on the same mode: every unit (hub + 2 PV units).
    press(root, 'Diagram');
    expect((mockSeen.viewport?.graph as { nodes: unknown[] }).nodes).toHaveLength(3);
    expect(headerSegments(root).filter(([, on]) => on).map(([l]) => l)).toEqual(['Diagram', 'Units']);
    // Back to Grouped in the Diagram: one PV box + the hub …
    press(root, 'Grouped');
    expect((mockSeen.viewport?.graph as { nodes: unknown[] }).nodes).toHaveLength(2);
    // … and 3D follows.
    press(root, '3D');
    expect(mockSeen.twin?.mode).toBe('grouped');
    // Only the view is ever written to storage.
    await flush();
    const raw = await AsyncStorage.getItem(SLD_VIEW_STORAGE_KEY);
    expect(raw ? (JSON.parse(raw) as { state: object }).state : null).toEqual({ view: '3d' });
  });

  it('nothing groups: no Grouped | Units anywhere, and the twin is told units', () => {
    mockConfig.current = mockConfigs.plain;
    // Even with "grouped" stored, the EFFECTIVE mode is units.
    let root = render(<SLDDiagram />);
    expect(headerSegments(root)).toEqual([
      ['Diagram', false],
      ['3D', true],
    ]);
    expect(mockSeen.twin?.mode).toBe('units');
    act(() => tree?.unmount());
    root = render(<SLDFullscreenScreen />);
    expect(mockSeen.twin).toMatchObject({ host: 'fullscreen', mode: 'units' });
    for (const label of ['Group', 'Units']) expect([label, pressables(root, label)]).toEqual([label, []]);
  });

  it('a failed twin: the header keeps Grouped | Units for the Diagram (no Diagram | 3D)', () => {
    const root = render(<SLDDiagram />);
    act(() => {
      (mockSeen.twin?.onFail as (reason: string) => void)('page: boom');
    });
    expect(headerSegments(root)).toEqual([
      ['Grouped', true],
      ['Units', false],
    ]);
    expect(headerGeometry(root)?.view).toBeNull();
    press(root, 'Units');
    expect(useSldViewMode.getState().mode).toBe('units');
  });

  it('the header and its loading skeleton share one geometry (no jump at the deferred mount)', () => {
    const live = render(<SLDDiagram />);
    const geometry = headerGeometry(live);
    expect(geometry).not.toBeNull();
    act(() => tree?.unmount());
    const placeholder = render(<SLDDiagramPlaceholder siteId={SITE_A} />);
    const skeletonRow = placeholder.findAll(
      n => typeof n.type !== 'string' && n.props.geometry !== undefined && 'withButton' in n.props,
    );
    expect(skeletonRow).toHaveLength(1);
    expect(skeletonRow[0].props.geometry).toEqual(geometry);
  });

  it('a row too narrow for one line (a 360 pt phone): Grouped | Units wraps under Diagram | 3D, Fullscreen stays up top', () => {
    // A row narrower than the two pills + the button (the pills here are at
    // the test renderer's 750 pt width scale; sldViewportFit covers 360–440).
    const geometry = sldViewHeaderGeometry({ width: 328, fontScale: 1.3, withView: true, withGroup: true });
    expect(geometry.wrapped).toBe(true);
    const onFullscreen = jest.fn();
    const root = render(
      <SldViewHeader
        geometry={geometry}
        view="3d"
        onViewChange={() => undefined}
        mode="grouped"
        onModeChange={() => undefined}
        onFullscreen={onFullscreen}
      />,
    );
    const hosts = root.findAll(n => n.type === View);
    // The row: the geometry's exact height (both lines + their gap).
    const row = hosts[0];
    expect(flatStyle(row).height).toBe(geometry.height);
    expect(geometry.height).toBe(Math.max(geometry.view!.height, geometry.button) + 8 + geometry.group!.height);
    // The left cluster stacks the two pills; the button is NOT in it.
    const cluster = clusterOf(hosts);
    expect(flatStyle(cluster).flexDirection).toBe('column');
    const inCluster = (label: string) => pressables(cluster, label).length > 0;
    expect(['Diagram', '3D', 'Grouped', 'Units'].map(inCluster)).toEqual([true, true, true, true]);
    expect(inCluster('Fullscreen')).toBe(false);
    expect(pressables(root, 'Fullscreen').length).toBeGreaterThan(0);
    // The pills are sized to their labels: no label ever shrinks.
    const texts = root.findAll(n => n.type === Text);
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) expect(t.props.adjustsFontSizeToFit).toBeFalsy();
    // The skeleton draws the same row (same height, wrapped, a button slot).
    act(() => tree?.unmount());
    const sk = render(<SldViewHeaderSkeleton geometry={geometry} withButton />);
    const skHosts = sk.findAll(n => n.type === View);
    expect(flatStyle(skHosts[0]).height).toBe(geometry.height);
    expect(flatStyle(clusterOf(skHosts)).flexDirection).toBe('column');
    expect(sk.findAllByType(Skeleton).map(n => [n.props.width, n.props.height])).toEqual([
      [geometry.view!.width, geometry.view!.height],
      [geometry.group!.width, geometry.group!.height],
      [40, 40],
    ]);
  });

  it('one line when it fits: a row, the button beside the pills', () => {
    const geometry = sldViewHeaderGeometry({ width: 2000, fontScale: 1, withView: true, withGroup: true });
    expect(geometry.wrapped).toBe(false);
    const root = render(
      <SldViewHeader
        geometry={geometry}
        view="2d"
        onViewChange={() => undefined}
        mode="units"
        onModeChange={() => undefined}
      />,
    );
    const hosts = root.findAll(n => n.type === View);
    expect(flatStyle(hosts[0]).height).toBe(geometry.height);
    expect(flatStyle(clusterOf(hosts)).flexDirection).toBe('row');
    // Diagram view: no full-screen button in the row.
    expect(pressables(root, 'Fullscreen')).toEqual([]);
  });

  it('sideways rail: Close, Diagram, then Group | Units (turned with it); a press switches the shared mode', () => {
    const root = render(<SLDFullscreenScreen />);
    expect(mockSeen.twin).toMatchObject({ host: 'fullscreen', mode: 'grouped' });
    const order = root
      .findAllByType(PressableScale)
      .map(n => n.props.accessibilityLabel as string)
      .filter(l => ['Close', 'Diagram', 'Group', 'Units'].includes(l));
    expect(order).toEqual(['Close', 'Diagram', 'Group', 'Units']);
    expect(segmentsOf(root, ['Group', 'Units'])).toEqual([
      ['Group', true],
      ['Units', false],
    ]);
    press(root, 'Units');
    expect(useSldViewMode.getState().mode).toBe('units');
    expect(mockSeen.twin?.mode).toBe('units');
    expect(segmentsOf(root, ['Group', 'Units'])).toEqual([
      ['Group', false],
      ['Units', true],
    ]);
    // The rail's labels never shrink-to-fit (it lives in the turned view).
    for (const t of root.findAll(n => n.type === Text)) expect(t.props.adjustsFontSizeToFit).toBeFalsy();
    // Upright Diagram full screen: the same mode, its own in-panel pill kept.
    press(root, 'Diagram');
    expect(mockSeen.viewport).toMatchObject({ fullscreen: true, groupMode: 'units' });
    act(() => {
      (mockSeen.viewport?.onGroupModeChange as (m: string) => void)('grouped');
    });
    expect(useSldViewMode.getState().mode).toBe('grouped');
  });
});

/* ─────────── inline 3D inside SiteDetail's body: card cap + page-scroll holds ─────────── */

describe('inline 3D in SiteDetail’s body — the card cap and the page-scroll holds', () => {
  /** What SiteDetail's gates currently say (written by `Body` on every render). */
  let gate = { scroll: false, pull: false };
  let viewport: BodyViewportPublisher;
  /** SiteDetail's providers around the Summary content, as index.tsx nests them. */
  const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const scroll = usePullToRefreshGate();
    const pull = usePullToRefreshGate();
    gate = { scroll: scroll.blocked, pull: pull.blocked };
    return (
      <PullToRefreshGateContext.Provider value={pull.acquire}>
        <BodyScrollGateContext.Provider value={scroll.acquire}>
          <BodyViewportContext.Provider value={viewport.store}>{children}</BodyViewportContext.Provider>
        </BodyScrollGateContext.Provider>
      </PullToRefreshGateContext.Provider>
    );
  };
  beforeEach(() => {
    gate = { scroll: false, pull: false };
    viewport = createBodyViewportStore(() => null);
  });

  const twinHeight = () => {
    const style = ([] as unknown[]).concat(mockSeen.twin?.style).flat(3) as Array<Record<string, unknown>>;
    return Object.assign({}, ...style.filter(Boolean)).height as number;
  };

  it('the card leaves SLD_TWIN_SCROLL_RESERVE of the body viewport free — placeholder and twin alike', () => {
    viewport.setHeight(690);
    let root = render(
      <Body>
        <SLDDiagramPlaceholder siteId={SITE_A} />
      </Body>,
    );
    const skeleton = root.findAllByType(Skeleton).find(n => n.props.width === SLD_INLINE_WIDTH)!;
    expect(skeleton.props.height).toBe(690 - SLD_TWIN_SCROLL_RESERVE);
    // The twin's own corner (radius.md), not the Diagram frame's: no corner
    // change when the placeholder swaps for the twin.
    expect(skeleton.props.radius).toBe(radiusTokens.md);
    act(() => tree?.unmount());
    root = render(
      <Body>
        <SLDDiagram />
      </Body>,
    );
    expect(byTestId(root, 'sld-twin')).toHaveLength(1);
    expect(twinHeight()).toBe(690 - SLD_TWIN_SCROLL_RESERVE);
    // A resize (rotation is locked; split screen) follows.
    act(() => viewport.setHeight(760));
    expect(twinHeight()).toBe(760 - SLD_TWIN_SCROLL_RESERVE);
  });

  /** The panel around the twin, and an RN touch event on it. */
  const panel = (root: ReactTestInstance) => {
    const found = root.findAll(n => n.props.testID === 'sld-twin-panel' && n.type === View);
    expect(found).toHaveLength(1);
    return found[0];
  };
  type Touch = { identifier: number };
  const touch = (root: ReactTestInstance, kind: 'Start' | 'End' | 'Cancel', changed: number[], touches: number[]) =>
    act(() => {
      const ev = {
        nativeEvent: {
          changedTouches: changed.map((identifier): Touch => ({ identifier })),
          touches: touches.map((identifier): Touch => ({ identifier })),
        },
      };
      (panel(root).props[`onTouch${kind}`] as (e: unknown) => void)(ev);
    });
  const mountTwin = () =>
    render(
      <Body>
        <SLDDiagram />
      </Body>,
    );
  const HELD = { scroll: true, pull: true };
  const FREE = { scroll: false, pull: false };

  it('one finger: held from touch-down until it lifts', () => {
    const root = mountTwin();
    expect(gate).toEqual(FREE);
    touch(root, 'Start', [1], [1]);
    expect(gate).toEqual(HELD);
    touch(root, 'End', [1], []);
    expect(gate).toEqual(FREE);
  });

  it('a pinch: held until the LAST of the panel’s fingers lifts', () => {
    const root = mountTwin();
    touch(root, 'Start', [1], [1]);
    touch(root, 'Start', [2], [1, 2]);
    touch(root, 'End', [1], [2]);
    expect(gate).toEqual(HELD);
    touch(root, 'End', [2], []);
    expect(gate).toEqual(FREE);
  });

  it('a finger elsewhere on the screen that lifts last never strands the page (its touchend goes to ITS target)', () => {
    const root = mountTwin();
    // Finger 9 rests outside the panel; finger 1 lands on the 3D.
    touch(root, 'Start', [1], [9, 1]);
    expect(gate).toEqual(HELD);
    touch(root, 'End', [1], [9]);
    expect(gate).toEqual(FREE);
  });

  it('a cancel (a native gesture took the touch over) releases', () => {
    const root = mountTwin();
    touch(root, 'Start', [1], [1]);
    touch(root, 'Start', [2], [1, 2]);
    touch(root, 'Cancel', [1, 2], []);
    expect(gate).toEqual(FREE);
  });

  it('the page’s own claim and RN’s touches are independent holds — neither releases the other', () => {
    const root = mountTwin();
    const onGesture = mockSeen.twin?.onGesture as (active: boolean) => void;
    // The page claims (canvas finger down), RN's touch ends first.
    touch(root, 'Start', [1], [1]);
    act(() => onGesture(true));
    touch(root, 'End', [1], []);
    expect(gate).toEqual(HELD);
    act(() => onGesture(false));
    expect(gate).toEqual(FREE);
    // The page releases first while a finger is still on the panel.
    touch(root, 'Start', [3], [3]);
    act(() => onGesture(true));
    act(() => onGesture(false));
    expect(gate).toEqual(HELD);
    touch(root, 'End', [3], []);
    expect(gate).toEqual(FREE);
  });

  it('iOS: a native scroll guard — a callback-free pan past a tap’s jitter that never cancels the page’s touches', () => {
    const root = mountTwin();
    const detectors = root.findAllByType(GestureDetector);
    expect(detectors).toHaveLength(1);
    // It wraps the panel itself.
    expect(detectors[0].findAll(n => n.props.testID === 'sld-twin-panel' && n.type === View)).toHaveLength(1);
    const g = detectors[0].props.gesture as { handlerName: string; config: Record<string, unknown>; handlers: Record<string, unknown> };
    expect(g.handlerName).toBe('PanGestureHandler');
    expect(g.config).toMatchObject({
      minDist: SLD_TWIN_IOS_SCROLL_GUARD_PT,
      cancelsTouchesInView: false,
      shouldCancelWhenOutside: false,
    });
    // Below the scroll view's own ~10 pt start, above a tap's jitter.
    expect(SLD_TWIN_IOS_SCROLL_GUARD_PT).toBeGreaterThanOrEqual(4);
    expect(SLD_TWIN_IOS_SCROLL_GUARD_PT).toBeLessThan(10);
    for (const cb of ['onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) {
      expect([cb, g.handlers[cb]]).toEqual([cb, undefined]);
    }
  });

  it('Android: no gesture handler around the WebView (an active one would steal its touches)', () => {
    const restore = jest.replaceProperty(Platform, 'OS', 'android');
    try {
      const root = mountTwin();
      expect(root.findAllByType(GestureDetector)).toHaveLength(0);
      expect(byTestId(root, 'sld-twin')).toHaveLength(1);
      // The RN touch hold still works there.
      touch(root, 'Start', [1], [1]);
      expect(gate).toEqual(HELD);
      touch(root, 'End', [1], []);
      expect(gate).toEqual(FREE);
    } finally {
      restore.restore();
    }
  });

  it('a panel unmounted mid-touch releases both holds', () => {
    const root = mountTwin();
    touch(root, 'Start', [1], [1]);
    act(() => (mockSeen.twin?.onGesture as (active: boolean) => void)(true));
    expect(gate).toEqual(HELD);
    act(() => {
      useSldViewMode.setState({ view: '2d' });
    });
    expect(byTestId(root, 'sld-twin')).toHaveLength(0);
    expect(gate).toEqual(FREE);
  });
});
