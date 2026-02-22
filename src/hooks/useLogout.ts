import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { deleteToken } from 'src/networking';
import { useUserStore } from './useUserStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from 'src/types';

export const useLogout = () => {
  const { reset } =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();
  const { removeUser } = useUserStore();

  const logout = useCallback(async () => {
    try {
      // Clear the authentication token from AsyncStorage
      await AsyncStorage.removeItem('token');

      // Remove the token from axios headers
      deleteToken();

      // Clear user data from the store
      removeUser();

      // Navigate to Welcome screen
      reset({
        routes: [
          {
            name: 'Welcome',
          },
        ],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, try to navigate to welcome screen
      reset({
        routes: [
          {
            name: 'Welcome',
          },
        ],
      });
    }
  }, [reset, removeUser]);

  return { logout };
};
