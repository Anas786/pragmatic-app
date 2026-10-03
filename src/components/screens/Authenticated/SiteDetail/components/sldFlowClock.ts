/**
 * The SLD flow-animation clock — pure worklet helpers, no React / React
 * Native imports (unit-tested in `__tests__/sldFlowClock.test.ts`).
 *
 * The flowing dashes and the particles riding the edges are a pure function
 * of time, recorded into a fresh Skia picture whenever the clock moves. A
 * tick is not free: the picture is re-recorded on the UI thread and, on
 * Android (RN Skia 1.x draws into a TextureView), uploaded + swapped on the
 * main thread and then forces a composite of the whole window on the
 * RenderThread. The old `useClock()` ticked on EVERY vsync for as long as
 * the diagram was mounted — scrolled off-screen, idle, at 90/120 Hz — so
 * `DiagramSkiaLayer` drives its own clock instead:
 *  - it only ticks while the host says the diagram can be seen (`animate`:
 *    the inline panel overlaps the SiteDetail body viewport; full screen
 *    always), and never with reduced motion or when no edge is flowing;
 *  - it ticks at most {@link SLD_FLOW_FPS} times a second, whatever the
 *    display's refresh rate.
 * Every motion here is time-based, so the flow speed never depends on how
 * often the clock ticks — only the smoothness does.
 */

/** Flow-clock ticks per second (the web SLD's CSS animation looks the same). */
export const SLD_FLOW_FPS = 30;

/** Nominal spacing between two flow-clock ticks, ms. */
export const SLD_FLOW_FRAME_MS = 1000 / SLD_FLOW_FPS;

/**
 * Vsync jitter allowance, ms. A 60 Hz frame landing a hair early (33.2 ms
 * after the last tick) still ticks, so 60 Hz holds a steady 30 fps instead
 * of skipping to 20 fps every few ticks; at 90 / 120 Hz every 3rd / 4th
 * frame ticks.
 */
const FRAME_SLACK_MS = 2;

/** Whether the frame at `now` (ms) should advance a clock last moved at `lastTick`. */
export const sldFlowShouldTick = (now: number, lastTick: number): boolean => {
  'worklet';
  return now - lastTick >= SLD_FLOW_FRAME_MS - FRAME_SLACK_MS;
};

/** Dash pattern of a flowing edge — the web SLD's `stroke-dasharray: 7,6`. */
export const SLD_DASH_INTERVALS = [7, 6];
/** One period of {@link SLD_DASH_INTERVALS}, px. */
const DASH_CYCLE = 13;
/** Dash drift, px/s — the web's offset drifts ~ -40px / 1.1s. */
export const SLD_DASH_SPEED = 36;

/**
 * Dash phase at clock time `ms`, reduced to one pattern cycle (-13, 0].
 * The clock is the frame timestamp (device uptime, ms): an unreduced phase
 * handed to Skia as a float loses sub-pixel precision after days of uptime
 * and the dashes would visibly step. Reducing it in JS doubles first keeps
 * the motion identical.
 */
export const sldDashPhase = (ms: number): number => {
  'worklet';
  return -(((ms / 1000) * SLD_DASH_SPEED) % DASH_CYCLE);
};

/**
 * How far along its edge (0…1) a particle is at clock time `ms`: one lap
 * per `period` seconds, started `offset` of a lap in so the particles of
 * neighbouring edges don't march in step.
 */
export const sldParticleProgress = (ms: number, period: number, offset: number): number => {
  'worklet';
  return (ms / 1000 / period + offset) % 1;
};
