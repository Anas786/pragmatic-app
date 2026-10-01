/**
 * SLD grouping — collapse per-unit source nodes into one box per energy type
 * ("all solar in one box, totalled; same for wind, …").
 *
 * Implemented as a PURE TRANSFORM of the graph + a resolver wrapper, so every
 * downstream piece (getGraphBounds, resolveNodeRects de-overlap, the RN card
 * layer, the Skia edge layer, evalAnimation / isEdgeAnimated) runs unchanged
 * on the grouped graph:
 *
 *   - {@link buildSldGrouping}(graph) → { graph, groups } — STRUCTURE ONLY.
 *     Depends on nothing but the graph (siteConfig), and is cached per graph
 *     reference, so live-data ticks never move a node or change the bounds.
 *   - {@link makeGroupedResolver}(base, groups) → SLDValueResolver — answers
 *     the synthetic group params (metric totals + the per-target "any unit
 *     flowing" edge flags) by aggregating member params through `base`, and
 *     delegates everything else. Memoize it on the live resolver.
 *
 * Pure TS: no React / React Native imports.
 */

import {
  SLDEdge,
  SLDGraph,
  SLDHandle,
  SLDNode,
  SLDNodeIcon,
  SLDNodeKey,
  SLDValueResolver,
} from 'src/types';
import { energyPalette } from 'src/theme/tokens';
import {
  bezierControlPoints,
  getGraphBounds,
  handlePoint,
  isEdgeAnimated,
  isLogoNode,
  nodeRect,
  orthogonalEdgePoints,
  resolveNodeRects,
  SLDPoint,
  SLDRect,
  SLD_NODE_H,
  SLD_NODE_W,
} from './sld';

/* ─────────── energy-type classification ─────────── */

/**
 * Source types a unit can be grouped under. `whr` (Waste Heat Recovery — a
 * steam-turbine plant fed by process exhaust) is a distinct source with no
 * `energyPalette` token: it's recognised by NAME only (there's no WHR icon
 * key), and its group card takes its look from its members — see
 * {@link groupIcon}.
 */
export type SldEnergyType = 'solar' | 'wind' | 'battery' | 'whr' | 'genset' | 'grid';

/** Types with a canonical brand look (`energyPalette` colour + icon key). */
type PaletteEnergyType = Exclude<SldEnergyType, 'whr'>;

/** Human label used in the group heading (`Solar · 9`, `WHR · 2`). */
export const SLD_ENERGY_TYPE_LABEL: Record<SldEnergyType, string> = {
  solar: 'Solar',
  wind: 'Wind',
  battery: 'Battery',
  whr: 'WHR',
  genset: 'Genset',
  grid: 'Grid',
};

/** Canonical icon key (see `lottiePathGif`) a group box renders with. */
export const SLD_ENERGY_TYPE_ICON: Record<PaletteEnergyType, string> = {
  solar: 'solarLg',
  wind: 'wind',
  battery: 'battery',
  genset: 'genset',
  grid: 'grid',
};

/**
 * Match priority when a name carries tags of several types — storage beats
 * the plant it's attached to ("Solar BESS" is a battery), and the generic
 * words (generator / utility) lose to a specific source. WHR sits directly
 * above genset: "WHR Generator" is a WHR unit, not a genset via the
 * `generator` substring (and a WHR name tag always beats the icon fallback,
 * which is how real WHR plants — shipped with the genset icon — were being
 * merged into the Genset group).
 */
const TYPE_PRIORITY: SldEnergyType[] = ['battery', 'solar', 'wind', 'whr', 'genset', 'grid'];

/** Short industry tags — must match a WHOLE token (no substring hits). */
const TOKEN_TAGS: Record<SldEnergyType, readonly string[]> = {
  battery: ['bess', 'batt'],
  solar: ['pv'],
  wind: ['wtg', 'wt'],
  whr: ['whr'],
  genset: ['dg', 'gen'],
  grid: [],
};

/**
 * Long words — safe to match as substrings of the lower-cased name, whose
 * separator runs are collapsed to ONE space first (so the two-word
 * `waste heat` also matches "Waste-Heat" / "waste_heat"; single-word tags
 * match exactly as they would on the raw name).
 */
const WORD_TAGS: Record<SldEnergyType, readonly string[]> = {
  battery: ['battery'],
  solar: ['solar', 'photovoltaic'],
  wind: ['wind'],
  whr: ['waste heat'],
  genset: ['genset', 'diesel', 'generator'],
  grid: ['grid', 'utility'],
};

