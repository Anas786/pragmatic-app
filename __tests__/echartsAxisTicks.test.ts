/**
 * Y-axis labels under the REAL echarts the app ships (react-native-echarts-pro
 * bundles echarts 5.4.2 as a string; it is evaluated here and rendered
 * server-side, no WebView) — for charts that plot a device's garbage
 * readings at their true size (1e16 … 1e36, e.g. Lucky Cement's
 * "Wind Energy Day" ≈ -1.2e35).
 *
 * 1. No made-up axis label. echarts 5.4.2 adds the tick interval step by
 *    step; past ~2^53 the steps aren't exact, so the tick where 0 belongs
 *    comes out as float noise (-562949953421312, -1.15e18, -8.59e9 …).
 *    `Y_AXIS_LABEL_FORMATTER` prints it as '0', never as "-563T" — and a
 *    legend tap that hides the garbage (axis rescales) never turns real
 *    small ticks into '0'.
 * 2. Trends dual axis: two axes only while nothing is negative (both zeros
 *    on the plot bottom); with a negative reading every series shares the
 *    left axis and the right one is hidden, so no line is read against a
 *    baseline that isn't its own.
 *
 * Formatter strings are turned into functions exactly the way the library
 * does it in the WebView (`parseStringFunction`: args + body, newlines
 * stripped), so this also proves they survive that parse.
 */
import { afterAll, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  COMPACT_VALUE_FN_SRC,
  Y_AXIS_LABEL_FORMATTER,
} from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';
import { buildTrendComboOption } from '../src/components/screens/Authenticated/SiteDetail/components/Trends/echartsOption';
import { buildReportStackBarOption } from '../src/components/screens/Authenticated/SiteDetail/components/PerformanceReport/echartsReportOption';
import { buildStackData } from '../src/utils/aggregations';
import { TrendAggregation, TrendDataRow } from '../src/types';

/* ─────────── the shipped echarts, server-side ─────────── */

interface EChartsAxis {
  getViewLabels: () => { formattedLabel: string }[];
  dataToCoord: (v: number) => number;
  scale: { getExtent: () => [number, number] };
  model: { get: (key: string) => unknown };
}
interface EChartsInstance {
  setOption: (option: object) => void;
  dispatchAction: (action: object) => void;
  getModel: () => {
    getComponent: (type: string, index: number) => { axis: EChartsAxis } | undefined;
  };
  dispose: () => void;
}
interface ECharts {
  version: string;
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
  // The file is `export default \`<echarts UMD source>\`` — evaluate the
  // template literal to get the source text back.
  const literal = fs
    .readFileSync(file, 'utf8')
    .replace(/^export default /, '')
    .replace(/;?\s*$/, '');
  // eslint-disable-next-line no-new-func
  const src = new Function(`return ${literal}`)() as string;
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  // `navigator` shadowed: Node ≥ 21 defines one, which would make echarts
  // probe for a browser DOM instead of running server-side.
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

// zrender's frame loop runs on requestAnimationFrame (RN's jest setup maps
// it to setTimeout); a disposed chart still has one frame queued — let it
// drain before the environment is torn down.
afterAll(() => new Promise<void>(resolve => setTimeout(resolve, 100)));

/** react-native-echarts-pro `parseStringFunction`, verbatim semantics. */
const parseLikeWebView = (obj: Record<string, unknown>): void => {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value && typeof value === 'object') {
      parseLikeWebView(value as Record<string, unknown>);
    } else if (typeof value === 'string' && value.startsWith('function')) {
      const args = value.substring(value.indexOf('(') + 1, value.indexOf(')'));
      const body = value
        .substring(value.indexOf('{') + 1, value.lastIndexOf('}'))
        .replace(/\n/g, '');
      // eslint-disable-next-line no-new-func
      obj[key] = new Function(args, body);
    }
  }
};

const W = 360;
const H = 300;

const render = (option: object): EChartsInstance => {
  const parsed = JSON.parse(JSON.stringify(option)) as Record<string, unknown>;
  parseLikeWebView(parsed);
  const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: W, height: H });
  chart.setOption(parsed);
  return chart;
};

