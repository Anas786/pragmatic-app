/**
 * SLD phone layout (`buildSldPhoneLayout`) — the backend's desktop canvas
 * re-arranged into a readable 2-column phone diagram around the plant.
 *
 * Fixtures: the reference graph (`sldGraphMock`) is Lucky Cement Nooriabad
 * — a STAR, all 19 units → "LCL Plant" (grouped: Solar · 9, Wind · 6,
 * Captive Plant, WHR Plant, BESS, SVG). `youngsFood()` rebuilds Young's
 * Food's depth-2 TREE from its real headings / edges: NAtest → p+q,
 * New battery → p+q, p+q → Industry, battery test → for normal,
 * for normal → Industry, for exp → Industry, test exp → Industry.
 */
import { describe, expect, it } from '@jest/globals';
import {
  buildSldPhoneLayout,
  sldPhoneCardHeight,
  SLD_PHONE_CARD,
  SLD_PHONE_GRID_W,
  SLD_PHONE_HUB,
  SLD_PHONE_HUB_HEIGHT,
  SldPhoneLayout,
} from '../src/utils/sldPhoneLayout';
import { buildSldGrouping, sldEdgeRoutes } from '../src/utils/sldGroup';
import {
  isLogoNode,
  nodeRectInBounds,
  resolveNodeRects,
  SLDRect,
  SLD_EDGE_STUB,
} from '../src/utils/sld';
import { sldGraphMock } from '../src/data/mock/sld';
import { selectSldGraph } from '../src/utils/sld';
import { SLDEdge, SLDGraph, SLDHandle, SLDNode } from '../src/types';

/* ─────────── fixtures ─────────── */

const clone = (graph: SLDGraph): SLDGraph => JSON.parse(JSON.stringify(graph));

const KEY_SETS: Record<number, { label: string; unit?: string }[]> = {
  0: [],
  1: [{ label: 'P', unit: 'kW' }],
  2: [
    { label: 'P', unit: 'kW' },
    { label: 'Q', unit: 'kVar' },
  ],
};

const node = (
  id: string,
  heading: string,
  x: number,
  y: number,
  icon: string,
  keys: number,
  logo = false,
): SLDNode => ({
  id,
  type: 'custom',
  position: { x, y },
  data: {
    heading,
    keys: KEY_SETS[keys].map((k, i) => ({ ...k, param: `live.${id}${i}.value` })),
    edgesConnect: logo ? 'target' : 'source',
    icon: { name: icon, color: '#3B82F6' },
    type: logo ? 'logo' : null,
  },
});

const edge = (source: string, target: string): SLDEdge => ({
  id: `e-${source}-${target}`,
  source,
  target,
  sourceHandle: 'b',
  targetHandle: 't',
  type: 'buttonedge',
  style: { stroke: '#61656b' },
  markerEnd: { color: '#61656b', type: 'arrowclosed' },
  data: { mode: 'flow' },
});

/** Young's Food: "Industry" (a busbar, not a logo) is the hub by in-degree. */
const youngsFood = (): SLDGraph => ({
  nodes: [
    node('ind', 'Industry', 520, 620, 'busbar', 1),
    node('na', 'NAtest', 120, 80, 'solarLg', 2),
    node('nb', 'New battery', 380, 80, 'battery', 0),
    node('pq', 'p+q', 250, 330, 'switchLg', 2),
    node('bt', 'battery test', 640, 80, 'battery', 1),
    node('fn', 'for normal', 640, 330, 'switchLg', 2),
    node('fe', 'for exp', 900, 330, 'switchLg', 0),
    node('te', 'test exp', 1160, 330, 'switchLg', 1),
  ],
  edges: [
    edge('na', 'pq'),
    edge('nb', 'pq'),
    edge('pq', 'ind'),
    edge('bt', 'fn'),
    edge('fn', 'ind'),
    edge('fe', 'ind'),
    edge('te', 'ind'),
  ],
});

/** A hub with `n` leaf units feeding it (all unclassified, x-ordered). */
const star = (n: number): SLDGraph => ({
  nodes: [
    node('hub', 'Plant', 0, 0, 'industry', 1, true),
    ...Array.from({ length: n }, (_, i) => node(`u${i}`, `Feeder ${i}`, 100 * i, 500, 'switchLg', 1)),
  ],
  edges: Array.from({ length: n }, (_, i) => edge(`u${i}`, 'hub')),
});

const GROUPED = buildSldGrouping(sldGraphMock).graph;

/* ─────────── helpers ─────────── */

const rectsOf = (l: SldPhoneLayout): Map<string, SLDRect> =>
  new Map(l.graph.nodes.map(n => [n.id, nodeRectInBounds(n, l.bounds)]));

