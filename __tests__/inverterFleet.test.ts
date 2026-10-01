/**
 * Tables tab ("Inverter fleet") — the pure view-model (fleet stats,
 * sorting, row/hero strings, yield unit from the report mapping, PR
 * status) and the card rendered with mocked data hooks (period hero with
 * no LIVE/pulse, rows, placeholder dimming, sort pills, period memory).
 *
 * WEB PARITY: `WEB_TODAY` / `WEB_LIFETIME` are the web portal's own
 * `inverter_queries` responses for Lucky Cement Nooriabad, captured on
 * 2026-10-01 (www.pragmaticengineeringsolutions.com → Overview → Inverter
 * Table). The web shows 'Avg PR 78.1%' / 'Σ Production 141,106 kWh'
 * (1 Oct 2026) and 'Avg PR 69.1%' / 'Σ Production 56,027,791 kWh'
 * (Lifetime); the app must derive the same figures from the same rows.
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

type MockQueryState = {
  data?: { data: readonly unknown[] };
  isLoading?: boolean;
  isFetching?: boolean;
  isPlaceholderData?: boolean;
  error?: unknown;
  dataUpdatedAt?: number;
};
let mockQuery: MockQueryState = {};
let mockMapping: Record<string, unknown> | undefined = {
  yield: { display: 'Yield (kWh/kWp)', ingestName: 'yield' },
};
const mockRefetch = jest.fn();

jest.mock('../src/hooks', () => {
  const actual = jest.requireActual('../src/hooks') as object;
  return {
    ...actual,
    useInteractionReady: () => true,
    useReportMapping: () => ({ data: mockMapping }),
    useInverterReport: () => ({
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

import InverterTableCard from '../src/components/screens/Authenticated/SiteDetail/components/InverterTableCard';
import {
  ANIM_LIMIT,
  buildFleetHero,
  buildInverterRow,
  buildInverterRows,
  computeFleetStats,
  formatPercent,
  formatProduction,
  InverterEntry,
  mapRowsToEntries,
  parseYieldLabel,
  productionScale,
  resolveYieldMeta,
  sortEntries,
  spokenRatioUnit,
} from '../src/components/screens/Authenticated/SiteDetail/components/InverterTable/helpers';
import { PulseDot } from '../src/components/common';
import { useReportPeriodStore } from '../src/hooks/useReportPeriodStore';
import { prBandPalette } from '../src/theme';
import { formatEnergy } from '../src/utils/units';
import type { InverterReportRow } from '../src/networking';

/* ─────────────── fixtures ─────────────── */

const WEB_TODAY: InverterReportRow[] = [
  { inverter_num: '1', ed_solar: 15503.0, pr: 77.2374267578125, up_percent: 100.0, yield: 4.9609599113464355 },
  { inverter_num: '2', ed_solar: 14320.0, pr: 71.34361267089844, up_percent: 100.0, yield: 4.582399845123291 },
  { inverter_num: '3', ed_solar: 15314.400390625, pr: 76.29780578613281, up_percent: 100.0, yield: 4.900608062744141 },
  { inverter_num: '4', ed_solar: 16257.2998046875, pr: 80.99542236328125, up_percent: 100.0, yield: 5.202335834503174 },
  { inverter_num: '5', ed_solar: 15329.7001953125, pr: 76.37403106689453, up_percent: 100.0, yield: 4.90550422668457 },
  { inverter_num: '6', ed_solar: 16769.900390625, pr: 83.54924774169922, up_percent: 100.0, yield: 5.366368293762207 },
  { inverter_num: '7', ed_solar: 16356.5, pr: 81.4896469116211, up_percent: 100.0, yield: 5.234079837799072 },
  { inverter_num: '8', ed_solar: 15158.400390625, pr: 75.52059936523438, up_percent: 100.0, yield: 4.8506879806518555 },
  { inverter_num: '9', ed_solar: 16096.5, pr: 80.19430541992188, up_percent: 100.0, yield: 5.150879859924316 },
];

