/**
 * Grouped | Units for the SLD "3D" (the web twin), from the app's OWN
 * grouping — so the Diagram and the 3D group identically.
 *
 *  - **Units** = the RAW `sldV2` + `live.data`, passed through untouched
 *    (the same objects — byte-for-byte what the twin got before).
 *  - **Grouped** = the same twin fed a grouped `sldV2`: each group of the
 *    Diagram's `buildSldGrouping` (Lucky: "Solar · 9", "Wind · 6") becomes
 *    ONE regular sldV2 node — NOT the web's own group schema
 *    (`aggregation` / `groupMembers` / an edge into it), which the twin
 *    draws as a plain "junction" cabinet:
 *      id        the grouping's group node id (`sldgrp:<type>:<targets>`)
 *      position  the grouping's group node position (backend canvas units)
 *      heading   the group label ("Wind · 6")
 *      icon      {name: the twin's icon for the type (TWIN_GROUP_ICON; WHR
 *                keeps its members' icon, so the twin's title rule picks
 *                its steam variant), color: the members' majority BACKEND
 *                colour (the twin's own reading of a node's colour) — as
 *                the twin draws them in Units, never the Diagram's palette
 *                colour, so a mode switch never recolours the 3D}; `data.color`
 *                the same way. Members with no colour of their own → the
 *                group has none either (the twin's own no-colour path, as
 *                for those members in Units)
 *      keys      the Diagram card's rows (≤ SLD_GROUP_MAX_ROWS, same labels
 *                and units) reading SYNTHETIC params `live.<id>.value`
 *      animation `live.<flow id>.value != 0` — the flow id's value is how
 *                many members RUN by the twin's OWN Units rule
 *                (twinFlowRule.ts: a member's `animation` rule read the
 *                web's way — 2-decimal reading, operator `!=` / value 0
 *                when absent —, or, with no rule, "live" = a numeric
 *                reading), so ≠ 0 ⟺ the twin draws a member running in
 *                Units, and Grouped ⇄ Units never changes what is running
 *                or the "producing now" mix. (The Diagram's own group edge
 *                uses the app's `isEdgeAnimated`; the two only differ on
 *                incomplete rules, rule-less units and readings < 0.005.)
 *                Its id is worded ("Wind units flowing") because the twin's
 *                readings card prints it: "Energy shows on its cable while
 *                Wind units flowing ≠ 0." When NO member has a rule the
 *                group has none either: the twin then calls it "live" like
 *                its members, and each group → target cable carries the
 *                twin's per-edge mode of the members' cables to that target
 *                ('flow' unless every one says 'idle').
 *      pesGroupMembers  the RAW member nodes — the page bridge picks the
 *                members' majority 3D model with the web's own `lookOf`
 *                and removes them before the twin sees the node
 *                (scripts/web-twin/bridge.js, "grouped looks").
 *    Member nodes and every edge touching a member are removed; the
 *    grouping's group → target edges take their place (the Diagram's
 *    handles; the members' majority backend cable colour to that target,
 *    read the twin's way — `style.stroke` ‖ `markerEnd.color` ‖ `color` —
 *    or none, so the twin colours it from the group node as it does for
 *    the members). Every other node / edge is the SAME raw object, in the
 *    same order.
 *  - The grouped live envelope = the real `live.data` PLUS one entry per
 *    synthetic param: `{ value: number | 'NA', update_at }` — the numbers the
 *    Diagram's group card shows (`makeGroupedResolver`: sums in the
 *    members' majority unit, the PF fold, means; 'NA' where the card shows
 *    "—"), stamped with the newest `update_at` among the group's members,
 *    read the twin's way (the twin's "Updated …" for the group).
 *
 * Memo: the grouped diagram per (raw sldV2, grouping) — config only; the
 * grouped envelope per (grouped diagram, live envelope) — so a live tick
 * resends only `live`, and a mode switch hands back the same objects.
 *
 * Pure (no React / RN imports).
 */

import type { SldViewMode } from 'src/hooks/useSldViewMode';
import { SLDEdge } from 'src/types';
import { makeLiveResolver } from 'src/utils/sld';
import {
  SLD_ENERGY_TYPE_LABEL,
  SldEnergyType,
  SldGroup,
  SldGrouping,
  makeGroupedResolver,
} from 'src/utils/sldGroup';
import { TwinJson } from './protocol';
import { twinEdgeDataMode, twinHasFlowRule, twinNodeRuns } from './twinFlowRule';

