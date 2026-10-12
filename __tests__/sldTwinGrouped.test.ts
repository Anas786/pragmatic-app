/**
 * SLD web twin — Grouped | Units for the 3D (SldTwin/twinGrouped.ts).
 *
 *  - Units = the raw sldV2 + live.data themselves (same objects);
 *  - Grouped = the Diagram's OWN grouping (buildSldGrouping) as regular
 *    sldV2 nodes: Lucky → "Wind · 6" + "Solar · 9" at the grouping's
 *    positions, the Diagram card's rows reading synthetic params, the twin
 *    icon for the type in the group colour, a worded flow rule, the raw
 *    members attached for the page bridge; members and their edges gone,
 *    the grouping's group → target edges in their place, everything else
 *    the SAME raw object;
 *  - the grouped envelope = live.data + the numbers the Diagram's group
 *    card shows (makeGroupedResolver), 'NA' for its "—", stamped with the
 *    newest member update_at; flow = members the twin draws RUNNING in
 *    Units, by its own rule (twinFlowRule.ts — incomplete rules, rule-less
 *    "live" units, 2-decimal readings), checked against the shipped
 *    bridge: a group runs ⟺ one of its units runs; with no rule at all the
 *    group has none either and its cables carry the twin's per-target edge
 *    mode;
 *  - colours read the twin's way (style.stroke ‖ markerEnd.color ‖ color),
 *    never a palette fallback; majority ties go to the first member;
 *  - memoised per (diagram, grouping) and per (diagram, live); deterministic;
 *  - the committed smoke fixture (fixtures/lucky-grouped.json) is exactly
 *    this adapter's output for fixtures/lucky.json
 *    (SLD_TWIN_WRITE_FIXTURES=1 rewrites it).
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import luckyFixture from '../scripts/web-twin/fixtures/lucky.json';
import {
  buildTwinGroupedLive,
  buildTwinGroupedSld,
  TWIN_GROUP_ICON,
  TWIN_GROUP_MEMBERS_KEY,
  twinDataFor,
  TwinGroupedSld,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinGrouped';
import { EMPTY_LIVE } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/useSldTwinInputs';
import { TwinJson } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/protocol';
import { isEdgeAnimated, makeLiveResolver, selectSldGraph } from '../src/utils/sld';
import { twinMajority } from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinGrouped';
import { buildSldGrouping, makeGroupedResolver, SldGrouping } from '../src/utils/sldGroup';
import { energyPalette } from '../src/theme/tokens';

type Json = Record<string, any>;

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const groupingOf = (sld: unknown): SldGrouping => {
  const graph = selectSldGraph({ siteComponents: { sldV2: sld } });
  if (!graph) throw new Error('no graph');
  return buildSldGrouping(graph);
};

const LUCKY_SLD = luckyFixture.sld as unknown as TwinJson;
const LUCKY_LIVE = luckyFixture.live as unknown as TwinJson;
const LUCKY_GROUPING = groupingOf(LUCKY_SLD);

const WIND_IDS = ['2', '4', '9', '7', '10', '11'];
const SOLAR_IDS = ['3', '6', '8', '15', '17', '19', '18', '13', '20'];
const MEMBER_IDS = new Set([...WIND_IDS, ...SOLAR_IDS]);

const grouped = (sld = LUCKY_SLD, live: TwinJson | null = LUCKY_LIVE, grouping = LUCKY_GROUPING) =>
  twinDataFor('grouped', sld, grouping, live);
/** The most common value (first seen wins a tie) — the adapter's rule. */
const mostCommon = (values: string[]): string => {
  const counts = new Map<string, number>();
  values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = values[0];
  values.forEach(v => {
    if ((counts.get(v) ?? 0) > (counts.get(best) ?? 0)) best = v;
  });
  return best;
};
const rawMembersOf = (ids: string[]): Json[] =>
  ((LUCKY_SLD as Json).nodes as Json[]).filter(n => ids.includes(n.id));
/** The members' backend colours / cable strokes (what the twin shows in Units). */
const memberIconColor = (ids: string[]) => mostCommon(rawMembersOf(ids).map(n => n.data.icon.color));
const memberColor = (ids: string[]) =>
  mostCommon(rawMembersOf(ids).map(n => n.data.color ?? n.data.icon.color));
const memberStroke = (ids: string[], target: string) =>
  mostCommon(
    ((LUCKY_SLD as Json).edges as Json[])
      .filter(e => ids.includes(String(e.source)) && String(e.target) === target)
      .map(e => e.style.stroke),
  );
const nodesOf = (sld: TwinJson | null): Json[] => (sld as Json).nodes;
const edgesOf = (sld: TwinJson | null): Json[] => (sld as Json).edges;
const innerOf = (live: TwinJson | null): Json => (live as Json).live;