const WEB_LIFETIME: InverterReportRow[] = [
  { inverter_num: '1', ed_solar: 7066350.713928223, pr: 78.51260472382855, up_percent: 96.3612244829819, yield: 4.7806178136053346 },
  { inverter_num: '2', ed_solar: 6737855.098999023, pr: 74.80599772384743, up_percent: 96.4994924839657, yield: 4.558379760000217 },
  { inverter_num: '3', ed_solar: 6618543.796020508, pr: 73.61495212687906, up_percent: 96.50307321850896, yield: 4.477661760110432 },
  { inverter_num: '4', ed_solar: 6852286.022827148, pr: 76.0741682779815, up_percent: 96.44897229474897, yield: 4.635796034184874 },
  { inverter_num: '5', ed_solar: 4649221.21484375, pr: 49.69346845955111, up_percent: 96.43277415463082, yield: 3.1453505097937633 },
  { inverter_num: '6', ed_solar: 7089116.514038086, pr: 79.26424565450299, up_percent: 97.34299849650499, yield: 4.836923843762006 },
  { inverter_num: '7', ed_solar: 6851129.705871582, pr: 76.62179165052693, up_percent: 97.35629861339578, yield: 4.674544792630271 },
  { inverter_num: '8', ed_solar: 3540605.204345703, pr: 38.952244465334815, up_percent: 96.0666736156472, yield: 2.546053171559666 },
  { inverter_num: '9', ed_solar: 6622682.613525391, pr: 74.3213477673738, up_percent: 97.24855222071666, yield: 4.518674701452255 },
];

/** Loosely-typed rows (the backend ships strings / 'NA' / null too). */
const rows = (...items: Record<string, unknown>[]) => items as unknown as InverterReportRow[];
const row = (num: number, pr: unknown, extra: Record<string, unknown> = {}) => ({
  inverter_num: num,
  ed_solar: 1000 * num,
  pr,
  up_percent: 100,
  yield: 4.5,
  ...extra,
});

const entriesFor = (prs: unknown[]): InverterEntry[] =>
  mapRowsToEntries(rows(...prs.map((pr, i) => row(i + 1, pr))));

const KWP_META = resolveYieldMeta({ yield: { display: 'Yield (kWh/kWp)' } });

/* ─────────────── pure view-model ─────────────── */

describe('mapRowsToEntries', () => {
  it('parses numeric strings, keeps missing values null (never 0)', () => {
    const [a, b] = mapRowsToEntries(
      rows(
        { inverter_num: '3', ed_solar: '15503.0', pr: '77.5', up_percent: '100', yield: '4.96' },
        { inverter_num: 4, ed_solar: 'NA', pr: null, up_percent: '', yield: undefined },
      ),
    );
    expect(a).toMatchObject({
      key: 'inv-3',
      num: 3,
      badge: '3',
      title: 'Inverter 3',
      production: 15503,
      performanceRatio: 77.5,
      uptimePercent: 100,
      yield: 4.96,
    });
    expect(b).toMatchObject({
      key: 'inv-4',
      production: null,
      performanceRatio: null,
      uptimePercent: null,
      yield: null,
    });
  });

  it('gives unique, stable keys and keeps a non-numeric id in its own case', () => {
    const list = mapRowsToEntries(
      rows(
        { inverter_num: 'PV-SG-CI-01', ed_solar: 1, pr: 80, up_percent: 100, yield: 1 },
        { inverter_num: '2', ed_solar: 1, pr: 80, up_percent: 100, yield: 1 },
        { inverter_num: '2', ed_solar: 1, pr: 80, up_percent: 100, yield: 1 },
        { inverter_num: null, ed_solar: 1, pr: 80, up_percent: 100, yield: 1 },
      ),
    );
    expect(list.map(e => e.key)).toEqual(['inv-PV-SG-CI-01', 'inv-2', 'inv-2-1', 'inv-#3']);
    expect(list[0]).toMatchObject({ title: 'PV-SG-CI-01', badge: '—', num: null });
    expect(list[3]).toMatchObject({ title: 'Inverter —', badge: '—' });
  });
});