const byHeading = (l: SldPhoneLayout, heading: string): SLDNode =>
  l.graph.nodes.find(n => n.data.heading === heading)!;

const rectOf = (l: SldPhoneLayout, heading: string): SLDRect =>
  nodeRectInBounds(byHeading(l, heading), l.bounds);

const byId = (l: SldPhoneLayout, id: string): SLDNode => l.graph.nodes.find(n => n.id === id)!;

/** Gap-aware overlap: true when two cards are closer than `gap` on both axes. */
const tooClose = (a: SLDRect, b: SLDRect, gap: number): boolean =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/** Strict interior intersection of an axis-aligned segment with a rect. */
const segmentEntersRect = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  r: SLDRect,
): boolean => {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y;
};

const centreX = (r: SLDRect) => r.x + r.w / 2;
const centreY = (r: SLDRect) => r.y + r.h / 2;
const isAbove = (r: SLDRect, hub: SLDRect) => r.y + r.h <= hub.y;
const isBelow = (r: SLDRect, hub: SLDRect) => r.y >= hub.y + hub.h;

/** Invariants every layout must keep. */
const expectSoundLayout = (source: SLDGraph) => {
  const l = buildSldPhoneLayout(source);
  // Same nodes, once each, in order; every one sized and placed.
  expect(l.graph.nodes.map(n => n.id)).toEqual(source.nodes.map(n => n.id));
  l.graph.nodes.forEach((n, i) => {
    expect(n.size).toBeDefined();
    expect(n.data).toBe(source.nodes[i].data);
  });
  // Same edges (ids, endpoints, colours, flow data) — only handles change.
  expect(l.graph.edges).toHaveLength(source.edges.length);
  l.graph.edges.forEach((e, i) => {
    const o = source.edges[i];
    expect([e.id, e.source, e.target]).toEqual([o.id, o.source, o.target]);
    expect(e.style).toBe(o.style);
    expect(e.markerEnd).toBe(o.markerEnd);
    expect(e.data).toBe(o.data);
  });
  // No two cards within the de-overlap gap; all inside the frame.
  const rects = Array.from(rectsOf(l).values());
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(tooClose(rects[i], rects[j], 12)).toBe(false);
    }
    expect(rects[i].x).toBeGreaterThanOrEqual(0);
    expect(rects[i].y).toBeGreaterThanOrEqual(0);
    expect(rects[i].x + rects[i].w).toBeLessThanOrEqual(l.bounds.width);
    expect(rects[i].y + rects[i].h).toBeLessThanOrEqual(l.bounds.height);
  }
  // The renderer's de-overlap pass leaves it exactly as laid out.
  expect(resolveNodeRects(l.graph, l.bounds)).toEqual(rectsOf(l));
  // The frame holds every route, in both routing modes.
  const rs = rectsOf(l);
  for (const e of l.graph.edges) {
    for (const route of sldEdgeRoutes(e, rs)) {
      for (const p of route) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(l.bounds.width);
        expect(p.y).toBeLessThanOrEqual(l.bounds.height);
      }
    }
  }
  return l;
};

const ROUTE_NAMES = ['orthogonal', 'curved'];

/**
 * No edge route runs through a card it doesn't connect — in BOTH routing
 * modes: the orthogonal default AND the curved one the routing button
 * switches to (the renderer's own bezier, sampled).
 */
const expectClearRoutes = (l: SldPhoneLayout) => {
  const rects = rectsOf(l);
  for (const e of l.graph.edges) {
    const routes = sldEdgeRoutes(e, rects);
    expect(routes).toHaveLength(2);
    routes.forEach((route, m) => {
      rects.forEach((r, id) => {
        if (id === e.source || id === e.target) return;
        for (let i = 1; i < route.length; i++) {
          expect([ROUTE_NAMES[m], e.id, id, segmentEntersRect(route[i - 1], route[i], r)]).toEqual([
            ROUTE_NAMES[m],
            e.id,
            id,
            false,
          ]);
        }
      });
    });
  }
};

/** A same-side (`l`/`l`, `r`/`r`) lane's vertical run: its x and y span. */
const laneRun = (l: SldPhoneLayout, e: SLDEdge) => {
  const [route] = sldEdgeRoutes(e, rectsOf(l));
  const ys = route.map(p => p.y);
  return { x: route[1].x, y0: Math.min(...ys), y1: Math.max(...ys) };
};

/* ─────────── tests ─────────── */