describe('Units', () => {
  it('passes the raw sldV2 and live.data through (same objects)', () => {
    const d = twinDataFor('units', LUCKY_SLD, LUCKY_GROUPING, LUCKY_LIVE);
    expect(d.sld).toBe(LUCKY_SLD);
    expect(d.live).toBe(LUCKY_LIVE);
    expect(d.mode).toBe('units');
  });

  it('Grouped with nothing to group is Units (same objects)', () => {
    const lone = {
      nodes: [
        { id: '1', type: 'custom', position: { x: 0, y: 0 }, data: { heading: 'Plant', keys: [], type: 'logo' } },
        { id: '2', type: 'custom', position: { x: 300, y: 0 }, data: { heading: 'PV-01', keys: [], icon: { name: 'solar', color: '#0f0' } } },
      ],
      edges: [{ id: 'e2-1', source: '2', target: '1', sourceHandle: 'l', targetHandle: 'r' }],
    } as unknown as TwinJson;
    const grouping = groupingOf(lone);
    expect(grouping.groups).toHaveLength(0);
    const d = twinDataFor('grouped', lone, grouping, LUCKY_LIVE);
    expect(d).toEqual({ sld: lone, live: LUCKY_LIVE, mode: 'units' });
    expect(d.sld).toBe(lone);
    expect(d.live).toBe(LUCKY_LIVE);
    expect(buildTwinGroupedSld(lone, grouping)).toBeNull();
    // No diagram / no grouping yet → Units, untouched.
    expect(twinDataFor('grouped', null, null, LUCKY_LIVE)).toEqual({ sld: null, live: LUCKY_LIVE, mode: 'units' });
    expect(twinDataFor('grouped', LUCKY_SLD, null, null)).toEqual({ sld: LUCKY_SLD, live: null, mode: 'units' });
  });
});

