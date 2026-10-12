/**
 * Pure SLD viewport geometry: the top pills' footprint (2D full screen:
 * Diagram | 3D top-left, Grouped / Units top-right), the initial fit (fill
 * the WIDTH, scroll-pan the rest; the band masked under the pills), the
 * inline panel's content-driven height, the inline header row (both
 * switches above the panel, wrapping on narrow phones), the controls
 * column, and the 3D twin's panel / sideways full-screen geometry (the
 * rail with its Group | Units pill).
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
 * The 2D diagram's hosts are portrait and unrotated (the phone layout is a
 * tall, 2-column diagram — see src/utils/sldPhoneLayout.ts), so safe-area
 * insets are used as the device reports them. The 3D view is the web's own
 * twin in a WebView (`SldTwin/`): inline a tall panel
 * ({@link sldTwinInlineHeight}); full screen it is turned sideways by a +90°
 * TRANSFORM of its container (never an OS rotation) —
 * {@link sldLandscapeContainer}, {@link sldLandscapeGeometry}.
 */

/** An axis-aligned rectangle (top-left + size). */
export interface SldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

/**
 * A fixed-size overlay anchored to a TOP corner of the safe area — the
 * top-right one for {@link SldFitInput.overlay}, the top-left one for
 * {@link SldFitInput.overlayLeft}.
 */
export interface SldOverlayBox {
  width: number;
  height: number;
  /** Distance from the safe area's top edge and its (left / right) side. */
  edge: number;
  /** Clearance kept between the overlay and the fitted diagram. */
  gap: number;
}

/** Minimum touch target (Apple HIG / WCAG 2.5.5), in points. */
export const SLD_MIN_TOUCH_TARGET = 44;

/** Layout of a segmented pill (`SldModeToggle`, `SldViewToggle`), in points. */
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
 * 393pt-reference sizes to the device (`normalizeWidth`); `minTarget` is
 * the container's minimum height (default {@link SLD_MIN_TOUCH_TARGET} —
 * the inline header's switches pass `touch.min`, 48 on Android);
 * `minSegmentWidth` widens every segment to at least that (the header's
 * pills: their widest label at the rendered size + padding, so a label is
 * never shrunk or cut — {@link sldHeaderPillMetrics}).
 *
 * Why the CONTAINER is ≥ `minTarget` tall: on Fabric a
 * touch outside a parent's layout box never reaches its children — iOS
 * `RCTViewComponentView` hit-testing returns nil outside the bounds of a view
 * with no layout overflow, and Android `TouchTargetHelper` does the same via
 * the overflow inset. `hitSlop` is not layout, so slop reaching past the
 * pill container is dead. The segments are therefore sized so the container
 * itself is ≥ `minTarget`, and their vertical slop only fills the
 * container's own padding + border: the effective target is the full
 * container height on every phone width. Each segment is ≥ `minTarget`
 * wide on its own.
 */
export const sldModeToggleMetrics = (
  normalize: (size: number) => number,
  segmentCount: number,
  minTarget: number = SLD_MIN_TOUCH_TARGET,
  minSegmentWidth = 0,
): SldModeToggleMetrics => {
  const padding = normalize(3);
  const gap = normalize(2);
  const border = 1;
  const chrome = padding + border;
  // ceil: Yoga snaps edges to the pixel grid, so keep a sub-point margin.
  const segmentHeight = Math.max(normalize(30), Math.ceil(minTarget - 2 * chrome));
  // FIXED, equal widths so the footprint is known before layout. "Grouped"
  // and "Diagram" in Poppins-Bold at 11pt measure ≈49pt; the over-diagram
  // pills shrink their labels to fit as a last resort, the header's are
  // sized to their labels instead (`minSegmentWidth`).
  const segmentWidth = Math.max(
    minTarget,
    normalize(68),
    Number.isFinite(minSegmentWidth) && minSegmentWidth > 0 ? Math.ceil(minSegmentWidth) : 0,
  );
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

/**
 * The floating controls column (`ControlButtons`, bottom-left): button,
 * gap, padding and border, in points. Every button is a real touch target
 * (≥ `touchMin`: 44 iOS / 48 Android — the Pause control is the WCAG 2.2.2
 * mechanism and must be easy to hit), never just its 36 pt look.
 */
export interface SldControlColumnMetrics {
  button: number;
  gap: number;
  padding: number;
  border: number;
}

export const sldControlColumnMetrics = (
  normalize: (size: number) => number,
  touchMin: number,
): SldControlColumnMetrics => ({
  button: Math.max(normalize(36), touchMin),
  gap: normalize(2),
  padding: normalize(6),
  border: 1,
});

/** How the controls are laid out: `columns` side by side, ≤ `rows` buttons each. */
export interface SldControlColumnLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
}