describe('computeFleetStats (TB-1)', () => {
  it('PRs [55, 0, null, 92] → avg 49 over 3, worst = the 0-PR inverter, offline 1', () => {
    const entries = entriesFor([55, 0, null, 92]);
    const stats = computeFleetStats(entries);
    expect(stats.count).toBe(4);
    expect(stats.prCount).toBe(3);
    expect(stats.avgPr).toBe(49);
    expect(stats.worst?.title).toBe('Inverter 2');
    expect(stats.best?.title).toBe('Inverter 4');
    expect(stats.offlineCount).toBe(1);

    // The null row is excluded from the stats but still becomes a row.
    const built = buildInverterRows(entries, KWP_META);
    expect(built).toHaveLength(4);
    const nullRow = built.find(r => r.title === 'Inverter 3');
    expect(nullRow?.status.key).toBe('none');
    expect(nullRow?.prText).toBe('—');
    expect(nullRow?.barFraction).toBe(0);
  });

  it('an all-zero fleet still has a hero: avg 0, offline 8', () => {
    const stats = computeFleetStats(entriesFor(Array(8).fill(0)));
    expect(stats.avgPr).toBe(0);
    expect(stats.offlineCount).toBe(8);
    const hero = buildFleetHero(stats);
    expect(hero.avgText).toBe('0');
    expect(hero.avgStatus.key).toBe('poor');
    expect(hero.offlineText).toBe('8 inverters');
    expect(hero.countLabel).toBe('8 inverters');
  });

  it('a 0 uptime counts as offline even with a PR', () => {
    const entries = mapRowsToEntries(rows(row(1, 85, { up_percent: 0 }), row(2, 90)));
    expect(computeFleetStats(entries).offlineCount).toBe(1);
  });

  it('no PR at all → avg null, "No PR data" hero, no best/worst', () => {
    const hero = buildFleetHero(computeFleetStats(entriesFor([null, 'NA', ''])));
    expect(hero.avgText).toBeNull();
    expect(hero.avgStatus.key).toBe('none');
    expect(hero.best).toBeNull();
    expect(hero.worst).toBeNull();
    expect(hero.avgA11yLabel).toMatch(/no data for this period/);
  });

  it('best / worst need at least two reporting inverters', () => {
    const hero = buildFleetHero(computeFleetStats(entriesFor([70, null])));
    expect(hero.best).toBeNull();
    expect(hero.worst).toBeNull();
    const pair = buildFleetHero(computeFleetStats(entriesFor([70, 91.25])));
    expect(pair.best).toMatchObject({ title: 'Inverter 2', prText: '91.25%' });
    expect(pair.best?.status.key).toBe('excellent');
    expect(pair.worst).toMatchObject({ title: 'Inverter 1', prText: '70%' });
    expect(pair.worst?.status.key).toBe('good');
    expect(pair.best?.a11yLabel).toBe('Best, Inverter 2, 91.25 percent');
  });

  it('WEB PARITY — 1 Oct 2026: Avg PR 78.1%, Σ 141,106 kWh, as on the web portal', () => {
    const stats = computeFleetStats(mapRowsToEntries(WEB_TODAY));
    const hero = buildFleetHero(stats);
    expect(hero.avgText).toBe('78.1');
    // Web band rule: 62 ≤ 78.1 < 82 → Good.
    expect(hero.avgStatus).toMatchObject({ key: 'good', label: 'Good', band: 'good' });
    expect(hero.avgA11yLabel).toBe(
      'Average performance ratio, 78.1 percent, good, across 9 inverters',
    );
    expect(hero.countLabel).toBe('9 inverters');
    expect(hero.total.text).toBe('141');
    expect(hero.total.unit).toBe('MWh');
    expect(hero.totalA11yLabel).toBe('Total production, 141,106 kilowatt hours');
    // Best / worst are inverter cells: up to 2 decimals, like their rows.
    expect(hero.best).toMatchObject({ title: 'Inverter 6', prText: '83.55%' });
    expect(hero.best?.status.key).toBe('excellent');
    expect(hero.worst).toMatchObject({ title: 'Inverter 2', prText: '71.34%' });
    expect(hero.worst?.status.key).toBe('good');
    expect(hero.offlineText).toBeNull();
  });

  it('WEB PARITY — Lifetime: Avg PR 69.1%, Σ 56,027,791 kWh', () => {
    const hero = buildFleetHero(computeFleetStats(mapRowsToEntries(WEB_LIFETIME)));
    expect(hero.avgText).toBe('69.1');
    expect(hero.avgStatus.key).toBe('good');
    expect(hero.total.text).toBe('56.0');
    expect(hero.total.unit).toBe('GWh');
    expect(hero.totalA11yLabel).toBe('Total production, 56,027,791 kilowatt hours');
    expect(hero.worst).toMatchObject({ title: 'Inverter 8', prText: '38.95%' });
    expect(hero.worst?.status.key).toBe('poor');
  });
});

