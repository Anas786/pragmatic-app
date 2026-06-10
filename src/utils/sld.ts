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
  SLDEdgesConnect,
  SLDGraph,
  SLDHandle,
  SLDNode,
  SLDNodeAnimation,
  SLDNodeIcon,
  SLDNodeKey,
  SLDValueResolver,
} from 'src/types';
import { formatCardValue } from './cards';

/* ─────────── node sizing (graph-space units) ─────────── */

/** Standard source-node card footprint, in graph coordinates. */
export const SLD_NODE_W = 214;
export const SLD_NODE_H = 134;
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

/**
 * Orthogonal ("step") routing — right-angle Manhattan segments between the two
 * handles, matching the web SLD's straight-line mode. Each end leaves/enters
 * perpendicular to its handle via a short stub, then bends at 90°.
 */
export const buildOrthogonalEdgeGeometry = (
  from: SLDPoint,
  fromHandle: SLDHandle,
  to: SLDPoint,
  toHandle: SLDHandle,
): SLDEdgeGeometry => {
  const ds = handleDir(fromHandle);
  const dt = handleDir(toHandle);
  const STUB = 20;
  const p1 = { x: from.x + ds.x * STUB, y: from.y + ds.y * STUB };
  const p2 = { x: to.x + dt.x * STUB, y: to.y + dt.y * STUB };
  const sourceH = ds.x !== 0;
  const targetH = dt.x !== 0;

  const pts: SLDPoint[] = [from, p1];
  if (sourceH && targetH) {
    const midX = (p1.x + p2.x) / 2;
    pts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
  } else if (!sourceH && !targetH) {
    const midY = (p1.y + p2.y) / 2;
    pts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
  } else if (sourceH) {
    pts.push({ x: p2.x, y: p1.y });
  } else {
    pts.push({ x: p1.x, y: p2.y });
  }
  pts.push(p2, to);

  // Drop zero-length segments so the path is clean.
  const clean = pts.filter(
    (p, i) => i === 0 || p.x !== pts[i - 1].x || p.y !== pts[i - 1].y,
  );
  const path = clean
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const tip = clean[clean.length - 1];
  const prev = clean[clean.length - 2] ?? from;
  return { path, arrowPath: buildArrowPath(prev, tip) };
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

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
};

const channelHex = (v: number): string =>
  Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, '0');

/**
 * Keep a source colour legible on the **light** canvas: bright/light hues
 * (e.g. `#e5ff00` yellow, `#33fffc` cyan) are scaled down toward a target
 * luminance so they read against the pale background, while already-dark
 * colours and dark theme are returned untouched. Hue is preserved (uniform
 * RGB scale), so yellow stays yellow — just a darker, visible olive-gold.
 */
export const edgeColorForScheme = (color: string, isDark: boolean): string => {
  if (isDark) return color;
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  const THRESHOLD = 140;
  const TARGET = 115;
  if (lum <= THRESHOLD) return color;
  const scale = TARGET / lum;
  return `#${channelHex(rgb.r * scale)}${channelHex(rgb.g * scale)}${channelHex(
    rgb.b * scale,
  )}`;
};

/**
 * Whether an edge should render its flowing-dash animation.
 *
 * Two drivers, in priority order:
 *   1. If the source node carries a live `animation` condition, evaluate it
 *      against current data (e.g. `live.p26.value != 0`) — this is the
 *      dynamic, per-tick "is power actually flowing" signal.
 *   2. Otherwise fall back to the edge's own `data.mode === 'flow'` hint
 *      (server-computed; used for nodes that ship no animation block).
 */
export const isEdgeAnimated = (
  edge: SLDEdge,
  sourceNode: SLDNode | undefined,
  resolve: SLDValueResolver,
): boolean => {
  if (sourceNode?.data.animation) {
    return evalAnimation(sourceNode.data.animation, resolve);
  }
  return edge.data?.mode === 'flow';
};

/* ─────────── config → graph selection ─────────── */

const SLD_HANDLES: ReadonlySet<string> = new Set(['t', 'b', 'l', 'r']);

const finiteNumber = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const asId = (v: unknown): string | null =>
  typeof v === 'string' && v !== ''
    ? v
    : typeof v === 'number' && Number.isFinite(v)
      ? String(v)
      : null;

const normalizeNodeKey = (raw: unknown): SLDNodeKey | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const param = typeof o.param === 'string' ? o.param : null;
  if (!param) return null;
  return {
    param,
    label: typeof o.label === 'string' ? o.label : '',
    unit: typeof o.unit === 'string' ? o.unit : undefined,
  };
};

