/**
 * The web twin's own per-node flow rule, ported to TypeScript for the
 * Grouped adapter (twinGrouped.ts): a group's flow count must judge its
 * members EXACTLY as the twin judges them in Units, or a Grouped ⇄ Units
 * switch changes what is running (a group "Idle" with a still cable while
 * its units run, and "… producing now" dropping by that group's power).
 *
 * Source of truth: scripts/web-twin/bridge.js, section "live values"
 * (`getValueFromStore`, `fmt`, `ruleOperand`, `nearlyEqual`, `evalRule`,
 * `buildLiveValues`) — itself the web hook's rules, checked against the
 * web's own mathjs (__tests__/sldTwinBridge.test.ts). A differential test
 * runs this port and the shipped bridge section over the same cases
 * (__tests__/sldTwinFlowRule.test.ts) — change them together.
 *
 * The twin's status for a node (model.md §5.2):
 *  - a node whose `data.animation.animationParams` is set has an edgeMode —
 *    'flow' when its reading (rounded to 2 decimals first, like the web's
 *    `getValueFromStore`) satisfies `${operator || '!='} ${value ?? 0}`,
 *    else 'idle' ('NA' / missing / a rule mathjs can't read → idle); its
 *    cables follow it;
 *  - a node WITHOUT one is "live" (drawn running) as soon as one of its
 *    readings is a number; its cables follow their own `data.mode`
 *    (default 'flow' unless 'idle').
 *
 * Pure (no React / RN imports).
 */

import { TwinJson } from './protocol';

type JsonRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is JsonRecord =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** lodash.get(obj, path, dflt) as bridge.js `lodashGet` reads it. */
const lodashGet = (obj: unknown, path: unknown, dflt: unknown): unknown => {
  const segs = String(path)
    .replace(/\[(\w+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur: unknown = obj;
  for (const seg of segs) {
    if (cur === null || cur === undefined) return dflt;
    cur = (cur as JsonRecord)[seg];
  }
  return cur === undefined ? dflt : cur;
};

/** The web's `getValueFromStore`: 'NA' when absent; numbers → `toFixed(2)`. */
export const twinStoreValue = (store: unknown, path: unknown): unknown => {
  const r = lodashGet(store, path, 'NA');
  return typeof r === 'number' ? r.toFixed(2) : r;
};

/** The web hook's "—" test (`fmt`): no reading at all. */
const isDash = (v: unknown): boolean =>
  v === null || v === undefined || v === 'NA' || v === '' || Number.isNaN(Number(v));

const RULE_TRIM = /^[ \t]+|[ \t]+$/g;
const RULE_OPERAND =
  /^((?:[+-][ \t]*)*)(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|(true|false|NaN|Infinity|null))$/;
const RULE_CONSTANT: Readonly<Record<string, number>> = {
  true: 1,
  false: 0,
  NaN: NaN,
  Infinity: Infinity,
  null: NaN,
};

/** The rule's right-hand side as mathjs reads it; throws where mathjs would. */
const ruleOperand = (ref: unknown): number => {
  const text = String(ref).replace(RULE_TRIM, '');
  const m = RULE_OPERAND.exec(text);
  if (!m) throw new Error(`not a number for the rule: ${text}`);
  const n = m[2] !== undefined ? Number(m[2]) : RULE_CONSTANT[m[3]];
  return (m[1].match(/-/g) ?? []).length % 2 ? -n : n;
};

/** mathjs `nearlyEqual` with its default config (relTol 1e-12, absTol 1e-15). */
const nearlyEqual = (a: number, b: number): boolean => {
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  if (a === b) return true;
  return Math.abs(a - b) <= Math.max(1e-12 * Math.max(Math.abs(a), Math.abs(b)), 1e-15);
};

const evalRule = (v: unknown, op: unknown, ref: unknown): boolean => {
  const a = Number(v);
  const b = ruleOperand(ref);
  const o = String(op || '!=').replace(RULE_TRIM, '');
  switch (o) {
    case '!=':
      return !nearlyEqual(a, b);
    case '==':
      return nearlyEqual(a, b);
    case '>':
      return a > b && !nearlyEqual(a, b);
    case '<':
      return a < b && !nearlyEqual(a, b);
    case '>=':
      return a > b || nearlyEqual(a, b);
    case '<=':
      return a < b || nearlyEqual(a, b);
    default:
      throw new Error(`unsupported operator ${o}`);
  }
};

/** A raw sldV2 node's `data`, or an empty record. */
const dataOf = (node: unknown): JsonRecord =>
  isRecord(node) && isRecord(node.data) ? node.data : {};

/** The node's `animation` when the twin reads it as a rule (its `animationParams` is set). */
const ruleOf = (node: unknown): JsonRecord | null => {
  const an = dataOf(node).animation;
  return isRecord(an) && an.animationParams ? an : null;
};

/** Whether the twin gives this raw node an edgeMode (a flow rule). */
export const twinHasFlowRule = (node: unknown): boolean => ruleOf(node) !== null;

/**
 * The twin's edgeMode for one raw sldV2 node over a live envelope (the
 * twin's store): 'flow' | 'idle', or undefined when the node has no rule.
 */
export const twinEdgeMode = (node: unknown, store: TwinJson): 'flow' | 'idle' | undefined => {
  const an = ruleOf(node);
  if (an === null) return undefined;
  const v = twinStoreValue(store, an.animationParams);
  if (v === 'NA' || v === null || v === undefined) return 'idle';
  try {
    return evalRule(v, an.operator, an.value === null || an.value === undefined ? 0 : an.value)
      ? 'flow'
      : 'idle';
  } catch {
    return 'idle';
  }
};

/**
 * Whether one of the node's live readings is a number for the twin — its
 * `nodeKv` (bridge.js `buildLiveValues`): one entry per key LABEL (a later
 * key with the same label replaces an earlier one, as there) for every key
 * with a label and a param (`param` ‖ `liveParams`); a reading is any
 * entry that isn't "—".
 */
export const twinNodeHasReading = (node: unknown, store: TwinJson): boolean => {
  const keys = dataOf(node).keys;
  if (!Array.isArray(keys)) return false;
  const kv = new Map<string, boolean>();
  keys.forEach(k => {
    const p = isRecord(k) ? k.param || k.liveParams : null;
    if (!isRecord(k) || !p || !k.label) return;
    kv.set(String(k.label), !isDash(twinStoreValue(store, p)));
  });
  return [...kv.values()].some(Boolean);
};

/**
 * Whether the twin draws this raw node running in Units: by its rule when
 * it has one ('flow'), else "live" — a node with no rule and a numeric
 * reading.
 */
export const twinNodeRuns = (node: unknown, store: TwinJson): boolean => {
  const mode = twinEdgeMode(node, store);
  return mode === undefined ? twinNodeHasReading(node, store) : mode === 'flow';
};

/**
 * A raw sldV2 edge's mode as the twin parses it (`fromSldV2`:
 * `data.mode || mode`, 'idle' only when it says so — otherwise 'flow').
 */
export const twinEdgeDataMode = (edge: unknown): 'flow' | 'idle' => {
  if (!isRecord(edge)) return 'flow';
  const mode = (isRecord(edge.data) ? edge.data.mode : undefined) || edge.mode;
  return mode === 'idle' ? 'idle' : 'flow';
};
