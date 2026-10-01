/**
 * Pure SLD viewport geometry: safe-area insets through the full-screen
 * rotation, the Grouped/Units pill's footprint, and the initial "fit the
 * whole diagram" transform.
 *
 * No React / React Native imports — unit-tested in
 * `__tests__/sldViewportFit.test.ts`.
 *
 * Transform model (shared by both diagram layers, see SLDViewport +
 * DiagramSkiaLayer): the bounds-sized diagram frame is centred in the
 * viewport and drawn with RN's centre-origin `[translateX, translateY,
 * scale]`, so a diagram point `p` lands at
 *
 *     viewportCentre + (translateX, translateY) + scale · (p − frameCentre)
 *
 * i.e. the translation is in VIEWPORT points (not scaled) and moves the
 * diagram's centre away from the viewport's centre.
 */

/** Edge insets in points, in the frame they're expressed in. */
export interface SldInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const SLD_NO_INSETS: SldInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Rotation applied to the full-screen SLD container (RN `rotate`, degrees).
 * The OS orientation never changes (that crashes Fabric — see
 * SLDFullscreenScreen); a portrait container is turned by this angle to read
 * as landscape. `SLDFullscreenScreen` builds its transform from this constant
 * and maps the safe-area insets with {@link rotateInsets}, so the two can't
 * drift apart. NOTE: `SLDViewport`'s `rotated` pan remap
 * (`tx += dy; ty -= dx`) is the inverse of a +90° turn — change it too if
 * this ever changes.
 */
export const SLD_FULLSCREEN_ROTATION_DEG = 90;

/** Clockwise edge order — the order a clockwise quarter-turn walks through. */
const EDGES_CW: ReadonlyArray<keyof SldInsets> = ['top', 'right', 'bottom', 'left'];

/**
 * Device (portrait) safe-area insets → the insets of content drawn inside a
 * full-screen container rotated by `rotationDeg` (quarter turns only; other
 * angles round to the nearest quarter turn).
 *
 * Derivation: RN's `rotate: θ` is CLOCKWISE on screen (y grows downward):
 * a content direction `d` is drawn along `R(θ)·d`, R = [[cos −sin] [sin cos]].
 * For θ = +90°, R = [[0 −1] [1 0]]:
 *   content right (+x) → screen (0, +1)  = device BOTTOM
 *   content down  (+y) → screen (−1, 0)  = device LEFT
 *   content left  (−x) → screen (0, −1)  = device TOP
 *   content up    (−y) → screen (+1, 0)  = device RIGHT
 * so the content's left edge lies along the device's top edge (the notch /
 * Dynamic Island), its top along the device's right, its right along the
 * device's bottom (home indicator / Android nav bar) and its bottom along
 * the device's left. Generally, each clockwise quarter turn moves content
 * edge i (in top→right→bottom→left order) onto device edge i + 1:
 *   content[EDGES_CW[i]] = device[EDGES_CW[(i + q) mod 4]].
 */
export const rotateInsets = (device: SldInsets, rotationDeg: number): SldInsets => {
  const q = (((Math.round(rotationDeg / 90) % 4) + 4) % 4);
  const out = { ...SLD_NO_INSETS };
  EDGES_CW.forEach((edge, i) => {
    out[edge] = device[EDGES_CW[(i + q) % 4]];
  });
  return out;
};

/** A fixed-size overlay anchored to the TOP-RIGHT corner of the safe area. */
export interface SldOverlayBox {
  width: number;
  height: number;
  /** Distance from the safe area's top and right edges. */
  edge: number;
  /** Clearance kept between the overlay and the fitted diagram. */
  gap: number;
}

/** Minimum touch target (Apple HIG / WCAG 2.5.5), in points. */
export const SLD_MIN_TOUCH_TARGET = 44;

/** Layout of the Grouped ⇄ Units segmented pill (`SldModeToggle`), in points. */
export interface SldModeToggleMetrics {
  /** Each segment's own layout box (the `PressableScale`). */
  segmentWidth: number;
  segmentHeight: number;
  /** Pill container padding, gap between segments and border width. */
  padding: number;
  gap: number;
  border: number;
  /**
   * Vertical hit slop per segment: EXACTLY the container's padding + border,
   * so a segment's touch area runs to the pill's outer edge and never past it.
   */
  slop: number;
  /** Outer layout size of the pill container — its fit-math footprint. */
  width: number;
  height: number;
}

/**
 * Pill geometry, single source of truth for both `SldModeToggle`'s styles
 * and its fit-math footprint (`SLD_MODE_TOGGLE_BOX`). `normalize` maps
 * 393pt-reference sizes to the device (`normalizeWidth`).
 *
 * Why the CONTAINER is ≥ {@link SLD_MIN_TOUCH_TARGET} tall: on Fabric a
 * touch outside a parent's layout box never reaches its children — iOS
 * `RCTViewComponentView` hit-testing returns nil outside the bounds of a view
 * with no layout overflow, and Android `TouchTargetHelper` does the same via
 * the overflow inset. `hitSlop` is not layout, so slop reaching past the
 * pill container is dead. The segments are therefore sized so the container
 * itself is ≥ 44pt, and their vertical slop only fills the container's own
 * padding + border: the effective target is the full container height
 * (≥ 44pt) on every phone width. Each segment is ≥ 44pt wide on its own.
 */