const yAxisOf = (chart: EChartsInstance, index = 0): EChartsAxis => {
  const component = chart.getModel().getComponent('yAxis', index);
  if (!component) throw new Error(`no yAxis ${index}`);
  return component.axis;
};
const yLabels = (chart: EChartsInstance, index = 0): string[] =>
  yAxisOf(chart, index).getViewLabels().map(l => l.formattedLabel);

const SUFFIX: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };
const magnitude = (label: string): number => {
  const mult = SUFFIX[label.slice(-1)] ?? 1;
  return Math.abs(parseFloat(mult === 1 ? label : label.slice(0, -1)) * mult);
};
/** Labels no real tick could have: non-zero yet a vanishing fraction of
 *  the axis' largest label (real ticks are interval multiples). */
const noiseLabels = (labels: string[]): string[] => {
  const max = Math.max(...labels.map(magnitude));
  return labels.filter(l => l !== '0' && magnitude(l) < max * 1e-6);
};

/** A single-series bar chart whose y-axis uses `formatter`. */
const barOption = (data: number[], formatter: string): object => ({
  grid: { containLabel: true },
  xAxis: { type: 'category', data: data.map((_, i) => `c${i}`) },
  yAxis: { type: 'value', axisLabel: { formatter } },
  series: [{ type: 'bar', data }],
});

// What the axis printed before: the compact formatter with no noise guard.
const UNGUARDED_FORMATTER = `function(v){${COMPACT_VALUE_FN_SRC} return __fmtCompactVal(v);}`;

const THEME = {
  textPrimary: 'tok-textPrimary',
  textSecondary: 'tok-textSecondary',
  textTertiary: 'tok-textTertiary',
  border: 'tok-border',
  surface: 'tok-surface',
  brand: 'tok-brand',
  brandSoft: 'tok-brandSoft',
  isDark: false,
};
const named = (display: string, type: TrendAggregation['type']): TrendAggregation => ({
  param: display,
  type,
  color: '#123456',
  display,
});

describe('the shipped echarts', () => {
  it('is the 5.4.2 bundle the WebView loads', () => {
    expect(echarts.version).toBe('5.4.2');
  });
});

describe('Y_AXIS_LABEL_FORMATTER under real echarts ticks', () => {
  it('prints 0 — never a made-up value — where float noise stands in for 0', () => {
    // The reviewer-measured cases: before, these printed -563T / -1.15e18.
    const cases: [number[], string][] = [
      [[-1.1e31, 41000, 63000, 5], '-563T'],
      [[-1.3e34, 41000, 63000, 5], '-1.15e18'],
    ];
    for (const [data, madeUp] of cases) {
      const before = render(barOption(data, UNGUARDED_FORMATTER));
      expect(yLabels(before)).toContain(madeUp);
      before.dispose();

      const chart = render(barOption(data, Y_AXIS_LABEL_FORMATTER));
      const labels = yLabels(chart);
      expect(labels).not.toContain(madeUp);
      expect(labels).toContain('0');
      expect(noiseLabels(labels)).toEqual([]);
      chart.dispose();
    }
  });

  it('never prints a noise label across garbage magnitudes 1e16 … 1e36, either sign', () => {
    let unguardedNoise = 0;
    for (let exp = 16; exp <= 36; exp++) {
      for (const mantissa of [1, 1.1, 1.3, 2.5, 4, 7.7, 9.9]) {
        for (const sign of [-1, 1]) {
          const data = [sign * mantissa * 10 ** exp, 41000, 63000, -5];
          const before = render(barOption(data, UNGUARDED_FORMATTER));
          unguardedNoise += noiseLabels(yLabels(before)).length;
          before.dispose();
          const chart = render(barOption(data, Y_AXIS_LABEL_FORMATTER));
          expect(noiseLabels(yLabels(chart))).toEqual([]);
          chart.dispose();
        }
      }
    }
    // the sweep really hits the echarts noise the guard exists for
    expect(unguardedNoise).toBeGreaterThan(10);
  });

  it('a legend tap that hides the garbage rescales to ordinary ticks, none snapped to 0', () => {
    const chart = render({
      grid: { containLabel: true },
      legend: { data: ['Wind', 'PV'] },
      xAxis: { type: 'category', data: ['a', 'b', 'c'] },
      yAxis: { type: 'value', axisLabel: { formatter: Y_AXIS_LABEL_FORMATTER } },
      series: [
        { name: 'Wind', type: 'bar', data: [-1.1e31, 4100, 6300] },
        { name: 'PV', type: 'bar', data: [41000, 63000, 52000] },
      ],
    });
    expect(yLabels(chart)).toContain('0');
    expect(noiseLabels(yLabels(chart))).toEqual([]);
    chart.dispatchAction({ type: 'legendUnSelect', name: 'Wind' });
    expect(yLabels(chart)).toEqual(['0', '10K', '20K', '30K', '40K', '50K', '60K', '70K']);
    chart.dispose();
  });
});

