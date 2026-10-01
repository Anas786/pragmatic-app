/**
 * Live-tab view-model (src/utils/liveParams.ts).
 *
 * The config / mapping / value fixtures are excerpts of the REAL Lucky
 * Cement Nooriabad payloads (site 146c5345-…, read from the web portal on
 * 2026-10-01), including its known config errors: the SLD tags a turbine's
 * reactive power 'Q' as 'kW' and power factors as '%', and trend
 * `payload.unit` is an x-axis granularity ('MINUTE'), not a unit.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import { AppState, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import {
  buildLiveGrid,
  buildParamUnitIndex,
  buildSiteParamNames,
  classifyLiveCategory,
  codeFromLivePath,
  compareLiveParams,
  countLiveCategories,
  defaultLiveCategory,
  extractLiveParams,
  LIVE_SORT_ORDER,
  LiveParameter,
  LiveSortKey,
  newestUpdateAt,
  nextLiveSort,
  resolveLiveParamName,
} from '../src/utils/liveParams';

const MIN = 60_000;
const HOUR = 3_600_000;
/** Fetch time used as "now" for every age below. */
const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();

/* ─────────── fixtures (Lucky Cement excerpts) ─────────── */

const SITE_CONFIG = {
  globalParams: {
    live: { p1000009: 'WHR kW', p1000010: 'WHR kVar', p1000011: 'WHR PF' },
  },
  siteComponents: {
    cards: [
      { unit: 'kW', name: 'Wind Generation - RealTime', objKey: 'live.p10390.value', dataStore: 'live' },
      { unit: 'kWh', name: 'Total Energy Consumed', objKey: 'live.p36.value', dataStore: 'live' },
      { unit: 'kWh', name: 'Genset Energy Today', objKey: 'ed_genset', dataStore: 'processed' },
      { unit: 'W/m²', name: 'Irradiance', objKey: 'live.p993.value', dataStore: 'live' },
      { unit: 'kWh', name: 'PV-SG-CI-01', objKey: 'live.p10012.value', dataStore: 'live' },
      { unit: 'kWh', name: 'PV-SG-CI-03', objKey: 'live.p10012.value', dataStore: 'live' },
    ],
    sldV2: {
      nodes: [
        {
          id: '1',
          data: {
            heading: 'GW-WTG-01',
            keys: [
              { label: 'P', unit: 'kW', param: 'live.p10326.value' },
              { label: 'Q', unit: 'kW', param: 'live.p10370.value' }, // real config error
              { label: 'SOC', unit: '%', param: 'live.p10124.value' },
            ],
          },
        },
        {
          id: '2',
          data: {
            heading: 'BESS',
            keys: [
              { label: 'Q', unit: 'kVar', param: 'live.p10388.value' },
              { label: 'PF', unit: '%', param: 'live.p10389.value' }, // real config error
            ],
          },
        },
        {
          id: '3',
          data: {
            heading: 'WHR Plant',
            keys: [
              { label: 'P', unit: 'kW', param: 'live.p1000009.value' },
              { label: 'Q', unit: 'kVar', param: 'live.p1000010.value' },
              { label: 'PF', unit: '%', param: 'live.p1000011.value' },
            ],
          },
        },
        { id: '4', data: { heading: 'LCL Plant', keys: [{ label: 'P', unit: 'kW', param: 'live.p30.value' }] } },
      ],
      edges: [],
    },
    trends: [
      {
        heading: 'Trend Analysis',
        payload: {
          unit: 'MINUTE', // x-axis granularity — must never become a unit
          aggregations: [
            { param: 'p10500', type: 'line', method: 'avg' },
            { param: 'p10499', type: 'line', method: 'avg' },
          ],
        },
      },
    ],
  },
};

const MAPPING: Record<string, string> = {
  p10390: 'Wind Active Power',
  p36: 'Energy Consumed',
  p993: 'POA Irradiance 4',
  p10012: 'Inverter 3 Energy Day',
  p10326: 'Wind 1 active power',
  p10370: 'Wind 1 reactive power',
  p10124: 'PCS SOC 1',
  p10388: 'PCS Reactive Power',
  p10389: 'PCS PF',
  p1000009: 'Custom Parameter 9',
  p1000010: 'Custom Parameter 10',
  p1000011: 'Custom Parameter 11',
  p30: 'Active Load',
  p10500: 'Bus Frequency',
  p10499: 'Bus Voltage',
  p2: 'PV Energy Day',
  p5032: 'DG 1 energy power [kWh]',
  p5010: 'DG 11 to 16 active power [W]',
  p5016: 'DG 1 to 16 reactive power [VAr]',
  p9999: 'Inverter (Block A)',
};

/** `/protected/data/all` shape: live.data.live.<code> = { value, update_at }. */
const liveData = (entries: Record<string, { value: unknown; update_at?: unknown }>) => ({
  live: { data: { live: entries } },
});

/* ─────────── names ─────────── */

describe('codeFromLivePath', () => {
  it('reads every config spelling', () => {
    expect(codeFromLivePath('live.p10390.value')).toBe('p10390');
    expect(codeFromLivePath('live.p10390')).toBe('p10390');
    expect(codeFromLivePath('p1000005')).toBe('p1000005');
    expect(codeFromLivePath(' live.p30.value ')).toBe('p30');
  });

  it('rejects anything else', () => {
    expect(codeFromLivePath('processed.ed_genset')).toBeNull();
    expect(codeFromLivePath('live.p1.value.extra')).toBeNull();
    expect(codeFromLivePath('')).toBeNull();
    expect(codeFromLivePath(null)).toBeNull();
    expect(codeFromLivePath(42)).toBeNull();
  });
});

