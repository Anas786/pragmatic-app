/**
 * Tables tab — PR bands, colours and cell text follow the web portal's
 * Inverter Table (Lucky Cement Tables tab, extracted from the web bundle
 * on 2026-10-01):
 *
 *   PR bar:  y[ r < 40 ? 'err' : r < 62 ? 'warn' : r < 82 ? 'lime' : 'ok' ]
 *   Uptime:  value >= 99.95 ? 100 : value, gradient ALWAYS y.ok
 *   Label:   integer ? String(n) : String(Number(n.toFixed(2)))
 *   Missing: null / '' / NaN → muted 'NA' (the app's '—' / 'No data')
 *
 * Same colours in light and dark; text beside them uses `prBandInk`
 * (AA — see tokenContrast.test.ts).
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildFleetHero,
  computeFleetStats,
  displayUptime,
  formatPercent,
  formatPercentValue,
  mapRowsToEntries,
  UPTIME_FULL_PCT,
} from '../src/components/screens/Authenticated/SiteDetail/components/InverterTable/helpers';
import {
  PR_BAND_THRESHOLDS,
  prBandDotColor,
  prBandGradient,
  prBandInk,
  StatusKey,
  statusFor,
  UPTIME_GRADIENT,
} from '../src/components/screens/Authenticated/SiteDetail/components/InverterTable/prBands';
import { DARK_SCHEME, energyPalette, LIGHT_SCHEME, prBandPalette } from '../src/theme';
import type { InverterReportRow } from '../src/networking';

/** The web portal's gradients, verbatim from its bundle. */
const WEB_GRADIENTS = {
  err: ['#E2685F', '#F2867D'],
  warn: ['#DE9B36', '#F2B64A'],
  lime: ['#7FAE39', '#A6D45E'],
  ok: ['#27A86A', '#46CF89'],
};

/** The web's PR cell label, ported 1:1 (without its ' %' suffix). */
const webLabel = (n: number): string =>
  Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));

describe('PR bands — the web rule (< 40 / 62 / 82)', () => {
  it('thresholds are the web portal’s', () => {
    expect(PR_BAND_THRESHOLDS).toEqual({ excellent: 82, good: 62, fair: 40 });
  });

  const edges: [number, StatusKey][] = [
    [0, 'poor'],
    [-3, 'poor'],
    [39.99, 'poor'],
    [40, 'fair'],
    [61.99, 'fair'],
    [62, 'good'],
    [81.99, 'good'],
    [82, 'excellent'],
    [100, 'excellent'],
    [104, 'excellent'],
  ];
  it.each(edges)('PR %p → %s', (pr, key) => {
    expect(statusFor(pr).key).toBe(key);
    expect(statusFor(pr).band).toBe(key);
  });

  it('labels read Poor / Fair / Good / Excellent', () => {
    expect([30, 50, 70, 90].map(pr => statusFor(pr).label)).toEqual([
      'Poor',
      'Fair',
      'Good',
      'Excellent',
    ]);
  });

  it('a missing PR is a neutral "No data", never Poor', () => {
    for (const pr of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(statusFor(pr)).toEqual({ key: 'none', label: 'No data', band: null });
    }
  });

  it('a parsed row with a missing PR stays null (not 0 → Poor)', () => {
    const [blank, empty, zero] = mapRowsToEntries([
      { inverter_num: '1', ed_solar: 1, pr: 'NA', up_percent: 100, yield: 1 },
      { inverter_num: '2', ed_solar: 1, pr: '', up_percent: 100, yield: 1 },
      { inverter_num: '3', ed_solar: 1, pr: 0, up_percent: 100, yield: 1 },
    ] as unknown as InverterReportRow[]);
    expect(statusFor(blank.performanceRatio).key).toBe('none');
    expect(statusFor(empty.performanceRatio).key).toBe('none');
    expect(statusFor(zero.performanceRatio).key).toBe('poor');
  });
});

describe('band colours', () => {
  it('prBandPalette is the web gradients, verbatim', () => {
    expect(prBandPalette).toEqual({
      poor: WEB_GRADIENTS.err,
      fair: WEB_GRADIENTS.warn,
      good: WEB_GRADIENTS.lime,
      excellent: WEB_GRADIENTS.ok,
    });
  });

  it('bars use the band gradient (same in both themes); none when missing', () => {
    expect(prBandGradient(statusFor(39.99))).toBe(prBandPalette.poor);
    expect(prBandGradient(statusFor(40))).toBe(prBandPalette.fair);
    expect(prBandGradient(statusFor(62))).toBe(prBandPalette.good);
    expect(prBandGradient(statusFor(82))).toBe(prBandPalette.excellent);
    expect(prBandGradient(statusFor(null))).toBeNull();
  });

  it("the uptime bar is always the 'excellent' (web 'ok') gradient", () => {
    expect(UPTIME_GRADIENT).toBe(prBandPalette.excellent);
    expect(UPTIME_GRADIENT).toEqual(WEB_GRADIENTS.ok);
  });

  it('hero dots use the bright stop; none when missing', () => {
    expect(prBandDotColor(statusFor(70))).toBe(prBandPalette.good[1]);
    expect(prBandDotColor(statusFor(null))).toBeNull();
  });

  it('PR text uses the scheme band ink; missing is neutral secondary text', () => {
    for (const scheme of [LIGHT_SCHEME, DARK_SCHEME]) {
      expect(prBandInk(statusFor(10), scheme)).toBe(scheme.prBandInk.poor);
      expect(prBandInk(statusFor(50), scheme)).toBe(scheme.prBandInk.fair);
      expect(prBandInk(statusFor(70), scheme)).toBe(scheme.prBandInk.good);
      expect(prBandInk(statusFor(90), scheme)).toBe(scheme.prBandInk.excellent);
      expect(prBandInk(statusFor(null), scheme)).toBe(scheme.textSecondary);
    }
    // Dark mode inks ARE the web's bright stops (AA on dark surfaces).
    expect(DARK_SCHEME.prBandInk).toEqual({
      poor: WEB_GRADIENTS.err[1],
      fair: WEB_GRADIENTS.warn[1],
      good: WEB_GRADIENTS.lime[1],
      excellent: WEB_GRADIENTS.ok[1],
    });
  });

  it('no band colour is an energyPalette colour (that palette is sources only)', () => {
    const palette = new Set(Object.values(energyPalette).map(c => c.toLowerCase()));
    const used = [
      ...Object.values(prBandPalette).flat(),
      ...Object.values(LIGHT_SCHEME.prBandInk),
      ...Object.values(DARK_SCHEME.prBandInk),
    ];
    expect(used.filter(c => palette.has(c.toLowerCase()))).toEqual([]);
  });
});

