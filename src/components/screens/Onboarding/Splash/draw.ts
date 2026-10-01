/**
 * Per-frame splash renderer — a line-for-line port of the web Canvas2D
 * frame loop (circuit board) + the framer-motion SVG logo, recorded into
 * ONE SkPicture per frame on the UI thread.
 *
 * ⚠️ EVERY function here is a worklet (`'worklet'` is the first
 * statement). Enforced by the `__workletHash` test in
 * __tests__/splashBoard.test.ts.
 *
 * Zero path allocation in steady state: full / final-lit paths are cached
 * in the scene; partial ranges reuse ONE `rewind()`-ed scratch path (the
 * picture recorder copies path data at record time, so reuse is safe).
 * Paints are shared and mutated with setAlphaf/setStrokeWidth right before
 * each draw — the recorder snapshots the paint on every draw call.
 */
import type { SkCanvas, SkPicture } from '@shopify/react-native-skia';
import {
  clamp01,
  easeExit,
  easeGlyph,
  easeInOut,
  easeOut,
  easeOutCubic,
} from './ease';
import type { Scene, SceneGlyph, SceneTrace } from './scene';
import {
  EXIT,
  GLOW_SOFT_SIGMA,
  GLOW_WIDE_SIGMA,
  REDUCED_TL,
  WARMUP_BEFORE_W,
  WEB_TL,
} from './timeline';

/** Web `au`: point at path distance `d` along the trace → out[0], out[1]. */
export function pointAt(tr: SceneTrace, d: number, out: number[]): void {
  'worklet';
  let n = 1;
  while (n < tr.seg.length && tr.seg[n] < d) {
    n++;
  }
  if (n >= tr.seg.length) {
    out[0] = tr.xs[tr.xs.length - 1];
    out[1] = tr.ys[tr.ys.length - 1];
    return;
  }
  const L = tr.seg[n] - tr.seg[n - 1];
  const f = L ? (d - tr.seg[n - 1]) / L : 0;
  out[0] = tr.xs[n - 1] + (tr.xs[n] - tr.xs[n - 1]) * f;
  out[1] = tr.ys[n - 1] + (tr.ys[n] - tr.ys[n - 1]) * f;
}

/** Web `ap`: stroke the trace's [from, to] range. */
export function strokeRange(
  c: SkCanvas,
  S: Scene,
  i: number,
  from: number,
  to: number,
  paint: Scene['idleStroke'],
  pt: number[],
): void {
  'worklet';
  if (!(to > from)) {
    return;
  }
  const tr = S.tr[i];
  if (from === 0 && to >= tr.len) {
    c.drawPath(S.full[i], paint);
    return;
  }
  const lit = S.litPath[i];
  if (from === 0 && lit !== null && Math.abs(to - S.litLen[i]) < 1e-4) {
    c.drawPath(lit, paint);
    return;
  }
  const p = S.scratch;
  p.rewind();
  pointAt(tr, from, pt);
  p.moveTo(pt[0], pt[1]);
  for (let n = 1; n < tr.xs.length; n++) {
    if (tr.seg[n] <= from) {
      continue;
    }
    if (tr.seg[n] >= to) {
      break;
    }
    p.lineTo(tr.xs[n], tr.ys[n]);
  }
  pointAt(tr, to, pt);
  p.lineTo(pt[0], pt[1]);
  c.drawPath(p, paint);
}

function clampTo(v: number, lo: number, hi: number): number {
  'worklet';
  // NaN-proof: NaN fails both comparisons → lo.
  return v > lo ? (v < hi ? v : hi) : lo;
}

/** Pad / via: substrate disc + lit-or-idle ring (web `am`). */
function ring(
  c: SkCanvas,
  S: Scene,
  x: number,
  y: number,
  r: number,
  lit: boolean,
  width: number,
): void {
  'worklet';
  c.drawCircle(x, y, r, S.substrateFill);
  const p = lit ? S.ringLit : S.ringIdle;
  p.setAlphaf(lit ? 0.9 : 0.55);
  p.setStrokeWidth(width);
  c.drawCircle(x, y, r, p);
}

