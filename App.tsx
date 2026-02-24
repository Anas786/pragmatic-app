if (__DEV__) {
  require('./ReactotronConfig.ts');
}
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
import RNBootSplash from 'react-native-bootsplash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes } from 'src/routes';
import { useThemeStore } from 'src/hooks';
import FlashMessage from 'react-native-flash-message';

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const { isDark, colors } = useThemeStore();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: colors.splashBg,
    },
  };

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
