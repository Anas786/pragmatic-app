/**
 * Pure SLD viewport geometry: the Grouped/Units pill's footprint, the
 * initial fit (fill the WIDTH, scroll-pan the rest) and the inline panel's
 * content-driven height.
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
 * diagram's centre away from the viewport's centre. A scale change alone
 * therefore pivots on the FRAME centre; zooming keeps the content under the
 * viewport centre fixed by scaling the translation with it
 * ({@link sldZoomTo}), and every resting translation is clamped to the fit
 * area ({@link sldClampTranslate}) so the diagram can't be zoomed or panned
 * out of view.
 *
 * Both hosts are portrait and unrotated (the phone layout is a tall,
 * 2-column diagram — see src/utils/sldPhoneLayout.ts), so safe-area insets
 * are used as the device reports them.
 */

/** Edge insets in points. */
export interface SldInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const SLD_NO_INSETS: SldInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Largest initial scale: a graph unit never opens larger than a point. The
 * phone layout is ~360 units wide and sized for ≈ 1, so wide phones and
 * tablets show it at its designed size (centred) instead of blowing it up.
 */
export const SLD_MAX_FIT_SCALE = 1;

/** Border of the inline viewport frame, points (fullscreen has none). */
export const SLD_VIEWPORT_BORDER = 1;

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
  /** Safe-area insets in the viewport's frame. */
  insets?: SldInsets;
  /** Persistent overlay the fitted diagram must not sit under. */
  overlay?: SldOverlayBox;
  /** Initial-scale cap (default {@link SLD_MAX_FIT_SCALE}). */
  maxScale?: number;
  /**
   * Content y (FRAME coordinates, bounds origin) to centre when the diagram
   * is taller than the view — the hub. Defaults to the frame's centre.
   */
  focusY?: number;
}

/** Strip given up so the diagram clears the overlay. */
export type SldFitReserve = 'none' | 'top';