describe('card metrics', () => {
  it('reserves two heading lines and fixed metric rows', () => {
    const c = SLD_PHONE_CARD;
    const header = 2 * c.border + c.padTop + c.headingLines * c.headingLine + c.padBottom + c.slack;
    expect(sldPhoneCardHeight(0)).toBe(header);
    const divider = c.dividerTop + 1 + c.dividerBottom;
    expect(sldPhoneCardHeight(1)).toBe(header + divider + c.rowLine);
    expect(sldPhoneCardHeight(3)).toBe(header + divider + 3 * c.rowLine + 2 * c.rowGap);
    expect(SLD_PHONE_HUB_HEIGHT).toBe(
      2 * SLD_PHONE_HUB.border +
        2 * SLD_PHONE_HUB.padY +
        SLD_PHONE_HUB.headingLines * SLD_PHONE_HUB.headingLine +
        SLD_PHONE_HUB.valueLine,
    );
  });

  it('is sized for a phone: the grid is ~360 units wide, type is legible at 1:1', () => {
    expect(SLD_PHONE_GRID_W + 24).toBeLessThanOrEqual(360);
    expect(SLD_PHONE_HUB.width).toBeLessThan(SLD_PHONE_GRID_W);
    expect(SLD_PHONE_CARD.headingSize).toBeGreaterThanOrEqual(14);
    expect(SLD_PHONE_CARD.valueSize).toBeGreaterThanOrEqual(15);
    expect(SLD_PHONE_CARD.labelSize).toBeGreaterThanOrEqual(12);
    expect(SLD_PHONE_CARD.unitSize).toBeGreaterThanOrEqual(12);
  });
});

describe('Lucky Cement — grouped (the approved preview)', () => {
  const l = expectSoundLayout(GROUPED);
  const hub = rectOf(l, 'LCL Plant');
  const r = (h: string) => rectOf(l, h);

  it('puts 4 sources above the plant and 2 below, by energy type', () => {
    const above = l.graph.nodes.filter(n => isAbove(nodeRectInBounds(n, l.bounds), hub));
    const below = l.graph.nodes.filter(n => isBelow(nodeRectInBounds(n, l.bounds), hub));
    expect(above.map(n => n.data.heading).sort()).toEqual(
      ['Captive Plant', 'Solar · 9', 'WHR Plant', 'Wind · 6'],
    );
    expect(below.map(n => n.data.heading).sort()).toEqual(['BESS', 'SVG']);
    // [Solar | Wind] / [Captive | WHR] / (plant) / [BESS | SVG]
    expect(r('Solar · 9').y).toBe(r('Wind · 6').y);
    expect(r('Captive Plant').y).toBe(r('WHR Plant').y);
    expect(r('Solar · 9').y).toBeLessThan(r('Captive Plant').y);
    expect(r('Solar · 9').x).toBe(r('Captive Plant').x);
    expect(r('Solar · 9').x).toBeLessThan(r('Wind · 6').x);
    expect(r('BESS').y).toBe(r('SVG').y);
    expect(r('BESS').x).toBe(r('Solar · 9').x);
    expect(r('SVG').x).toBe(r('Wind · 6').x);
  });

  it('centres the plant between the columns, as a capsule', () => {
    expect(centreX(hub)).toBeCloseTo((r('Solar · 9').x + r('Wind · 6').x + r('Wind · 6').w) / 2, 9);
    expect(centreX(hub)).toBeCloseTo(l.bounds.width / 2, 9);
    expect([hub.w, hub.h]).toEqual([SLD_PHONE_HUB.width, SLD_PHONE_HUB_HEIGHT]);
    expect(l.focus).toEqual({ x: centreX(hub), y: centreY(hub) });
  });

  it('sizes cards from their rows, evened out per grid row', () => {
    expect(r('Solar · 9').h).toBe(sldPhoneCardHeight(2));
    expect(r('Wind · 6').h).toBe(sldPhoneCardHeight(2));
    expect(r('Captive Plant').h).toBe(sldPhoneCardHeight(3));
    // SVG has 2 keys but shares its row with the 3-key BESS.
    expect(r('SVG').h).toBe(r('BESS').h);
    expect(r('BESS').h).toBe(sldPhoneCardHeight(3));
    l.graph.nodes.forEach(n => {
      if (!isLogoNode(n)) expect(n.size!.w).toBe(SLD_PHONE_CARD.width);
    });
  });

  it('points every handle at the plant: └┬┘ bus next to it, inner side into the trunk beyond', () => {
    const plant = byHeading(l, 'LCL Plant').id;
    const handle = (heading: string): [SLDHandle, SLDHandle] => {
      const e = l.graph.edges.find(x => x.source === byHeading(l, heading).id)!;
      expect(e.target).toBe(plant);
      return [e.sourceHandle, e.targetHandle];
    };
    expect(handle('Captive Plant')).toEqual(['b', 't']);
    expect(handle('WHR Plant')).toEqual(['b', 't']);
    expect(handle('BESS')).toEqual(['t', 'b']);
    expect(handle('SVG')).toEqual(['t', 'b']);
    // The far row (Captive / WHR sit between it and the plant).
    expect(handle('Solar · 9')).toEqual(['r', 't']);
    expect(handle('Wind · 6')).toEqual(['l', 't']);
  });

  it('runs the trunk exactly one stub from each column (no back-tracking)', () => {
    const solar = r('Solar · 9');
    const wind = r('Wind · 6');
    expect(centreX(hub) - (solar.x + solar.w)).toBe(SLD_EDGE_STUB);
    expect(wind.x - centreX(hub)).toBe(SLD_EDGE_STUB);
    // Plant ↔ adjacent rows: two stubs, so the bus is one straight run.
    expect(hub.y - (r('Captive Plant').y + r('Captive Plant').h)).toBe(2 * SLD_EDGE_STUB);
    expect(r('BESS').y - (hub.y + hub.h)).toBe(2 * SLD_EDGE_STUB);
  });

  it('never routes a line through a card', () => {
    expectClearRoutes(l);
  });

  it('is shorter than one phone screen and fits the inline width at ~1:1', () => {
    expect(l.bounds.width).toBe(360);
    expect(l.bounds.height).toBeLessThan(700);
  });
});

