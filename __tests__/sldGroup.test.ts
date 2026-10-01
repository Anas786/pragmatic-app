/**
 * SLD grouping (`buildSldGrouping` + `makeGroupedResolver`) — group source
 * units by energy type, total their values, and keep the downstream layout
 * invariants (`resolveNodeRects`) intact.
 */
import { it, expect, describe } from '@jest/globals';
import {
  aggregationForKey,
  buildSldGrouping,
  classifySldNode,
  energyTypeFromName,
  makeGroupedResolver,
  SLD_GROUP_MAX_ROWS,
  sldCardRenderedHeight,
  sldEdgeRoutes,
  SldGroup,
} from '../src/utils/sldGroup';
import {
  evalAnimation,
  getGraphBounds,
  isEdgeAnimated,
  makeMapResolver,
  resolveNodeRects,
  SLDRect,
} from '../src/utils/sld';
import { sldGraphMock, sldMockValues } from '../src/data/mock/sld';
import { SLDEdge, SLDGraph, SLDNode } from '../src/types';

const overlaps = (a: SLDRect, b: SLDRect): boolean => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox > 0 && oy > 0;
};

const byHeading = (graph: SLDGraph, heading: string): SLDNode =>
  graph.nodes.find(n => n.data.heading === heading)!;

const groupOf = (groups: SldGroup[], type: string): SldGroup =>
  groups.find(g => g.type === type)!;

const clone = (graph: SLDGraph): SLDGraph => JSON.parse(JSON.stringify(graph));

/** Mock with the production icon/name mismatches applied. */
const withMismatchedIcons = (): SLDGraph => {
  const g = clone(sldGraphMock);
  byHeading(g, 'PV-SG-CI-02').data.icon.name = 'wind';
  byHeading(g, 'GW-WTG-05').data.icon.name = 'solarLg';
  byHeading(g, 'BESS').data.icon.name = 'genset';
  return g;
};

/**
 * Mock with the WHR plant renamed to an untagged "Captive Plant 2": both
 * plants classify as genset via their icon, so the PF / flow behaviour of a
 * two-unit genset group stays covered on the real telemetry shape (before
 * WHR became its own type, the reference graph itself grouped this pair).
 */
const withGensetPair = (): SLDGraph => {
  const g = clone(sldGraphMock);
  byHeading(g, 'WHR Plant').data.heading = 'Captive Plant 2';
  return g;
};
const GENSET_PAIR = withGensetPair();

/** A second WHR unit next to the reference WHR Plant (same look, own telemetry). */
const whrUnit = (id: string, x: number, icon = { name: 'genset', color: '#1fcee5' }): SLDNode => ({
  id,
  type: 'custom',
  position: { x, y: byHeading(sldGraphMock, 'WHR Plant').position.y },
  data: {
    heading: `WHR-${id}`,
    keys: [
      { unit: 'kW', param: `${id}.p`, label: 'P' },
      { unit: 'kVar', param: `${id}.q`, label: 'Q' },
      { unit: '%', param: `${id}.pf`, label: 'PF' },
    ],
    edgesConnect: 'source',
    icon,
  },
});

/** Reference graph + extra WHR units feeding the plant (WHR Plant comes first). */
const withWhrUnits = (...units: SLDNode[]): SLDGraph => {
  const g = clone(sldGraphMock);
  const plantEdge = g.edges.find(e => e.id === 'e12-1')!;
  units.forEach(u => {
    g.nodes.push(u);
    g.edges.push({ ...plantEdge, id: `e${u.id}-1`, source: u.id });
  });
  return g;
};

const baseResolve = makeMapResolver(sldMockValues);