describe('cell text — the web label, the app’s "%"', () => {
  it.each([
    [61, '61'],
    [61.456, '61.46'],
    [61.5, '61.5'],
    [61.499, '61.5'],
    [77.2374267578125, '77.24'],
    [38.952244465334815, '38.95'],
    [100, '100'],
    [0, '0'],
  ])('%p → %p (same digits as the web)', (n, text) => {
    expect(formatPercentValue(n)).toBe(text);
    expect(formatPercentValue(n)).toBe(webLabel(n));
    expect(formatPercent(n)).toBe(`${text}%`);
  });

  it('missing is the design-system "—", never 0', () => {
    expect(formatPercentValue(null)).toBe('—');
    expect(formatPercentValue(Number.NaN)).toBe('—');
    expect(formatPercent(null)).toBe('—');
  });
});

describe('uptime display — ≥ 99.95 reads 100', () => {
  it.each([
    [100, 100, '100%'],
    [99.96, 100, '100%'],
    [UPTIME_FULL_PCT, 100, '100%'],
    [99.94, 99.94, '99.94%'],
    [96.3612244829819, 96.3612244829819, '96.36%'],
    [0, 0, '0%'],
  ])('%p → %p (%p)', (raw, shown, text) => {
    expect(displayUptime(raw)).toBe(shown);
    expect(formatPercent(displayUptime(raw))).toBe(text);
  });

  it('missing uptime stays null', () => {
    expect(displayUptime(null)).toBeNull();
    expect(displayUptime(Number.NaN)).toBeNull();
    expect(formatPercent(displayUptime(null))).toBe('—');
  });
});

describe('fleet status uses the same bands', () => {
  const fleet = (...prs: (number | null)[]) =>
    buildFleetHero(
      computeFleetStats(
        mapRowsToEntries(
          prs.map((pr, i) => ({
            inverter_num: String(i + 1),
            ed_solar: 1000,
            pr,
            up_percent: 100,
            yield: 4,
          })) as unknown as InverterReportRow[],
        ),
      ),
    );

  // The hero shows the average at 1 decimal, so it is banded AS SHOWN: the
  // number and its label must never disagree at an edge.
  const averages: [number[], string, StatusKey][] = [
    [[30, 49.88], '39.9', 'poor'], // avg 39.94
    [[30, 49.92], '40', 'fair'], // avg 39.96 — reads '40', so Fair
    [[30, 50], '40', 'fair'], // avg 40
    [[60, 63.88], '61.9', 'fair'], // avg 61.94
    [[60, 63.92], '62', 'good'], // avg 61.96 — reads '62', so Good
    [[60, 64], '62', 'good'], // avg 62
    [[80, 83.88], '81.9', 'good'], // avg 81.94
    [[80, 83.92], '82', 'excellent'], // avg 81.96 — reads '82', so Excellent
    [[80, 84], '82', 'excellent'], // avg 82
  ];
  it.each(averages)('PRs %p → fleet shows %s, %s', (prs, text, key) => {
    const hero = fleet(...prs);
    expect(hero.avgText).toBe(text);
    expect(hero.avgStatus.key).toBe(key);
  });

  it('a single inverter at 81.96 reads "82" and Excellent (shown value decides)', () => {
    const hero = fleet(81.96);
    expect(hero.avgText).toBe('82');
    expect(hero.avgStatus.key).toBe('excellent');
    expect(hero.avgA11yLabel).toBe(
      'Average performance ratio, 82 percent, excellent, across 1 inverter',
    );
  });

  it('the average status label is spoken', () => {
    expect(fleet(30, 50).avgA11yLabel).toBe(
      'Average performance ratio, 40 percent, fair, across 2 inverters',
    );
  });

  it('no PR at all → neutral, never Poor', () => {
    expect(fleet(null, null).avgStatus.key).toBe('none');
  });

  it('best / worst carry their own band', () => {
    const hero = fleet(39.99, 82);
    expect(hero.best?.status.key).toBe('excellent');
    expect(hero.worst?.status.key).toBe('poor');
    expect(hero.worst?.prText).toBe('39.99%');
  });
});
