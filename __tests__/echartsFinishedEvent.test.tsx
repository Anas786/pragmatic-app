/**
 * The full-screen chart's first-paint signal, end to end, through the REAL
 * patched react-native-echarts-pro (patches/react-native-echarts-pro+1.9.3.patch)
 * and the REAL echarts it ships (5.4.2, evaluated here and rendered
 * server-side — no WebView):
 *
 *   ChartFullscreenModal's `eventActions={{ finished }}`
 *   → the library writes `["finished"]` into its injected script, which
 *     subscribes BEFORE the first `myChart.setOption`
 *   → echarts' first finished render posts `{"type":"finished"}`
 *   → the library's `onMessage` routes it to `eventActions.finished`.
 *
 * And it is posted ONCE: echarts fires `finished` after EVERY render once
 * animations are idle (each tooltip move / dataZoom drag frame), which
 * would otherwise cross the bridge ~60×/s while the chart is touched.
 *
 * `chartFullscreenPaint.test.tsx` mocks the library to test the modal's
 * watchdog; this file is what proves `finished` actually arrives, so the
 * watchdog's 45 s remount stays a last resort and never the normal path.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import RNEChartsPro from 'react-native-echarts-pro';

const renderChart = require('react-native-echarts-pro/src/components/Echarts/renderChart')
  .default as (props: Record<string, unknown>) => string;

/* ─────────── the shipped echarts, server-side ─────────── */

interface EChartsInstance {
  setOption: (option: object) => void;
  on: (event: string, handler: () => void) => void;
  getZr: () => { refresh: () => void; flush: () => void };
  dispose: () => void;
}
interface ECharts {
  version: string;
  registerMap: (name: string, json: object) => void;
  init: (
    dom: null,
    theme: null,
    opts: { renderer: 'svg'; ssr: true; width: number; height: number },
  ) => EChartsInstance;
}

const loadShippedEcharts = (): ECharts => {
  const file = path.join(
    __dirname,
    '../node_modules/react-native-echarts-pro/src/components/Echarts/echarts.min.js',
  );
  const literal = fs
    .readFileSync(file, 'utf8')
    .replace(/^export default /, '')
    .replace(/;?\s*$/, '');
  // eslint-disable-next-line no-new-func
  const src = new Function(`return ${literal}`)() as string;
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  // `navigator` shadowed: Node ≥ 21 defines one (echarts would probe a DOM).
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'define', 'navigator', src)(
    mod,
    mod.exports,
    undefined,
    undefined,
  );
  return mod.exports as unknown as ECharts;
};
const echarts = loadShippedEcharts();

// zrender's frame loop runs on requestAnimationFrame; let queued frames drain.
afterAll(() => new Promise<void>(resolve => setTimeout(resolve, 100)));

/** A small chart like the app's (no intro animation, as in full screen). */
const OPTION = {
  animation: false,
  xAxis: { type: 'category', data: ['00:00', '00:01', '00:02'] },
  yAxis: { type: 'value' },
  series: [{ type: 'line', data: [1, 2, 3] }],
};

/**
 * Runs a library-injected script the way the WebView page does, against
 * the real echarts (`echarts.init` → a server-side SVG instance). Every
 * `window.ReactNativeWebView.postMessage` goes to `post`.
 */
const runInjected = (script: string, post: (data: string) => void): EChartsInstance => {
  const container = { style: {} as Record<string, string> };
  const fakeDocument = {
    getElementById: () => container,
    addEventListener: () => undefined,
  };
  const fakeWindow = {
    document: fakeDocument,
    addEventListener: () => undefined,
    ReactNativeWebView: { postMessage: post },
  };
  let chart: EChartsInstance | undefined;
  const page = {
    registerMap: (name: string, json: object) => echarts.registerMap(name, json),
    init: () => {
      chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 360, height: 300 });
      return chart;
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('document', 'window', 'echarts', script)(fakeDocument, fakeWindow, page);
  if (!chart) throw new Error('the injected script never created the chart');
  return chart;
};

/**
 * One animation frame of the page. zrender paints — and echarts fires
 * `rendered`, then `finished` when nothing is animating — from its frame
 * loop's `flush()`; server-side that loop doesn't tick by itself, so the
 * test runs the frame.
 */
const frame = (chart: EChartsInstance) => chart.getZr().flush();

/** Repaints like a tooltip move / dataZoom drag frame / option update. */
const repaint = (chart: EChartsInstance) => {
  chart.getZr().refresh();
  frame(chart);
  chart.setOption({ series: [{ data: [3, 2, 1] }] });
  frame(chart);
};

