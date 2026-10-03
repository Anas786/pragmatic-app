/**
 * SLD flow clock (`components/sldFlowClock.ts`) — the inline / full-screen
 * diagram's dashes + particles move on a 30 fps clock instead of Skia's
 * every-vsync `useClock()`. Each tick re-records the Skia picture (and on
 * Android re-composites the window), so the tick RATE is the cost; the
 * motion itself is time-based and must not change.
 */
import { describe, expect, it } from '@jest/globals';
import {
  SLD_DASH_SPEED,
  SLD_FLOW_FPS,
  sldDashPhase,
  sldFlowShouldTick,
  sldParticleProgress,
} from '../src/components/screens/Authenticated/SiteDetail/components/sldFlowClock';

/** Ticks the clock would take over `seconds` of vsyncs at `hz` (±jitter). */
const ticksAt = (hz: number, seconds: number, jitterMs = 0): number => {
  const frame = 1000 / hz;
  let last = Number.NEGATIVE_INFINITY;
  let ticks = 0;
  const start = 5_000_000; // an uptime-like timestamp
  for (let i = 0; i < hz * seconds; i++) {
    // Deterministic ±jitter, alternating, like a real vsync timeline.
    const now = start + i * frame + (i % 2 === 0 ? jitterMs : -jitterMs);
    if (sldFlowShouldTick(now, last)) {
      last = now;
      ticks++;
    }
  }
  return ticks;
};

describe('SLD flow clock', () => {
  it('runs on the UI thread (every helper is a worklet)', () => {
    for (const fn of [sldFlowShouldTick, sldDashPhase, sldParticleProgress]) {
      expect(typeof (fn as unknown as { __workletHash?: number }).__workletHash).toBe('number');
    }
  });

  it.each([60, 90, 120])('ticks %i Hz vsync down to ~30 fps', hz => {
    const perSecond = ticksAt(hz, 4) / 4;
    expect(perSecond).toBeGreaterThanOrEqual(SLD_FLOW_FPS - 1);
    expect(perSecond).toBeLessThanOrEqual(SLD_FLOW_FPS + 1);
  });

  it('holds 30 fps at 60 Hz even when vsync timestamps jitter', () => {
    const perSecond = ticksAt(60, 4, 0.8) / 4;
    expect(perSecond).toBeGreaterThanOrEqual(SLD_FLOW_FPS - 1);
  });

  it('ticks on the very first frame', () => {
    expect(sldFlowShouldTick(1234, Number.NEGATIVE_INFINITY)).toBe(true);
  });

  it('keeps the dash phase within one pattern cycle, even after days of uptime', () => {
    for (const ms of [0, 16.7, 1000, 3_600_000, 10 * 86_400_000 + 123.4]) {
      const phase = sldDashPhase(ms);
      expect(phase).toBeLessThanOrEqual(0);
      expect(phase).toBeGreaterThan(-13);
    }
  });

  it('drifts the dashes at the web speed (36 px/s), independent of the tick rate', () => {
    const t0 = 10 * 86_400_000 + 0.5;
    const dt = 100; // ms → 3.6 px
    const step = sldDashPhase(t0) - sldDashPhase(t0 + dt);
    const expected = (dt / 1000) * SLD_DASH_SPEED;
    // Equal modulo the 13 px cycle.
    const wrapped = ((step % 13) + 13) % 13;
    expect(wrapped).toBeCloseTo(expected, 6);
  });

  it('loops a particle once per period, starting at its offset', () => {
    expect(sldParticleProgress(0, 4.8, 0.37)).toBeCloseTo(0.37, 9);
    expect(sldParticleProgress(4800, 4.8, 0.37)).toBeCloseTo(0.37, 9);
    expect(sldParticleProgress(2400, 4.8, 0)).toBeCloseTo(0.5, 9);
    const p = sldParticleProgress(10 * 86_400_000 + 77, 5.07, 0.74);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThan(1);
  });
});