export const sldModeToggleMetrics = (
  normalize: (size: number) => number,
  segmentCount: number,
): SldModeToggleMetrics => {
  const padding = normalize(3);
  const gap = normalize(2);
  const border = 1;
  const chrome = padding + border;
  // ceil: Yoga snaps edges to the pixel grid, so keep a sub-point margin.
  const segmentHeight = Math.max(
    normalize(30),
    Math.ceil(SLD_MIN_TOUCH_TARGET - 2 * chrome),
  );
  // FIXED, equal widths so the footprint is known before layout. "Grouped"
  // in Poppins-Bold at 11pt measures ≈49pt; AppText disables OS font scaling
  // and the labels shrink-to-fit as a last resort.
  const segmentWidth = Math.max(SLD_MIN_TOUCH_TARGET, normalize(68));
  return {
    segmentWidth,
    segmentHeight,
    padding,
    gap,
    border,
    slop: chrome,
    width: segmentCount * segmentWidth + (segmentCount - 1) * gap + 2 * chrome,
    height: segmentHeight + 2 * chrome,
  };
};

export interface SldFitInput {
  viewWidth: number;
  viewHeight: number;
  /** Diagram (graph bounds) size, in graph units. */
  contentWidth: number;
  contentHeight: number;
  /** Safe-area insets in the VIEWPORT's frame (already rotated). */
  insets?: SldInsets;
  /** Persistent overlay the fitted diagram must not sit under. */
  overlay?: SldOverlayBox;
}

/** Strip given up so the diagram clears the overlay. */
export type SldFitReserve = 'none' | 'top' | 'right';

export interface SldFit {
  scale: number;
  translateX: number;
  translateY: number;
  reserve: SldFitReserve;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Whole diagram, as large as possible, centred in the inset rect. */
const fitInto = (
  { viewWidth: W, viewHeight: H, contentWidth, contentHeight }: SldFitInput,
  ins: SldInsets,
  reserve: SldFitReserve,
): SldFit => {
  const availW = Math.max(1, W - ins.left - ins.right);
  const availH = Math.max(1, H - ins.top - ins.bottom);
  return {
    scale: Math.min(availW / Math.max(1, contentWidth), availH / Math.max(1, contentHeight)),
    // Centre of the inset rect, relative to the viewport centre.
    translateX: (ins.left - ins.right) / 2,
    translateY: (ins.top - ins.bottom) / 2,
    reserve,
  };
};

/** The fitted diagram's on-screen box (bounds incl. their empty padding). */
const diagramBox = (input: SldFitInput, fit: SldFit): Rect => {
  const w = input.contentWidth * fit.scale;
  const h = input.contentHeight * fit.scale;
  return {
    x: input.viewWidth / 2 + fit.translateX - w / 2,
    y: input.viewHeight / 2 + fit.translateY - h / 2,
    w,
    h,
  };
};

/** Positive-area overlap (touching edges don't count). */
const overlaps = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Initial fit: the whole diagram, centred in the safe area. With an
 * `overlay` (the persistent Grouped/Units pill, top-right), the diagram must
 * also clear it: when the plain fit's box would reach under the overlay (+
 * `gap`), the diagram is re-fitted with EITHER a top strip (down to the
 * overlay's bottom + gap) OR a right strip (left of it − gap) reserved,
 * whichever keeps the larger scale (ties → top). A diagram with spare room
 * — the common inline case — keeps its plain fit unchanged.
 *
 * Conservative by construction: the test uses the full graph BOUNDS, which
 * contain every card (`resolveNodeRects` clamps cards inside them), so a fit
 * that clears the bounds clears every card.
 */
export const computeSldFit = (input: SldFitInput): SldFit => {
  const ins = input.insets ?? SLD_NO_INSETS;
  const plain = fitInto(input, ins, 'none');
  const ov = input.overlay;
  if (!ov) return plain;

  const zone: Rect = {
    x: input.viewWidth - ins.right - ov.edge - ov.width - ov.gap,
    y: ins.top + ov.edge - ov.gap,
    w: ov.width + ov.gap * 2,
    h: ov.height + ov.gap * 2,
  };
  if (!overlaps(diagramBox(input, plain), zone)) return plain;

  const top = fitInto(input, { ...ins, top: ins.top + ov.edge + ov.height + ov.gap }, 'top');
  const right = fitInto(
    input,
    { ...ins, right: ins.right + ov.edge + ov.width + ov.gap },
    'right',
  );
  return top.scale >= right.scale ? top : right;
};