function dot(
  c: SkCanvas,
  S: Scene,
  x: number,
  y: number,
  r: number,
  core: boolean,
  alpha: number,
): void {
  'worklet';
  const p = core ? S.coreFill : S.litFill;
  p.setAlphaf(alpha);
  c.drawCircle(x, y, r, p);
}

/** The circuit board — the web Canvas2D frame loop, dark mode (g = 1). */
export function drawBoard(
  c: SkCanvas,
  S: Scene,
  w: number,
  exitKind: number,
  exitAtW: number,
  reduced: boolean,
  pt: number[],
): void {
  'worklet';
  const T = reduced ? REDUCED_TL : WEB_TL;
  const h = reduced ? 1 : clamp01((w - T.ignite) / T.igniteTravel);
  const u = S.rx + easeOutCubic(h) * (S.maxR - S.rx);
  const p = h >= 1 && !reduced ? 0.9 + 0.1 * Math.sin(w / 650) : 1;
  const k =
    exitKind === EXIT.LAND && T.landFlare > 0 && exitAtW >= 0
      ? Math.sin(Math.PI * clamp01((w - exitAtW) / T.landFlare))
      : 0;
  const m = 1 + 0.9 * k;

  for (let i = 0; i < S.tr.length; i++) {
    const t = S.tr[i];
    const o = reduced ? t.len : clampTo((w - t.start) * T.traceSpeed, 0, t.len);
    if (o <= 0) {
      continue;
    }
    const fine = t.fine;

    // 1. idle stroke over [0, o]
    S.idleStroke.setAlphaf(fine ? 0.18 : 0.32);
    S.idleStroke.setStrokeWidth(fine ? 1 : 1.35);
    strokeRange(c, S, i, 0, o, S.idleStroke, pt);

    // 2. lit range [0, s]
    const s = clampTo(u - t.r0, 0, o);
    if (s > 0) {
      if (!fine) {
        S.litStroke.setAlphaf(0.08 * m);
        S.litStroke.setStrokeWidth(5 + 4 * k);
        strokeRange(c, S, i, 0, s, S.litStroke, pt);
      }
      S.litStroke.setAlphaf(Math.min(1, (fine ? 0.28 : 0.52) * p * m));
      S.litStroke.setStrokeWidth(fine ? 1 : 1.5);
      strokeRange(c, S, i, 0, s, S.litStroke, pt);
      if (s < o && h < 1) {
        pointAt(t, s, pt);
        dot(c, S, pt[0], pt[1], 8, false, 0.3);
        dot(c, S, pt[0], pt[1], 2.4, true, 0.95);
      }
    }

    // 3. growing head
    if (!reduced && o < t.len) {
      pointAt(t, o, pt);
      dot(c, S, pt[0], pt[1], 6, false, 0.25);
      dot(c, S, pt[0], pt[1], 1.8, false, 0.95);
    }

    // 4. start pad, vias reached, end pad
    const reach = u - t.r0;
    ring(c, S, t.xs[0], t.ys[0], 2.4, reach >= 0, 1.2);
    for (let v = 0; v < t.viaAt.length; v++) {
      const at = t.viaAt[v];
      if (o >= at) {
        ring(c, S, t.viaX[v], t.viaY[v], 2.8, reach >= at, 1.1);
      }
    }
    if (t.padRect !== null && o >= t.len) {
      c.drawRect(t.padRect, S.substrateFill);
      const lit = reach >= t.len;
      const rp = lit ? S.ringLit : S.ringIdle;
      rp.setAlphaf(lit ? 0.9 : 0.55);
      rp.setStrokeWidth(1.2);
      c.drawRect(t.padRect, rp);
    }

    // 5. packets
    if (!reduced && t.packet && !fine && w >= T.packetsStart) {
      const q = ((w - T.packetsStart + t.phase) % t.period) / t.travel;
      if (q < 1) {
        const d = q * t.len;
        for (let r = 3; r >= 1; r--) {
          pointAt(t, Math.max(0, d - 9 * r), pt);
          dot(c, S, pt[0], pt[1], 1.8 - 0.3 * r, false, 0.4 - 0.1 * r);
        }
        pointAt(t, d, pt);
        dot(c, S, pt[0], pt[1], 7, false, 0.28);
        dot(c, S, pt[0], pt[1], 2.2, true, 0.95);
      }
    }
  }
}

