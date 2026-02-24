import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { deleteToken } from 'src/networking';
import { useUserStore } from './useUserStore';

export const useLogout = () => {
  const navigation = useNavigation();
  const { removeUser } = useUserStore();

  const logout = useCallback(async () => {
    try {
      // Clear the authentication token from AsyncStorage
      await AsyncStorage.removeItem('token');

      // Remove the token from axios headers
      deleteToken();

      // Clear user data from the store
      removeUser();

      // Navigate to Onboarding (Login) screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        }),
      );
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, try to navigate to welcome screen
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        }),
      );
    }
  }, [navigation, removeUser]);

  return { logout };
};