/** Icon-key fallback (keys from `src/assets/gif/lottie-icons.ts`). */
const ICON_TYPES: Record<string, SldEnergyType> = {
  solarLg: 'solar',
  solar: 'solar',
  wind: 'wind',
  battery: 'battery',
  genset: 'genset',
  grid: 'grid',
  gridImport: 'grid',
  gridExport: 'grid',
  towerLg: 'grid',
};

/**
 * Tokenise a heading: split on non-alphanumerics AND letter↔digit
 * boundaries (`WTG01` → `wtg`, `01`), lower-cased.
 */
const tokenize = (heading: string): string[] =>
  heading
    .toLowerCase()
    // No lookbehind (keep the regex engine-agnostic): space the boundaries.
    .replace(/([a-z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-z])/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

/** Energy type from the node NAME only (industry tags), or null. */
export const energyTypeFromName = (heading: string): SldEnergyType | null => {
  const tokens = new Set(tokenize(heading));
  const lower = heading.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  for (const type of TYPE_PRIORITY) {
    if (TOKEN_TAGS[type].some(t => tokens.has(t))) return type;
    if (WORD_TAGS[type].some(w => lower.includes(w))) return type;
  }
  return null;
};

/** Energy type from the ICON key only, or null. */
export const energyTypeFromIcon = (iconName: string | undefined): SldEnergyType | null =>
  iconName && Object.prototype.hasOwnProperty.call(ICON_TYPES, iconName)
    ? ICON_TYPES[iconName]
    : null;

/** Name tags first; the icon is only a fallback for untagged names. */
export const classifySldNode = (node: SLDNode): SldEnergyType | null =>
  energyTypeFromName(node.data.heading) ?? energyTypeFromIcon(node.data.icon?.name);

/**
 * Icon + accent colour of a group card (its edges reuse the colour).
 *
 * Palette types get their canonical look — real site data carries wrong
 * per-unit icons, so the members' own icons can't be trusted for them.
 * WHR has no `energyPalette` token and no icon key of its own (and the
 * design system takes no new hex values), so a WHR group is drawn the way
 * its members are: the MOST COMMON member icon name, ties broken by the
 * earliest member in graph order, with the colour of the first member
 * carrying that icon. In practice all WHR units share one icon + colour;
 * the rule only makes a disagreement deterministic.
 */
const groupIcon = (type: SldEnergyType, members: SLDNode[]): SLDNodeIcon => {
  if (type !== 'whr') {
    return { name: SLD_ENERGY_TYPE_ICON[type], color: energyPalette[type] };
  }
  const counts = new Map<string, number>();
  members.forEach(m => counts.set(m.data.icon.name, (counts.get(m.data.icon.name) ?? 0) + 1));
  // `members` is in graph order and reduce keeps the incumbent on a tie, so
  // the earliest member's icon wins ties.
  const winner = members.reduce((best, m) =>
    counts.get(m.data.icon.name)! > counts.get(best.data.icon.name)! ? m : best,
  );
  return { name: winner.data.icon.name, color: winner.data.icon.color };
};

/* ─────────── aggregation ─────────── */

export type SldAggregation = 'sum' | 'mean' | 'pf';

/**
 * Additive (power / energy / current) units, parsed as an optional SI prefix
 * + a base unit: W / var / VA (power), Wh / varh / VAh (energy), A (current).
 * Matched case-insensitively, so `kVAr`, `MVArh`, `GVA`, `kA` all qualify.
 */
const ADDITIVE_UNIT_RE = /^([kmg]?)(w|var|va|wh|varh|vah|a)$/;

type UnitFamily = 'power' | 'energy' | 'current';

const FAMILY_OF_BASE: Record<string, UnitFamily> = {
  w: 'power',
  var: 'power',
  va: 'power',
  wh: 'energy',
  varh: 'energy',
  vah: 'energy',
  a: 'current',
};

const PREFIX_FACTOR: Record<string, number> = { '': 1, k: 1e3, m: 1e6, g: 1e9 };

const normUnit = (unit: string | undefined): string => (unit ?? '').trim().toLowerCase();
const normLabel = (label: string): string => label.trim().toLowerCase();

/** `{ family, factor }` for an additive unit (`kVAr` → power ×1000), else null. */
const parseAdditiveUnit = (
  unit: string | undefined,
): { family: UnitFamily; factor: number } | null => {
  const m = ADDITIVE_UNIT_RE.exec(normUnit(unit));
  return m ? { family: FAMILY_OF_BASE[m[2]], factor: PREFIX_FACTOR[m[1]] } : null;
};

/** Labels that are additive quantities when the key ships no unit. */
const ADDITIVE_LABELS: ReadonlySet<string> = new Set(['p', 'q', 's', 'e', 'i']);

const isPfLabel = (label: string): boolean =>
  /^(pf|power\s*factor|cos\s*(phi|φ))$/i.test(label.trim());

/** How a key's member values combine into the group value. */
export const aggregationForKey = (key: Pick<SLDNodeKey, 'label' | 'unit'>): SldAggregation => {
  if (isPfLabel(key.label)) return 'pf';
  if (normUnit(key.unit)) return parseAdditiveUnit(key.unit) ? 'sum' : 'mean';
  const label = normLabel(key.label);
  return ADDITIVE_LABELS.has(label) || parseAdditiveUnit(label) ? 'sum' : 'mean';
};

/** Unit → multiplier to its base unit (W / var / VA / Wh / A); 1 when unitless. */
const unitFactor = (unit: string | undefined): number =>
  parseAdditiveUnit(unit)?.factor ?? 1;

/**
 * A reported power factor as a ratio. Feeds label PF keys `%` while
 * shipping ratios (`0.98 %`) and vice versa, so the MAGNITUDE decides: a PF
 * can't exceed 1, so |v| > 1 is a percentage.
 */
const pfRatio = (v: number): number => (Math.abs(v) > 1 ? v / 100 : v);

const toNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/* ─────────── group model ─────────── */

/** Max metric rows on a group card — the tallest per-unit card has 3. */
export const SLD_GROUP_MAX_ROWS = 3;

/** One member's contribution to a group key. */
export interface SldKeySource {
  memberId: string;
  param: string;
  unit?: string;
}

export interface SldGroupKey {
  /** Synthetic param the group node's card resolves. */
  param: string;
  /** Display label; carries `(n/N)` when only n of the N members report it. */
  label: string;
  /** Display unit (sum keys: the members' majority unit; PF: `%` or ratio). */
  unit?: string;
  aggregation: SldAggregation;
  /** One source per contributing member (members lacking the key are absent). */
  sources: SldKeySource[];
}

export interface SldGroup {
  /** Group node id (`sldgrp:<type>:<targets>`). */
  id: string;
  type: SldEnergyType;
  /** Original member nodes, in graph order. */
  members: SLDNode[];
  /** Target node ids the group feeds (sorted). */
  targets: string[];
  /** Displayed keys (≤ {@link SLD_GROUP_MAX_ROWS}). */
  keys: SldGroupKey[];
  /**
   * Synthetic flow param per target id: 1 while any member edge TO THAT
   * target is animated, else 0. Carried on the group → target edge.
   */
  flowParams: Record<string, string>;
  /** Original member → target edges (drive the per-target flow flags). */
  memberEdges: SLDEdge[];
  /**
   * Per-member P / Q sources used to recompute the group PF (present only
   * when the members' P and Q keys are unambiguous and commensurable).
   */
  power?: { p: SldKeySource[]; q: SldKeySource[] };
}

export interface SldGrouping {
  /** Graph with ≥2-member groups collapsed into one node each. */
  graph: SLDGraph;
  /** Only real groups (≥2 members). Empty ⇒ grouping is a no-op. */
  groups: SldGroup[];
}

/** Key being accumulated across members (before the coverage filter / cap). */
interface KeyAcc {
  label: string;
  aggregation: SldAggregation;
  /** Additive family ('' when unitless / not additive). */
  family: string;
  order: number;
  sources: SldKeySource[];
}

/**
 * Merge signature. PF folds into ONE row whatever its unit (it's recomputed
 * from ΣP/ΣQ); additive keys merge by label + physical family, so a unit
 * typo (`Q` in `kW` on one turbine, `kVar` on the rest) or a prefix change
 * (`kW` / `MW`) still totals into one row; everything else by label + unit.
 */
const keySignature = (k: SLDNodeKey, aggregation: SldAggregation): string => {
  const label = normLabel(k.label);
  if (aggregation === 'pf') return 'pf';
  if (aggregation === 'sum') return `${label}|sum|${parseAdditiveUnit(k.unit)?.family ?? ''}`;
  return `${label}|${normUnit(k.unit)}`;
};

/** Most-used unit among the sources (ties → first seen), original casing. */
const majorityUnit = (sources: SldKeySource[]): string | undefined => {
  const counts = new Map<string, { unit?: string; n: number; order: number }>();
  sources.forEach((s, i) => {
    const u = normUnit(s.unit);
    const c = counts.get(u);
    if (c) c.n += 1;
    else counts.set(u, { unit: s.unit, n: 1, order: i });
  });
  let best: { unit?: string; n: number; order: number } | undefined;
  counts.forEach(c => {
    if (!best || c.n > best.n || (c.n === best.n && c.order < best.order)) best = c;
  });
  return best?.unit;
};

/** Display unit of a merged key. */
const displayUnit = (acc: KeyAcc): string | undefined => {
  if (acc.aggregation === 'pf') {
    // `%` only when every member says so; otherwise show the plain ratio.
    return acc.sources.every(s => normUnit(s.unit) === '%') ? acc.sources[0].unit : undefined;
  }
  if (acc.aggregation === 'sum') return majorityUnit(acc.sources);
  return acc.sources[0].unit;
};

/**
 * Union the members' keys into group rows:
 *   - keys reported by fewer than half the members are dropped (a lone
 *     turbine's SOC is not the Wind group's SOC);
 *   - partially-reported keys say so in the label (`SOC (4/6)`);
 *   - at most {@link SLD_GROUP_MAX_ROWS} rows, best-covered first, so the
 *     card keeps the per-unit card's footprint (layout + handle maths assume it).
 * Also returns the per-member P / Q sources for the PF recompute.
 */
const buildGroupKeys = (
  id: string,
  members: SLDNode[],
): { keys: SldGroupKey[]; power?: SldGroup['power'] } => {
  const accs: KeyAcc[] = [];
  const bySig = new Map<string, KeyAcc>();
  for (const m of members) {
    const seenForMember = new Set<string>();
    for (const k of m.data.keys) {
      const aggregation = aggregationForKey(k);
      const sig = keySignature(k, aggregation);
      if (seenForMember.has(sig)) continue; // never double-count one unit
      seenForMember.add(sig);
      let acc = bySig.get(sig);
      if (!acc) {
        acc = {
          label: k.label,
          aggregation,
          family: aggregation === 'sum' ? parseAdditiveUnit(k.unit)?.family ?? '' : '',
          order: accs.length,
          sources: [],
        };
        bySig.set(sig, acc);
        accs.push(acc);
      }
      acc.sources.push({ memberId: m.id, param: k.param, unit: k.unit });
    }
  }

  // PF recompute inputs: exactly one additive P and one additive Q row, of
  // the same family (both power, or both unitless) so ΣP/ΣQ is meaningful.
  const pAccs = accs.filter(a => a.aggregation === 'sum' && normLabel(a.label) === 'p');
  const qAccs = accs.filter(a => a.aggregation === 'sum' && normLabel(a.label) === 'q');
  const power =
    pAccs.length === 1 && qAccs.length === 1 && pAccs[0].family === qAccs[0].family
      ? { p: pAccs[0].sources, q: qAccs[0].sources }
      : undefined;

  const n = members.length;
  const shown = accs
    .filter(a => a.sources.length * 2 >= n)
    .sort((a, b) => b.sources.length - a.sources.length || a.order - b.order)
    .slice(0, SLD_GROUP_MAX_ROWS)
    .sort((a, b) => a.order - b.order);

  const keys = shown.map((a, i) => ({
    param: `${id}#k${i}`,
    label: a.sources.length < n ? `${a.label} (${a.sources.length}/${n})` : a.label,
    unit: displayUnit(a),
    aggregation: a.aggregation,
    sources: a.sources,
  }));
  return { keys, power };
};

const GROUP_ID_PREFIX = 'sldgrp';
/** Gap kept between a placed group card and its target, in graph units. */
const TARGET_GAP = 40;

const centreOf = (r: SLDRect): SLDPoint => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const median = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const rectsOverlap = (a: SLDRect, b: SLDRect, gap: number): boolean =>
  a.x < b.x + b.w + gap &&
  b.x < a.x + a.w + gap &&
  a.y < b.y + b.h + gap &&
  b.y < a.y + a.h + gap;

/** Where a group card sits: `dist` along the unit ray (ux, uy) from `anchor`. */
interface GroupPlacement {
  anchor: SLDPoint;
  ux: number;
  uy: number;
  dist: number;
}

/** Top-left of the group card for a placement. */
const placementPosition = (pl: GroupPlacement): SLDPoint => ({
  x: pl.anchor.x + pl.ux * pl.dist - SLD_NODE_W / 2,
  y: pl.anchor.y + pl.uy * pl.dist - SLD_NODE_H / 2,
});

/**
 * Direction-preserving placement: from the target anchor toward the members'
 * centroid (or the mean member direction when the centroid sits on the
 * anchor), at ≈ the members' median distance, never overlapping a target.
 */
const placeGroup = (members: SLDNode[], targets: SLDNode[]): GroupPlacement => {
  const targetRects = targets.map(nodeRect);
  const tc = targetRects.map(centreOf);
  const anchor = {
    x: tc.reduce((s, p) => s + p.x, 0) / tc.length,
    y: tc.reduce((s, p) => s + p.y, 0) / tc.length,
  };
  const mc = members.map(m => centreOf(nodeRect(m)));
  const centroid = {
    x: mc.reduce((s, p) => s + p.x, 0) / mc.length,
    y: mc.reduce((s, p) => s + p.y, 0) / mc.length,
  };
  const dists = mc.map(p => Math.hypot(p.x - anchor.x, p.y - anchor.y));

  let dx = centroid.x - anchor.x;
  let dy = centroid.y - anchor.y;
  let len = Math.hypot(dx, dy);
  // "Too close to have a direction": members surround the target evenly.
  if (len < SLD_NODE_H / 2) {
    dx = 0;
    dy = 0;
    mc.forEach((p, i) => {
      if (dists[i] > 0) {
        dx += (p.x - anchor.x) / dists[i];
        dy += (p.y - anchor.y) / dists[i];
      }
    });
    len = Math.hypot(dx, dy);
    if (len < 1e-6) {
      // Perfectly symmetric — deterministic default: above the target.
      dx = 0;
      dy = -1;
      len = 1;
    }
  }
  const ux = dx / len;
  const uy = dy / len;

  const pl: GroupPlacement = { anchor, ux, uy, dist: median(dists) };
  const rectAt = (): SLDRect => ({ ...placementPosition(pl), w: SLD_NODE_W, h: SLD_NODE_H });
  // Push outward until clear of every target (bounded, deterministic).
  for (let i = 0; i < 400 && targetRects.some(t => rectsOverlap(rectAt(), t, TARGET_GAP)); i++) {
    pl.dist += 10;
  }
  return pl;
};

/* ─────────── route clearance ─────────── */

/**
 * Rendered height of a source card with `rows` metric rows — mirrors the
 * `SLDCanvas` source-card styles (padding 11/12, 42pt icon header, divider
 * 9 + hairline + 7, 18pt rows spaced 5, 1pt borders). Cards use `minHeight`,
 * so they're never shorter than the designed {@link SLD_NODE_H} footprint.
 */
export const sldCardRenderedHeight = (rows: number): number =>
  Math.max(SLD_NODE_H, 11 + 42 + 16.5 + rows * 18 + Math.max(0, rows - 1) * 5 + 12 + 2);

/** Clearance kept between another edge's route and a group card (stroke + slack). */
const ROUTE_CLEARANCE = 8;
/** Samples along a curved (bezier) route when testing clearance. */
const BEZIER_SAMPLES = 24;
/** Outward step / max passes of the settle loop (bounded ⇒ deterministic). */
const SETTLE_STEP = 16;
const SETTLE_MAX_PASSES = 40;

/** Liang–Barsky: does segment a→b intersect rect `r`? */
const segmentHitsRect = (a: SLDPoint, b: SLDPoint, r: SLDRect): boolean => {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return (
    clip(-dx, a.x - r.x) &&
    clip(dx, r.x + r.w - a.x) &&
    clip(-dy, a.y - r.y) &&
    clip(dy, r.y + r.h - a.y)
  );
};

const polylineHitsRect = (pts: SLDPoint[], r: SLDRect): boolean =>
  pts.some((p, i) => i > 0 && segmentHitsRect(pts[i - 1], p, r));

/** Points along a cubic bezier (the curved routing mode). */
const sampleBezier = (a: SLDPoint, c1: SLDPoint, c2: SLDPoint, b: SLDPoint): SLDPoint[] => {
  const out: SLDPoint[] = [];
  for (let i = 0; i <= BEZIER_SAMPLES; i++) {
    const t = i / BEZIER_SAMPLES;
    const u = 1 - t;
    const w0 = u * u * u;
    const w1 = 3 * u * u * t;
    const w2 = 3 * u * t * t;
    const w3 = t * t * t;
    out.push({
      x: w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x,
      y: w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y,
    });
  }
  return out;
};

/**
 * Both routes the renderer can draw for an edge (orthogonal — the default —
 * and curved), from the final rects. Empty when an endpoint is missing.
 */
export const sldEdgeRoutes = (edge: SLDEdge, rects: Map<string, SLDRect>): SLDPoint[][] => {
  const s = rects.get(edge.source);
  const t = rects.get(edge.target);
  if (!s || !t) return [];
  const from = handlePoint(s, edge.sourceHandle);
  const to = handlePoint(t, edge.targetHandle);
  const [c1, c2] = bezierControlPoints(from, edge.sourceHandle, to, edge.targetHandle);
  return [
    orthogonalEdgePoints(from, edge.sourceHandle, to, edge.targetHandle),
    sampleBezier(from, c1, c2, to),
  ];
};

/** A group card's rendered footprint (taller than the designed rect), padded. */
const groupCardZone = (rect: SLDRect, rows: number): SLDRect => ({
  x: rect.x - ROUTE_CLEARANCE,
  y: rect.y - ROUTE_CLEARANCE,
  w: rect.w + ROUTE_CLEARANCE * 2,
  h: Math.max(rect.h, sldCardRenderedHeight(rows)) + ROUTE_CLEARANCE * 2,
});

/** Group → target handles facing each other, from the final rects. */
const withFacingHandles = (
  edges: SLDEdge[],
  groupIds: ReadonlySet<string>,
  rects: Map<string, SLDRect>,
): SLDEdge[] =>
  edges.map(e => {
    if (!groupIds.has(e.source)) return e;
    const sr = rects.get(e.source);
    const tr = rects.get(e.target);
    if (!sr || !tr) return e;
    const [sourceHandle, targetHandle] = facingHandles(sr, tr);
    return { ...e, sourceHandle, targetHandle };
  });

/** Handles facing each other along the dominant axis (source, target). */
const facingHandles = (src: SLDRect, tgt: SLDRect): [SLDHandle, SLDHandle] => {
  const s = centreOf(src);
  const t = centreOf(tgt);
  const dx = s.x - t.x;
  const dy = s.y - t.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? ['l', 'r'] : ['r', 'l'];
  }
  return dy >= 0 ? ['t', 'b'] : ['b', 't'];
};

