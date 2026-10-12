/**
 * SLD web twin — the page bridge's port of the web's liveValues hook
 * (scripts/web-twin/bridge.js, section "live values"), run as shipped:
 *
 *  - the flow rule reads like the web's mathjs `evaluate(`${name} ${op} ${value}`)`
 *    for every comparison rule: spaces around the operator, a right-hand
 *    side mathjs can't read as a number ('', ' ', 'abc', '1,000', '10kW')
 *    → idle, true / false / NaN / Infinity / null, signs, and mathjs's
 *    comparison tolerance. Every expectation below was produced by the
 *    web's own mathjs (module 653984 of the web build, loaded through the
 *    vendored turbopack runtime) — a differential run of 15,288 rule cases
 *    found no difference;
 *  - values are formatted like the web ("—", 2 decimals, 0 at ≥ 1000);
 *  - liveValues keeps its identity until the diagram or the live data
 *    change (the web memoises it; the twin samples its readings sparkline
 *    on every new object).
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

interface LiveValues {
  nodeKv: Record<string, Record<string, string>>;
  edgeMode: Record<string, 'flow' | 'idle'>;
  brokenGroups: unknown[];
  brokenRefs: unknown[];
}
interface BridgeLiveValues {
  buildLiveValues: (sld: unknown, store: unknown) => LiveValues | null;
  liveValuesFor: (sld: unknown, live: unknown) => LiveValues | null;
}

const loadSection = (): BridgeLiveValues => {
  const src = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
  const start = src.indexOf('// ---- live values');
  const end = src.indexOf('// ---- redux store');
  if (start < 0 || end < start) throw new Error('bridge.js: the "live values" section markers moved');
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}; return { buildLiveValues, liveValuesFor };`)() as BridgeLiveValues;
};
const bridge = loadSection();

/** edgeMode of one node whose animation rule reads `reading`. */
const mode = (reading: unknown, operator: unknown, value: unknown): 'flow' | 'idle' | undefined => {
  const sld = {
    nodes: [{ id: 'n', data: { keys: [], animation: { animationParams: 'live.p30.value', operator, value } } }],
  };
  return bridge.buildLiveValues(sld, { live: { p30: { value: reading } } })?.edgeMode.n;
};

