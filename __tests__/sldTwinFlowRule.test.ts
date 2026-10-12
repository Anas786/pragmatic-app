/**
 * SLD web twin — the TypeScript port of the twin's per-node flow rule
 * (SldTwin/twinFlowRule.ts), run against the page bridge's own section
 * (scripts/web-twin/bridge.js "live values", as shipped — the same code
 * __tests__/sldTwinBridge.test.ts checks against the web's mathjs) over the
 * same cases. The Grouped adapter counts a group's running members with
 * the port, so a mismatch here would make Grouped and Units disagree on
 * what is running.
 *
 *  - edgeMode: every reading × operator × value combination, plus the
 *    shapes of a missing / partial rule (no operator, no value, no
 *    animationParams, no animation) and of paths (nested, bracketed,
 *    missing);
 *  - "live" readings (nodeKv): labels, `liveParams`, duplicate labels,
 *    "—" values;
 *  - the twin's edge mode default (`data.mode || mode`, 'flow' unless
 *    'idle').
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  twinEdgeDataMode,
  twinEdgeMode,
  twinHasFlowRule,
  twinNodeHasReading,
  twinNodeRuns,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinFlowRule';
import { TwinJson } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/protocol';

interface LiveValues {
  nodeKv: Record<string, Record<string, string>>;
  edgeMode: Record<string, 'flow' | 'idle'>;
}
interface BridgeLiveValues {
  buildLiveValues: (sld: unknown, store: unknown) => LiveValues | null;
}

const bridge: BridgeLiveValues = (() => {
  const src = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
  const start = src.indexOf('// ---- live values');
  const end = src.indexOf('// ---- redux store');
  if (start < 0 || end < start) throw new Error('bridge.js: the "live values" section markers moved');
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}; return { buildLiveValues };`)() as BridgeLiveValues;
})();

type Json = Record<string, unknown>;

/** The bridge's verdict for one node: [edgeMode, has a numeric reading]. */
const shipped = (node: Json, store: Json): [string | undefined, boolean] => {
  const lv = bridge.buildLiveValues({ nodes: [node] }, store);
  if (!lv) throw new Error('no liveValues');
  const kv = lv.nodeKv[String(node.id)] ?? {};
  return [lv.edgeMode[String(node.id)], Object.values(kv).some(v => v !== '—')];
};
const ported = (node: Json, store: Json): [string | undefined, boolean] => [
  twinEdgeMode(node, store as TwinJson),
  twinNodeHasReading(node, store as TwinJson),
];

const READINGS: unknown[] = [
  0, 0.004, 0.005, 0.0049, -0.004, -0.006, 1e-16, 1240.5, -120.5, 999.995, 1e35, -1.2e35,
  NaN, Infinity, -Infinity, '12', '0', '0.00', '0.004', 'NA', '', ' ', 'abc', '1,000',
  null, true, false, { nested: 1 }, [1],
];
const OPERATORS: unknown[] = ['!=', '==', '>', '<', '>=', '<=', ' > ', '>\t', '', null, undefined, '===', 'and', '=>'];
const VALUES: unknown[] = [0, '0', 1, -1, 10, '10', '', ' ', 'abc', null, undefined, '1e3', '- 5', '--5', 'true', 'false', 'NaN', 'Infinity', 'null', '.5', '5.', '10kW', 0.004];

const ruleNode = (animation: unknown, keys: unknown = []): Json => ({ id: 'n', data: { keys, animation } });