const cache = new WeakMap<SLDGraph, SldGrouping>();

/**
 * Collapse leaf source nodes of the same energy type that feed the same
 * target set into one group node each. Structure only — the result depends
 * on `graph` alone and is cached per graph reference.
 */
export const buildSldGrouping = (graph: SLDGraph): SldGrouping => {
  const hit = cache.get(graph);
  if (hit) return hit;
  const result = computeGrouping(graph);
  cache.set(graph, result);
  return result;
};

const computeGrouping = (graph: SLDGraph): SldGrouping => {
  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outEdges = new Map<string, SLDEdge[]>();
  for (const e of graph.edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    const list = outEdges.get(e.source);
    if (list) list.push(e);
    else outEdges.set(e.source, [e]);
  }

  // 1. Bucket eligible leaf sources by (type, sorted target set).
  const buckets = new Map<string, { type: SldEnergyType; targets: string[]; members: SLDNode[] }>();
  for (const node of graph.nodes) {
    if (isLogoNode(node)) continue;
    if ((inDegree.get(node.id) ?? 0) > 0) continue;
    const outs = outEdges.get(node.id);
    if (!outs || outs.length === 0) continue;
    const type = classifySldNode(node);
    if (!type) continue;
    const targets = Array.from(new Set(outs.map(e => e.target))).sort();
    const key = `${type}:${targets.join(',')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.members.push(node);
    else buckets.set(key, { type, targets, members: [node] });
  }

  // 2. Real groups only (≥2 members) — singletons stay as their original node.
  const groups: SldGroup[] = [];
  const groupOfMember = new Map<string, SldGroup>();
  buckets.forEach(({ type, targets, members }) => {
    if (members.length < 2) return;
    const id = `${GROUP_ID_PREFIX}:${type}:${targets.join(',')}`;
    const { keys, power } = buildGroupKeys(id, members);
    const flowParams: Record<string, string> = {};
    targets.forEach(t => {
      flowParams[t] = `${id}#flow>${t}`;
    });
    const memberIds = new Set(members.map(m => m.id));
    const group: SldGroup = {
      id,
      type,
      members,
      targets,
      keys,
      flowParams,
      memberEdges: graph.edges.filter(e => memberIds.has(e.source)),
      power,
    };
    groups.push(group);
    members.forEach(m => groupOfMember.set(m.id, group));
  });

  if (groups.length === 0) return { graph, groups };

  // 3. Nodes: each group replaces its first member (graph order); the other
  //    members drop out. Ungrouped nodes keep their positions. No node-level
  //    `animation`: flow is decided PER TARGET on the group's edges (step 4),
  //    since a node condition would make every group edge share one flag.
  const groupNodes = new Map<string, SLDNode>();
  const groupIcons = new Map<string, SLDNodeIcon>();
  const placements = new Map<string, GroupPlacement>();
  const nodes: SLDNode[] = [];
  for (const node of graph.nodes) {
    const g = groupOfMember.get(node.id);
    if (!g) {
      nodes.push(node);
      continue;
    }
    if (groupNodes.has(g.id)) continue;
    const targetNodes = g.targets
      .map(t => nodeById.get(t))
      .filter((n): n is SLDNode => n !== undefined);
    const placement = placeGroup(g.members, targetNodes);
    placements.set(g.id, placement);
    const icon = groupIcon(g.type, g.members);
    groupIcons.set(g.id, icon);
    const groupNode: SLDNode = {
      id: g.id,
      type: node.type,
      position: placementPosition(placement),
      data: {
        heading: `${SLD_ENERGY_TYPE_LABEL[g.type]} · ${g.members.length}`,
        keys: g.keys.map(k => ({ param: k.param, label: k.label, unit: k.unit })),
        edgesConnect: 'source',
        icon,
        fixed: false,
        type: null,
      },
    };
    groupNodes.set(g.id, groupNode);
    nodes.push(groupNode);
  }

  // 4. Edges: ONE group → target edge per target (replacing the first member
  //    edge in order); other member edges drop; the rest are untouched. The
  //    line takes the group card's colour (the card and its flow must read
  //    as one type — see groupIcon), and carries that target's own flow
  //    condition.
  //    Handles are provisional here and finalised in step 5.
  const edges: SLDEdge[] = [];
  const emitted = new Set<string>();
  for (const e of graph.edges) {
    const g = groupOfMember.get(e.source);
    if (!g) {
      edges.push(e);
      continue;
    }
    const edgeId = `${g.id}->${e.target}`;
    if (emitted.has(edgeId)) continue;
    emitted.add(edgeId);
    const anyFlow = g.memberEdges.some(
      me => me.target === e.target && me.data?.mode === 'flow',
    );
    const color = groupIcons.get(g.id)!.color;
    edges.push({
      id: edgeId,
      source: g.id,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: e.type,
      style: { ...e.style, stroke: color },
      markerEnd: { ...e.markerEnd, color },
      data: {
        ...(e.data ?? {}),
        mode: anyFlow ? 'flow' : e.data?.mode,
        animation: { animationParams: g.flowParams[e.target], operator: '==', value: 1 },
      },
    });
  }

  // 5. Settle. Final handles come from the FINAL (de-overlapped) rects — the
  //    exact map the renderer computes (resolveNodeRects is deterministic and
  //    handles don't affect it), so arrows leave/enter on facing sides. A
  //    group card must not sit on ANOTHER edge's route (edges draw under the
  //    cards, so that line would appear to run through the group): any such
  //    card is pushed further out along its own ray, and the pass repeats.
  //    Bounded ⇒ deterministic; the last pass's layout is kept either way.
  const groupIds = new Set(groupNodes.keys());
  const rowsOf = new Map(groups.map(g => [g.id, g.keys.length]));
  const settledRects = (): Map<string, SLDRect> => {
    const draft: SLDGraph = { nodes, edges };
    return resolveNodeRects(draft, getGraphBounds(draft));
  };
  let finalEdges = edges;
  let settled = false;
  for (let pass = 0; pass < SETTLE_MAX_PASSES; pass++) {
    const rects = settledRects();
    finalEdges = withFacingHandles(edges, groupIds, rects);
    const routes = finalEdges.map(e => ({ e, routes: sldEdgeRoutes(e, rects) }));
    const blocked = Array.from(groupIds).filter(id => {
      const zone = groupCardZone(rects.get(id)!, rowsOf.get(id) ?? 0);
      return routes.some(
        ({ e, routes: rs }) =>
          e.source !== id && e.target !== id && rs.some(pts => polylineHitsRect(pts, zone)),
      );
    });
    if (blocked.length === 0) {
      settled = true;
      break;
    }
    blocked.forEach(id => {
      const pl = placements.get(id)!;
      pl.dist += SETTLE_STEP;
      groupNodes.get(id)!.position = placementPosition(pl);
    });
  }
  // Budget spent right after a push → handles must follow the moved cards.
  if (!settled) finalEdges = withFacingHandles(edges, groupIds, settledRects());

  return { graph: { nodes, edges: finalEdges }, groups };
};