describe("Lucky Cement 'Customised Report' (Trends) under real echarts", () => {
  const lucky = [
    named('Wind Energy Day', 'bar'),
    named('PV Energy Day', 'bar'),
    named('Cost of Total Energy($)', 'line'),
  ];

  it('the -1.2e35 bar gets readable labels and the line shares its baseline', () => {
    const rows: TrendDataRow[] = [
      {
        time: 0,
        'Wind Energy Day': -1.2345678901234567e35,
        'PV Energy Day': 63000,
        'Cost of Total Energy($)': 1200,
      },
      { time: 1000, 'Wind Energy Day': 41000, 'PV Energy Day': 39000, 'Cost of Total Energy($)': 1500 },
      { time: 2000, 'Wind Energy Day': 39000, 'PV Energy Day': 52000, 'Cost of Total Energy($)': 1300 },
    ];
    for (const detailed of [false, true]) {
      const { option } = buildTrendComboOption(rows, lucky, 1000, THEME, { detailed });
      const chart = render(option);
      const labels = yLabels(chart);
      expect(labels[0]).toMatch(/^-1\.\d+e35$/);
      expect(noiseLabels(labels)).toEqual([]);
      // the bar axis extends below 0 to the true value (never clipped)
      expect(yAxisOf(chart).scale.getExtent()[0]).toBeLessThanOrEqual(-1.2345678901234567e35);
      // every series is on the left axis; the right one is hidden
      expect(yAxisOf(chart, 1).model.get('show')).toBe(false);
      expect((option as { series: { yAxisIndex: number }[] }).series.map(s => s.yAxisIndex)).toEqual([
        0, 0, 0,
      ]);
      chart.dispose();
    }
  });

  it('with nothing negative, both axes keep their zero on the same pixel (the plot bottom)', () => {
    const rows: TrendDataRow[] = [
      { time: 0, 'Wind Energy Day': 41000, 'PV Energy Day': 63000, 'Cost of Total Energy($)': 1200 },
      { time: 1000, 'Wind Energy Day': 39000, 'PV Energy Day': 52000, 'Cost of Total Energy($)': 1500 },
    ];
    const { option } = buildTrendComboOption(rows, lucky, 1000, THEME);
    const chart = render(option);
    expect(yAxisOf(chart, 1).model.get('show')).toBe(true);
    expect(yAxisOf(chart, 0).dataToCoord(0)).toBeCloseTo(yAxisOf(chart, 1).dataToCoord(0), 6);
    chart.dispose();
  });
});

describe('Performance Report "Energy over time" under real echarts', () => {
  it('a -1.2e35 kWh wind bucket (≈ -1.2e26 TWh) gets no made-up 0 label', () => {
    const day = (d: number) => new Date(2026, 8, d).getTime();
    const stack = buildStackData(
      [
        { time: day(1), ed_solar: 63000, ed_wind: 41000 },
        { time: day(2), ed_solar: 52000, ed_wind: -1.2e35 },
        { time: day(3), ed_solar: 61000, ed_wind: 39000 },
      ],
      'Custom',
    );
    const option = buildReportStackBarOption(stack, THEME, { width: W });
    const chart = render(option);
    const labels = yLabels(chart);
    expect(labels).not.toContain('-8.59B');
    expect(labels).toContain('0');
    expect(noiseLabels(labels)).toEqual([]);
    chart.dispose();
  });
});
