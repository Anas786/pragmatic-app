/**
 * ChartFullscreenModal — first-paint probe + one-shot WebView remount.
 *
 * Once (Android emulator, long-running process) the full-screen chart's
 * WebView was laid out, idle and never drew; close + reopen drew normally.
 * The modal now listens for echarts' `finished` event and, when none
 * arrives within FULLSCREEN_CHART_PAINT_TIMEOUT_MS, remounts the WebView
 * ONCE. The event map must be a stable reference: the library lists the
 * subscribed events in its injected script.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

const mockMounts: { count: number; eventActions: unknown[] } = { count: 0, eventActions: [] };

jest.mock('react-native-echarts-pro', () => {
  const R = require('react');
  const { View: RNView } = require('react-native');
  const Chart = R.forwardRef((props: { eventActions?: unknown }, _ref: unknown) => {
    R.useEffect(() => {
      mockMounts.count += 1;
    }, []);
    mockMounts.eventActions.push(props.eventActions);
    return R.createElement(RNView, { ...props, testID: 'echart' });
  });
  return { __esModule: true, default: Chart };
});

const mockDisplay = jest.fn();
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  display: (...args: unknown[]) => mockDisplay(...args),
  log: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}));

import ChartFullscreenModal, {
  FULLSCREEN_CHART_PAINT_TIMEOUT_MS,
} from '../src/components/screens/Authenticated/SiteDetail/components/ChartFullscreenModal';

let tree: ReactTestRenderer | undefined;

const open = (title = 'Energy') => {
  act(() => {
    tree = renderer.create(
      <ChartFullscreenModal visible onClose={() => {}} title={title} option={{}} />,
    );
  });
  const t = tree as ReactTestRenderer;
  // The chart mounts once the title row reports its height.
  const header = t.root.find(n => typeof n.type === 'string' && typeof n.props.onLayout === 'function');
  act(() => header.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 600, height: 54 } } }));
  return t;
};
const chart = (t: ReactTestRenderer) =>
  t.root.find(n => n.props.testID === 'echart' && typeof n.type !== 'string');
const finish = (t: ReactTestRenderer) =>
  act(() => (chart(t).props.eventActions as { finished: () => void }).finished());

beforeEach(() => {
  jest.useFakeTimers();
  mockMounts.count = 0;
  mockMounts.eventActions = [];
  mockDisplay.mockClear();
});
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  jest.useRealTimers();
});

describe('ChartFullscreenModal — first paint', () => {
  it('logs the first paint once and never remounts a chart that painted', () => {
    const t = open();
    expect(mockMounts.count).toBe(1);
    act(() => jest.advanceTimersByTime(1200));
    finish(t);
    finish(t); // a repeat (the patched library posts only the first) is ignored
    const paints = mockDisplay.mock.calls.filter(c => c[0] === 'chart fullscreen paint');
    expect(paints).toHaveLength(1);
    expect((paints[0][1] as { ms: number }).ms).toBeGreaterThanOrEqual(1200);
    act(() => jest.advanceTimersByTime(FULLSCREEN_CHART_PAINT_TIMEOUT_MS * 2));
    expect(mockMounts.count).toBe(1);
  });

  it('remounts the WebView once when no paint arrives in time — never in a loop', () => {
    const t = open();
    act(() => jest.advanceTimersByTime(FULLSCREEN_CHART_PAINT_TIMEOUT_MS - 1));
    expect(mockMounts.count).toBe(1);
    act(() => jest.advanceTimersByTime(1));
    expect(mockMounts.count).toBe(2);
    expect(mockDisplay.mock.calls.some(c => String(c[0]).includes('stalled'))).toBe(true);
    act(() => jest.advanceTimersByTime(FULLSCREEN_CHART_PAINT_TIMEOUT_MS * 3));
    expect(mockMounts.count).toBe(2);
    // The retry's paint is still measured.
    finish(t);
    expect(mockDisplay.mock.calls.filter(c => c[0] === 'chart fullscreen paint')).toHaveLength(1);
  });

  it('hands the library ONE stable event map (its injected script lists the events)', () => {
    const t = open();
    act(() =>
      t.update(<ChartFullscreenModal visible onClose={() => {}} title="Energy" option={{ a: 1 }} />),
    );
    const maps = new Set(mockMounts.eventActions);
    expect(maps.size).toBe(1);
    expect(Object.keys(mockMounts.eventActions[0] as object)).toEqual(['finished']);
  });

  it('a closed modal arms no timer', () => {
    act(() => {
      tree = renderer.create(
        <ChartFullscreenModal visible={false} onClose={() => {}} title="Energy" option={{}} />,
      );
    });
    act(() => jest.advanceTimersByTime(FULLSCREEN_CHART_PAINT_TIMEOUT_MS * 2));
    expect(mockMounts.count).toBe(0);
    expect(mockDisplay).not.toHaveBeenCalled();
  });
});
