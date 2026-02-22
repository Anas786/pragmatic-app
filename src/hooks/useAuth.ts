import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useCallback } from 'react';
import { setAuthToken, setGlobalLogout } from 'src/networking';
import { useUserStore } from './useUserStore';

export const useAuth = () => {
  // const { reset } =
  //   useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { removeUser } = useUserStore();

  // const resetTo = useCallback((name: keyof OnboardingStackParamList['Splash']) => {
  //   reset({
  //     routes: [
  //       {
  //         name,
  //       },
  //     ],
  //   });
  // }, [reset]);

  const logout = useCallback(async () => {
    try {
      // Clear the authentication token from AsyncStorage
      await AsyncStorage.removeItem('token');

      // Clear user data from the store
      removeUser();

      // Navigate to Welcome screen
      // resetTo('Welcome');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, try to navigate to welcome screen
      // resetTo('Welcome');
    }
  }, [removeUser]);

  const verifyAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setAuthToken(token);
        // resetTo('Authenticated');
      } else {
        // resetTo('Welcome');
      }
    } catch (error) {
      console.error('Error verifying auth:', error);
      // resetTo('Welcome');
    }
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      // Set up global logout function for networking layer
      setGlobalLogout(logout);

      // Request permissions first
      // await requestAppPermissions();

      // Then verify authentication
      await verifyAuth();
    } catch (error) {
      console.error('Error initializing app:', error);
      // Continue with auth verification even if permissions fail
      await verifyAuth();
    }
  }, [verifyAuth, logout]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return {};
};
