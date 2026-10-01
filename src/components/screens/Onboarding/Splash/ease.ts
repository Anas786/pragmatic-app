/**
 * Allocation-free easing helpers for the splash. EVERY function here is a
 * worklet (first statement `'worklet'`) — they run inside the UI-thread
 * frame callback and the per-frame picture recorder. A missing directive is
 * a runtime crash that tsc/lint cannot catch; __tests__/splashBoard.test.ts
 * checks every export for a `__workletHash`.
 *
 * Hand-rolled instead of Reanimated's `Easing.bezierFn` so the math is
 * testable (the Reanimated Jest mock replaces bezierFn with identity).
 */

/** Clamp to [0, 1]. NaN → 0. */
export function clamp01(x: number): number {
  'worklet';
  return x > 0 ? (x < 1 ? x : 1) : 0;
}

/**
 * CSS/framer cubic-bezier(x1, y1, x2, y2) evaluated at progress `x`.
 * Newton on x(t) (8 iterations), bisection fallback. `x <= 0` / NaN → 0,
 * `x >= 1` → 1.
 */
export function cubicBezier(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  'worklet';
  if (!(x > 0)) {
    return 0;
  }
  if (x >= 1) {
    return 1;
  }
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  let t = x;
  let solved = false;
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x;
    if (Math.abs(err) < 1e-7) {
      solved = true;
      break;
    }
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(d) < 1e-6) {
      break;
    }
    t -= err / d;
  }
  if (!solved || !(t >= 0 && t <= 1)) {
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const xt = ((ax * t + bx) * t + cx) * t;
      if (Math.abs(xt - x) < 1e-7) {
        break;
      }
      if (xt < x) {
        lo = t;
      } else {
        hi = t;
      }
      t = (lo + hi) / 2;
    }
  }
  return ((ay * t + by) * t + cy) * t;
}

/** framer `af` — glyph stroke draw. */
export function easeGlyph(x: number): number {
  'worklet';
  return cubicBezier(x, 0.65, 0, 0.35, 1);
}

/** framer `aM` — caption entrance. */
export function easeCaption(x: number): number {
  'worklet';
  return cubicBezier(x, 0.2, 0.7, 0.2, 1);
}

/** framer `ay` — land exit. */
export function easeExit(x: number): number {
  'worklet';
  return cubicBezier(x, 0.4, 0, 0.6, 1);
}

/** framer "easeOut" / CSS ease-out. */
export function easeOut(x: number): number {
  'worklet';
  return cubicBezier(x, 0, 0, 0.58, 1);
}

/** framer "easeInOut" / CSS ease-in-out. */
export function easeInOut(x: number): number {
  'worklet';
  return cubicBezier(x, 0.42, 0, 0.58, 1);
}

export function easeOutCubic(x: number): number {
  'worklet';
  const c = clamp01(x);
  const inv = 1 - c;
  return 1 - inv * inv * inv;
}

/**
 * Web `.sit-dots i` keyframes: opacity .25 → 1 at 30% → .25, 1.2 s
 * ease-in-out, infinite, dot `i` delayed by 200·i ms.
 */
export function dotOpacity(tMs: number, i: number): number {
  'worklet';
  const d = tMs - 200 * i;
  if (!(d >= 0)) {
    return 0.25;
  }
  const x = (d % 1200) / 1200;
  if (x < 0.3) {
    return 0.25 + 0.75 * easeInOut(x / 0.3);
  }
  return 1 - 0.75 * easeInOut((x - 0.3) / 0.7);
}
