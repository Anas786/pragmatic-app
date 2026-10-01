/**
 * The splash's single UI-thread clock + state machine.
 *
 * One `useFrameCallback` (registered inactive; the overlay activates it
 * after the scene exists) advances `w` — time in WEB milliseconds — at a
 * warped rate, and drives every phase: caption entrance → destination
 * pre-mount → land (or abort) → destination-ready gating → exit fade →
 * `onExited`. There are no Reanimated timing/repeat animations anywhere in
 * the splash — this clock is the only driver.
 *
 * Clock rate (web-ms per real ms):
 *  - 1/K while running and during the exit (3610 w → 2200 real ms);
 *  - 1 once w ≥ minShow and not yet landed (auth stall / waiting on the
 *    caption), so ambient motion runs at web real time;
 *  - 1 throughout reduced motion.
 * dt is capped at MAX_DT so a hitch slows the animation instead of skipping.
 *
 * ⚠️ The frame callback must stay referentially stable (useFrameCallback
 * re-registers when it changes): its deps are shared values (stable), the
 * `reduced` flag (read once by the overlay) and JS callbacks the caller
 * MUST memoize with stable identity.
 */
import { useCallback } from 'react';
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
  type FrameCallback,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';
import { clamp01, easeCaption } from './ease';
import {
  DEBUG_FREEZE_REAL_MS,
  DEBUG_HOLD,
  EXIT,
  K,
  MAX_DT,
  PHASE,
  REDUCED_TL,
  STALL_MAX_MS,
  WEB_TL,
} from './timeline';

export interface SplashClockArgs {
  reduced: boolean;
  /** Set to 1 (App side) once the destination has laid out + one rAF. */
  destReady: SharedValue<number>;
  /**
   * Mount the destination under the overlay. Called at most once by the
   * clock: EXIT.LAND at the pre-mount (auth known), or EXIT.ABORT at the
   * stall cap (the overlay then routes by the stored-session probe).
   */
  requestMount: (kind: number) => void;
  /** Auth is still loading at captionFallback → latch the neutral caption. */
  requestNeutralCaption: () => void;
  /** The exit is cleared to start (destination ready or timed out). */
  onDestReady: () => void;
  /** The exit fade finished — unmount the overlay. */
  onExited: () => void;
}

export interface SplashClock {
  /** Current time, web-ms. */
  w: SharedValue<number>;
  /** `w` as published to the canvas (throttled to 30 fps while stalled). */
  frameW: SharedValue<number>;
  /** Foreground real ms since the clock started (dt-capped). */
  realMs: SharedValue<number>;
  /** JS → UI: 1 once auth resolved AND the caption text is committed. */
  authReady: SharedValue<number>;
  /** JS → UI: 1 once caption text (any kind) is committed. */
  captionLatched: SharedValue<number>;
  /** Caption entrance progress 0..1 (eased). */
  captionP: SharedValue<number>;
  exitKind: SharedValue<number>;
  exitAtW: SharedValue<number>;
  logoExitAtW: SharedValue<number>;
  /** Root exit fade progress 0..1 (linear; styles apply the easing). */
  exitP: SharedValue<number>;
  /** JS → UI: 1 = fast-forward to minShow (long background). */
  ffRequest: SharedValue<number>;
  clock: FrameCallback;
}