describe('sortEntries', () => {
  const entries = entriesFor([55, 0, null, 92]);
  const titles = (list: InverterEntry[]) => list.map(e => e.title);

  it("'worst' (default) — lowest PR first, missing PR last", () => {
    expect(titles(sortEntries(entries, 'worst'))).toEqual([
      'Inverter 2',
      'Inverter 1',
      'Inverter 4',
      'Inverter 3',
    ]);
  });

  it("'number' — ascending, non-numeric ids last", () => {
    const mixed = mapRowsToEntries(
      rows(row(10, 50), { ...row(0, 50), inverter_num: 'Aux' }, row(2, 50), row(1, 50)),
    );
    expect(titles(sortEntries(mixed, 'number'))).toEqual([
      'Inverter 1',
      'Inverter 2',
      'Inverter 10',
      'Aux',
    ]);
  });

  it("'energy' — highest production first, missing last; input untouched", () => {
    const list = mapRowsToEntries(
      rows(row(1, 50, { ed_solar: 10 }), row(2, 50, { ed_solar: 'NA' }), row(3, 50, { ed_solar: 30 })),
    );
    const before = titles(list);
    expect(titles(sortEntries(list, 'energy'))).toEqual(['Inverter 3', 'Inverter 1', 'Inverter 2']);
    expect(titles(list)).toEqual(before);
  });

  it('ties fall back to inverter number', () => {
    const tied = entriesFor([80, 80, 80]).reverse();
    expect(titles(sortEntries(tied, 'worst'))).toEqual(['Inverter 1', 'Inverter 2', 'Inverter 3']);
  });
});

describe('yield label / unit from the report mapping', () => {
  it("takes the unit the mapping gives ('Yield (kWh/kWp)')", () => {
    expect(parseYieldLabel('Yield (kWh/kWp)')).toEqual({ label: 'Yield', unit: 'kWh/kWp' });
    expect(parseYieldLabel('Specific Yield (kWh)')).toEqual({ label: 'Specific Yield', unit: 'kWh' });
    expect(KWP_META).toEqual({
      label: 'Yield',
      unit: 'kWh/kWp',
      spokenUnit: 'kilowatt hours per kilowatt peak',
    });
  });

  it('invents no unit when the mapping has none (or is missing)', () => {
    expect(resolveYieldMeta(undefined)).toEqual({
      label: 'Specific yield',
      unit: null,
      spokenUnit: '',
    });
    expect(resolveYieldMeta({ yield: { display: 'Yield' } }).unit).toBeNull();
    expect(parseYieldLabel('Inverter (Block A)')).toEqual({
      label: 'Inverter (Block A)',
      unit: null,
    });
  });

  it('speaks ratio units part by part', () => {
    expect(spokenRatioUnit('kWh/kWp')).toBe('kilowatt hours per kilowatt peak');
    expect(spokenRatioUnit('MWh / MWp')).toBe('megawatt hours per megawatt peak');
  });
});