const normalizeAnimation = (raw: unknown): SLDNodeAnimation | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const animationParams =
    typeof o.animationParams === 'string' ? o.animationParams : null;
  const operator = typeof o.operator === 'string' ? o.operator : null;
  const value =
    typeof o.value === 'string' || typeof o.value === 'number'
      ? o.value
      : null;
  if (!animationParams || !operator || value === null) return undefined;
  return { animationParams, operator, value };
};

const normalizeSldNode = (raw: unknown): SLDNode | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = asId(o.id);
  const pos = o.position as Record<string, unknown> | undefined;
  const x = finiteNumber(pos?.x);
  const y = finiteNumber(pos?.y);
  const data = o.data as Record<string, unknown> | undefined;
  if (id === null || x === undefined || y === undefined || !data) return null;

  const rawKeys = Array.isArray(data.keys) ? data.keys : [];
  const keys = rawKeys
    .map(normalizeNodeKey)
    .filter((k): k is SLDNodeKey => k !== null);

  const rawIcon = data.icon as Record<string, unknown> | undefined;
  const icon: SLDNodeIcon = {
    name: typeof rawIcon?.name === 'string' ? rawIcon.name : '',
    color: typeof rawIcon?.color === 'string' ? rawIcon.color : '#9CA3AF',
  };

  const edgesConnect: SLDEdgesConnect =
    data.edgesConnect === 'target' ? 'target' : 'source';

  return {
    id,
    type: typeof o.type === 'string' ? o.type : 'custom',
    position: { x, y },
    data: {
      heading: typeof data.heading === 'string' ? data.heading : '',
      keys,
      edgesConnect,
      icon,
      fixed: data.fixed === true,
      type: data.type === 'logo' ? 'logo' : null,
      animation: normalizeAnimation(data.animation),
    },
  };
};

const normalizeSldEdge = (raw: unknown): SLDEdge | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : null;
  const source = asId(o.source);
  const target = asId(o.target);
  const sourceHandle =
    typeof o.sourceHandle === 'string' && SLD_HANDLES.has(o.sourceHandle)
      ? (o.sourceHandle as SLDHandle)
      : null;
  const targetHandle =
    typeof o.targetHandle === 'string' && SLD_HANDLES.has(o.targetHandle)
      ? (o.targetHandle as SLDHandle)
      : null;
  if (!id || source === null || target === null || !sourceHandle || !targetHandle) {
    return null;
  }

  const rawStyle = o.style as Record<string, unknown> | undefined;
  const rawMarker = o.markerEnd as Record<string, unknown> | undefined;
  const rawData = o.data as Record<string, unknown> | undefined;
  const stroke =
    typeof rawStyle?.stroke === 'string'
      ? rawStyle.stroke
      : typeof rawMarker?.color === 'string'
        ? rawMarker.color
        : '#61656b';
  const mode =
    rawData?.mode === 'flow'
      ? 'flow'
      : rawData?.mode === 'idle'
        ? 'idle'
        : undefined;

  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: typeof o.type === 'string' ? o.type : 'buttonedge',
    style: { stroke },
    markerEnd: {
      color: typeof rawMarker?.color === 'string' ? rawMarker.color : stroke,
      type: typeof rawMarker?.type === 'string' ? rawMarker.type : 'arrowclosed',
    },
    data: {
      mode,
      type: typeof rawData?.type === 'string' ? rawData.type : undefined,
    },
  };
};

/**
 * Read + normalize `siteConfig.siteComponents.sldV2` into a typed
 * {@link SLDGraph}. Mirrors {@link selectTrends} — every malformed node/edge
 * is dropped, edges pointing at missing nodes are pruned, and `null` is
 * returned when the site has no diagram configured (caller shows an empty
 * state). The renderer is value-source-agnostic, so the only remaining step
 * is feeding it {@link makeLiveResolver}.
 */
export const selectSldGraph = (config: unknown): SLDGraph | null => {
  if (!config || typeof config !== 'object') return null;
  const components = (config as Record<string, unknown>).siteComponents;
  if (!components || typeof components !== 'object') return null;
  const sld = (components as Record<string, unknown>).sldV2;
  if (!sld || typeof sld !== 'object') return null;

  const rawNodes = (sld as Record<string, unknown>).nodes;
  const rawEdges = (sld as Record<string, unknown>).edges;
  const nodes = (Array.isArray(rawNodes) ? rawNodes : [])
    .map(normalizeSldNode)
    .filter((n): n is SLDNode => n !== null);
  if (nodes.length === 0) return null;

  const ids = new Set(nodes.map(n => n.id));
  const edges = (Array.isArray(rawEdges) ? rawEdges : [])
    .map(normalizeSldEdge)
    .filter(
      (e): e is SLDEdge =>
        e !== null && ids.has(e.source) && ids.has(e.target),
    );

  return { nodes, edges };
};