export function useSplashClock({
  reduced,
  destReady,
  requestMount,
  requestNeutralCaption,
  onDestReady,
  onExited,
}: SplashClockArgs): SplashClock {
  const w = useSharedValue(0);
  const frameW = useSharedValue(0);
  const realMs = useSharedValue(0);
  const authReady = useSharedValue(0);
  const captionLatched = useSharedValue(0);
  const captionP = useSharedValue(0);
  const exitKind = useSharedValue<number>(EXIT.NONE);
  const exitAtW = useSharedValue(-1);
  const logoExitAtW = useSharedValue(-1);
  const exitP = useSharedValue(0);
  const ffRequest = useSharedValue(0);

  // Internal state-machine registers.
  const phase = useSharedValue<number>(PHASE.RUN);
  const captionAtW = useSharedValue(-1);
  const neutralAsked = useSharedValue(0);
  const mountAsked = useSharedValue(0);
  const destReadyW = useSharedValue(-1);
  const fadeAtW = useSharedValue(-1);
  const tick = useSharedValue(0);

  const cb = useCallback(
    (fi: FrameInfo) => {
      'worklet';
      if (phase.value === PHASE.DONE) {
        return;
      }
      const T = reduced ? REDUCED_TL : WEB_TL;
      const dt = Math.min(fi.timeSincePreviousFrame ?? 0, MAX_DT);
      realMs.value += dt;
      const landed = exitKind.value !== EXIT.NONE;

      if (ffRequest.value === 1) {
        ffRequest.value = 0;
        if (w.value < T.minShow) {
          w.value = T.minShow;
        }
      }

      const rate = reduced ? 1 : !landed && w.value >= T.minShow ? 1 : 1 / K;
      const frozen =
        DEBUG_FREEZE_REAL_MS !== null && realMs.value >= DEBUG_FREEZE_REAL_MS;
      const W = frozen ? w.value : w.value + dt * rate;
      w.value = W;
      const ok = authReady.value === 1;

      // Caption: neutral fallback, then the entrance once latched.
      if (
        captionLatched.value === 0 &&
        neutralAsked.value === 0 &&
        W >= T.captionFallback
      ) {
        neutralAsked.value = 1;
        runOnJS(requestNeutralCaption)();
      }
      if (
        captionLatched.value === 1 &&
        captionAtW.value < 0 &&
        W >= T.captionStart
      ) {
        captionAtW.value = W;
      }
      if (captionAtW.value >= 0 && captionP.value < 1) {
        const e = easeCaption(clamp01((W - captionAtW.value) / T.captionDur));
        if (e !== captionP.value) {
          captionP.value = e;
        }
      }

      // Pre-mount the destination under the opaque overlay.
      if (ok && mountAsked.value === 0 && W >= T.premountAt) {
        mountAsked.value = 1;
        runOnJS(requestMount)(EXIT.LAND);
      }

      // Land / abort.
      if (!landed && !DEBUG_HOLD) {
        if (ok && captionP.value >= 1 && W >= T.minShow) {
          exitKind.value = EXIT.LAND;
          exitAtW.value = W;
        } else if (!ok && realMs.value >= STALL_MAX_MS) {
          exitKind.value = EXIT.ABORT;
          exitAtW.value = W;
          if (mountAsked.value === 0) {
            mountAsked.value = 1;
            runOnJS(requestMount)(EXIT.ABORT);
          }
        }
      }

      // Destination gating: never reveal a blank container.
      const k2 = exitKind.value;
      if (
        k2 !== EXIT.NONE &&
        destReadyW.value < 0 &&
        (destReady.value === 1 || W - exitAtW.value >= T.destTimeout)
      ) {
        destReadyW.value = W;
        runOnJS(onDestReady)();
      }
      if (k2 !== EXIT.NONE && fadeAtW.value < 0 && destReadyW.value >= 0) {
        if (k2 === EXIT.LAND) {
          logoExitAtW.value = Math.max(
            exitAtW.value + 0.5 * T.landFlare,
            destReadyW.value,
          );
          fadeAtW.value = Math.max(
            exitAtW.value + T.landFlare,
            logoExitAtW.value + 0.5 * T.landFlare,
          );
        } else {
          fadeAtW.value = Math.max(exitAtW.value, destReadyW.value);
        }
      }

      // Exit progress.
      if (fadeAtW.value >= 0) {
        const dur = k2 === EXIT.ABORT ? T.abortFade : T.landFade;
        const p = clamp01((W - fadeAtW.value) / dur);
        if (p !== exitP.value) {
          exitP.value = p;
        }
        if (p >= 1) {
          phase.value = PHASE.DONE;
          runOnJS(onExited)();
          return;
        }
      }

      // Publish the frame time (30 fps while stalled on auth).
      tick.value = (tick.value + 1) % 1024;
      const stalled = !landed && !ok && W >= T.minShow + T.stallThrottleAfter;
      if (!stalled || tick.value % 2 === 0) {
        frameW.value = W;
      }
    },
    [
      reduced,
      destReady,
      requestMount,
      requestNeutralCaption,
      onDestReady,
      onExited,
      phase,
      realMs,
      exitKind,
      ffRequest,
      w,
      authReady,
      captionLatched,
      neutralAsked,
      captionAtW,
      captionP,
      mountAsked,
      exitAtW,
      destReadyW,
      fadeAtW,
      logoExitAtW,
      exitP,
      tick,
      frameW,
    ],
  );

  const clock = useFrameCallback(cb, false);

  return {
    w,
    frameW,
    realMs,
    authReady,
    captionLatched,
    captionP,
    exitKind,
    exitAtW,
    logoExitAtW,
    exitP,
    ffRequest,
    clock,
  };
}
