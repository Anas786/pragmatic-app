/**
 * SLD phone layout — the same boxes and connections, re-arranged for a tall
 * phone screen so the diagram reads WITHOUT zooming.
 *
 * The backend ships the web's React-Flow canvas (absolute positions over
 * ~1800 × 860 units). Fitted to a ~360pt phone that canvas renders at ≈ 0.2,
 * i.e. 2–3pt text. This transform keeps every node and edge but places them
 * on a 2-column grid around the plant (the "hub"), in graph units sized so
 * the inline viewport fits the grid's width at ≈ 1pt per unit:
 *
 *     [ Solar · 9 ]   [ Wind · 6  ]   ← farther rows join the trunk from
 *     [ Captive   ]   [ WHR Plant ]     their inner side
 *           └───────┬───────┘         ← the hub-adjacent row: └┬┘ bus
 *              ( LCL Plant )
 *           ┌───────┴───────┐
 *     [ BESS      ]   [ SVG       ]
 *
 * Rules (all deterministic):
 *   - Hub: a logo node (`isLogoNode`) when there is one, else any node — the
 *     most incoming edges, then the highest degree, then graph order.
 *   - Spanning tree by BFS from the hub over the UNDIRECTED graph. Each
 *     direct neighbour of the hub roots a "branch" (itself + its subtree). A
 *     branch is ONE column: its subtree stacks outward from the hub in DFS
 *     pre-order, so a chain reads hub ← A ← B ← C.
 *   - Branches are ordered by energy type (solar, wind, genset, WHR, grid,
 *     battery, then the rest — `classifySldNode`), then backend x, y, graph
 *     order; packed 2 per row; the first ceil(n/2), rounded up to whole
 *     rows, go ABOVE the hub (6 → 4 + 2, 19 → 10 + 9), the rest below. A row
 *     holding a single branch centres it.
 *   - Handles face the hub. A hub-adjacent row and a centred branch link
 *     vertically (`b` / `t`); a farther row leaves from its INNER side into
 *     the trunk running down the column gap at the hub's centre-x, so the
 *     existing orthogonal router draws a bus and never a line through a
 *     card. Linked levels sit 2 stubs apart (straight links, no
 *     back-tracking); a child that isn't next to its parent in the stack is
 *     wired through a lane on the stack's OUTER side. Lanes nest (a deeper
 *     parent's lane runs inside an outer one): each nesting level runs one
 *     `LANE_STEP` farther out (`edge.routeStub`), so lanes to DIFFERENT
 *     parents never share a vertical line.
 *   - Edges outside the spanning tree (cross links, cycles) are still drawn:
 *     each gets the handle pair whose routes (orthogonal AND curved) cross
 *     the fewest cards — facing handles when they're clear, else e.g. an
 *     outer-side lane — never a false junction through the hub. A repeated
 *     edge between a tree pair shares that pair's handles. Components with
 *     no path to the hub are laid out below it, each around its own hub —
 *     nothing is dropped.
 *   - The frame is padded to hold every route in both routing modes (lanes
 *     outside the columns), symmetric per axis so the hub stays centred.
 *
 * Every placed node gets its card size (`node.size`); cards on one row level
 * share a height so the grid stays even, and every gap is ≥ the renderer's
 * de-overlap gap, so `resolveNodeRects` leaves the layout untouched.
 *
 * STRUCTURE ONLY: depends on the graph alone and is cached per graph
 * reference — live-data ticks never re-layout. Pure TS (no React / RN).
 */

import { SLDEdge, SLDGraph, SLDHandle, SLDNode } from 'src/types';
import {
  facingHandles,
  formatSldValue,
  isLogoNode,
  SLDBounds,
  SLDPoint,
  SLDRect,
  SLD_EDGE_STUB,
} from './sld';
import { classifySldNode, SldEnergyType, sldEdgeRoutes } from './sldGroup';
import { formatQuantity } from './units';

/* ─────────── card metrics (graph units ≈ points at the inline fit) ─────────── */

/**
 * Source-card geometry + type, shared with the renderer (`SLDCanvas`) so the
 * layout's card heights and the drawn cards can't drift. Text sizes are in
 * graph units (`AppText fixedSize="exact"`): the canvas itself is scaled to
 * the screen, so at the inline fit (≈ 1) headings read ≈ 14pt, values ≈ 16pt
 * and labels / units ≈ 12pt.
 */