describe('classification', () => {
  it('classifies every reference node', () => {
    const expected: Record<string, string | null> = {
      'LCL Plant': null,
      'Captive Plant': 'genset', // no tag → icon 'genset'
      'WHR Plant': 'whr', // WHR name tag beats its 'genset' icon
      BESS: 'battery',
      SVG: null, // icon 'switchLg' is not an energy source
    };
    for (const node of sldGraphMock.nodes) {
      const h = node.data.heading;
      const want =
        h in expected
          ? expected[h]
          : /PV/.test(h)
            ? 'solar'
            : /WTG/.test(h)
              ? 'wind'
              : 'unexpected';
      expect([h, classifySldNode(node)]).toEqual([h, want]);
    }
  });

  it('prefers name tags over a mismatched icon', () => {
    const g = withMismatchedIcons();
    expect(classifySldNode(byHeading(g, 'PV-SG-CI-02'))).toBe('solar');
    expect(classifySldNode(byHeading(g, 'GW-WTG-05'))).toBe('wind');
    expect(classifySldNode(byHeading(g, 'BESS'))).toBe('battery');
  });

  it('matches short tags as whole tokens only', () => {
    expect(energyTypeFromName('Bridge Feeder')).toBeNull(); // not 'dg'
    expect(energyTypeFromName('Improve Line')).toBeNull(); // not 'pv'
    expect(energyTypeFromName('DG SET 2')).toBe('genset');
    expect(energyTypeFromName('WTG01')).toBe('wind');
    expect(energyTypeFromName('Rooftop Solar A')).toBe('solar');
    expect(energyTypeFromName('Utility Incomer')).toBe('grid');
    expect(energyTypeFromName('Diesel Generator')).toBe('genset');
  });

  it('recognises WHR by its whole-token tag or "waste heat", above genset', () => {
    for (const h of [
      'WHR Plant',
      'WHR-1',
      'WHR2',
      'Waste Heat Recovery 2',
      'waste-heat boiler',
      'Whr Generator', // not genset via the 'generator' substring
      'GEN WHR', // not genset via the 'gen' token either
    ]) {
      expect([h, energyTypeFromName(h)]).toEqual([h, 'whr']);
    }
    // Storage still beats the plant it's attached to.
    expect(energyTypeFromName('WHR BESS')).toBe('battery');
  });

  it("doesn't take 'whr' inside a longer token as a WHR tag", () => {
    for (const h of ['Whrl Pump', 'NWHR Feeder', 'Overwhr Line', 'WHRS Bus', 'Wastewater Heater']) {
      expect([h, energyTypeFromName(h)]).toEqual([h, null]);
    }
    // …so the icon fallback still applies to those names.
    const node: SLDNode = {
      ...byHeading(sldGraphMock, 'WHR Plant'),
      data: { ...byHeading(sldGraphMock, 'WHR Plant').data, heading: 'Whrl Pump' },
    };
    expect(classifySldNode(node)).toBe('genset');
    expect(energyTypeFromName('Whrl Generator')).toBe('genset');
  });
});