describe('parameter names (web parity)', () => {
  const siteNames = buildSiteParamNames(SITE_CONFIG);

  it('reads the site’s globalParams.live names', () => {
    expect(siteNames).toEqual({ p1000009: 'WHR kW', p1000010: 'WHR kVar', p1000011: 'WHR PF' });
    expect(buildSiteParamNames(null)).toEqual({});
    expect(buildSiteParamNames({ globalParams: { live: { p1: '  ', p2: 3 } } })).toEqual({});
  });

  it('site name → params-mapping name → raw code', () => {
    expect(resolveLiveParamName('p1000009', MAPPING, siteNames)).toBe('WHR kW');
    expect(resolveLiveParamName('p10370', MAPPING, siteNames)).toBe('Wind 1 reactive power');
    expect(resolveLiveParamName('explve0', MAPPING, siteNames)).toBe('explve0');
  });

  it('accepts object-shaped mapping entries', () => {
    expect(resolveLiveParamName('p1', { p1: { display: 'Grid Import' } })).toBe('Grid Import');
    expect(resolveLiveParamName('p1', { p1: { name: 'Feeder 2' } })).toBe('Feeder 2');
    expect(resolveLiveParamName('p1', { p1: { display: '' } })).toBe('p1');
  });
});

/* ─────────── units ─────────── */

describe('buildParamUnitIndex — sources (real Lucky Cement config)', () => {
  const index = buildParamUnitIndex(SITE_CONFIG, MAPPING);

  it('1. live cards lend their unit (processed cards are ignored)', () => {
    expect(index.p10390).toBe('kW');
    expect(index.p36).toBe('kWh'); // "Energy Consumed" shows kWh
    expect(index.p993).toBe('W/m²');
    expect(index.p10012).toBe('kWh');
    expect(index.ed_genset).toBeUndefined();
  });

  it('2. SLD node keys, normalised (kVar → kVAr)', () => {
    expect(index.p10326).toBe('kW');
    expect(index.p10124).toBe('%');
    expect(index.p10388).toBe('kVAr');
    expect(index.p30).toBe('kW');
    expect(index.p1000009).toBe('kW');
    expect(index.p1000010).toBe('kVAr');
  });

  it('3. trend payload.unit is a granularity, never a unit', () => {
    expect(index.p10500).toBeUndefined();
    expect(index.p10499).toBeUndefined();
    expect(Object.values(index)).not.toContain('MINUTE');
  });

  it('3. trend aggregations: own unit or a recognised display suffix', () => {
    const cfg = {
      siteComponents: {
        trends: [
          {
            payload: {
              unit: 'HOUR',
              aggregations: [
                { param: 'p1', unit: 'kw' },
                { param: 'live.p2.value', display: 'Bus Voltage (V)' },
                { param: 'p3', display: 'Cost of Total Energy($)' },
                { param: 'p4', unit: 'Minute' },
              ],
            },
          },
        ],
      },
    };
    expect(buildParamUnitIndex(cfg)).toEqual({ p1: 'kW', p2: 'V' });
  });

  it('4. a recognised trailing [unit] / (unit) in the name', () => {
    expect(index.p5032).toBe('kWh');
    expect(index.p5010).toBe('W');
    expect(index.p5016).toBe('VAr');
    expect(index.p9999).toBeUndefined(); // '(Block A)' is not a unit
  });

  it('unknown → absent (the tile shows a bare number)', () => {
    expect(index.p2).toBeUndefined(); // no card / SLD / trend / suffix for it
    expect(buildParamUnitIndex(undefined, MAPPING).p36).toBeUndefined();
    expect(buildParamUnitIndex(null)).toEqual({});
    expect(buildParamUnitIndex('garbage', 42)).toEqual({});
  });
});

describe('buildParamUnitIndex — contradicting units are dropped, never corrected', () => {
  const index = buildParamUnitIndex(SITE_CONFIG, MAPPING);

  it('reactive power tagged kW (GW-WTG-01 Q) → no unit', () => {
    expect(index.p10370).toBeUndefined();
  });

  it('power factors tagged % → no unit (PF is dimensionless)', () => {
    expect(index.p10389).toBeUndefined();
    expect(index.p1000011).toBeUndefined(); // 'WHR PF' via the site name
  });

  it('the SLD key label speaks when the name says nothing', () => {
    const cfg = (unit: string, label: string) => ({
      siteComponents: { sldV2: { nodes: [{ data: { keys: [{ param: 'live.p7.value', unit, label }] } }] } },
    });
    const mapping = { p7: 'Custom Parameter 7' };
    expect(buildParamUnitIndex(cfg('kW', 'Q'), mapping).p7).toBeUndefined();
    expect(buildParamUnitIndex(cfg('kVar', 'Q'), mapping).p7).toBe('kVAr');
    expect(buildParamUnitIndex(cfg('%', 'PF'), mapping).p7).toBeUndefined();
    expect(buildParamUnitIndex(cfg('kWh', 'P'), mapping).p7).toBeUndefined();
    expect(buildParamUnitIndex(cfg('kW', 'P'), mapping).p7).toBe('kW');
  });

  it('energy names reject rate units; active power rejects energy units', () => {
    const card = (code: string, unit: string) => ({
      unit,
      name: 'x',
      objKey: `live.${code}.value`,
      dataStore: 'live',
    });
    const cfg = { siteComponents: { cards: [card('p1', 'kW'), card('p2', 'kWh'), card('p3', 'kWh')] } };
    const index2 = buildParamUnitIndex(cfg, {
      p1: 'Wind 1 daily energy',
      p2: 'Inverter 1 active power',
      p3: 'Grid energy power 1', // says nothing unambiguous → accepted
    });
    expect(index2).toEqual({ p3: 'kWh' });
  });

  it('a rejected candidate falls through to the next source', () => {
    const cfg = {
      siteComponents: {
        sldV2: { nodes: [{ data: { keys: [{ param: 'live.p8.value', unit: 'kW', label: 'Q' }] } }] },
      },
    };
    expect(buildParamUnitIndex(cfg, { p8: 'Feeder reactive power (kVAr)' }).p8).toBe('kVAr');
  });
});