/* ─────────── grouped resolver ─────────── */

/** Σ of the numeric sources, each scaled from its own unit into `unit`. */
const sumOf = (
  sources: SldKeySource[],
  unit: string | undefined,
  base: SLDValueResolver,
): number | null => {
  const into = unitFactor(unit);
  let total = 0;
  let any = false;
  for (const s of sources) {
    const n = toNum(base(s.param));
    if (n === undefined) continue;
    total += (n * unitFactor(s.unit)) / into;
    any = true;
  }
  return any ? total : null;
};

const meanOf = (
  sources: SldKeySource[],
  base: SLDValueResolver,
  map: (v: number) => number = v => v,
): number | null => {
  let total = 0;
  let count = 0;
  for (const s of sources) {
    const n = toNum(base(s.param));
    if (n === undefined) continue;
    total += map(n);
    count += 1;
  }
  return count > 0 ? total / count : null;
};

/** A source's value in its base unit (W / var / …), or undefined. */
const baseValue = (
  source: SldKeySource | undefined,
  base: SLDValueResolver,
): number | undefined => {
  if (!source) return undefined;
  const n = toNum(base(source.param));
  return n === undefined ? undefined : n * unitFactor(source.unit);
};

/**
 * Group PF as a RATIO. Recomputed as |ΣP| / √(ΣP² + ΣQ²) only when ΣP and ΣQ
 * come from the SAME members: every member contributing anything (P, Q or a
 * reported PF) must report both P and Q — otherwise a unit whose Q dropped
 * out would count as purely active and override the PFs actually reported.
 * Falls back to the mean of the reported member PFs.
 */
