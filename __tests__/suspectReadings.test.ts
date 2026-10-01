/**
 * Garbage device readings are SHOWN, never hidden (user rule, web parity):
 * every formatter writes a reading at or above SUSPECT_READING_ABS in 'e'
 * notation — the value as sent, not a 30–50-digit string and never '—'.
 * Plus the irradiance whole-number rule on the Analysis chart and the
 * Dashboard chip.
 */
import { describe, expect, it } from '@jest/globals';
import {
  formatQuantity,
  formatScientific,
  formatSig3,
  isSuspectReading,
  SUSPECT_READING_ABS,
} from '../src/utils/units';
import { formatCompact } from '../src/utils/sources';
import { formatCardValue } from '../src/utils/cards';
import { IMPLAUSIBLE_READING_ABS } from '../src/utils/liveParams';
import { SUSPECT_READING_ABS as CHART_SUSPECT } from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';
import { buildTrendComboOption } from '../src/components/screens/Authenticated/SiteDetail/components/Trends/echartsOption';
import { buildSiteCardModel } from '../src/components/screens/Authenticated/Dashboard/siteCardModel';
import type { ChartTheme } from '../src/components/screens/Authenticated/SiteDetail/components/chartConfig';
import type { ISite, TrendAggregation, TrendDataRow } from '../src/types';

describe('one threshold, one notation', () => {
  it('the Live tab, the charts and the formatters share SUSPECT_READING_ABS', () => {
    expect(SUSPECT_READING_ABS).toBe(1e15);
    expect(IMPLAUSIBLE_READING_ABS).toBe(SUSPECT_READING_ABS);
    expect(CHART_SUSPECT).toBe(SUSPECT_READING_ABS);
    expect(isSuspectReading(9.99e14)).toBe(false);
    expect(isSuspectReading(1e15)).toBe(true);
    expect(isSuspectReading(-1.2e35)).toBe(true);
    expect(isSuspectReading(Number.NaN)).toBe(false);
  });

  it("writes 3 significant digits in 'e' notation", () => {
    expect(formatScientific(-1.29e34)).toBe('-1.29e34');
    expect(formatScientific(4e31)).toBe('4e31');
    expect(formatScientific(2.66e36)).toBe('2.66e36');
  });
});

describe('every formatter shows the garbage value as sent', () => {
  const garbage = -1.2e35;

  it('formatSig3 / formatCompact (chips, heroes)', () => {
    expect(formatSig3(garbage)).toBe('-1.2e35');
    expect(formatCompact(4e31)).toBe('4e31'); // not '40,000,000,000,000,000,000T'
    expect(formatCompact(15642)).toBe('15.6K'); // ordinary values unchanged
  });

  it('formatQuantity keeps the backend unit and never rescales a garbage value', () => {
    for (const mode of ['compact', 'precise'] as const) {
      const q = formatQuantity(garbage, 'kWh', { mode });
      expect(q.isMissing).toBe(false);
      expect(q.value).toBe(garbage);
      expect([q.text, q.unit]).toEqual(['-1.2e35', 'kWh']);
    }
    // Ordinary values keep their prefix rescaling.
    expect(formatQuantity(1_500_000, 'kWh').unit).toBe('GWh');
  });

  it('formatCardValue (Cards tab, SLD rows)', () => {
    expect(formatCardValue(-1.29e34, undefined)).toBe('-1.29e34');
    expect(formatCardValue('2.66e36', 2)).toBe('2.66e36');
    expect(formatCardValue(5838.99, undefined)).toBe((5838.99).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
  });

  it('missing data is still "—", not garbage', () => {
    expect(formatCardValue(null, undefined)).toBe('—');
    expect(formatQuantity('NA', 'kWh').text).toBe('—');
    expect(formatCompact(Number.NaN)).toBe('—');
  });
});

describe('irradiance whole numbers outside the Cards / Live / SLD tiles', () => {
  const THEME: ChartTheme = {
    textPrimary: 'p',
    textSecondary: 's',
    textTertiary: 't',
    border: 'b',
    surface: 'su',
    brand: 'br',
    brandSoft: 'bs',
    isDark: false,
  };
  const aggs: TrendAggregation[] = [
    { param: 'p993', type: 'line', color: '#123456', display: 'POA Irradiance' },
    { param: 'p40', type: 'line', color: '#654321', display: 'Solar Power' },
  ];
  const rows: TrendDataRow[] = [
    { time: 1_000, p993: 862.37, p40: 12.345 },
    { time: 2_000, p993: 2.66e36, p40: 13.5 },
  ];

  it('Analysis chart: irradiance points are whole numbers; other series and garbage stay as sent', () => {
    const { option, invalidCount } = buildTrendComboOption(rows, aggs, 60_000, THEME);
    const series = (option as { series: { data: (number | null)[] }[] }).series;
    expect(series[0].data).toEqual([862, 2.66e36]);
    expect(series[1].data).toEqual([12.345, 13.5]);
    expect(invalidCount).toBe(1);
  });

  it('Dashboard chip: a unitless card named for irradiance prints a whole number', () => {
    const site = {
      id: 's1',
      name: 'Site',
      cards: [{ name: 'Solar Irradiance', unit: '', value: 45.67, color: '#00ff00' }],
    } as unknown as ISite;
    const chips = buildSiteCardModel(site).metrics.map(m => m.quantity.text);
    expect(chips).toEqual(['46']);
  });
});