/**
 * Lays `count` buttons out in as FEW columns as fit `maxHeight` (one column
 * when it fits, else 2, …; one row as the last resort): the column must
 * never grow up under the top-left Diagram | 3D pill (2D full screen), which
 * is drawn over it and would take its taps, nor past the top of a short
 * panel (6 buttons on the 320 pt inline minimum wrap into two columns).
 */
export const sldControlColumnLayout = (
  count: number,
  m: SldControlColumnMetrics,
  maxHeight: number,
): SldControlColumnLayout => {
  const n = Math.max(1, Math.floor(count));
  const chrome = 2 * (m.padding + m.border);
  const span = (k: number) => chrome + k * m.button + (k - 1) * m.gap;
  let columns = 1;
  while (columns < n && span(Math.ceil(n / columns)) > maxHeight) columns += 1;
  const rows = Math.ceil(n / columns);
  return { columns, rows, width: span(columns), height: span(rows) };
};

/**
 * The tallest the controls may be: from their bottom anchor (`edge` above
 * the safe area's bottom) up to the top-left pill's keep-out (its box +
 * `gap`) when that pill shows, else to `edge` below the safe area's top.
 */
export const sldControlColumnMaxHeight = (input: {
  viewHeight: number;
  insets?: SldInsets;
  /** Bottom / left anchor of the column (`space.lg`). */
  edge: number;
  /** The top-left pill (Diagram | 3D), when shown. */
  pill?: SldOverlayBox;
}): number => {
  const { top = 0, bottom = 0 } = input.insets ?? SLD_NO_INSETS;
  const ceiling = input.pill
    ? top + input.pill.edge + input.pill.height + input.pill.gap
    : top + input.edge;
  return Math.max(0, input.viewHeight - bottom - input.edge - ceiling);
};

export interface SldFitInput {
  viewWidth: number;
  viewHeight: number;
  /** Diagram (graph bounds) size, in graph units. */
  contentWidth: number;
  contentHeight: number;
  /** Safe-area insets in the viewport's frame. */
  insets?: SldInsets;
  /** Persistent overlay (top-RIGHT: the Grouped / Units pill) the fitted diagram must not sit under. */
  overlay?: SldOverlayBox;
  /** Persistent overlay (top-LEFT: the Diagram | 3D pill) the fitted diagram must not sit under. */
  overlayLeft?: SldOverlayBox;
  /** Initial-scale cap (default {@link SLD_MAX_FIT_SCALE}). */
  maxScale?: number;
  /**
   * Content y (FRAME coordinates, bounds origin) to centre when the diagram
   * is taller than the view — the hub. Defaults to the frame's centre.
   */
  focusY?: number;
  /**
   * Card footprints in FRAME coordinates (bounds origin) — the rects the
   * node layer draws (`resolveNodeRects`). With them, a diagram that runs
   * under the overlay's band opens with the band's edge between two card
   * rows, so no card is cut in half by it (see {@link computeSldFit}).
   */
  cards?: ReadonlyArray<SldRect>;
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
  /**
   * Height (view points, from the view's top edge) of the band the host
   * must paint OVER the diagram, under the overlay: `insets.top` when a top
   * strip is reserved, else 0. Whatever is panned or zoomed into the band —
   * and the rows of a diagram taller than the view that sit above the fit
   * area at open — is hidden by it, so the overlay never covers a card.
   */
  mask: number;
}

