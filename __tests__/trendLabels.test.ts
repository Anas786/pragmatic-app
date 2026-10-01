/**
 * Series-label resolution for the Trends tab (`selectTrends`).
 *
 * Labels must resolve through /public/config/params-mapping when the trend
 * config carries no meaningful `display` — otherwise legends/tooltips show
 * raw p-codes ("p10436" instead of "SVG 4 Active Power").
 */
import { describe, expect, it } from '@jest/globals';
import {
  formatTrendWindowLabel,
  selectTrends,
  TREND_PERIOD_SPOKEN,
  TREND_PERIODS,
  trendCaption,
  trendPeriodPillA11yLabel,
} from '../src/utils/trends';

const MAPPING = {
  p10436: 'SVG 4 Active Power',
  p5002: 'DG 3 Active Power',
  pBad: 42, // non-string values must be ignored (ParamsMapping is loosely typed)
};

const config = (aggregations: unknown[]) => ({
  siteComponents: {
    trends: [{ heading: 'Power', payload: { aggregations } }],
  },
});

const firstDisplays = (cfg: unknown, mapping?: typeof MAPPING) =>
  selectTrends(cfg, mapping)[0]?.aggregations.map(a => a.display);

describe('selectTrends series labels', () => {
  it('maps param codes through params-mapping when display is absent', () => {
    const cfg = config([
      { param: 'p10436', type: 'line' },
      { param: 'p5002', type: 'bar' },
    ]);
    expect(firstDisplays(cfg, MAPPING)).toEqual([
      'SVG 4 Active Power',
      'DG 3 Active Power',
    ]);
  });

  it('treats a display equal to the raw p-code as absent', () => {
    const cfg = config([{ param: 'p10436', type: 'line', display: 'p10436' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['SVG 4 Active Power']);
  });

  it('lets an explicit, meaningful config display win over the mapping', () => {
    const cfg = config([
      { param: 'p10436', type: 'line', display: 'Custom Series Name' },
    ]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['Custom Series Name']);
  });

  it('falls back to the raw code when neither display nor mapping resolve', () => {
    const cfg = config([{ param: 'p999999', type: 'area' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['p999999']);
    expect(firstDisplays(cfg)).toEqual(['p999999']); // no mapping at all
  });

  it('ignores non-string mapping values', () => {
    const cfg = config([{ param: 'pBad', type: 'line' }]);
    expect(firstDisplays(cfg, MAPPING)).toEqual(['pBad']);
  });

  it("prefers the site's own globalParams name over the global mapping (web parity)", () => {
    // Lucky Cement Nooriabad: the global params-mapping only knows
    // p1000005 as 'Custom Parameter 5'; the site config names it, and the
    // web portal shows the site name.
    const cfg = {
      ...config([
        { param: 'p1000005', type: 'area' },
        { param: 'p10436', type: 'line' },
        { param: 'p1000009', type: 'area', display: 'Explicit Wins' },
      ]),
      globalParams: { live: { p1000005: 'Captive Plant kW', p1000009: 'WHR kW' } },
    };
    const mapping = { ...MAPPING, p1000005: 'Custom Parameter 5', p1000009: 'Custom Parameter 9' };
    expect(selectTrends(cfg, mapping)[0]?.aggregations.map(a => a.display)).toEqual([
      'Captive Plant kW',
      'SVG 4 Active Power', // no site name → mapping
      'Explicit Wins', // a meaningful config display still wins
    ]);
  });
});

/* ─────────────── section header copy (TR-1) ─────────────── */

describe('trendCaption — subHeading only when it adds information', () => {
  it.each<[string, string | undefined, string | undefined]>([
    // equal after normalising case + punctuation → dropped
    ['Power Trend', 'Power Trend', undefined],
    ['Power Trend', 'power-trend', undefined],
    ['Power Trend', '  POWER  trend. ', undefined],
    // contained in the heading as whole words → dropped
    ['Active Power Trend', 'Power', undefined],
    ['Active Power Trend', 'active power', undefined],
    // adds information → kept, trimmed, original case
    ['Power', 'Active power of all inverters', 'Active power of all inverters'],
    ['Power Trend', ' Last 72 hours of PV output ', 'Last 72 hours of PV output'],
    // accented letters are word characters, not separators
    ['Énergie Solaire', 'énergie', undefined],
    ['Énergie', 'Énergie éolienne', 'Énergie éolienne'],
    // a substring that is NOT a whole word is not "the same words"
    ['Powerhouse', 'Power', 'Power'],
    // empty / missing
    ['Power', '', undefined],
    ['Power', '  —  ', undefined],
    ['Power', undefined, undefined],
  ])('heading %p + subHeading %p → %p', (heading, sub, expected) => {
    expect(trendCaption(heading, sub)).toBe(expected);
  });
});

describe('formatTrendWindowLabel', () => {
  // Device-local wall-clock times (the label uses local getters, like
  // the chart x-axis), so the test is TZ-independent.
  const at = (y: number, mo: number, d: number, h: number, mi: number) =>
    new Date(y, mo - 1, d, h, mi).getTime();
  const NOW = at(2026, 10, 1, 14, 35);
  const anyDate = new Date(NOW);

  it('presets show the absolute rolling window ending at the anchor', () => {
    expect(formatTrendWindowLabel('24H', anyDate, anyDate, NOW, NOW)).toEqual({
      text: '30 Sep 14:35 – 1 Oct 14:35',
      spoken: 'Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35',
    });
    expect(formatTrendWindowLabel('72H', anyDate, anyDate, NOW, NOW).text).toBe(
      '28 Sep 14:35 – 1 Oct 14:35',
    );
    expect(
      formatTrendWindowLabel('48H', anyDate, anyDate, at(2026, 10, 1, 9, 5), NOW).text,
    ).toBe('29 Sep 09:05 – 1 Oct 09:05');
  });

  it('adds the year to both ends when the window crosses a year or is not this year', () => {
    const newYear = at(2027, 1, 1, 6, 0);
    expect(formatTrendWindowLabel('48H', anyDate, anyDate, newYear, newYear).text).toBe(
      '30 Dec 2026 06:00 – 1 Jan 2027 06:00',
    );
    expect(formatTrendWindowLabel('24H', anyDate, anyDate, NOW, at(2027, 3, 1, 0, 0)).text).toBe(
      '30 Sep 2026 14:35 – 1 Oct 2026 14:35',
    );
  });

  it('Custom shows the picked calendar days — never DD/MM/YY', () => {
    const label = formatTrendWindowLabel(
      'Custom',
      new Date(2026, 8, 29),
      new Date(2026, 9, 1),
      NOW,
      NOW,
    );
    expect(label).toEqual({
      text: '29 Sep – 1 Oct 2026',
      spoken: 'Custom range, 29 Sep to 1 Oct 2026',
    });
    expect(label.text).not.toMatch(/\d{2}\/\d{2}\/\d{2}/);
    expect(
      formatTrendWindowLabel('Custom', new Date(2026, 9, 1), new Date(2026, 9, 1), NOW, NOW)
        .text,
    ).toBe('1 Oct 2026');
  });
});

describe('period pill labels', () => {
  it('every pill has a spoken name that contains its visible text', () => {
    for (const p of TREND_PERIODS) {
      expect(TREND_PERIOD_SPOKEN[p]).toBeTruthy();
      expect(trendPeriodPillA11yLabel(p)).toContain(p);
    }
    expect(trendPeriodPillA11yLabel('24H')).toBe('24H, last 24 hours');
    expect(trendPeriodPillA11yLabel('Custom')).toBe('Custom range, opens date picker');
  });
});
