/**
 * SplashOverlay — the cold-start splash, a React Native port of the web
 * "signing-in" animation (circuit board + self-drawing PES mark + caption).
 *
 * Architecture (see CLAUDE.md "Cold-start splash"):
 *  - Rendered by App.tsx as an absolute overlay OUTSIDE the
 *    NavigationContainer — so it must NEVER call navigation hooks. It
 *    reports the auth-derived route via `onRoute`; App mounts `<Routes>`
 *    under the (still opaque) overlay, reports `destReady` once that
 *    destination has laid out, and the overlay's exit fade reveals an
 *    already-mounted app. `onExited` → App unmounts the overlay.
 *  - All continuous motion is ONE Skia picture per frame (SplashCanvas),
 *    driven by one UI-thread frame callback (useSplashClock). RN styles
 *    animate only in two short windows (caption entrance, root exit).
 *  - Skia objects are created only after the first layout (buildScene) —
 *    the Jest renderer never fires onLayout, so tests never touch Skia.
 *  - Route: the useAuth outcome; if auth is still unresolved when the
 *    stall abort fires (STALL_MAX_MS), or the hydrate could not decide
 *    ('indeterminate': offline, Cognito 5xx …), a locally stored Cognito
 *    session → Drawer, else Login (storedSession.ts). The first route handed
 *    to App is final — a late auth outcome can never re-route or flip it.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  LayoutChangeEvent,
  PixelRatio,
  StatusBar,
  StatusBarProps,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { useAuth } from 'src/hooks';
import { useUserStore } from 'src/hooks/useUserStore';
import { onSessionEnded } from 'src/networking/auth/cognito';
import { splashPalette } from 'src/theme';
import { userFromClaims } from 'src/utils/user';
import { easeExit, easeOut } from './ease';
import { buildScene, type Scene } from './scene';
import SplashCanvas from './SplashCanvas';
import SplashCaption, { type CaptionText } from './SplashCaption';
import { probeStoredSession, type StoredSession } from './storedSession';
import {
  EXIT,
  FALLBACK_AFTER_AUTH_MS,
  FALLBACK_FROM_MOUNT_MS,
} from './timeline';
import { useSplashClock } from './useSplashClock';

export type SplashRoute = 'Drawer' | 'Onboarding';

interface SplashOverlayProps {
  /** App side: 1 once the destination wrapper laid out (+ one rAF). */
  destReady: SharedValue<number>;
  /** Mount this root route under the overlay. May be called more than once. */
  onRoute: (route: SplashRoute) => void;
  /** Exit finished — unmount the overlay. */
  onExited: () => void;
  /** App side: true once `onRoute` has mounted the destination Routes. */
  destMounted: boolean;
}

// NOT translucent (Android): the rest of the app runs with an opaque status
// bar, so a translucent splash would resize the root view twice — once when
// the flag lands AFTER the first layout (the frozen board would sit sb/2
// off-centre with an ungridded bottom strip) and again when the overlay
// unmounts (the revealed app would jump by sb). An opaque bar in the board
// colour looks identical and keeps the root size fixed for the whole splash.
// backgroundColor/translucent are Android-only; iOS reads barStyle only.
const SPLASH_BAR: StatusBarProps = {
  barStyle: 'light-content',
  translucent: false,
  backgroundColor: splashPalette.bg,
  animated: false,
};

/** Long-background threshold: resume after this fast-forwards to land. */
const FAST_FORWARD_AFTER_BG_MS = 3000;