/**
 * Where a group node carries its raw member nodes for the page bridge,
 * which removes it (scripts/web-twin/bridge.js `GROUP_MEMBERS` — keep the
 * two names equal).
 */
export const TWIN_GROUP_MEMBERS_KEY = 'pesGroupMembers';

/**
 * The twin's icon per group type (an icon the web's `lookOf` maps to that
 * kind: wind → wind, solar → solar, genset → genset, battery → battery,
 * pylon → grid). WHR has none: its group keeps the members' icon (the
 * Diagram's `groupIcon`), and the title ("WHR · 2") picks the steam variant.
 * The page bridge corrects the icon only when the members resolve to
 * another model (Lucky's PV arrays are `solarLg`).
 */
export const TWIN_GROUP_ICON: Readonly<Record<Exclude<SldEnergyType, 'whr'>, string>> = {
  solar: 'solar',
  wind: 'wind',
  genset: 'genset',
  battery: 'battery',
  grid: 'pylon',
};

/** A group's synthetic live params (ids inside `live.<id>.value`). */
export interface TwinGroupBinding {
  group: SldGroup;
  /** The RAW member nodes, in raw order (what the twin judges in Units). */
  rawMembers: unknown[];
  /** One per displayed key, in key order. */
  keyIds: string[];
  /**
   * Members running — the group node's animation rule reads it; null when
   * no member has a rule (the group node has none either: "live").
   */
  flowId: string | null;
}

export interface TwinGroupedSld {
  /** The grouped `sldV2` (group nodes still carry `pesGroupMembers`). */
  sld: TwinJson;
  bindings: TwinGroupBinding[];
}

