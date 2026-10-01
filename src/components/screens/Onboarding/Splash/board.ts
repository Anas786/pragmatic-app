/**
 * Circuit-board generator — a verbatim port of the website's trace
 * generator (de-minified from the web bundle). Deterministic: mulberry32
 * PRNG, seed 7.
 *
 * ⚠️ Keep the `rand()` call order and every short-circuit EXACTLY as the
 * web has them — __tests__/splashBoard.test.ts deep-compares this output
 * against the verbatim minified web generator on several viewports.
 *
 * JS thread only. Pure TS, no Skia. NEVER call from a worklet.
 */

export interface BoardPoint {
  x: number;
  y: number;
}

export interface BoardVia extends BoardPoint {
  at: number;
}

export interface BoardTrace {
  pts: BoardPoint[];
  /** Cumulative polyline lengths; seg[0] = 0. */
  seg: number[];
  len: number;
  /** Interior corners, with the path length at which each is reached. */
  vias: BoardVia[];
  /** Terminating square pad, or null when the trace runs off-screen. */
  pad: BoardPoint | null;
  kind: 'fine' | 'main';
  start: number;
  r0: number;
  hasPacket: boolean;
  period: number;
  phase: number;
}

export interface KeepOut {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface Board {
  traces: BoardTrace[];
  maxR: number;
  keepOut: KeepOut;
  width: number;
  height: number;
}

export interface BoardTimeline {
  traceStart: number;
  traceJitter: number;
}

export interface BuildBoardArgs {
  width: number;
  height: number;
  keepOut: KeepOut;
  seed?: number;
  tl: BoardTimeline;
}

/** Web inline mulberry32. Returns floats in [0, 1). */
/* eslint-disable no-bitwise -- PRNG: bit-exact port of the web mulberry32 */
export function mulberry32(seed: number): () => number {
  let l = seed >>> 0;
  return () => {
    let e = (l = (l + 0x6d2b79f5) >>> 0);
    e = Math.imul(e ^ (e >>> 15), 1 | e);
    e ^= e + Math.imul(e ^ (e >>> 7), 61 | e);
    return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
  };
}
/* eslint-enable no-bitwise */

/** Web `ac`. */
const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

/** Web `.sit-logo` width: clamp(220px, 34vw, 420px); height from the viewBox. */
export function logoBox(W: number): { lw: number; lh: number } {
  const lw = clamp(0.34 * W, 220, 420);
  return { lw, lh: (lw * 474.3) / 1000 };
}

/** Web keep-out ellipse around the (centred) logo box. */
export function keepOutFor(W: number, H: number): KeepOut {
  const { lw, lh } = logoBox(W);
  return { cx: W / 2, cy: H / 2, rx: lw / 2 + 40, ry: lh / 2 + 56 };
}

type TraceExtra = Omit<BoardTrace, 'pts' | 'seg' | 'len' | 'vias'>;

/** Web `ah`: cumulative segment lengths + interior vias. */
function withSegs(pts: BoardPoint[], extra: TraceExtra): BoardTrace {
  const seg = [0];
  for (let i = 1; i < pts.length; i++) {
    seg.push(
      seg[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y),
    );
  }
  const vias: BoardVia[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    vias.push({ x: pts[i].x, y: pts[i].y, at: seg[i] });
  }
  return { pts, seg, len: seg[seg.length - 1], vias, ...extra };
}

type Axis = 'x' | 'y';

export function buildBoard({
  width: W,
  height: H,
  keepOut,
  seed = 7,
  tl,
}: BuildBoardArgs): Board {
  const rand = mulberry32(seed);
  const { cx, cy, rx, ry } = keepOut;
  const n = clamp(Math.round((W * H) / 30000), 24, 56);
  const traces: BoardTrace[] = [];

  for (let r = 0; r < n; r++) {
    const step = (2 * Math.PI) / n;
    const ang = (r + 0.5) * step + (rand() - 0.5) * step * 0.8;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const m = 1 + rand() * (Math.abs(s) > 0.7 ? 0.7 : 0.42);
    const g: BoardPoint = { x: cx + rx * m * c, y: cy + ry * m * s };
    const sx = c >= 0 ? 1 : -1;
    const sy = s >= 0 ? 1 : -1;
    const ac = Math.abs(c);
    const axis: Axis = ac >= Math.abs(s) ? 'x' : 'y';
    // rand() is consumed ONLY when the angle is in the diagonal range.
    const diag = ac > 0.45 && ac < 0.9 && rand() < 0.5;
    const ex = sx > 0 ? W + 48 : -48;
    const ey = sy > 0 ? H + 48 : -48;

    const straight = (p: BoardPoint, a: Axis, d: number): BoardPoint =>
      a === 'x' ? { x: p.x + sx * d, y: p.y } : { x: p.x, y: p.y + sy * d };
    const jog = (p: BoardPoint, a: Axis, d: number, t = 1): BoardPoint =>
      a === 'x'
        ? { x: p.x + sx * d, y: p.y + sy * t * d }
        : { x: p.x + sx * t * d, y: p.y + sy * d };
    const runOff = (p: BoardPoint, a: Axis): BoardPoint =>
      a === 'x' ? { x: ex, y: p.y } : { x: p.x, y: ey };

    const pts: BoardPoint[] = [g];
    let pad: BoardPoint | null = null;
    let h = g;

    if (diag) {
      h = jog(h, axis, 50 + 190 * rand());
      pts.push(h);
      const a2: Axis = rand() < 0.5 ? 'x' : 'y';
      if (rand() < 0.25) {
        h = straight(h, a2, 60 + 170 * rand());
        pts.push(h);
        pad = h;
      } else {
        pts.push(runOff(h, a2));
      }
    } else {
      h = straight(h, axis, 24 + rand() * (axis === 'y' ? 220 : 150));
      pts.push(h);
      h = jog(h, axis, 36 + 170 * rand());
      pts.push(h);
      if (rand() < 0.42) {
        h = straight(h, axis, 70 + 220 * rand());
        pts.push(h);
        // Arguments evaluate left → right: distance rand, then sign rand.
        const dist = 30 + 110 * rand();
        h = jog(h, axis, dist, rand() < 0.6 ? 1 : -1);
        pts.push(h);
      }
      if (rand() < 0.2) {
        h = straight(h, axis, 60 + 170 * rand());
        pts.push(h);
        pad = h;
      } else {
        pts.push(runOff(h, axis));
      }
    }

    // Object-literal properties evaluate in source order — same rand order
    // as the web: kind, start, hasPacket, period, phase.
    const kind: BoardTrace['kind'] = rand() < 0.3 ? 'fine' : 'main';
    const start = tl.traceStart + rand() * tl.traceJitter;
    const r0 = Math.hypot(g.x - cx, g.y - cy);
    const hasPacket = rand() < 0.6;
    const period = 1800 + 1800 * rand();
    const phase = 3000 * rand();
    traces.push(
      withSegs(pts, { pad, kind, start, r0, hasPacket, period, phase }),
    );
  }

  const corners: Array<[number, number]> = [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
  ];
  const maxR = Math.max(
    ...corners.map(([x, y]) => Math.hypot(x - cx, y - cy)),
  );
  return { traces, maxR, keepOut, width: W, height: H };
}
