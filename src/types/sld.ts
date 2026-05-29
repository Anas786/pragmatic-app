/**
 * Single-Line-Diagram (SLD) graph schema.
 *
 * Mirrors the backend response 1:1 (the schema is final — the API will be
 * wired later). It's a React-Flow-style node/edge graph: nodes carry their
 * own absolute canvas `position`, an `icon`, the metric `keys` to display,
 * and an optional `animation` condition; edges connect a source node's
 * handle (`t`/`b`/`l`/`r`) to the target node's handle.
 *
 * Each key's `param` is a dotted path resolved against live data exactly the
 * same way a `dataStore:"live"` card resolves (`liveData.live.data.<param>`),
 * so swapping the mock for the API is a value-source change only.
 */

/** Side of a node a handle sits on (top / bottom / left / right). */
export type SLDHandle = 't' | 'b' | 'l' | 'r';

/** Whether a node feeds the central plant (`source`) or is it (`target`). */
export type SLDEdgesConnect = 'source' | 'target';

/** A single metric rendered inside a node card. */
export interface SLDNodeKey {
  /** Dotted live-data path, e.g. "live.p30.value". */
  param: string;
  /** Short label, e.g. "P" / "Q" / "PF" / "SOC". */
  label: string;
  /** Optional unit, e.g. "kW" / "kVar" / "%". */
  unit?: string;
}

/** Icon descriptor. `name` maps to a GIF via `resolveLottieIcon`. */
export interface SLDNodeIcon {
  /** Hex accent colour (used to tint the node, not the GIF itself). */
  color: string;
  /** Icon key, e.g. "industry" / "wind" / "solarLg" / "genset" / "battery" / "switchLg". */
  name: string;
}

/**
 * Flow-animation condition. The edge(s) leaving this node animate while
 * `getValue(animationParams) <operator> value` holds (e.g. `!= 0`).
 */
export interface SLDNodeAnimation {
  animationParams: string;
  value: number | string;
  operator: string;
}

export interface SLDNodeData {
  heading: string;
  keys: SLDNodeKey[];
  edgesConnect: SLDEdgesConnect;
  icon: SLDNodeIcon;
  fixed?: boolean;
  /** `"logo"` marks the central plant node; otherwise null/absent. */
  type?: 'logo' | null;
  animation?: SLDNodeAnimation;
}

export interface SLDPosition {
  x: number;
  y: number;
}

export interface SLDNode {
  id: string;
  /** Node renderer kind on the web side — always "custom" so far. */
  type: string;
  position: SLDPosition;
  data: SLDNodeData;
}

export interface SLDEdgeMarker {
  color: string;
  /** Marker kind, e.g. "arrowclosed". */
  type: string;
}

export interface SLDEdge {
  id: string;
  /** Source node id. */
  source: string;
  /** Target node id. */
  target: string;
  sourceHandle: SLDHandle;
  targetHandle: SLDHandle;
  /** Edge renderer kind on the web side — "buttonedge". */
  type: string;
  style: { stroke: string };
  markerEnd: SLDEdgeMarker;
  selected?: boolean;
}

export interface SLDGraph {
  nodes: SLDNode[];
  edges: SLDEdge[];
}

/** Resolves a node-key/animation `param` to its current value. */
export type SLDValueResolver = (param: string) => number | string | null | undefined;
