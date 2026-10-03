import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type RefObject,
} from 'react';
import type { HostInstance, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * Where the SiteDetail body ScrollView is scrolled to and how tall it is,
 * published from JS WITHOUT re-rendering anyone: a tiny external store that
 * consumers read imperatively from their own subscription.
 *
 * The inline SLD uses it to stop its flow animation while the panel is
 * scrolled out of view (a ticking Skia clock re-records and, on Android,
 * re-composites the window every frame even when nobody can see it).
 * Outside a provider (the SLD full-screen route, tests) there is no store
 * and everything counts as visible.
 */
export interface BodyViewport {
  /** Vertical scroll offset of the body content, points. */
  scrollY: number;
  /** Visible height of the body ScrollView, points (0 = not laid out yet). */
  height: number;
}

export interface BodyViewportStore {
  get: () => BodyViewport;
  /**
   * The ScrollView's content container — descendants measure their
   * content-space position against it (`measureLayout`), which no scroll
   * offset can skew. Null before it mounts.
   */
  contentNode: () => HostInstance | null;
  /** Called on every scroll / resize / content-size change. */
  subscribe: (listener: () => void) => () => void;
}

/** Provider side: the store plus the setters SiteDetail's ScrollView feeds. */
export interface BodyViewportPublisher {
  store: BodyViewportStore;
  setScrollY: (y: number) => void;
  setHeight: (height: number) => void;
  /** Something above the consumers may have moved (content size changed). */
  notify: () => void;
}

export const createBodyViewportStore = (
  contentNode: () => HostInstance | null,
): BodyViewportPublisher => {
  let state: BodyViewport = { scrollY: 0, height: 0 };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const update = (next: BodyViewport) => {
    if (next.scrollY === state.scrollY && next.height === state.height) return;
    state = next;
    notify();
  };
  return {
    store: {
      get: () => state,
      contentNode,
      subscribe: listener => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    },
    setScrollY: scrollY => update({ ...state, scrollY }),
    setHeight: height => update({ ...state, height }),
    notify,
  };
};

export const BodyViewportContext = createContext<BodyViewportStore | null>(null);

/**
 * Whether a box at content-space `top` (points from the top of the scroll
 * content) and `height` overlaps the visible viewport. A viewport that is
 * not laid out yet counts as visible — never hide what might be on screen.
 */
export const isInBodyViewport = (
  top: number,
  height: number,
  viewport: BodyViewport,
): boolean =>
  viewport.height <= 0 ||
  (top < viewport.scrollY + viewport.height && top + height > viewport.scrollY);

/**
 * Consumer side: attach `ref` + `onLayout` to a host View inside the body;
 * `visible` (a shared value, true until proven otherwise) flips only when
 * the View enters or leaves the viewport — set from JS on the scroll
 * events, never on a frame callback, and never causing a React commit.
 */
export const useBodyViewportVisibility = (): {
  ref: RefObject<View>;
  onLayout: () => void;
  visible: SharedValue<boolean>;
} => {
  const store = useContext(BodyViewportContext);
  const ref = useRef<View>(null);
  const visible = useSharedValue(true);
  const shown = useRef(true);

  // Re-measured on every notification: a layout change ABOVE this View
  // (the refresh strip, a card that finished loading) moves it without
  // firing its own onLayout. `measureLayout` reads the committed layout
  // tree (synchronous on Fabric), so this stays cheap at scroll rate.
  const check = useCallback(() => {
    const node = ref.current;
    const content = store?.contentNode() ?? null;
    if (!store || !node || !content) return;
    node.measureLayout(content, (_x, y, _w, h) => {
      const next = isInBodyViewport(y, h, store.get());
      if (next === shown.current) return;
      shown.current = next;
      visible.value = next;
    });
  }, [store, visible]);

  useEffect(() => (store ? store.subscribe(check) : undefined), [store, check]);

  return { ref, onLayout: check, visible };
};
