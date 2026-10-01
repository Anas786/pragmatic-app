/**
 * Splash scene builder — runs ONCE on the JS thread, after the overlay's
 * first layout. It is the ONLY place the splash creates Skia objects
 * (paints, paths, shaders, filters, the reduced-motion static board).
 *
 * ⚠️ Rules:
 *  - NEVER call from a worklet (board generation is plain JS).
 *  - After `buildScene` returns, no JS code may touch these paints/paths
 *    again: they are shared BY REFERENCE with the UI runtime, where the
 *    per-frame recorder (draw.ts) mutates them (setAlphaf, rewind, …).
 *  - Nothing here may run during render before `onLayout`: the Skia Jest
 *    mock has no CanvasKit, and the test renderer never fires onLayout.
 */
import {
  FillType,
  FilterMode,
  MipmapMode,
  PaintStyle,
  Skia,
  StrokeCap,
  StrokeJoin,
  TileMode,
  type SkContourMeasure,
  type SkPaint,
  type SkPath,
  type SkPicture,
  type SkRect,
} from '@shopify/react-native-skia';
// Direct tokens import: the src/theme barrel pulls in src/hooks → networking.
import { splashPalette } from 'src/theme/tokens';
import { buildBoard, keepOutFor, logoBox } from './board';
import { drawBoard } from './draw';
import { GLYPHS, VB_H, VB_W } from 'src/components/common/PESLogo/glyphs';
import { EXIT, GLOW_SOFT_SIGMA, GLOW_WIDE_SIGMA, WEB_TL } from './timeline';

export type SkiaApi = typeof Skia;

/** Flattened, worklet-friendly trace (numbers + arrays only). */
export interface SceneTrace {
  xs: number[];
  ys: number[];
  seg: number[];
  len: number;
  viaX: number[];
  viaY: number[];
  viaAt: number[];
  padRect: SkRect | null;
  fine: boolean;
  start: number;
  r0: number;
  packet: boolean;
  period: number;
  phase: number;
  /** Packet travel time (web-ms): min(1500, len / .7). */
  travel: number;
}

export interface SceneGlyph {
  /** Index in the web glyph order — drives stagger timing. */
  i: number;
  bar: boolean;
  path: SkPath;
  contour: SkContourMeasure;
  len: number;
  fill: SkPaint;
}

export interface Scene {
  api: SkiaApi;
  width: number;
  height: number;
  bounds: SkRect;
  /** Board geometry. */
  tr: SceneTrace[];
  full: SkPath[];
  litPath: Array<SkPath | null>;
  litLen: number[];
  scratch: SkPath;
  maxR: number;
  rx: number;
  /** Board paints. */
  idleStroke: SkPaint;
  litStroke: SkPaint;
  litFill: SkPaint;
  coreFill: SkPaint;
  substrateFill: SkPaint;
  ringIdle: SkPaint;
  ringLit: SkPaint;
  boardVeil: SkPaint;
  /** Dot grid: 0 = tile-shader rect, 1 = one-path fallback. */
  gridMode: 0 | 1;
  /** Web `--sit-grid` alpha (0x12 / 255). */
  gridAlpha: number;
  gridPaint: SkPaint;
  gridPath: SkPath | null;
  /** Logo. */
  glyph: SceneGlyph[];
  strokeBrand: SkPaint;
  strokeBar: SkPaint;
  /**
   * Fill-glow layers with FIXED blur radii (built once), faded by paint
   * alpha only — see drawLogo. Never create/alter blur filters per frame:
   * each new sigma needs a new GPU blur kernel, which stalled the UI thread
   * ~300 ms at ignition on every launch (measured on the iOS simulator).
   */
  glowSoftPaint: SkPaint;
  glowWidePaint: SkPaint;
  strokeLayerPaint: SkPaint;
  logoAlphaPaint: SkPaint;
  /** Logo placement: viewBox → screen is translate(logoX, logoY)·scale(s). */
  cx: number;
  cy: number;
  logoX: number;
  logoY: number;
  s: number;
  /** saveLayer bounds in viewBox units (3σ max glow + stroke). */
  vbPad: SkRect;
  /** Reduced motion only: the complete, fully-lit board, recorded once. */
  reducedBoard: SkPicture | null;
}

const stroke = (api: SkiaApi, color: string, roundCap: boolean): SkPaint => {
  const p = api.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Stroke);
  p.setColor(api.Color(color));
  if (roundCap) {
    p.setStrokeCap(StrokeCap.Round);
  }
  p.setStrokeJoin(StrokeJoin.Round);
  return p;
};

const fill = (api: SkiaApi, color: string): SkPaint => {
  const p = api.Paint();
  p.setAntiAlias(true);
  p.setStyle(PaintStyle.Fill);
  p.setColor(api.Color(color));
  return p;
};

