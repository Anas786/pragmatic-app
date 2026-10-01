/**
 * Cold-start splash timeline — a port of the website's "signing-in"
 * animation timeline (`aa` / reduced-motion `as` in the web bundle).
 *
 * Every model constant stays in WEB milliseconds ("w"). Only the clock
 * RATE is warped: while the splash runs, `w` advances at 1/K web-ms per
 * real ms, so the web's 3610 ms (minShow + landFlare + landFade) plays
 * back in exactly 2200 ms real time, exit included. See useSplashClock.
 *
 * Plain data only — safe to capture in worklets.
 */

/** Uniform warp: real = web · K. 3610 web-ms → 2200 real ms. */
export const K = 2200 / 3610;

export const WEB_TL = {
  traceStart: 80,
  traceJitter: 460,
  traceSpeed: 1.9,
  logoStart: 620,
  glyphStagger: 130,
  glyphDraw: 760,
  captionStart: 1500,
  captionDur: 500,
  fillStart: 1700,
  fillStagger: 70,
  fillDuration: 460,
  ignite: 2050,
  igniteTravel: 720,
  litGlowDur: 700,
  breathePeriod: 3200,
  strokeFade: 2150,
  strokeFadeDuration: 700,
  /** Web: 2500. Moved earlier so ~305 ms of packets are visible pre-land. */
  packetsStart: 2250,
  minShow: 2750,
  landFlare: 240,
  landFade: 620,
  abortFade: 240,
  /** NEW: dot-grid fade-in, covers the handoff from the plain native board. */
  gridFade: 300,
  /**
   * NEW: destination pre-mount under the opaque overlay — as soon as auth is
   * known (0 = first clock frame with auth ready). Mounting a screen is a
   * UI-thread stall (measured 70–140 ms for Login on the iOS simulator); at
   * the original 2350 w it landed on the ignition climax. Early, it lands on
   * the near-empty board where a stall is invisible (dt is capped, so the
   * timeline pauses instead of skipping), and the destination's data fetch
   * starts ~1.4 s sooner.
   */
  premountAt: 0,
  /** NEW: proceed with the exit even if the destination never reports layout. */
  destTimeout: 1000,
  /** NEW: if auth is still loading here, latch the neutral caption. */
  captionFallback: 2750,
  /** NEW: publish at 30 fps once stalled this long past minShow. */
  stallThrottleAfter: 1000,
  /** Reduced-motion only (unused in motion mode; kept for one shape). */
  fillDelayReduced: 150,
  fillDurReduced: 350,
  boardFade: 240,
} as const;

/** Web `as` = aa + {minShow 900, landFlare 0, landFade 320}; rate 1, no warp. */
export const REDUCED_TL = {
  ...WEB_TL,
  minShow: 900,
  landFlare: 0,
  landFade: 320,
  captionStart: 100,
  captionFallback: 900,
  premountAt: 0,
} as const;

export type SplashTimeline = {
  readonly [Key in keyof typeof WEB_TL]: number;
};

/**
 * Stop waiting for the auth hydrate after this much FOREGROUND real time.
 * The abort routes to the Drawer when a Cognito session is stored on the
 * device (storedSession.ts — local reads only), else to Login. It never
 * signs anyone out or clears the stored session.
 */
export const STALL_MAX_MS = 20000;
/**
 * Budget for that stored-session probe. It starts at overlay mount (in
 * parallel with the hydrate), so it has always settled — value, error or
 * timeout (= no session → Login) — long before the abort can fire.
 */
export const STORED_SESSION_PROBE_MS = 3000;
/** Per-frame dt cap (real ms): a hitch slows the animation, never skips it. */
export const MAX_DT = 50;
/** JS hard-cut fallbacks in case the UI-thread loop never exits. */
export const FALLBACK_AFTER_AUTH_MS = 4000;
export const FALLBACK_FROM_MOUNT_MS = 24000;

/**
 * Fixed fill-glow blur radii (σ, viewBox units). The web animates one
 * drop-shadow radius (σ 7 lit → 11 breathe peak → 13 land); natively that
 * is approximated by crossfading two FIXED-radius layers, because a blur
 * whose sigma changes every frame needs new GPU kernels and stalls.
 */
export const GLOW_SOFT_SIGMA = 7;
export const GLOW_WIDE_SIGMA = 13;

/**
 * Web-ms before the first trace appears (traceStart = 80). Frames in this
 * window also draw an imperceptible (alpha 1/255) warm-up of every blur /
 * stroke / gradient pipeline the logo uses later, so first-use GPU shader
 * compilation stalls land on the still-empty board instead of mid-logo.
 */
export const WARMUP_BEFORE_W = 80;

export const PHASE = { RUN: 0, DONE: 1 } as const;
export const EXIT = { NONE: 0, LAND: 1, ABORT: 2 } as const;
export type ExitKind = (typeof EXIT)[keyof typeof EXIT];

/*
 * DEV-only verification knobs. MUST stay `null` / `false` in commits —
 * __tests__/splashBoard.test.ts asserts it.
 *  - DEBUG_FREEZE_REAL_MS: freeze the animation (not the clock) at this
 *    real-ms mark, for frame-by-frame screenshots.
 *  - DEBUG_HOLD: never land (keeps the splash up indefinitely).
 */
export const DEBUG_FREEZE_REAL_MS: number | null = null;
export const DEBUG_HOLD: boolean = false;

/** Returns a list of violated timeline invariants (empty = OK). */
export function timelineInvariantErrors(): string[] {
  const errors: string[] = [];
  const t = WEB_TL;
  if (t.minShow + t.landFlare + t.landFade !== 3610) {
    errors.push('minShow + landFlare + landFade must equal 3610 web-ms');
  }
  if (Math.abs(3610 * K - 2200) >= 1) {
    errors.push('3610 web-ms must warp to 2200 real ms');
  }
  if (!(t.packetsStart < t.minShow)) {
    errors.push('packetsStart must precede minShow');
  }
  if (!(t.premountAt < t.minShow)) {
    errors.push('premountAt must precede minShow');
  }
  if (!(REDUCED_TL.premountAt < REDUCED_TL.minShow)) {
    errors.push('reduced premountAt must precede reduced minShow');
  }
  if (!(STORED_SESSION_PROBE_MS < STALL_MAX_MS)) {
    errors.push('the stored-session probe must settle before the stall abort');
  }
  for (let i = 0; i < 5; i++) {
    // Web invariant: each glyph's fill starts no earlier than 80 ms before
    // its stroke finishes drawing.
    const fillAt = t.fillStart + i * t.fillStagger;
    const strokeDone = t.logoStart + i * t.glyphStagger + t.glyphDraw;
    if (fillAt < strokeDone - 80) {
      errors.push(`glyph ${i} fill starts before its stroke is drawn`);
    }
  }
  return errors;
}

if (__DEV__) {
  const errors = timelineInvariantErrors();
  if (errors.length > 0) {
    throw new Error(`Splash timeline invariants violated: ${errors.join('; ')}`);
  }
}