describe('Grouped diagram — Lucky Cement', () => {
  const d = grouped();
  const nodes = nodesOf(d.sld);
  const edges = edgesOf(d.sld);
  const groupNode = (heading: string) => nodes.find(n => n.data.heading === heading) as Json;

  it('is the Diagram’s grouping: 7 nodes, the two groups in their first member’s place', () => {
    expect(d.mode).toBe('grouped');
    expect(nodes.map(n => n.data.heading)).toEqual([
      'LCL Plant',
      'Wind · 6',
      'Solar · 9',
      'Captive Plant',
      'BESS',
      'WHR Plant',
      'SVG',
    ]);
    // The Diagram's own grouped graph has the same nodes.
    expect(new Set(nodes.map(n => n.id))).toEqual(new Set(LUCKY_GROUPING.graph.nodes.map(n => n.id)));
    expect(LUCKY_GROUPING.groups.map(g => g.id)).toEqual(['sldgrp:wind:1', 'sldgrp:solar:1']);
  });

  it('keeps every other node and edge as the SAME raw object, in order', () => {
    const raw = (LUCKY_SLD as Json).nodes as Json[];
    const kept = raw.filter(n => !MEMBER_IDS.has(n.id));
    expect(nodes.filter(n => !String(n.id).startsWith('sldgrp:'))).toEqual(kept);
    kept.forEach(n => expect(nodes).toContain(n)); // identity
    const rawEdges = (LUCKY_SLD as Json).edges as Json[];
    const keptEdges = rawEdges.filter(e => !MEMBER_IDS.has(e.source) && !MEMBER_IDS.has(e.target));
    expect(keptEdges).toHaveLength(4);
    expect(edges.filter(e => !String(e.source).startsWith('sldgrp:'))).toEqual(keptEdges);
    keptEdges.forEach(e => expect(edges).toContain(e));
    // Anything else on the diagram object rides along.
    const withCustom = { ...(LUCKY_SLD as Json), custom: { grid: false } } as TwinJson;
    expect((grouped(withCustom, LUCKY_LIVE, groupingOf(withCustom)).sld as Json).custom).toEqual({ grid: false });
  });

  it('removes every member and every edge touching one', () => {
    expect(nodes.some(n => MEMBER_IDS.has(n.id))).toBe(false);
    expect(edges.some(e => MEMBER_IDS.has(e.source) || MEMBER_IDS.has(e.target))).toBe(false);
    expect(edges).toHaveLength(6);
  });

  it('a group node = the grouping’s id, position, heading, rows; the twin icon in the members’ backend colour', () => {
    LUCKY_GROUPING.groups.forEach(g => {
      const node = nodes.find(n => n.id === g.id) as Json;
      const diagram = LUCKY_GROUPING.graph.nodes.find(n => n.id === g.id)!;
      expect(node.type).toBe(diagram.type);
      expect(node.position).toEqual(diagram.position);
      expect(node.data.heading).toBe(diagram.data.heading);
      expect(node.data.edgesConnect).toBe('source');
      // Same rows as the Diagram's card (labels + units), synthetic params.
      expect(node.data.keys.map((k: Json) => [k.label, k.unit])).toEqual(
        diagram.data.keys.map(k => [k.label, k.unit]),
      );
      node.data.keys.forEach((k: Json) => expect(k.param).toMatch(/^live\.pesgrp\d+k\d+\.value$/));
      // The members' BACKEND colour (as the twin draws them in Units), never
      // the Diagram card's palette colour — a mode switch never recolours
      // the 3D.
      const ids = g.members.map(m => m.id);
      expect(node.data.icon.color).toBe(memberIconColor(ids));
      expect(node.data.color).toBe(memberColor(ids));
    });
    const wind = groupNode('Wind · 6');
    expect(wind.data.icon).toEqual({ name: TWIN_GROUP_ICON.wind, color: memberIconColor(WIND_IDS) });
    // Lucky: the turbines are the backend's orange, not the palette's cyan.
    expect(wind.data.icon.color).not.toBe(energyPalette.wind);
    expect(wind.data.color).toBe(memberColor(WIND_IDS));
    expect(wind.data.keys).toEqual([
      { label: 'P', unit: 'kW', param: 'live.pesgrp0k0.value' },
      { label: 'Q', unit: 'kVar', param: 'live.pesgrp0k1.value' },
    ]);
    expect(wind.data.animation).toEqual({
      animationParams: 'live.Wind units flowing.value',
      operator: '!=',
      value: 0,
    });
    const solar = groupNode('Solar · 9');
    expect(solar.data.icon).toEqual({ name: TWIN_GROUP_ICON.solar, color: memberIconColor(SOLAR_IDS) });
    expect(solar.data.animation.animationParams).toBe('live.Solar units flowing.value');
    expect(TWIN_GROUP_ICON).toEqual({ solar: 'solar', wind: 'wind', genset: 'genset', battery: 'battery', grid: 'pylon' });
  });

  it('carries the RAW members (same objects, raw order) for the page bridge', () => {
    const raw = (LUCKY_SLD as Json).nodes as Json[];
    const members = (ids: string[]) => raw.filter(n => ids.includes(n.id));
    expect(groupNode('Wind · 6').data[TWIN_GROUP_MEMBERS_KEY]).toEqual(members(WIND_IDS));
    groupNode('Wind · 6').data[TWIN_GROUP_MEMBERS_KEY].forEach((m: Json) => expect(raw).toContain(m));
    expect(groupNode('Solar · 9').data[TWIN_GROUP_MEMBERS_KEY]).toEqual(members(SOLAR_IDS));
    // The bridge removes it under the same name.
    const bridge = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
    expect(bridge).toContain(`var GROUP_MEMBERS = '${TWIN_GROUP_MEMBERS_KEY}';`);
  });

  it('group → target edges are the grouping’s (handles; the members’ backend stroke), in the first member edge’s place', () => {
    const groupEdges = edges.filter(e => String(e.source).startsWith('sldgrp:'));
    expect(groupEdges.map(e => e.id)).toEqual(['sldgrp:wind:1->1', 'sldgrp:solar:1->1']);
    groupEdges.forEach(e => {
      const diagram = LUCKY_GROUPING.graph.edges.find(x => x.id === e.id)!;
      const group = LUCKY_GROUPING.groups.find(g => g.id === diagram.source)!;
      const stroke = memberStroke(group.members.map(m => m.id), diagram.target);
      expect(e).toEqual({
        id: diagram.id,
        source: diagram.source,
        target: diagram.target,
        sourceHandle: diagram.sourceHandle,
        targetHandle: diagram.targetHandle,
        type: diagram.type,
        style: { stroke },
        markerEnd: { ...diagram.markerEnd, color: stroke },
        data: {},
      });
    });
    expect(groupEdges[0].style.stroke).toBe(memberStroke(WIND_IDS, '1'));
    expect(groupEdges[0].style.stroke).not.toBe(energyPalette.wind);
    // The first raw edge was a wind member's: the wind group edge leads.
    expect(edges[0].id).toBe('sldgrp:wind:1->1');
  });

  it('is deterministic and cached per (diagram, grouping)', () => {
    expect(grouped().sld).toBe(d.sld);
    const again = grouped(clone(LUCKY_SLD), LUCKY_LIVE, groupingOf(clone(LUCKY_SLD)));
    expect(again.sld).not.toBe(d.sld);
    expect(again.sld).toEqual(d.sld);
    expect(again.live).toEqual(d.live);
  });

  it('reads numeric raw ids the way the app parses them', () => {
    const numeric = clone(LUCKY_SLD) as Json;
    numeric.nodes.forEach((n: Json) => {
      n.id = Number(n.id);
    });
    numeric.edges.forEach((e: Json) => {
      e.source = Number(e.source);
      e.target = Number(e.target);
    });
    const out = grouped(numeric as TwinJson, LUCKY_LIVE, groupingOf(numeric));
    expect(nodesOf(out.sld).map(n => n.data.heading)).toEqual(nodes.map(n => n.data.heading));
    expect(edgesOf(out.sld)).toHaveLength(6);
  });
});

