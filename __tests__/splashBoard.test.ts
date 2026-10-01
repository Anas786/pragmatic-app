/**
 * Cold-start splash (src/components/screens/Onboarding/Splash) — pure-logic
 * tests. No Skia runtime: the scene is built against a stubbed Skia API and
 * drawn onto a counting fake canvas.
 */
import { describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer from 'react-test-renderer';
import type { FrameInfo, SharedValue } from 'react-native-reanimated';
import {
  buildBoard,
  keepOutFor,
  type Board,
  type BuildBoardArgs,
} from '../src/components/screens/Onboarding/Splash/board';
import * as draw from '../src/components/screens/Onboarding/Splash/draw';
import * as ease from '../src/components/screens/Onboarding/Splash/ease';
import {
  buildScene,
  type Scene,
  type SkiaApi,
} from '../src/components/screens/Onboarding/Splash/scene';
import {
  useSplashClock,
  type SplashClock,
  type SplashClockArgs,
} from '../src/components/screens/Onboarding/Splash/useSplashClock';
import {
  DEBUG_FREEZE_REAL_MS,
  DEBUG_HOLD,
  EXIT,
  K,
  REDUCED_TL,
  WEB_TL,
  timelineInvariantErrors,
} from '../src/components/screens/Onboarding/Splash/timeline';

// Capture the splash frame callback so the clock state machine can be
// stepped frame-by-frame (the global mock keeps it inert).
const mockFrame: { cb: ((fi: FrameInfo) => void) | null } = { cb: null };
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...(jest.requireActual('react-native-reanimated/mock') as object),
  useReducedMotion: () => false,
  useFrameCallback: (cb: (fi: FrameInfo) => void) => {
    mockFrame.cb = cb;
    return { setActive: () => undefined, isActive: false, callbackId: -1 };
  },
}));

// The verbatim minified web generator — the parity oracle.
const { webBoard } = require('./fixtures/webBoardGenerator') as {
  webBoard: (args: BuildBoardArgs) => Board;
};

const VIEWPORTS: Array<[number, number]> = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
];

/* ───────────────────────── 1. web parity ───────────────────────── */

describe('board generator — web parity', () => {
  it.each(VIEWPORTS)('matches the web generator exactly at %ix%i', (W, H) => {
    const args = () => ({
      width: W,
      height: H,
      keepOut: keepOutFor(W, H),
      seed: 7,
      tl: WEB_TL,
    });
    const ours = buildBoard(args());
    const web = webBoard(args());
    expect(ours).toEqual(web);
    expect(ours.traces.length).toBeGreaterThanOrEqual(24);
  });

  it('generates 24 traces at 390x844', () => {
    const b = buildBoard({
      width: 390,
      height: 844,
      keepOut: keepOutFor(390, 844),
      tl: WEB_TL,
    });
    expect(b.traces).toHaveLength(24);
  });
});

/* ───────────────────────── 2. worklet guard ───────────────────────── */

describe('worklet directives', () => {
  const modules: Record<string, Record<string, unknown>> = { draw, ease };
  for (const [name, mod] of Object.entries(modules)) {
    it(`every exported function in ${name}.ts is a worklet`, () => {
      const fns = Object.entries(mod).filter(([, v]) => typeof v === 'function');
      expect(fns.length).toBeGreaterThan(0);
      for (const [key, fn] of fns) {
        expect([key, (fn as { __workletHash?: number }).__workletHash]).toEqual([
          key,
          expect.any(Number),
        ]);
      }
    });
  }
});

/* ───────────────────────── 3. easing ───────────────────────── */

/** Reference cubic-bezier: 60-step bisection on x(t). */
const refBezier = (
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) => {
  const bx = (t: number) =>
    3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t: number) =>
    3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return by((lo + hi) / 2);
};

