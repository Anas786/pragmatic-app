import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { executeLogout } from 'src/networking';

interface UseLogoutOptions {
  /** Show a confirmation dialog before signing out. Defaults to true. */
  confirm?: boolean;
}

/**
 * Drawer / settings logout hook.
 *
 * Thin UI wrapper (confirmation dialog + in-flight flag) around the shared
 * `executeLogout` routine in src/networking/config.ts, which owns the FULL
 * cleanup sequence: Cognito sign-out, session-cache clear, user store reset,
 * React Query cache wipe, active-site reset, and the navigation reset to
 * Onboarding → Login. The forced 401/403/419 interceptor path runs the exact
 * same routine, so the two logout flows can't drift apart again.
 */
export const useLogout = (options: UseLogoutOptions = {}) => {
  const { confirm = true } = options;
  const [loggingOut, setLoggingOut] = useState(false);

  const performLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await executeLogout();
    } finally {
      // The nav reset inside executeLogout usually unmounts this component
      // first — React 18 treats this as a silent no-op in that case.
      setLoggingOut(false);
    }
  }, []);

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
