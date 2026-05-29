/**
 * SLD graph geometry + value resolution helpers.
 *
 * The backend ships node `position`s in an absolute web-canvas space
 * (~1800×860). We honour those coordinates verbatim (graph space) and let the
 * outer pan/zoom surface explore them — these helpers stay in graph space and
 * never normalise, so they're resolution-independent.
 */

import {
  SLDEdge,
  SLDGraph,
  SLDHandle,
  SLDNode,
  SLDNodeAnimation,
  SLDValueResolver,
} from 'src/types';
import { formatCardValue } from './cards';

/* ─────────── node sizing (graph-space units) ─────────── */

/** Standard source-node card footprint, in graph coordinates. */
export const SLD_NODE_W = 214;
export const SLD_NODE_H = 122;
/** Central "logo" node — square. */
export const SLD_LOGO_SIZE = 120;
/** Padding added around the content bounds. */
export const SLD_BOUNDS_PAD = 80;

export interface SLDRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SLDPoint {
  x: number;
  y: number;
}

/** True for the central plant node (`type: "logo"` or `edgesConnect: "target"`). */
export const isLogoNode = (node: SLDNode): boolean =>
  node.data.type === 'logo' || node.data.edgesConnect === 'target';

/** Footprint (top-left + size) of a node in graph space. */
export const nodeRect = (node: SLDNode): SLDRect => {
  const logo = isLogoNode(node);
  return {
    x: node.position.x,
    y: node.position.y,
    w: logo ? SLD_LOGO_SIZE : SLD_NODE_W,
    h: logo ? SLD_LOGO_SIZE : SLD_NODE_H,
  };
};

/* ─────────── bounds / layout ─────────── */

export interface SLDBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Bounding box over every node footprint, padded. `minX`/`minY` are the
 * graph-space origin to subtract so content starts at `SLD_BOUNDS_PAD`.
 */
export const getGraphBounds = (graph: SLDGraph): SLDBounds => {
  if (graph.nodes.length === 0) {
    return { minX: 0, minY: 0, width: SLD_BOUNDS_PAD * 2, height: SLD_BOUNDS_PAD * 2 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of graph.nodes) {
    const r = nodeRect(node);
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }
  return {
    minX: minX - SLD_BOUNDS_PAD,
    minY: minY - SLD_BOUNDS_PAD,
    width: maxX - minX + SLD_BOUNDS_PAD * 2,
    height: maxY - minY + SLD_BOUNDS_PAD * 2,
  };
};

/** Node footprint translated into the padded content origin. */
export const nodeRectInBounds = (node: SLDNode, bounds: SLDBounds): SLDRect => {
  const r = nodeRect(node);
  return { x: r.x - bounds.minX, y: r.y - bounds.minY, w: r.w, h: r.h };
};

/* ─────────── handle geometry ─────────── */

/** Midpoint of a rect's t/b/l/r side. */
export const handlePoint = (r: SLDRect, h: SLDHandle): SLDPoint => {
  switch (h) {
    case 't':
      return { x: r.x + r.w / 2, y: r.y };
    case 'b':
      return { x: r.x + r.w / 2, y: r.y + r.h };
    case 'l':
      return { x: r.x, y: r.y + r.h / 2 };
    case 'r':
    default:
      return { x: r.x + r.w, y: r.y + r.h / 2 };
  }
};

/** Outward unit direction of a handle. */
export const handleDir = (h: SLDHandle): SLDPoint => {
  switch (h) {
    case 't':
      return { x: 0, y: -1 };
    case 'b':
      return { x: 0, y: 1 };
    case 'l':
      return { x: -1, y: 0 };
    case 'r':
    default:
      return { x: 1, y: 0 };
  }
};

export interface SLDEdgeGeometry {
  /** Cubic-bezier path between the two handles. */
  path: string;
  /** Closed triangle marker at the target tip. */
  arrowPath: string;
}

/**
 * React-Flow-style handle-anchored bezier. Control points push outward along
 * each handle's normal, so the curve leaves/enters perpendicular to the node
 * side (matching the web diagram).
 */
export const buildEdgeGeometry = (
  from: SLDPoint,
  fromHandle: SLDHandle,
  to: SLDPoint,
  toHandle: SLDHandle,
): SLDEdgeGeometry => {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const k = Math.max(48, dist * 0.4);
  const ds = handleDir(fromHandle);
  const dt = handleDir(toHandle);
  const c1 = { x: from.x + ds.x * k, y: from.y + ds.y * k };
  const c2 = { x: to.x + dt.x * k, y: to.y + dt.y * k };
  const path = `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`;
  return { path, arrowPath: buildArrowPath(c2, to) };
};

/** Closed-triangle arrowhead at `tip`, oriented along (tip - ctrl). */
export const buildArrowPath = (ctrl: SLDPoint, tip: SLDPoint): string => {
  const angle = Math.atan2(tip.y - ctrl.y, tip.x - ctrl.x);
  const len = 16;
  const spread = Math.PI / 7;
  const lx = tip.x - len * Math.cos(angle - spread);
  const ly = tip.y - len * Math.sin(angle - spread);
  const rx = tip.x - len * Math.cos(angle + spread);
  const ry = tip.y - len * Math.sin(angle + spread);
  return `M ${tip.x} ${tip.y} L ${lx} ${ly} L ${rx} ${ry} Z`;
};

/* ─────────── value resolution ─────────── */

/** Resolver backed by a flat `{ param: value }` map (used while mocked). */
export const makeMapResolver =
  (values: Record<string, number | string>): SLDValueResolver =>
  param =>
    Object.prototype.hasOwnProperty.call(values, param) ? values[param] : null;

/**
 * Production resolver: walk `liveData.live.data.<param-segments>`, identical
 * to how a `dataStore:"live"` card resolves (see {@link resolveCardValue}).
 */
export const makeLiveResolver =
  (liveData: unknown): SLDValueResolver =>
  param => {
    const live = (liveData as Record<string, unknown> | null | undefined)?.live;
    const envelope = (live as Record<string, unknown> | undefined)?.data;
    if (envelope === null || typeof envelope !== 'object') return null;
    let cursor: unknown = envelope;
    for (const seg of param.split('.').filter(Boolean)) {
      if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
        return null;
      }
      cursor = (cursor as Record<string, unknown>)[seg];
    }
    return cursor as number | string | null | undefined;
  };

const toNum = (v: unknown): number | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
};

/**
 * Evaluate a node's animation condition. Returns false (no flow) when the
 * condition is absent or unresolvable.
 */
export const evalAnimation = (
  animation: SLDNodeAnimation | undefined,
  resolve: SLDValueResolver,
): boolean => {
  if (!animation) return false;
  const actual = toNum(resolve(animation.animationParams));
  const threshold = toNum(animation.value);
  if (actual === undefined || threshold === undefined) return false;
  switch (animation.operator) {
    case '!=':
      return actual !== threshold;
    case '==':
      return actual === threshold;
    case '>':
      return actual > threshold;
    case '>=':
      return actual >= threshold;
    case '<':
      return actual < threshold;
    case '<=':
      return actual <= threshold;
    default:
      return false;
  }
};

/** Format a node-key value for display (2 decimals, em-dash on empty). */
export const formatSldValue = (value: number | string | null | undefined): string =>
  formatCardValue(value, 2);

/** Edge stroke colour (falls back to the marker colour). */
export const edgeColor = (edge: SLDEdge): string =>
  edge.style?.stroke ?? edge.markerEnd?.color ?? '#61656b';
