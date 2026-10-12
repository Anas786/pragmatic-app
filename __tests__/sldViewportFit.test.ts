/**
 * SLD viewport geometry — the width-filling initial fit (`computeSldFit`)
 * that centres a tall diagram on its hub and keeps a fitting one inside the
 * safe area and clear of the persistent pills, the inline panel's
 * content-driven height (`sldPanelHeight`), the pills' touch targets, the
 * inline header row (both switches above the panel, wrapping on narrow
 * phones — `sldHeaderPillMetrics` / `sldViewHeaderLayout`), the controls
 * column, and the 3D twin's geometry: its tall inline card
 * (`sldTwinInlineHeight`) and the sideways full screen (the turned
 * container, `sldLandscapeGeometry`, the rail with its Group | Units pill).
 */
import { it, expect, describe } from '@jest/globals';
import {
  computeSldFit,
  sldClampTranslate,
  SLD_MAX_FIT_SCALE,
  SLD_MIN_TOUCH_TARGET,
  SLD_NO_INSETS,
  SLD_ZOOM_STEP,
  sldControlColumnLayout,
  sldControlColumnMaxHeight,
  sldControlColumnMetrics,
  SldFit,
  SldFitInput,
  SldInsets,
  sldModeToggleMetrics,
  sldOverlayStrip,
  SldOverlayBox,
  sldPanelHeight,
  SldViewTransform,
  sldZoomLimits,
  sldZoomTo,
  SLD_LANDSCAPE_ROTATION_DEG,
  SLD_RAIL_GAP,
  sldLandscapeContainer,
  sldLandscapeGeometry,
  sldRailMetrics,
  sldTwinInlineHeight,
  SLD_TWIN_INLINE_FLOOR,
  SLD_TWIN_MIN_FREE,
  SLD_TWIN_SCROLL_RESERVE,
  SLD_HEADER_LABEL_PAD,
  sldHeaderPillMetrics,
  sldViewHeaderLayout,
  sldRailLabelFit,
  sldRailPillHeight,
  sldRailSegmentInner,
  sldRailStackHeight,
} from '../src/components/screens/Authenticated/SiteDetail/components/sldViewportFit';
import {
  buildSldPhoneLayout,
  estimateSldTextWidth,
  SLD_PHONE_CARD,
  SldPhoneLayout,
} from '../src/utils/sldPhoneLayout';
import { buildSldGrouping } from '../src/utils/sldGroup';
import { isLogoNode, resolveNodeRects } from '../src/utils/sld';
import { sldGraphMock } from '../src/data/mock/sld';
import { SLDEdge, SLDGraph, SLDNode } from '../src/types';

/** Portrait safe-area insets of an iPhone 17 Pro (Dynamic Island + home bar). */
const IPHONE_17_PRO: SldInsets = { top: 62, right: 0, bottom: 34, left: 0 };
/** Android edge-to-edge: status bar + 3-button nav bar. */
const ANDROID_E2E: SldInsets = { top: 24, right: 0, bottom: 48, left: 0 };

/** `normalizeWidth` on a device `screenWidth` points wide. */
const normalizeAt = (screenWidth: number) => (size: number) => (size / 393) * screenWidth;

/** SLD_MODE_TOGGLE_BOX at the 393pt reference width (two segments). */
const REF_TOGGLE = sldModeToggleMetrics(normalizeAt(393), 2);
const PILL: SldOverlayBox = {
  width: REF_TOGGLE.width,
  height: REF_TOGGLE.height,
  edge: 16,
  gap: 8,
};
const STRIP = sldOverlayStrip(PILL);

/** Lucky Cement's phone layouts (grouped ≈ 360 × 605, units ≈ 360 × 1574). */
const GROUPED = buildSldPhoneLayout(buildSldGrouping(sldGraphMock).graph);
const UNITS = buildSldPhoneLayout(sldGraphMock);

/** Inline content box on a 393pt phone (screen − 2 × 16 gutter − 2 × 1 border). */
const INLINE_W = 393 - 32 - 2;
/** Full-screen portrait iPhone 17 Pro. */
const PORTRAIT = { viewWidth: 402, viewHeight: 874 };

type Rect = { x: number; y: number; w: number; h: number };

const box = (input: SldFitInput, fit: SldFit): Rect => {
  const w = input.contentWidth * fit.scale;
  const h = input.contentHeight * fit.scale;
  return {
    x: input.viewWidth / 2 + fit.translateX - w / 2,
    y: input.viewHeight / 2 + fit.translateY - h / 2,
    w,
    h,
  };
};

/** Where content point (frame coords) `y` lands on screen. */
const screenY = (input: SldFitInput, fit: SldFit, y: number): number =>
  input.viewHeight / 2 + fit.translateY + fit.scale * (y - input.contentHeight / 2);

const EPS = 1e-9;

describe('sldModeToggleMetrics (Grouped/Units pill touch target)', () => {
  // Fabric hit-testing (iOS RCTViewComponentView, Android TouchTargetHelper)
  // drops a touch outside a parent's layout box before its children see it,
  // so hitSlop only counts INSIDE the pill container. The effective target
  // height is therefore min(segment + 2·slop, container height).
  const PHONES = [320, 360, 375, 390, 393, 402, 412, 430, 440];
  const TABLETS = [744, 820, 1024];

  it('gives every segment a ≥44pt target inside the pill on every width', () => {
    for (const w of [...PHONES, ...TABLETS]) {
      const m = sldModeToggleMetrics(normalizeAt(w), 2);
      const chrome = m.padding + m.border;
      // Slop never reaches past the container…
      expect([w, m.slop <= chrome + EPS]).toEqual([w, true]);
      // …so the reachable height is capped by the container, which is ≥44.
      const effectiveHeight = Math.min(m.segmentHeight + 2 * m.slop, m.height);
      expect([w, effectiveHeight >= SLD_MIN_TOUCH_TARGET - EPS]).toEqual([w, true]);
      expect([w, m.segmentWidth >= SLD_MIN_TOUCH_TARGET]).toEqual([w, true]);
    }
  });

  it('is exactly the touch target tall on phones (no taller than needed)', () => {
    for (const w of PHONES) {
      const m = sldModeToggleMetrics(normalizeAt(w), 2);
      // ceil keeps < 1pt of pixel-snapping margin, never more.
      expect([w, m.height >= SLD_MIN_TOUCH_TARGET && m.height < SLD_MIN_TOUCH_TARGET + 1]).toEqual([
        w,
        true,
      ]);
    }
  });

  it('reports the real layout box as the fit footprint', () => {
    for (const w of [...PHONES, ...TABLETS]) {
      const m = sldModeToggleMetrics(normalizeAt(w), 2);
      const chrome = m.padding + m.border;
      expect(m.height).toBeCloseTo(m.segmentHeight + 2 * chrome, 12);
      expect(m.width).toBeCloseTo(2 * m.segmentWidth + m.gap + 2 * chrome, 12);
    }
    const three = sldModeToggleMetrics(normalizeAt(393), 3);
    expect(three.width).toBeCloseTo(3 * three.segmentWidth + 2 * three.gap + 2 * (three.padding + 1), 12);
  });

  it('the inline header’s Diagram | 3D switch reaches touch.min (48 on Android) the same way', () => {
    for (const touchMin of [44, 48]) {
      for (const w of [...PHONES, ...TABLETS]) {
        const m = sldModeToggleMetrics(normalizeAt(w), 2, touchMin);
        const chrome = m.padding + m.border;
        expect([w, touchMin, m.slop <= chrome + EPS]).toEqual([w, touchMin, true]);
        const effectiveHeight = Math.min(m.segmentHeight + 2 * m.slop, m.height);
        expect([w, touchMin, effectiveHeight >= touchMin - EPS]).toEqual([w, touchMin, true]);
        expect([w, touchMin, m.segmentWidth >= touchMin]).toEqual([w, touchMin, true]);
      }
    }
    // The default stays the 44 pt top pills' geometry.
    expect(sldModeToggleMetrics(normalizeAt(393), 2, SLD_MIN_TOUCH_TARGET)).toEqual(REF_TOGGLE);
  });
});