describe('production formatting — one unit for the whole list', () => {
  it('web-verified 1 Oct values read in MWh, one decimal', () => {
    const entries = mapRowsToEntries(WEB_TODAY);
    const scale = productionScale(entries);
    expect(scale).toEqual({ unit: 'MWh', divisor: 1000, decimals: 1 });
    const q = formatProduction(15503, scale);
    expect(`${q.text} ${q.unit}`).toBe('15.5 MWh');
  });

  it('lifetime keeps three significant digits in GWh', () => {
    const scale = productionScale(mapRowsToEntries(WEB_LIFETIME));
    expect(scale).toEqual({ unit: 'GWh', divisor: 1_000_000, decimals: 2 });
    expect(formatProduction(7066350.713928223, scale).text).toBe('7.07');
    expect(formatProduction(3540605.204345703, scale).text).toBe('3.54');
  });

  it('never mixes kWh and MWh across rows', () => {
    const scale = productionScale(
      mapRowsToEntries(rows(row(1, 80, { ed_solar: 9876 }), row(2, 80, { ed_solar: 10234 }))),
    );
    expect(formatProduction(9876, scale)).toMatchObject({ text: '9.9', unit: 'MWh' });
    expect(formatProduction(10234, scale)).toMatchObject({ text: '10.2', unit: 'MWh' });
    expect(formatProduction(null, scale)).toMatchObject({ text: '—', isMissing: true });
  });

  it('a small fleet stays in kWh', () => {
    const scale = productionScale(mapRowsToEntries(rows(row(1, 80, { ed_solar: 850 }))));
    expect(formatProduction(850, scale)).toMatchObject({ text: '850.0', unit: 'kWh' });
  });

  it('a small non-zero value never reads like a real 0 in the shared unit', () => {
    // A tripped inverter (30 kWh) beside a 15.5 MWh one: '0.0 MWh' would be
    // indistinguishable from the real-zero row, so it keeps its own kWh.
    const entries = mapRowsToEntries(
      rows(
        row(1, 77.2, { ed_solar: 15503, yield: 4.96 }),
        row(2, 0.2, { ed_solar: 30, yield: 0.0096 }),
        row(3, 0, { ed_solar: 0, up_percent: 0, yield: 0 }),
        row(4, 2.2, { ed_solar: 449, yield: 0.14 }),
      ),
    );
    const scale = productionScale(entries);
    expect(scale.unit).toBe('MWh');
    const fmt = (kWh: number) => {
      const q = formatProduction(kWh, scale);
      return `${q.text} ${q.unit}`;
    };
    expect(fmt(15503)).toBe('15.5 MWh');
    expect(fmt(30)).toBe('30.0 kWh');
    expect(fmt(449)).toBe('0.4 MWh');
    expect(fmt(0)).toBe('0.0 MWh');
    expect(formatProduction(30, scale).spoken).toBe('30.0 kilowatt hours');
    expect(formatProduction(30, scale).value).toBe(30);

    const byKey = new Map(buildInverterRows(entries, KWP_META).map(r => [r.badge, r]));
    expect(byKey.get('2')?.secondary).toBe('30.0 kWh · 0.01 kWh/kWp');
    expect(byKey.get('2')?.a11yLabel).toContain('30.0 kilowatt hours');
    expect(byKey.get('3')?.secondary).toBe('0.0 MWh · 0.00 kWh/kWp');
  });

  it('the small-value fallback holds at every list scale', () => {
    // GWh list (2 decimals): < 5 MWh would print '0.00 GWh'.
    const gwh = productionScale(mapRowsToEntries(WEB_LIFETIME));
    expect(formatProduction(4200, gwh)).toMatchObject({ text: '4,200.0', unit: 'kWh' });
    expect(formatProduction(5000, gwh)).toMatchObject({ text: '0.01', unit: 'GWh' });
    // kWh list (1 decimal): a sub-0.05 kWh reading falls back to 3 sig. digits.
    const kwh = productionScale(mapRowsToEntries(rows(row(1, 80, { ed_solar: 850 }))));
    expect(formatProduction(0.0234, kwh)).toMatchObject({ text: '0.0234', unit: 'kWh' });
    expect(formatProduction(0, kwh)).toMatchObject({ text: '0.0', unit: 'kWh' });
    expect(formatProduction(-30, productionScale(mapRowsToEntries(WEB_TODAY)))).toMatchObject({
      text: '-30.0',
      unit: 'kWh',
    });
  });
});

