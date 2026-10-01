/**
 * `Y_AXIS_LABEL_FORMATTER` / `COMPACT_VALUE_FN_SRC` (`src/.../chartConfig.ts`)
 * — the shared compact-number formatter for the Trends and Performance
 * Report echarts axis labels, plus the Trends tooltip which splices in the
 * same source.
 *
 * These are JS SOURCE STRINGS (react-native-echarts-pro evaluates
 * `formatter` inside a WebView via `enableParseStringFunction`, so there's
 * no real function to import) — evaluated here the same way the WebView
 * would, via `new Function('return ' + src)()`.
 *
 * Regression coverage for the bug this replaces: the old formatter divided
 * by 1e6 and appended "M" unconditionally, so a value like 4e31 printed as
 * raw float/exponent noise — `"4.999999999999999e+25M"` — instead of a
 * sane compact string.
 */
import { describe, expect, it } from '@jest/globals';
import { buildTrendComboOption } from '../src/components/screens/Authenticated/SiteDetail/components/Trends/echartsOption';
import { Y_AXIS_LABEL_FORMATTER } from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';

// These formatters are JS SOURCE STRINGS meant to be eval'd inside the
// echarts-pro WebView (`enableParseStringFunction`); mirror that
// evaluation here instead of duplicating the formatter logic.
const evalFormatter = (src: string): ((v: unknown) => string) => {
  // eslint-disable-next-line no-new-func
  return new Function('return ' + src)() as (v: unknown) => string;
};

const THEME = {
  textPrimary: '#000000',
  textSecondary: '#000000',
  textTertiary: '#000000',
  border: '#000000',
  surface: '#ffffff',
  brand: '#10b981',
  brandSoft: 'rgba(16, 185, 129, 0.10)',
  isDark: false,
};

describe('Y_AXIS_LABEL_FORMATTER (compact axis-tick formatter)', () => {
  const fmt = evalFormatter(Y_AXIS_LABEL_FORMATTER);

  it('keeps sub-1 ticks distinct (3 significant digits, not 2 fixed decimals)', () => {
    // Regression: 2-decimal rounding turned a 0–0.004 axis into "0,0,0,0,0".
    const ticks = [0.001, 0.002, 0.003, 0.004].map(fmt);
    expect(ticks).toEqual(['0.001', '0.002', '0.003', '0.004']);
    expect(new Set(ticks).size).toBe(4);
    expect(fmt(0.125)).toBe('0.125');
    expect(fmt(0.0045)).toBe('0.0045');
    expect(fmt(0.1 + 0.2)).toBe('0.3'); // float noise still stripped
    expect(fmt(-0.004)).toBe('-0.004');
  });

  it.each<[number, string]>([
    [0, '0'],
    [0.5, '0.5'],
    [12.345, '12.35'],
    [999, '999'],
    [1000, '1K'],
    [1500, '1.5K'],
    [999999, '1M'],
    [1e6, '1M'],
    [2.5e9, '2.5B'],
    [4.2e12, '4.2T'],
    [3.9999999999999995e31, '4e31'],
    [-1500, '-1.5K'],
    [NaN, ''],
  ])('formats %p as %p', (input, expected) => {
    expect(fmt(input)).toBe(expected);
  });

  it('handles the reported bogus trend values without exponent/float noise', () => {
    // The values from the user's "COMBINED" chart screenshot (the old
    // formatter printed these as e.g. "4.999999999999999e+25M").
    expect(fmt(4.999999999999999e25)).toBe('5e25');
    expect(fmt(3.9999999999999995e25)).toBe('4e25');
    expect(fmt(3e25)).toBe('3e25');
    expect(fmt(1.9999999999999998e25)).toBe('2e25');
    expect(fmt(9.999999999999999e24)).toBe('1e25');
    expect(fmt(0)).toBe('0');
  });

  it('never produces the old "e+NNM" / raw-exponent shape', () => {
    for (const v of [4.999999999999999e25, 3e25, 3.9999999999999995e31, 1.2e28]) {
      expect(fmt(v)).not.toMatch(/e\+/);
      expect(fmt(v)).not.toMatch(/\d+\.\d{3,}/); // no multi-decimal float noise
    }
  });

  it('is non-finite-safe and finite for Infinity', () => {
    expect(fmt(Infinity)).toBe('');
    expect(fmt(-Infinity)).toBe('');
  });

  it('labels the axis readably when a device reading is plotted at its true size', () => {
    // Lucky Cement 'Customised Report' (web Analysis chart, 2026-10-01):
    // the y-axis runs from 2.00e+34 down to -1.20e+35 — the app plots the
    // same values, so its ticks must read as short exponents, sign kept.
    expect(fmt(-1.2e35)).toBe('-1.2e35');
    expect(fmt(-1.2000000000000001e35)).toBe('-1.2e35');
    expect(fmt(-8e34)).toBe('-8e34');
    expect(fmt(-2e34)).toBe('-2e34');
    expect(fmt(2e34)).toBe('2e34');
    expect(fmt(-1.3e34)).toBe('-1.3e34');
    expect(fmt(-2.66e36)).toBe('-2.66e36');
    expect(fmt(1e15)).toBe('1e15');
    expect(fmt(-1e15)).toBe('-1e15');
    for (const v of [-1.2e35, -8e34, 2e34, -2.66e36]) {
      expect(fmt(v)).toMatch(/^-?\d(\.\d{1,2})?e\d+$/);
    }
  });
});