describe('buildParamUnitIndex — precedence card > SLD > trend > name', () => {
  const mapping = { p1: 'Meter 1 (MWh)' };
  const cardCfg = { unit: 'kWh', name: 'Meter', objKey: 'live.p1.value', dataStore: 'live' };
  const sldCfg = { nodes: [{ data: { keys: [{ param: 'live.p1.value', unit: 'Wh', label: 'E' }] } }] };
  const trendCfg = [{ payload: { aggregations: [{ param: 'p1', unit: 'GWh' }] } }];

  it('takes the highest-trust source present', () => {
    expect(
      buildParamUnitIndex({ siteComponents: { cards: [cardCfg], sldV2: sldCfg, trends: trendCfg } }, mapping).p1,
    ).toBe('kWh');
    expect(buildParamUnitIndex({ siteComponents: { sldV2: sldCfg, trends: trendCfg } }, mapping).p1).toBe('Wh');
    expect(buildParamUnitIndex({ siteComponents: { trends: trendCfg } }, mapping).p1).toBe('GWh');
    expect(buildParamUnitIndex({}, mapping).p1).toBe('MWh');
  });

  it('a site name overrides the mapping name for the suffix source', () => {
    const cfg = { globalParams: { live: { p1: 'Meter 1' } } };
    expect(buildParamUnitIndex(cfg, mapping).p1).toBeUndefined();
  });
});

/* ─────────── extraction ─────────── */

const extract = (
  entries: Record<string, { value: unknown; update_at?: unknown }>,
  extra: Partial<Parameters<typeof extractLiveParams>[1]> = {},
) => {
  const siteNames = buildSiteParamNames(SITE_CONFIG);
  const unitIndex = buildParamUnitIndex(SITE_CONFIG, MAPPING);
  const list = extractLiveParams(liveData(entries), {
    mapping: MAPPING,
    siteNames,
    unitIndex,
    fetchNow: NOW,
    ...extra,
  });
  return Object.fromEntries(list.map(p => [p.code, p])) as Record<string, LiveParameter>;
};

describe('extractLiveParams — values read exactly like the web', () => {
  const p = extract({
    p5032: { value: 63683837.952, update_at: NOW },
    p10370: { value: -7.68, update_at: NOW },
    p5000: { value: 0, update_at: NOW },
    p5001: { value: 0.001, update_at: NOW },
    p10390: { value: 15239, update_at: NOW },
    p36: { value: 1188413365.85, update_at: NOW },
    p2: { value: '144141.9', update_at: NOW },
    p30: { value: 'NA', update_at: NOW },
    p993: { value: null, update_at: NOW },
    p40: { value: 'Running', update_at: NOW },
    p41: { value: '', update_at: NOW },
  });

  it('2 decimals, en-US grouping, never rescaled', () => {
    expect([p.p5032.displayValue, p.p5032.displayUnit]).toEqual(['63,683,837.95', 'kWh']);
    expect([p.p10370.displayValue, p.p10370.displayUnit]).toEqual(['-7.68', '']);
    expect(p.p5001.displayValue).toBe('0.00'); // rounds to zero — it isn't zero
    expect([p.p10390.displayValue, p.p10390.displayUnit]).toEqual(['15,239.00', 'kW']);
    expect([p.p36.displayValue, p.p36.displayUnit]).toEqual(['1,188,413,365.85', 'kWh']);
    expect(p.p2.displayValue).toBe('144,141.90');
  });

  it('a real 0 is a value, printed bare like the web ("Bus3 kW 0")', () => {
    expect([p.p5000.displayValue, p.p5000.isMissing, p.p5000.numeric]).toEqual(['0', false, 0]);
    const z = extract({
      p10390: { value: 0, update_at: NOW },
      p10370: { value: -0, update_at: NOW },
      p36: { value: '0', update_at: NOW },
    });
    expect([z.p10390.displayValue, z.p10390.displayUnit]).toEqual(['0', 'kW']);
    expect(z.p10390.a11yLabel).toMatch(/^Wind Active Power, 0 kilo\w+, updated just now$/);
    expect(z.p10370.displayValue).toBe('0'); // no '-0'
    expect([z.p36.displayValue, z.p36.displayUnit]).toEqual(['0', 'kWh']);
  });

  it('keeps the untouched number for sorting', () => {
    expect(p.p5032.numeric).toBe(63683837.952);
    expect(p.p2.numeric).toBe(144141.9);
    expect(p.p5000.numeric).toBe(0);
  });

  it('missing → muted dash with no unit; a text reading stays verbatim', () => {
    expect([p.p30.displayValue, p.p30.displayUnit, p.p30.isMissing]).toEqual(['—', '', true]);
    expect([p.p993.displayValue, p.p993.isMissing]).toEqual(['—', true]);
    expect(p.p41.isMissing).toBe(true);
    expect([p.p40.displayValue, p.p40.isMissing, p.p40.numeric]).toEqual(['Running', false, null]);
    expect(p.p30.a11yLabel).toBe('Active Load, no data, updated just now');
  });

  it('flags long numbers for the smaller value size', () => {
    expect(p.p36.longValue).toBe(true); // '1,188,413,365.85'
    expect(p.p5032.longValue).toBe(true); // '63,683,837.95' (13 chars)
    expect(p.p10390.longValue).toBe(false); // '15,239.00'
  });
});

/**
 * Real pairs captured in ONE tick from the web "Live parameters" page for
 * Lucky Cement (2026-10-01 16:35:01): raw API value → the text the web
 * printed, and the name the web showed. The app must print the same.
 * Zero: the web prints an exact 0 bare ('Bus3 kW 0', 'Captive Plant kW 0'
 * next to 'Captive Plant PF 1.00' on the same page), not '0.00'.
 */