/** Fill-layer glow before any land transition: [σ, α] in viewBox units. */
function glowBase(w: number, reduced: boolean, out: number[]): void {
  'worklet';
  if (reduced) {
    // Reduced motion starts `data-lit` → static drop-shadow(14px soft).
    out[0] = 7;
    out[1] = 0.32;
    return;
  }
  const T = WEB_TL;
  if (w < T.ignite) {
    out[0] = 0;
    out[1] = 0;
    return;
  }
  const r = w - T.ignite;
  if (r < T.litGlowDur) {
    // CSS `transition: filter .7s ease-out` → drop-shadow(14px glow-soft)
    const e = easeOut(r / T.litGlowDur);
    out[0] = 7 * e;
    out[1] = 0.32 * e;
    return;
  }
  // `sit-breathe` 3.2 s ease-in-out infinite: 50% → drop-shadow(22px glow)
  const phi = ((r - T.litGlowDur) % T.breathePeriod) / T.breathePeriod;
  if (phi < 0.5) {
    const e1 = easeInOut(phi / 0.5);
    out[0] = 7 + 4 * e1;
    out[1] = 0.32 + 0.23 * e1;
  } else {
    const e2 = easeInOut((phi - 0.5) / 0.5);
    out[0] = 11 - 4 * e2;
    out[1] = 0.55 - 0.23 * e2;
  }
}

/** Fill-layer glow [σ, α] (viewBox units), including the land transition. */
export function glowAt(
  w: number,
  exitKind: number,
  exitAtW: number,
  reduced: boolean,
  out: number[],
): void {
  'worklet';
  if (exitKind === EXIT.LAND && exitAtW >= 0) {
    // `[data-exit=land]`: drop-shadow(26px glow), .24 s ease-out transition.
    glowBase(exitAtW, reduced, out);
    const e = easeOut(clamp01((w - exitAtW) / 240));
    out[0] = out[0] + (13 - out[0]) * e;
    out[1] = out[1] + (0.55 - out[1]) * e;
    return;
  }
  glowBase(w, reduced, out);
}

/** Glyph fills at their current fill-in alpha (web: staggered opacity 0→1). */
function drawFills(c: SkCanvas, S: Scene, w: number, reduced: boolean): void {
  'worklet';
  const T = reduced ? REDUCED_TL : WEB_TL;
  for (let j = 0; j < S.glyph.length; j++) {
    const gl = S.glyph[j];
    const a = reduced
      ? easeInOut(clamp01((w - T.fillDelayReduced) / T.fillDurReduced))
      : easeOut(
          clamp01((w - (T.fillStart + gl.i * T.fillStagger)) / T.fillDuration),
        );
    if (a > 0) {
      gl.fill.setAlphaf(a);
      c.drawPath(gl.path, gl.fill);
    }
  }
}

/**
 * First frames only (w < WARMUP_BEFORE_W, board still empty): run every GPU
 * pipeline the logo uses later — both fixed glow blurs, the stroke layer's
 * chained drop-shadows, stroked paths and the bar gradient — once at alpha
 * 1/255, invisible on the board. First-use shader compilation then stalls
 * here, where nothing is moving yet, instead of mid-logo (measured: a
 * 265 ms stall at the first stroke frame on a fresh install). Every real
 * draw sets its paint alpha before use, and the recorder snapshots paints
 * per draw call, so the warm-up alphas never leak.
 */
