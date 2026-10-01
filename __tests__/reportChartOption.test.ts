/**
 * Performance Report "Energy over time" echarts option
 * (PerformanceReport/echartsReportOption.ts).
 *
 * The tooltip formatter is a JS SOURCE STRING evaluated inside the
 * echarts-pro WebView — `evalLikeWebView` mirrors the library's
 * `parseStringFunction` exactly (first '(' … ')' = args, first '{' … last
 * '}' = body, NEWLINES STRIPPED), so a formatter that only works with
 * newlines intact fails here too.
 */
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EnergyReportRow } from '../src/networking';
import { buildStackData } from '../src/utils/aggregations';
import {
  buildReportStackBarOption,
  estimateLegendRows,
  INLINE_SLIDER_MAX_CATEGORIES,
  legendHeight,
  ReportChartTheme,
  reportTooltipFormatter,
} from '../src/components/screens/Authenticated/SiteDetail/components/PerformanceReport/echartsReportOption';

const COMPONENTS = join(
  __dirname,
  '../src/components/screens/Authenticated/SiteDetail/components',
);

/** react-native-echarts-pro `parseStringFunction`, reproduced. */
const evalLikeWebView = (src: string): ((...a: unknown[]) => string) => {
  const args = src.substring(src.indexOf('(') + 1, src.indexOf(')'));
  const body = src.substring(src.indexOf('{') + 1, src.lastIndexOf('}')).replace(/\n/g, '');
  // eslint-disable-next-line no-new-func
  return new Function(args, body) as (...a: unknown[]) => string;
};

const THEME: ReportChartTheme = {
  textPrimary: 'rgb(1,1,1)',
  textSecondary: 'rgb(2,2,2)',
  textTertiary: 'rgb(3,3,3)',
  border: 'rgb(4,4,4)',
  surface: 'rgb(5,5,5)',
  brand: 'rgb(16,185,129)',
  brandSoft: 'rgba(16,185,129,0.12)',
  isDark: true,
};

const day = (d: number) => new Date(2026, 8, d).getTime();

const rows = (n: number, f: (i: number) => Partial<EnergyReportRow>): EnergyReportRow[] =>
  Array.from({ length: n }, (_, i) => ({ time: day(1 + i), ...f(i) }) as EnergyReportRow);

type AnyOption = Record<string, any>;
const build = (r: EnergyReportRow[], detailed = false, width = 311) =>
  buildReportStackBarOption(buildStackData(r, 'Custom'), THEME, { width, detailed }) as AnyOption;

describe('buildReportStackBarOption — scale & axis', () => {
  it.each<[number, string, number]>([
    [850, 'kWh', 1],
    [16875, 'MWh', 1000],
    [5_902_224.1, 'GWh', 1_000_000],
  ])('max bucket %p kWh → y-axis named %p, values ÷ %p', (max, unit, divisor) => {
    const opt = build(rows(3, i => ({ ed_solar: i === 1 ? max : max / 2 })));
    expect(opt.yAxis.name).toBe(unit);
    expect(opt.series[0].data[1]).toBeCloseTo(max / divisor, 9);
  });

  it('has no forced min/max (echarts picks nice ticks; negatives allowed)', () => {
    const opt = build(rows(2, () => ({ ed_solar: 21000 })));
    expect(opt.yAxis.max).toBeUndefined();
    expect(opt.yAxis.min).toBeUndefined();
  });

  it('keeps every bucket: null → gap, 0 and negatives kept', () => {
    const opt = build([
      { time: day(1), ed_solar: 800, ed_grid: -400 },
      { time: day(2), ed_solar: 0, ed_grid: 0 },
      { time: day(3), ed_solar: null, ed_grid: null },
    ]);
    expect(opt.xAxis.data).toEqual(['1 Sep', '2 Sep', '3 Sep']);
    const [solar, grid] = opt.series;
    expect(opt.yAxis.name).toBe('kWh');
    expect(solar.data).toEqual([800, 0, null]);
    expect(grid.data).toEqual([-400, 0, null]);
    expect(opt.series.every((s: AnyOption) => s.type === 'bar' && s.stack === 'total')).toBe(true);
  });

  it('series ids are source tokens and updates replace series/dataZoom lists', () => {
    const opt = build(rows(2, () => ({ ed_solar: 1, ed_wind: 2 })));
    expect(opt.series.map((s: AnyOption) => s.id)).toEqual(['solar', 'wind']);
    expect(opt.optionSetting).toEqual({ replaceMerge: ['series', 'dataZoom'] });
  });
});