export default function SplashOverlay({
  destReady,
  onRoute,
  onExited,
  destMounted,
}: SplashOverlayProps): React.JSX.Element {
  // Read once — the whole timeline branches on it.
  const reducedNow = useReducedMotion();
  const [reduced] = useState(reducedNow);

  /* ── layout → scene (frozen after the first layout; the root size cannot
        change during the splash: portrait-locked, opaque status bar) ── */
  const [size, setSize] = useState<{ W: number; H: number } | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const W = Math.max(1, Math.round(width));
    const H = Math.max(1, Math.round(height));
    setSize(prev => prev ?? { W, H });
  }, []);
  const scene = useMemo<Scene | null>(() => {
    if (!size) {
      return null;
    }
    try {
      return buildScene(size.W, size.H, PixelRatio.get(), reduced);
    } catch (error) {
      // Visuals only: the clock, caption and exit still run without a scene.
      if (__DEV__) {
        console.warn('[splash] buildScene failed', error);
      }
      return null;
    }
  }, [size, reduced]);

  /* ── auth → route + caption ── */
  const { status, displayName } = useAuth();
  // The route the auth outcome implies, once known. 'stored' = the hydrate
  // could not decide ('indeterminate'): route like the stall abort, by the
  // stored-session probe (routeWithoutAuth), when the route is requested.
  const routeRef = useRef<SplashRoute | 'stored' | null>(null);
  // routeRef !== null, as state: gates authReady (→ the pre-mount).
  const [authKnown, setAuthKnown] = useState(false);
  const [caption, setCaption] = useState<CaptionText | null>(null);

  // Stored-session probe — consulted only if auth is still unresolved when
  // the stall abort (or the JS fallback) fires, or resolves 'indeterminate'.
  // Local AsyncStorage reads, no network; started at mount so its answer is
  // settled long before the abort (an 'indeterminate' outcome waits for it).
  // undefined = still pending, null = none / error / timeout → Login.
  // The answer is a snapshot, so it is voided for good if Cognito ends the
  // session meanwhile: Amplify has then cleared the tokens, and the
  // hydrate's 'unauthenticated' may not have committed before the abort
  // reads this ref (executeLogout's navigation reset is a no-op until a
  // route is mounted).
  const storedSessionRef = useRef<StoredSession | null | undefined>(undefined);
  // Settles once the probe has answered (it never rejects).
  const probeSettledRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let alive = true;
    let ended = false;
    const stopListening = onSessionEnded(() => {
      ended = true;
      storedSessionRef.current = null;
    });
    probeSettledRef.current = probeStoredSession().then(result => {
      if (alive && !ended) {
        storedSessionRef.current = result;
      }
    });
    return () => {
      alive = false;
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }
    let live = true;
    const decide = () => {
      if (!live) {
        return;
      }
      routeRef.current =
        status === 'authenticated'
          ? 'Drawer'
          : status === 'unauthenticated'
          ? 'Onboarding'
          : 'stored';
      setCaption(
        prev =>
          prev ??
          (status === 'authenticated'
            ? displayName
              ? { kind: 'named', name: displayName }
              : { kind: 'plain' }
            : { kind: 'neutral' }),
      );
      setAuthKnown(true);
    };
    if (status === 'indeterminate') {
      // Routed by the probe — so decide only once it has answered: a fast
      // failure (offline rejects in ~1 s) must not find it still pending and
      // fall through to Login. Bounded by STORED_SESSION_PROBE_MS.
      (probeSettledRef.current ?? Promise.resolve()).then(decide);
    } else {
      decide();
    }
    return () => {
      live = false;
    };
  }, [status, displayName]);

  /* ── stable JS callbacks for the UI-thread clock (read refs only) ── */
  const onRouteRef = useRef(onRoute);
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onRouteRef.current = onRoute;
    onExitedRef.current = onExited;
  }, [onRoute, onExited]);

  const exitedRef = useRef(false);
  const statusEntryRef = useRef<StatusBarProps | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authReadyRef = useRef(false);
  const bgAtRef = useRef<number | null>(null);

  const clearFallback = useCallback(() => {
    if (fallbackRef.current !== null) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
  }, []);

  const popStatusEntry = useCallback(() => {
    if (statusEntryRef.current) {
      StatusBar.popStackEntry(statusEntryRef.current);
      statusEntryRef.current = null;
    }
  }, []);

  const handleExited = useCallback(() => {
    if (exitedRef.current) {
      return;
    }
    exitedRef.current = true;
    clearFallback();
    popStatusEntry();
    onExitedRef.current();
  }, [clearFallback, popStatusEntry]);

  // Route when the auth hydrate never resolved (stall abort / JS fallback) or
  // resolved without a verdict ('indeterminate' — a transient failure, e.g.
  // offline at launch): a session stored on the device → Drawer, so a slow,
  // hanging or absent network doesn't force a re-login. Its stored ID-token
  // claims fill the user store (display only — name/email/company in the
  // drawer; empty claims are tolerated, the drawer falls back to
  // placeholders). No auth bypass: every protected request still goes
  // through the interceptor, which sends it only with a valid access token
  // (refreshing first if needed, bounded by session.ts' token timeout) and,
  // on a 401, force-refreshes once and retries — executeLogout()ing if the
  // retry is 401 too. If Cognito rejects the stored refresh token once the
  // network is back, Amplify clears it and config.ts' onSessionEnded
  // listener runs executeLogout → Login. So this path always ends in either
  // a successful refresh or the normal logout.
  // No stored session (or the probe failed / is still pending) → Login. The
  // stored session is never cleared here either: if Amplify still holds one,
  // cognitoSignIn's UserAlreadyAuthenticated retry drops it at the moment the
  // user actually signs in again.
  const routeWithoutAuth = useCallback((): SplashRoute => {
    const stored = storedSessionRef.current;
    if (!stored) {
      return 'Onboarding';
    }
    if (stored.idClaims) {
      useUserStore.getState().setUser(userFromClaims(stored.idClaims));
    }
    return 'Drawer';
  }, []);

  // The route handed to App — decided ONCE. The pre-mount (LAND), the abort
  // and the JS fallback all come through here; whichever asks first fixes
  // the destination, and every later request re-sends the same route, so a
  // late auth outcome can never double-route or flip it. A real auth outcome
  // that is already known (it can beat the abort by a frame) wins over the
  // probe.
  const sentRouteRef = useRef<SplashRoute | null>(null);
  const requestMount = useCallback(() => {
    if (sentRouteRef.current === null) {
      const decided = routeRef.current;
      sentRouteRef.current =
        decided === null || decided === 'stored' ? routeWithoutAuth() : decided;
    }
    onRouteRef.current(sentRouteRef.current);
  }, [routeWithoutAuth]);

  const requestNeutralCaption = useCallback(() => {
    setCaption(prev => prev ?? { kind: 'neutral' });
  }, []);

  // StatusBar entries apply in MOUNT order (last pushed wins). The keyed
  // <StatusBar> below already re-pushes in the destination's mount commit;
  // this second push at exit time also outranks any <StatusBar> the
  // destination mounts LATER (after that commit) while the overlay is up.
  const onDestReady = useCallback(() => {
    if (statusEntryRef.current || exitedRef.current) {
      return;
    }
    statusEntryRef.current = StatusBar.pushStackEntry(SPLASH_BAR);
  }, []);

  const {
    frameW,
    realMs,
    authReady,
    captionLatched,
    captionP,
    exitKind,
    exitAtW,
    logoExitAtW,
    exitP,
    ffRequest,
    clock,
  } = useSplashClock({
    reduced,
    destReady,
    requestMount,
    requestNeutralCaption,
    onDestReady,
    onExited: handleExited,
  });

  /* ── JS hard-cut fallback (the UI loop should always exit first) ── */
  const armFallback = useCallback(
    (ms: number) => {
      clearFallback();
      fallbackRef.current = setTimeout(() => {
        fallbackRef.current = null;
        if (exitedRef.current) {
          return;
        }
        requestMount();
        handleExited();
      }, ms);
    },
    [clearFallback, handleExited, requestMount],
  );

  useEffect(() => {
    if (AppState.currentState !== 'background') {
      armFallback(FALLBACK_FROM_MOUNT_MS);
    }
    return () => {
      clearFallback();
      popStatusEntry();
    };
  }, [armFallback, clearFallback, popStatusEntry]);

  // Caption committed → hand it to the UI thread. authReady is set only
  // here (post-commit), so the land can never reveal stale caption text.
  useEffect(() => {
    if (!caption) {
      return;
    }
    captionLatched.value = 1;
    if (authKnown && !authReadyRef.current) {
      authReadyRef.current = true;
      authReady.value = 1;
      armFallback(FALLBACK_AFTER_AUTH_MS);
    }
  }, [caption, authKnown, captionLatched, authReady, armFallback]);

  /* ── clock start: after the first layout (scene built), next frame ── */
  // Idempotent on purpose: Reanimated 3.16's setActive(true) on an already
  // active callback starts a SECOND UI-thread rAF loop (FrameCallbackRegistryUI
  // .runCallbacks), so every call site goes through this guard.
  // `clock.isActive` is updated synchronously by setActive.
  const activateClock = useCallback(() => {
    if (!exitedRef.current && !clock.isActive) {
      clock.setActive(true);
    }
  }, [clock]);

  const laidOut = size !== null;
  useEffect(() => {
    if (!laidOut || AppState.currentState === 'background') {
      return;
    }
    const raf = requestAnimationFrame(activateClock);
    return () => cancelAnimationFrame(raf);
  }, [laidOut, activateClock]);

  /* ── background / foreground ── */
  const laidOutRef = useRef(false);
  laidOutRef.current = laidOut;
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (exitedRef.current) {
        return;
      }
      if (next === 'background') {
        clock.setActive(false);
        bgAtRef.current = Date.now();
        clearFallback();
      } else if (next === 'active') {
        const bgAt = bgAtRef.current;
        bgAtRef.current = null;
        if (
          bgAt !== null &&
          Date.now() - bgAt > FAST_FORWARD_AFTER_BG_MS &&
          authReadyRef.current
        ) {
          ffRequest.value = 1;
        }
        if (laidOutRef.current) {
          activateClock();
        }
        // Re-arm only when disarmed (by 'background', or a background
        // launch): an inactive → active round trip (Control Centre, a system
        // alert) keeps the running timer instead of extending it.
        if (fallbackRef.current === null) {
          armFallback(
            authReadyRef.current
              ? FALLBACK_AFTER_AUTH_MS
              : FALLBACK_FROM_MOUNT_MS,
          );
        }
      }
      // 'inactive' (control centre, app switcher peek) is ignored.
    });
    return () => sub.remove();
  }, [clock, clearFallback, armFallback, activateClock, ffRequest]);

  /* ── root exit: opacity 1→0, scale 1→1.03 (land) / fade only (abort) ── */
  const rootExitStyle = useAnimatedStyle(() => {
    const p = exitP.value;
    if (exitKind.value === EXIT.ABORT) {
      return { opacity: 1 - easeOut(p), transform: [{ scale: 1 }] };
    }
    const e = easeExit(p);
    return { opacity: 1 - e, transform: [{ scale: 1 + 0.03 * e }] };
  });

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.root, rootExitStyle]}
      onLayout={onLayout}>
      {/* Re-keyed when the destination mounts: the remount pushes this entry
          in that same commit, AFTER the destination's own <StatusBar>
          (overlay = later sibling of the NavigationContainer), so the
          destination's bar style never reaches native under the overlay. */}
      <StatusBar key={destMounted ? 'dest' : 'boot'} {...SPLASH_BAR} />
      {scene ? (
        <SplashCanvas
          scene={scene}
          frameW={frameW}
          exitKind={exitKind}
          exitAtW={exitAtW}
          logoExitAtW={logoExitAtW}
          reduced={reduced}
        />
      ) : null}
      <SplashCaption
        text={caption}
        captionP={captionP}
        realMs={realMs}
        reduced={reduced}
        showDots={scene !== null}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: splashPalette.bg,
    zIndex: 1,
  },
});