/** Polyline range [0, to] — same geometry as the web `ap` / draw.strokeRange. */
function rangePath(api: SkiaApi, t: SceneTrace, to: number): SkPath {
  const p = api.Path.Make();
  p.moveTo(t.xs[0], t.ys[0]);
  for (let n = 1; n < t.xs.length; n++) {
    if (t.seg[n] <= 0) {
      continue;
    }
    if (t.seg[n] >= to) {
      break;
    }
    p.lineTo(t.xs[n], t.ys[n]);
  }
  // pointAt(to)
  let n = 1;
  while (n < t.seg.length && t.seg[n] < to) {
    n++;
  }
  if (n >= t.seg.length) {
    p.lineTo(t.xs[t.xs.length - 1], t.ys[t.ys.length - 1]);
  } else {
    const L = t.seg[n] - t.seg[n - 1];
    const f = L ? (to - t.seg[n - 1]) / L : 0;
    p.lineTo(
      t.xs[n - 1] + (t.xs[n] - t.xs[n - 1]) * f,
      t.ys[n - 1] + (t.ys[n] - t.ys[n - 1]) * f,
    );
  }
  return p;
}

const hexToUnit = (hex: string, offset: number): number =>
  parseInt(hex.slice(offset, offset + 2), 16) / 255;

