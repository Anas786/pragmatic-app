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
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import RNBootSplash from 'react-native-bootsplash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes } from 'src/routes';
import { useBootstrap, useThemeStore } from 'src/hooks';
import FlashMessage from 'react-native-flash-message';

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const { isDark, colors } = useThemeStore();

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

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      // Continue with default settings if initialization fails
      setIsReady(true);
    }
  };

  // Don't render until initialization is complete
  if (!isReady) {
    return <></>;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          theme={navTheme}
          onReady={() => {
            RNBootSplash.hide({
              fade: true,
            });
          }}>
          <Routes />
          <FlashMessage position="top" />
        </NavigationContainer>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
