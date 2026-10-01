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
 * Provider side: a ref-counted gate. Returns the context value to provide
 * and whether pull-to-refresh is currently blocked.
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