const WEB_PARITY: Array<[code: string, mappedName: string, raw: number, webName: string, webText: string]> = [
  ['p42', 'Inverter 1 active power', 797.667, 'Inverter 1 active power', '797.67'],
  ['p74', 'Inverter 1 reactive power', -11.051, 'Inverter 1 reactive power', '-11.05'],
  ['p46', 'Inverter 5 active power', 859.398, 'Inverter 5 active power', '859.40'],
  ['p10012', 'Inverter 3 Energy Day', 15978.3, 'Inverter 3 Energy Day', '15,978.30'],
  ['p106', 'Inverter 1 energy produced total', 17228284, 'Inverter 1 energy produced total', '17,228,284.00'],
  ['p1000007', 'Custom Parameter 7', 1, 'Captive Plant PF', '1.00'],
  ['p1000011', 'Custom Parameter 11', 0.936, 'WHR PF', '0.94'],
  ['p1000008', 'Custom Parameter 8', 417720006.85, 'Captive Plant Energy', '417,720,006.85'],
  ['p1000009', 'Custom Parameter 9', 11999.67, 'WHR kW', '11,999.67'],
  ['p1000001', 'Custom Parameter 1', 115.61599999999999, 'Bus3 kW', '115.62'],
  ['p1000002', 'Custom Parameter 2', -14.103000000000065, 'Bus3 kVar', '-14.10'],
  ['p1000003', 'Custom Parameter 3', 212611792.896, 'Bus3 Import Energy', '212,611,792.90'],
  ['p1000013', 'Custom Parameter 13', -28.698, 'Cap Bank kW', '-28.70'],
  ['p10372', 'Wind 3 reactive power', 0, 'Wind 3 reactive power', '0'],
  ['p10374', 'Wind 5 reactive power', 16.65, 'Wind 5 reactive power', '16.65'],
  ['p5032', 'DG 1 energy power [kWh]', 63683837.952, 'DG 1 energy power [kWh]', '63,683,837.95'],
  ['p5042', 'DG 11 to 16 energy power [kWh]', 299596709.888, 'DG 11 to 16 energy power [kWh]', '299,596,709.89'],
  ['p5010', 'DG 11 to 16 active power [W]', 12067.729, 'DG 11 to 16 active power [W]', '12,067.73'],
  ['p5017', 'DG 2 to 16 reactive power [VAr]', -47.089, 'DG 2 to 16 reactive power [VAr]', '-47.09'],
  ['p10499', 'Bus Voltage', 6289.899, 'Bus Voltage', '6,289.90'],
  ['p10500', 'Bus Frequency', 49.745, 'Bus Frequency', '49.75'],
  ['p10498', 'SVG ReActive Power', -7279.221, 'SVG ReActive Power', '-7,279.22'],
  ['p10389', 'PCS PF', -0.005, 'PCS PF', '-0.01'],
  ['p36', 'Energy Consumed', 1188428701.45, 'Energy Consumed', '1,188,428,701.45'],
  ['p24', 'PV Energy', 142809352, 'PV Energy', '142,809,352.00'],
  ['p991', 'Grid PF', 0.785, 'Grid PF', '0.79'],
  ['p652', 'Wind speed', 3.2, 'Wind speed', '3.20'],
];

const REAL_GLOBAL_PARAMS = {
  live: {
    p1000001: 'Bus3 kW',
    p1000002: 'Bus3 kVar',
    p1000003: 'Bus3 Import Energy',
    p1000004: 'Bus3 Export Energy',
    p1000005: 'Captive Plant kW',
    p1000006: 'Captive Plant kVar',
    p1000007: 'Captive Plant PF',
    p1000008: 'Captive Plant Energy',
    p1000009: 'WHR kW',
    p1000010: 'WHR kVar',
    p1000011: 'WHR PF',
    p1000012: 'WHR Energy',
    p1000013: 'Cap Bank kW',
    p1000014: 'Cap Bank kVar',
  },
};

describe('web-portal parity (real Lucky Cement snapshot)', () => {
  const config = { ...SITE_CONFIG, globalParams: REAL_GLOBAL_PARAMS };
  const mapping = Object.fromEntries(WEB_PARITY.map(([code, name]) => [code, name]));
  const siteNames = buildSiteParamNames(config);
  const list = extractLiveParams(
    liveData(Object.fromEntries(WEB_PARITY.map(([code, , raw]) => [code, { value: raw, update_at: NOW }]))),
    { mapping, siteNames, unitIndex: buildParamUnitIndex(config, mapping), fetchNow: NOW },
  );
  const byCode = Object.fromEntries(list.map(p => [p.code, p]));

  it.each(WEB_PARITY)('%s prints exactly the web’s number and name', (code, _mapped, _raw, webName, webText) => {
    expect(byCode[code].displayValue).toBe(webText);
    expect(resolveLiveParamName(code, mapping, siteNames)).toBe(webName);
  });

  it('an implausible register (2.66e36) keeps its number in e-notation, flagged', () => {
    const p = extract({ p10391: { value: 2.66422190032497e36, update_at: NOW } }).p10391;
    expect(p.numeric).toBe(2.66422190032497e36); // untouched
    expect([p.displayValue, p.displayUnit, p.implausible]).toEqual(['2.66e36', '', true]);
    expect(p.a11yLabel).toBe(
      'p10391, 2.66 times 10 to the power 36, implausible reading, updated just now',
    );
    const neg = extract({ p36: { value: -1.2e18, update_at: NOW } }).p36;
    expect([neg.displayValue, neg.displayUnit, neg.longValue]).toEqual(['-1.2e18', 'kWh', false]);
    expect(extract({ p36: { value: 9.99e14, update_at: NOW } }).p36.implausible).toBe(false);
  });
});

describe('extractLiveParams — names, categories', () => {
  const p = extract({
    p1000009: { value: 11906.46, update_at: NOW },
    p5010: { value: 12185.603, update_at: NOW },
    p10389: { value: -0.993, update_at: NOW },
    p10500: { value: 49.821, update_at: NOW },
    explve0: { value: 4057.901, update_at: NOW },
  });

  it('uses the site name and strips a suffix only when that unit is shown', () => {
    expect(p.p1000009.name).toBe('WHR kW');
    expect(p.p5010.name).toBe('DG 11 to 16 active power');
    expect(p.p5010.displayUnit).toBe('W');
    expect(p.explve0.name).toBe('explve0');
  });

  it('keeps a name suffix that conflicts with the shown unit', () => {
    const q = extractLiveParams(liveData({ p1: { value: 1, update_at: NOW } }), {
      mapping: { p1: 'Feeder 1 (MWh)' },
      unitIndex: { p1: 'kWh' },
      fetchNow: NOW,
    })[0];
    expect([q.name, q.displayUnit]).toEqual(['Feeder 1 (MWh)', 'kWh']);
  });

  it('classifies by name (energy before power), monochrome labels', () => {
    expect(p.p1000009.category).toBe('power');
    expect(p.p10389.category).toBe('power');
    expect(p.p10500.category).toBe('frequency');
    expect(p.p10500.categoryLabel).toBe('Frequency');
    expect(classifyLiveCategory('Active Energy Import (kWh)')).toBe('energy');
    expect(classifyLiveCategory('Reactive Energy')).toBe('energy');
    expect(classifyLiveCategory('Bus Voltage')).toBe('voltage');
    expect(classifyLiveCategory('Module Temperature 2')).toBe('temperature');
    expect(classifyLiveCategory('Wind speed')).toBe('other');
  });

  it('returns [] for malformed payloads', () => {
    expect(extractLiveParams(null, { fetchNow: NOW })).toEqual([]);
    expect(extractLiveParams({ live: { data: {} } }, { fetchNow: NOW })).toEqual([]);
    expect(extractLiveParams({ live: [] }, { fetchNow: NOW })).toEqual([]);
  });
});

