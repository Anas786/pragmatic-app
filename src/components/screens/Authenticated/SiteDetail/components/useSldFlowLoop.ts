import { useCallback, useEffect, useRef } from 'react';
import {
  runOnJS,
  useAnimatedReaction,
  useFrameCallback,
  type FrameInfo,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Runs the SLD flow clock's frame callback (`tick`) only while an edge is
 * `flowing` AND the host's `gate` is open (the inline panel is in the body
 * viewport; no gate = always open, as in full screen). A closed gate pauses
 * the UI-thread loop itself — no wake-up per vsync — rather than leaving it
 * running just to return early.
 *
 * Both inputs are applied on the JS thread: `flowing` from render, the gate
 * through a reaction that hops to JS only when it FLIPS (never per frame,
 * never a React commit). The gate reaches JS a round trip after it closes,
 * so `tick` must still check it itself.
 *
 * `setActive` is only called when the state actually changes: in
 * Reanimated 3.16, `setActive(true)` on an already-active frame callback
 * starts a SECOND UI-thread loop (CLAUDE.md §20.3).
 *
 * `tick` must be referentially stable — `useFrameCallback` re-registers
 * whenever it changes. Tests: `__tests__/sldFlowLoop.test.tsx`.
 */
export const useSldFlowLoop = (
  tick: (info: FrameInfo) => void,
  flowing: boolean,
  gate: SharedValue<boolean> | undefined,
): void => {
  const loop = useFrameCallback(tick, false);
  const flowingRef = useRef(flowing);
  flowingRef.current = flowing;
  const gateOpenRef = useRef(true);

  const sync = useCallback(() => {
    const run = flowingRef.current && gateOpenRef.current;
    if (loop.isActive !== run) loop.setActive(run);
  }, [loop]);

  const onGateChange = useCallback(
    (open: boolean) => {
      gateOpenRef.current = open;
      sync();
    },
    [sync],
  );

  useAnimatedReaction(
    () => (gate === undefined ? true : gate.value),
    (open, previous) => {
      if (open !== previous) runOnJS(onGateChange)(open);
    },
    [gate, onGateChange],
  );

  useEffect(() => {
    sync();
  }, [sync, flowing]);
};