function warmUp(c: SkCanvas, S: Scene): void {
  'worklet';
  let ink: SceneGlyph | null = null;
  let bar: SceneGlyph | null = null;
  for (let j = 0; j < S.glyph.length; j++) {
    const gl = S.glyph[j];
    if (gl.bar && bar === null) {
      bar = gl;
    } else if (!gl.bar && ink === null) {
      ink = gl;
    }
  }
  if (ink === null || bar === null) {
    return;
  }
  const WARM = 1 / 255;
  c.save();
  c.translate(S.logoX, S.logoY);
  c.scale(S.s, S.s);
  ink.fill.setAlphaf(1);
  bar.fill.setAlphaf(1);
  S.glowSoftPaint.setAlphaf(WARM);
  c.saveLayer(S.glowSoftPaint, S.vbPad);
  c.drawPath(ink.path, ink.fill);
  c.drawPath(bar.path, bar.fill);
  c.restore();
  S.glowWidePaint.setAlphaf(WARM);
  c.saveLayer(S.glowWidePaint, S.vbPad);
  c.drawPath(ink.path, ink.fill);
  c.restore();
  S.strokeBrand.setAlphaf(1);
  S.strokeBar.setAlphaf(1);
  S.strokeLayerPaint.setAlphaf(WARM);
  c.saveLayer(S.strokeLayerPaint, S.vbPad);
  c.drawPath(ink.path, S.strokeBrand);
  c.drawPath(bar.path, S.strokeBar);
  c.restore();
  S.strokeLayerPaint.setAlphaf(1);
  c.restore();
}

/** The PES mark: fill layer (+ glow), stroke-draw layer (+ glow), exit. */
export function drawLogo(
  c: SkCanvas,
  S: Scene,
  w: number,
  exitKind: number,
  exitAtW: number,
  logoExitAtW: number,
  reduced: boolean,
  g: number[],
): void {
  'worklet';
  const T = reduced ? REDUCED_TL : WEB_TL;
  let sL = 1;
  let aL = 1;
  if (exitKind === EXIT.LAND && logoExitAtW >= 0) {
    const e = easeExit(clamp01((w - logoExitAtW) / (0.8 * T.landFade)));
    sL = 1 + 0.06 * e;
    aL = 1 - e;
  }
  if (aL <= 0.002) {
    return;
  }
  c.save();
  c.translate(S.cx, S.cy);
  c.scale(sL, sL);
  c.translate(-S.cx, -S.cy);
  // viewBox space → every filter sigma below is in viewBox units.
  c.translate(S.logoX, S.logoY);
  c.scale(S.s, S.s);
  const fade = aL < 1;
  if (fade) {
    S.logoAlphaPaint.setAlphaf(aL);
    c.saveLayer(S.logoAlphaPaint, S.vbPad);
  }

  // FILL layer. The web's glow is ONE drop-shadow whose radius animates
  // (σ 7 lit → 11 breathe → 13 land). Here it is up to two shadow-only
  // layers with FIXED radii (σ7 soft, σ13 wide) drawn under the fills, and
  // the animated σ is mapped to their alphas: σ ≤ 7 → soft only; above
  // that, crossfade soft → wide. Nothing about the blur changes per frame
  // except layer alpha, so the GPU never needs a new blur kernel mid-run.
  glowAt(w, exitKind, exitAtW, reduced, g);
  const sigma = g[0];
  const alpha = g[1];
  let aSoft = 0;
  let aWide = 0;
  if (alpha > 0.002 && sigma > 0.01) {
    if (sigma <= GLOW_SOFT_SIGMA) {
      aSoft = alpha;
    } else {
      const t = clamp01(
        (sigma - GLOW_SOFT_SIGMA) / (GLOW_WIDE_SIGMA - GLOW_SOFT_SIGMA),
      );
      aSoft = alpha * (1 - t);
      aWide = alpha * t;
    }
  }
  if (aSoft > 0.002) {
    S.glowSoftPaint.setAlphaf(aSoft);
    c.saveLayer(S.glowSoftPaint, S.vbPad);
    drawFills(c, S, w, reduced);
    c.restore();
  }
  if (aWide > 0.002) {
    S.glowWidePaint.setAlphaf(aWide);
    c.saveLayer(S.glowWidePaint, S.vbPad);
    drawFills(c, S, w, reduced);
    c.restore();
  }
  drawFills(c, S, w, reduced);

  // STROKE layer (motion only)
  if (!reduced && w >= T.logoStart) {
    const sa = 1 - easeOut(clamp01((w - T.strokeFade) / T.strokeFadeDuration));
    if (sa > 0.002) {
      S.strokeBrand.setAlphaf(sa);
      S.strokeBar.setAlphaf(sa);
      c.saveLayer(S.strokeLayerPaint, S.vbPad);
      for (let j = 0; j < S.glyph.length; j++) {
        const gl = S.glyph[j];
        const prog = easeGlyph(
          clamp01((w - (T.logoStart + gl.i * T.glyphStagger)) / T.glyphDraw),
        );
        const stop = prog * gl.len;
        if (!(stop > 0.01)) {
          continue;
        }
        const path =
          prog >= 1 ? gl.path : gl.contour.getSegment(0, stop, true);
        c.drawPath(path, gl.bar ? S.strokeBar : S.strokeBrand);
      }
      c.restore();
    }
  }

  if (fade) {
    c.restore();
  }
  c.restore();
}