describe('extractLiveParams — honest ages (as of the fetch)', () => {
  const yesterday = new Date(2026, 8, 30, 14, 0, 0).getTime();
  const p = extract({
    p2: { value: 144141.9, update_at: NOW - 2 * HOUR },
    p10390: { value: 15239, update_at: NOW - 3 * MIN },
    p36: { value: 1, update_at: NOW - 16 * MIN },
    p993: { value: 409, update_at: NOW + MIN }, // backend clock 1 min ahead
    p30: { value: 1, update_at: NOW + 10 * MIN }, // beyond the 5 min skew
    p10326: { value: 1, update_at: yesterday },
    p10124: { value: 76 },
    p10388: { value: 502, update_at: Math.floor((NOW - 5 * MIN) / 1000) }, // epoch seconds
  });

  it('relative under 24 h, never a bare clock time', () => {
    expect(p.p2.displayTime).toBe('2 h ago');
    expect(p.p10390.displayTime).toBe('3 min ago');
    expect(p.p993.displayTime).toBe('Just now');
    expect(p.p10388.displayTime).toBe('5 min ago');
  });

  it('date + time once a reading is a day old', () => {
    expect(p.p10326.displayTime.startsWith('30 Sep, ')).toBe(true);
    expect(p.p10326.displayTime).not.toMatch(/ago/);
  });

  it('stale = older than FRESH_LIVE_MS (30 min, web parity) at fetch time', () => {
    expect(p.p2.stale).toBe(true);
    expect(p.p36.stale).toBe(false); // 16 min old: still "online" on the web
    expect(p.p10326.stale).toBe(true);
    expect(p.p10390.stale).toBe(false);
    expect(p.p993.stale).toBe(false);
  });

  it('unknown time: missing or too far in the future — never "Just now"', () => {
    expect([p.p30.displayTime, p.p30.updateAt, p.p30.stale]).toEqual(['Time unknown', null, false]);
    expect([p.p10124.displayTime, p.p10124.updateAt]).toEqual(['Time unknown', null]);
  });

  it('one composed screen-reader label per tile', () => {
    expect(p.p2.a11yLabel).toBe('PV Energy Day, 144,141.90, updated 2 hours ago, stale');
    expect(p.p10390.a11yLabel).toBe('Wind Active Power, 15,239.00 kilowatts, updated 3 minutes ago');
    expect(p.p36.a11yLabel).toBe('Energy Consumed, 1.00 kilowatt hours, updated 16 minutes ago');
    expect(p.p10124.a11yLabel).toBe('PCS SOC 1, 76.00 percent, update time unknown');
    expect(p.p10326.a11yLabel).toMatch(/^Wind 1 active power, 1\.00 kilowatts, updated 30 Sep, .+, stale$/);
  });

  it('newestUpdateAt ignores unknown times', () => {
    expect(newestUpdateAt(Object.values(p))).toBe(NOW + MIN);
    expect(newestUpdateAt([])).toBeNull();
  });

  it('ages are anchored to fetchNow, not the wall clock', () => {
    const later = extract({ p10390: { value: 1, update_at: NOW - 3 * MIN } }, { fetchNow: NOW + HOUR });
    expect(later.p10390.displayTime).toBe('1 h ago');
    expect(later.p10390.stale).toBe(true);
  });
});

/* ─────────── sort ─────────── */

const row = (code: string, name: string, numeric: number | null, updateAt: number | null): LiveParameter => ({
  code,
  name,
  searchText: `${name} ${code}`.toLowerCase(),
  numeric,
  updateAt,
  ageMs: updateAt === null ? null : NOW - updateAt,
  stale: updateAt !== null && NOW - updateAt > 15 * MIN,
  category: classifyLiveCategory(name),
  categoryLabel: '',
  displayValue: numeric === null ? '—' : String(numeric),
  displayUnit: '',
  isMissing: numeric === null,
  implausible: false,
  longValue: false,
  displayTime: '',
  a11yLabel: name,
});

const ROWS = [
  row('a', 'Inverter 10 active power', 50, NOW - 1 * MIN),
  row('b', 'Inverter 2 active power', 300, NOW - 3 * HOUR),
  row('c', 'inverter 1 active power', null, NOW - 30 * MIN),
  row('d', 'Inverter 3 active power', -20, null),
  row('e', 'Inverter 4 active power', 300, NOW - 2 * MIN),
];
const order = (key: LiveSortKey) => [...ROWS].sort(compareLiveParams(key)).map(r => r.code);

describe('sorting', () => {
  it('Name A→Z, numeric-aware and case-insensitive', () => {
    expect(order('name')).toEqual(['c', 'b', 'd', 'e', 'a']);
  });

  it('Value high→low / low→high; missing values always last; ties by name', () => {
    expect(order('valueDesc')).toEqual(['b', 'e', 'a', 'd', 'c']);
    expect(order('valueAsc')).toEqual(['d', 'a', 'b', 'e', 'c']);
  });

  it('Recently updated first; unknown time last', () => {
    expect(order('recent')).toEqual(['a', 'e', 'c', 'b', 'd']);
  });

  it('Stale first: unknown time, then oldest → newest', () => {
    expect(order('staleFirst')).toEqual(['d', 'b', 'c', 'e', 'a']);
  });

  it('the control cycles all five orders and wraps', () => {
    expect(LIVE_SORT_ORDER).toEqual(['name', 'valueDesc', 'valueAsc', 'recent', 'staleFirst']);
    let k: LiveSortKey = 'name';
    const seen: LiveSortKey[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(k);
      k = nextLiveSort(k);
    }
    expect(seen).toEqual([...LIVE_SORT_ORDER]);
    expect(k).toBe('name');
  });
});