describe('ease', () => {
  const named: Array<[string, (x: number) => number, number[]]> = [
    ['easeGlyph', ease.easeGlyph, [0.65, 0, 0.35, 1]],
    ['easeCaption', ease.easeCaption, [0.2, 0.7, 0.2, 1]],
    ['easeExit', ease.easeExit, [0.4, 0, 0.6, 1]],
    ['easeOut', ease.easeOut, [0, 0, 0.58, 1]],
    ['easeInOut', ease.easeInOut, [0.42, 0, 0.58, 1]],
  ];

  it.each(named)('%s hits its endpoints and ignores NaN', (_n, fn) => {
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
    expect(fn(-3)).toBe(0);
    expect(fn(7)).toBe(1);
    expect(fn(NaN)).toBe(0);
  });

  it.each(named)('%s matches a reference cubic-bezier to 1e-4', (_n, fn, cp) => {
    for (let i = 1; i < 200; i++) {
      const x = i / 200;
      expect(Math.abs(fn(x) - refBezier(x, cp[0], cp[1], cp[2], cp[3]))).toBeLessThan(
        1e-4,
      );
    }
  });

  it('easeInOut is symmetric about .5', () => {
    expect(ease.easeInOut(0.5)).toBeCloseTo(0.5, 4);
  });

  it('clamp01 / easeOutCubic', () => {
    expect(ease.clamp01(NaN)).toBe(0);
    expect(ease.clamp01(-1)).toBe(0);
    expect(ease.clamp01(2)).toBe(1);
    expect(ease.clamp01(0.25)).toBe(0.25);
    expect(ease.easeOutCubic(0)).toBe(0);
    expect(ease.easeOutCubic(1)).toBe(1);
    expect(ease.easeOutCubic(0.5)).toBeCloseTo(0.875, 10);
  });

  it('dotOpacity follows the web sit-dot keyframes', () => {
    expect(ease.dotOpacity(0, 0)).toBeCloseTo(0.25, 6);
    expect(ease.dotOpacity(360, 0)).toBeCloseTo(1, 6); // 30% of 1.2 s
    expect(ease.dotOpacity(1200, 0)).toBeCloseTo(0.25, 6);
    expect(ease.dotOpacity(100, 1)).toBe(0.25); // before its 200 ms delay
    expect(ease.dotOpacity(560, 1)).toBeCloseTo(1, 6);
    for (let t = 0; t < 5000; t += 7) {
      for (let i = 0; i < 3; i++) {
        const o = ease.dotOpacity(t, i);
        expect(o).toBeGreaterThanOrEqual(0.25 - 1e-9);
        expect(o).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});

/* ───────────────────────── 4. timeline ───────────────────────── */

describe('timeline', () => {
  it('holds every invariant', () => {
    expect(timelineInvariantErrors()).toEqual([]);
    expect(WEB_TL.minShow + WEB_TL.landFlare + WEB_TL.landFade).toBe(3610);
    expect(Math.abs(3610 * K - 2200)).toBeLessThan(1);
    expect(WEB_TL.packetsStart).toBeLessThan(WEB_TL.minShow);
    expect(WEB_TL.premountAt).toBeLessThan(WEB_TL.minShow);
    expect(REDUCED_TL.minShow + REDUCED_TL.landFade).toBe(1220);
  });

  it('ships with the DEV verification knobs off', () => {
    expect(DEBUG_FREEZE_REAL_MS).toBeNull();
    expect(DEBUG_HOLD).toBe(false);
  });
});

/* ───────────────────────── 5. draw safety ───────────────────────── */

interface Counters {
  ops: number;
  depth: number;
  minDepth: number;
  saves: number;
  restores: number;
  badSegments: number;
  segments: number;
}

const fresh = (): Counters => ({
  ops: 0,
  depth: 0,
  minDepth: 0,
  saves: 0,
  restores: 0,
  badSegments: 0,
  segments: 0,
});

function makeFakeSkia(cnt: { current: Counters }) {
  const noop = () => undefined;
  const makePaint = () => ({
    setAntiAlias: noop,
    setStyle: noop,
    setColor: noop,
    setStrokeCap: noop,
    setStrokeJoin: noop,
    setStrokeWidth: noop,
    setAlphaf: noop,
    setShader: noop,
    setImageFilter: noop,
  });
  const makePath = () => {
    const p: Record<string, unknown> = {};
    const chain = () => p;
    Object.assign(p, {
      moveTo: chain,
      lineTo: chain,
      rewind: chain,
      setFillType: chain,
      addCircle: chain,
      computeTightBounds: () => ({ x: 360, y: 10, width: 300, height: 90 }),
    });
    return p;
  };
  const canvas = {
    drawPath: () => {
      cnt.current.ops++;
    },
    drawCircle: () => {
      cnt.current.ops++;
    },
    drawRect: () => {
      cnt.current.ops++;
    },
    drawPicture: () => {
      cnt.current.ops++;
    },
    save: () => {
      cnt.current.saves++;
      cnt.current.depth++;
    },
    saveLayer: () => {
      cnt.current.saves++;
      cnt.current.depth++;
    },
    restore: () => {
      cnt.current.restores++;
      cnt.current.depth--;
      cnt.current.minDepth = Math.min(cnt.current.minDepth, cnt.current.depth);
    },
    translate: noop,
    scale: noop,
  };
  const contour = {
    length: () => 1200,
    getSegment: (_start: number, stop: number) => {
      cnt.current.segments++;
      if (!(stop > 0.01)) {
        cnt.current.badSegments++;
      }
      return makePath();
    },
  };
  const matrix: Record<string, unknown> = {};
  Object.assign(matrix, { translate: () => matrix, scale: () => matrix });
  const api = {
    Paint: makePaint,
    Color: () => new Float32Array(4),
    Point: (x: number, y: number) => ({ x, y }),
    XYWHRect: (x: number, y: number, width: number, height: number) => ({
      x,
      y,
      width,
      height,
    }),
    Path: { Make: makePath, MakeFromSVGString: () => makePath() },
    Matrix: () => matrix,
    Surface: {
      Make: () => ({
        getCanvas: () => ({ drawCircle: noop }),
        flush: noop,
        makeImageSnapshot: () => ({ makeShaderOptions: () => ({}) }),
      }),
    },
    Shader: { MakeLinearGradient: () => ({}) },
    ImageFilter: {
      MakeDropShadow: () => ({}),
      MakeDropShadowOnly: () => ({}),
    },
    ContourMeasureIter: () => ({ next: () => contour }),
    PictureRecorder: () => ({
      beginRecording: () => canvas,
      finishRecordingAsPicture: () => ({ kind: 'picture' }),
      dispose: noop,
    }),
  };
  return { api: api as unknown as SkiaApi, canvas };
}

describe('draw safety', () => {
  const W = 390;
  const H = 844;

  const run = (
    reduced: boolean,
    frames: Array<[number, number, number, number]>,
  ) => {
    const cnt = { current: fresh() };
    const { api, canvas } = makeFakeSkia(cnt);
    const scene: Scene = buildScene(W, H, 3, reduced, api);
    expect(scene.tr).toHaveLength(24);
    expect(scene.glyph).toHaveLength(5);
    if (reduced) {
      expect(scene.reducedBoard).not.toBeNull();
    }
    let maxOps = 0;
    let badSegments = 0;
    let segments = 0;
    for (const [w, kind, exitAtW, logoExitAtW] of frames) {
      cnt.current = fresh();
      expect(() =>
        draw.drawFrame(
          canvas as never,
          scene,
          w,
          kind,
          exitAtW,
          logoExitAtW,
          reduced,
        ),
      ).not.toThrow();
      expect(cnt.current.depth).toBe(0);
      expect(cnt.current.minDepth).toBe(0);
      expect(cnt.current.saves).toBe(cnt.current.restores);
      maxOps = Math.max(maxOps, cnt.current.ops);
      badSegments += cnt.current.badSegments;
      segments += cnt.current.segments;
    }
    return { maxOps, badSegments, segments };
  };

  const sweep = (from: number, to: number) => {
    const out: number[] = [];
    for (let w = from; w <= to; w += 16) {
      out.push(w);
    }
    return out;
  };

  it('motion: 0–5000 w never throws, balances layers, stays within budget', () => {
    const r = run(
      false,
      sweep(0, 5000).map(w => [w, EXIT.NONE, -1, -1]),
    );
    expect(r.badSegments).toBe(0);
    expect(r.segments).toBeGreaterThan(0);
    expect(r.maxOps).toBeLessThanOrEqual(400);
  });

  it('motion: land at 2750 through the full exit', () => {
    const r = run(
      false,
      sweep(2750, 5000).map(w => [w, EXIT.LAND, 2750, 2870]),
    );
    expect(r.badSegments).toBe(0);
    expect(r.maxOps).toBeLessThanOrEqual(400);
  });

  it('motion: abort keeps drawing safely', () => {
    const r = run(
      false,
      sweep(4000, 5000).map(w => [w, EXIT.ABORT, 4000, -1]),
    );
    expect(r.badSegments).toBe(0);
  });

  it('reduced: 0–5000 w (static board picture) and land at 900', () => {
    const idle = run(
      true,
      sweep(0, 5000).map(w => [w, EXIT.NONE, -1, -1]),
    );
    expect(idle.segments).toBe(0); // no stroke pass in reduced motion
    const land = run(
      true,
      sweep(900, 2000).map(w => [w, EXIT.LAND, 900, 900]),
    );
    expect(land.maxOps).toBeLessThanOrEqual(400);
  });

  it('recordFrame never throws and always returns a picture', () => {
    const cnt = { current: fresh() };
    const { api } = makeFakeSkia(cnt);
    const scene = buildScene(W, H, 3, false, api);
    const broken = {
      ...scene,
      api: {
        ...(scene.api as object),
        PictureRecorder: () => ({
          beginRecording: () => ({
            drawRect: () => {
              throw new Error('boom');
            },
          }),
          finishRecordingAsPicture: () => ({ kind: 'picture' }),
          dispose: () => undefined,
        }),
      },
    } as unknown as Scene;
    expect(draw.recordFrame(broken, 1000, EXIT.NONE, -1, -1, false)).toEqual({
      kind: 'picture',
    });
    expect(draw.recordFrame(scene, 1000, EXIT.NONE, -1, -1, false)).toEqual({
      kind: 'picture',
    });
  });
});

/* ───────────────────────── 6. clock state machine ───────────────────────── */

describe('splash clock', () => {
  const FRAME = 1000 / 60;

  interface Sim {
    mountAt: number | null;
    mountKind: number | null;
    neutralAt: number | null;
    destSeenAt: number | null;
    exitedAt: number | null;
    exitedCalls: number;
    clock: SplashClock;
  }

  /**
   * Steps the real frame callback at 60 fps. `authAt` (real ms) is when
   * auth + caption are committed (null = never). The destination reports
   * ready two frames after it is requested.
   */
  const simulate = (authAt: number | null, reduced = false, limit = 30000) => {
    const destReady = { value: 0 } as SharedValue<number>;
    const sim = {
      mountAt: null,
      mountKind: null,
      neutralAt: null,
      destSeenAt: null,
      exitedAt: null,
      exitedCalls: 0,
    } as unknown as Sim;
    let now = 0;
    let readyAt: number | null = null;
    const args: SplashClockArgs = {
      reduced,
      destReady,
      requestMount: kind => {
        if (sim.mountAt === null) {
          sim.mountAt = now;
          sim.mountKind = kind;
          readyAt = now + 2 * FRAME;
        }
      },
      requestNeutralCaption: () => {
        sim.neutralAt = sim.neutralAt ?? now;
        sim.clock.captionLatched.value = 1;
      },
      onDestReady: () => {
        sim.destSeenAt = now;
      },
      onExited: () => {
        sim.exitedCalls++;
        sim.exitedAt = sim.exitedAt ?? now;
      },
    };
    function Harness() {
      sim.clock = useSplashClock(args);
      return null;
    }
    mockFrame.cb = null;
    renderer.act(() => {
      renderer.create(React.createElement(Harness));
    });
    const cb = mockFrame.cb as unknown as (fi: FrameInfo) => void;
    expect(cb).toBeTruthy();
    // First frame after activation has no previous frame.
    cb({ timestamp: 0, timeSincePreviousFrame: null, timeSinceFirstFrame: 0 });
    while (now < limit && sim.exitedAt === null) {
      now += FRAME;
      if (authAt !== null && now >= authAt && sim.clock.authReady.value === 0) {
        sim.clock.captionLatched.value = 1;
        sim.clock.authReady.value = 1;
      }
      if (readyAt !== null && now >= readyAt) {
        destReady.value = 1;
      }
      cb({
        timestamp: now,
        timeSincePreviousFrame: FRAME,
        timeSinceFirstFrame: now,
      });
    }
    // The loop stops itself: extra frames after DONE are no-ops.
    for (let i = 0; i < 5; i++) {
      cb({ timestamp: now, timeSincePreviousFrame: FRAME, timeSinceFirstFrame: now });
    }
    return sim;
  };

  it('auth ready at once: pre-mounts immediately, lands, reveals at ~2200 ms', () => {
    const sim = simulate(0);
    expect(sim.mountKind).toBe(EXIT.LAND);
    // premountAt = 0: the mount's UI-thread stall must land on the empty
    // board, never on the ignition climax (it used to be at 2350 w).
    expect(sim.mountAt as number).toBeLessThan(2 * FRAME);
    expect(sim.clock.exitKind.value).toBe(EXIT.LAND);
    expect(Math.abs(sim.clock.exitAtW.value - WEB_TL.minShow)).toBeLessThan(
      FRAME / K,
    );
    expect(sim.destSeenAt).not.toBeNull();
    expect(Math.abs((sim.exitedAt as number) - 2200)).toBeLessThan(2 * FRAME);
    expect(sim.exitedCalls).toBe(1);
    expect(sim.neutralAt).toBeNull();
    expect(sim.clock.captionP.value).toBe(1);
    expect(sim.clock.exitP.value).toBe(1);
  });

  it('late auth: waits (neutral caption at minShow), then lands and exits', () => {
    const sim = simulate(5000);
    expect(Math.abs((sim.neutralAt as number) - 2750 * K)).toBeLessThan(
      2 * FRAME,
    );
    expect(sim.mountKind).toBe(EXIT.LAND);
    expect(sim.mountAt as number).toBeGreaterThanOrEqual(5000);
    expect(sim.exitedAt as number).toBeGreaterThan(5000);
    expect(sim.exitedAt as number).toBeLessThan(5000 + 2000);
    expect(sim.exitedCalls).toBe(1);
  });

  // The clock only decides WHEN to give up; the overlay picks the route
  // (stored session → Drawer, else Login — see splashAbortRouting.test.tsx).
  it('auth never resolves: aborts after STALL_MAX_MS', () => {
    const sim = simulate(null);
    expect(sim.mountKind).toBe(EXIT.ABORT);
    expect(Math.abs((sim.mountAt as number) - 20000)).toBeLessThan(2 * FRAME);
    expect(sim.clock.exitKind.value).toBe(EXIT.ABORT);
    expect(sim.exitedAt as number).toBeLessThan(20000 + 400);
    expect(sim.exitedCalls).toBe(1);
  });

  it('reduced motion: reveals at ~1220 ms real', () => {
    const sim = simulate(0, true);
    expect(Math.abs((sim.exitedAt as number) - 1220)).toBeLessThan(2 * FRAME);
    expect(sim.exitedCalls).toBe(1);
  });
});