describe('Grouped live data', () => {
  const d = grouped();
  const inner = innerOf(d.live);
  const base = makeLiveResolver({ live: { data: LUCKY_LIVE } });
  const resolve = makeGroupedResolver(base, LUCKY_GROUPING.groups);

  it('adds the Diagram group card’s numbers; every real entry is untouched', () => {
    const rawInner = (LUCKY_LIVE as Json).live as Json;
    Object.keys(rawInner).forEach(p => expect(inner[p]).toBe(rawInner[p]));
    LUCKY_GROUPING.groups.forEach((g, gi) => {
      g.keys.forEach((k, ki) => {
        expect(inner[`pesgrp${gi}k${ki}`]).toEqual({ value: resolve(k.param) });
      });
    });
    // Lucky: Wind P = 1240.5 + 980 + 1100.3 + 0 + 1320.8 + 0; Solar P = the 8 producing arrays.
    expect(inner.pesgrp0k0.value).toBeCloseTo(4641.6, 6);
    expect(inner.pesgrp1k0.value).toBeCloseTo(634.5, 6);
    expect(inner.pesgrp0k1.value).toBeCloseTo(85.2 + 60.5 + 70.1 + 0 + 88 + 0, 6);
    expect(Object.keys(inner).filter(p => !(p in rawInner)).sort()).toEqual(
      ['Solar units flowing', 'Wind units flowing', 'pesgrp0k0', 'pesgrp0k1', 'pesgrp1k0', 'pesgrp1k1'].sort(),
    );
  });

  it('flow = members running (Lucky: every unit has a complete `!= 0` rule, so the Diagram agrees)', () => {
    expect(inner['Wind units flowing']).toEqual({ value: 4 }); // WTG-04 / -06 at 0
    expect(inner['Solar units flowing']).toEqual({ value: 8 }); // SG-CI-PV-06 at 0
    LUCKY_GROUPING.groups.forEach(g => {
      const any = g.targets.some(t => resolve(g.flowParams[t]) === 1);
      const count = g.members.filter(m =>
        g.memberEdges.some(e => e.source === m.id && isEdgeAnimated(e, m, base)),
      ).length;
      expect(count > 0).toBe(any);
    });
    // Nothing flowing → 0 (the group's cable idles).
    const still = clone(LUCKY_LIVE) as Json;
    ['p10326', 'p10327', 'p10328', 'p10330'].forEach(p => {
      still.live[p].value = 0;
    });
    expect(innerOf(grouped(LUCKY_SLD, still as TwinJson).live)['Wind units flowing']).toEqual({ value: 0 });
  });

  it('"—" in the Diagram → NA; the top-level envelope rides along', () => {
    const gap = clone(LUCKY_LIVE) as Json;
    ['p10326', 'p10327', 'p10328', 'p10329', 'p10330', 'p10331'].forEach(p => {
      gap.live[p].value = 'NA';
    });
    gap.update_at = 1759310000;
    gap.metadata = { kept: true };
    const out = grouped(LUCKY_SLD, gap as TwinJson).live as Json;
    expect(out.live.pesgrp0k0).toEqual({ value: 'NA' });
    expect(out.live.pesgrp0k1.value).toBeCloseTo(303.8, 6); // Q still reported
    expect(out.live['Wind units flowing']).toEqual({ value: 0 });
    expect(out.update_at).toBe(1759310000);
    expect(out.metadata).toEqual({ kept: true });
  });

  it('no live data (EMPTY_LIVE) → every group reading NA, nothing flowing', () => {
    const out = grouped(LUCKY_SLD, EMPTY_LIVE).live as Json;
    expect(out).toEqual({
      live: {
        pesgrp0k0: { value: 'NA' },
        pesgrp0k1: { value: 'NA' },
        'Wind units flowing': { value: 0 },
        pesgrp1k0: { value: 'NA' },
        pesgrp1k1: { value: 'NA' },
        'Solar units flowing': { value: 0 },
      },
    });
    // `/data/all` not answered yet → still nothing (the page waits).
    expect(grouped(LUCKY_SLD, null).live).toBeNull();
  });

  it('stamps every group entry with the newest member update_at, as sent, read the twin’s way', () => {
    const stamped = clone(LUCKY_LIVE) as Json;
    Object.values(stamped.live as Record<string, Json>).forEach(e => {
      e.update_at = 1759310000;
    });
    // The twin reads numbers only (its `tz`): a newer ISO string is no time.
    stamped.live.p10328.update_at = '2027-01-01T10:00:00Z';
    stamped.live.p10372.update_at = '1759310460'; // WTG-03 Q: the newest wind stamp (numeric string)
    stamped.live.p47.update_at = 1759310999999; // a PV in ms: the newest solar stamp
    const out = innerOf(grouped(LUCKY_SLD, stamped as TwinJson).live);
    ['pesgrp0k0', 'pesgrp0k1', 'Wind units flowing'].forEach(p => expect(out[p].update_at).toBe('1759310460'));
    ['pesgrp1k0', 'pesgrp1k1', 'Solar units flowing'].forEach(p => expect(out[p].update_at).toBe(1759310999999));
  });

  it('is cached per (diagram, live): a live tick changes only `live`', () => {
    const structure = buildTwinGroupedSld(LUCKY_SLD, LUCKY_GROUPING) as TwinGroupedSld;
    expect(buildTwinGroupedLive(structure, LUCKY_LIVE)).toBe(d.live);
    const tick = clone(LUCKY_LIVE) as Json;
    tick.live.p10329.value = 900;
    const next = grouped(LUCKY_SLD, tick as TwinJson);
    expect(next.sld).toBe(d.sld);
    expect(next.live).not.toBe(d.live);
    expect(innerOf(next.live).pesgrp0k0.value).toBeCloseTo(5541.6, 6);
    expect(innerOf(next.live)['Wind units flowing']).toEqual({ value: 5 });
  });
});

