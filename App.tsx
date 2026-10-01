import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '@aws-amplify/react-native';

// Reactotron MUST connect before configureAmplify() so log lines emitted from
// the Amplify configure step land in the Reactotron timeline.
if (__DEV__) {
  require('./ReactotronConfig.ts');
}

import { configureAmplify } from 'src/config';

configureAmplify();
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import { useSharedValue } from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { Routes } from 'src/routes';
import { navigationRef } from 'src/routes/navigationRef';
import { queryClient } from 'src/queryClient';
import { useBootstrap, useThemeStore } from 'src/hooks';
// Direct file import (never the src/components barrel — see CLAUDE.md §19).
import SplashOverlay, {
  type SplashRoute,
} from 'src/components/screens/Onboarding/Splash';

// React Query ships with browser-oriented online detection; on React Native
// it must be fed from NetInfo so queries pause while offline and refetch on
// reconnect. Module scope — registered once for the app's lifetime.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

function App(): React.JSX.Element {
  const { isDark, colors } = useThemeStore();

  // Cold-start splash (App-level overlay, outside the NavigationContainer).
  // The overlay decides the root route from the restored session; Routes
  // mount UNDER the still-opaque overlay (`route`), report `destReady` once
  // laid out, and the overlay's exit fade reveals the mounted app.
  const [route, setRoute] = useState<SplashRoute | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const destReady = useSharedValue(0);
  // Idempotent: the first route wins (pre-mount, abort and the JS fallback
  // may all report one).
  const handleRoute = useCallback((next: SplashRoute) => {
    setRoute(prev => prev ?? next);
  }, []);
  const handleSplashExited = useCallback(() => setSplashDone(true), []);
  // onLayout + one frame ≈ the destination is on screen (Fabric).
  const onDestLayout = useCallback(() => {
    requestAnimationFrame(() => {
      destReady.value = 1;
    });
  }, [destReady]);

  // Cold-start bootstrap: fetch /public/config/params-mapping (and any
  // other public config the app needs) on every app open. The hook is
  // TTL-gated and AsyncStorage-backed, so it's a no-op when the cache
  // is fresh and falls back to cached data when offline.
  useBootstrap();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.splashBg,
    },
  };

  // Portrait-only app. Landscape is never an OS orientation — the SLD
  // full-screen view fakes landscape with a 90° transform instead, because an
  // actual device rotation re-layout collides with Reanimated's Fabric commit
  // hooks and crashes. Locking portrait app-wide also stops a physical rotate
  // from fighting that transform.
  useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  // React Query's focusManager has no native notion of "window focus" — wire
  // it to AppState so backgrounding pauses refetch-on-focus and foregrounding
  // re-triggers it (the RN equivalent of the browser visibility event).
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (status: AppStateStatus) => {
        focusManager.setFocused(status === 'active');
      },
    );
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        {/* ref: app-lifetime navigation handle — the forced-logout path in
            src/networking/config.ts resets to Login through it, independent
            of any mounted screen. It has no navigator until the splash
            picks a route, so a cold-start resetToLogin is a no-op there. */}
        <NavigationContainer ref={navigationRef} theme={navTheme}>
          {route ? (
            <View
              style={styles.flex}
              collapsable={false}
              onLayout={onDestLayout}>
              <Routes initialRouteName={route} />
            </View>
          ) : null}
        </NavigationContainer>
        {splashDone ? null : (
          <SplashOverlay
            destReady={destReady}
            onRoute={handleRoute}
            onExited={handleSplashExited}
            destMounted={route !== null}
          />
        )}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default App;