type Rect = SldRect;

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
    mask: reserve === 'top' ? ins.top : 0,
  };
};

/** Float slack for the mask-edge interval maths. */
const EDGE_EPS = 1e-6;

/**
 * A diagram taller than its fit area covers the area, so at the hub-centred
 * fit its rows above the area run up under the mask band — and the band's
 * edge would usually cut a card in half (the half under the pill used to be
 * the visible one). Nudge `translateY` by the smallest amount that puts the
 * edge into a gap between card rows (or above the diagram's top), staying
 * inside the clamp range and keeping the hub's row — the cards spanning
 * `focusY` — wholly inside the fit area; a tie moves the content down (the
 * straddling card shows whole). When no such translation exists (a hub
 * pinned to the area's bottom by the clamp, under a deep chain) the fit is
 * left as is: the band still hides everything under the pill.
 */
const settleMaskEdge = (input: SldFitInput, fit: SldFit): SldFit => {
  const cards = input.cards;
  if (fit.mask <= 0 || !cards || cards.length === 0) return fit;
  const H = input.viewHeight;
  const ch = Math.max(1, input.contentHeight);
  const s = fit.scale;
  const box = ch * s;
  // The clamp range of `sldClampTranslate` (either order — see there).
  const toEnd = H / 2 - fit.insets.bottom - box / 2;
  const toStart = fit.insets.top - H / 2 + box / 2;
  const lo = Math.min(toEnd, toStart);
  const hi = Math.max(toEnd, toStart);
  // A card straddles the edge (top above it, bottom below) for translations
  // strictly between these two values.
  const blocked = cards.map(c => {
    const enter = fit.mask - H / 2 - s * (c.y + c.h - ch / 2);
    const leave = fit.mask - H / 2 - s * (c.y - ch / 2);
    return [enter, leave] as const;
  });
  // The hub's row stays wholly inside the fit area (when it opens there).
  const areaTop = fit.insets.top;
  const areaBottom = H - fit.insets.bottom;
  const focusY = input.focusY;
  const screenTop = (t: number, y: number) => H / 2 + t + s * (y - ch / 2);
  const rowInView = (row: ReadonlyArray<SldRect>) => (t: number) =>
    row.every(
      c =>
        screenTop(t, c.y) >= areaTop - EDGE_EPS &&
        screenTop(t, c.y + c.h) <= areaBottom + EDGE_EPS,
    );
  const target = fit.translateY;
  const hubRow =
    focusY === undefined ? [] : cards.filter(c => c.y <= focusY && focusY <= c.y + c.h);
  const keepHub = rowInView(rowInView(hubRow)(target) ? hubRow : []);
  const free = (t: number) =>
    t >= lo - EDGE_EPS &&
    t <= hi + EDGE_EPS &&
    keepHub(t) &&
    blocked.every(([enter, leave]) => t <= enter + EDGE_EPS || t >= leave - EDGE_EPS);
  if (free(target)) return fit;
  let best: number | null = null;
  for (const t of [lo, hi, ...blocked.flat()]) {
    if (!free(t)) continue;
    const d = Math.abs(t - target);
    const bestD = best === null ? Infinity : Math.abs(best - target);
    if (d < bestD - EDGE_EPS || (Math.abs(d - bestD) <= EDGE_EPS && best !== null && t > best)) {
      best = t;
    }
  }
  return best === null ? fit : { ...fit, translateY: best };
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

/** The strip for every overlay present (the tallest), 0 without any. */
const topStrip = (right?: SldOverlayBox, left?: SldOverlayBox): number =>
  Math.max(right ? sldOverlayStrip(right) : 0, left ? sldOverlayStrip(left) : 0);

/** An overlay's keep-out zone (the box + its `gap` all round), view coords. */
const overlayZone = (
  input: SldFitInput,
  ins: SldInsets,
  ov: SldOverlayBox,
  side: 'left' | 'right',
): Rect => ({
  x:
    side === 'right'
      ? input.viewWidth - ins.right - ov.edge - ov.width - ov.gap
      : ins.left + ov.edge - ov.gap,
  y: ins.top + ov.edge - ov.gap,
  w: ov.width + ov.gap * 2,
  h: ov.height + ov.gap * 2,
});

/**
 * Initial fit: the diagram's width fills the safe area (see `fitInto`).
 * With overlays (the persistent top pills: `overlay` = Grouped/Units,
 * top-right; `overlayLeft` = Diagram | 3D, top-left), the diagram must also clear
 * them: when the plain fit's box would reach under EITHER (+ `gap`), it is
 * re-fitted with a top strip reserved (down to the tallest overlay's bottom
 * + gap). The scale is set by the width, so the strip costs no zoom — the
 * diagram only moves down (the inline panel grows by the strip, see
 * {@link sldPanelHeight}); a side strip could only shrink it, so it is
 * never used. A diagram with spare room keeps its plain fit unchanged.
 *
 * Conservative by construction: the test uses the full graph BOUNDS, which
 * contain every card (`resolveNodeRects` clamps cards inside them), so a fit
 * that clears the bounds clears every card.
 *
 * A reserved strip is a real band (`mask`): the host paints it over the
 * diagram, under the overlay. That is what keeps a diagram TALLER than the
 * view clear of the pill at open: centred on its hub it must cover the fit
 * area, so its upper rows run up past the area's top into the strip — no
 * translation can avoid that and keep the hub in view (the phone layout's
 * row gaps, 16–40 units, are narrower than the 44pt pill; the only clear
 * translation is the diagram's top under the strip, which pushes Lucky
 * Cement's Units hub off-screen), and the strip alone used to leave those
 * rows visible under the pill (SG-CI-PV-06's values, Units full screen).
 * With `cards`, the hub-centred translation is then nudged so the band's
 * edge falls between card rows ({@link settleMaskEdge}).
 */
export const computeSldFit = (input: SldFitInput): SldFit => {
  const ins = input.insets ?? SLD_NO_INSETS;
  const plain = fitInto(input, ins, 'none');
  const right = input.overlay;
  const left = input.overlayLeft;
  if (!right && !left) return plain;

  const zones: Rect[] = [];
  if (right) zones.push(overlayZone(input, ins, right, 'right'));
  if (left) zones.push(overlayZone(input, ins, left, 'left'));
  const box = diagramBox(input, plain);
  if (!zones.some(zone => overlaps(box, zone))) return plain;
  return settleMaskEdge(
    input,
    fitInto(input, { ...ins, top: ins.top + topStrip(right, left) }, 'top'),
  );
};

export interface SldPanelHeightInput {
  /** The panel's content-box width (inside its border). */
  viewWidth: number;
  contentWidth: number;
  contentHeight: number;
  /** Overlays the fit may reserve a top strip for (the top pills). */
  overlay?: SldOverlayBox;
  overlayLeft?: SldOverlayBox;
  minHeight: number;
  maxHeight: number;
  maxScale?: number;
}

/**
 * Content-box height of an inline panel that shows the WHOLE diagram at the
 * width-filling scale ({@link computeSldFit}), plus the pills' top strip,
 * clamped to `[minHeight, maxHeight]` (`minHeight` wins if they cross).
 * Past `maxHeight` the panel opens on the hub and the rest is panned.
 */
export const sldPanelHeight = ({
  viewWidth,
  contentWidth,
  contentHeight,
  overlay,
  overlayLeft,
  minHeight,
  maxHeight,
  maxScale = SLD_MAX_FIT_SCALE,
}: SldPanelHeightInput): number => {
  const scale = Math.min(maxScale, Math.max(1, viewWidth) / Math.max(1, contentWidth));
  const needed = Math.ceil(contentHeight * scale + topStrip(overlay, overlayLeft));
  return Math.max(minHeight, Math.min(maxHeight, needed));
};

/* ─────────── inline: the header row above the panel ─────────── */

/**
 * Horizontal room kept each side of a header segment's label (pt), on top
 * of the label's own estimated width.
 */
export const SLD_HEADER_LABEL_PAD = 4;

/**
 * A header pill (`SldViewHeader`: "Diagram | 3D", "Grouped | Units"): the
 * shared two-segment geometry with every segment ≥ `touchMin` (container
 * AND segment width) and wide enough for `labelWidth` — the widest label
 * measured at the size it RENDERS (the width-scaled size × the OS text
 * scale, capped like AppText) + {@link SLD_HEADER_LABEL_PAD} each side. A
 * label never shrinks (no `adjustsFontSizeToFit`) and is never cut: larger
 * text widens the pill, and the row wraps instead
 * ({@link sldViewHeaderLayout}).
 */
export const sldHeaderPillMetrics = (
  normalize: (size: number) => number,
  touchMin: number,
  labelWidth: number,
): SldModeToggleMetrics =>
  sldModeToggleMetrics(
    normalize,
    2,
    touchMin,
    (Number.isFinite(labelWidth) && labelWidth > 0 ? labelWidth : 0) + 2 * SLD_HEADER_LABEL_PAD,
  );

export interface SldViewHeaderLayoutInput {
  /** The row's width (the inline panel's). */
  width: number;
  /** Gap between the row's items, and between the two lines when it wraps. */
  gap: number;
  /** The "Diagram | 3D" pill's box — omitted once the twin can't be shown. */
  viewPill?: { width: number; height: number };
  /** The "Grouped | Units" pill's box — omitted when nothing groups. */
  groupPill?: { width: number; height: number };
  /**
   * The full-screen button's box (≥ touch.min) while 3D can be shown. Its
   * slot is reserved in BOTH views (the button itself shows in 3D only), so
   * switching Diagram ⇄ 3D never re-flows the row.
   */
  button?: number;
}

export interface SldViewHeaderLayout {
  /**
   * True when the pills don't fit one line beside the button: "Grouped |
   * Units" moves to a second line, under "Diagram | 3D", inside the left
   * cluster; the button stays on the first line, right.
   */
  wrapped: boolean;
  /** The row's height (both lines and their gap when wrapped). */
  height: number;
}

/**
 * The inline header row's layout — `[Diagram | 3D] [Grouped | Units] …
 * [full screen]` on one line when everything fits the width, else the
 * Grouped | Units pill on a second line (narrow phones, large text). Pure
 * and deterministic (no onLayout), so the Summary placeholder reserves
 * exactly the same height before the diagram mounts.
 */
export const sldViewHeaderLayout = ({
  width,
  gap,
  viewPill,
  groupPill,
  button = 0,
}: SldViewHeaderLayoutInput): SldViewHeaderLayout => {
  const pills = [viewPill, groupPill].filter((p): p is { width: number; height: number } => !!p);
  if (pills.length === 0 && !(button > 0)) return { wrapped: false, height: 0 };
  const btn = button > 0 ? button : 0;
  const oneLine =
    pills.reduce((sum, p, i) => sum + (i > 0 ? gap : 0) + p.width, 0) + (btn > 0 ? gap + btn : 0);
  const wrapped = !!viewPill && !!groupPill && oneLine > width;
  if (wrapped && viewPill && groupPill) {
    return {
      wrapped: true,
      height: Math.max(viewPill.height, btn) + gap + groupPill.height,
    };
  }
  return { wrapped: false, height: Math.max(btn, ...pills.map(p => p.height)) };
};


/* ─────────── 3D: the web twin (SldTwin/) ─────────── */

/**
 * The web's own rule for the twin's canvas height on a phone —
 * `clamp(600px, 78vh, 920px)` — measured in window points: the inline 3D
 * panel is a TALL card, like the mobile web (user decision 2026-10-09).
 * Whole points (the WebView is laid out by RN).
 */
export const SLD_TWIN_INLINE_MIN_HEIGHT = 600;
export const SLD_TWIN_INLINE_MAX_HEIGHT = 920;
export const SLD_TWIN_INLINE_VH = 0.78;
/**
 * Page left visible beside the inline twin, points: every drag that starts
 * on the 3D moves the model, never the page (user, 2026-10-10: "scroll up
 * and down still scroll screen"), so the card must never fill the body's
 * viewport — the web's clamp gave ≈ 682 pt in a ≈ 690 pt viewport on a
 * 402 × 874 iPhone, nothing left to scroll by. At least this much of the
 * page (header row, cards around it) stays in view at any scroll offset.
 */
export const SLD_TWIN_SCROLL_RESERVE = 160;
/** The inline twin's floor, points (its HUD + status chips take ≈ 200). */
export const SLD_TWIN_INLINE_FLOOR = 360;
/**
 * Page ALWAYS left beside the inline twin, points — beats the floor: in a
 * short body viewport (Android split screen / pop-up windows, which ignore
 * the portrait lock) a 360 pt card would cover all of it, and nothing on
 * the 3D scrolls the page. Two touch targets' worth.
 */
export const SLD_TWIN_MIN_FREE = 88;

/**
 * The inline twin's height: the web's clamp in window points, capped so
 * {@link SLD_TWIN_SCROLL_RESERVE} of the body viewport stays free (never
 * below {@link SLD_TWIN_INLINE_FLOOR}), and never closer than
 * {@link SLD_TWIN_MIN_FREE} to the viewport's height — which beats the
 * floor. `viewportHeight` 0 = not laid out yet → the web's clamp alone.
 */
export const sldTwinInlineHeight = (windowHeight: number, viewportHeight = 0): number => {
  const h = Number.isFinite(windowHeight) && windowHeight > 0 ? windowHeight : 0;
  const web = Math.min(
    SLD_TWIN_INLINE_MAX_HEIGHT,
    Math.max(SLD_TWIN_INLINE_MIN_HEIGHT, h * SLD_TWIN_INLINE_VH),
  );
  if (!(Number.isFinite(viewportHeight) && viewportHeight > 0)) return Math.round(web);
  const card = Math.max(
    SLD_TWIN_INLINE_FLOOR,
    Math.min(web, viewportHeight - SLD_TWIN_SCROLL_RESERVE),
  );
  return Math.round(Math.max(0, Math.min(card, viewportHeight - SLD_TWIN_MIN_FREE)));
};

/* ─────────── 3D full screen: sideways by TRANSFORM ─────────── */

/** The full-screen 3D container's rotation (RN `rotate`, degrees, CLOCKWISE). */
export const SLD_LANDSCAPE_ROTATION_DEG = 90;

/**
 * The container that shows the full-screen 3D twin sideways while the
 * phone stays PORTRAIT (the ChartFullscreenModal pattern): a box of the
 * window's long edge × short edge, centred on the window and turned +90°
 * about its own centre (RN's default transform origin). Device rotation is
 * banned (an OS orientation change re-lays the root out under Reanimated's
 * Fabric commit hooks — the crash class §19 forbids); a transform is just a
 * matrix on one view: no re-layout, no new surface. The WebView inside maps
 * touches into its own (turned) coordinates natively.
 *
 * A window that is already WIDER than tall (Android ≥ 600 dp tablets and
 * unfolded foldables ignore the portrait lock; a landscape split-screen
 * window) is landscape already: the box is the window itself, NOT turned
 * (rotation 0) — the same long × short box and rotation
 * {@link sldLandscapeGeometry} describes.
 */
export const sldLandscapeContainer = (
  windowWidth: number,
  windowHeight: number,
): { width: number; height: number; left: number; top: number; rotation: number } => {
  const w = Math.max(0, windowWidth);
  const h = Math.max(0, windowHeight);
  if (w > h) return { width: w, height: h, left: 0, top: 0, rotation: 0 };
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  return {
    width: long,
    height: short,
    left: (w - long) / 2,
    top: (h - short) / 2,
    rotation: SLD_LANDSCAPE_ROTATION_DEG,
  };
};

/** The sideways rail keeps this far (pt) from the home-indicator edge, past its inset. */
export const SLD_RAIL_GAP = 8;

export interface SldLandscapeGeometry {
  /**
   * Content size (pt): the window's LONG edge × its short edge — a portrait
   * window turned sideways (width = window height), a window that is
   * already landscape as it is.
   */
  width: number;
  height: number;
  /** 90 for a portrait (or square) window; 0 for one already wider than tall. */
  rotation: 0 | 90;
  /**
   * The safe insets in CONTENT axes (turned: left = portrait top, the
   * island side; right = portrait bottom, the home indicator; top =
   * portrait right; bottom = portrait left. Not turned: the window's own).
   */
  insets: SldInsets;
  /** The twin's rect (content coords): inside the insets, left of the rail. */
  area: SldRect;
  /** The control rail (content coords), right of the area. */
  rail: SldRect;
}

const nonNeg = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;

/**
 * The sideways full screen's geometry for a window and its safe-area
 * insets: content = the window turned +90° (a portrait window — the phone
 * app is portrait-locked), its insets mapped into the turned frame, the
 * rail `railWidth` wide standing {@link SLD_RAIL_GAP} clear of the
 * home-indicator side's inset, the twin's area between the island-side
 * inset and the rail. A window already WIDER than tall: the same, unturned
 * (`rotation` 0, its insets as they are) — always the box
 * {@link sldLandscapeContainer} lays out.
 */
export const sldLandscapeGeometry = (
  window: { width: number; height: number },
  windowInsets: Partial<SldInsets> | null | undefined,
  railWidth: number,
): SldLandscapeGeometry => {
  const ww = nonNeg(window?.width);
  const wh = nonNeg(window?.height);
  const turned = !(ww > wh);
  const width = turned ? wh : ww;
  const height = turned ? ww : wh;
  const p = windowInsets ?? {};
  const insets: SldInsets = turned
    ? { left: nonNeg(p.top), right: nonNeg(p.bottom), top: nonNeg(p.right), bottom: nonNeg(p.left) }
    : { left: nonNeg(p.left), right: nonNeg(p.right), top: nonNeg(p.top), bottom: nonNeg(p.bottom) };
  const h = Math.max(0, height - insets.top - insets.bottom);
  const rw = nonNeg(railWidth);
  const railX = Math.max(insets.left, width - insets.right - SLD_RAIL_GAP - rw);
  return {
    width,
    height,
    rotation: turned ? 90 : 0,
    insets,
    area: { x: insets.left, y: insets.top, w: Math.max(0, railX - insets.left), h },
    rail: { x: railX, y: insets.top, w: rw, h },
  };
};

/**
 * The sideways rail (`SldTwinRail`), top → bottom: Close, the round
 * "Diagram" button (glyph + caption) and — when something groups — the
 * "Group | Units" pill (two segments stacked vertically, as wide as a round
 * button). Every button and segment is a real touch target (≥ `touchMin`:
 * 44 iOS / 48 Android): the round button is sized so the pill's INSIDE
 * (its width minus padding and border) is ≥ `touchMin` too. The rail's
 * width: the round button + 6 pt each side, or the caption's measured
 * width (`captionWidth`, + 8) when that is wider. The twin keeps its own
 * tools (fit, Plan view, tags) inside its canvas, so the rail holds
 * nothing else.
 */
export interface SldRailMetrics {
  /** Round button edge (and the Group | Units pill's width). */
  button: number;
  /** Gap between the stacked items. */
  gap: number;
  /** The rail's width. */
  width: number;
  /** Group | Units: each segment's height, the pill's padding and border. */
  segment: number;
  pad: number;
  border: number;
}

const RAIL_BUTTON = 52;
const RAIL_SEGMENT = 46;
const RAIL_PAD = 3;
const RAIL_BORDER = 1;
const RAIL_GAP = 12;
const RAIL_SIDE = 6;
const RAIL_CAPTION_PAD = 8;

export const sldRailMetrics = (touchMin: number, captionWidth = 0): SldRailMetrics => {
  const tm = nonNeg(touchMin);
  // The pill is a round button wide: its inside (one segment's width) ≥ touchMin.
  const button = Math.max(RAIL_BUTTON, tm + 2 * (RAIL_PAD + RAIL_BORDER));
  return {
    button,
    gap: RAIL_GAP,
    width: Math.ceil(Math.max(button + 2 * RAIL_SIDE, nonNeg(captionWidth) + RAIL_CAPTION_PAD)),
    segment: Math.max(RAIL_SEGMENT, tm),
    pad: RAIL_PAD,
    border: RAIL_BORDER,
  };
};

/** The Group | Units pill's outer height (two stacked segments). */
export const sldRailPillHeight = (m: SldRailMetrics): number =>
  2 * m.segment + 2 * (m.pad + m.border);

/** The width a Group | Units segment's label may use: the pill's inside. */
export const sldRailSegmentInner = (m: SldRailMetrics): number =>
  m.button - 2 * (m.pad + m.border);

/**
 * The rail's stacked height: Close, the "Diagram" button + its caption
 * (`captionGap` + one caption line of `captionLine` pt), and the
 * Group | Units pill when shown — what must fit the rail's height (the
 * short edge minus the turned insets, ≈ 360 pt on the smallest phones).
 */
export const sldRailStackHeight = (
  m: SldRailMetrics,
  caption: { gap: number; line: number },
  withGroup: boolean,
): number =>
  m.button +
  m.gap +
  m.button +
  nonNeg(caption.gap) +
  nonNeg(caption.line) +
  (withGroup ? m.gap + sldRailPillHeight(m) : 0);

/**
 * The Group | Units labels inside the rail's segments: a segment is only
 * {@link sldRailSegmentInner} wide (44 pt on iOS), and the labels scale
 * with the OS text size (AppText, ≤ `osMax`) — "Group" in Poppins-Bold is
 * ≈ 3.5 em, so one Larger Text step on a wide phone would cut it to
 * "Gro…". `labelWidthPerPt` is the WIDEST label's width per point of font
 * size (measured bold — the active segment). Returns the cap on that OS
 * scaling (`maxFontScale`, ≥ 1, ≤ `osMax`) at which it still fits
 * `innerWidth`, and — only when even the unscaled size can't fit (an
 * Android tablet's width-scaled font) — the factor (< 1) to shrink the
 * requested size by. Never `adjustsFontSizeToFit` (the rail is inside a
 * transformed view — the Fabric shrink bug, §19).
 */
export const sldRailLabelFit = (
  innerWidth: number,
  labelWidthPerPt: number,
  fontPt: number,
  osMax = 1.3,
): { sizeFactor: number; maxFontScale: number } => {
  if (!(labelWidthPerPt > 0) || !(fontPt > 0) || !(innerWidth > 0)) {
    return { sizeFactor: 1, maxFontScale: 1 };
  }
  const fitPt = innerWidth / labelWidthPerPt;
  if (fitPt < fontPt) return { sizeFactor: fitPt / fontPt, maxFontScale: 1 };
  return { sizeFactor: 1, maxFontScale: Math.max(1, Math.min(osMax, fitPt / fontPt)) };
};
