/**
 * Energy-source helpers: compact numbers, the source matcher (short tags
 * must be whole tokens) and the card-period parser (derived ONLY from what
 * the backend card says).
 */
import { describe, expect, it } from '@jest/globals';
import {
  findSourceForColumn,
  formatCompact,
  numericCardValue,
  PERIOD_LABEL,
  periodFromCard,
  periodFromName,
  shortSourceLabel,
  SOURCE_ORDER,
  sourceTokenFromName,
} from '../src/utils/sources';

describe('formatCompact', () => {
  it.each([
    [15642, '15.6K'],
    [1049999, '1.05M'],
    [17000, '17K'],
    [850, '850'],
    [999.95, '1.00K'],
    [121393.6, '121K'],
    [-121393.6, '-121K'],
    [1_005_727_768, '1.01B'],
    [0, '0'],
    [0.0001, '<0.001'],
    ['15642', '15.6K'],
  ])('%p → %p', (input, out) => {
    expect(formatCompact(input as number | string)).toBe(out);
  });

  it.each(['NA', '', null, undefined, NaN, Infinity])('%p → "—"', v => {
    expect(formatCompact(v as never)).toBe('—');
  });
});

describe('sourceTokenFromName', () => {
  it.each([
    ['ed_pv', 'solar'],
    ['pv1', 'solar'],
    ['PV-SG-CI-01', 'solar'],
    ['PV Energy Today', 'solar'],
    ['ed_solar', 'solar'],
    ['Wind Energy Today', 'wind'],
    ['Grid Import', 'grid'],
    ['DG-1 Power', 'genset'],
    ['Genset Energy Today', 'genset'],
    ['BESS SOC', 'battery'],
    ['Battery Discharge', 'battery'],
  ])('%p → %p', (name, token) => {
    expect(sourceTokenFromName(name)).toBe(token);
  });

  it.each(['Bridge load', 'Edge meter', 'Industrial consumption', 'Total Load', 'spvx'])(
    '%p → undefined (no letter-embedded tags)',
    name => {
      expect(sourceTokenFromName(name)).toBeUndefined();
    },
  );

  it('report columns (the VALUE path) keep the original substring matching', () => {
    // Which columns are summed into each Reports bucket must not change
    // (web parity, O1) — so findSourceForColumn is NOT word-bounded.
    expect(findSourceForColumn('ed_solar')).toBe('solar');
    expect(findSourceForColumn('et_solar')).toBe('solar');
    expect(findSourceForColumn('ed_pv')).toBe('solar');
    expect(findSourceForColumn('et_grid_import')).toBe('grid');
    expect(findSourceForColumn('ed_wind')).toBe('wind');
    expect(findSourceForColumn('et_dg')).toBe('genset');
    expect(findSourceForColumn('ed_dg1')).toBe('genset');
    expect(findSourceForColumn('hi_bess')).toBe('battery');
    expect(findSourceForColumn('time')).toBeUndefined();
    // Letter-embedded tags still count toward the totals, exactly as before.
    expect(findSourceForColumn('ed_spv')).toBe('solar');
    expect(findSourceForColumn('spv_energy')).toBe('solar');
    expect(findSourceForColumn('ed_pvgen')).toBe('solar');
    expect(findSourceForColumn('pvsyst')).toBe('solar');
    expect(findSourceForColumn('ed_dgset')).toBe('genset');
    expect(findSourceForColumn('ed_bessa')).toBe('battery');
  });

  it('display matcher and value matcher agree on every word-bounded name', () => {
    for (const name of ['ed_pv', 'pv1', 'PV-SG-CI-01', 'ed_solar', 'DG-1 Power', 'BESS SOC', 'Wind Energy Today', 'Grid Import']) {
      expect(findSourceForColumn(name)).toBe(sourceTokenFromName(name));
    }
  });

  it('shortSourceLabel still truncates unknown names', () => {
    expect(shortSourceLabel('Bridge load')).toBe('Bridge load');
    expect(shortSourceLabel('DG-1 Power')).toBe('Genset');
  });
});

describe('periodFromCard', () => {
  it.each([
    ['PV Energy YTD Shams', 'kWh', 'year'],
    ['Grid Energy Today', 'kWh', 'today'],
    ['PV Total Power', 'kW', 'now'],
    ['Total Load', 'kW', 'now'],
    ['Reactive Power', 'kvar', 'now'],
    ['Total Plant Yield', 'kWh', 'lifetime'],
    ['Wind Energy Today', 'kWh', 'today'],
    ['Energy This Month', 'kWh', 'month'],
    ['Weekly Generation', 'kWh', 'week'],
    ['Cumulative Export', 'MWh', 'lifetime'],
    ['Total Energy Today', 'kWh', 'today'],
    // The NAME's period wins over a power unit.
    ['Peak Power Today', 'kW', 'today'],
    ['Max Demand This Month', 'kW', 'month'],
    ['Peak Load Today', 'MW', 'today'],
    ['Daily Peak', 'kW', 'today'],
  ])('(%p, %p) → %p', (name, unit, period) => {
    expect(periodFromCard(name, unit)).toBe(period);
  });

  it.each([
    ['Industrial consumption', 'kWh'],
    ['Total Energy Consumed', 'kWh'],
    ['Irradiance', 'W/m²'],
    ['PV-SG-CI-01', 'kWh'],
  ])('(%p, %p) → undefined (not derivable from the backend name)', (name, unit) => {
    expect(periodFromCard(name, unit)).toBeUndefined();
  });

  it('periodFromName reads ONLY the name — no unit-inferred "now" (O5 captions)', () => {
    expect(periodFromName('Peak Power Today')).toBe('today');
    expect(periodFromName('Max Demand This Month')).toBe('month');
    expect(periodFromName('PV Energy YTD Shams')).toBe('year');
    expect(periodFromName('Total Plant Yield')).toBe('lifetime');
    expect(periodFromName('PV Total Power')).toBeUndefined();
    expect(periodFromName('Wind')).toBeUndefined();
    expect(periodFromName('Total Energy Consumed')).toBeUndefined();
  });

  it('labels every period', () => {
    expect(PERIOD_LABEL).toEqual({
      now: 'Now',
      today: 'Today',
      week: 'This week',
      month: 'This month',
      year: 'This year',
      lifetime: 'Lifetime',
    });
  });
});

describe('misc', () => {
  it('SOURCE_ORDER lists generation first and the grid last', () => {
    expect(SOURCE_ORDER).toEqual(['solar', 'wind', 'battery', 'genset', 'grid']);
  });

  it('numericCardValue is unchanged (values come from the backend verbatim)', () => {
    expect(numericCardValue('14463.03')).toBe(14463.03);
    expect(numericCardValue('NA')).toBeNull();
    expect(numericCardValue(0)).toBe(0);
  });
});