export const SLD_PHONE_CARD = {
  width: 148,
  border: 1,
  radius: 14,
  padX: 10,
  padTop: 10,
  padBottom: 10,
  iconWell: 28,
  icon: 22,
  headerGap: 8,
  headingSize: 14,
  headingLine: 18,
  /** Headings wrap to at most 2 lines (ellipsis after); the header band always reserves both. */
  headingLines: 2,
  dividerTop: 8,
  dividerBottom: 6,
  rowLine: 20,
  rowGap: 4,
  labelSize: 12,
  labelLine: 16,
  valueSize: 16,
  unitSize: 12,
  /** Spare height so a sub-point line-box difference can't grow the card into the next row. */
  slack: 2,
} as const;

/** The hub (logo node) capsule: icon well + heading (≤ 2 lines) + its first key. */
export const SLD_PHONE_HUB = {
  width: 196,
  border: 2,
  padX: 14,
  padY: 10,
  iconWell: 36,
  icon: 28,
  gap: 10,
  headingSize: 14,
  headingLine: 18,
  headingLines: 2,
  valueSize: 16,
  valueLine: 20,
  labelSize: 12,
  labelLine: 16,
} as const;

/** Hub capsule height: two heading lines + the value line. */
export const SLD_PHONE_HUB_HEIGHT =
  2 * SLD_PHONE_HUB.border +
  2 * SLD_PHONE_HUB.padY +
  SLD_PHONE_HUB.headingLines * SLD_PHONE_HUB.headingLine +
  SLD_PHONE_HUB.valueLine;

/**
 * Height a source card with `rows` metric rows renders at (an upper bound:
 * the divider's hairline counts as 1). The card is drawn with this as its
 * `minHeight`, so the layout reserves exactly what is drawn.
 */
export const sldPhoneCardHeight = (rows: number): number => {
  const c = SLD_PHONE_CARD;
  const body =
    rows > 0 ? c.dividerTop + 1 + c.dividerBottom + rows * c.rowLine + (rows - 1) * c.rowGap : 0;
  return 2 * c.border + c.padTop + c.headingLines * c.headingLine + body + c.padBottom + c.slack;
};

/* ─────────── value text size (no adjustsFontSizeToFit) ─────────── */

/**
 * Advance widths (em) measured from the bundled Poppins TTFs
 * (assets/fonts, 2026-10-02): Bold for values, Medium/SemiBold (≈ equal)
 * for labels and units. Other glyphs use a generous fallback.
 */
const BOLD_EM: Record<string, number> = {
  '0': 0.652,
  '1': 0.376,
  '2': 0.571,
  '3': 0.605,
  '4': 0.677,
  '5': 0.65,
  '6': 0.637,
  '7': 0.535,
  '8': 0.648,
  '9': 0.615,
  ',': 0.287,
  '.': 0.282,
  '-': 0.58,
  '−': 0.58,
  '%': 0.87,
  ' ': 0.212,
  'e': 0.6,
};
const TEXT_EM: Record<string, number> = {
  'k': 0.584,
  'W': 1.024,
  'V': 0.711,
  'a': 0.678,
  'r': 0.404,
  'h': 0.62,
  '%': 0.83,
  'P': 0.608,
  'Q': 0.787,
  'S': 0.609,
  'O': 0.785,
  'C': 0.768,
  'F': 0.53,
  ' ': 0.24,
};
const emWidth = (ch: string, bold: boolean): number => {
  const known = (bold ? BOLD_EM : TEXT_EM)[ch];
  if (known !== undefined) return known;
  if (ch === '—') return 1.0;
  if (ch >= 'A' && ch <= 'Z') return 0.8;
  if (ch === 'i' || ch === 'l' || ch === 'j') return 0.3;
  return 0.66;
};

/** Safety margin on every estimate (sub-pixel layout, kerning). */
const WIDTH_MARGIN = 1.02;

/** Estimated rendered width of `text` at `size` pt. */
export const estimateSldTextWidth = (text: string, size: number, bold = false): number => {
  let em = 0;
  for (const ch of text) em += emWidth(ch, bold);
  return em * size * WIDTH_MARGIN;
};