describe('Grouped — other shapes', () => {
  // Two wind groups (different targets) + a WHR pair.
  const node = (id: string, heading: string, icon: string, color: string, extra: Json = {}) => ({
    id,
    type: 'custom',
    position: { x: Number(id) * 100, y: 0 },
    data: {
      heading,
      edgesConnect: 'source',
      icon: { name: icon, color },
      keys: [{ label: 'P', unit: 'kW', param: `live.p${id}.value` }],
      animation: { animationParams: `live.p${id}.value`, operator: '!=', value: 0 },
      ...extra,
    },
  });
  const edge = (s: string, t: string) => ({ id: `e${s}-${t}`, source: s, target: t, sourceHandle: 'r', targetHandle: 'l', type: 'buttonedge', style: { stroke: '#61656b' } });
  const sld = {
    nodes: [
      { id: '1', type: 'custom', position: { x: 0, y: 500 }, data: { heading: 'Plant', keys: [], type: 'logo', edgesConnect: 'target' } },
      node('2', 'WTG-01', 'wind', '#ff7d00'),
      node('3', 'WTG-02', 'wind', '#ff7d00'),
      node('4', 'Feeder', 'busbar', '#888888'),
      node('5', 'WTG-03', 'wind', '#ff7d00'),
      node('6', 'WTG-04', 'wind', '#ff7d00'),
      node('7', 'WHR Plant 1', 'genset', '#1fcee5'),
      node('8', 'WHR Plant 2', 'genset', '#1fcee5'),
    ],
    edges: [edge('2', '1'), edge('3', '1'), edge('4', '1'), edge('5', '4'), edge('6', '4'), edge('7', '1'), edge('8', '1')],
  } as unknown as TwinJson;
  const live = { live: Object.fromEntries(['2', '3', '4', '5', '6', '7', '8'].map(id => [`p${id}`, { value: 10 }])) } as unknown as TwinJson;
  const out = twinDataFor('grouped', sld, groupingOf(sld), live);
  const byHeading = (h: string) => nodesOf(out.sld).filter(n => n.data.heading === h);

  it('worded flow ids stay unique per diagram', () => {
    const winds = byHeading('Wind · 2');
    expect(winds).toHaveLength(2);
    expect(winds.map(n => n.data.animation.animationParams).sort()).toEqual([
      'live.Wind units flowing (2).value',
      'live.Wind units flowing.value',
    ]);
    const inner = innerOf(out.live);
    expect(inner['Wind units flowing']).toEqual({ value: 2 });
    expect(inner['Wind units flowing (2)']).toEqual({ value: 2 });
  });

  it('WHR keeps its members’ icon (the twin’s title rule picks the steam model)', () => {
    const whr = byHeading('WHR · 2');
    expect(whr).toHaveLength(1);
    expect(whr[0].data.icon).toEqual({ name: 'genset', color: '#1fcee5' });
  });

  it('a group feeding a non-hub node keeps that edge target', () => {
    const toFeeder = edgesOf(out.sld).filter(e => e.target === '4');
    expect(toFeeder).toHaveLength(1);
    expect(String(toFeeder[0].source)).toMatch(/^sldgrp:wind:4$/);
    // The feeder's own edge to the plant is the same raw object.
    expect(edgesOf(out.sld)).toContain((sld as Json).edges[2]);
  });
});