describe('Lucky Cement — units', () => {
  const l = expectSoundLayout(sldGraphMock);
  const hub = rectOf(l, 'LCL Plant');

  it('splits 19 units 10 above / 9 below the plant', () => {
    const rects = l.graph.nodes.filter(n => !isLogoNode(n)).map(n => nodeRectInBounds(n, l.bounds));
    expect(rects.filter(x => isAbove(x, hub))).toHaveLength(10);
    expect(rects.filter(x => isBelow(x, hub))).toHaveLength(9);
  });

  it('orders units by energy type, then the web canvas left → right', () => {
    const reading = l.graph.nodes
      .filter(n => !isLogoNode(n))
      .map(n => ({ h: n.data.heading, r: nodeRectInBounds(n, l.bounds) }))
      .sort((a, b) => a.r.y - b.r.y || a.r.x - b.r.x)
      .map(x => x.h);
    expect(reading).toEqual([
      'PV-SG-CI-01', 'PV-SG-CI-02',
      'PV-SG-CI-03', 'PV-SG-CI-04',
      'PV-SG-CI-05', 'SG-CI-PV-06',
      'PV-SG-CI-07', 'PV-SG-CI-08',
      'PV-SG-CI-09', 'GW-WTG-01',
      'GW-WTG-02', 'GW-WTG-03',
      'GW-WTG-04', 'GW-WTG-05',
      'GW-WTG-06', 'Captive Plant',
      'WHR Plant', 'BESS',
      'SVG',
    ]);
  });

  it('centres a lone last row under the plant and links it straight down the trunk', () => {
    const svg = rectOf(l, 'SVG');
    expect(centreX(svg)).toBeCloseTo(centreX(hub), 9);
    const e = l.graph.edges.find(x => x.id === 'e16-1')!;
    expect([e.sourceHandle, e.targetHandle]).toEqual(['t', 'b']);
  });

  it('never routes a line through a card', () => {
    expectClearRoutes(l);
  });
});