describe('row view-model', () => {
  const scale = { unit: 'MWh', divisor: 1000, decimals: 1 };
  const [inv1] = mapRowsToEntries(WEB_TODAY);

  it('secondary line, PR, uptime and ONE composed label', () => {
    const r = buildInverterRow(inv1, scale, KWP_META);
    expect(r.secondary).toBe('15.5 MWh · 4.96 kWh/kWp');
    expect(r.prText).toBe('77.24%');
    expect(r.status.key).toBe('good');
    expect(r.barFraction).toBeCloseTo(0.772, 3);
    expect(r.uptimeText).toBe('Up 100%');
    expect(r.uptimeFraction).toBe(1);
    expect(r.a11yLabel).toBe(
      'Inverter 1, good, performance ratio 77.24 percent, uptime 100 percent, ' +
        '15.5 megawatt hours, Yield 4.96 kilowatt hours per kilowatt peak',
    );
  });

  it('without a mapping unit the yield is labelled, not unit-suffixed', () => {
    const r = buildInverterRow(inv1, scale, resolveYieldMeta(undefined));
    expect(r.secondary).toBe('15.5 MWh · Specific yield 4.96');
  });

  it('missing PR / uptime / production render as — with "no data" speech', () => {
    const [blank] = mapRowsToEntries(
      rows({ inverter_num: 3, ed_solar: null, pr: 'NA', up_percent: null, yield: null }),
    );
    const r = buildInverterRow(blank, scale, KWP_META);
    expect(r.secondary).toBe('— · Yield —');
    expect(r.prText).toBe('—');
    expect(r.uptimeText).toBe('Up —');
    expect(r.uptimeFraction).toBeNull();
    expect(r.status).toMatchObject({ key: 'none', band: null });
    expect(r.a11yLabel).toBe(
      'Inverter 3, no performance data, uptime no data, production, no data, Yield, no data',
    );
  });

  it('PR bar is clamped to 0–1', () => {
    const [over] = mapRowsToEntries(rows(row(1, 104)));
    expect(buildInverterRow(over, scale, KWP_META).barFraction).toBe(1);
    const [neg] = mapRowsToEntries(rows(row(1, -3)));
    expect(buildInverterRow(neg, scale, KWP_META).barFraction).toBe(0);
  });

  it('uptime like the web: ≥ 99.95 reads 100, else up to 2 decimals', () => {
    const lifetime = buildInverterRows(mapRowsToEntries(WEB_LIFETIME), KWP_META);
    expect(lifetime[0].uptimeText).toBe('Up 96.36%');
    expect(lifetime[0].uptimeFraction).toBeCloseTo(0.9636, 4);
    expect(lifetime[0].a11yLabel).toContain('uptime 96.36 percent');
    const [nearly] = mapRowsToEntries(rows(row(1, 80, { up_percent: 99.96 })));
    const nearlyRow = buildInverterRow(nearly, scale, KWP_META);
    expect(nearlyRow.uptimeText).toBe('Up 100%');
    expect(nearlyRow.uptimeFraction).toBe(1);
    expect(nearlyRow.a11yLabel).toContain('uptime 100 percent');
    const [zero] = mapRowsToEntries(rows(row(1, 0, { up_percent: 0 })));
    const zeroRow = buildInverterRow(zero, scale, KWP_META);
    expect(zeroRow.uptimeText).toBe('Up 0%');
    expect(zeroRow.uptimeFraction).toBe(0);
  });

  it('percent text trims trailing zeros like the web portal', () => {
    expect(formatPercent(81)).toBe('81%');
    expect(formatPercent(77.2374267578125)).toBe('77.24%');
    expect(formatPercent(96.3612244829819)).toBe('96.36%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(-0.004)).toBe('0%');
    expect(formatPercent(-0.04)).toBe('-0.04%');
    expect(formatPercent(null)).toBe('—');
  });
});

/* ─────────────── the card ─────────────── */

let tree: ReactTestRenderer | undefined;
const render = () => {
  act(() => {
    tree = renderer.create(React.createElement(InverterTableCard));
  });
  return tree as ReactTestRenderer;
};
const texts = (t: ReactTestRenderer) =>
  t.root.findAllByType(Text).map(n => {
    const c = n.props.children;
    return Array.isArray(c) ? c.join('') : String(c);
  });
/** Memo components surface as their inner function — match by name. */
const byDisplayName = (t: ReactTestRenderer, name: string) =>
  t.root.findAll(
    (n: ReactTestInstance) =>
      typeof n.type === 'function' &&
      ((n.type as { displayName?: string }).displayName ?? n.type.name) === name,
  );
const rowInstances = (t: ReactTestRenderer) => byDisplayName(t, 'InverterRow');
const press = (t: ReactTestRenderer, label: string) => {
  const target = t.root.find(
    (n: ReactTestInstance) =>
      typeof n.props.onPress === 'function' && n.props.accessibilityLabel === label,
  );
  act(() => target.props.onPress());
};

beforeEach(() => {
  mockQuery = {};
  mockMapping = { yield: { display: 'Yield (kWh/kWp)', ingestName: 'yield' } };
  mockRefetch.mockClear();
  useReportPeriodStore.getState().reset();
});
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
});