/** Value sizes tried, largest first. 12 is the floor — still ≥ 11pt on screen. */
const VALUE_STEPS = [16, 14, 12] as const;

/**
 * Font size for a card / hub value, chosen ONCE from the text it shows —
 * the largest step whose estimated width fits beside its label and unit.
 * Replaces `adjustsFontSizeToFit`, which on iOS Fabric ignored
 * `minimumFontScale` inside the scaled SLD canvas and drew some values at
 * ~4pt (seen on Lucky Cement, 2026-10-02) — and is banned in grids anyway
 * (CLAUDE.md §11). A value too long even at 12 keeps 12 and ellipsizes.
 */
const valueAvail = (unit: string | undefined, label: string, variant: 'card' | 'hub'): number => {
  if (variant === 'hub') {
    const h = SLD_PHONE_HUB;
    const inner = h.width - 2 * h.border - 2 * h.padX - h.iconWell - h.gap;
    return (
      inner -
      estimateSldTextWidth(label, h.labelSize, true) -
      (unit ? estimateSldTextWidth(unit, h.labelSize) + 4 : 0) -
      4
    );
  }
  const c = SLD_PHONE_CARD;
  const inner = c.width - 2 * c.border - 2 * c.padX;
  const labelW = Math.min(estimateSldTextWidth(label, c.labelSize, true), inner / 2);
  return inner - labelW - 6 - (unit ? estimateSldTextWidth(unit, c.unitSize) + 3 : 0);
};

/** Largest value step that fits, and whether even the floor fits. */
export const sldValueFit = (
  value: string,
  unit: string | undefined,
  label: string,
  variant: 'card' | 'hub' = 'card',
): { size: number; fits: boolean } => {
  const avail = valueAvail(unit, label, variant);
  for (const size of VALUE_STEPS) {
    if (estimateSldTextWidth(value, size, true) <= avail) return { size, fits: true };
  }
  return { size: VALUE_STEPS[VALUE_STEPS.length - 1], fits: false };
};

/**
 * Font size for a card / hub value, chosen ONCE from the text it shows —
 * the largest step whose estimated width fits beside its label and unit.
 * Replaces `adjustsFontSizeToFit`, which on iOS Fabric ignored
 * `minimumFontScale` inside the scaled SLD canvas and drew some values at
 * ~4pt (seen on Lucky Cement, 2026-10-02) — and is banned in grids anyway
 * (CLAUDE.md §11).
 */
export const sldValueFontSize = (
  value: string,
  unit: string | undefined,
  label: string,
  variant: 'card' | 'hub' = 'card',
): number => sldValueFit(value, unit, label, variant).size;

/* ─────────── grid ─────────── */

/** Column gap: 2 stubs, so an inner-side stub ends exactly on the trunk. */
const COL_GAP = 2 * SLD_EDGE_STUB;
/** Hub ↔ adjacent row and parent ↔ child levels: 2 stubs → straight links. */
const LINK_GAP = 2 * SLD_EDGE_STUB;
/** Between unlinked rows of one section (≥ resolveNodeRects' 12-unit gap). */
const ROW_GAP = 16;
/** Between disconnected components. */
const COMPONENT_GAP = 48;
/** Minimum frame padding around the grid. */
const PAD = 12;
/** Outward step between nested side lanes (one per nesting level). */
const LANE_STEP = 8;
/** Frame margin past the outermost route point: arrowhead half-width + stroke. */
const ROUTE_MARGIN = 8;
/** Clearance a cross link's route keeps from cards it doesn't connect. */
const ROUTE_CLEARANCE = 4;
/** Handle sides, in the (deterministic) order cross-link candidates are tried. */
const SIDES: ReadonlyArray<SLDHandle> = ['t', 'r', 'b', 'l'];

/** Grid width (2 card columns + the trunk gap), graph units. */
export const SLD_PHONE_GRID_W = 2 * SLD_PHONE_CARD.width + COL_GAP;

/** Branch order by energy type; unclassified nodes come last. */
const TYPE_ORDER: ReadonlyArray<SldEnergyType> = [
  'solar',
  'wind',
  'genset',
  'whr',
  'grid',
  'battery',
];

