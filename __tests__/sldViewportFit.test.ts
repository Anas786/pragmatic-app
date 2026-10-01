/**
 * SLD viewport geometry — safe-area insets through the full-screen rotation
 * (`rotateInsets`) and the initial fit (`computeSldFit`) that keeps the
 * diagram inside the safe area and clear of the persistent mode pill.
 */
import { it, expect, describe } from '@jest/globals';
import {
  computeSldFit,
  rotateInsets,
  SLD_FULLSCREEN_ROTATION_DEG,
  SLD_MIN_TOUCH_TARGET,
  SLD_NO_INSETS,
  SldFit,
  SldFitInput,
  SldInsets,
  sldModeToggleMetrics,
  SldOverlayBox,
} from '../src/components/screens/Authenticated/SiteDetail/components/sldViewportFit';

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

/** Inline viewport (393pt phone) and the rotated full-screen viewport. */
const INLINE = { viewWidth: 369, viewHeight: 480 };
const LANDSCAPE = { viewWidth: 874, viewHeight: 402 };

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

const EPS = 1e-9;

describe('rotateInsets', () => {
  it('maps a +90° turn: device top → content left (the Dynamic Island case)', () => {
    expect(rotateInsets(IPHONE_17_PRO, 90)).toEqual({ top: 0, right: 34, bottom: 0, left: 62 });
    expect(rotateInsets(ANDROID_E2E, 90)).toEqual({ top: 0, right: 48, bottom: 0, left: 24 });
    expect(rotateInsets({ top: 1, right: 2, bottom: 3, left: 4 }, 90)).toEqual({
      top: 2, // device right
      right: 3, // device bottom
      bottom: 4, // device left
      left: 1, // device top
    });
  });

  it('handles every quarter turn, normalising the angle', () => {
    const d = { top: 1, right: 2, bottom: 3, left: 4 };
    expect(rotateInsets(d, 0)).toEqual(d);
    expect(rotateInsets(d, 360)).toEqual(d);
    expect(rotateInsets(d, 180)).toEqual({ top: 3, right: 4, bottom: 1, left: 2 });
    expect(rotateInsets(d, -90)).toEqual({ top: 4, right: 1, bottom: 2, left: 3 });
    expect(rotateInsets(d, 270)).toEqual(rotateInsets(d, -90));
    expect(rotateInsets(d, 450)).toEqual(rotateInsets(d, 90));
  });

  it('agrees with the RN rotate matrix (clockwise on a y-down screen)', () => {
    // Outward normal of each edge, in content (pre-rotation) coordinates.
    const normals: Record<keyof SldInsets, [number, number]> = {
      top: [0, -1],
      right: [1, 0],
      bottom: [0, 1],
      left: [-1, 0],
    };
    const edgeOf = ([x, y]: [number, number]): keyof SldInsets =>
      (Object.keys(normals) as (keyof SldInsets)[]).find(
        k => Math.abs(normals[k][0] - x) < 1e-9 && Math.abs(normals[k][1] - y) < 1e-9,
      )!;
    const device = { top: 11, right: 22, bottom: 33, left: 44 };
    for (const deg of [0, 90, 180, 270, -90]) {
      const t = (deg * Math.PI) / 180;
      const content = rotateInsets(device, deg);
      for (const edge of Object.keys(normals) as (keyof SldInsets)[]) {
        const [x, y] = normals[edge];
        // RN `rotate: θ` draws content vector (x, y) at R(θ)·(x, y).
        const screen: [number, number] = [
          Math.round(Math.cos(t) * x - Math.sin(t) * y),
          Math.round(Math.sin(t) * x + Math.cos(t) * y),
        ];
        expect([deg, edge, content[edge]]).toEqual([deg, edge, device[edgeOf(screen)]]);
      }
    }
  });

  it('matches the rotation the full-screen route applies', () => {
    // SLDViewport's `rotated` pan remap (tx += dy; ty -= dx) is the inverse
    // of exactly this turn — both must change together.
    expect(SLD_FULLSCREEN_ROTATION_DEG).toBe(90);
  });
});

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