const groupPfRatio = (
  g: SldGroup,
  pfKey: SldGroupKey,
  base: SLDValueResolver,
): number | null => {
  if (g.power) {
    const pBy = new Map(g.power.p.map(s => [s.memberId, s]));
    const qBy = new Map(g.power.q.map(s => [s.memberId, s]));
    const pfBy = new Map(pfKey.sources.map(s => [s.memberId, s]));
    let sp = 0;
    let sq = 0;
    let complete = 0;
    let consistent = true;
    for (const m of g.members) {
      const p = baseValue(pBy.get(m.id), base);
      const q = baseValue(qBy.get(m.id), base);
      if (p !== undefined && q !== undefined) {
        sp += p;
        sq += q;
        complete += 1;
      } else if (p !== undefined || q !== undefined || baseValue(pfBy.get(m.id), base) !== undefined) {
        consistent = false;
        break;
      }
    }
    if (consistent && complete > 0) {
      const s = Math.hypot(sp, sq);
      if (s > 0) return Math.abs(sp) / s;
    }
  }
  return meanOf(pfKey.sources, base, pfRatio);
};

/**
 * Wrap a live resolver so it also answers the synthetic group params:
 *   - sum keys  → Σ member values, each scaled into the row's unit
 *                 (non-numeric members skipped),
 *   - mean keys → arithmetic mean,
 *   - PF keys   → see {@link groupPfRatio} (×100 when the row's unit is `%`),
 *   - flow      → per target: 1 while ANY member edge to it is animated.
 * No numeric member ⇒ null (renders "—"). Every other param is delegated.
 * Values are cached per resolver instance (one live-data snapshot).
 */