describe("Young's Food — a depth-2 tree", () => {
  const l = expectSoundLayout(youngsFood());
  const r = (h: string) => rectOf(l, h);
  const hub = r('Industry');
  const handles = (id: string): [SLDHandle, SLDHandle] => {
    const e = l.graph.edges.find(x => x.id === id)!;
    return [e.sourceHandle, e.targetHandle];
  };

  it('picks the busbar every feeder points into as the hub', () => {
    expect(isLogoNode(byHeading(l, 'Industry'))).toBe(false);
    expect(l.focus).toEqual({ x: centreX(hub), y: centreY(hub) });
    expect(hub.w).toBe(SLD_PHONE_CARD.width);
  });

  it('splits the 4 branches 2 above / 2 below', () => {
    expect(isAbove(r('p+q'), hub)).toBe(true);
    expect(isAbove(r('for normal'), hub)).toBe(true);
    expect(isBelow(r('for exp'), hub)).toBe(true);
    expect(isBelow(r('test exp'), hub)).toBe(true);
  });

  it('stacks each subtree in its parent’s column, outward, in chain order', () => {
    // p+q ← NAtest ← (New battery, a 2nd child of p+q)
    expect(r('NAtest').x).toBe(r('p+q').x);
    expect(r('New battery').x).toBe(r('p+q').x);
    expect(r('NAtest').y + r('NAtest').h).toBeLessThan(r('p+q').y);
    expect(r('New battery').y + r('New battery').h).toBeLessThan(r('NAtest').y);
    expect(r('p+q').y - (r('NAtest').y + r('NAtest').h)).toBe(2 * SLD_EDGE_STUB);
    // for normal ← battery test, level with NAtest.
    expect(r('battery test').x).toBe(r('for normal').x);
    expect(r('battery test').y).toBe(r('NAtest').y);
    expect(r('p+q').y).toBe(r('for normal').y);
  });

  it('links neighbours vertically and a non-adjacent child through the outer lane', () => {
    expect(handles('e-na-pq')).toEqual(['b', 't']);
    expect(handles('e-bt-fn')).toEqual(['b', 't']);
    // New battery sits beyond NAtest: both ends on p+q's column's OUTER side.
    const outer: SLDHandle = r('p+q').x < centreX(hub) ? 'l' : 'r';
    expect(handles('e-nb-pq')).toEqual([outer, outer]);
    // …which needs the wider frame padding.
    expect(l.bounds.width).toBe(SLD_PHONE_GRID_W + 2 * (SLD_EDGE_STUB + 8));
    expect(handles('e-pq-ind')).toEqual(['b', 't']);
    expect(handles('e-fe-ind')).toEqual(['t', 'b']);
  });

  it('gives key-less nodes the header-only card', () => {
    expect(r('for exp').h).toBe(r('test exp').h);
    expect(r('New battery').h).toBe(sldPhoneCardHeight(0));
  });

  it('never routes a line through a card', () => {
    expectClearRoutes(l);
  });
});

