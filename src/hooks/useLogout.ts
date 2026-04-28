import { CommonActions, useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { cognitoSignOut, deleteToken } from 'src/networking';
import { display, inspectError } from 'src/utils';
import { resetActiveSite } from './useSwitchActiveSite';
import { useUserStore } from './useUserStore';

interface UseLogoutOptions {
  /** Show a confirmation dialog before signing out. Defaults to true. */
  confirm?: boolean;
}

/**
 * Drawer / settings logout hook.
 *
 * Sequence:
 *  1. (optional) confirm with the user
 *  2. Cognito global sign-out — clears Amplify's secure credential store
 *  3. Drop the in-memory axios Authorization header
 *  4. Reset Zustand user store
 *  5. Reset navigation to the Onboarding → Login screen
 */
export const useLogout = (options: UseLogoutOptions = {}) => {
  const { confirm = true } = options;
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { removeUser } = useUserStore();
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      // 1. End the Cognito session (also revokes the refresh token).
      await cognitoSignOut();
    } catch (err) {
      // Never block local cleanup on a remote sign-out failure.
      display('useLogout.cognitoSignOut FAILED', inspectError(err));
    } finally {
      // 2. Drop any cached Authorization header.
      deleteToken();
      // 3. Clear in-memory user.
      removeUser();
      // 4. Wipe every cached query (live data, site config, site list)
      //    so the next login can't briefly surface the previous user's data.
      queryClient.clear();
      // 5. Forget the last-active site so the very first card tap after
      //    re-login always refetches.
      resetActiveSite();
      // 6. Reset back to the unauthenticated stack, landing on Login.
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'Onboarding',
              state: { routes: [{ name: 'Login' }] },
            },
          ],
        }),
      );
      setLoggingOut(false);
    }
  }, [navigation, queryClient, removeUser]);

  const logout = useCallback(() => {
    if (!confirm) {
      void performLogout();
      return;
    }
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void performLogout(),
        },
      ],
      { cancelable: true },
    );
  }, [confirm, performLogout]);

  return { logout, loggingOut };
};