describe('buildReportStackBarOption — legend', () => {
  it('is hidden for a single series', () => {
    const opt = build(rows(3, () => ({ ed_solar: 5 })));
    expect(opt.legend.show).toBe(false);
    expect(opt.legend.type).toBe('plain');
  });

  it('is a wrapping plain legend for 2+ series, with the plot pushed below it', () => {
    const r = rows(3, () => ({ ed_solar: 5, ed_wind: 5, ed_grid: 5, ed_genset: 5, hi_bess: 5 }));
    const narrow = build(r, false, 200);
    const wide = build(r, false, 900);
    expect(narrow.legend.show).toBe(true);
    expect(narrow.legend.type).toBe('plain');
    expect(narrow.grid.top).toBeGreaterThan(wide.grid.top);
    expect(wide.grid.top).toBe(legendHeight(1) + 22);
  });

  it('estimateLegendRows packs greedily and never returns < 1', () => {
    expect(estimateLegendRows([], 300)).toBe(1);
    expect(estimateLegendRows(['Solar', 'Wind'], 300)).toBe(1);
    expect(estimateLegendRows(['Solar', 'Wind', 'Grid', 'Genset', 'Battery'], 200)).toBeGreaterThan(1);
    expect(legendHeight(2)).toBeGreaterThan(legendHeight(1));
  });
});

describe('buildReportStackBarOption — zoom', () => {
  it('inline: inside zoom only up to 40 buckets, slider beyond', () => {
    const small = build(rows(31, () => ({ ed_solar: 1 })));
    expect(small.dataZoom.map((z: AnyOption) => z.type)).toEqual(['inside']);
    const big = build(rows(INLINE_SLIDER_MAX_CATEGORIES + 1, () => ({ ed_solar: 1 })));
    expect(big.dataZoom.map((z: AnyOption) => z.type)).toEqual(['inside', 'slider']);
  });

  it('fullscreen (detailed) always has the slider, coloured from the theme', () => {
    const opt = build(rows(5, () => ({ ed_solar: 1 })), true);
    const slider = opt.dataZoom.find((z: AnyOption) => z.type === 'slider');
    expect(slider.fillerColor).toBe(THEME.brandSoft);
    expect(slider.handleStyle.color).toBe(THEME.brand);
    expect(opt.dataZoom.every((z: AnyOption) => z.start === 0 && z.end === 100)).toBe(true);
  });

  it('the option source contains no colour literals', () => {
    const src = readFileSync(join(COMPONENTS, 'PerformanceReport/echartsReportOption.ts'), 'utf8');
    expect(src).not.toMatch(/#/);
    expect(src).not.toMatch(/rgba?\(/);
  });
});

describe('reportTooltipFormatter (string fn, eval’d like the WebView)', () => {
  const fmt = evalLikeWebView(reportTooltipFormatter(['1 Sep 2026', '2 Sep 2026'], 'MWh'));
  const p = (seriesName: string, value: unknown, dataIndex = 0) => ({
    seriesName,
    value,
    dataIndex,
    marker: '<i></i>',
    axisValueLabel: 'axis',
  });

  it('header is the full bucket name for the hovered index', () => {
    expect(fmt([p('Solar', 16.87, 1)])).toContain('>2 Sep 2026</div>');
  });

  it('values: 3 significant digits + unit; null → —', () => {
    const html = fmt([p('Solar', 16.87), p('Wind', null)]);
    expect(html).toContain('<b style="margin-left:10px">16.9 MWh</b>');
    expect(html).toContain('<b style="margin-left:10px">—</b>');
    expect(fmt([p('Solar', 0.1234)])).toContain('0.123 MWh');
    expect(fmt([p('Solar', 0)])).toContain('>0 MWh<');
    expect(fmt([p('Solar', -2.5)])).toContain('-2.5 MWh');
  });

  it('adds a Total row only when stacked', () => {
    expect(fmt([p('Solar', 1)])).not.toContain('Total');
    const html = fmt([p('Solar', 10.04), p('Grid', -0.04)]);
    expect(html).toContain('Total');
    expect(html).toContain('>10 MWh<');
  });

  it('is safe for empty params', () => {
    expect(fmt([])).toBe('');
  });
});

describe('Reports tab strings (one view per fact, no cryptic glyphs)', () => {
  const card = readFileSync(join(COMPONENTS, 'PerformanceReportCard.tsx'), 'utf8');
  const row = readFileSync(join(COMPONENTS, 'PerformanceReport/SourceRow.tsx'), 'utf8');

  it('has no donut, Σ chip, TOP · line, slice hint, LIVE badge or uppercased backend labels', () => {
    for (const src of [card, row]) {
      expect(src).not.toMatch(/Σ|TOP ·|Tap a slice|LIVE ·|PulseDot|toUpperCase|KWH|formatCompactLocal/);
      expect(src).not.toMatch(/buildReportPieOption|dispatchAction/);
    }
    // Exactly one chart WebView host in the card.
    expect(card.match(/<RNEChartsPro\b/g)).toHaveLength(1);
  });
});