describe('topology edge cases', () => {
  it('draws edges outside the spanning tree (a cycle) clear of every card', () => {
    const g = star(4);
    // Two links between hub neighbours: each closes a cycle through the hub.
    g.edges.push(edge('u0', 'u1'), edge('u2', 'u0'));
    const l = expectSoundLayout(g);
    const handles = (id: string) => {
      const e = l.graph.edges.find(x => x.id === id)!;
      return [e.sourceHandle, e.targetHandle];
    };
    // Side by side across the column gap: facing handles are already clear.
    expect(handles('e-u0-u1')).toEqual(['r', 'l']);
    // Below → above the plant: facing (t/b) would run straight through it,
    // so the link takes the outer-side lane instead.
    expect(handles('e-u2-u0')).toEqual(['l', 'l']);
    expect(laneRun(l, l.graph.edges.find(x => x.id === 'e-u2-u0')!).x).toBeLessThan(0 - l.bounds.minX);
    expectClearRoutes(l);
  });

  it('never draws a cross link through the plant (no false junction)', () => {
    // a (solar) + b (wind) above, c (battery) centred below; a → c crosses.
    const g: SLDGraph = {
      nodes: [
        node('hub', 'Plant', 0, 0, 'industry', 1, true),
        node('a', 'PV', 0, 0, 'solarLg', 1),
        node('b', 'WTG', 100, 0, 'wind', 1),
        node('c', 'BESS', 0, 500, 'battery', 1),
      ],
      edges: [edge('a', 'hub'), edge('b', 'hub'), edge('c', 'hub'), edge('a', 'c')],
    };
    const l = expectSoundLayout(g);
    const hub = rectOf(l, 'Plant');
    expect(isAbove(rectOf(l, 'PV'), hub)).toBe(true);
    expect(isBelow(rectOf(l, 'BESS'), hub)).toBe(true);
    const e = l.graph.edges.find(x => x.id === 'e-a-c')!;
    expect([e.sourceHandle, e.targetHandle]).not.toEqual(['b', 't']);
    expectClearRoutes(l);
  });

  it('attaches a node reachable from two branches to the first one only', () => {
    const g = star(2);
    g.nodes.push(node('c', 'Shared', 50, 900, 'switchLg', 1));
    g.edges.push(edge('c', 'u0'), edge('c', 'u1'));
    const l = expectSoundLayout(g);
    const c = rectOf(l, 'Shared');
    expect(c.x).toBe(rectOf(l, 'Feeder 0').x);
    const toU1 = l.graph.edges.find(e => e.id === 'e-c-u1')!;
    const toU0 = l.graph.edges.find(e => e.id === 'e-c-u0')!;
    expect([toU0.sourceHandle, toU0.targetHandle]).toEqual(['b', 't']);
    expect(toU1.sourceHandle).not.toBe(toU0.sourceHandle);
  });

  it('lays a disconnected node and component out below the main one, never dropping them', () => {
    const g = clone(GROUPED);
    g.nodes.push(node('lone', 'Spare Meter', 0, 0, 'meter', 1));
    g.nodes.push(node('a', 'Island Bus', 0, 0, 'switchLg', 1), node('b', 'Island DG', 0, 0, 'genset', 2));
    g.edges.push(edge('b', 'a'));
    const l = expectSoundLayout(g);
    const main = GROUPED.nodes.map(n => nodeRectInBounds(byId(l, n.id), l.bounds));
    const mainBottom = Math.max(...main.map(x => x.y + x.h));
    // Components follow graph order: the spare meter, then the island.
    const spare = rectOf(l, 'Spare Meter');
    const bus = rectOf(l, 'Island Bus');
    const dg = rectOf(l, 'Island DG');
    expect(spare.y).toBeGreaterThan(mainBottom);
    expect(centreX(spare)).toBeCloseTo(l.bounds.width / 2, 9);
    // The island's hub is the node its edge points into.
    expect(dg.y + dg.h).toBeLessThan(bus.y);
    expect(dg.y).toBeGreaterThan(spare.y + spare.h);
    const e = l.graph.edges.find(x => x.id === 'e-b-a')!;
    expect([e.sourceHandle, e.targetHandle]).toEqual(['b', 't']);
    // The viewport still focuses the MAIN plant.
    const plant = rectOf(l, 'LCL Plant');
    expect(l.focus).toEqual({ x: centreX(plant), y: centreY(plant) });
  });

  it('handles a single node and an empty graph', () => {
    const one: SLDGraph = { nodes: [node('solo', 'Solo', 999, 999, 'industry', 1, true)], edges: [] };
    const l = expectSoundLayout(one);
    const r = rectOf(l, 'Solo');
    expect(centreX(r)).toBeCloseTo(l.bounds.width / 2, 9);
    expect(l.focus).toEqual({ x: centreX(r), y: centreY(r) });

    const empty: SLDGraph = { nodes: [], edges: [] };
    const e = buildSldPhoneLayout(empty);
    expect(e.graph).toBe(empty);
    expect(e.bounds.width).toBeGreaterThan(0);
    expect(e.bounds.height).toBeGreaterThan(0);
  });

  it('ignores self-loops and edges to unknown nodes when picking the tree', () => {
    const g = star(2);
    g.edges.push(edge('u0', 'u0'), edge('u1', 'ghost'));
    const l = buildSldPhoneLayout(g);
    expect(l.graph.edges.find(e => e.id === 'e-u1-ghost')).toEqual(g.edges[3]);
    expect(l.graph.nodes.every(n => n.size !== undefined)).toBe(true);
  });

  it('fills whole rows above the hub: ceil(n/2) rounded up to even', () => {
    const split = (n: number) => {
      const l = buildSldPhoneLayout(star(n));
      const hub = rectOf(l, 'Plant');
      const rs = l.graph.nodes.filter(x => x.id !== 'hub').map(x => nodeRectInBounds(x, l.bounds));
      return [rs.filter(x => isAbove(x, hub)).length, rs.filter(x => isBelow(x, hub)).length];
    };
    const want: Record<number, [number, number]> = {
      0: [0, 0],
      1: [1, 0],
      2: [2, 0],
      3: [2, 1],
      4: [2, 2],
      5: [4, 1],
      6: [4, 2],
      7: [4, 3],
      9: [6, 3],
      19: [10, 9],
    };
    for (const [n, split2] of Object.entries(want)) {
      expect([n, ...split(Number(n))]).toEqual([n, ...split2]);
    }
  });

  it('prefers a logo node as the hub, else the most-pointed-into node', () => {
    // No logo: Industry (4 incoming edges) beats p+q (2).
    const plain = buildSldPhoneLayout(youngsFood());
    const ind = rectOf(plain, 'Industry');
    expect(plain.focus).toEqual({ x: centreX(ind), y: centreY(ind) });
    // A logo wins even with fewer incoming edges.
    const withLogo = youngsFood();
    withLogo.nodes[3] = { ...withLogo.nodes[3], data: { ...withLogo.nodes[3].data, type: 'logo' } };
    const l = buildSldPhoneLayout(withLogo);
    const pq = rectOf(l, 'p+q');
    expect(l.focus).toEqual({ x: centreX(pq), y: centreY(pq) });
  });

  it('ranks incoming edges above degree when picking the hub', () => {
    // X: 3 in + 1 out (degree 4). Y: 2 in + 4 out (degree 6). No logo.
    const g: SLDGraph = {
      nodes: [
        node('y', 'Feeder bus', 0, 0, 'busbar', 1),
        node('x', 'Main bus', 0, 0, 'busbar', 1),
        ...['a', 'b', 'c', 'd', 'p', 'q', 'r', 's'].map(id => node(id, `Unit ${id}`, 0, 0, 'switchLg', 1)),
      ],
      edges: [
        edge('a', 'x'),
        edge('b', 'x'),
        edge('c', 'x'),
        edge('x', 'y'),
        edge('d', 'y'),
        ...['p', 'q', 'r', 's'].map(id => edge('y', id)),
      ],
    };
    const l = expectSoundLayout(g);
    const x = rectOf(l, 'Main bus');
    expect(l.focus).toEqual({ x: centreX(x), y: centreY(x) });
    expect(centreX(x)).toBeCloseTo(l.bounds.width / 2, 9);
    expectClearRoutes(l);
  });

  it('nests side lanes so lanes to different parents never share a line', () => {
    // hub ← A, X;  A ← B, E;  B ← C, D  → A's stack: A, B, C, D, E.
    // D → B and E → A both skip cards; E → A's lane spans D → B's.
    const g: SLDGraph = {
      nodes: [
        node('hub', 'Plant', 0, 0, 'industry', 1, true),
        node('A', 'A', 0, 0, 'solarLg', 1),
        node('X', 'X', 100, 0, 'wind', 1),
        node('B', 'B', 0, 0, 'switchLg', 1),
        node('E', 'E', 100, 0, 'switchLg', 1),
        node('C', 'C', 0, 0, 'switchLg', 1),
        node('D', 'D', 100, 0, 'switchLg', 1),
      ],
      edges: [
        edge('A', 'hub'),
        edge('X', 'hub'),
        edge('B', 'A'),
        edge('E', 'A'),
        edge('C', 'B'),
        edge('D', 'B'),
      ],
    };
    const l = expectSoundLayout(g);
    const r = (h: string) => rectOf(l, h);
    // One column, outward from the plant in pre-order.
    for (const h of ['B', 'C', 'D', 'E']) expect(r(h).x).toBe(r('A').x);
    const ys = ['A', 'B', 'C', 'D', 'E'].map(h => r(h).y);
    expect([...ys].sort((p, q) => q - p)).toEqual(ys);

    const byEdge = (id: string) => l.graph.edges.find(x => x.id === id)!;
    const inner = byEdge('e-D-B');
    const outer = byEdge('e-E-A');
    expect([inner.sourceHandle, inner.targetHandle]).toEqual(['l', 'l']);
    expect([outer.sourceHandle, outer.targetHandle]).toEqual(['l', 'l']);
    // The inner lane keeps the default stub; the outer runs one step farther out.
    expect(inner.routeStub).toBeUndefined();
    expect(outer.routeStub).toBeGreaterThan(SLD_EDGE_STUB);
    const ri = laneRun(l, inner);
    const ro = laneRun(l, outer);
    expect(ro.x).toBeLessThan(ri.x);
    expect(ro.y0).toBeLessThan(ri.y0);
    expect(ro.y1).toBeGreaterThan(ri.y1);

    // Generally: two lanes on one x belong to the same parent, or their
    // vertical runs don't even touch.
    const lanes = l.graph.edges.filter(e => e.sourceHandle === e.targetHandle);
    for (let i = 0; i < lanes.length; i++) {
      for (let j = i + 1; j < lanes.length; j++) {
        const a = laneRun(l, lanes[i]);
        const b = laneRun(l, lanes[j]);
        if (lanes[i].target === lanes[j].target || a.x !== b.x) continue;
        expect(a.y1 < b.y0 || b.y1 < a.y0).toBe(true);
      }
    }
    expectClearRoutes(l);
  });

  it('nests a lane that would continue another one into a single line', () => {
    // hub ← A;  A ← B, E;  E ← F, G  → stack A, B, E, F, G: E → A ends
    // where G → E starts (both at E), so they must not share an x.
    const g: SLDGraph = {
      nodes: [
        node('hub', 'Plant', 0, 0, 'industry', 1, true),
        ...['A', 'B', 'E', 'F', 'G'].map((id, i) => node(id, id, i, 0, 'switchLg', 1)),
      ],
      edges: [edge('A', 'hub'), edge('B', 'A'), edge('E', 'A'), edge('F', 'E'), edge('G', 'E')],
    };
    const l = expectSoundLayout(g);
    const ea = laneRun(l, l.graph.edges.find(x => x.id === 'e-E-A')!);
    const ge = laneRun(l, l.graph.edges.find(x => x.id === 'e-G-E')!);
    expect(ea.x).not.toBe(ge.x);
    expectClearRoutes(l);
  });
});

