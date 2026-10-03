/**
 * SLD viewport geometry — the width-filling initial fit (`computeSldFit`)
 * that centres a tall diagram on its hub and keeps a fitting one inside the
 * safe area and clear of the persistent mode pill, the inline panel's
 * content-driven height (`sldPanelHeight`), and the pill's touch target.
 */
import { it, expect, describe } from '@jest/globals';
import {
  computeSldFit,
  sldClampTranslate,
  SLD_MAX_FIT_SCALE,
  SLD_MIN_TOUCH_TARGET,
  SLD_NO_INSETS,
  SLD_ZOOM_STEP,
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
} from '../src/components/screens/Authenticated/SiteDetail/components/sldViewportFit';
import { buildSldPhoneLayout, SLD_PHONE_CARD, SldPhoneLayout } from '../src/utils/sldPhoneLayout';
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