const typeRank = (node: SLDNode): number => {
  const t = classifySldNode(node);
  const i = t ? TYPE_ORDER.indexOf(t) : -1;
  return i < 0 ? TYPE_ORDER.length : i;
};

export interface SldPhoneLayout {
  /** Same nodes (new position + `size`) and edges (new handles). */
  graph: SLDGraph;
  /** Frame around the grid (padding included). */
  bounds: SLDBounds;
  /**
   * Centre of the main hub in FRAME coordinates (bounds origin): what a
   * viewport centres when the diagram is taller than it.
   */
  focus: SLDPoint;
}

type Column = 'left' | 'right' | 'centre';
type Section = 'above' | 'below';

/** Order-independent key of a node pair. */
const pairKey = (a: string, b: string): string => (a < b ? `${a}\n${b}` : `${b}\n${a}`);

const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const cache = new WeakMap<SLDGraph, SldPhoneLayout>();

/**
 * Lay `graph` out for a phone (see the file header). Works on the grouped
 * and the per-unit graph alike; cached per graph reference.
 */
export const buildSldPhoneLayout = (graph: SLDGraph): SldPhoneLayout => {
  const hit = cache.get(graph);
  if (hit) return hit;
  const result = computePhoneLayout(graph);
  cache.set(graph, result);
  return result;
};