describe('determinism + memo contract', () => {
  it('lays out equal graphs identically', () => {
    for (const g of [sldGraphMock, GROUPED, youngsFood()]) {
      expect(buildSldPhoneLayout(clone(g))).toEqual(buildSldPhoneLayout(clone(g)));
    }
  });

  it('caches per graph reference (live ticks never re-layout)', () => {
    const a = buildSldPhoneLayout(GROUPED);
    expect(buildSldPhoneLayout(GROUPED)).toBe(a);
    const b = buildSldPhoneLayout(clone(GROUPED));
    expect(b).not.toBe(a);
    expect(b).toEqual(a);
  });

  it('one site config → one graph for every consumer → the layout cache hits', () => {
    // Summary, the inline diagram and the full-screen route each select the
    // graph from the same React Query config object.
    const config = { siteComponents: { sldV2: clone(sldGraphMock) } };
    const a = selectSldGraph(config)!;
    expect(a.nodes).toHaveLength(sldGraphMock.nodes.length);
    expect(selectSldGraph(config)).toBe(a);
    expect(buildSldPhoneLayout(buildSldGrouping(selectSldGraph(config)!).graph)).toBe(
      buildSldPhoneLayout(buildSldGrouping(a).graph),
    );
    // A refetched config (new object) is re-read.
    const next = selectSldGraph({ siteComponents: { sldV2: clone(sldGraphMock) } })!;
    expect(next).not.toBe(a);
    expect(next).toEqual(a);
    // No diagram → null, cached too.
    const none = { siteComponents: {} };
    expect(selectSldGraph(none)).toBeNull();
    expect(selectSldGraph(none)).toBeNull();
  });

  it('does not mutate its input', () => {
    const g = youngsFood();
    const before = clone(g);
    buildSldPhoneLayout(g);
    expect(g).toEqual(before);
  });
});