describe('Y_AXIS_LABEL_FORMATTER — float-noise guard (echarts passes the tick index)', () => {
  // How echarts calls it: (value, tickIndex), one axis pass in index
  // order, index 0 = the axis minimum. The real echarts 5.4.2 sequences
  // are in __tests__/echartsAxisTicks.test.ts; these pin the rule itself.
  const fmt = evalFormatter(Y_AXIS_LABEL_FORMATTER) as unknown as (v: unknown, i?: number) => string;
  const pass = (ticks: number[]) => ticks.map((v, i) => fmt(v, i));

  it('prints the noise tick where 0 belongs as "0", never a made-up value', () => {
    // echarts 5.4.2 ticks for a -1.1e31 bar (interval 2e30) …
    expect(
      pass([-1.2e31, -1e31, -8e30, -6.000000000000001e30, -4e30, -2e30, -562949953421312, 2e30]),
    ).toEqual(['-1.2e31', '-1e31', '-8e30', '-6e30', '-4e30', '-2e30', '0', '2e30']);
    // … a -1.3e34 bar, and the Reports axis for -1.2e35 kWh (in TWh)
    expect(pass([-1.5e34, -1.2e34, -9e33, -6e33, -3e33, -1152921504606847000, 3e33])[5]).toBe('0');
    expect(pass([-1.2e26, -1e26, -8e25, -6e25, -4e25, -2e25, -8589934592, 2e25])[6]).toBe('0');
  });

  it('a new pass (index 0) restarts: ordinary ticks after a legend-tap rescale stay as they are', () => {
    pass([-1.2e31, -1e31, -562949953421312, 2e30]);
    expect(pass([0, 10000, 20000, 30000])).toEqual(['0', '10K', '20K', '30K']);
    expect(pass([-500, 0, 500, 1000])).toEqual(['-500', '0', '500', '1K']);
    expect(pass([0, 0.001, 0.002])).toEqual(['0', '0.001', '0.002']);
  });

  it('a direct call without an index formats statelessly', () => {
    pass([-1.2e31, -1e31]);
    expect(fmt(-562949953421312)).toBe('-563T');
    expect(fmt(41000)).toBe('41K');
  });
});

describe('Trends combo chart tooltip formatter', () => {
  const tooltipFor = () => {
    const { option }: { option: any } = buildTrendComboOption(
      [{ time: 0, p1: 48000, p2: null }],
      [
        { param: 'p1', type: 'line', color: '#111111', display: 'Wind Energy Day' },
        { param: 'p2', type: 'line', color: '#222222', display: 'PV Energy Day' },
      ],
      1000,
      THEME,
    );
    return evalFormatter(option.tooltip.formatter as string);
  };
  const row = (seriesName: string, value: unknown) => ({
    axisValueLabel: '00:00',
    marker: '<m/>',
    seriesName,
    value,
  });

  it('shows an invalid-looking reading EXACTLY as the device sent it', () => {
    const sent = [3.9999999999999995e31, -1.2345678901234567e35, 1.5e15, -1e15];
    const html = tooltipFor()([
      ...sent.map((v, i) => row(`S${i}`, v)),
      row('PV Energy Day', null),
    ] as any);
    const shown = [...html.matchAll(/<b style="margin-left:10px">([^<]*)<\/b>/g)].map(m => m[1]);
    // every significant digit (the shortest text that round-trips to the
    // very same number), e-notation, sign kept — never rounded
    expect(shown.slice(0, sent.length).map(Number)).toEqual(sent);
    expect(shown).toEqual([
      '3.9999999999999994e31',
      '-1.2345678901234566e35',
      '1.5e15',
      '-1e15',
      '–', // missing data stays a dash
    ]);
    expect(html).not.toMatch(/e\+/);
  });

  it('keeps ordinary values compact and noise-free', () => {
    const html = tooltipFor()([
      row('Wind Energy Day', 48213.57),
      row('PV Energy Day', 0.1 + 0.2),
      row('Grid', 9.99e14),
    ] as any);
    expect(html).toContain('>48.2K</b>');
    expect(html).toContain('>0.3</b>');
    expect(html).toContain('>999T</b>');
    expect(html).not.toMatch(/e\+\d+M/);
  });
});