const computePhoneLayout = (graph: SLDGraph): SldPhoneLayout => {
  if (graph.nodes.length === 0) {
    return {
      graph,
      bounds: {
        minX: -PAD,
        minY: -PAD,
        width: SLD_PHONE_GRID_W + 2 * PAD,
        height: 2 * PAD,
      },
      focus: { x: SLD_PHONE_GRID_W / 2 + PAD, y: PAD },
    };
  }

  // First occurrence wins for a (malformed) repeated id.
  const byId = new Map<string, SLDNode>();
  const order = new Map<string, number>();
  graph.nodes.forEach((n, i) => {
    if (byId.has(n.id)) return;
    byId.set(n.id, n);
    order.set(n.id, i);
  });
  const ids = Array.from(byId.keys());
  const rank = new Map(ids.map(id => [id, typeRank(byId.get(id)!)]));
  const cmp = (a: string, b: string): number => {
    const na = byId.get(a)!.position;
    const nb = byId.get(b)!.position;
    return (
      rank.get(a)! - rank.get(b)! || na.x - nb.x || na.y - nb.y || order.get(a)! - order.get(b)!
    );
  };

  // Undirected adjacency (deduped, no self-loops) + edge counts for the hub pick.
  const adjSets = new Map<string, Set<string>>(ids.map(id => [id, new Set<string>()]));
  const inDeg = new Map<string, number>();
  const deg = new Map<string, number>();
  for (const e of graph.edges) {
    if (e.source === e.target || !byId.has(e.source) || !byId.has(e.target)) continue;
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
    adjSets.get(e.source)!.add(e.target);
    adjSets.get(e.target)!.add(e.source);
  }
  const adj = new Map<string, string[]>();
  adjSets.forEach((set, id) => adj.set(id, Array.from(set).sort(cmp)));

  /** Logo nodes first; most incoming edges, then degree; earliest on a tie. */
  const pickHub = (members: string[]): string => {
    const logos = members.filter(id => isLogoNode(byId.get(id)!));
    const pool = logos.length > 0 ? logos : members;
    return pool.reduce((best, id) => {
      const dIn = (inDeg.get(id) ?? 0) - (inDeg.get(best) ?? 0);
      if (dIn !== 0) return dIn > 0 ? id : best;
      return (deg.get(id) ?? 0) > (deg.get(best) ?? 0) ? id : best;
    });
  };

  const naturalHeight = (id: string): number => {
    const n = byId.get(id)!;
    return isLogoNode(n) ? SLD_PHONE_HUB_HEIGHT : sldPhoneCardHeight(n.data.keys.length);
  };

  const rects = new Map<string, SLDRect>();
  /** Tree pairs: pairKey → each node's handle (+ the lane's stub, if not the default). */
  const pairs = new Map<string, { handles: Map<string, SLDHandle>; stub?: number }>();
  const setPair = (a: string, ha: SLDHandle, b: string, hb: SLDHandle, stub?: number) =>
    pairs.set(pairKey(a, b), {
      handles: new Map([
        [a, ha],
        [b, hb],
      ]),
      stub,
    });
  const visited = new Set<string>();

  /** One connected component around `hubId`, starting at `top`; returns its bottom. */
  const layoutComponent = (hubId: string, top: number): number => {
    // BFS spanning tree (children in `cmp` order — adjacency is pre-sorted).
    const children = new Map<string, string[]>();
    const parent = new Map<string, string>();
    visited.add(hubId);
    const queue = [hubId];
    for (let qi = 0; qi < queue.length; qi++) {
      const id = queue[qi];
      const kids: string[] = [];
      for (const nb of adj.get(id)!) {
        if (visited.has(nb)) continue;
        visited.add(nb);
        parent.set(nb, id);
        kids.push(nb);
        queue.push(nb);
      }
      children.set(id, kids);
    }

    /** A branch root + its subtree, DFS pre-order. */
    const stackOf = (root: string): string[] => {
      const out: string[] = [];
      const todo = [root];
      while (todo.length > 0) {
        const id = todo.pop()!;
        out.push(id);
        const kids = children.get(id) ?? [];
        for (let i = kids.length - 1; i >= 0; i--) todo.push(kids[i]);
      }
      return out;
    };

    const branches = children.get(hubId) ?? [];
    const n = branches.length;
    const aboveCount = Math.min(n, 2 * Math.ceil(Math.ceil(n / 2) / 2));
    const aboveRows = chunk(branches.slice(0, aboveCount), 2);
    const belowRows = chunk(branches.slice(aboveCount), 2);

    /** Place one row of 1–2 branches with its top at `y`; returns the row height. */
    const placeRow = (row: string[], y: number, section: Section, adjacent: boolean): number => {
      const stacks = row.map(stackOf);
      const levels = Math.max(...stacks.map(s => s.length));
      // Cards on one level share a height, so the row reads as an even grid.
      const levelH: number[] = [];
      for (let k = 0; k < levels; k++) {
        levelH.push(Math.max(...stacks.filter(s => k < s.length).map(s => naturalHeight(s[k]))));
      }
      const rowH = levelH.reduce((s, h) => s + h, 0) + (levels - 1) * LINK_GAP;
      // Level 0 (the branch root) is the hub-facing level: the row's bottom
      // above the hub, its top below it.
      const levelTop = (k: number): number => {
        let offset = 0;
        for (let j = 0; j < k; j++) offset += levelH[j] + LINK_GAP;
        return section === 'below' ? y + offset : y + rowH - offset - levelH[k];
      };
      const towardHub: SLDHandle = section === 'above' ? 'b' : 't';
      const awayFromHub: SLDHandle = section === 'above' ? 't' : 'b';

      stacks.forEach((stack, i) => {
        const column: Column = stacks.length === 1 ? 'centre' : i === 0 ? 'left' : 'right';
        const x =
          column === 'centre'
            ? (SLD_PHONE_GRID_W - SLD_PHONE_CARD.width) / 2
            : column === 'left'
            ? 0
            : SLD_PHONE_CARD.width + COL_GAP;
        stack.forEach((id, k) =>
          rects.set(id, {
            x,
            y: levelTop(k),
            w: SLD_PHONE_CARD.width,
            h: levelH[k],
          }),
        );

        // Branch root ↔ hub: straight down/up when nothing sits between the
        // card and the hub, else from the inner side into the trunk.
        const vertical = column === 'centre' || adjacent;
        const rootHandle: SLDHandle = vertical ? towardHub : column === 'left' ? 'r' : 'l';
        setPair(stack[0], rootHandle, hubId, awayFromHub);

        // Parent ↔ child inside the stack (the parent always precedes it):
        // next to it → a straight link; farther down the stack → a lane on
        // the OUTER side (a centred stack's runs through its row's empty half).
        const lane: SLDHandle = column === 'right' ? 'r' : 'l';
        const parentIdx = (k: number) => stack.indexOf(parent.get(stack[k])!);
        /** Lane parents (stack index) → their last lane child's index. */
        const laneEnd = new Map<number, number>();
        for (let k = 1; k < stack.length; k++) {
          const pi = parentIdx(k);
          if (k - pi === 1) setPair(stack[k], towardHub, stack[pi], awayFromHub);
          else laneEnd.set(pi, Math.max(laneEnd.get(pi) ?? 0, k));
        }
        // Pre-order makes lanes laminar: a lane parent strictly inside
        // another's span — or at its very end, where the two would join into
        // one line — is a descendant whose lanes nest INSIDE it. Deeper
        // parents first; one parent's lanes share a level (a bus from it).
        const level = new Map<number, number>();
        Array.from(laneEnd.keys())
          .sort((a, b) => b - a)
          .forEach(pi => {
            const end = laneEnd.get(pi)!;
            let lv = 0;
            level.forEach((ql, qi) => {
              if (qi > pi && qi <= end) lv = Math.max(lv, ql + 1);
            });
            level.set(pi, lv);
          });
        for (let k = 1; k < stack.length; k++) {
          const pi = parentIdx(k);
          if (k - pi === 1) continue;
          const lv = level.get(pi)!;
          setPair(
            stack[k],
            lane,
            stack[pi],
            lane,
            lv > 0 ? SLD_EDGE_STUB + lv * LANE_STEP : undefined,
          );
        }
      });
      return rowH;
    };

    let y = top;
    aboveRows.forEach((row, i) => {
      const last = i === aboveRows.length - 1;
      y += placeRow(row, y, 'above', last);
      y += last ? LINK_GAP : ROW_GAP;
    });
    const hubW = isLogoNode(byId.get(hubId)!) ? SLD_PHONE_HUB.width : SLD_PHONE_CARD.width;
    const hubH = naturalHeight(hubId);
    rects.set(hubId, { x: (SLD_PHONE_GRID_W - hubW) / 2, y, w: hubW, h: hubH });
    y += hubH;
    belowRows.forEach((row, i) => {
      y += i === 0 ? LINK_GAP : ROW_GAP;
      y += placeRow(row, y, 'below', i === 0);
    });
    return y;
  };

  /** Ids of the not-yet-placed component holding `start`, in graph order. */
  const componentOf = (start: string): string[] => {
    const seen = new Set([start]);
    const queue = [start];
    for (let qi = 0; qi < queue.length; qi++) {
      for (const nb of adj.get(queue[qi])!) {
        if (seen.has(nb) || visited.has(nb)) continue;
        seen.add(nb);
        queue.push(nb);
      }
    }
    return queue.sort((a, b) => order.get(a)! - order.get(b)!);
  };

  const mainHub = pickHub(ids);
  let bottom = layoutComponent(mainHub, 0);
  for (const id of ids) {
    if (visited.has(id)) continue;
    bottom = layoutComponent(pickHub(componentOf(id)), bottom + COMPONENT_GAP);
  }

  const nodes = graph.nodes.map(n => {
    const r = rects.get(n.id)!;
    return { ...n, position: { x: r.x, y: r.y }, size: { w: r.w, h: r.h } };
  });
  const edges = graph.edges.map((e): SLDEdge => {
    const pair = e.source === e.target ? undefined : pairs.get(pairKey(e.source, e.target));
    if (pair) {
      const out: SLDEdge = {
        ...e,
        sourceHandle: pair.handles.get(e.source)!,
        targetHandle: pair.handles.get(e.target)!,
      };
      if (pair.stub !== undefined) out.routeStub = pair.stub;
      return out;
    }
    const s = rects.get(e.source);
    const t = rects.get(e.target);
    if (!s || !t) return e;
    const [sourceHandle, targetHandle] =
      e.source === e.target ? facingHandles(s, t) : clearestHandles(e, rects);
    return { ...e, sourceHandle, targetHandle };
  });

  // Pad the frame to hold every route in both routing modes (side lanes and
  // cross links run outside the columns), symmetric per axis so the hub
  // stays centred.
  let over = { x: 0, y: 0 };
  for (const e of edges) {
    for (const route of sldEdgeRoutes(e, rects)) {
      for (const p of route) {
        over = {
          x: Math.max(over.x, -p.x, p.x - SLD_PHONE_GRID_W),
          y: Math.max(over.y, -p.y, p.y - bottom),
        };
      }
    }
  }
  const padX = Math.max(PAD, over.x > 0 ? over.x + ROUTE_MARGIN : 0);
  const padY = Math.max(PAD, over.y > 0 ? over.y + ROUTE_MARGIN : 0);
  const hub = rects.get(mainHub)!;
  return {
    graph: { nodes, edges },
    bounds: {
      minX: -padX,
      minY: -padY,
      width: SLD_PHONE_GRID_W + 2 * padX,
      height: bottom + 2 * padY,
    },
    focus: { x: hub.x + hub.w / 2 + padX, y: hub.y + hub.h / 2 + padY },
  };
};