/* ─────────── value text size (replaces adjustsFontSizeToFit) ─────────── */

import { estimateSldTextWidth, sldValueFontSize } from '../src/utils/sldPhoneLayout';

describe('sldValueFontSize — chosen from the text, never auto-shrunk', () => {
  it('ordinary Lucky Cement values keep the full 16pt', () => {
    expect(sldValueFontSize('0.00', 'kVar', 'Q')).toBe(16);
    expect(sldValueFontSize('2,569.92', 'kW', 'P')).toBe(16);
    expect(sldValueFontSize('16,698.00', 'kVar', 'Q')).toBe(16);
    // The widest real value (minus + 6 digits + kVar) is within ~1pt of the
    // row width at 16, so the 2% safety margin steps it to 14 — never tiny.
    expect(sldValueFontSize('-6,448.77', 'kVar', 'Q')).toBe(14);
    expect(sldValueFontSize('78.20', '%', 'SOC')).toBe(16);
    expect(sldValueFontSize('61,885.43', 'kW', 'P', 'hub')).toBe(16);
  });

  it('longer values step down, never below the 12pt floor', () => {
    const big = sldValueFontSize('1,234,567.89', 'kVar', 'Q');
    expect(big).toBeLessThan(16);
    expect(big).toBeGreaterThanOrEqual(12);
    expect(sldValueFontSize('123,456,789,012.34', 'kVar', 'Q')).toBe(12);
    expect(sldValueFontSize('-1.2e35', 'kWh', 'P')).toBe(16); // garbage stays readable
  });

  it('the chosen size fits the estimate (monotonic in length)', () => {
    let prev = 16;
    for (const v of ['1', '12,345.67', '123,456.78', '1,234,567.89', '12,345,678.90']) {
      const size = sldValueFontSize(v, 'kVar', 'Q');
      expect(size).toBeLessThanOrEqual(prev);
      prev = size;
    }
    expect(estimateSldTextWidth('0.00', 16, true)).toBeGreaterThan(0);
  });
});

import { sldValueDisplay } from '../src/utils/sldPhoneLayout';

describe('sldValueDisplay — a value is never truncated', () => {
  it('a value that fits keeps the precise backend text and unit', () => {
    expect(sldValueDisplay(2569.92, 'kW', 'P')).toEqual({ text: '2,569.92', unit: 'kW', size: 16 });
    expect(sldValueDisplay(61691.23, 'kW', 'P', 'hub')).toMatchObject({ text: '61,691.23', unit: 'kW' });
  });

  it("too long even at 12pt → the compact form with the unit rescaled (Young's Food hub)", () => {
    const v = sldValueDisplay(1186687.53, 'MW', 'test', 'hub');
    expect(v.text).toBe('1.19');
    expect(v.unit).toBe('TW');
    expect(v.size).toBeGreaterThanOrEqual(12);
  });

  it('missing stays "—", garbage stays in e-notation', () => {
    expect(sldValueDisplay(null, 'kW', 'P').text).toBe('—');
    expect(sldValueDisplay(-1.2e35, 'kWh', 'P').text).toBe('-1.2e35');
  });
});