describe('the flow rule — what the web’s mathjs makes of it', () => {
  it('a right-hand side mathjs cannot read is idle (it throws there)', () => {
    expect(mode(1240.5, '!=', '')).toBe('idle');
    expect(mode(1240.5, '!=', 'abc')).toBe('idle');
    expect(mode(1240.5, '!=', '1,000')).toBe('idle');
    expect(mode(1240.5, '>=', ' ')).toBe('idle');
    expect(mode(1240.5, '>', '10kW')).toBe('idle');
    expect(mode(1240.5, '>', '1_000')).toBe('idle');
    expect(mode(1240.5, '>', '.')).toBe('idle');
    expect(mode(1240.5, '>', 'TRUE')).toBe('idle'); // constants are case-sensitive
  });

  it('spaces / tabs around the operator are fine; a missing operator is !=', () => {
    expect(mode(1240.5, ' > ', 0)).toBe('flow');
    expect(mode(1240.5, '>\t', 0)).toBe('flow');
    expect(mode(1240.5, ' != ', 0)).toBe('flow');
    expect(mode(1240.5, '', 0)).toBe('flow');
    expect(mode(1240.5, null, 0)).toBe('flow');
    expect(mode(0, undefined, 0)).toBe('idle');
  });

  it('only the six comparisons count', () => {
    expect(mode(1240.5, '==', 0)).toBe('idle');
    expect(mode(1240.5, '!=', 0)).toBe('flow');
    expect(mode(1240.5, '<', 0)).toBe('idle');
    expect(mode(1240.5, '<=', 0)).toBe('idle');
    expect(mode(1240.5, '>=', 0)).toBe('flow');
    for (const op of ['===', '!==', '<>', '=>', ' ']) expect([op, mode(1240.5, op, 0)]).toEqual([op, 'idle']);
  });

  it('numbers as mathjs reads them: decimals, exponents, signs, leading zeros', () => {
    expect(mode(1240.5, '>', '.5')).toBe('flow');
    expect(mode(1240.5, '>', '5.')).toBe('flow');
    expect(mode(1240.5, '>', '1E3')).toBe('flow');
    expect(mode(1240.5, '>', '1e+21')).toBe('idle');
    expect(mode(1240.5, '>', 1e21)).toBe('idle');
    expect(mode(1240.5, '>', '00012')).toBe('flow');
    expect(mode(1240.5, '>', '- 5')).toBe('flow');
    expect(mode(1240.5, '>', '--5')).toBe('flow');
    expect(mode(1240.5, '>', '+-5')).toBe('flow');
    expect(mode(1240.5, '>', ' 5 ')).toBe('flow');
    expect(mode(1240.5, '<', '1e400')).toBe('flow'); // Infinity
    expect(mode(-120.5, '<', '0')).toBe('flow');
  });

  it('true / false / NaN / Infinity / null like mathjs; null / undefined values are 0', () => {
    expect(mode(1, '==', 'true')).toBe('flow');
    expect(mode(0, '==', 'false')).toBe('flow');
    expect(mode(1240.5, '>', true)).toBe('flow');
    expect(mode(1240.5, '!=', 'NaN')).toBe('flow');
    expect(mode(1240.5, '>', 'NaN')).toBe('idle');
    expect(mode(1240.5, '>', 'Infinity')).toBe('idle');
    expect(mode(1240.5, '>', '-Infinity')).toBe('flow');
    expect(mode(1240.5, '!=', 'null')).toBe('flow');
    expect(mode(0, '==', 'null')).toBe('idle');
    expect(mode(1240.5, '>', null)).toBe('flow'); // `value ?? 0`
    expect(mode(1240.5, '>', undefined)).toBe('flow');
  });

  it('readings: missing → idle; a non-number reads as NaN (only != holds)', () => {
    expect(mode(undefined, '!=', 0)).toBe('idle'); // "NA"
    expect(mode(null, '!=', 0)).toBe('idle');
    expect(mode('abc', '!=', 0)).toBe('flow');
    expect(mode('abc', '>=', 0)).toBe('idle');
    expect(mode('', '==', 0)).toBe('flow'); // Number('') = 0
    expect(mode(true, '==', 1)).toBe('flow');
  });

  it('comparisons use mathjs’s tolerance (relTol 1e-12, absTol 1e-15)', () => {
    expect(mode(1240.5, '==', '1240.5000000000001')).toBe('flow');
    expect(mode(1240.5, '>', '1240.4999999999995')).toBe('idle');
    expect(mode(0, '!=', '5e-16')).toBe('idle');
    expect(mode(0, '!=', '1e-15')).toBe('idle');
    expect(mode(0, '!=', '1.1e-15')).toBe('flow');
    expect(mode(0, '>=', '1e-16')).toBe('flow');
    expect(mode(0, '<', '1e-16')).toBe('idle');
    expect(mode(1e6, '==', '1000000.000002')).toBe('idle');
  });
});

describe('values and identity', () => {
  const sld = {
    nodes: [
      {
        id: 'pv',
        data: {
          keys: [
            { label: 'P', param: 'live.p30.value' },
            { label: 'E', param: 'live.p24.value' },
            { label: 'Q', liveParams: 'live.p31.value' },
            { label: 'X', param: 'live.p99.value' },
            { param: 'live.p30.value' }, // no label: skipped
          ],
          animation: { animationParams: 'live.p30.value', operator: '>', value: 0 },
        },
      },
    ],
  };
  const live = { live: { p30: { value: 218.123 }, p24: { value: 142781742.5 }, p31: { value: 'NA' } } };

  it('formats like the web hook', () => {
    expect(bridge.buildLiveValues(sld, live)).toEqual({
      nodeKv: { pv: { P: '218.12', E: '142781743', Q: '—', X: '—' } },
      edgeMode: { pv: 'flow' },
      brokenGroups: [],
      brokenRefs: [],
    });
    expect(bridge.buildLiveValues({ nodes: [] }, live)).toBeNull();
    expect(bridge.buildLiveValues(sld, null)).toBeNull();
  });

  it('keeps the same liveValues object until the diagram or the live data change', () => {
    const a = bridge.liveValuesFor(sld, live);
    expect(bridge.liveValuesFor(sld, live)).toBe(a); // e.g. a theme flip re-render
    const b = bridge.liveValuesFor(sld, { ...live });
    expect(b).not.toBe(a);
    expect(b).toEqual(a);
    expect(bridge.liveValuesFor({ ...sld }, { ...live })).not.toBe(b);
  });
});