/* ─────────── cross links (edges outside the spanning tree) ─────────── */

/** True when the axis-aligned box of segment a→b overlaps `r`'s interior grown by `grow`. */
const segmentHits = (a: SLDPoint, b: SLDPoint, r: SLDRect, grow: number): boolean =>
  Math.min(a.x, b.x) < r.x + r.w + grow &&
  Math.max(a.x, b.x) > r.x - grow &&
  Math.min(a.y, b.y) < r.y + r.h + grow &&
  Math.max(a.y, b.y) > r.y - grow;

const routeLength = (route: SLDPoint[]): number =>
  route.reduce(
    (sum, p, i) => (i === 0 ? 0 : sum + Math.hypot(p.x - route[i - 1].x, p.y - route[i - 1].y)),
    0,
  );

/**
 * Handles for an edge the spanning tree doesn't cover. Tries every handle
 * pair — facing handles first — and keeps the one whose routes, orthogonal
 * and curved, cross the fewest cards: its own two cards may only be
 * touched at their handles, every other card is kept `ROUTE_CLEARANCE`
 * away. Ties keep facing handles, then the shorter orthogonal route, then
 * the try order. When nothing is clear it still returns the least-crossing
 * pair — the edge is always drawn.
 */
const clearestHandles = (edge: SLDEdge, rects: Map<string, SLDRect>): [SLDHandle, SLDHandle] => {
  const facing = facingHandles(rects.get(edge.source)!, rects.get(edge.target)!);
  const candidates: [SLDHandle, SLDHandle][] = [facing];
  SIDES.forEach(a =>
    SIDES.forEach(b => {
      if (a !== facing[0] || b !== facing[1]) candidates.push([a, b]);
    }),
  );
  let best = { handles: facing, hits: Infinity, length: Infinity };
  for (const handles of candidates) {
    const routes = sldEdgeRoutes(
      { ...edge, sourceHandle: handles[0], targetHandle: handles[1] },
      rects,
    );
    let hits = 0;
    for (const route of routes) {
      rects.forEach((r, id) => {
        const grow = id === edge.source || id === edge.target ? 0 : ROUTE_CLEARANCE;
        for (let i = 1; i < route.length; i++) {
          if (segmentHits(route[i - 1], route[i], r, grow)) {
            hits++;
            return;
          }
        }
      });
    }
    const length = routeLength(routes[0]);
    if (
      hits < best.hits ||
      (hits === best.hits && length < best.length - 1e-9 && best.handles !== facing)
    ) {
      best = { handles, hits, length };
    }
  }
  return best.handles;
};

