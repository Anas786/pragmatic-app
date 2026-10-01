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
});

describe('Trends combo chart tooltip formatter', () => {
  it('renders compact, noise-free values and "–" for missing data', () => {
    // buildTrendComboOption's own impossible-reading guard (see
    // trendComboOption.test.ts) would already null out a ~4e31 point
    // before it reaches series data — this test instead feeds the
    // tooltip formatter that value directly, as defense in depth: it
    // must never produce garbage even if it somehow received one.
    const { option }: { option: any } = buildTrendComboOption(
      [{ time: 0, p1: 48000, p2: null }],
      [
        { param: 'p1', type: 'line', color: '#111111', display: 'Wind Energy Day' },
        { param: 'p2', type: 'line', color: '#222222', display: 'PV Energy Day' },
      ],
      1000,
      THEME,
    );
    const tooltipFmt = evalFormatter(option.tooltip.formatter as string);
    const html = tooltipFmt([
      {
        axisValueLabel: '00:00',
        marker: '<m/>',
        seriesName: 'Wind Energy Day',
        value: 3.9999999999999995e31,
      },
      {
        axisValueLabel: '00:00',
        marker: '<m/>',
        seriesName: 'PV Energy Day',
        value: null,
      },
    ] as any);
    expect(html).toContain('4e31');
    expect(html).toContain('–');
    expect(html).not.toMatch(/e\+\d+M/);
  });
});
