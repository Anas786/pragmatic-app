import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/**
 * Lets a SiteDetail child switch off the screen's pull-to-refresh while it
 * owns vertical drags itself. The inline SLD viewport does this while it
 * is unlocked for panning, so a downward drag inside the diagram pans it
 * and never starts a /data/all refetch.
 *
 * The context value is ONE stable `acquire()` function. Consumers never
 * re-render because of it, and the provider re-renders only when the
 * blocked state actually flips. Outside a provider (e.g. the SLD
 * fullscreen route, tests) `acquire` is a no-op.
 */
type Acquire = () => () => void;

const noopRelease = () => {};
const noopAcquire: Acquire = () => noopRelease;

export const PullToRefreshGateContext = createContext<Acquire>(noopAcquire);

/** Block the enclosing screen's pull-to-refresh while `blocked` is true. */
export const usePullToRefreshBlock = (blocked: boolean): void => {
  const acquire = useContext(PullToRefreshGateContext);
  useEffect(() => {
    if (!blocked) return undefined;
    return acquire();
  }, [blocked, acquire]);
};

/**
 * Lets a SiteDetail child hold the body's SCROLL still (and pull-to-refresh
 * off) while it owns a gesture the native scroll view would also follow.
 * The inline 3D twin does this while a finger is on it: the scroll view
 * under the WebView followed every drag on the 3D — the page moved while the
 * model turned (user reports, 2026-10-10). Same shape as
 * {@link PullToRefreshGateContext}: one stable `acquire()`, a no-op outside a
 * provider.
 */
export const BodyScrollGateContext = createContext<Acquire>(noopAcquire);

/**
 * A stable `(active) => void` for a gesture owner: `true` takes the body
 * scroll AND pull-to-refresh holds, `false` releases both (idempotent;
 * released on unmount too). Each call of the hook is ONE independent hold:
 * an owner with two sources (the inline 3D: the page's claim and RN's own
 * touches) takes two, so neither source can release the other's — the
 * gates are ref-counted.
 */
export const useBodyScrollHold = (): ((active: boolean) => void) => {
  const acquireScroll = useContext(BodyScrollGateContext);
  const acquirePull = useContext(PullToRefreshGateContext);
  const release = useRef<(() => void) | null>(null);
  const hold = useCallback(
    (active: boolean) => {
      if (active) {
        if (release.current !== null) return;
        const releaseScroll = acquireScroll();
        const releasePull = acquirePull();
        release.current = () => {
          releaseScroll();
          releasePull();
        };
      } else if (release.current !== null) {
        release.current();
        release.current = null;
      }
    },
    [acquireScroll, acquirePull],
  );
  useEffect(() => () => hold(false), [hold]);
  return hold;
};

/**
 * Provider side: a ref-counted gate. Returns the context value to provide
 * and whether the gate is currently blocked — used for both
 * pull-to-refresh and the body scroll ({@link BodyScrollGateContext}).
 */
export const usePullToRefreshGate = (): { acquire: Acquire; blocked: boolean } => {
  const count = useRef(0);
  const [blocked, setBlocked] = useState(false);

  const acquire = useCallback<Acquire>(() => {
    count.current += 1;
    if (count.current === 1) setBlocked(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      count.current = Math.max(0, count.current - 1);
      if (count.current === 0) setBlocked(false);
    };
  }, []);

  return { acquire, blocked };
};