export function buildScene(
  W: number,
  H: number,
  pr: number,
  reduced: boolean,
  api: SkiaApi = Skia,
): Scene {
  const keepOut = keepOutFor(W, H);
  const board = buildBoard({ width: W, height: H, keepOut, seed: 7, tl: WEB_TL });

  /* ── traces ── */
  const tr: SceneTrace[] = board.traces.map(t => {
    const pad = t.pad;
    return {
      xs: t.pts.map(p => p.x),
      ys: t.pts.map(p => p.y),
      seg: t.seg.slice(),
      len: t.len,
      viaX: t.vias.map(v => v.x),
      viaY: t.vias.map(v => v.y),
      viaAt: t.vias.map(v => v.at),
      padRect: pad ? api.XYWHRect(pad.x - 3.4, pad.y - 3.4, 6.8, 6.8) : null,
      fine: t.kind === 'fine',
      start: t.start,
      r0: t.r0,
      packet: t.hasPacket,
      period: t.period,
      phase: t.phase,
      travel: Math.min(1500, t.len / 0.7),
    };
  });
  const full = tr.map(t => rangePath(api, t, t.len));
  const litLen = tr.map(t => Math.min(t.len, Math.max(0, board.maxR - t.r0)));
  const litPath = tr.map((t, i) =>
    litLen[i] > 0 ? rangePath(api, t, litLen[i]) : null,
  );

  /* ── paints ── */
  const idleStroke = stroke(api, splashPalette.idle, true);
  const litStroke = stroke(api, splashPalette.lit, true);
  const ringIdle = stroke(api, splashPalette.idle, false);
  const ringLit = stroke(api, splashPalette.lit, false);
  const litFill = fill(api, splashPalette.lit);
  const coreFill = fill(api, splashPalette.core);
  const substrateFill = fill(api, splashPalette.substrate);
  const boardVeil = fill(api, splashPalette.bg);

  /* ── dot grid: 22 dp pitch, dots at 22k (web: 1px radial dot, offset 11) ── */
  const gridPaint = api.Paint();
  gridPaint.setAntiAlias(true);
  let gridMode: 0 | 1 = 0;
  let gridPath: SkPath | null = null;
  const T = Math.max(1, Math.round(22 * pr));
  const surf = api.Surface.Make(T, T);
  if (surf) {
    const sc = surf.getCanvas();
    sc.drawCircle(T / 2, T / 2, 1.2 * pr, fill(api, splashPalette.grid));
    surf.flush();
    const img = surf.makeImageSnapshot();
    // Matrix ops pre-concat: M = T(-11,-11)·S(22/T) → tile centre lands on 22k dp.
    const local = api.Matrix().translate(-11, -11).scale(22 / T, 22 / T);
    gridPaint.setShader(
      img.makeShaderOptions(
        TileMode.Repeat,
        TileMode.Repeat,
        FilterMode.Linear,
        MipmapMode.None,
        local,
      ),
    );
  } else {
    gridMode = 1;
    gridPaint.setColor(api.Color(splashPalette.grid));
    gridPath = api.Path.Make();
    for (let x = 0; x <= W + 22; x += 22) {
      for (let y = 0; y <= H + 22; y += 22) {
        gridPath.addCircle(x, y, 1.2);
      }
    }
  }

  /* ── logo ── */
  const barFrom = api.Color(splashPalette.barFrom);
  const barTo = api.Color(splashPalette.barTo);
  const glyph: SceneGlyph[] = [];
  GLYPHS.forEach((g, i) => {
    const path = api.Path.MakeFromSVGString(g.d);
    if (!path) {
      if (__DEV__) {
        console.warn(`[splash] glyph "${g.id}" failed to parse — skipped`);
      }
      return;
    }
    path.setFillType(FillType.EvenOdd);
    const contour = api.ContourMeasureIter(path, false, 1).next();
    if (!contour) {
      return;
    }
    const bar = g.kind === 'bar';
    let gp: SkPaint;
    if (bar) {
      // SVG objectBoundingBox gradients are per path: x over THIS glyph's bounds.
      const b = path.computeTightBounds();
      gp = api.Paint();
      gp.setAntiAlias(true);
      gp.setShader(
        api.Shader.MakeLinearGradient(
          api.Point(b.x, 0),
          api.Point(b.x + b.width, 0),
          [barFrom, barTo],
          null,
          TileMode.Clamp,
        ),
      );
    } else {
      gp = fill(api, splashPalette.ink);
    }
    glyph.push({ i, bar, path, contour, len: contour.length(), fill: gp });
  });

  const strokeBrand = stroke(api, splashPalette.lit, true);
  strokeBrand.setStrokeWidth(7);
  const strokeBar = stroke(api, splashPalette.barTo, true);
  strokeBar.setStrokeWidth(7);

  const litR = hexToUnit(splashPalette.lit, 1);
  const litG = hexToUnit(splashPalette.lit, 3);
  const litB = hexToUnit(splashPalette.lit, 5);

  // Fill glow (web: drop-shadow radius animated 14→22→26px, i.e. σ 7→11→13
  // viewBox units). Two fixed-σ shadow-only layers approximate any σ in
  // [0, 13] by alpha alone: σ ≤ 7 → soft layer; 7 < σ ≤ 13 → soft/wide
  // crossfade. Colour alpha is 1 here — the layer paint's alpha carries α.
  const glowSoftPaint = api.Paint();
  glowSoftPaint.setImageFilter(
    api.ImageFilter.MakeDropShadowOnly(
      0,
      0,
      GLOW_SOFT_SIGMA,
      GLOW_SOFT_SIGMA,
      Float32Array.of(litR, litG, litB, 1),
      null,
    ),
  );
  const glowWidePaint = api.Paint();
  glowWidePaint.setImageFilter(
    api.ImageFilter.MakeDropShadowOnly(
      0,
      0,
      GLOW_WIDE_SIGMA,
      GLOW_WIDE_SIGMA,
      Float32Array.of(litR, litG, litB, 1),
      null,
    ),
  );
  // CSS: drop-shadow(0 0 2px glow) drop-shadow(0 0 10px glow-soft). The
  // second filter's input is the first one's output. Blur radius = 2σ, in
  // viewBox units (the filter is on an SVG <g> inside the scaled viewBox).
  const strokeLayerPaint = api.Paint();
  strokeLayerPaint.setImageFilter(
    api.ImageFilter.MakeDropShadow(
      0,
      0,
      5,
      5,
      Float32Array.of(litR, litG, litB, 0.32),
      api.ImageFilter.MakeDropShadow(
        0,
        0,
        1,
        1,
        Float32Array.of(litR, litG, litB, 0.55),
        null,
      ),
    ),
  );
  const logoAlphaPaint = api.Paint();

  const { lw } = logoBox(W);
  const s = lw / VB_W;

  const scene: Scene = {
    api,
    width: W,
    height: H,
    bounds: api.XYWHRect(0, 0, W, H),
    tr,
    full,
    litPath,
    litLen,
    scratch: api.Path.Make(),
    maxR: board.maxR,
    rx: keepOut.rx,
    idleStroke,
    litStroke,
    litFill,
    coreFill,
    substrateFill,
    ringIdle,
    ringLit,
    boardVeil,
    gridMode,
    gridAlpha: splashPalette.gridAlpha,
    gridPaint,
    gridPath,
    glyph,
    strokeBrand,
    strokeBar,
    glowSoftPaint,
    glowWidePaint,
    strokeLayerPaint,
    logoAlphaPaint,
    cx: W / 2,
    cy: H / 2,
    logoX: (W - lw) / 2,
    logoY: (H - (lw * VB_H) / VB_W) / 2,
    s,
    vbPad: api.XYWHRect(-40, -40, VB_W + 80, VB_H + 80),
    reducedBoard: null,
  };

  if (reduced) {
    // Record the complete, fully-lit board once — on JS, BEFORE the scene is
    // shared with the UI runtime.
    const rec = api.PictureRecorder();
    const c = rec.beginRecording(scene.bounds);
    drawBoard(c, scene, 1e9, EXIT.NONE, -1, true, [0, 0]);
    scene.reducedBoard = rec.finishRecordingAsPicture();
    rec.dispose();
  }

  return scene;
}