describe('patched renderChart — subscribed events', () => {
  it('subscribes the event list BEFORE the first setOption', () => {
    const script = renderChart({ option: OPTION, eventArrays: ['finished'], height: 300 });
    const subscribe = script.indexOf('for(let temp of ["finished"])');
    const firstSetOption = script.indexOf('myChart.setOption(option)');
    expect(subscribe).toBeGreaterThan(-1);
    expect(firstSetOption).toBeGreaterThan(subscribe);
  });

  it('posts `finished` once — the first finished render — though echarts fires it on every repaint', () => {
    expect(echarts.version).toBe('5.4.2');
    const posted: string[] = [];
    const chart = runInjected(
      renderChart({
        option: OPTION,
        eventArrays: ['finished'],
        height: 300,
        width: 360,
        enableParseStringFunction: true,
        backgroundColor: 'transparent',
      }),
      data => posted.push(data),
    );
    const finishedPosts = () => posted.filter(d => JSON.parse(d).type === 'finished');
    expect(finishedPosts()).toEqual([]); // nothing painted yet
    frame(chart);
    expect(finishedPosts()).toEqual([JSON.stringify({ type: 'finished' })]);

    // echarts itself keeps firing it on every idle render…
    let echartsFinished = 0;
    chart.on('finished', () => {
      echartsFinished += 1;
    });
    repaint(chart);
    repaint(chart);
    expect(echartsFinished).toBeGreaterThanOrEqual(4);
    // …but only the first one crossed the bridge.
    expect(finishedPosts()).toHaveLength(1);
    chart.dispose();
  });

  it('other subscribed events are untouched (posted every time)', () => {
    const posted: string[] = [];
    const chart = runInjected(
      renderChart({ option: OPTION, eventArrays: ['rendered'], height: 300, width: 360 }),
      data => posted.push(data),
    );
    frame(chart);
    const before = posted.filter(d => JSON.parse(d).type === 'rendered').length;
    expect(before).toBe(1);
    repaint(chart);
    expect(posted.filter(d => JSON.parse(d).type === 'rendered').length).toBeGreaterThan(before);
    chart.dispose();
  });
});

describe('RNEChartsPro → eventActions.finished (the real component)', () => {
  // jest.setup.js's WebView stand-in is a plain function component, so the
  // library's `ref={eChartRef}` on it logs a dev warning — test-only noise.
  const consoleError = console.error;
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation((message: unknown, ...rest: unknown[]) => {
      if (String(message).includes('Function components cannot be given refs')) return;
      consoleError(message, ...rest);
    });
  });
  afterEach(() => {
    jest.mocked(console.error).mockRestore();
  });

  it("routes the page's first `finished` to eventActions.finished, exactly once", () => {
    const finished = jest.fn();
    const eventActions = { finished };
    let tree: ReactTestRenderer | undefined;
    act(() => {
      tree = renderer.create(
        <RNEChartsPro
          height={300}
          width={360}
          option={OPTION}
          backgroundColor="transparent"
          enableParseStringFunction
          eventActions={eventActions}
        />,
      );
    });
    const t = tree as ReactTestRenderer;
    // react-native-webview is a plain View in Jest (jest.setup.js).
    const webView = t.root.find(
      n => typeof n.type !== 'string' && typeof n.props.injectedJavaScript === 'string',
    );
    const script = webView.props.injectedJavaScript as string;
    expect(script).toContain('for(let temp of ["finished"])');

    const chart = runInjected(script, data =>
      act(() => webView.props.onMessage({ nativeEvent: { data } })),
    );
    expect(finished).not.toHaveBeenCalled(); // nothing painted yet
    frame(chart);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(finished).toHaveBeenCalledWith({ type: 'finished' });

    repaint(chart);
    repaint(chart);
    expect(finished).toHaveBeenCalledTimes(1);

    // A re-render with the same (stable) event map doesn't rebuild the script.
    act(() => {
      t.update(
        <RNEChartsPro
          height={300}
          width={360}
          option={OPTION}
          backgroundColor="transparent"
          enableParseStringFunction
          eventActions={eventActions}
        />,
      );
    });
    const again = t.root.find(
      n => typeof n.type !== 'string' && typeof n.props.injectedJavaScript === 'string',
    );
    expect(again.props.injectedJavaScript).toBe(script);

    chart.dispose();
    act(() => t.unmount());
  });
});