describe('the controls column never reaches under the Diagram | 3D pill', () => {
  // The column sits bottom-left (space.lg = 16 from the edges), the
  // Diagram | 3D pill top-left (16 in, gap 8) and is drawn OVER it: a
  // 6-button column on a 320 pt panel reached up to 27 pt under the pill on
  // a 440 pt phone, so the top of Zoom-in switched the view.
  const WIDTHS = [360, 375, 390, 393, 402, 412, 430, 440];
  const EDGE = 16;
  const pillAt = (w: number): SldOverlayBox => {
    const m = sldModeToggleMetrics(normalizeAt(w), 2);
    return { width: m.width, height: m.height, edge: EDGE, gap: 8 };
  };

  it('column top ≥ pill bottom + gap — a 320 pt panel, 5 / 6 buttons, iOS / Android targets', () => {
    for (const w of WIDTHS) {
      for (const touchMin of [44, 48]) {
        for (const count of [5, 6]) {
          const viewHeight = 320 - 2; // inside the 1 pt border
          const pill = pillAt(w);
          const m = sldControlColumnMetrics(normalizeAt(w), touchMin);
          const maxHeight = sldControlColumnMaxHeight({ viewHeight, edge: EDGE, pill });
          const lay = sldControlColumnLayout(count, m, maxHeight);
          const top = viewHeight - EDGE - lay.height;
          const keepOut = pill.edge + pill.height + pill.gap;
          expect([w, touchMin, count, top >= keepOut - EPS]).toEqual([w, touchMin, count, true]);
          // Still inside the panel's width (beside the pill row, never over it).
          expect([w, lay.width <= w - 2 * EDGE]).toEqual([w, true]);
        }
      }
    }
  });

  it('full screen with safe-area insets: the same keep-out', () => {
    const insets: SldInsets = { top: 59, right: 0, bottom: 34, left: 0 };
    for (const w of WIDTHS) {
      const pill = pillAt(w);
      const m = sldControlColumnMetrics(normalizeAt(w), 44);
      const viewHeight = 480;
      const maxHeight = sldControlColumnMaxHeight({ viewHeight, insets, edge: EDGE, pill });
      const lay = sldControlColumnLayout(6, m, maxHeight);
      const top = viewHeight - insets.bottom - EDGE - lay.height;
      expect([w, top >= insets.top + pill.edge + pill.height + pill.gap - EPS]).toEqual([w, true]);
    }
  });

  it('one column whenever it fits; every button a real touch target', () => {
    for (const touchMin of [44, 48]) {
      const m = sldControlColumnMetrics(normalizeAt(393), touchMin);
      expect(m.button).toBeGreaterThanOrEqual(touchMin);
      const tall = sldControlColumnLayout(6, m, 800);
      expect([tall.columns, tall.rows]).toEqual([1, 6]);
      const short = sldControlColumnLayout(6, m, 200);
      expect(short.columns).toBeGreaterThan(1);
      expect(short.height).toBeLessThanOrEqual(200);
      expect(short.columns * short.rows).toBeGreaterThanOrEqual(6);
      // Nothing fits: one row (never a column through the pill).
      expect(sldControlColumnLayout(6, m, 10).rows).toBe(1);
    }
    // No pill: only the safe area's top edge bounds it.
    expect(sldControlColumnMaxHeight({ viewHeight: 400, edge: EDGE })).toBe(400 - 2 * EDGE);
  });
});

