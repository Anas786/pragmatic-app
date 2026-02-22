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
import RNBootSplash from 'react-native-bootsplash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes } from 'src/routes';
import { BACKGROUND } from 'src/utils';
import { I18nManager } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import i18n, { initI18n } from './i18n';
import RNRestart from 'react-native-restart';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize i18n and get the language/RTL settings
      const { languageTag, isRTL } = await initI18n();

      // Check if RTL direction needs to be changed
      const needsRTLChange = I18nManager.isRTL !== isRTL;

      if (needsRTLChange) {
        // Force RTL change
        I18nManager.allowRTL(isRTL);
        I18nManager.forceRTL(isRTL);
        // Swap left and right in RTL mode for proper layout
        I18nManager.swapLeftAndRightInRTL(isRTL);

        // Restart app to apply RTL layout changes
        // This is necessary for proper layout updates, especially on iOS
        setTimeout(() => {
          RNRestart.Restart();
        }, 100);
        return; // Don't set isReady, let restart handle it
      }

      // Ensure i18n language matches (should already be set by initI18n, but double-check)
      if (i18n.language !== languageTag) {
        await i18n.changeLanguage(languageTag);
      }

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
  );
}

export default App;