export function drawFrame(
  c: SkCanvas,
  S: Scene,
  w: number,
  exitKind: number,
  exitAtW: number,
  logoExitAtW: number,
  reduced: boolean,
): void {
  'worklet';
  const pt = [0, 0];
  const T = reduced ? REDUCED_TL : WEB_TL;

  // Dot grid (web `.sit:before`, #94a3b8 @ 0x12 alpha), fading in.
  S.gridPaint.setAlphaf(
    S.gridAlpha * (reduced ? 1 : easeOut(clamp01(w / T.gridFade))),
  );
  if (S.gridMode === 0) {
    c.drawRect(S.bounds, S.gridPaint);
  } else if (S.gridPath !== null) {
    c.drawPath(S.gridPath, S.gridPaint);
  }

  if (w < WARMUP_BEFORE_W) {
    warmUp(c, S);
  }

  if (reduced) {
    if (S.reducedBoard !== null) {
      c.drawPicture(S.reducedBoard);
    }
    if (w < T.boardFade) {
      S.boardVeil.setAlphaf(1 - Math.max(0, w) / T.boardFade);
      c.drawRect(S.bounds, S.boardVeil);
    }
  } else {
    drawBoard(c, S, w, exitKind, exitAtW, false, pt);
  }

  drawLogo(c, S, w, exitKind, exitAtW, logoExitAtW, reduced, pt);
}

/**
 * Record one frame. Never throws, never returns null: a draw failure leaves
 * a valid (partial) picture rather than crashing the UI thread. Only the
 * RECORDER is disposed — never the returned picture (the Canvas owns it).
 */
export function recordFrame(
  S: Scene,
  w: number,
  exitKind: number,
  exitAtW: number,
  logoExitAtW: number,
  reduced: boolean,
): SkPicture {
  'worklet';
  const rec = S.api.PictureRecorder();
  const c = rec.beginRecording(S.bounds);
  try {
    drawFrame(c, S, w, exitKind, exitAtW, logoExitAtW, reduced);
  } catch {
    // Swallowed on purpose: the picture stays valid.
  }
  const pic = rec.finishRecordingAsPicture();
  rec.dispose();
  return pic;
}