describe('computeSldFit — fill the width', () => {
  it('fills the width, capped at 1 unit per point, and centres a diagram that fits', () => {
    const input = { viewWidth: INLINE_W, viewHeight: 800, contentWidth: 360, contentHeight: 605 };
    const fit = computeSldFit(input);
    expect(fit).toEqual({
      scale: INLINE_W / 360,
      translateX: 0,
      translateY: 0,
      overviewScale: INLINE_W / 360,
      reserve: 'none',
      insets: SLD_NO_INSETS,
      mask: 0,
    });
    // Wider than the diagram (tablet, Pro Max full screen): never magnified.
    const wide = computeSldFit({ ...input, viewWidth: 820 });
    expect(wide.scale).toBe(SLD_MAX_FIT_SCALE);
    expect(computeSldFit({ ...input, viewWidth: 820, maxScale: 2 }).scale).toBe(2);
    expect(computeSldFit({ ...input, insets: SLD_NO_INSETS })).toEqual(fit);
  });

  it('opens a taller diagram centred on the hub', () => {
    const input = {
      viewWidth: INLINE_W,
      viewHeight: 700,
      contentWidth: UNITS.bounds.width,
      contentHeight: UNITS.bounds.height,
      focusY: UNITS.focus.y,
    };
    const fit = computeSldFit(input);
    expect(screenY(input, fit, UNITS.focus.y)).toBeCloseTo(350, 9);
    // It still covers the view — no empty band above or below.
    const b = box(input, fit);
    expect(b.y).toBeLessThanOrEqual(0);
    expect(b.y + b.h).toBeGreaterThanOrEqual(700);
    // The zoom-out floor shows the whole diagram.
    expect(fit.overviewScale).toBeCloseTo(700 / UNITS.bounds.height, 12);
    expect(fit.overviewScale).toBeLessThan(fit.scale);
  });

  it('clamps the hub-centring so the diagram never leaves a gap at its edge', () => {
    const base = { viewWidth: INLINE_W, viewHeight: 600, contentWidth: 360, contentHeight: 1500 };
    const nearTop = { ...base, focusY: 40 };
    const t = box(nearTop, computeSldFit(nearTop));
    expect(t.y).toBeCloseTo(0, 9);
    const nearBottom = { ...base, focusY: 1480 };
    const b = box(nearBottom, computeSldFit(nearBottom));
    expect(b.y + b.h).toBeCloseTo(600, 9);
    // No focus → the middle of the diagram.
    const mid = computeSldFit(base);
    expect(screenY(base, mid, 750)).toBeCloseTo(300, 9);
  });

  it('fits inside the full-screen safe area (Dynamic Island, home indicator)', () => {
    const input = {
      ...PORTRAIT,
      contentWidth: GROUPED.bounds.width,
      contentHeight: GROUPED.bounds.height,
      insets: IPHONE_17_PRO,
      focusY: GROUPED.focus.y,
    };
    const fit = computeSldFit(input);
    expect(fit.scale).toBe(1); // 402 − 0 ≥ 360: capped
    expect(fit.translateY).toBe((62 - 34) / 2);
    const b = box(input, fit);
    expect(b.y).toBeGreaterThanOrEqual(62 - EPS);
    expect(b.y + b.h).toBeLessThanOrEqual(874 - 34 + EPS);
    // A taller diagram centres its hub in the SAFE rect, not the screen.
    const tall = {
      ...input,
      contentWidth: UNITS.bounds.width,
      contentHeight: UNITS.bounds.height,
      focusY: UNITS.focus.y,
    };
    const tf = computeSldFit(tall);
    expect(screenY(tall, tf, UNITS.focus.y)).toBeCloseTo(62 + (874 - 62 - 34) / 2, 9);
  });

  it('reserves a top strip — at no cost in scale — when the diagram would sit under the pill', () => {
    const input = {
      viewWidth: INLINE_W,
      viewHeight: GROUPED.bounds.height * (INLINE_W / 360) + STRIP,
      contentWidth: GROUPED.bounds.width,
      contentHeight: GROUPED.bounds.height,
    };
    const plain = computeSldFit(input);
    const fit = computeSldFit({ ...input, overlay: PILL });
    expect(fit.reserve).toBe('top');
    expect(fit.insets).toEqual({ ...SLD_NO_INSETS, top: STRIP });
    // The reserved strip is a masked band down to the fit area's top.
    expect(fit.mask).toBe(STRIP);
    expect(plain.mask).toBe(0);
    expect(fit.scale).toBe(plain.scale);
    // Exactly the panel height sldPanelHeight asks for: flush under the strip.
    expect(box(input, fit).y).toBeCloseTo(STRIP, 9);
    // With room to spare above it, the plain fit stays.
    const roomy = { ...input, viewHeight: input.viewHeight + 2 * STRIP + 40 };
    expect(computeSldFit({ ...roomy, overlay: PILL })).toEqual(computeSldFit(roomy));
  });

  it('never fits a diagram that fits under the pill or outside the safe area', () => {
    const insetSets: SldInsets[] = [
      SLD_NO_INSETS,
      IPHONE_17_PRO,
      ANDROID_E2E,
      { top: 30, right: 10, bottom: 5, left: 20 },
    ];
    const views = [
      { viewWidth: INLINE_W, viewHeight: 724 },
      PORTRAIT,
      { viewWidth: 320, viewHeight: 568 },
      { viewWidth: 820, viewHeight: 1180 },
    ];
    const contents = [
      [GROUPED.bounds.width, GROUPED.bounds.height],
      [360, 200],
      [160, 160],
      [392, 520],
    ];
    let checked = 0;
    for (const view of views) {
      for (const insets of insetSets) {
        for (const [contentWidth, contentHeight] of contents) {
          const input = { ...view, contentWidth, contentHeight, insets, overlay: PILL };
          const fit = computeSldFit(input);
          const b = box(input, fit);
          const label = JSON.stringify({ view, insets, contentWidth, contentHeight });
          const availH = view.viewHeight - insets.top - insets.bottom - STRIP;
          if (b.h > availH + EPS) continue; // taller: covered by the tests above
          checked += 1;
          expect([label, b.x >= insets.left - EPS]).toEqual([label, true]);
          expect([label, b.y >= insets.top - EPS]).toEqual([label, true]);
          expect([label, b.x + b.w <= view.viewWidth - insets.right + EPS]).toEqual([label, true]);
          expect([label, b.y + b.h <= view.viewHeight - insets.bottom + EPS]).toEqual([label, true]);
          const pill = {
            x: view.viewWidth - insets.right - PILL.edge - PILL.width,
            y: insets.top + PILL.edge,
          };
          const clear =
            b.x + b.w <= pill.x - PILL.gap + EPS ||
            b.y >= pill.y + PILL.height + PILL.gap - EPS;
          expect([label, clear]).toEqual([label, true]);
        }
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});

describe('computeSldFit — the Diagram | 3D pill (top-LEFT) too', () => {
  // The left pill alone (nothing to group → no Grouped/Units pill) must
  // reserve the strip just like the right one did.
  it('reserves the strip when only the LEFT pill would be covered', () => {
    const input = {
      viewWidth: INLINE_W,
      viewHeight: GROUPED.bounds.height * (INLINE_W / 360) + STRIP,
      contentWidth: GROUPED.bounds.width,
      contentHeight: GROUPED.bounds.height,
    };
    const fit = computeSldFit({ ...input, overlayLeft: PILL });
    expect(fit.reserve).toBe('top');
    expect(fit.mask).toBe(STRIP);
    expect(fit.scale).toBe(computeSldFit(input).scale);
    // A diagram clear of both pills keeps its plain fit: a sliver centred
    // in the strip's free middle (between the two ~146 pt pills)…
    const narrow = { ...input, viewHeight: 400, contentWidth: 16, contentHeight: 300, maxScale: 1 };
    expect(computeSldFit({ ...narrow, overlayLeft: PILL })).toEqual(computeSldFit(narrow));
    expect(computeSldFit({ ...narrow, overlay: PILL })).toEqual(computeSldFit(narrow));
    expect(computeSldFit({ ...narrow, overlay: PILL, overlayLeft: PILL })).toEqual(computeSldFit(narrow));
  });

  it('adding the left pill never changes an existing 2D fit (same strip)', () => {
    for (const [label, l] of FIXTURES) {
      const { input } = inlinePanel(l);
      const right = computeSldFit(input);
      const both = computeSldFit({ ...input, overlayLeft: PILL });
      expect([label, both]).toEqual([label, right]);
    }
  });

  it('never fits a diagram that fits under EITHER pill', () => {
    const views = [
      { viewWidth: INLINE_W, viewHeight: 724 },
      PORTRAIT,
      { viewWidth: 320, viewHeight: 568 },
      { viewWidth: 820, viewHeight: 1180 },
    ];
    const insetSets: SldInsets[] = [SLD_NO_INSETS, IPHONE_17_PRO, { top: 30, right: 10, bottom: 5, left: 20 }];
    const contents = [
      [GROUPED.bounds.width, GROUPED.bounds.height],
      [360, 200],
      [160, 160],
      [392, 520],
    ];
    let checked = 0;
    for (const view of views) {
      for (const insets of insetSets) {
        for (const [contentWidth, contentHeight] of contents) {
          const input = { ...view, contentWidth, contentHeight, insets, overlay: PILL, overlayLeft: PILL };
          const fit = computeSldFit(input);
          const b = box(input, fit);
          const label = JSON.stringify({ view, insets, contentWidth, contentHeight });
          const availH = view.viewHeight - insets.top - insets.bottom - STRIP;
          if (b.h > availH + EPS) continue;
          checked += 1;
          const right = view.viewWidth - insets.right - PILL.edge - PILL.width;
          const left = insets.left + PILL.edge;
          const top = insets.top + PILL.edge;
          const below = b.y >= top + PILL.height + PILL.gap - EPS;
          const clearRight = b.x + b.w <= right - PILL.gap + EPS || below;
          const clearLeft = b.x >= left + PILL.width + PILL.gap - EPS || below;
          expect([label, clearRight, clearLeft]).toEqual([label, true, true]);
        }
      }
    }
    expect(checked).toBeGreaterThan(30);
  });

  it('the panel reserves one strip for both pills', () => {
    const base = {
      viewWidth: INLINE_W,
      contentWidth: GROUPED.bounds.width,
      contentHeight: GROUPED.bounds.height,
      minHeight: 320,
      maxHeight: 724,
    };
    const both = sldPanelHeight({ ...base, overlay: PILL, overlayLeft: PILL });
    expect(both).toBe(sldPanelHeight({ ...base, overlay: PILL }));
    expect(both).toBe(sldPanelHeight({ ...base, overlayLeft: PILL }));
    expect(both).toBe(Math.ceil(GROUPED.bounds.height * (INLINE_W / 360) + STRIP));
  });
});

describe('sldPanelHeight (inline panel follows its diagram)', () => {
  const range = { minHeight: 320, maxHeight: 724 };

  it('shows the whole grouped Lucky diagram + the pill strip without panning', () => {
    const h = sldPanelHeight({
      viewWidth: INLINE_W,
      contentWidth: GROUPED.bounds.width,
      contentHeight: GROUPED.bounds.height,
      overlay: PILL,
      ...range,
    });
    expect(h).toBe(Math.ceil(GROUPED.bounds.height * (INLINE_W / 360) + STRIP));
    expect(h).toBeLessThan(range.maxHeight);
    // No pill (nothing to group) → no strip.
    expect(
      sldPanelHeight({
        viewWidth: INLINE_W,
        contentWidth: GROUPED.bounds.width,
        contentHeight: GROUPED.bounds.height,
        ...range,
      }),
    ).toBe(Math.ceil(GROUPED.bounds.height * (INLINE_W / 360)));
  });

  it('clamps: units mode caps at the max (then pans), a tiny diagram gets the min', () => {
    const units = sldPanelHeight({
      viewWidth: INLINE_W,
      contentWidth: UNITS.bounds.width,
      contentHeight: UNITS.bounds.height,
      overlay: PILL,
      ...range,
    });
    expect(units).toBe(range.maxHeight);
    expect(
      sldPanelHeight({ viewWidth: INLINE_W, contentWidth: 172, contentHeight: 119, ...range }),
    ).toBe(range.minHeight);
    // Crossed bounds (a very short window): the minimum wins.
    expect(
      sldPanelHeight({ viewWidth: INLINE_W, contentWidth: 360, contentHeight: 900, minHeight: 320, maxHeight: 200 }),
    ).toBe(320);
  });

  it('caps the scale like the fit (a wide panel does not grow the diagram)', () => {
    expect(
      sldPanelHeight({ viewWidth: 800, contentWidth: 360, contentHeight: 500, ...range }),
    ).toBe(500);
  });
});

describe('readability at the inline fit', () => {
  // The user's complaint: 2–3pt text. On every phone ≥ 375pt wide the
  // grouped diagram now opens with headings / values ≥ 13pt and labels ≥ 11pt.
  for (const screen of [375, 390, 393, 402, 430, 440]) {
    it(`${screen}pt phone`, () => {
      const fit = computeSldFit({
        viewWidth: screen - 32 - 2,
        viewHeight: 724,
        contentWidth: GROUPED.bounds.width,
        contentHeight: GROUPED.bounds.height,
      });
      expect(SLD_PHONE_CARD.headingSize * fit.scale).toBeGreaterThanOrEqual(13);
      expect(SLD_PHONE_CARD.valueSize * fit.scale).toBeGreaterThanOrEqual(14);
      expect(SLD_PHONE_CARD.labelSize * fit.scale).toBeGreaterThanOrEqual(11);
      expect(SLD_PHONE_CARD.unitSize * fit.scale).toBeGreaterThanOrEqual(11);
      // vs the old backend canvas (~1960 units wide) at ≈ 0.18.
      expect(fit.scale).toBeGreaterThan(0.9);
    });
  }
});

/* ─────────── zoom + pan stay in view ─────────── */

const unit = (id: string, heading: string, x: number, logo = false): SLDNode => ({
  id,
  type: 'custom',
  position: { x, y: 0 },
  data: {
    heading,
    keys: [{ param: `live.${id}.value`, label: 'P', unit: 'kW' }],
    edgesConnect: logo ? 'target' : 'source',
    icon: { name: logo ? 'industry' : 'switchLg', color: '#3B82F6' },
    type: logo ? 'logo' : null,
  },
});

const link = (source: string, target: string): SLDEdge => ({
  id: `e-${source}-${target}`,
  source,
  target,
  sourceHandle: 'b',
  targetHandle: 't',
  type: 'buttonedge',
  style: { stroke: '#61656b' },
  markerEnd: { color: '#61656b', type: 'arrowclosed' },
  data: { mode: 'flow' },
});

/** hub ← u0 ← u1 ← … ← u(n−1): one centred column, the hub at the very bottom. */
const chain = (n: number, extra: SLDGraph = { nodes: [], edges: [] }): SLDGraph => ({
  nodes: [
    unit('hub', 'Plant', 0, true),
    ...Array.from({ length: n }, (_, i) => unit(`u${i}`, `Unit ${i}`, i)),
    ...extra.nodes,
  ],
  edges: [
    ...Array.from({ length: n }, (_, i) => link(`u${i}`, i === 0 ? 'hub' : `u${i - 1}`)),
    ...extra.edges,
  ],
});

/** A star of `n` feeders plus a separate `m`-unit chain (no path to the plant). */
const starWithIsland = (n: number, m: number): SLDGraph => {
  const g = chain(0);
  for (let i = 0; i < n; i++) {
    g.nodes.push(unit(`f${i}`, `Feeder ${i}`, 100 * i));
    g.edges.push(link(`f${i}`, 'hub'));
  }
  for (let i = 0; i < m; i++) {
    g.nodes.push(unit(`i${i}`, `Island ${i}`, 0));
    if (i > 0) g.edges.push(link(`i${i}`, `i${i - 1}`));
  }
  return g;
};

/** Two branches, one carrying a 6-deep chain: every card above the plant. */
const lopsided = (): SLDGraph => {
  const g = chain(6);
  g.nodes.push(unit('w', 'Wind', 500));
  g.edges.push(link('w', 'hub'));
  return g;
};

const FIXTURES: [string, SldPhoneLayout][] = [
  ['Lucky grouped', GROUPED],
  ['Lucky units', UNITS],
  ['hub under a 12-deep chain', buildSldPhoneLayout(chain(12))],
  ['two branches, one 6 deep', buildSldPhoneLayout(lopsided())],
  ['star + a 14-unit island', buildSldPhoneLayout(starWithIsland(6, 14))],
];

/** The card rects the node layer draws (FRAME coordinates), as SLDViewport passes them. */
const cardRects = (l: SldPhoneLayout): Rect[] =>
  Array.from(resolveNodeRects(l.graph, l.bounds).values());

/** The inline panel for a layout (content box, mode pill on), as SLDViewport sets it up. */
const inlinePanel = (l: SldPhoneLayout) => {
  const input: SldFitInput = {
    viewWidth: INLINE_W,
    viewHeight: sldPanelHeight({
      viewWidth: INLINE_W,
      contentWidth: l.bounds.width,
      contentHeight: l.bounds.height,
      overlay: PILL,
      minHeight: 318,
      maxHeight: 722,
    }),
    contentWidth: l.bounds.width,
    contentHeight: l.bounds.height,
    overlay: PILL,
    focusY: l.focus.y,
    cards: cardRects(l),
  };
  const fit = computeSldFit(input);
  const geo = {
    viewWidth: input.viewWidth,
    viewHeight: input.viewHeight,
    contentWidth: input.contentWidth,
    contentHeight: input.contentHeight,
    insets: fit.insets,
  };
  return { input, fit, geo, limits: sldZoomLimits(fit) };
};

const boxOf = (input: SldFitInput, t: SldViewTransform): Rect =>
  box(input, { ...t, overviewScale: 0, reserve: 'none', insets: SLD_NO_INSETS, mask: 0 });

/** Screen point of content point `p` (frame coordinates) under transform `t`. */
const screenOf = (input: SldFitInput, t: SldViewTransform, p: { x: number; y: number }) => ({
  x: input.viewWidth / 2 + t.translateX + t.scale * (p.x - input.contentWidth / 2),
  y: input.viewHeight / 2 + t.translateY + t.scale * (p.y - input.contentHeight / 2),
});

/** The box sits inside the area, or covers it — never a lost / half-empty view. */
const expectInView = (label: string, input: SldFitInput, ins: SldInsets, b: Rect) => {
  const top = ins.top;
  const bottom = input.viewHeight - ins.bottom;
  const left = ins.left;
  const right = input.viewWidth - ins.right;
  const inside = (lo: number, hi: number, a: number, z: number) =>
    (a >= lo - EPS && z <= hi + EPS) || (a <= lo + EPS && z >= hi - EPS);
  expect([label, inside(top, bottom, b.y, b.y + b.h)]).toEqual([label, true]);
  expect([label, inside(left, right, b.x, b.x + b.w)]).toEqual([label, true]);
};

describe('zoom about the viewport centre, clamped to the fit area', () => {
  it('is callable from the gesture handlers (a worklet)', () => {
    // SLDViewport's pan / pinch onEnd call it on the UI thread; without the
    // 'worklet' directive that crashes ("Tried to synchronously call a
    // non-worklet function") — the pinch-zoom crash of July 2026.
    const hash = (sldClampTranslate as unknown as { __workletHash?: number }).__workletHash;
    expect(typeof hash).toBe('number');
  });

  it('clamps one axis: inside the area when the box fits, covering it when larger', () => {
    // View 600, area 100…560 (460 tall); content 400.
    // Fits at 1 (400 ≤ 460): the box may sit anywhere inside the area.
    expect(sldClampTranslate(0, 1, 600, 400, 100, 40)).toBe(0);
    expect(sldClampTranslate(-500, 1, 600, 400, 100, 40)).toBe(100 - 300 + 200); // top on 100
    expect(sldClampTranslate(500, 1, 600, 400, 100, 40)).toBe(300 - 40 - 200); // bottom on 560
    // Larger at 2 (800 > 460): it must cover the area.
    expect(sldClampTranslate(0, 2, 600, 400, 100, 40)).toBe(0);
    expect(sldClampTranslate(-500, 2, 600, 400, 100, 40)).toBe(300 - 40 - 400); // bottom on 560
    expect(sldClampTranslate(500, 2, 600, 400, 100, 40)).toBe(100 - 300 + 400); // top on 100
  });

  it('opens in view and keeps the plant under the centre when zooming in', () => {
    for (const [label, l] of FIXTURES) {
      const { input, fit, geo, limits } = inlinePanel(l);
      const start: SldViewTransform = fit;
      expectInView(label, input, fit.insets, boxOf(input, start));
      const before = screenOf(input, start, l.focus);
      // Zooming in never needs the clamp: the content under the centre stays put.
      const centre = {
        x: (input.viewWidth / 2 - start.translateX - input.viewWidth / 2) / start.scale + input.contentWidth / 2,
        y: (input.viewHeight / 2 - start.translateY - input.viewHeight / 2) / start.scale + input.contentHeight / 2,
      };
      const zin = sldZoomTo(geo, start, Math.min(limits.max, start.scale * SLD_ZOOM_STEP));
      const c = screenOf(input, zin, centre);
      expect([label, c.x, c.y]).toEqual([label, expect.closeTo(input.viewWidth / 2, 9), expect.closeTo(input.viewHeight / 2, 9)]);
      // A plant that opened centred stays centred.
      if (Math.abs(before.y - input.viewHeight / 2) < 1e-6) {
        expect([label, screenOf(input, zin, l.focus).y]).toEqual([label, expect.closeTo(input.viewHeight / 2, 9)]);
      }
      expectInView(label, input, fit.insets, boxOf(input, zin));
    }
  });

  it('zooming out to the floor ends with the WHOLE diagram in view (the +/- buttons)', () => {
    for (const [label, l] of FIXTURES) {
      const { input, fit, geo, limits } = inlinePanel(l);
      // Zoom in twice first (off-centre plants drift most from there), then out to the floor.
      let t: SldViewTransform = fit;
      for (let i = 0; i < 2; i++) t = sldZoomTo(geo, t, Math.min(limits.max, t.scale * SLD_ZOOM_STEP));
      for (let i = 0; i < 40 && t.scale > limits.min; i++) {
        t = sldZoomTo(geo, t, Math.max(limits.min, t.scale / SLD_ZOOM_STEP));
        expectInView(label, input, fit.insets, boxOf(input, t));
      }
      expect([label, t.scale]).toEqual([label, limits.min]);
      const b = boxOf(input, t);
      expect([label, b.y >= fit.insets.top - EPS]).toEqual([label, true]);
      expect([label, b.y + b.h <= input.viewHeight - fit.insets.bottom + EPS]).toEqual([label, true]);
      expect([label, b.x >= -EPS, b.x + b.w <= input.viewWidth + EPS]).toEqual([label, true, true]);
    }
  });

  it('a pan dragged off-screen settles back into view at any zoom', () => {
    const { input, fit, limits } = inlinePanel(UNITS);
    for (const scale of [limits.min, fit.overviewScale, fit.scale, limits.max]) {
      for (const drag of [-5000, -300, 0, 300, 5000]) {
        const t: SldViewTransform = {
          scale,
          translateX: sldClampTranslate(drag, scale, input.viewWidth, input.contentWidth, fit.insets.left, fit.insets.right),
          translateY: sldClampTranslate(drag, scale, input.viewHeight, input.contentHeight, fit.insets.top, fit.insets.bottom),
        };
        expectInView(`${scale}/${drag}`, input, fit.insets, boxOf(input, t));
      }
    }
  });
});

/* ─────────── the pill never covers a card at open ─────────── */

describe('the Grouped/Units pill never covers a card at open (hub-focused fits)', () => {
  // Field report (Android release, Lucky Cement, Oct 2026): full screen →
  // Units re-fitted centred on the "LCL Plant" hub, and the pill covered
  // SG-CI-PV-06's P/Q values. A diagram taller than the view must cover its
  // fit area, so its upper rows ran up into the strip reserved for the pill:
  // the strip only moved the fit AREA. The strip is now a masked band
  // (`fit.mask`, painted by SLDViewport) and its edge settles between rows.

  /** SLD_MODE_TOGGLE_BOX on a device `screenWidth` points wide. */
  const pillFor = (screenWidth: number): SldOverlayBox => {
    const m = sldModeToggleMetrics(normalizeAt(screenWidth), 2);
    return { width: m.width, height: m.height, edge: 16, gap: 8 };
  };

  interface Host {
    label: string;
    screenWidth: number;
    viewWidth: number;
    /** Fixed view height (full screen), or the inline panel's cap. */
    viewHeight?: number;
    inlineMax?: number;
    insets: SldInsets;
  }

  const HOSTS: Host[] = [
    { label: 'full screen, iPhone 17 Pro', screenWidth: 402, viewWidth: 402, viewHeight: 874, insets: IPHONE_17_PRO },
    { label: 'full screen, Pixel 7a e2e', screenWidth: 412, viewWidth: 412, viewHeight: 915, insets: ANDROID_E2E },
    { label: 'full screen, Pixel 7a bars outside', screenWidth: 411, viewWidth: 411, viewHeight: 866, insets: { top: 24, right: 0, bottom: 0, left: 0 } },
    { label: 'full screen, 360pt Android', screenWidth: 360, viewWidth: 360, viewHeight: 740, insets: SLD_NO_INSETS },
    // Inline: content box = screen − 2 × 16 gutter − 2 × 1 border; the
    // panel follows its diagram up to 0.85 × the window height.
    { label: 'inline, 393pt iPhone', screenWidth: 393, viewWidth: 393 - 34, inlineMax: 722, insets: SLD_NO_INSETS },
    { label: 'inline, Pixel 7a', screenWidth: 412, viewWidth: 412 - 34, inlineMax: 775, insets: SLD_NO_INSETS },
    { label: 'inline, 360pt Android', screenWidth: 360, viewWidth: 360 - 34, inlineMax: 627, insets: SLD_NO_INSETS },
  ];

  const LAYOUTS: [string, SldPhoneLayout][] = [
    ['Grouped', GROUPED],
    ['Units', UNITS],
    ['hub under a 12-deep chain', buildSldPhoneLayout(chain(12))],
    ['star + a 14-unit island', buildSldPhoneLayout(starWithIsland(6, 14))],
  ];

  const open = (host: Host, l: SldPhoneLayout, withCards = true) => {
    const pill = pillFor(host.screenWidth);
    const viewHeight =
      host.viewHeight ??
      sldPanelHeight({
        viewWidth: host.viewWidth,
        contentWidth: l.bounds.width,
        contentHeight: l.bounds.height,
        overlay: pill,
        minHeight: 318,
        maxHeight: host.inlineMax!,
      });
    const input: SldFitInput = {
      viewWidth: host.viewWidth,
      viewHeight,
      contentWidth: l.bounds.width,
      contentHeight: l.bounds.height,
      insets: host.insets,
      overlay: pill,
      focusY: l.focus.y,
      cards: withCards ? cardRects(l) : undefined,
    };
    const fit = computeSldFit(input);
    const pillBox: Rect = {
      x: host.viewWidth - host.insets.right - pill.edge - pill.width,
      y: host.insets.top + pill.edge,
      w: pill.width,
      h: pill.height,
    };
    /** Each card's on-screen rect at the fit, with its heading. */
    const onScreen = Array.from(resolveNodeRects(l.graph, l.bounds)).map(([id, c]) => {
      const p = screenOf(input, fit, c);
      const heading = l.graph.nodes.find(n => n.id === id)!.data.heading;
      return { id, heading, rect: { x: p.x, y: p.y, w: c.w * fit.scale, h: c.h * fit.scale } };
    });
    const hub = screenY(input, fit, l.focus.y);
    return { input, fit, pill, pillBox, onScreen, hub };
  };

  /** Positive-area overlap of a and b (touching edges don't count). */
  const hit = (a: Rect, b: Rect) =>
    a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

  /** The part of `r` below the mask band (the band hides the rest). */
  const visible = (r: Rect, mask: number): Rect | null => {
    const top = Math.max(r.y, mask);
    return r.y + r.h - top > EPS ? { ...r, y: top, h: r.y + r.h - top } : null;
  };

  /** The pill plus its clearance gap — what a visible card must stay out of. */
  const zoneOf = (pillBox: Rect, pill: SldOverlayBox): Rect => ({
    x: pillBox.x - pill.gap,
    y: pillBox.y - pill.gap,
    w: pillBox.w + 2 * pill.gap,
    h: pillBox.h + 2 * pill.gap,
  });

  for (const host of HOSTS) {
    for (const [name, l] of LAYOUTS) {
      it(`${host.label} · ${name}: no visible card under the pill, hub in view`, () => {
        const { input, fit, pill, pillBox, onScreen, hub } = open(host, l);
        const label = `${host.label} · ${name}`;
        const zone = zoneOf(pillBox, pill);
        // No VISIBLE part of any card reaches the pill (+ its gap).
        const covered = onScreen
          .filter(({ rect }) => {
            const v = visible(rect, fit.mask);
            return v !== null && hit(v, zone);
          })
          .map(c => c.heading);
        expect([label, covered]).toEqual([label, []]);
        if (fit.mask > 0) {
          // The band holds the whole pill + gap…
          expect([label, pillBox.y + pillBox.h + pill.gap <= fit.mask + EPS]).toEqual([label, true]);
          // …and its edge falls between rows. (Not always possible: a hub
          // the clamp pins to the area's bottom under a deep chain can't
          // move — the band still hides what's under the pill.)
          const cut = onScreen
            .filter(({ rect }) => rect.y < fit.mask - EPS && rect.y + rect.h > fit.mask + EPS)
            .map(c => c.heading);
          if (name === 'Grouped' || name === 'Units') expect([label, cut]).toEqual([label, []]);
        } else {
          // No band: nothing at all under the pill.
          const under = onScreen.filter(({ rect }) => hit(rect, zone)).map(c => c.heading);
          expect([label, under]).toEqual([label, []]);
        }
        // The hub opens in view, below the band and above the bottom inset.
        const hubRect = onScreen.find(c => c.id === hubId(l))!.rect;
        expect([label, hubRect.y >= fit.mask - EPS]).toEqual([label, true]);
        expect([label, hubRect.y + hubRect.h <= input.viewHeight - host.insets.bottom + EPS]).toEqual([label, true]);
        // …where the hub-centred fit put it, give or take the edge settle
        // (at most half the tallest card).
        const bare = open(host, l, false);
        const tallest = Math.max(...onScreen.map(c => c.rect.h));
        expect([label, Math.abs(hub - bare.hub) <= tallest / 2 + EPS]).toEqual([label, true]);
        // Still a valid resting transform (inside the clamp range).
        expectInView(label, input, fit.insets, boxOf(input, fit));
      });
    }
  }

  it('the reported case: SG-CI-PV-06 is never visible under the pill (full screen, Units)', () => {
    for (const host of HOSTS) {
      const { fit, pill, pillBox, onScreen } = open(host, UNITS);
      const card = onScreen.find(c => c.heading === 'SG-CI-PV-06')!;
      const v = visible(card.rect, fit.mask);
      expect([host.label, v !== null && hit(v, zoneOf(pillBox, pill))]).toEqual([host.label, false]);
      // Before the band, the hub-centred fit drew it right under the pill.
      expect([host.label, fit.reserve, fit.mask > 0]).toEqual([host.label, 'top', true]);
    }
  });

  it('Grouped full screen keeps its plain fit: no band, pill over empty space', () => {
    const { fit, pill, pillBox, onScreen } = open(HOSTS[0], GROUPED);
    expect(fit.reserve).toBe('none');
    expect(fit.mask).toBe(0);
    expect(onScreen.filter(({ rect }) => hit(rect, zoneOf(pillBox, pill)))).toEqual([]);
  });

  it('without card rects the band still masks; the hub-centred fit is not nudged', () => {
    const host = HOSTS[0];
    const bare = open(host, UNITS, false);
    const withCards = open(host, UNITS);
    expect(bare.fit.mask).toBe(withCards.fit.mask);
    expect(bare.fit.scale).toBe(withCards.fit.scale);
    // Hub-centred in the fit area when nothing can be nudged.
    const areaH = bare.input.viewHeight - bare.fit.insets.top - bare.fit.insets.bottom;
    expect(bare.hub).toBeCloseTo(bare.fit.insets.top + areaH / 2, 9);
    // The settle only ever moves the diagram a little.
    expect(Math.abs(withCards.fit.translateY - bare.fit.translateY)).toBeLessThan(80);
  });

  it('settles the band edge between rows even when the hub sits at a card boundary', () => {
    // A synthetic column: 10 cards 100 tall, 16 apart, hub in the middle.
    const cards: Rect[] = Array.from({ length: 10 }, (_, i) => ({ x: 200, y: 12 + i * 116, w: 148, h: 100 }));
    const contentHeight = 12 + 10 * 116 - 16 + 12;
    for (let focusY = 300; focusY <= 900; focusY += 37) {
      const input: SldFitInput = {
        viewWidth: 360,
        viewHeight: 600,
        contentWidth: 360,
        contentHeight,
        overlay: PILL,
        focusY,
        cards,
      };
      const fit = computeSldFit(input);
      const cut = cards.filter(c => {
        const top = screenOf(input, fit, c).y;
        return top < fit.mask - EPS && top + c.h * fit.scale > fit.mask + EPS;
      });
      expect([focusY, cut]).toEqual([focusY, []]);
      expectInView(String(focusY), input, fit.insets, boxOf(input, fit));
    }
  });
});

/** The hub a layout centres on: the logo node (every fixture has one). */
const hubId = (l: SldPhoneLayout): string => l.graph.nodes.find(isLogoNode)!.id;

/* ─────────── 3D: the web twin ─────────── */

describe('sldTwinInlineHeight — the web’s clamp(600px, 78vh, 920px), in window points', () => {
  it('78 % of the window between 600 and 920 pt, whole points', () => {
    // Phones: 667 (SE) … 956 (Pro Max) → the floor, then 78 %.
    expect(sldTwinInlineHeight(667)).toBe(600);
    expect(sldTwinInlineHeight(740)).toBe(600);
    expect(sldTwinInlineHeight(812)).toBe(633);
    expect(sldTwinInlineHeight(844)).toBe(658);
    expect(sldTwinInlineHeight(956)).toBe(746);
    // Tablets: the cap.
    expect(sldTwinInlineHeight(1194)).toBe(920);
    expect(sldTwinInlineHeight(1366)).toBe(920);
    for (const h of [0, -5, Number.NaN, 500, 768, 900, 1180, 2000]) {
      const v = sldTwinInlineHeight(h);
      expect([h, Number.isInteger(v) && v >= 600 && v <= 920]).toEqual([h, true]);
    }
  });

  it('never fills the body viewport: page stays in view to scroll by (every drag on the 3D moves the model)', () => {
    // iPhone 17 Pro (874 pt window, ≈ 690 pt body viewport): the web's clamp
    // (682) left 8 pt — now capped to leave SLD_TWIN_SCROLL_RESERVE.
    expect(sldTwinInlineHeight(874)).toBe(682);
    expect(sldTwinInlineHeight(874, 690)).toBe(690 - SLD_TWIN_SCROLL_RESERVE);
    // A tall viewport (tablet): the web's own clamp still decides.
    expect(sldTwinInlineHeight(1194, 1100)).toBe(920);
    // A short one (SE + large text): never below the floor.
    expect(sldTwinInlineHeight(667, 470)).toBe(SLD_TWIN_INLINE_FLOOR);
    // Not laid out yet (0 / garbage): the web's clamp alone.
    expect(sldTwinInlineHeight(874, 0)).toBe(682);
    expect(sldTwinInlineHeight(874, Number.NaN)).toBe(682);
    for (const viewport of [520, 600, 690, 760, 840]) {
      for (const win of [667, 812, 874, 932]) {
        const v = sldTwinInlineHeight(win, viewport);
        const free = viewport - v;
        expect([win, viewport, Number.isInteger(v), v <= sldTwinInlineHeight(win)]).toEqual([
          win,
          viewport,
          true,
          true,
        ]);
        // Either the full reserve is free, or the card sits at its floor.
        expect([win, viewport, free >= SLD_TWIN_SCROLL_RESERVE || v === SLD_TWIN_INLINE_FLOOR]).toEqual(
          [win, viewport, true],
        );
      }
    }
  });

  it('a short viewport (split screen / pop-up window): page ALWAYS stays free — the gutter beats the floor', () => {
    // 400 dp split-screen half minus header + tabs ≈ 280 pt of body: the
    // 360 pt floor would cover it all.
    expect(sldTwinInlineHeight(400, 280)).toBe(280 - SLD_TWIN_MIN_FREE);
    expect(sldTwinInlineHeight(667, 360)).toBe(360 - SLD_TWIN_MIN_FREE);
    // The floor still holds while the gutter fits beside it.
    expect(sldTwinInlineHeight(667, SLD_TWIN_INLINE_FLOOR + SLD_TWIN_MIN_FREE)).toBe(SLD_TWIN_INLINE_FLOOR);
    expect(sldTwinInlineHeight(667, 470)).toBe(SLD_TWIN_INLINE_FLOOR);
    // Degenerate viewports never give a negative card.
    expect(sldTwinInlineHeight(400, 40)).toBe(0);
    for (const viewport of [120, 200, 280, 320, 360, 400, 448, 470, 520, 690]) {
      const v = sldTwinInlineHeight(812, viewport);
      expect([viewport, Number.isInteger(v), v >= 0, viewport - v >= SLD_TWIN_MIN_FREE]).toEqual([
        viewport,
        true,
        true,
        true,
      ]);
    }
  });
});

/** Phones (portrait windows + their safe-area insets). */
const DEVICES: { label: string; w: number; h: number; top: number; bottom: number }[] = [
  { label: 'iPhone 13 mini (375×812)', w: 375, h: 812, top: 50, bottom: 34 },
  { label: 'iPhone 15 (390×844)', w: 390, h: 844, top: 47, bottom: 34 },
  { label: 'iPhone 15 Pro Max (430×932)', w: 430, h: 932, top: 59, bottom: 34 },
  { label: 'Android 360×740', w: 360, h: 740, top: 24, bottom: 0 },
];

/** RN `rotate: θ` turns CLOCKWISE on screen (y down): R·d = (cos·dx − sin·dy, sin·dx + cos·dy). */
const turn = (deg: number, [x, y]: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * x - Math.sin(a) * y, Math.sin(a) * x + Math.cos(a) * y];
};

const RAIL = sldRailMetrics(44, 50);

describe('the sideways full screen — turned by TRANSFORM, never an OS rotation', () => {
  it('the container is long × short, centred on the window, and covers it exactly once turned', () => {
    for (const d of DEVICES) {
      const c = sldLandscapeContainer(d.w, d.h);
      expect(c.rotation).toBe(SLD_LANDSCAPE_ROTATION_DEG);
      expect([c.width, c.height]).toEqual([d.h, d.w]);
      // Centre on the window centre (RN turns about the view's centre).
      expect(c.left + c.width / 2).toBeCloseTo(d.w / 2, 9);
      expect(c.top + c.height / 2).toBeCloseTo(d.h / 2, 9);
      // The turned box's corners land on the window's corners.
      const cx = d.w / 2;
      const cy = d.h / 2;
      const corners = [
        [c.left, c.top],
        [c.left + c.width, c.top],
        [c.left, c.top + c.height],
        [c.left + c.width, c.top + c.height],
      ].map(([x, y]) => {
        const [rx, ry] = turn(c.rotation, [x - cx, y - cy]);
        // `+ 0`: −0 → 0.
        return [Math.round((rx + cx) * 1e6) / 1e6 + 0, Math.round((ry + cy) * 1e6) / 1e6 + 0];
      });
      const xs = corners.map(p => p[0]).sort((a, b) => a - b);
      const ys = corners.map(p => p[1]).sort((a, b) => a - b);
      expect([xs[0], xs[3], ys[0], ys[3]]).toEqual([0, d.w, 0, d.h]);
    }
  });

  it('the insets are the portrait ones turned: the island on the LEFT, the home indicator on the RIGHT', () => {
    for (const d of DEVICES) {
      const geo = sldLandscapeGeometry(
        { width: d.w, height: d.h },
        { top: d.top, bottom: d.bottom, left: 3, right: 5 },
        RAIL.width,
      );
      expect([geo.width, geo.height, geo.rotation]).toEqual([d.h, d.w, 90]);
      // Content edge directions on screen after the +90° turn:
      //   content left (−x) → up (portrait TOP); right (+x) → down (BOTTOM);
      //   content top (−y) → right (portrait RIGHT); bottom (+y) → left (LEFT).
      const dir = (v: [number, number]) => turn(90, v).map(c => Math.round(c) + 0);
      expect(dir([-1, 0])).toEqual([0, -1]);
      expect(dir([1, 0])).toEqual([0, 1]);
      expect(dir([0, -1])).toEqual([1, 0]);
      expect(dir([0, 1])).toEqual([-1, 0]);
      expect(geo.insets).toEqual({ left: d.top, right: d.bottom, top: 5, bottom: 3 });
    }
  });

  it('the twin fills the safe area left of the rail; the rail stands clear of the home indicator', () => {
    for (const d of DEVICES) {
      const geo = sldLandscapeGeometry(
        { width: d.w, height: d.h },
        { top: d.top, bottom: d.bottom, left: 0, right: 0 },
        RAIL.width,
      );
      const label = d.label;
      expect([label, geo.area.x]).toEqual([label, geo.insets.left]);
      expect([label, geo.area.x + geo.area.w]).toEqual([label, geo.rail.x]);
      expect([label, geo.area.y, geo.area.h]).toEqual([label, geo.insets.top, geo.height - geo.insets.top - geo.insets.bottom]);
      expect([label, geo.rail.w]).toEqual([label, RAIL.width]);
      expect([label, geo.rail.x + geo.rail.w + SLD_RAIL_GAP]).toEqual([label, geo.width - geo.insets.right]);
      // The twin keeps most of the long edge.
      expect([label, geo.area.w > geo.width * 0.75]).toEqual([label, true]);
    }
  });

  it('a window already WIDER than tall (Android tablet / foldable / split screen) is not turned', () => {
    const c = sldLandscapeContainer(1280, 800);
    expect(c).toEqual({ width: 1280, height: 800, left: 0, top: 0, rotation: 0 });
    const insets = { top: 24, bottom: 16, left: 40, right: 8 };
    const geo = sldLandscapeGeometry({ width: 1280, height: 800 }, insets, RAIL.width);
    expect([geo.width, geo.height, geo.rotation]).toEqual([1280, 800, 0]);
    // Its own insets, unmapped (nothing is turned).
    expect(geo.insets).toEqual(insets);
    expect(geo.rail.x + geo.rail.w).toBeLessThanOrEqual(1280 - insets.right);
    expect(geo.area.x).toBe(insets.left);
    // Every window: the geometry describes exactly the box the container lays out.
    for (const [w, h] of [
      ...DEVICES.map(d => [d.w, d.h] as [number, number]),
      [1280, 800],
      [884, 1104],
      [1104, 884],
      [600, 600],
    ] as [number, number][]) {
      const container = sldLandscapeContainer(w, h);
      const g = sldLandscapeGeometry({ width: w, height: h }, null, RAIL.width);
      expect([w, h, container.width, container.height, container.rotation]).toEqual([
        w,
        h,
        g.width,
        g.height,
        g.rotation,
      ]);
    }
  });

  it('the rail: round buttons ≥ touch.min (iOS 44, Android 48), wide enough for its caption', () => {
    for (const touchMin of [44, 48]) {
      const m = sldRailMetrics(touchMin);
      expect(m.button).toBeGreaterThanOrEqual(touchMin);
      expect(m.width).toBeGreaterThanOrEqual(m.button);
      expect(m.gap).toBeGreaterThan(0);
    }
    // A caption wider than the button widens the rail (+ 8 pt), never the reverse.
    expect(sldRailMetrics(44, 80).width).toBe(88);
    expect(sldRailMetrics(44, 10).width).toBe(sldRailMetrics(44).width);
    // Close + "Diagram" (button + caption) fit the shortest rail (a 360 pt phone's short edge).
    const small = sldLandscapeGeometry({ width: 360, height: 740 }, { top: 24, bottom: 0, left: 0, right: 0 }, RAIL.width);
    const m = sldRailMetrics(48, 50);
    expect(2 * m.button + m.gap + 4 + 18).toBeLessThan(small.rail.h);
  });
});

/* ─────────── inline: the header row above the panel ─────────── */

/** AppText's rendered size for `fontSize` 11 on a `w`-pt phone at OS scale `os` (floor 11, cap 1.3). */
const headerLabelPt = (w: number, os: number) => Math.max(11, Math.round((11 * w) / 393)) * Math.min(1.3, os);
const widestBold = (labels: string[], pt: number) => Math.max(...labels.map(l => estimateSldTextWidth(l, pt, true)));
const VIEW_LABELS = ['Diagram', '3D'];
const GROUP_LABELS = ['Grouped', 'Units'];
const HEADER_GAP = 8;

/** The header row on a `w`-pt phone, composed like `sldViewHeaderGeometry`. */
const headerAt = (w: number, touchMin: number, os: number, withView = true, withGroup = true) => {
  const normalize = normalizeAt(w);
  const pt = headerLabelPt(w, os);
  const view = withView ? sldHeaderPillMetrics(normalize, touchMin, widestBold(VIEW_LABELS, pt)) : undefined;
  const group = withGroup ? sldHeaderPillMetrics(normalize, touchMin, widestBold(GROUP_LABELS, pt)) : undefined;
  const width = w - 32; // the SiteDetail gutter, both sides
  const button = withView ? touchMin : 0;
  const layout = sldViewHeaderLayout({ width, gap: HEADER_GAP, viewPill: view, groupPill: group, button });
  return { pt, view, group, width, button, layout };
};

describe('the inline header row: [Diagram | 3D] [Grouped | Units] … [full screen]', () => {
  const WIDTHS = [360, 375, 390, 393, 402, 412, 430, 440];
  const SCALES = [0.85, 1, 1.15, 1.3, 2];

  it('every segment is a real target, every label fits its segment unshrunk, nothing overflows', () => {
    for (const w of WIDTHS) {
      for (const touchMin of [44, 48]) {
        for (const os of SCALES) {
          const { pt, view, group, width, button, layout } = headerAt(w, touchMin, os);
          const label = `${w}pt · ${touchMin} · ×${os}`;
          for (const [pill, labels] of [
            [view!, VIEW_LABELS],
            [group!, GROUP_LABELS],
          ] as const) {
            expect([label, pill.segmentWidth >= touchMin, pill.height >= touchMin - EPS]).toEqual([label, true, true]);
            const effective = Math.min(pill.segmentHeight + 2 * pill.slop, pill.height);
            expect([label, effective >= touchMin - EPS]).toEqual([label, true]);
            // The widest label (bold — the selected segment) + its padding.
            expect([label, widestBold(labels, pt) + 2 * SLD_HEADER_LABEL_PAD <= pill.segmentWidth + EPS]).toEqual([
              label,
              true,
            ]);
          }
          if (layout.wrapped) {
            // Line 1: Diagram | 3D … the button; line 2: Grouped | Units.
            expect([label, view!.width + HEADER_GAP + button <= width + EPS]).toEqual([label, true]);
            expect([label, group!.width <= width + EPS]).toEqual([label, true]);
            expect([label, layout.height]).toEqual([label, Math.max(view!.height, button) + HEADER_GAP + group!.height]);
          } else {
            expect([label, view!.width + HEADER_GAP + group!.width + HEADER_GAP + button <= width + EPS]).toEqual([
              label,
              true,
            ]);
            expect([label, layout.height]).toEqual([label, Math.max(view!.height, group!.height, button)]);
          }
        }
      }
    }
  });

  it('wraps exactly when one line would overflow: 360 pt Android, 375 pt with large text', () => {
    // 360 pt Android (48 pt targets): the two pills + the button overflow at
    // the default text size — Grouped | Units drops to a second line.
    expect(headerAt(360, 48, 1).layout.wrapped).toBe(true);
    // Common iPhones at the default size: one line.
    for (const w of [375, 390, 393, 402, 430, 440]) {
      expect([w, headerAt(w, 44, 1).layout.wrapped]).toEqual([w, false]);
    }
    // A 375 pt iPhone at the largest scaled text: two lines.
    expect(headerAt(375, 44, 1.3).layout.wrapped).toBe(true);
    // Larger text than AppText's cap is measured AT the cap (the labels never grow past it).
    expect(headerAt(375, 44, 3)).toEqual(headerAt(375, 44, 1.3));
  });

  it('larger text widens the pills (never shrinks the label)', () => {
    const small = headerAt(393, 44, 1);
    const large = headerAt(393, 44, 1.3);
    expect(large.group!.segmentWidth).toBeGreaterThan(small.group!.segmentWidth);
    expect(large.view!.segmentWidth).toBeGreaterThan(small.view!.segmentWidth);
    // At the default size the pills keep the top pills' geometry (68 pt segments).
    expect(small.group!.width).toBeCloseTo(sldModeToggleMetrics(normalizeAt(393), 2, 44).width, 9);
  });

  it('one switch only: never wraps — Diagram | 3D alone, or Grouped | Units alone (twin failed)', () => {
    for (const w of WIDTHS) {
      const noGroup = headerAt(w, 48, 1.3, true, false);
      expect([w, noGroup.layout.wrapped, noGroup.layout.height]).toEqual([w, false, Math.max(noGroup.view!.height, 48)]);
      expect([w, noGroup.view!.width + HEADER_GAP + 48 <= noGroup.width]).toEqual([w, true]);
      const noView = headerAt(w, 48, 1.3, false, true);
      expect([w, noView.layout.wrapped, noView.layout.height]).toEqual([w, false, noView.group!.height]);
    }
    // Nothing to show: no row.
    expect(sldViewHeaderLayout({ width: 328, gap: HEADER_GAP })).toEqual({ wrapped: false, height: 0 });
  });

  it('the full-screen slot is reserved in both views (Diagram ⇄ 3D never re-flows the row)', () => {
    // The layout depends only on what CAN show (3D can → the slot), not on
    // the current view (sldHosts checks the rendered row in both views).
    const a = headerAt(360, 48, 1);
    // Without the slot the same pills would fit one line on a 360 pt phone.
    const withoutSlot = sldViewHeaderLayout({ width: a.width, gap: HEADER_GAP, viewPill: a.view, groupPill: a.group });
    expect(withoutSlot.wrapped).toBe(false);
    expect(a.layout.wrapped).toBe(true);
  });
});

describe('inline 2D no longer reserves the Grouped | Units strip; the 2D full screen still does', () => {
  it('inline: no overlay → plain fit, no mask band, no strip in the panel height', () => {
    for (const [name, l] of [
      ['Grouped', GROUPED],
      ['Units', UNITS],
    ] as const) {
      const h = sldPanelHeight({
        viewWidth: INLINE_W,
        contentWidth: l.bounds.width,
        contentHeight: l.bounds.height,
        minHeight: 318,
        maxHeight: 722,
      });
      const fit = computeSldFit({
        viewWidth: INLINE_W,
        viewHeight: h,
        contentWidth: l.bounds.width,
        contentHeight: l.bounds.height,
        focusY: l.focus.y,
        cards: cardRects(l),
      });
      expect([name, fit.reserve, fit.mask]).toEqual([name, 'none', 0]);
    }
    // Grouped Lucky: exactly the diagram's own height (the strip is gone).
    expect(
      sldPanelHeight({
        viewWidth: INLINE_W,
        contentWidth: GROUPED.bounds.width,
        contentHeight: GROUPED.bounds.height,
        minHeight: 318,
        maxHeight: 722,
      }),
    ).toBe(Math.ceil(GROUPED.bounds.height * (INLINE_W / 360)));
  });

  it('full screen (Units, iPhone 17 Pro): the pill keeps its masked strip', () => {
    const fit = computeSldFit({
      ...PORTRAIT,
      contentWidth: UNITS.bounds.width,
      contentHeight: UNITS.bounds.height,
      insets: IPHONE_17_PRO,
      overlay: PILL,
      focusY: UNITS.focus.y,
      cards: cardRects(UNITS),
    });
    expect(fit.reserve).toBe('top');
    expect(fit.mask).toBeCloseTo(IPHONE_17_PRO.top + STRIP, 9);
  });
});

/* ─────────── the sideways rail's Group | Units ─────────── */

describe('the sideways rail: Close, Diagram, Group | Units', () => {
  /** Portrait phones: width × height and their portrait insets. */
  const PHONES: { w: number; h: number; top: number; bottom: number }[] = [
    { w: 360, h: 740, top: 24, bottom: 0 },
    { w: 360, h: 800, top: 24, bottom: 48 },
    { w: 375, h: 812, top: 50, bottom: 34 },
    { w: 390, h: 844, top: 47, bottom: 34 },
    { w: 412, h: 915, top: 24, bottom: 48 },
    { w: 430, h: 932, top: 59, bottom: 34 },
    { w: 440, h: 956, top: 62, bottom: 34 },
  ];
  /** The "Diagram" caption's gap + its tallest line (lineHeight 14 floored-up, × the 1.2 cap). */
  const CAPTION = { gap: 4, line: Math.round(14 * (11 / 10)) * 1.2 };
  const GROUP_RAIL_LABELS = ['Group', 'Units'];

  it('every segment is ≥ touch.min tall AND wide (the pill is a round button wide)', () => {
    for (const touchMin of [44, 48]) {
      const m = sldRailMetrics(touchMin, 60);
      expect([touchMin, m.segment >= touchMin, sldRailSegmentInner(m) >= touchMin]).toEqual([touchMin, true, true]);
      expect([touchMin, m.button >= touchMin]).toEqual([touchMin, true]);
      expect(sldRailPillHeight(m)).toBe(2 * m.segment + 2 * (m.pad + m.border));
      // The rail stays as wide as the round button + its sides, or the caption.
      expect(m.width).toBeGreaterThanOrEqual(m.button);
    }
  });

  it('the whole stack fits the rail on every phone’s short edge (360–440 pt)', () => {
    for (const d of PHONES) {
      for (const touchMin of [44, 48]) {
        const caption = estimateSldTextWidth('Diagram', Math.max(11, Math.round((11 * d.w) / 393)) * 1.2, true);
        const m = sldRailMetrics(touchMin, caption);
        const geo = sldLandscapeGeometry({ width: d.w, height: d.h }, { top: d.top, bottom: d.bottom, left: 0, right: 0 }, m.width);
        const stack = sldRailStackHeight(m, CAPTION, true);
        expect([d.w, d.h, touchMin, stack <= geo.rail.h]).toEqual([d.w, d.h, touchMin, true]);
        // Without Group | Units the stack is just Close + Diagram.
        expect(sldRailStackHeight(m, CAPTION, false)).toBe(stack - m.gap - sldRailPillHeight(m));
      }
    }
  });

  it('"Group" (bold) still fits its segment at the capped OS text scale — never shrunk on phones', () => {
    const perPt = Math.max(...GROUP_RAIL_LABELS.map(l => estimateSldTextWidth(l, 1, true)));
    for (const w of [360, 375, 390, 393, 402, 412, 430, 440]) {
      for (const touchMin of [44, 48]) {
        const m = sldRailMetrics(touchMin, 60);
        const inner = sldRailSegmentInner(m);
        const fontPt = Math.max(11, Math.round((11 * w) / 393));
        const fit = sldRailLabelFit(inner, perPt, fontPt, 1.3);
        const label = `${w}pt · ${touchMin}`;
        expect([label, fit.sizeFactor]).toEqual([label, 1]);
        expect([label, fit.maxFontScale >= 1 && fit.maxFontScale <= 1.3]).toEqual([label, true]);
        // At its largest the widest label still fits the segment's inside.
        expect([label, perPt * fontPt * fit.maxFontScale <= inner + EPS]).toEqual([label, true]);
      }
    }
    // A tablet's width-scaled font can't fit even unscaled: shrink to fit, no OS scaling.
    const tablet = sldRailLabelFit(44, perPt, 22, 1.3);
    expect(tablet.maxFontScale).toBe(1);
    expect(tablet.sizeFactor).toBeLessThan(1);
    expect(perPt * 22 * tablet.sizeFactor).toBeCloseTo(44, 9);
    // Degenerate input: no scaling, no shrink.
    expect(sldRailLabelFit(0, perPt, 11)).toEqual({ sizeFactor: 1, maxFontScale: 1 });
  });
});
