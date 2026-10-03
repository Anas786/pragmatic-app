/**
 * useSldFlowLoop — the SLD flow clock's UI-thread loop runs only while an
 * edge flows AND the host's visibility gate is open; a closed gate PAUSES
 * the loop (`setActive(false)`), it doesn't just skip the clock writes —
 * an active frame callback wakes the UI thread every vsync even when its
 * body returns at once. And `setActive(true)` is never sent to a loop that
 * is already active (Reanimated 3.16 would start a second UI loop —
 * CLAUDE.md §20.3).
 *
 * Reanimated is replaced by a stand-in that behaves like the real hooks:
 * `useFrameCallback` keeps `isActive` in step with `setActive`, and
 * `useAnimatedReaction` re-runs its reaction when a gate value is written.
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

type Reaction = { prepare: () => unknown; react: (v: unknown, prev: unknown) => void; last: unknown };

const mockLoop: { calls: boolean[]; active: boolean } = { calls: [], active: false };
const mockReactions = new Set<Reaction>();

jest.mock('react-native-reanimated', () => {
  const R = require('react');
  return {
    __esModule: true,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    useFrameCallback: (_cb: unknown, autostart: boolean) => {
      const ref = R.useRef(null);
      if (ref.current === null) {
        mockLoop.active = autostart;
        ref.current = {
          callbackId: 1,
          get isActive() {
            return mockLoop.active;
          },
          setActive: (on: boolean) => {
            mockLoop.calls.push(on);
            mockLoop.active = on;
          },
        };
      }
      return ref.current;
    },
    useAnimatedReaction: (
      prepare: () => unknown,
      react: (v: unknown, prev: unknown) => void,
      deps: unknown[],
    ) => {
      R.useEffect(() => {
        const reaction: Reaction = { prepare, react, last: null };
        const v = prepare();
        react(v, null);
        reaction.last = v;
        mockReactions.add(reaction);
        return () => {
          mockReactions.delete(reaction);
        };
      }, deps);
    },
  };
});

import { useSldFlowLoop } from '../src/components/screens/Authenticated/SiteDetail/components/useSldFlowLoop';

/** A gate shared value; writing it runs the reactions that read it. */
const makeGate = (initial: boolean) => {
  let value = initial;
  return {
    get value() {
      return value;
    },
    set value(next: boolean) {
      value = next;
      mockReactions.forEach(r => {
        const v = r.prepare();
        if (v !== r.last) {
          const prev = r.last;
          r.last = v;
          r.react(v, prev);
        }
      });
    },
  };
};
type Gate = ReturnType<typeof makeGate>;

const tick = () => undefined;
const Host = ({ flowing, gate }: { flowing: boolean; gate?: Gate }) => {
  useSldFlowLoop(tick, flowing, gate as never);
  return null;
};

let tree: ReactTestRenderer | undefined;
const mount = (flowing: boolean, gate?: Gate) => {
  mockLoop.calls = [];
  act(() => {
    tree = renderer.create(<Host flowing={flowing} gate={gate} />);
  });
};
const update = (flowing: boolean, gate?: Gate) =>
  act(() => tree?.update(<Host flowing={flowing} gate={gate} />));

afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  mockReactions.clear();
});

describe('useSldFlowLoop', () => {
  it('starts with the frame callback paused (autostart off) and runs it once when flowing + visible', () => {
    mount(true, makeGate(true));
    expect(mockLoop.active).toBe(true);
    expect(mockLoop.calls).toEqual([true]); // exactly one start
  });

  it('a closed gate PAUSES the loop; reopening resumes it — never a duplicate start', () => {
    const gate = makeGate(true);
    mount(true, gate);
    act(() => {
      gate.value = false;
    });
    expect(mockLoop.active).toBe(false);
    act(() => {
      gate.value = true;
    });
    expect(mockLoop.active).toBe(true);
    // Re-writing the same value (scroll events while visible) does nothing.
    act(() => {
      gate.value = true;
    });
    expect(mockLoop.calls).toEqual([true, false, true]);
  });

  it('mounting already scrolled off never starts the loop', () => {
    mount(true, makeGate(false));
    expect(mockLoop.calls.filter(Boolean)).toEqual([]);
    expect(mockLoop.active).toBe(false);
  });

  it('no flowing edge (or reduced motion) → never runs, whatever the gate', () => {
    const gate = makeGate(true);
    mount(false, gate);
    act(() => {
      gate.value = false;
    });
    act(() => {
      gate.value = true;
    });
    expect(mockLoop.calls.filter(Boolean)).toEqual([]);
    // Flow starts while visible → one start; stops → paused.
    update(true, gate);
    expect(mockLoop.active).toBe(true);
    update(false, gate);
    expect(mockLoop.active).toBe(false);
    expect(mockLoop.calls.filter(Boolean)).toEqual([true]);
  });

  it('flow starting while the gate is closed waits for the gate', () => {
    const gate = makeGate(false);
    mount(false, gate);
    update(true, gate);
    expect(mockLoop.active).toBe(false);
    act(() => {
      gate.value = true;
    });
    expect(mockLoop.active).toBe(true);
    expect(mockLoop.calls.filter(Boolean)).toEqual([true]);
  });

  it('no gate (full screen) = always visible', () => {
    mount(true, undefined);
    expect(mockLoop.active).toBe(true);
    expect(mockLoop.calls).toEqual([true]);
  });
});
