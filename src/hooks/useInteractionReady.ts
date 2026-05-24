import { useEffect, useState } from 'react';

/**
 * Defers a `ready` flag from `false` to `true` after a short delay so
 * expensive subtrees (long lists, gifted-charts mounts, dense bento
 * grids) don't share their initial-commit JS work with the tab-switch
 * animation that just landed.
 *
 * Pattern of use inside a tab view:
 *
 *     const ready = useInteractionReady();
 *     return (
 *       <View>
 *         <Header />                           ← cheap, renders now
 *         {ready ? <HeavyBody /> : <Skeleton />}
 *       </View>
 *     );
 *
 * The default `120 ms` lines up with the chip's blob-morph midpoint
 * — by the time the heavy tree starts mounting the user has already
 * seen the chip respond and a skeleton appear, so the JS-thread
 * block (which is unavoidable for a 100+ child mount) feels like
 * "content arriving" rather than "screen frozen".
 *
 * Pass a larger value (e.g. `200`) for charts that need the
 * full chip-morph to finish before they appear.
 */
export const useInteractionReady = (delayMs = 120): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return ready;
};