/* ─────────── grid model ─────────── */

const PARAMS = [
  row('e1', 'PV Energy Day', 10, NOW),
  row('e2', 'Energy Consumed', 20, NOW),
  row('p1', 'Wind Active Power', 30, NOW),
  row('p2', 'Grid Active Power', 40, NOW),
  row('p3', 'Grid PF', 1, NOW),
  row('f1', 'Bus Frequency', 49.8, NOW),
];

const grid = (over: Partial<Parameters<typeof buildLiveGrid>[0]> = {}) =>
  buildLiveGrid({
    params: PARAMS,
    query: '',
    pickedCategory: null,
    searchScope: 'all',
    sortKey: 'name',
    ...over,
  });

describe('buildLiveGrid — normal mode (one category)', () => {
  it('defaults to Energy and titles "Energy · n of total"', () => {
    const g = grid();
    expect(g.searching).toBe(false);
    expect(g.activeCategory).toBe('energy');
    expect(g.tiles.map(t => t.code)).toEqual(['e2', 'e1']);
    expect(g.title).toBe('Energy · 2 of 6');
    expect(g.categories).toEqual(['energy', 'power', 'frequency']);
    expect(g.counts.power).toBe(3);
  });

  it('honours a pick only while its category has parameters', () => {
    expect(grid({ pickedCategory: 'power' }).title).toBe('Power · 3 of 6');
    expect(grid({ pickedCategory: 'voltage' }).activeCategory).toBe('energy');
  });

  it('default falls back Energy → Power → first non-empty', () => {
    const counts = countLiveCategories(PARAMS);
    expect(defaultLiveCategory(counts)).toBe('energy');
    expect(defaultLiveCategory({ ...counts, energy: 0 })).toBe('power');
    expect(defaultLiveCategory({ ...counts, energy: 0, power: 0 })).toBe('frequency');
    expect(defaultLiveCategory(countLiveCategories([]))).toBeNull();
    expect(grid({ params: [] }).title).toBe('Live parameters');
  });

  it('applies the sort inside the category', () => {
    expect(grid({ pickedCategory: 'power', sortKey: 'valueDesc' }).tiles.map(t => t.code)).toEqual([
      'p2',
      'p1',
      'p3',
    ]);
  });
});

describe('buildLiveGrid — search spans ALL categories', () => {
  it('searching "frequency" while Energy is selected finds frequency', () => {
    const g = grid({ pickedCategory: 'energy', query: 'frequency' });
    expect(g.searching).toBe(true);
    expect(g.tiles.map(t => t.code)).toEqual(['f1']);
    expect(g.title).toBe('1 match');
  });

  it('pills show match counts; the pill set stays stable', () => {
    const g = grid({ query: 'power' });
    expect(g.categories).toEqual(['energy', 'power', 'frequency']);
    expect(g.counts).toMatchObject({ energy: 0, power: 2, frequency: 0 });
    expect(g.matchTotal).toBe(2);
    expect(g.title).toBe('2 matches');
  });

  it('groups results by category, then the sort', () => {
    const g = grid({ query: 'e', sortKey: 'valueDesc' });
    expect(g.tiles.map(t => t.code)).toEqual(['e2', 'e1', 'p2', 'p1', 'f1']);
    expect(g.tiles.map(t => t.category)).toEqual(['energy', 'energy', 'power', 'power', 'frequency']);
  });

  it('a scope pill narrows; a scope with no match falls back to all', () => {
    const narrowed = grid({ query: 'grid', searchScope: 'power' });
    expect(narrowed.scope).toBe('power');
    expect(narrowed.title).toBe('Power · 2 of 2 matches');
    const empty = grid({ query: 'grid', searchScope: 'energy' });
    expect(empty.scope).toBe('all');
  });

  it('matches codes and is case-insensitive; whitespace-only is not a search', () => {
    expect(grid({ query: 'P3' }).tiles.map(t => t.code)).toEqual(['p3']);
    expect(grid({ query: '   ' }).searching).toBe(false);
  });

  it('no match → empty tiles with a zero title', () => {
    const g = grid({ query: 'zzz' });
    expect(g.tiles).toEqual([]);
    expect(g.title).toBe('0 matches');
  });
});

/* ─────────── LiveParameterView (rendered) ─────────── */

const mockState: {
  live: unknown;
  config: unknown;
  mapping: unknown;
  dataUpdatedAt: number;
  isError: boolean;
  error: unknown;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  live: undefined,
  config: undefined,
  mapping: null,
  dataUpdatedAt: 0,
  isError: false,
  error: null,
  isFetching: false,
  refetch: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return {
    ...actual,
    useRoute: () => ({ params: { siteId: 'lucky-cement-nooriabad' } }),
    useIsFocused: () => true,
  };
});

jest.mock('src/hooks', () => {
  const actual = jest.requireActual('src/hooks') as object;
  return {
    ...actual,
    useInteractionReady: () => true,
    useParamsMapping: () => mockState.mapping,
    useSiteConfig: () => ({ data: mockState.config }),
    useSiteData: () => ({
      data: mockState.live,
      dataUpdatedAt: mockState.dataUpdatedAt,
      error: mockState.error,
      isLoading: false,
      isFetching: mockState.isFetching,
      isError: mockState.isError,
      refetch: mockState.refetch,
    }),
  };
});

// Imported after the mocks (jest hoists jest.mock above imports anyway).
import LiveParameterView from '../src/components/screens/Authenticated/SiteDetail/components/LiveParameterView';

const textOf = (node: ReactTestInstance): string => {
  const c = node.props.children;
  if (Array.isArray(c)) return c.filter(x => typeof x === 'string' || typeof x === 'number').join('');
  return typeof c === 'string' || typeof c === 'number' ? String(c) : '';
};