describe('twinEdgeMode — the same verdict as the shipped bridge', () => {
  it(`every reading × operator × value (${READINGS.length * OPERATORS.length * VALUES.length} rules)`, () => {
    const mismatches: string[] = [];
    let flows = 0;
    for (const reading of READINGS) {
      const store = { live: { p30: { value: reading } } };
      for (const operator of OPERATORS) {
        for (const value of VALUES) {
          const node = ruleNode({ animationParams: 'live.p30.value', operator, value });
          const want = shipped(node, store)[0];
          const got = twinEdgeMode(node, store as TwinJson);
          if (want === 'flow') flows += 1;
          if (want !== got) mismatches.push(JSON.stringify({ reading, operator, value, want, got }));
        }
      }
    }
    expect(mismatches).toEqual([]);
    // The cases do exercise both outcomes.
    expect(flows).toBeGreaterThan(100);
  });

  it('a partial rule reads like the twin: operator `!=` / value 0 when absent', () => {
    const store = { live: { p30: { value: 50 } } };
    for (const animation of [
      { animationParams: 'live.p30.value' },
      { animationParams: 'live.p30.value', operator: '!=' },
      { animationParams: 'live.p30.value', value: 0 },
      { animationParams: 'live.p30.value', operator: '>' },
    ]) {
      expect([animation, twinEdgeMode(ruleNode(animation), store as TwinJson)]).toEqual([animation, 'flow']);
      expect(shipped(ruleNode(animation), store)[0]).toBe('flow');
    }
    // A reading below 0.005 rounds to "0.00" first: idle, like the twin.
    const tiny = { live: { p30: { value: 0.004 } } };
    expect(twinEdgeMode(ruleNode({ animationParams: 'live.p30.value', operator: '!=', value: 0 }), tiny as TwinJson)).toBe('idle');
  });

  it('paths: nested, bracketed and missing; a node without a rule has no edgeMode', () => {
    const store = { live: { p30: { value: 5 }, arr: [{ value: 7 }] }, top: 3 };
    const cases: unknown[] = [
      { animationParams: 'live.p30.value' },
      { animationParams: 'live[p30].value' },
      { animationParams: 'live.arr[0].value' },
      { animationParams: 'live.missing.value' },
      { animationParams: 'live.p30.value.deeper' },
      { animationParams: 'top' },
      { animationParams: '' },
      { animationParams: 0 },
      { animationParams: null },
      { operator: '!=', value: 0 },
      'live.p30.value',
      null,
      undefined,
    ];
    for (const animation of cases) {
      const node = ruleNode(animation);
      expect([animation, ported(node, store)]).toEqual([animation, shipped(node, store)]);
    }
    expect(twinHasFlowRule(ruleNode({ animationParams: 'live.p30.value' }))).toBe(true);
    expect(twinHasFlowRule(ruleNode({ operator: '!=', value: 0 }))).toBe(false);
    expect(twinHasFlowRule({ id: 'n' })).toBe(false);
    expect(twinHasFlowRule(null)).toBe(false);
  });
});

describe('twinNodeHasReading — the bridge’s nodeKv', () => {
  it('labels, liveParams, duplicate labels (the later wins) and "—" values', () => {
    const store = { live: { a: { value: 12 }, b: { value: 'NA' }, c: { value: '' }, d: { value: 0 } } };
    const keySets: unknown[] = [
      [],
      [{ label: 'P', param: 'live.a.value' }],
      [{ label: 'P', param: 'live.b.value' }],
      [{ label: 'P', param: 'live.c.value' }],
      [{ label: 'P', param: 'live.d.value' }], // 0 is a reading
      [{ label: 'P', param: 'live.missing.value' }],
      [{ param: 'live.a.value' }], // no label: not read
      [{ label: 'P' }], // no param
      [{ label: 'P', liveParams: 'live.a.value' }],
      [{ label: 'P', param: 'live.a.value' }, { label: 'P', param: 'live.b.value' }],
      [{ label: 'P', param: 'live.b.value' }, { label: 'P', param: 'live.a.value' }],
      [{ label: 'P', param: 'live.b.value' }, { label: 'Q', param: 'live.a.value' }],
      ['not a key', null],
      'not an array',
    ];
    for (const keys of keySets) {
      const node = ruleNode(undefined, keys);
      expect([keys, ported(node, store)]).toEqual([keys, shipped(node, store)]);
    }
  });

  it('twinNodeRuns: by the rule when there is one, else "live" = a numeric reading', () => {
    const store = { live: { a: { value: 12 }, z: { value: 0 } } } as TwinJson;
    const reading = [{ label: 'P', param: 'live.a.value' }];
    expect(twinNodeRuns(ruleNode(undefined, reading), store)).toBe(true);
    expect(twinNodeRuns(ruleNode(undefined, []), store)).toBe(false);
    expect(twinNodeRuns(ruleNode({ animationParams: 'live.z.value' }, reading), store)).toBe(false);
    expect(twinNodeRuns(ruleNode({ animationParams: 'live.a.value' }, []), store)).toBe(true);
  });
});

describe('twinEdgeDataMode — the twin’s fromSldV2 default', () => {
  it('flow unless `data.mode || mode` is idle', () => {
    expect(twinEdgeDataMode({})).toBe('flow');
    expect(twinEdgeDataMode({ data: {} })).toBe('flow');
    expect(twinEdgeDataMode({ data: { mode: 'flow' } })).toBe('flow');
    expect(twinEdgeDataMode({ data: { mode: 'idle' } })).toBe('idle');
    expect(twinEdgeDataMode({ mode: 'idle' })).toBe('idle');
    expect(twinEdgeDataMode({ data: { mode: '' }, mode: 'idle' })).toBe('idle');
    expect(twinEdgeDataMode({ data: { mode: 'flow' }, mode: 'idle' })).toBe('flow');
    expect(twinEdgeDataMode(null)).toBe('flow');
  });
});
