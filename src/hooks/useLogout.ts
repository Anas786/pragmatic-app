import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { executeLogout } from 'src/networking';

interface UseLogoutOptions {
  /** Show a confirmation dialog before signing out. Defaults to true. */
  confirm?: boolean;
}

/**
 * Drawer / Profile "Sign out" hook.
 *
 * Thin UI wrapper (confirmation dialog + in-flight flag) around the shared
 * `executeLogout` routine in src/networking/config.ts, which owns the FULL
 * cleanup sequence: Cognito sign-out, session-cache clear, user store reset,
 * React Query cache wipe, active-site reset, and the navigation reset to
 * Onboarding → Login. The forced 401/403/419 interceptor path runs the exact
 * same routine, so the two sign-out flows can't drift apart again.
 *
 * Double-tap safe: while the confirmation dialog is up or a sign-out is in
 * flight, further `logout()` calls are ignored (a fast second tap would
 * otherwise stack a second dialog). `loggingOut` drives the row's spinner /
 * disabled state.
 */
export const useLogout = (options: UseLogoutOptions = {}) => {
  const { confirm = true } = options;
  const [loggingOut, setLoggingOut] = useState(false);
  // Refs, not state: the guard must hold within the same frame as the tap.
  const dialogOpen = useRef(false);
  const inFlight = useRef(false);

  const performLogout = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoggingOut(true);
    try {
      await executeLogout();
    } finally {
      inFlight.current = false;
      // The nav reset inside executeLogout usually unmounts this component
      // first — React 18 treats this as a silent no-op in that case.
      setLoggingOut(false);
    }
  }, []);

  const logout = useCallback(() => {
    if (inFlight.current || dialogOpen.current) return;
    if (!confirm) {
      performLogout();
      return;
    }
    dialogOpen.current = true;
    const close = () => {
      dialogOpen.current = false;
    };
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel', onPress: close },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            close();
            performLogout();
          },
        },
      ],
      // Android: tapping outside dismisses without a button press.
      { cancelable: true, onDismiss: close },
    );
  }, [confirm, performLogout]);

  return { logout, loggingOut };
};