/* ─────────── Grouped ⇄ Units agree on what runs (the shipped bridge) ─────────── */

interface BridgeLiveValues {
  buildLiveValues: (sld: unknown, store: unknown) => {
    nodeKv: Record<string, Record<string, string>>;
    edgeMode: Record<string, 'flow' | 'idle'>;
  } | null;
}
const bridgeLive: BridgeLiveValues = (() => {
  const src = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
  const start = src.indexOf('// ---- live values');
  const end = src.indexOf('// ---- redux store');
  // eslint-disable-next-line no-new-func
  return new Function(`${src.slice(start, end)}; return { buildLiveValues };`)() as BridgeLiveValues;
})();
/**
 * Node ids the twin draws running for (sld, live): its edgeMode says
 * 'flow', or — no rule — "live" (a numeric reading).
 */
const twinRunning = (sld: TwinJson | null, live: TwinJson | null): Set<string> => {
  const lv = bridgeLive.buildLiveValues(sld, live);
  const out = new Set<string>();
  ((sld as Json).nodes as Json[]).forEach(n => {
    const id = String(n.id);
    const mode = lv?.edgeMode[id];
    const reading = Object.values(lv?.nodeKv[id] ?? {}).some(v => v !== '—');
    if (mode === 'flow' || (mode === undefined && reading)) out.add(id);
  });
  return out;
};
/** Units vs Grouped: a group runs ⟺ one of its members runs in Units. */
const expectSameRunning = (sld: TwinJson, live: TwinJson) => {
  const grouping = groupingOf(sld);
  const units = twinRunning(sld, live);
  const g = twinDataFor('grouped', sld, grouping, live);
  const groupedRunning = twinRunning(g.sld, g.live);
  grouping.groups.forEach(group => {
    const anyMember = group.members.some(m => units.has(m.id));
    expect([group.id, groupedRunning.has(group.id)]).toEqual([group.id, anyMember]);
  });
  return g;
};

