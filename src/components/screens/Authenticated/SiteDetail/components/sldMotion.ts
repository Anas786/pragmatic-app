/**
 * The Diagram's motion gate — when the flowing dashes and particles may
 * move (honesty + WCAG 2.2.2):
 *
 *   - only while the site's data is LIVE (`dataFreshness` level 'live', the
 *     Summary header's rule): a stale snapshot never looks like energy
 *     flowing right now — the static flowing dashes + arrows still show
 *     the last known state;
 *   - never with the OS Reduce Motion setting on;
 *   - never while the user has paused it (the Pause / Play control).
 *
 * When it is closed by something OTHER than the user's Pause (Reduce
 * Motion, data not live), the Pause / Play control turns into a disabled
 * "animation off" STATE whose spoken label says why
 * ({@link sldMotionOff}) — never a "Pause animation" that does nothing.
 *
 * The 3D view (the web twin, `SldTwin/`) is NOT gated by this: it animates
 * exactly like the web portal (user decision 2026-10-09); the app's honest
 * freshness for it is the Energy-flow header's status.
 *
 * The pure half is Node-testable (`__tests__/sldMotion.test.ts`).
 */

import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useNow } from 'src/hooks/useNow';
import { dataFreshness, freshnessSpoken } from 'src/utils/freshness';

/** Motion gate: live data, OS reduced motion off, not paused by the user. */
export const sldMotionAllowed = (
  live: boolean,
  reducedMotion: boolean,
  paused: boolean,
): boolean => live && !reducedMotion && !paused;

/** Why nothing moves when it is NOT the user's Pause. */
export interface SldMotionOff {
  reason: 'reduced' | 'notLive';
  /** The disabled Pause / Play control's accessibility label. */
  spoken: string;
}

/**
 * {@link SldMotionOff} for the gate's inputs, or null when only the user's
 * Pause (or nothing) stops the motion. Reduce Motion first (an OS setting —
 * it holds even once the data is live again), then data that isn't live
 * (`spokenFreshness`: the screen-reader freshness of the stamp the gate
 * used, e.g. "Delayed, last updated 35 minutes ago").
 */
export const sldMotionOff = (
  live: boolean,
  reducedMotion: boolean,
  spokenFreshness: string | null,
): SldMotionOff | null => {
  if (reducedMotion) {
    return { reason: 'reduced', spoken: 'Animation off: Reduce Motion is on' };
  }
  if (live) return null;
  return {
    reason: 'notLive',
    spoken: `Animation off, the data is not live: ${spokenFreshness ?? 'last update unknown'}`,
  };
};

export interface UseSldMotion {
  /** live && !reduced motion && !paused. */
  motion: boolean;
  /** Why the gate is closed when it isn't the user's Pause; same identity while unchanged. */
  motionOff: SldMotionOff | null;
}

/**
 * The gate for a site's "last data" stamp (`headerLastUpdate`) and the
 * user's Pause. Rides the shared 30 s `useNow` tick, so a site going stale
 * stops the motion within a tick.
 */
export const useSldMotion = (lastUpdate: number | null | undefined, paused: boolean): UseSldMotion => {
  const now = useNow();
  const reducedMotion = useReducedMotion();
  const fresh = dataFreshness(lastUpdate, now);
  const live = fresh.level === 'live';
  const spokenFreshness = live ? null : freshnessSpoken(fresh.level, fresh.ageMs, now);
  const off = sldMotionOff(live, reducedMotion, spokenFreshness);
  const offReason = off?.reason ?? null;
  const offSpoken = off?.spoken ?? null;
  const motionOff = useMemo(
    (): SldMotionOff | null =>
      offReason && offSpoken !== null ? { reason: offReason, spoken: offSpoken } : null,
    [offReason, offSpoken],
  );
  return { motion: sldMotionAllowed(live, reducedMotion, paused), motionOff };
};