export const makeGroupedResolver = (
  base: SLDValueResolver,
  groups: SldGroup[],
): SLDValueResolver => {
  if (groups.length === 0) return base;

  const compute = new Map<string, () => number | null>();
  for (const g of groups) {
    for (const k of g.keys) {
      if (k.aggregation === 'sum') {
        compute.set(k.param, () => sumOf(k.sources, k.unit, base));
      } else if (k.aggregation === 'mean') {
        compute.set(k.param, () => meanOf(k.sources, base));
      } else {
        compute.set(k.param, () => {
          const pf = groupPfRatio(g, k, base);
          if (pf === null) return null;
          return normUnit(k.unit) === '%' ? pf * 100 : pf;
        });
      }
    }
    const memberById = new Map(g.members.map(m => [m.id, m]));
    for (const t of g.targets) {
      compute.set(g.flowParams[t], () =>
        g.memberEdges.some(
          e => e.target === t && isEdgeAnimated(e, memberById.get(e.source), base),
        )
          ? 1
          : 0,
      );
    }
  }

  const memo = new Map<string, number | null>();
  return param => {
    const fn = compute.get(param);
    if (!fn) return base(param);
    if (memo.has(param)) return memo.get(param)!;
    const value = fn();
    memo.set(param, value);
    return value;
  };
};