export interface SldFit {
  /** Initial scale: the diagram's width fills the safe area (≤ maxScale). */
  scale: number;
  translateX: number;
  translateY: number;
  /**
   * Scale that shows the WHOLE diagram in the same area (≤ `scale`): the
   * zoom-out floor, so a diagram taller than the view can be pinched out to
   * an overview.
   */
  overviewScale: number;
  reserve: SldFitReserve;
  /**
   * The area the diagram was fitted into, as insets from the view's edges:
   * the safe area plus the overlay's top strip when `reserve` is `'top'`.
   * Zoom / pan clamp to the same area ({@link sldClampTranslate}).
   */
  insets: SldInsets;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Clamp a translation on ONE axis (see the transform model above) so the
 * diagram box — `content × scale` — stays inside the area between the
 * insets when it fits there, and covers that area (no empty band at either
 * edge) when it is larger. Pass the x-axis values for `translateX`
 * (view width, content width, left / right insets) and the y-axis ones for
 * `translateY`.
 *
 * `'worklet'`: the gesture handlers call it on the UI thread when a pan or
 * pinch ends; the JS-thread callers (fit, zoom buttons) call it normally.
 */
export const sldClampTranslate = (
  translate: number,
  scale: number,
  view: number,
  content: number,
  insetStart: number,
  insetEnd: number,
): number => {
  'worklet';
  const box = content * scale;
  // The box's far edge on the area's far edge … its near edge on the near
  // edge; which bound is the lower one depends on whether the box fits.
  const toEnd = view / 2 - insetEnd - box / 2;
  const toStart = insetStart - view / 2 + box / 2;
  return Math.min(Math.max(translate, Math.min(toEnd, toStart)), Math.max(toEnd, toStart));
};

/** Zoom factor of one +/- button press. */
export const SLD_ZOOM_STEP = 1.25;

/**
 * Zoom range for a fit: down to 0.9 × the whole-diagram overview (so a
 * diagram taller than the view can be pinched out to see all of it), up to
 * 3 × the fit (at least 2 units per point).
 */
export const sldZoomLimits = (fit: SldFit): { min: number; max: number } => ({
  min: fit.overviewScale * 0.9,
  max: Math.max(fit.scale * 3, 2),
});

/** What {@link sldZoomTo} needs to know about the viewport. */
export interface SldViewGeometry {
  viewWidth: number;
  viewHeight: number;
  contentWidth: number;
  contentHeight: number;
  /** The fit area (`SldFit.insets`). */
  insets: SldInsets;
}

export interface SldViewTransform {
  scale: number;
  translateX: number;
  translateY: number;
}

/**
 * The transform after zooming `from` to `scale` about the VIEWPORT centre:
 * the translation scales with the zoom (so the content point under the
 * centre stays put), then is clamped to the fit area — zooming out to the
 * overview always ends with the whole diagram in view, wherever the hub
 * focus had panned it. A transform that is already in the area never needs
 * the clamp when zooming IN.
 */
export const sldZoomTo = (
  geo: SldViewGeometry,
  from: SldViewTransform,
  scale: number,
): SldViewTransform => {
  const ratio = scale / from.scale;
  return {
    scale,
    translateX: sldClampTranslate(
      from.translateX * ratio,
      scale,
      geo.viewWidth,
      geo.contentWidth,
      geo.insets.left,
      geo.insets.right,
    ),
    translateY: sldClampTranslate(
      from.translateY * ratio,
      scale,
      geo.viewHeight,
      geo.contentHeight,
      geo.insets.top,
      geo.insets.bottom,
    ),
  };
};

/**
 * Fill the inset rect's WIDTH (capped at `maxScale`), centred horizontally.
 * Vertically: a diagram that fits is centred; a taller one centres
 * `focusY` (the hub), clamped so the diagram still covers the whole inset
 * rect — no empty band above its top or below its bottom.
 */
const fitInto = (input: SldFitInput, ins: SldInsets, reserve: SldFitReserve): SldFit => {
  const { viewWidth: W, viewHeight: H } = input;
  const cw = Math.max(1, input.contentWidth);
  const ch = Math.max(1, input.contentHeight);
  const availW = Math.max(1, W - ins.left - ins.right);
  const availH = Math.max(1, H - ins.top - ins.bottom);
  const scale = Math.min(input.maxScale ?? SLD_MAX_FIT_SCALE, availW / cw);
  // Centre of the inset rect, relative to the viewport centre.
  const centreY = (ins.top - ins.bottom) / 2;
  const boxH = ch * scale;
  let translateY = centreY;
  if (boxH > availH) {
    const focusY = input.focusY ?? ch / 2;
    translateY = sldClampTranslate(
      centreY - scale * (focusY - ch / 2),
      scale,
      H,
      ch,
      ins.top,
      ins.bottom,
    );
  }
  return {
    scale,
    translateX: (ins.left - ins.right) / 2,
    translateY,
    overviewScale: Math.min(scale, availH / ch),
    reserve,
    insets: ins,
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

/** Height of the strip a top reservation gives up for `overlay`. */
export const sldOverlayStrip = (overlay: SldOverlayBox): number =>
  overlay.edge + overlay.height + overlay.gap;

/**
 * Initial fit: the diagram's width fills the safe area (see `fitInto`).
 * With an `overlay` (the persistent Grouped/Units pill, top-right), the
 * diagram must also clear it: when the plain fit's box would reach under the
 * overlay (+ `gap`), it is re-fitted with a top strip reserved (down to the
 * overlay's bottom + gap). The scale is set by the width, so the strip costs
 * no zoom — the diagram only moves down (the inline panel grows by the strip,
 * see {@link sldPanelHeight}); a side strip could only shrink it, so it is
 * never used. A diagram with spare room keeps its plain fit unchanged.
 *
 * Conservative by construction: the test uses the full graph BOUNDS, which
 * contain every card (`resolveNodeRects` clamps cards inside them), so a fit
 * that clears the bounds clears every card. A diagram taller than the view
 * always reaches under the overlay somewhere; the top strip then keeps its
 * TOP row clear whenever the view is panned to the top (the clamp above).
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
  return fitInto(input, { ...ins, top: ins.top + sldOverlayStrip(ov) }, 'top');
};

export interface SldPanelHeightInput {
  /** The panel's content-box width (inside its border). */
  viewWidth: number;
  contentWidth: number;
  contentHeight: number;
  /** Overlay the fit will reserve a top strip for (the mode pill). */
  overlay?: SldOverlayBox;
  minHeight: number;
  maxHeight: number;
  maxScale?: number;
}

/**
 * Content-box height of an inline panel that shows the WHOLE diagram at the
 * width-filling scale ({@link computeSldFit}), plus the pill's top strip,
 * clamped to `[minHeight, maxHeight]` (`minHeight` wins if they cross).
 * Past `maxHeight` the panel opens on the hub and the rest is panned.
 */
export const sldPanelHeight = ({
  viewWidth,
  contentWidth,
  contentHeight,
  overlay,
  minHeight,
  maxHeight,
  maxScale = SLD_MAX_FIT_SCALE,
}: SldPanelHeightInput): number => {
  const scale = Math.min(maxScale, Math.max(1, viewWidth) / Math.max(1, contentWidth));
  const needed = Math.ceil(contentHeight * scale + (overlay ? sldOverlayStrip(overlay) : 0));
  return Math.max(minHeight, Math.min(maxHeight, needed));
};
