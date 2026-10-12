/**
 * The Diagram's motion gate (SiteDetail/components/sldMotion.ts): the flow
 * only animates while the site's data is LIVE, Reduce Motion is off and
 * the user hasn't paused it — and when something other than the user's
 * Pause closes it, the Pause / Play control says why instead of offering
 * an action that does nothing (`sldMotionControl`).
 */
import { describe, expect, it } from '@jest/globals';
import {
  sldMotionAllowed,
  sldMotionOff,
} from '../src/components/screens/Authenticated/SiteDetail/components/sldMotion';
import { sldMotionControl } from '../src/components/screens/Authenticated/SiteDetail/components/ControlButtons';

describe('motion gate', () => {
  it('reduced motion ⇒ off; Pause ⇒ off; data not live ⇒ off', () => {
    expect(sldMotionAllowed(true, false, false)).toBe(true);
    expect(sldMotionAllowed(true, true, false)).toBe(false);
    expect(sldMotionAllowed(true, false, true)).toBe(false);
    expect(sldMotionAllowed(false, false, false)).toBe(false);
  });
});

describe('sldMotionOff — why nothing moves when it is NOT the user’s Pause', () => {
  it('says why exactly when the gate is closed by something else', () => {
    expect(sldMotionOff(true, false, null)).toBeNull();
    expect(sldMotionOff(false, false, 'Delayed, last updated 35 minutes ago')).toEqual({
      reason: 'notLive',
      spoken: 'Animation off, the data is not live: Delayed, last updated 35 minutes ago',
    });
    expect(sldMotionOff(false, false, null)).toEqual({
      reason: 'notLive',
      spoken: 'Animation off, the data is not live: last update unknown',
    });
    // Reduce Motion: an OS setting — it holds while the data is live, and wins.
    for (const live of [true, false]) {
      expect(sldMotionOff(live, true, live ? null : 'Delayed')).toEqual({
        reason: 'reduced',
        spoken: 'Animation off: Reduce Motion is on',
      });
    }
    // Same gate: with Pause aside, motion is off ⇔ a reason is shown.
    for (const live of [true, false]) {
      for (const reduced of [true, false]) {
        const off = sldMotionOff(live, reduced, null);
        expect([live, reduced, off !== null]).toEqual([live, reduced, !sldMotionAllowed(live, reduced, false)]);
      }
    }
  });

  it('the Pause / Play control: an action for the user, a disabled state otherwise', () => {
    expect(sldMotionControl(false, null)).toEqual({ glyph: 'pause', label: 'Pause animation', disabled: false });
    expect(sldMotionControl(true, null)).toEqual({ glyph: 'play-arrow', label: 'Play animation', disabled: false });
    const off = sldMotionOff(false, false, 'Delayed, last updated 35 minutes ago');
    for (const paused of [true, false]) {
      expect(sldMotionControl(paused, off?.spoken)).toEqual({
        glyph: 'motion-photos-off',
        label: 'Animation off, the data is not live: Delayed, last updated 35 minutes ago',
        disabled: true,
      });
    }
  });
});
