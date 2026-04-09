if (__DEV__) {
  require('./ReactotronConfig.ts');
}
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RNBootSplash from 'react-native-bootsplash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes } from 'src/routes';
import { BACKGROUND } from 'src/utils';
import FlashMessage from 'react-native-flash-message';
import { useThemeStore } from 'src/hooks';

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: BACKGROUND,
  },
};

const queryClient = new QueryClient();

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsReady(true);
    }
  };

  if (!isReady) {
    return <></>;
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer
          theme={MyTheme}
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