describe('Grouped ⇄ Units agree on what runs — the twin’s own rule', () => {
  const hub = { id: '1', type: 'custom', position: { x: 0, y: 600 }, data: { heading: 'Plant', keys: [], type: 'logo', edgesConnect: 'target' } };
  const bus = { id: '9', type: 'custom', position: { x: 600, y: 600 }, data: { heading: 'Bus', keys: [] } };
  const pv = (id: string, extra: Json = {}) => ({
    id,
    type: 'custom',
    position: { x: Number(id) * 150, y: 0 },
    data: { heading: `PV-0${id}`, icon: { name: 'solar', color: '#00ff00' }, keys: [{ label: 'P', unit: 'kW', param: `live.p${id}.value` }], ...extra },
  });
  const cable = (s: string, t: string, extra: Json = {}) => ({ id: `e${s}-${t}`, source: s, target: t, sourceHandle: 'b', targetHandle: 't', style: { stroke: '#00e004' }, ...extra });
  const liveOf = (values: Record<string, unknown>) =>
    ({ live: Object.fromEntries(Object.entries(values).map(([id, value]) => [`p${id}`, { value }])) }) as unknown as TwinJson;
  const groupOf = (out: { sld: TwinJson | null }) => nodesOf(out.sld).find(n => String(n.id).startsWith('sldgrp:')) as Json;

  it('Lucky: the same units run in both modes', () => {
    expectSameRunning(LUCKY_SLD, LUCKY_LIVE);
    const still = clone(LUCKY_LIVE) as Json;
    ['p10326', 'p10327', 'p10328', 'p10330'].forEach(p => {
      still.live[p].value = 0;
    });
    expectSameRunning(LUCKY_SLD, still as TwinJson);
  });

  it('no unit has a rule: the group has none either — "live" like its units, cables flowing by default', () => {
    const sld = { nodes: [hub, pv('2'), pv('3')], edges: [cable('2', '1'), cable('3', '1')] } as unknown as TwinJson;
    const out = expectSameRunning(sld, liveOf({ 2: 50, 3: 60 }));
    const group = groupOf(out);
    expect(group.data.animation).toBeUndefined();
    // No flow entry is needed (nothing reads one).
    expect(Object.keys(innerOf(out.live)).filter(k => k.includes('flowing'))).toEqual([]);
    expect(edgesOf(out.sld).find(e => e.source === group.id)?.data).toEqual({ mode: 'flow' });
    // Nothing numeric: neither runs.
    expectSameRunning(sld, liveOf({ 2: 'NA', 3: null }));
  });

  it('per-target cables without a rule: each group → target edge carries its members’ mode to THAT target', () => {
    const sld = {
      nodes: [hub, bus, pv('2'), pv('3')],
      edges: [
        cable('2', '1', { data: { mode: 'flow' } }),
        cable('2', '9', { data: { mode: 'idle' } }),
        cable('3', '1', { data: { mode: 'flow' } }),
        cable('3', '9', { data: { mode: 'idle' } }),
      ],
    } as unknown as TwinJson;
    const out = twinDataFor('grouped', sld, groupingOf(sld), liveOf({ 2: 50, 3: 60 }));
    const group = groupOf(out);
    expect(group.data.animation).toBeUndefined();
    const modes = Object.fromEntries(
      edgesOf(out.sld).filter(e => e.source === group.id).map(e => [e.target, e.data.mode]),
    );
    expect(modes).toEqual({ 1: 'flow', 9: 'idle' });
    // One unit's cable to the bus flows → the group's does.
    const oneFlows = clone(sld) as Json;
    oneFlows.edges[1].data.mode = undefined;
    const out2 = twinDataFor('grouped', oneFlows as TwinJson, groupingOf(oneFlows), liveOf({ 2: 50, 3: 60 }));
    expect(edgesOf(out2.sld).find(e => e.target === '9' && String(e.source).startsWith('sldgrp:'))?.data.mode).toBe('flow');
  });

  it('an incomplete rule (no operator / value) reads `!= 0`, like the twin', () => {
    const sld = {
      nodes: [hub, pv('2', { animation: { animationParams: 'live.p2.value' } }), pv('3', { animation: { animationParams: 'live.p3.value', operator: '>' } })],
      edges: [cable('2', '1'), cable('3', '1')],
    } as unknown as TwinJson;
    let out = expectSameRunning(sld, liveOf({ 2: 50, 3: 0 }));
    expect(groupOf(out).data.animation).toEqual({ animationParams: 'live.Solar units flowing.value', operator: '!=', value: 0 });
    expect(innerOf(out.live)['Solar units flowing']).toEqual({ value: 1 });
    out = expectSameRunning(sld, liveOf({ 2: 0, 3: 0 }));
    expect(innerOf(out.live)['Solar units flowing']).toEqual({ value: 0 });
  });

  it('a reading below 0.005 is "0.00" for the twin: not running', () => {
    const rule = (id: string) => ({ animation: { animationParams: `live.p${id}.value`, operator: '!=', value: 0 } });
    const sld = { nodes: [hub, pv('2', rule('2')), pv('3', rule('3'))], edges: [cable('2', '1'), cable('3', '1')] } as unknown as TwinJson;
    const out = expectSameRunning(sld, liveOf({ 2: 0.004, 3: -0.004 }));
    expect(innerOf(out.live)['Solar units flowing']).toEqual({ value: 0 });
    expect(innerOf(expectSameRunning(sld, liveOf({ 2: 0.006, 3: 0 })).live)['Solar units flowing']).toEqual({ value: 1 });
  });

  it('mixed: a unit with no rule counts as running when it has a reading (the twin’s "live")', () => {
    const sld = {
      nodes: [hub, pv('2', { animation: { animationParams: 'live.p2.value', operator: '!=', value: 0 } }), pv('3')],
      edges: [cable('2', '1'), cable('3', '1')],
    } as unknown as TwinJson;
    const out = expectSameRunning(sld, liveOf({ 2: 0, 3: 12 }));
    expect(innerOf(out.live)['Solar units flowing']).toEqual({ value: 1 });
    expect(innerOf(expectSameRunning(sld, liveOf({ 2: 0, 3: 'NA' })).live)['Solar units flowing']).toEqual({ value: 0 });
  });
});

