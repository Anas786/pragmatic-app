/**
 * PerformanceReportCard (Reports tab) — rendered with mocked data hooks:
 * period hero (no LIVE / pulse, words not Σ), one chart WebView, the
 * placeholder-data 'Updating…' state that keeps everything mounted,
 * loading / error / empty states, the outage caption, and the period
 * pills (re-tap opens the picker; the selection survives a remount).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useIsFocused: () => true,
    useRoute: () => ({ params: { siteId: 'site-1' } }),
  };
});

jest.mock('react-native-echarts-pro', () => {
  const R = require('react');
  const { View: RNView } = require('react-native');
  const Chart = R.forwardRef((props: object, _ref: unknown) =>
    R.createElement(RNView, { ...props, testID: 'echart' }),
  );
  return { __esModule: true, default: Chart };
});

type MockQueryState = {
  data?: { data: Record<string, number | null>[] };
  isLoading?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  error?: unknown;
  dataUpdatedAt?: number;
};
let mockQuery: MockQueryState = {};
const mockRefetch = jest.fn();

jest.mock('../src/hooks', () => {
  const actual = jest.requireActual('../src/hooks') as object;
  return {
    ...actual,
    useInteractionReady: () => true,
    useReportMapping: () => ({
      data: { ed_solar: { display: 'Solar Production Today System (kWh)' } },
    }),
    useEnergyReport: () => ({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isPlaceholderData: false,
      error: null,
      dataUpdatedAt: 0,
      refetch: mockRefetch,
      ...mockQuery,
    }),
  };
});

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChartFullscreenModal from '../src/components/screens/Authenticated/SiteDetail/components/ChartFullscreenModal';
import PerformanceReportCard from '../src/components/screens/Authenticated/SiteDetail/components/PerformanceReportCard';
import { touch } from '../src/theme/tokens';
import { useReportPeriodStore } from '../src/hooks/useReportPeriodStore';

const day = (d: number) => new Date(2026, 8, d).getTime();
const solarRows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ time: day(1 + i), ed_solar: 14540.31 }));

let tree: ReactTestRenderer | undefined;
const render = () => {
  act(() => {
    tree = renderer.create(<PerformanceReportCard />);
  });
  return tree as ReactTestRenderer;
};
const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map(n => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
const charts = (t: ReactTestRenderer) => t.root.findAll(n => n.props.testID === 'echart' && typeof n.type !== 'string');

beforeEach(() => {
  mockQuery = {};
  mockRefetch.mockClear();
  useReportPeriodStore.getState().reset();
});
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
});

describe('PerformanceReportCard', () => {
  it('shows a period hero (no LIVE, no Σ) with the total in MWh and ONE chart', () => {
    mockQuery = { data: { data: solarRows(31) }, dataUpdatedAt: Date.now() };
    const t = render();
    const all = texts(t);
    expect(all.some(s => /^Energy · /.test(s))).toBe(true);
    expect(all.some(s => /LIVE|Σ|TOP ·|Tap a slice/.test(s))).toBe(false);
    expect(all).toContain('451');
    expect(all).toContain('MWh');
    expect(all).toContain('1 source');
    expect(all).toContain('Mostly Solar · 100%');
    expect(all.some(s => s.startsWith('Updated '))).toBe(true);
    // Screen readers: the accessible total group carries the freshness
    // caption (its label replaces the children's text), and the mix line
    // speaks its '·' / '%' instead of "middle dot".
    const totalGroup = t.root.find(
      n =>
        typeof n.type === 'string' &&
        n.props.accessible === true &&
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Total energy, '),
    );
    expect(totalGroup.props.accessibilityLabel).toMatch(/^Total energy, .+\. Updated .+$/);
    const mixText = t.root.find(
      n => n.type === Text && n.props.children === 'Mostly Solar · 100%',
    );
    expect(mixText.props.accessibilityLabel).toBe('Mostly Solar, 100 percent');
    // Sources row: short label + backend label without its '(kWh)'.
    expect(all).toContain('Solar');
    expect(all).toContain('Solar Production Today System');
    expect(all).toContain('450.7');
    expect(charts(t)).toHaveLength(1);
    // The chart is ONE image element for screen readers.
    const img = t.root.find(
      n => n.props.accessibilityRole === 'image' && typeof n.type === 'string',
    );
    expect(img.props.accessibilityLabel).toMatch(/^Energy over time, .*31 days\. Total 451 megawatt hours\./);
  });

  it('keeps content mounted, dimmed and marked Updating… on placeholder data', () => {
    mockQuery = { data: { data: solarRows(31) } };
    const t = render();
    const chartBefore = charts(t)[0];
    mockQuery = { data: { data: solarRows(31) }, isPlaceholderData: true, isFetching: true };
    act(() => t.update(<PerformanceReportCard />));
    expect(texts(t)).toContain('Updating…');
    expect(charts(t)).toHaveLength(1);
    expect(charts(t)[0]).toBe(chartBefore); // same instance → no WebView reload
    const dimmed = t.root.find(
      (n: ReactTestInstance) =>
        typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.opacity === 0.5,
    );
    expect(dimmed).toBeTruthy();
    expect(texts(t).some(s => s.startsWith('Updated '))).toBe(false);
    // …and the spoken total drops the stale freshness too.
    const totalGroup = t.root.find(
      n =>
        typeof n.type === 'string' &&
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Total energy, '),
    );
    expect(totalGroup.props.accessibilityLabel).not.toMatch(/Updated/);
  });

  it('loading: skeleton geometry, no chart', () => {
    mockQuery = { isLoading: true, isFetching: true };
    const t = render();
    expect(charts(t)).toHaveLength(0);
    expect(texts(t)).not.toContain('No energy data for this period');
  });

  it('error with nothing cached: friendly copy, retry — never the raw message', () => {
    mockQuery = { error: { message: 'Request failed with status code 500', response: { status: 500 } } };
    const t = render();
    const all = texts(t);
    expect(all).toContain("Our servers aren't responding");
    expect(all.join(' ')).not.toMatch(/status code|500/);
  });

  it('empty period (all null) → empty state, no hero', () => {
    mockQuery = { data: { data: [{ time: day(1), ed_solar: null }] } };
    const t = render();
    expect(texts(t)).toContain('No energy data for this period');
    expect(charts(t)).toHaveLength(0);
  });

  it('an all-zero day keeps its bar and gets the outage caption', () => {
    const rows = solarRows(5);
    rows[2] = { time: day(3), ed_solar: 0 };
    mockQuery = { data: { data: rows } };
    const t = render();
    expect(texts(t)).toContain('1 day with no production');
    const option = charts(t)[0].props.option as { xAxis: { data: string[] } };
    expect(option.xAxis.data).toHaveLength(5);
  });

  it('period pills: radio group; re-tapping the active pill opens its picker', () => {
    mockQuery = { data: { data: solarRows(3) } };
    const t = render();
    const group = t.root.find(
      n => n.props.accessibilityRole === 'radiogroup' && typeof n.type === 'string',
    );
    expect(group.props.accessibilityLabel).toBe('Date range type');
    expect(texts(t)).not.toContain('Date range');
    const custom = t.root.find(
      n => n.props.accessibilityLabel === 'Custom' && n.props.accessibilityRole === 'radio' && typeof n.type !== 'string' && n.props.onPress,
    );
    act(() => custom.props.onPress());
    expect(texts(t)).toContain('Date range');
  });

  it('the selected period survives an unmount / remount (tab switch)', () => {
    mockQuery = { data: { data: solarRows(3) } };
    let t = render();
    const month = t.root.find(
      n => n.props.accessibilityLabel === 'Month' && n.props.accessibilityRole === 'radio' && typeof n.type !== 'string' && n.props.onPress,
    );
    act(() => month.props.onPress());
    act(() => t.unmount());
    tree = undefined;
    t = render();
    const monthAgain = t.root.find(
      n => n.props.accessibilityLabel === 'Month' && n.props.accessibilityRole === 'radio' && typeof n.type !== 'string' && n.props.accessibilityState,
    );
    expect(monthAgain.props.accessibilityState.selected).toBe(true);
  });
});

describe('ChartFullscreenModal — rotated canvas uses the real safe area', () => {
  // The modal measures insets with its OWN SafeAreaProvider; the jest mock
  // provider always reports zeros, so the hook is stubbed per test.
  afterEach(() => {
    (useSafeAreaInsets as jest.Mock).mockImplementation(() => ({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    }));
  });
  const renderModal = (top: number, bottom: number) => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top, bottom, left: 0, right: 0 });
    act(() => {
      tree = renderer.create(
        <ChartFullscreenModal
          visible
          onClose={() => {}}
          title="Energy over time"
          option={{}}
          summary="Energy over time, 1 to 30 Sep 2026, 30 days."
        />,
      );
    });
    return tree as ReactTestRenderer;
  };
  const canvas = (t: ReactTestRenderer) =>
    t.root.find(
      n =>
        typeof n.type === 'string' &&
        (StyleSheet.flatten(n.props.style)?.transform as object[] | undefined)?.some(
          tr => (tr as { rotate?: string }).rotate === '90deg',
        ) === true,
    );

  it('pads the device-top side by the Dynamic Island inset and the home-indicator side by its inset', () => {
    const style = StyleSheet.flatten(canvas(renderModal(62, 34)).props.style);
    expect(style.paddingLeft).toBe(62); // content left = device top
    expect(style.paddingRight).toBe(34); // content right = device bottom
    expect(style.paddingTop).toBe(12);
    expect(style.paddingBottom).toBe(12);
  });

  it('never leaves a fixed 40pt band on a device without top/bottom insets', () => {
    const style = StyleSheet.flatten(canvas(renderModal(0, 0)).props.style);
    expect(style.paddingLeft).toBe(12);
    expect(style.paddingRight).toBe(12);
  });

  it('Export (icon + label) and Close are ≥ touch.min; the chart is one labelled image', () => {
    const t = renderModal(62, 34);
    for (const label of ['Export chart as image', 'Close full screen']) {
      const btn = t.root.find(
        n => n.props.accessibilityLabel === label && typeof n.type !== 'string' && n.props.style,
      );
      expect(StyleSheet.flatten(btn.props.style).minHeight).toBeGreaterThanOrEqual(touch.min);
    }
    expect(texts(t)).toContain('Export');
    const img = t.root.find(
      n => n.props.accessibilityRole === 'image' && typeof n.type === 'string',
    );
    expect(img.props.accessibilityLabel).toMatch(/^Energy over time/);
    expect(charts(t)).toHaveLength(1);
  });
});