describe('InverterTableCard', () => {
  it('period hero (no LIVE, no pulse, words not Σ), rows worst-first', () => {
    mockQuery = { data: { data: WEB_TODAY }, dataUpdatedAt: Date.now() };
    const t = render();
    const all = texts(t);
    expect(all.some(s => /^Fleet · /.test(s))).toBe(true);
    expect(all.some(s => /LIVE|Σ/.test(s))).toBe(false);
    expect(t.root.findAllByType(PulseDot)).toHaveLength(0);
    expect(all).toContain('9 inverters');
    expect(all).toContain('78.1');
    expect(all).toContain('Good');
    expect(all).toContain('Best');
    expect(all).toContain('Worst');
    expect(all).toContain('Inverter fleet');
    expect(all.some(s => s.startsWith('Updated '))).toBe(true);

    const list = rowInstances(t);
    expect(list).toHaveLength(9);
    expect(list[0].props.row.title).toBe('Inverter 2'); // lowest PR (71.3%)
    expect(list[8].props.row.title).toBe('Inverter 6'); // highest PR (83.5%)
    expect(all).toContain('14.3 MWh · 4.58 kWh/kWp');
  });

  it('sort pills reorder rows without remounting them', () => {
    mockQuery = { data: { data: WEB_TODAY } };
    const t = render();
    const before = new Map(rowInstances(t).map(r => [r.props.row.key, r.instance]));
    press(t, 'Number');
    const list = rowInstances(t);
    expect(list.map(r => r.props.row.title)).toEqual(
      Array.from({ length: 9 }, (_, i) => `Inverter ${i + 1}`),
    );
    press(t, 'Energy');
    expect(rowInstances(t)[0].props.row.title).toBe('Inverter 6');
    // Same component instances, just moved.
    for (const r of rowInstances(t)) expect(before.get(r.props.row.key)).toBe(r.instance);
  });

  it('keeps rows mounted, dimmed and marked Updating… on placeholder data', () => {
    mockQuery = { data: { data: WEB_TODAY } };
    const t = render();
    const first = rowInstances(t)[0].instance;
    mockQuery = { data: { data: WEB_TODAY }, isPlaceholderData: true, isFetching: true };
    act(() => t.update(React.createElement(InverterTableCard)));
    expect(texts(t)).toContain('Updating…');
    expect(rowInstances(t)).toHaveLength(9);
    expect(rowInstances(t)[0].instance).toBe(first);
    const dimmed = t.root.find(
      (n: ReactTestInstance) =>
        typeof n.type === 'string' && StyleSheet.flatten(n.props.style)?.opacity === 0.5,
    );
    expect(dimmed.props.accessibilityState).toEqual({ busy: true });
    expect(texts(t).some(s => s.startsWith('Updated '))).toBe(false);
  });

  it('null-PR rows show a neutral "No data"; 0% PR shows the offline hero row', () => {
    mockQuery = { data: { data: rows(row(1, 55), row(2, 0), row(3, null), row(4, 92)) } };
    const t = render();
    const all = texts(t);
    expect(all).toContain('No data');
    expect(all).toContain('Offline / 0% PR');
    expect(all).toContain('1 inverter');
    expect(all).toContain('49'); // avg over the 3 reporting inverters
    expect(rowInstances(t)).toHaveLength(4);
  });

  it('bars animate only below ANIM_LIMIT, with a transform-only animated style', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => row(i + 1, 60 + i));
    mockQuery = { data: { data: rows(...twelve) } };
    const t = render();
    const bars = byDisplayName(t, 'AnimatedBar');
    // A PR bar + an uptime bar per row; both follow the row's frozen
    // ANIM_LIMIT decision.
    expect(bars).toHaveLength(24);
    expect(bars.filter(b => b.props.animate)).toHaveLength(2 * ANIM_LIMIT);
    // Inside each animated bar, the animated style object carries
    // `transform` (translateX + scaleX) and nothing else.
    const animatedStyles = bars
      .filter(b => b.props.animate)
      .flatMap(b =>
        b.findAll(
          (n: ReactTestInstance) => typeof n.type === 'string' && Array.isArray(n.props.style),
        ),
      )
      .flatMap(n => (n.props.style as unknown[]).filter(s => s && !Array.isArray(s)))
      .filter((s): s is Record<string, unknown> => 'transform' in (s as object));
    expect(animatedStyles).toHaveLength(2 * ANIM_LIMIT);
    for (const s of animatedStyles) expect(Object.keys(s)).toEqual(['transform']);
  });

  it("bars use the web's band gradients; the uptime bar is always 'excellent'", () => {
    // PRs 30 / 50 / 70 / 90 → poor / fair / good / excellent; inverter 5 has
    // no PR (no PR bar) and inverter 6 no uptime (no uptime bar).
    mockQuery = {
      data: {
        data: rows(
          row(1, 30),
          row(2, 50),
          row(3, 70),
          row(4, 90),
          row(5, null),
          row(6, 85, { up_percent: null }),
        ),
      },
    };
    const t = render();
    const byTitle = new Map(rowInstances(t).map(r => [r.props.row.title, r]));
    const gradients = (title: string) =>
      (byTitle.get(title) as ReactTestInstance)
        .findAll(
          (n: ReactTestInstance) =>
            typeof n.type === 'function' &&
            ((n.type as { displayName?: string }).displayName ?? n.type.name) === 'AnimatedBar',
        )
        .map(b => b.props.colors);
    expect(gradients('Inverter 1')).toEqual([prBandPalette.poor, prBandPalette.excellent]);
    expect(gradients('Inverter 2')).toEqual([prBandPalette.fair, prBandPalette.excellent]);
    expect(gradients('Inverter 3')).toEqual([prBandPalette.good, prBandPalette.excellent]);
    expect(gradients('Inverter 4')).toEqual([prBandPalette.excellent, prBandPalette.excellent]);
    expect(gradients('Inverter 5')).toEqual([prBandPalette.excellent]);
    expect(gradients('Inverter 6')).toEqual([prBandPalette.excellent]);
    expect(texts(t)).toContain('Up —');
  });

  it('hero band dots: average status, best and worst', () => {
    mockQuery = { data: { data: WEB_TODAY } };
    const t = render();
    const dots = byDisplayName(t, 'BandDot').map(d => d.props.status.key);
    // Average 78.1 → good, best 83.55 → excellent, worst 71.34 → good.
    expect(dots).toEqual(['good', 'excellent', 'good']);
    const colours = byDisplayName(t, 'Dot').map(d => d.props.color);
    expect(colours).toEqual([
      prBandPalette.good[1],
      prBandPalette.excellent[1],
      prBandPalette.good[1],
    ]);
  });

  it('loading → skeleton; error with nothing cached → friendly copy + retry', () => {
    mockQuery = { isLoading: true, isFetching: true };
    let t = render();
    expect(rowInstances(t)).toHaveLength(0);
    expect(texts(t)).not.toContain('No inverter data for this period');
    act(() => t.unmount());

    mockQuery = { error: Object.assign(new Error('Request failed with status code 500'), { response: { status: 500 } }) };
    t = render();
    const all = texts(t);
    expect(all.some(s => /500|Request failed/.test(s))).toBe(false);
    press(t, 'Retry');
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('empty period → empty state', () => {
    mockQuery = { data: { data: [] } };
    const t = render();
    expect(texts(t)).toContain('No inverter data for this period');
  });

  it("remembers its period under 'tables', independent of Reports", () => {
    mockQuery = { data: { data: WEB_TODAY } };
    let t = render();
    press(t, 'Month');
    act(() => t.unmount());
    t = render();
    const month = t.root.find(
      (n: ReactTestInstance) =>
        typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'Month',
    );
    expect(month.props.selected).toBe(true);
    const keys = Object.keys(useReportPeriodStore.getState().entries);
    expect(keys).toEqual(['site-1:tables']);
  });
});

describe('total production a11y uses the exact backend kWh', () => {
  it('matches formatEnergy precise, unscaled', () => {
    expect(formatEnergy(141106.4, { mode: 'precise', decimals: 0, rescale: false }).spoken).toBe(
      '141,106 kilowatt hours',
    );
  });
});