describe('LiveParameterView (rendered, Lucky Cement excerpt)', () => {
  let tree: ReactTestRenderer | undefined;
  const render = () => {
    act(() => {
      tree = renderer.create(React.createElement(LiveParameterView));
    });
    return (tree as ReactTestRenderer).root;
  };
  const texts = (root: ReactTestInstance) => root.findAllByType(Text).map(textOf).filter(Boolean);
  const radios = (root: ReactTestInstance) =>
    root.findAllByType(Pressable).filter(n => n.props.accessibilityRole === 'radio');
  /** Host Views that are one accessible tile (not the header status line). */
  const tiles = (root: ReactTestInstance) =>
    root
      .findAll(
        n =>
          typeof n.type === 'string' &&
          n.props.accessible === true &&
          typeof n.props.accessibilityLabel === 'string',
      )
      .map(n => n.props.accessibilityLabel as string)
      .filter(l => /, updated |update time unknown/.test(l))
      .filter(l => !/^(Live|Delayed|No data for|Last update)/.test(l));
  /** Invisible grid spacers (tile flex style, not an accessible tile). */
  const spacers = (root: ReactTestInstance) =>
    root.findAll(
      n =>
        (n.type as unknown) === 'View' &&
        n.props.accessible !== true &&
        StyleSheet.flatten(n.props.style)?.flexBasis === '40%',
    );
  const byLabel = (root: ReactTestInstance, label: string) =>
    root.findAllByType(Pressable).find(n => n.props.accessibilityLabel === label) as ReactTestInstance;

  const live = (agoMs: Record<string, number>) => {
    const now = Date.now();
    const values: Record<string, number> = {
      p2: 144141.9,
      p36: 1188413365.85,
      p10390: 15239,
      p10370: -7.68,
      p10500: 49.821,
    };
    return liveData(
      Object.fromEntries(
        Object.entries(values).map(([code, value]) => [
          code,
          { value, update_at: now - (agoMs[code] ?? 90_000) },
        ]),
      ),
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockState.config = SITE_CONFIG;
    mockState.mapping = MAPPING;
    mockState.dataUpdatedAt = Date.now();
    mockState.isError = false;
    mockState.error = null;
    mockState.isFetching = false;
    mockState.refetch = jest.fn();
  });
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    jest.useRealTimers();
  });

  it('header, monochrome radio pills, honest tile ages and units', () => {
    mockState.live = live({ p36: 2 * HOUR + 10 * MIN });
    const root = render();
    const t = texts(root);

    expect(t).toContain('Energy · 2 of 5');
    expect(t).toContain('Live · 1 min ago'); // newest reading (90 s) is live
    expect(radios(root).map(r => [r.props.accessibilityLabel, r.props.accessibilityState.selected])).toEqual([
      ['Energy, 2', true],
      ['Power, 2', false],
      ['Frequency, 1', false],
    ]);

    // Energy tiles, name order; the stale one says so.
    expect(tiles(root)).toEqual([
      'Energy Consumed, 1,188,413,365.85 kilowatt hours, updated 2 hours ago, stale',
      'PV Energy Day, 144,141.90, updated 1 minute ago',
    ]);
    expect(t).toContain('2 h ago');
    expect(t).toContain('1 min ago');
    expect(t).toContain('kWh');
    // No bare clock time anywhere ('02:31 pm').
    expect(t.some(s => /\b\d{1,2}:\d{2}\s?(am|pm)\b/i.test(s))).toBe(false);
  });

  it('the status line uses the header’s site-level sync stamp, not the newest parameter', () => {
    // Lucky Cement on 2026-10-01: last sync 40 min ago (web: 'WARNING · 41
    // MINUTES'), while single parameters updated a minute ago.
    const fast = live({});
    mockState.live = {
      // +45 s: the shared ticker's cached time may lag Date.now() by < 30 s.
      live: { ...fast.live, metadata: { last_update: Date.now() - 40 * MIN - 45_000 } },
    };
    const root = render();
    const t = texts(root);
    expect(t).toContain('Last data 40 min ago');
    expect(t.some(s => s.startsWith('Live'))).toBe(false);
    // Per-tile ages stay per parameter.
    expect(tiles(root)).toContain('PV Energy Day, 144,141.90, updated 1 minute ago');
  });

  it('the header stops claiming LIVE when every reading is stale', () => {
    const old = 2 * HOUR + 10 * MIN;
    mockState.live = live({ p2: old, p36: old, p10390: old, p10370: old, p10500: old });
    const t = texts(render());
    expect(t).toContain('Last data 2 h ago');
    expect(t.some(s => s.startsWith('Live'))).toBe(false);
  });

  it('tile ages re-anchor every 5 min while the tab stays open without a refetch', () => {
    // The RN jest mock's AppState.currentState is a jest.fn — say 'active'
    // so the shared useNow ticker actually runs.
    const appState = AppState as unknown as { currentState: unknown };
    const prevState = appState.currentState;
    appState.currentState = 'active';
    try {
      mockState.live = live({});
      const root = render();
      expect(tiles(root)).toContain('PV Energy Day, 144,141.90, updated 1 minute ago');
      act(() => {
        jest.advanceTimersByTime(35 * MIN); // no refetch: dataUpdatedAt unchanged
      });
      const label = tiles(root).find(l => l.startsWith('PV Energy Day'));
      // Anchored to the latest 5-min bucket: 31.5–36.5 min old, now stale
      // (past FRESH_LIVE_MS = 30 min).
      expect(label).toMatch(/^PV Energy Day, 144,141\.90, updated (3[1-7]) minutes ago, stale$/);
      expect(texts(root).some(s => s.startsWith('Live'))).toBe(false);
    } finally {
      appState.currentState = prevState;
    }
  });

  it('a 30 s tick inside the same 5-min bucket re-derives nothing (tiles keep their props)', () => {
    const appState = AppState as unknown as { currentState: unknown };
    const prevState = appState.currentState;
    appState.currentState = 'active';
    try {
      const BUCKET = 5 * MIN;
      // 60 s into a fresh bucket (≥ 30 s away from the ticker's cached time).
      jest.setSystemTime(Math.floor(Date.now() / BUCKET) * BUCKET + BUCKET + 60_000);
      mockState.dataUpdatedAt = Date.now();
      mockState.live = live({});
      const root = render();
      const tileProps = () =>
        root.findAll(n => typeof n.type === 'string' && /^PV Energy Day, /.test(n.props.accessibilityLabel ?? ''))[0]
          .props;
      const before = tileProps();
      act(() => {
        jest.advanceTimersByTime(30_000); // one shared tick, same bucket
      });
      expect(tileProps()).toBe(before);
      act(() => {
        jest.advanceTimersByTime(BUCKET); // crosses the bucket boundary
      });
      expect(tileProps()).not.toBe(before);
    } finally {
      appState.currentState = prevState;
    }
  });

  it('one sort control cycles the five orders (accessibilityValue)', () => {
    mockState.live = live({});
    const root = render();
    // Visibly a sort control, not another category chip.
    expect(texts(root)).toEqual(expect.arrayContaining(['Sort:', 'Name']));
    const sortValue = () =>
      root.findAllByType(Pressable).find(n => /^Sort, /.test(n.props.accessibilityLabel ?? ''))?.props
        .accessibilityValue.text;
    expect(sortValue()).toBe('Name, A to Z');
    const press = () =>
      act(() => {
        root.findAllByType(Pressable).find(n => /^Sort, /.test(n.props.accessibilityLabel ?? ''))?.props.onPress();
      });
    press();
    expect(sortValue()).toBe('Value, high to low');
    press();
    press();
    press();
    expect(sortValue()).toBe('Stale first');
    press();
    expect(sortValue()).toBe('Name, A to Z');
  });

  it('search spans every category, tags tiles, and clears back', () => {
    mockState.live = live({});
    const root = render();
    act(() => {
      root.findByType(TextInput).props.onChangeText('frequency');
    });
    act(() => {
      jest.advanceTimersByTime(250);
    });
    const t = texts(root);
    expect(t).toContain('1 match');
    expect(radios(root).map(r => [r.props.accessibilityLabel, r.props.accessibilityState])).toEqual([
      ['All, 1', expect.objectContaining({ selected: true })],
      ['Energy, 0', expect.objectContaining({ selected: false, disabled: true })],
      ['Power, 0', expect.objectContaining({ selected: false, disabled: true })],
      ['Frequency, 1', expect.objectContaining({ selected: false, disabled: false })],
    ]);
    expect(tiles(root)).toEqual(['Bus Frequency, 49.82, updated 1 minute ago, Frequency']);

    act(() => {
      byLabel(root, 'Clear search').props.onPress();
    });
    expect(texts(root)).toContain('Energy · 2 of 5');
  });

  it('tiles mount MOUNT_CHUNK per frame and the reveal restarts on sort', () => {
    const now = Date.now();
    mockState.live = liveData(
      Object.fromEntries(
        Array.from({ length: 45 }, (_, i) => [`e${i}`, { value: i, update_at: now - 90_000 }]),
      ),
    );
    mockState.mapping = Object.fromEntries(
      Array.from({ length: 45 }, (_, i) => [`e${i}`, `Meter ${i} energy`]),
    );
    const root = render();
    expect(tiles(root)).toHaveLength(20); // first commit: one chunk only
    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(tiles(root)).toHaveLength(40);
    expect(spacers(root)).toHaveLength(0);
    act(() => {
      jest.advanceTimersByTime(16);
    });
    expect(tiles(root)).toHaveLength(45);
    // Odd count: the last tile gets an invisible twin (keeps column width).
    expect(spacers(root)).toHaveLength(1);

    act(() => {
      root.findAllByType(Pressable).find(n => /^Sort, /.test(n.props.accessibilityLabel ?? ''))?.props.onPress();
    });
    expect(tiles(root)).toHaveLength(20); // restarted — no 45-tile commit
    expect(tiles(root)[0]).toMatch(/^Meter 44 energy, 44\.00/); // Highest first
    for (let frame = 0; frame < 3; frame++) {
      act(() => {
        jest.advanceTimersByTime(16); // one rAF chunk per committed frame
      });
    }
    expect(tiles(root)).toHaveLength(45);
  });

  it('load error with no data: friendly copy + Retry', () => {
    mockState.live = undefined;
    mockState.isError = true;
    mockState.error = { isAxiosError: true, response: { status: 500 } };
    const root = render();
    const t = texts(root);
    expect(t).toContain("Our servers aren't responding");
    expect(t.some(s => /500/.test(s))).toBe(false);
    expect(root.findAllByType(TextInput)).toHaveLength(0); // nothing to search
    act(() => {
      byLabel(root, 'Retry').props.onPress();
    });
    expect(mockState.refetch).toHaveBeenCalledTimes(1);
  });

  it('refresh failed over cached data: ONE strip in the shell’s words, the grid stays', () => {
    // The shell hides its own strip on Live while errored
    // (TABS_WITH_OWN_REFRESH_STATUS) — this is the only notice there.
    mockState.live = live({});
    mockState.isError = true;
    mockState.error = { isAxiosError: true, request: {}, response: undefined };
    const root = render();
    expect(texts(root)).toContain('Offline · showing the last data received');
    expect(tiles(root)).toHaveLength(2);
    act(() => {
      byLabel(root, 'Retry').props.onPress();
    });
    expect(mockState.refetch).toHaveBeenCalledTimes(1);
    act(() => tree?.unmount());

    mockState.error = { isAxiosError: true, response: { status: 503 } };
    const t = texts(render());
    expect(t).toContain("Couldn't refresh · showing the last data received");
    expect(t.some(s => /503/.test(s))).toBe(false);
  });

  it('no strip while the retry is in flight or when nothing failed', () => {
    mockState.live = live({});
    mockState.isError = true;
    mockState.isFetching = true;
    mockState.error = { isAxiosError: true, response: { status: 503 } };
    expect(texts(render()).some(s => /showing the last data/.test(s))).toBe(false);
    act(() => tree?.unmount());
    mockState.isError = false;
    mockState.isFetching = false;
    mockState.error = null;
    expect(texts(render()).some(s => /showing the last data/.test(s))).toBe(false);
  });
});
