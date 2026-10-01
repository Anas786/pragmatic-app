import { useSyncExternalStore } from 'react';
import { AppState, AppStateStatus, NativeEventSubscription } from 'react-native';

/**
 * Shared "current time" for relative-age labels ('3 min ago', 'Live').
 *
 * ONE 30 s interval for the whole app, however many components subscribe:
 * each subscriber re-renders on the tick (so a `FreshnessStatus` updates
 * itself without re-rendering its parent), the interval only exists while
 * something is subscribed AND the app is active, and on return to
 * 'active' the time is refreshed immediately — a label never shows a
 * minutes-old age after resume.
 */
export const NOW_TICK_MS = 30_000;

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let appStateSub: NativeEventSubscription | null = null;

const emit = () => {
  now = Date.now();
  listeners.forEach(l => l());
};

const startTicker = () => {
  if (timer === null) timer = setInterval(emit, NOW_TICK_MS);
};

const stopTicker = () => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

const isActive = (state: AppStateStatus | null | undefined) =>
  // `unknown` is iOS's pre-launch state — treat as foreground.
  state === 'active' || state === 'unknown' || state == null;

const handleAppState = (state: AppStateStatus) => {
  if (state === 'active') {
    emit();
    startTicker();
  } else {
    stopTicker();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    appStateSub = AppState.addEventListener('change', handleAppState);
    if (isActive(AppState.currentState)) startTicker();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stopTicker();
      appStateSub?.remove();
      appStateSub = null;
    }
  };
};

/**
 * While no ticker runs (nothing subscribed yet, or backgrounded) the cached
 * time is refreshed lazily — but only once it is a full tick old, so
 * repeated reads within one render stay identical (a getSnapshot rule).
 */
const getSnapshot = () => {
  // abs(): a device clock set BACKWARDS must refresh too, not freeze.
  if (timer === null && Math.abs(Date.now() - now) >= NOW_TICK_MS) now = Date.now();
  return now;
};

/** Epoch ms, re-rendering the caller on each shared 30 s tick. */
export const useNow = (): number => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

/** Test hook: subscriber count + whether the interval is running. */
export const __nowTickerState = () => ({
  subscribers: listeners.size,
  running: timer !== null,
});
