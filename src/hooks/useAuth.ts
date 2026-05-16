import { useEffect, useCallback, useState } from 'react';
import {
  cognitoCurrentUser,
  cognitoGetTokens,
  executeLogout,
  setGlobalLogout,
} from 'src/networking';
import { decodeJwt, parseBool } from 'src/utils';
import { IUser } from 'src/types';
import { useUserStore } from './useUserStore';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

/**
 * App bootstrap auth hook.
 *
 * - Registers a global logout handler for the axios response interceptor.
 * - Checks whether a Cognito session is still valid (Amplify auto-refreshes).
 * - Hydrates the user store from idToken claims when a session exists.
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

      const user: IUser = {
        user_id: claims['custom:userId'] || claims.sub,
        name:
          claims['custom:userName'] ||
          claims['cognito:username'] ||
          claims.email ||
          '',
        email: claims.email || '',
        phone: claims['custom:phone'],
        company_id: claims['custom:companyId'],
        company: claims['custom:company'],
        client_id: claims['custom:clientId'],
        customer_id: claims['custom:customerId'],
        is_client_admin: parseBool(claims['custom:isClientAdmin']),
        is_customer_admin: parseBool(claims['custom:isCustomerAdmin']),
        login_date: new Date(),
      };

      setUser(user);
      setStatus('authenticated');
    } catch (error) {
      console.error('useAuth.hydrate error:', error);
      removeUser();
      setStatus('unauthenticated');
    }
  }, [removeUser, setUser]);

  useEffect(() => {
    setGlobalLogout(logout);
    hydrateFromSession();
  }, [logout, hydrateFromSession]);

  return { status, logout };
};