/** What a card / hub value row draws: text, unit and its font size. */
export interface SldValueDisplay {
  text: string;
  unit: string | undefined;
  size: number;
}

/**
 * The value row for one SLD key. The precise backend value (2 decimals,
 * irradiance whole, garbage in e-notation — `formatSldValue`) when it fits
 * at ≥ the 12pt floor. A longer one is NEVER truncated (that would hide
 * digits the device sent): it switches to the compact form with the unit
 * rescaled ("1,186,687.53 MW" → "1.19 TW", the Dashboard-chip rule), and
 * only an unscalable unit that still can't fit keeps the floor size.
 */
export const sldValueDisplay = (
  raw: number | string | null | undefined,
  unit: string | undefined,
  label: string,
  variant: 'card' | 'hub' = 'card',
): SldValueDisplay => {
  const precise = formatSldValue(raw, unit, label);
  const fit = sldValueFit(precise, unit, label, variant);
  if (fit.fits) return { text: precise, unit, size: fit.size };
  const q = formatQuantity(raw, unit, { mode: 'compact', name: label });
  if (q.isMissing) return { text: precise, unit, size: fit.size };
  const compactUnit = q.unit || unit;
  return {
    text: q.text,
    unit: compactUnit,
    size: sldValueFontSize(q.text, compactUnit, label, variant),
  };
};