describe('buildSldGrouping — membership & topology', () => {
  const { graph, groups } = buildSldGrouping(sldGraphMock);

  it('forms one group per energy type with ≥2 units', () => {
    const summary = groups
      .map(g => [g.type, g.members.length, g.targets.join(',')])
      .sort();
    expect(summary).toEqual([
      ['solar', 9, '1'],
      ['wind', 6, '1'],
    ]);
  });

  it('no longer merges WHR Plant with Captive Plant (both genset-icon, Lucky Cement)', () => {
    const captive = byHeading(sldGraphMock, 'Captive Plant');
    const whr = byHeading(sldGraphMock, 'WHR Plant');
    expect([captive.data.icon.name, whr.data.icon.name]).toEqual(['genset', 'genset']);
    expect(groups.some(g => g.type === 'genset' || g.type === 'whr')).toBe(false);
    // Both stay on the diagram as their own, untouched nodes + edges.
    expect(graph.nodes).toContain(captive);
    expect(graph.nodes).toContain(whr);
    expect(graph.nodes.map(n => n.data.heading)).not.toContain('Genset · 2');
    sldGraphMock.edges
      .filter(e => e.source === captive.id || e.source === whr.id)
      .forEach(e => expect(graph.edges).toContain(e));
  });

  it('keeps singletons and non-sources as their original nodes', () => {
    const ids = graph.nodes.map(n => n.id);
    const bess = sldGraphMock.nodes.find(n => n.data.heading === 'BESS')!;
    const svg = sldGraphMock.nodes.find(n => n.data.heading === 'SVG')!;
    const logo = sldGraphMock.nodes.find(n => n.data.type === 'logo')!;
    expect(graph.nodes).toContain(bess);
    expect(graph.nodes).toContain(svg);
    expect(graph.nodes).toContain(logo);
    // logo + Solar · 9 + Wind · 6 + Captive + WHR + BESS + SVG.
    expect(ids).toHaveLength(7);
    const headings = graph.nodes.map(n => n.data.heading);
    expect(headings).toEqual(
      expect.arrayContaining(['Solar · 9', 'Wind · 6', 'Captive Plant', 'WHR Plant']),
    );
  });

  it('gives group nodes the canonical icon + colour of their type', () => {
    const g = buildSldGrouping(withMismatchedIcons());
    const solar = g.graph.nodes.find(n => n.id.startsWith('sldgrp:solar'))!;
    const wind = g.graph.nodes.find(n => n.id.startsWith('sldgrp:wind'))!;
    expect(solar.data.icon.name).toBe('solarLg');
    expect(wind.data.icon.name).toBe('wind');
    // Mismatched icons don't move units across groups.
    expect(groupOf(g.groups, 'solar').members).toHaveLength(9);
    expect(groupOf(g.groups, 'wind').members).toHaveLength(6);
    expect(g.graph.nodes.find(n => n.data.heading === 'BESS')).toBeDefined();
    expect(solar.data.heading.length).toBeLessThanOrEqual(16);
  });

  it('rewires edges: one per group→target, none dangling, others untouched', () => {
    const ids = new Set(graph.nodes.map(n => n.id));
    for (const e of graph.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
    const pairs = graph.edges.map(e => `${e.source}->${e.target}`);
    expect(new Set(pairs).size).toBe(pairs.length);
    const edgeIds = graph.edges.map(e => e.id);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
    for (const g of groups) {
      expect(graph.edges.filter(e => e.source === g.id)).toHaveLength(
        g.targets.length,
      );
    }
    const original = sldGraphMock.edges.filter(e =>
      ['e5-1', 'e12-1', 'e14-1', 'e16-1'].includes(e.id),
    );
    expect(original).toHaveLength(4);
    original.forEach(e => expect(graph.edges).toContain(e));
    expect(graph.edges).toHaveLength(6);
  });

  it('never merges units feeding different targets, or intermediate nodes', () => {
    const g = clone(sldGraphMock);
    // A bus between PV-01/PV-02 and the plant; PV-03 still feeds the plant.
    g.nodes.push({
      id: 'bus',
      type: 'custom',
      position: { x: 700, y: 300 },
      data: {
        heading: 'PV Bus',
        keys: [],
        edgesConnect: 'source',
        icon: { name: 'solarLg', color: '#00ff00' },
      },
    });
    const pv1 = byHeading(g, 'PV-SG-CI-01').id;
    const pv2 = byHeading(g, 'PV-SG-CI-02').id;
    g.edges = g.edges.map(e =>
      e.source === pv1 || e.source === pv2 ? { ...e, target: 'bus' } : e,
    );
    g.edges.push({ ...g.edges[0], id: 'ebus-1', source: 'bus', target: '1' });
    const { groups: gs, graph: out } = buildSldGrouping(g);
    const solar = gs.filter(x => x.type === 'solar');
    expect(solar.map(x => [x.targets.join(','), x.members.length]).sort()).toEqual([
      ['1', 7],
      ['bus', 2],
    ]);
    // The bus has an incoming edge → never grouped, even though it's "PV".
    expect(out.nodes.find(n => n.id === 'bus')).toBeDefined();
  });

  it('is a no-op on a graph with no groupable pairs', () => {
    const g: SLDGraph = {
      nodes: sldGraphMock.nodes.filter(n =>
        ['LCL Plant', 'BESS', 'SVG', 'PV-SG-CI-01', 'GW-WTG-01'].includes(n.data.heading),
      ),
      edges: [],
    };
    const ids = new Set(g.nodes.map(n => n.id));
    g.edges = sldGraphMock.edges.filter(e => ids.has(e.source));
    const res = buildSldGrouping(g);
    expect(res.groups).toEqual([]);
    expect(res.graph).toBe(g);
    expect(makeGroupedResolver(baseResolve, res.groups)).toBe(baseResolve);
  });

  it('is deterministic with stable ids and caches per graph reference', () => {
    const a = buildSldGrouping(sldGraphMock);
    expect(buildSldGrouping(sldGraphMock)).toBe(a); // memo contract
    const b = buildSldGrouping(clone(sldGraphMock));
    expect(b).not.toBe(a);
    expect(b.graph).toEqual(a.graph);
    expect(a.groups.map(g => g.id).sort()).toEqual([
      'sldgrp:solar:1',
      'sldgrp:wind:1',
    ]);
  });
});

describe('buildSldGrouping — WHR units', () => {
  it('groups ≥2 WHR units into "WHR · N" with their own (member-derived) look', () => {
    const { graph, groups } = buildSldGrouping(withWhrUnits(whrUnit('w2', -110)));
    const whr = groupOf(groups, 'whr');
    expect(whr.id).toBe('sldgrp:whr:1');
    expect(whr.members.map(m => m.data.heading)).toEqual(['WHR Plant', 'WHR-w2']);
    const node = graph.nodes.find(n => n.id === whr.id)!;
    expect(node.data.heading).toBe('WHR · 2');
    // No palette token for WHR: the members' shared icon + accent.
    expect(node.data.icon).toEqual({ name: 'genset', color: '#1fcee5' });
    const edges = graph.edges.filter(e => e.source === whr.id);
    expect(edges).toHaveLength(1);
    expect(edges[0].style.stroke).toBe('#1fcee5');
    expect(edges[0].markerEnd.color).toBe('#1fcee5');
    // WHR never absorbs the genset-icon Captive Plant, which stays alone.
    expect(groups.some(g => g.type === 'genset')).toBe(false);
    expect(graph.nodes).toContainEqual(byHeading(sldGraphMock, 'Captive Plant'));
    // Totals like any other group.
    const r = makeGroupedResolver(
      makeMapResolver({ ...sldMockValues, 'w2.p': 200, 'w2.q': 15, 'w2.pf': 0.97 }),
      groups,
    );
    const pParam = whr.keys.find(k => k.label === 'P')!.param;
    expect(r(pParam)).toBeCloseTo(740, 9);
  });

  it('picks the WHR look deterministically when members disagree', () => {
    const industry = { name: 'industry', color: '#123456' };
    // 1 vs 1 → the earliest member in graph order (WHR Plant).
    const tie = buildSldGrouping(withWhrUnits(whrUnit('w2', -110, industry)));
    const tieNode = tie.graph.nodes.find(n => n.id === groupOf(tie.groups, 'whr').id)!;
    expect(tieNode.data.icon).toEqual({ name: 'genset', color: '#1fcee5' });
    // 2 vs 1 → the majority icon, coloured like its first member.
    const major = buildSldGrouping(
      withWhrUnits(
        whrUnit('w2', -110, industry),
        whrUnit('w3', -364, { name: 'industry', color: '#654321' }),
      ),
    );
    const majorNode = major.graph.nodes.find(n => n.id === groupOf(major.groups, 'whr').id)!;
    expect(majorNode.data.heading).toBe('WHR · 3');
    expect(majorNode.data.icon).toEqual(industry);
  });

  it('keeps a single WHR unit as its original node', () => {
    const { graph, groups } = buildSldGrouping(sldGraphMock);
    expect(groups.find(g => g.type === 'whr')).toBeUndefined();
    expect(graph.nodes).toContain(byHeading(sldGraphMock, 'WHR Plant'));
  });
});

describe('makeGroupedResolver — aggregation', () => {
  const { groups } = buildSldGrouping(GENSET_PAIR);
  const resolve = makeGroupedResolver(baseResolve, groups);
  const keyParam = (g: SldGroup, label: string, unit?: string) =>
    g.keys.find(k => k.label === label && k.unit === unit)!.param;

  it('sums P and Q across members', () => {
    const solar = groupOf(groups, 'solar');
    const pSum = [42, 43, 44, 45, 46, 47, 48, 49, 50].reduce(
      (s, n) => s + sldMockValues[`live.p${n}.value`],
      0,
    );
    const qSum = [74, 75, 76, 77, 78, 79, 80, 81, 82].reduce(
      (s, n) => s + sldMockValues[`live.p${n}.value`],
      0,
    );
    expect(resolve(keyParam(solar, 'P', 'kW'))).toBeCloseTo(pSum, 6);
    expect(resolve(keyParam(solar, 'Q', 'kVar'))).toBeCloseTo(qSum, 6);
  });

  it('merges a unit typo into one total and drops keys most units lack', () => {
    const wind = groupOf(groups, 'wind');
    // WTG-01 files Q under 'kW', the other five under 'kVar' → ONE Q row over
    // all six (majority unit); WTG-01's lone SOC (1/6) is not a group value.
    expect(wind.keys.map(k => `${k.label}:${k.unit}`)).toEqual(['P:kW', 'Q:kVar']);
    const qAll = [10370, 10371, 10372, 10373, 10374, 10375].reduce(
      (s, n) => s + sldMockValues[`live.p${n}.value`],
      0,
    );
    expect(resolve(keyParam(wind, 'Q', 'kVar'))).toBeCloseTo(qAll, 6);
  });

  it('folds PF / PF % into one row and recomputes it from the group totals', () => {
    const genset = groupOf(groups, 'genset');
    // Captive ships a unitless PF, Captive 2 a '%' one → a single ratio row.
    expect(genset.keys.filter(k => k.aggregation === 'pf')).toHaveLength(1);
    expect(genset.keys.map(k => `${k.label}:${k.unit}`)).toEqual(['P:kW', 'Q:kVar', 'PF:undefined']);
    const p = 0 + 540; // Captive + Captive 2
    const q = 0 + 45;
    expect(resolve(keyParam(genset, 'PF', undefined))).toBeCloseTo(p / Math.hypot(p, q), 9);
  });

  it('falls back to the mean of the reported PFs (as ratios) when P/Q totals are zero', () => {
    const values = { ...sldMockValues, 'live.p1000009.value': 0, 'live.p1000010.value': 0 };
    const r = makeGroupedResolver(makeMapResolver(values), groups);
    // Captive 1.0 (ratio) and Captive 2 0.98 (a ratio despite its '%' unit).
    expect(r(keyParam(groupOf(groups, 'genset'), 'PF', undefined))).toBeCloseTo(0.99, 9);
    // A PF reported as a real percentage is normalised before averaging.
    const r2 = makeGroupedResolver(
      makeMapResolver({ ...values, 'live.p1000011.value': 96 }),
      groups,
    );
    expect(r2(keyParam(groupOf(groups, 'genset'), 'PF', undefined))).toBeCloseTo(0.98, 9);
  });

  it('only recomputes PF from members that report BOTH P and Q', () => {
    const mk = (id: string): SLDNode => ({
      id,
      type: 'custom',
      position: { x: 0, y: id === 'dg1' ? 0 : 300 },
      data: {
        heading: `DG ${id}`,
        keys: [
          { param: `${id}.p`, label: 'P', unit: 'kW' },
          { param: `${id}.q`, label: 'Q', unit: 'kVar' },
          { param: `${id}.pf`, label: 'PF' },
        ],
        edgesConnect: 'source',
        icon: { name: 'genset', color: '#000000' },
      },
    });
    const logo = sldGraphMock.nodes.find(n => n.data.type === 'logo')!;
    const g: SLDGraph = {
      nodes: [logo, mk('dg1'), mk('dg2')],
      edges: ['dg1', 'dg2'].map(id => ({
        ...sldGraphMock.edges[0],
        id: `e-${id}`,
        source: id,
        target: logo.id,
      })),
    };
    const { groups: gs } = buildSldGrouping(g);
    const pfParam = gs[0].keys.find(k => k.aggregation === 'pf')!.param;
    // DG-2's Q dropped out: ΣP/ΣQ would read 1.00 — use the reported PFs.
    const partial = makeGroupedResolver(
      makeMapResolver({ 'dg1.p': 100, 'dg1.q': 0, 'dg1.pf': 1, 'dg2.p': 100, 'dg2.pf': 0.6 }),
      gs,
    );
    expect(partial(pfParam)).toBeCloseTo(0.8, 9);
    // Both complete → exact recompute (DG-2's Q = 133.33 for PF 0.6).
    const full = makeGroupedResolver(
      makeMapResolver({
        'dg1.p': 100,
        'dg1.q': 0,
        'dg1.pf': 1,
        'dg2.p': 100,
        'dg2.q': 400 / 3,
        'dg2.pf': 0.6,
      }),
      gs,
    );
    expect(full(pfParam)).toBeCloseTo(200 / Math.hypot(200, 400 / 3), 9);
    // A fully offline member doesn't block the recompute.
    const offline = makeGroupedResolver(
      makeMapResolver({ 'dg1.p': 100, 'dg1.q': 75, 'dg1.pf': 0.8 }),
      gs,
    );
    expect(offline(pfParam)).toBeCloseTo(0.8, 9);
  });

  it('means non-additive units, skips missing values, null when none numeric', () => {
    const solar = groupOf(groups, 'solar');
    const values: Record<string, number | string> = { ...sldMockValues };
    delete values['live.p42.value'];
    values['live.p43.value'] = 'NA';
    const r = makeGroupedResolver(makeMapResolver(values), groups);
    const expected =
      [44, 45, 46, 47, 48, 49, 50].reduce((s, n) => s + sldMockValues[`live.p${n}.value`], 0);
    expect(r(keyParam(solar, 'P', 'kW'))).toBeCloseTo(expected, 6);

    const r2 = makeGroupedResolver(makeMapResolver({}), groups);
    expect(r2(keyParam(solar, 'P', 'kW'))).toBeNull();

    // A '%' key that isn't PF is averaged, not summed.
    const g = clone(sldGraphMock);
    g.nodes
      .filter(n => classifySldNode(n) === 'solar')
      .forEach((n, i) => n.data.keys.push({ param: `x.${i}`, label: 'PR', unit: '%' }));
    const gg = buildSldGrouping(g);
    const prValues: Record<string, number> = {};
    for (let i = 0; i < 9; i++) prValues[`x.${i}`] = i % 2 ? 90 : 80;
    const r3 = makeGroupedResolver(makeMapResolver(prValues), gg.groups);
    expect(r3(keyParam(groupOf(gg.groups, 'solar'), 'PR', '%'))).toBeCloseTo((5 * 80 + 4 * 90) / 9, 9);
  });

  it('sums every additive unit family and converts SI prefixes', () => {
    for (const unit of [
      'W', 'kW', 'MW', 'GW', 'var', 'kVAr', 'MVAr', 'Gvar', 'VA', 'kVA', 'MVA', 'GVA',
      'Wh', 'kWh', 'MWh', 'GWh', 'varh', 'kVArh', 'MVArh', 'VAh', 'kVAh', 'MVAh', 'A', 'kA',
    ]) {
      expect([unit, aggregationForKey({ label: 'X', unit })]).toEqual([unit, 'sum']);
    }
    for (const unit of ['%', 'V', 'kV', 'Hz', '°C']) {
      expect([unit, aggregationForKey({ label: 'X', unit })]).toEqual([unit, 'mean']);
    }

    // Nine inverters × 1000 kVArh → 9000 kVArh; one unit reporting in MW.
    const g = clone(sldGraphMock);
    const pv = g.nodes.filter(n => classifySldNode(n) === 'solar');
    pv.forEach((n, i) => n.data.keys.push({ param: `eq.${i}`, label: 'Eq', unit: 'kVArh' }));
    pv[0].data.keys[0].unit = 'MW';
    const gg = buildSldGrouping(g);
    const solar = groupOf(gg.groups, 'solar');
    const values: Record<string, number> = { ...sldMockValues };
    pv.forEach((_, i) => {
      values[`eq.${i}`] = 1000;
    });
    values['live.p42.value'] = 0.1; // 0.1 MW = 100 kW
    const r = makeGroupedResolver(makeMapResolver(values), gg.groups);
    expect(r(keyParam(solar, 'Eq', 'kVArh'))).toBeCloseTo(9000, 6);
    const pRest = [43, 44, 45, 46, 47, 48, 49, 50].reduce(
      (s, n) => s + sldMockValues[`live.p${n}.value`],
      0,
    );
    expect(r(keyParam(solar, 'P', 'kW'))).toBeCloseTo(pRest + 100, 6);
  });

  it('labels partial coverage and caps the card at the per-unit row count', () => {
    const g = clone(sldGraphMock);
    const pv = g.nodes.filter(n => classifySldNode(n) === 'solar');
    // 'T' on 5/9 units (shown, labelled), 'H' on 4/9 (dropped), and three
    // more full-coverage keys → only the best-covered 3 rows survive.
    pv.slice(0, 5).forEach((n, i) => n.data.keys.push({ param: `t.${i}`, label: 'T', unit: '°C' }));
    pv.slice(0, 4).forEach((n, i) => n.data.keys.push({ param: `h.${i}`, label: 'H', unit: '%' }));
    const two = buildSldGrouping(g);
    expect(groupOf(two.groups, 'solar').keys.map(k => k.label)).toEqual(['P', 'Q', 'T (5/9)']);

    pv.forEach((n, i) => n.data.keys.push({ param: `s.${i}`, label: 'S', unit: 'kVA' }));
    // Graphs are immutable to the memo (cached per reference) → a fresh copy.
    const capped = buildSldGrouping(clone(g));
    const solar = groupOf(capped.groups, 'solar');
    expect(solar.keys).toHaveLength(SLD_GROUP_MAX_ROWS);
    expect(solar.keys.map(k => k.label)).toEqual(['P', 'Q', 'S']);
    for (const grp of buildSldGrouping(sldGraphMock).groups) {
      expect(grp.keys.length).toBeLessThanOrEqual(SLD_GROUP_MAX_ROWS);
    }
  });

  it('delegates non-group params to the base resolver', () => {
    expect(resolve('live.p30.value')).toBe(218.1);
    expect(resolve('live.p10385.value')).toBe(-120.5);
  });
});

describe('group animation', () => {
  const { graph, groups } = buildSldGrouping(GENSET_PAIR);
  const groupEdge = (type: string): SLDEdge =>
    graph.edges.find(e => e.source === groupOf(groups, type).id)!;
  const groupNode = (type: string): SLDNode =>
    graph.nodes.find(n => n.id === groupOf(groups, type).id)!;

  it('flows while ANY member flows', () => {
    const r = makeGroupedResolver(baseResolve, groups);
    // Captive Plant is idle, Captive 2 is producing → genset group flows.
    expect(isEdgeAnimated(groupEdge('genset'), groupNode('genset'), r)).toBe(true);
    expect(evalAnimation(groupEdge('wind').data?.animation, r)).toBe(true);
    // The condition lives on the EDGE (per target), not the group node.
    expect(groupNode('wind').data.animation).toBeUndefined();
  });

  it('decides flow per target for a group feeding several targets', () => {
    const logo = sldGraphMock.nodes.find(n => n.data.type === 'logo')!;
    const tb: SLDNode = { ...logo, id: 'B', position: { x: logo.position.x + 900, y: logo.position.y } };
    const pv = (id: string, x: number): SLDNode => ({
      id,
      type: 'custom',
      position: { x, y: logo.position.y - 500 },
      data: {
        heading: `PV-${id}`,
        keys: [{ param: `${id}.p`, label: 'P', unit: 'kW' }],
        edgesConnect: 'source',
        icon: { name: 'solarLg', color: '#00ff00' },
      },
    });
    const edge = (src: string, tgt: string, mode: 'flow' | 'idle'): SLDEdge => ({
      ...sldGraphMock.edges[0],
      id: `${src}-${tgt}`,
      source: src,
      target: tgt,
      data: { mode },
    });
    const g: SLDGraph = {
      nodes: [logo, tb, pv('a', logo.position.x + 200), pv('b', logo.position.x + 600)],
      edges: [
        edge('a', logo.id, 'flow'),
        edge('a', 'B', 'idle'),
        edge('b', logo.id, 'flow'),
        edge('b', 'B', 'idle'),
      ],
    };
    const out = buildSldGrouping(g);
    const r = makeGroupedResolver(makeMapResolver({}), out.groups);
    const gid = out.groups[0].id;
    const node = out.graph.nodes.find(n => n.id === gid)!;
    const toA = out.graph.edges.find(e => e.source === gid && e.target === logo.id)!;
    const toB = out.graph.edges.find(e => e.source === gid && e.target === 'B')!;
    expect(isEdgeAnimated(toA, node, r)).toBe(true);
    expect(isEdgeAnimated(toB, node, r)).toBe(false);
  });

  it('colours each group edge like its group card', () => {
    for (const grp of groups) {
      const node = groupNode(grp.type);
      for (const e of graph.edges.filter(x => x.source === grp.id)) {
        expect(e.style.stroke).toBe(node.data.icon.color);
        expect(e.markerEnd.color).toBe(node.data.icon.color);
      }
    }
    expect(groupEdge('wind').style.stroke).toBe('#06B6D4');
  });

  it('is idle when every member is idle', () => {
    const values = { ...sldMockValues, 'live.p1000009.value': 0 };
    const r = makeGroupedResolver(makeMapResolver(values), groups);
    expect(isEdgeAnimated(groupEdge('genset'), groupNode('genset'), r)).toBe(false);
  });
});

describe('grouped layout', () => {
  const { graph, groups } = buildSldGrouping(sldGraphMock);
  const bounds = getGraphBounds(graph);
  const rects = resolveNodeRects(graph, bounds);

  it('has no overlapping cards after resolveNodeRects', () => {
    const all = Array.from(rects.values());
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i], all[j])).toBe(false);
      }
    }
  });

  it('keeps each group on the same side of its target as its members', () => {
    const logo = sldGraphMock.nodes.find(n => n.data.type === 'logo')!;
    const lc = { x: logo.position.x + 60, y: logo.position.y + 60 };
    for (const g of groups) {
      const node = graph.nodes.find(n => n.id === g.id)!;
      const cx =
        g.members.reduce((s, m) => s + m.position.x + 107, 0) / g.members.length;
      const cy =
        g.members.reduce((s, m) => s + m.position.y + 67, 0) / g.members.length;
      const gx = node.position.x + 107;
      const gy = node.position.y + 67;
      // Positive dot product: same side of the plant.
      expect((cx - lc.x) * (gx - lc.x) + (cy - lc.y) * (gy - lc.y)).toBeGreaterThan(0);
    }
  });

  it('points group edge handles at the target', () => {
    for (const g of groups) {
      for (const e of graph.edges.filter(x => x.source === g.id)) {
        const s = rects.get(e.source)!;
        const t = rects.get(e.target)!;
        const dx = s.x + s.w / 2 - (t.x + t.w / 2);
        const dy = s.y + s.h / 2 - (t.y + t.h / 2);
        if (Math.abs(dx) >= Math.abs(dy)) {
          expect([e.sourceHandle, e.targetHandle]).toEqual(dx >= 0 ? ['l', 'r'] : ['r', 'l']);
        } else {
          expect([e.sourceHandle, e.targetHandle]).toEqual(dy >= 0 ? ['t', 'b'] : ['b', 't']);
        }
      }
    }
  });

  it('keeps every other edge route clear of each group card (both routings)', () => {
    for (const source of [
      sldGraphMock,
      withMismatchedIcons(),
      GENSET_PAIR,
      withWhrUnits(whrUnit('w2', -110)),
    ]) {
      const out = buildSldGrouping(source);
      const rs = resolveNodeRects(out.graph, getGraphBounds(out.graph));
      for (const grp of out.groups) {
        const r = rs.get(grp.id)!;
        // The card as RENDERED (minHeight grows with its rows).
        const card = { ...r, h: sldCardRenderedHeight(grp.keys.length) };
        for (const e of out.graph.edges) {
          if (e.source === grp.id || e.target === grp.id) continue;
          for (const pts of sldEdgeRoutes(e, rs)) {
            for (let i = 1; i < pts.length; i++) {
              const a = pts[i - 1];
              const b = pts[i];
              const seg = {
                x: Math.min(a.x, b.x),
                y: Math.min(a.y, b.y),
                w: Math.abs(b.x - a.x) || 0.001,
                h: Math.abs(b.y - a.y) || 0.001,
              };
              // Orthogonal segments are axis-aligned; bezier samples are
              // dense, so a bbox test per step is exact enough here.
              expect([e.id, grp.id, overlaps(seg, card)]).toEqual([e.id, grp.id, false]);
            }
          }
        }
      }
    }
  });

  it('keeps ungrouped node positions', () => {
    for (const n of graph.nodes) {
      if (n.id.startsWith('sldgrp:')) continue;
      expect(n).toBe(sldGraphMock.nodes.find(o => o.id === n.id));
    }
  });

  it('places a group clear of its target when members surround it', () => {
    const logo = sldGraphMock.nodes.find(n => n.data.type === 'logo')!;
    const { x, y } = logo.position;
    const mk = (id: string, px: number, py: number): SLDNode => ({
      id,
      type: 'custom',
      position: { x: px, y: py },
      data: {
        heading: `PV-${id}`,
        keys: [{ param: `p.${id}`, label: 'P', unit: 'kW' }],
        edgesConnect: 'source',
        icon: { name: 'solarLg', color: '#00ff00' },
      },
    });
    // Two units mirrored left/right of the plant → centroid on the plant.
    const g: SLDGraph = {
      nodes: [logo, mk('a', x - 400, y), mk('b', x + 400, y)],
      edges: ['a', 'b'].map(id => ({
        ...sldGraphMock.edges[0],
        id: `e${id}`,
        source: id,
        target: logo.id,
      })),
    };
    const out = buildSldGrouping(g);
    const r = resolveNodeRects(out.graph, getGraphBounds(out.graph));
    expect(overlaps(r.get(out.groups[0].id)!, r.get(logo.id)!)).toBe(false);
    expect(buildSldGrouping(clone(g)).graph).toEqual(out.graph);
  });
});
