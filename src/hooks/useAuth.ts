import { useCallback, useEffect, useState } from 'react';
import {
  cognitoCurrentUser,
  cognitoGetTokens,
  executeLogout,
} from 'src/networking';
import { decodeJwt } from 'src/utils';
import { userFromClaims } from 'src/utils/user';
import { useUserStore } from './useUserStore';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * Splash-time session hydration hook.
 *
 * - Checks whether a Cognito session is still valid (Amplify auto-refreshes).
 * - Hydrates the user store from idToken claims when a session exists.
 *
 * NOTE: this hook deliberately does NOT register any global logout handler.
 * Its only consumer (Splash) unmounts right after auth resolves, so anything
 * registered here would become a stale closure. Forced logout (terminal
 * 401/403/419) is owned entirely by `executeLogout` in
 * src/networking/config.ts, which performs the full cleanup + navigation
 * reset via the app-lifetime navigationRef.
 */
export const useAuth = () => {
  const { setUser, removeUser } = useUserStore();
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(async () => {
    await executeLogout();
    setStatus('unauthenticated');
  }, []);

  const hydrateFromSession = useCallback(async () => {
    try {
      const currentUser = await cognitoCurrentUser();
      if (!currentUser) {
        removeUser();
        setStatus('unauthenticated');
        return;
      }

      const tokens = await cognitoGetTokens();
      if (!tokens?.idToken) {
        removeUser();
        setStatus('unauthenticated');
        return;
      }

      const claims = decodeJwt(tokens.idToken);
      if (!claims) {
        removeUser();
        setStatus('unauthenticated');
        return;
      }

      setUser(userFromClaims(claims));
      setStatus('authenticated');
    } catch (error) {
      console.error('useAuth.hydrate error:', error);
      removeUser();
      setStatus('unauthenticated');
    }
  }, [removeUser, setUser]);

  useEffect(() => {
    hydrateFromSession();
  }, [hydrateFromSession]);

  return { status, logout };
};