export interface TwinData {
  sld: TwinJson | null;
  live: TwinJson | null;
  /** Effective: `units` whenever the site has nothing to group. */
  mode: SldViewMode;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is JsonRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A raw node / edge id as the app's parser reads it (`asId` in sld.ts). */
const rawId = (v: unknown): string | null =>
  typeof v === 'string' && v !== ''
    ? v
    : typeof v === 'number' && Number.isFinite(v)
      ? String(v)
      : null;

/** Synthetic key param id: group `g` (grouping order), displayed key `k`. */
export const twinGroupKeyId = (g: number, k: number): string => `pesgrp${g}k${k}`;

/**
 * Worded flow ids, unique per diagram, for the groups that carry a rule
 * (null for the others): "Wind units flowing", then "Wind units flowing (2)"
 * for a second Wind group (other targets).
 */
const flowIds = (groups: SldGroup[], ruled: boolean[]): (string | null)[] => {
  const seen = new Map<string, number>();
  return groups.map((g, gi) => {
    if (!ruled[gi]) return null;
    const base = `${SLD_ENERGY_TYPE_LABEL[g.type]} units flowing`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
};

const liveParam = (id: string): string => `live.${id}.value`;

/**
 * The most common non-empty string; a tie goes to the value seen FIRST (in
 * member order) — the same rule as the bridge's `majorityLook` and the
 * Diagram's `groupIcon`.
 */
export const twinMajority = (values: readonly (string | undefined)[]): string | undefined => {
  const counts = new Map<string, number>();
  values.forEach(v => {
    if (v !== undefined && v !== '') counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  let best: string | undefined;
  let bestCount = 0;
  values.forEach(v => {
    const n = v === undefined || v === '' ? 0 : counts.get(v) ?? 0;
    if (n > bestCount) {
      best = v;
      bestCount = n;
    }
  });
  return best;
};

const stringAt = (v: unknown): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;

/** A raw node's backend colours: `data.color` and `data.icon.color`. */
const rawNodeColors = (raw: unknown): { color?: string; icon?: string } => {
  const data = isRecord(raw) && isRecord(raw.data) ? raw.data : null;
  if (data === null) return {};
  return {
    color: stringAt(data.color),
    icon: isRecord(data.icon) ? stringAt(data.icon.color) : undefined,
  };
};

/**
 * A raw edge's backend colour, read the twin's way (`fromSldV2`):
 * `style.stroke` ‖ `markerEnd.color` ‖ `color`.
 */
const rawEdgeColor = (raw: unknown): string | undefined => {
  if (!isRecord(raw)) return undefined;
  return (
    (isRecord(raw.style) ? stringAt(raw.style.stroke) : undefined) ??
    (isRecord(raw.markerEnd) ? stringAt(raw.markerEnd.color) : undefined) ??
    stringAt(raw.color)
  );
};

/**
 * The group → target edge as a raw sldV2 edge (client-only fields dropped).
 * `color` is the members' own (backend) cable colour — or undefined, and
 * then the edge has none (no palette colour: the twin colours the cable
 * from the group node, as it does for those members in Units). `mode`, when
 * given, is the twin's per-edge mode (groups without a rule).
 */
const rawGroupEdge = (
  e: SLDEdge,
  color: string | undefined,
  mode: 'flow' | 'idle' | undefined,
): JsonRecord => {
  const data: JsonRecord = {};
  if (e.data?.type !== undefined) data.type = e.data.type;
  const m = mode ?? e.data?.mode;
  if (m !== undefined) data.mode = m;
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: e.type,
    ...(color !== undefined ? { style: { stroke: color } } : {}),
    markerEnd: color !== undefined ? { ...e.markerEnd, color } : { type: e.markerEnd.type },
    data,
  };
};

const structureCache = new WeakMap<object, WeakMap<SldGrouping, TwinGroupedSld | null>>();

/**
 * The grouped `sldV2` for `rawSld` (the object `grouping` was parsed from),
 * or null when there is nothing to group (or no member is found in it).
 * Cached per (rawSld, grouping).
 */
export const buildTwinGroupedSld = (
  rawSld: TwinJson,
  grouping: SldGrouping,
): TwinGroupedSld | null => {
  let byGrouping = structureCache.get(rawSld);
  if (!byGrouping) {
    byGrouping = new WeakMap();
    structureCache.set(rawSld, byGrouping);
  }
  if (byGrouping.has(grouping)) return byGrouping.get(grouping) ?? null;
  const result = computeGroupedSld(rawSld, grouping);
  byGrouping.set(grouping, result);
  return result;
};

const computeGroupedSld = (rawSld: TwinJson, grouping: SldGrouping): TwinGroupedSld | null => {
  const { groups } = grouping;
  if (groups.length === 0) return null;
  const rawNodes = Array.isArray(rawSld.nodes) ? (rawSld.nodes as unknown[]) : [];
  const rawEdges = Array.isArray(rawSld.edges) ? (rawSld.edges as unknown[]) : [];

  const groupOfMember = new Map<string, number>();
  groups.forEach((g, i) => g.members.forEach(m => groupOfMember.set(m.id, i)));
  const nodeIdOf = (raw: unknown): string | null => (isRecord(raw) ? rawId(raw.id) : null);

  // Raw member nodes per group, in raw order.
  const rawMembers: unknown[][] = groups.map(() => []);
  rawNodes.forEach(raw => {
    const id = nodeIdOf(raw);
    const gi = id === null ? undefined : groupOfMember.get(id);
    if (gi !== undefined) rawMembers[gi].push(raw);
  });
  // Every group must be found in the raw object it was parsed from.
  if (rawMembers.some(list => list.length === 0)) return null;

  const groupNodes = new Map(grouping.graph.nodes.map(n => [n.id, n]));
  const keyIds = groups.map((g, gi) => g.keys.map((_, k) => twinGroupKeyId(gi, k)));
  // A group carries a flow rule when any member has one (the twin judges
  // the others "live"); with none, it has none either (see the header).
  const ruled = rawMembers.map(list => list.some(twinHasFlowRule));
  const flows = flowIds(groups, ruled);
  const bindings: TwinGroupBinding[] = groups.map((group, gi) => ({
    group,
    rawMembers: rawMembers[gi],
    keyIds: keyIds[gi],
    flowId: flows[gi],
  }));

  // Colours: the members' majority BACKEND colour, as the twin shows them in
  // Units — never the Diagram's energyPalette group colour — so switching
  // Grouped ⇄ Units never recolours the 3D (mix bar, pad rings, comets). The
  // Diagram's group cards keep their palette colours. The twin reads a
  // node's colour as `data.color` ‖ `icon.color`.
  const groupNode = (gi: number): JsonRecord => {
    const g = groups[gi];
    const node = groupNodes.get(g.id);
    const memberColors = rawMembers[gi].map(rawNodeColors);
    const color = twinMajority(memberColors.map(c => c.color ?? c.icon));
    const iconColor = twinMajority(memberColors.map(c => c.icon ?? c.color));
    const name = g.type === 'whr' ? node?.data.icon.name ?? '' : TWIN_GROUP_ICON[g.type];
    const flowId = flows[gi];
    return {
      id: g.id,
      type: node?.type ?? 'custom',
      position: { x: node?.position.x ?? 0, y: node?.position.y ?? 0 },
      data: {
        heading: node?.data.heading ?? '',
        ...(color !== undefined ? { color } : {}),
        keys: g.keys.map((k, ki) => ({
          label: k.label,
          ...(k.unit !== undefined ? { unit: k.unit } : {}),
          param: liveParam(keyIds[gi][ki]),
        })),
        edgesConnect: 'source',
        icon: iconColor !== undefined ? { name, color: iconColor } : { name },
        ...(flowId !== null
          ? { animation: { animationParams: liveParam(flowId), operator: '!=', value: 0 } }
          : {}),
        [TWIN_GROUP_MEMBERS_KEY]: rawMembers[gi],
      },
    };
  };

  // Nodes: each group takes its first member's place; the other members go.
  const nodes: unknown[] = [];
  const placed = new Set<number>();
  rawNodes.forEach(raw => {
    const id = nodeIdOf(raw);
    const gi = id === null ? undefined : groupOfMember.get(id);
    if (gi === undefined) {
      nodes.push(raw);
      return;
    }
    if (placed.has(gi)) return;
    placed.add(gi);
    nodes.push(groupNode(gi));
  });

  // Edges: every edge touching a member goes; each group → target edge takes
  // the place of the first member edge to that target.
  const groupEdges = new Map<string, SLDEdge>();
  const groupIds = new Set(groups.map(g => g.id));
  grouping.graph.edges.forEach(e => {
    if (groupIds.has(e.source)) groupEdges.set(`${e.source}->${e.target}`, e);
  });
  // The members' raw cables per group → target: their majority backend
  // colour, and (groups without a rule) the twin's per-edge mode.
  const memberCables = new Map<string, unknown[]>();
  rawEdges.forEach(raw => {
    const source = isRecord(raw) ? rawId(raw.source) : null;
    const target = isRecord(raw) ? rawId(raw.target) : null;
    const gi = source === null ? undefined : groupOfMember.get(source);
    if (gi === undefined || target === null) return;
    const key = `${groups[gi].id}->${target}`;
    const list = memberCables.get(key) ?? [];
    list.push(raw);
    memberCables.set(key, list);
  });
  const groupIndex = new Map(groups.map((g, gi) => [g.id, gi]));
  const groupEdgeFor = (key: string, e: SLDEdge): JsonRecord => {
    const cables = memberCables.get(key) ?? [];
    const gi = groupIndex.get(e.source);
    const mode =
      gi !== undefined && flows[gi] === null
        ? cables.some(c => twinEdgeDataMode(c) === 'flow')
          ? 'flow'
          : 'idle'
        : undefined;
    return rawGroupEdge(e, twinMajority(cables.map(rawEdgeColor)), mode);
  };

  const edges: unknown[] = [];
  const emitted = new Set<string>();
  rawEdges.forEach(raw => {
    const source = isRecord(raw) ? rawId(raw.source) : null;
    const target = isRecord(raw) ? rawId(raw.target) : null;
    const gi = source === null ? undefined : groupOfMember.get(source);
    const touchesMember = gi !== undefined || (target !== null && groupOfMember.has(target));
    if (!touchesMember) {
      edges.push(raw);
      return;
    }
    if (gi === undefined || target === null) return;
    const key = `${groups[gi].id}->${target}`;
    const e = groupEdges.get(key);
    if (e && !emitted.has(key)) {
      emitted.add(key);
      edges.push(groupEdgeFor(key, e));
    }
  });
  // Every group edge comes from a raw member edge, so none is left — kept
  // anyway so a group can never lose its cable.
  groupEdges.forEach((e, key) => {
    if (!emitted.has(key)) edges.push(groupEdgeFor(key, e));
  });

  return { sld: { ...rawSld, nodes, edges }, bindings };
};

/** `update_at` of the entry a `live.<id>.value` param reads, or undefined. */
const updateAtOf = (live: TwinJson, param: string): unknown => {
  const segs = param.split('.').filter(Boolean);
  if (segs.length < 2 || segs[segs.length - 1] !== 'value') return undefined;
  let cursor: unknown = live;
  for (const seg of segs.slice(0, -1)) {
    if (!isRecord(cursor)) return undefined;
    cursor = cursor[seg];
  }
  return isRecord(cursor) ? cursor.update_at : undefined;
};

/**
 * An `update_at` as the twin reads it (its `tz`, module 748776): a positive
 * number — seconds below 1e12, else ms; anything else (an ISO string) is no
 * time at all.
 */
const twinStampMs = (raw: unknown): number | null => {
  const t = Number(raw);
  return !Number.isFinite(t) || t <= 0 ? null : t < 1e12 ? t * 1000 : t;
};

/** A raw node's params the twin reads: its keys' `param` ‖ `liveParams`, its rule's `animationParams`. */
const rawParamsOf = (raw: unknown): string[] => {
  const data = isRecord(raw) && isRecord(raw.data) ? raw.data : {};
  const out: string[] = [];
  if (Array.isArray(data.keys)) {
    data.keys.forEach(k => {
      const p = isRecord(k) ? stringAt(k.param) ?? stringAt(k.liveParams) : undefined;
      if (p !== undefined) out.push(p);
    });
  }
  const an = isRecord(data.animation) ? stringAt(data.animation.animationParams) : undefined;
  if (an !== undefined) out.push(an);
  return out;
};

/**
 * The newest `update_at` (as sent) over every member param of a group, by
 * the twin's own reading — what its "Updated …" says for the members.
 */
const newestMemberUpdate = (rawMembers: unknown[], live: TwinJson): unknown => {
  let best: unknown;
  let bestMs = -Infinity;
  rawMembers.forEach(m =>
    rawParamsOf(m).forEach(param => {
      const raw = updateAtOf(live, param);
      const ms = twinStampMs(raw);
      if (ms !== null && ms > bestMs) {
        bestMs = ms;
        best = raw;
      }
    }),
  );
  return best;
};

const liveCache = new WeakMap<TwinGroupedSld, WeakMap<object, TwinJson>>();

/**
 * The grouped live envelope: `live` plus the groups' synthetic entries.
 * Cached per (grouped diagram, live envelope).
 */
export const buildTwinGroupedLive = (structure: TwinGroupedSld, live: TwinJson): TwinJson => {
  let byLive = liveCache.get(structure);
  if (!byLive) {
    byLive = new WeakMap();
    liveCache.set(structure, byLive);
  }
  const hit = byLive.get(live);
  if (hit) return hit;

  // The Diagram's resolvers, over this envelope (`makeLiveResolver` walks
  // `/data/all` → `live.data`).
  const base = makeLiveResolver({ live: { data: live } });
  const grouped = makeGroupedResolver(
    base,
    structure.bindings.map(b => b.group),
  );
  const entry = (value: number | 'NA', at: unknown): JsonRecord =>
    at === undefined ? { value } : { value, update_at: at };

  const synthetic: JsonRecord = {};
  structure.bindings.forEach(({ group, rawMembers, keyIds, flowId }) => {
    const at = newestMemberUpdate(rawMembers, live);
    group.keys.forEach((k, i) => {
      const v = grouped(k.param);
      synthetic[keyIds[i]] = entry(typeof v === 'number' && Number.isFinite(v) ? v : 'NA', at);
    });
    // Members the twin draws running in Units (its own rule, over the same
    // envelope it reads them from).
    if (flowId !== null) {
      synthetic[flowId] = entry(rawMembers.filter(m => twinNodeRuns(m, live)).length, at);
    }
  });
  const inner = isRecord(live.live) ? live.live : {};
  const result: TwinJson = { ...live, live: { ...inner, ...synthetic } };
  byLive.set(live, result);
  return result;
};

/**
 * What the twin is fed for `mode`: Units (or a site with nothing to group)
 * → `rawSld` / `live` themselves; Grouped → the grouped diagram + envelope
 * (null `live` stays null: the page waits for `/data/all` either way).
 * `grouping` must come from the config `rawSld` was read from.
 */
export const twinDataFor = (
  mode: SldViewMode,
  rawSld: TwinJson | null,
  grouping: SldGrouping | null,
  live: TwinJson | null,
): TwinData => {
  const structure =
    mode === 'grouped' && rawSld !== null && grouping !== null
      ? buildTwinGroupedSld(rawSld, grouping)
      : null;
  if (structure === null) return { sld: rawSld, live, mode: 'units' };
  return {
    sld: structure.sld,
    live: live === null ? null : buildTwinGroupedLive(structure, live),
    mode: 'grouped',
  };
};