describe('Grouped colours — the twin’s reading, never the palette', () => {
  const hub = { id: '1', type: 'custom', position: { x: 0, y: 600 }, data: { heading: 'Plant', keys: [], type: 'logo', edgesConnect: 'target' } };
  const wtg = (id: string, icon: Json) => ({
    id,
    type: 'custom',
    position: { x: Number(id) * 150, y: 0 },
    data: { heading: `WTG-0${id}`, icon, keys: [{ label: 'P', unit: 'kW', param: `live.p${id}.value` }] },
  });
  const cable = (s: string, extra: Json = {}) => ({ id: `e${s}-1`, source: s, target: '1', sourceHandle: 'b', targetHandle: 't', ...extra });
  const live = { live: { p2: { value: 10 }, p3: { value: 10 }, p4: { value: 10 }, p5: { value: 10 } } } as unknown as TwinJson;
  const groupedOf = (sld: Json) => twinDataFor('grouped', sld as TwinJson, groupingOf(sld), live);
  const PALETTE = new Set(Object.values(energyPalette).map(c => c.toLowerCase()));
  const hexes = (v: unknown): string[] => (JSON.stringify(v).match(/#[0-9a-fA-F]{3,8}/g) ?? []).map(h => h.toLowerCase());

  it('members with no colour of their own: no palette colour anywhere — the twin’s own no-colour path', () => {
    const sld = { nodes: [hub, wtg('2', { name: 'wind' }), wtg('3', { name: 'wind' })], edges: [cable('2'), cable('3')] };
    const out = groupedOf(sld);
    const group = nodesOf(out.sld).find(n => String(n.id).startsWith('sldgrp:')) as Json;
    const edge = edgesOf(out.sld).find(e => e.source === group.id) as Json;
    expect(group.data.color).toBeUndefined();
    expect(group.data.icon).toEqual({ name: 'wind' });
    expect(edge.style).toBeUndefined();
    expect(edge.markerEnd).toEqual({ type: 'arrowclosed' });
    // The group's own fields (its raw members carry their own, unchanged).
    const own = { ...group.data };
    delete own[TWIN_GROUP_MEMBERS_KEY];
    expect(hexes(own).filter(h => PALETTE.has(h))).toEqual([]);
    expect(hexes(edge)).toEqual([]);
  });

  it('cable colours read like the twin: style.stroke ‖ markerEnd.color ‖ color', () => {
    const icon = { name: 'wind', color: '#ff7d00' };
    const viaMarker = groupedOf({ nodes: [hub, wtg('2', icon), wtg('3', icon)], edges: [cable('2', { markerEnd: { color: '#123456' } }), cable('3', { markerEnd: { color: '#123456' } })] });
    const e1 = edgesOf(viaMarker.sld).find(e => String(e.source).startsWith('sldgrp:')) as Json;
    expect([e1.style, e1.markerEnd.color]).toEqual([{ stroke: '#123456' }, '#123456']);
    const viaColor = groupedOf({ nodes: [hub, wtg('2', icon), wtg('3', icon)], edges: [cable('2', { color: '#654321' }), cable('3', { color: '#654321' })] });
    const e2 = edgesOf(viaColor.sld).find(e => String(e.source).startsWith('sldgrp:')) as Json;
    expect(e2.style).toEqual({ stroke: '#654321' });
  });

  it('a majority tie goes to the FIRST member (like the bridge’s majorityLook)', () => {
    expect(twinMajority(['#aaa', '#bbb', '#bbb', '#aaa'])).toBe('#aaa');
    expect(twinMajority([undefined, '#bbb', '', '#aaa', '#aaa'])).toBe('#aaa');
    expect(twinMajority([undefined, ''])).toBeUndefined();
    expect(mostCommon(['#aaa', '#bbb', '#bbb', '#aaa'])).toBe('#aaa');
    const sld = {
      nodes: [hub, wtg('2', { name: 'wind', color: '#aaa' }), wtg('3', { name: 'wind', color: '#bbb' }), wtg('4', { name: 'wind', color: '#bbb' }), wtg('5', { name: 'wind', color: '#aaa' })],
      edges: [cable('2', { style: { stroke: '#a00' } }), cable('3', { style: { stroke: '#b00' } }), cable('4', { style: { stroke: '#b00' } }), cable('5', { style: { stroke: '#a00' } })],
    };
    const out = groupedOf(sld);
    const group = nodesOf(out.sld).find(n => String(n.id).startsWith('sldgrp:')) as Json;
    expect([group.data.color, group.data.icon.color]).toEqual(['#aaa', '#aaa']);
    expect((edgesOf(out.sld).find(e => e.source === group.id) as Json).style).toEqual({ stroke: '#a00' });
  });
});

describe('the smoke fixture', () => {
  it('fixtures/lucky-grouped.json is this adapter’s output for fixtures/lucky.json', () => {
    const file = path.resolve(__dirname, '../scripts/web-twin/fixtures/lucky-grouped.json');
    const d = grouped();
    const expected = {
      source:
        'SldTwin/twinGrouped.ts (twinDataFor "grouped") on fixtures/lucky.json — written by __tests__/sldTwinGrouped.test.ts with SLD_TWIN_WRITE_FIXTURES=1',
      siteName: luckyFixture.siteName,
      sld: d.sld,
      live: d.live,
    };
    const text = `${JSON.stringify(expected, null, 1)}\n`;
    if (process.env.SLD_TWIN_WRITE_FIXTURES === '1') fs.writeFileSync(file, text);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toBe(text);
  });
});