describe('computeSldFit', () => {
  it('without insets or overlay is the plain centred fit (inline unchanged)', () => {
    const input = { ...INLINE, contentWidth: 1960, contentHeight: 1020 };
    expect(computeSldFit(input)).toEqual({
      scale: Math.min(369 / 1960, 480 / 1020),
      translateX: 0,
      translateY: 0,
      reserve: 'none',
    });
    expect(computeSldFit({ ...input, insets: SLD_NO_INSETS })).toEqual(computeSldFit(input));
  });

  it('fits inside the rotated safe area, clear of the Dynamic Island', () => {
    const insets = rotateInsets(IPHONE_17_PRO, SLD_FULLSCREEN_ROTATION_DEG);
    // Aspect ≈ the landscape viewport's: the plain fit spans its full width.
    const input = { ...LANDSCAPE, contentWidth: 1960, contentHeight: 1020, insets };
    const fit = computeSldFit(input);
    expect(fit.scale).toBeCloseTo(Math.min((874 - 62 - 34) / 1960, 402 / 1020), 12);
    // Centred in the safe rect: shifted right by (left − right) / 2.
    expect(fit.translateX).toBe((62 - 34) / 2);
    expect(fit.translateY).toBe(0);
    const b = box(input, fit);
    expect(b.x).toBeGreaterThanOrEqual(62 - EPS);
    expect(b.x + b.w).toBeLessThanOrEqual(874 - 34 + EPS);
    // Without the insets the same diagram reached under the island.
    const naive = box(input, computeSldFit({ ...input, insets: undefined }));
    expect(naive.x).toBeLessThan(62);
  });

  it('keeps the plain fit when the diagram already clears the pill', () => {
    // Width-limited inline diagram: lots of vertical slack above it.
    const input = { ...INLINE, contentWidth: 1960, contentHeight: 1020 };
    const withPill = computeSldFit({ ...input, overlay: PILL });
    expect(withPill).toEqual(computeSldFit(input));
    expect(withPill.reserve).toBe('none');
  });

  it('reserves a right strip when that keeps the larger scale', () => {
    // Height-limited with horizontal slack (grouped-like aspect).
    const insets = rotateInsets(IPHONE_17_PRO, 90);
    const input = { ...LANDSCAPE, contentWidth: 1200, contentHeight: 900, insets, overlay: PILL };
    const plain = computeSldFit({ ...input, overlay: undefined });
    const fit = computeSldFit(input);
    expect(fit.reserve).toBe('right');
    // The slack absorbs the strip: no zoom lost, the diagram only slides left.
    expect(fit.scale).toBeCloseTo(plain.scale, 12);
    expect(fit.translateX).toBe((62 - (34 + PILL.edge + PILL.width + PILL.gap)) / 2);
  });

  it('reserves a top strip when the aspect leaves no side room', () => {
    // Aspect-matched (units-like) diagram fills the landscape safe area.
    const insets = rotateInsets(IPHONE_17_PRO, 90);
    const input = { ...LANDSCAPE, contentWidth: 1960, contentHeight: 1020, insets, overlay: PILL };
    const fit = computeSldFit(input);
    expect(fit.reserve).toBe('top');
    const strip = PILL.edge + PILL.height + PILL.gap;
    expect(fit.scale).toBeCloseTo(Math.min(778 / 1960, (402 - strip) / 1020), 12);
    expect(fit.translateY).toBe(strip / 2);
  });

  it('never fits the diagram under the pill or outside the safe area', () => {
    const insetSets: SldInsets[] = [
      SLD_NO_INSETS,
      rotateInsets(IPHONE_17_PRO, 90),
      rotateInsets(ANDROID_E2E, 90),
      { top: 30, right: 10, bottom: 5, left: 20 },
    ];
    const views = [INLINE, LANDSCAPE, { viewWidth: 320, viewHeight: 320 }];
    const contents = [
      [1960, 1020],
      [1200, 900],
      [600, 1400],
      [900, 300],
      [160, 160],
    ];
    for (const view of views) {
      for (const insets of insetSets) {
        for (const [contentWidth, contentHeight] of contents) {
          const input = { ...view, contentWidth, contentHeight, insets, overlay: PILL };
          const fit = computeSldFit(input);
          const b = box(input, fit);
          const label = JSON.stringify({ view, insets, contentWidth, contentHeight });
          // Inside the safe rect…
          expect([label, b.x >= insets.left - EPS]).toEqual([label, true]);
          expect([label, b.y >= insets.top - EPS]).toEqual([label, true]);
          expect([label, b.x + b.w <= view.viewWidth - insets.right + EPS]).toEqual([label, true]);
          expect([label, b.y + b.h <= view.viewHeight - insets.bottom + EPS]).toEqual([label, true]);
          // …and at least `gap` away from the pill (top-right of the safe rect).
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
  });

  it('breaks a top/right tie towards the top strip', () => {
    // Square overlay + square view/content → both strips cost the same.
    const sq: SldOverlayBox = { width: 40, height: 40, edge: 10, gap: 10 };
    const fit = computeSldFit({
      viewWidth: 400,
      viewHeight: 400,
      contentWidth: 100,
      contentHeight: 100,
      overlay: sq,
    });
    expect(fit.reserve).toBe('top');
    expect(fit.scale).toBeCloseTo((400 - 60) / 100, 12);
  });
});
