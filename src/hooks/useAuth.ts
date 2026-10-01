import { useCallback, useEffect, useState } from 'react';
import {
  cognitoCurrentUser,
  cognitoGetTokens,
  executeLogout,
} from 'src/networking';
import { decodeJwt } from 'src/utils';
import type { CognitoIdTokenClaims } from 'src/utils/jwt';
import { display, inspectError } from 'src/utils/logger';
import { userFromClaims } from 'src/utils/user';
import { useUserStore } from './useUserStore';

/**
 * - 'authenticated'   — a usable session; the user store is hydrated.
 * - 'unauthenticated' — DEFINITIVELY no session: nothing stored, or Cognito
 *                       rejected the refresh token (Amplify cleared it).
 * - 'indeterminate'   — the check itself failed (offline, DNS, Cognito 5xx /
 *                       throttling, a token read that timed out): a stored
 *                       session may well be fine. The splash routes this
 *                       exactly like its stall abort — by the local
 *                       stored-session probe — never straight to Login.
 */
export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'indeterminate';

type HydrateOutcome =
  | { status: 'authenticated'; claims: CognitoIdTokenClaims }
  | { status: 'unauthenticated' | 'indeterminate' };

/**
 * The restored session's ID-token claims, or why there are none. What this
 * waits on (Amplify 6.x):
 *  1. getCurrentUser() → reads the token store (AsyncStorage); if the stored
 *     access/ID token is expired → GetTokensFromRefreshToken (cognito-idp).
 *     The only network step. cognitoCurrentUser resolves null only when
 *     there is definitively no session and THROWS on a transient failure.
 *  2. cognitoGetTokens() → session.ts → the user-pool token provider: the
 *     same token read, now local (step 1 just refreshed anything expired).
 *     It no longer goes through fetchAuthSession(), which also fetched
 *     identity-pool credentials (GetCredentialsForIdentity) on every cold
 *     start and failed the hydrate when cognito-identity was slow or down.
 *     It resolves null on ANY failure, incl. its 15 s timeout — and step 1
 *     just found a session — so null here is 'indeterminate', not "signed
 *     out" (if Cognito ended the session in between, onSessionEnded says so).
 * Amplify's fetch has no timeout of its own and retries connection errors (3
 * attempts, jittered backoff); RN's native fetch idles out after ~60 s per
 * attempt on iOS and never on Android (OkHttp timeouts are 0). So a refresh
 * on a stalled connection (captive portal, lossy cellular, blackholed AWS
 * endpoint) keeps this pending far past the splash's 20 s stall cap, while a
 * hard offline failure rejects within ~1 s (→ 'indeterminate'). With a
 * still-valid access token neither step touches the network.
 */
const readSession = async (): Promise<HydrateOutcome> => {
  const currentUser = await cognitoCurrentUser();
  if (!currentUser) {
    return { status: 'unauthenticated' };
  }
  const tokens = await cognitoGetTokens();
  if (!tokens?.idToken) {
    return { status: 'indeterminate' };
  }
  const claims = decodeJwt<CognitoIdTokenClaims>(tokens.idToken);
  // An undecodable ID token won't decode on a retry either.
  return claims
    ? { status: 'authenticated', claims }
    : { status: 'unauthenticated' };
};

/**
 * Splash-time session hydration hook.
 *
 * - Checks whether a Cognito session is still valid (Amplify auto-refreshes).
 * - Hydrates the user store from idToken claims when a session exists.
 * - Exposes `displayName` — the trimmed `custom:userName` claim ('' when
 *   absent). Deliberately NOT `IUser.name`, which falls back to
 *   `cognito:username` / email (see src/utils/user.ts); the splash caption
 *   must only ever greet the user by their real display name.
 *
 * Neither 'unauthenticated' nor 'indeterminate' ever clears the stored
 * session: a transient refresh failure (flaky network at launch) must not
 * cost the user their 30-day session — it isn't even 'unauthenticated' (see
 * AuthStatus). If Amplify still holds tokens when Login runs, sign-in itself
 * recovers — see `cognitoSignIn`'s UserAlreadyAuthenticated retry.
 * Nor does either clear the user store: that store is in-memory and still
 * empty on a cold start, so clearing it could only ever wipe a user set by
 * another path (the splash's stall abort into the Drawer, a Login that
 * finished first). Clearing it is executeLogout's job alone.
 *
 * Outcomes that arrive after unmount are dropped. The splash unmounts ~0.3–
 * 1.3 s after it routes — including after a stall abort, while this hydrate
 * may still be hanging on the network for minutes — and by then the route is
 * fixed: a late result must not touch the store of whatever screen the user
 * is on (or of a different account that signed in meanwhile).
 *
 * NOTE: this hook deliberately does NOT register any global logout handler.
 * Its only consumer (the cold-start SplashOverlay) unmounts ~0.5 s after
 * auth resolves, so anything registered here would become a stale closure.
 * Forced logout (terminal 401/403/419) is owned entirely by `executeLogout` in
 * src/networking/config.ts, which performs the full cleanup + navigation
 * reset via the app-lifetime navigationRef.
 */
export const useAuth = () => {
  const setUser = useUserStore(state => state.setUser);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [displayName, setDisplayName] = useState('');

  const logout = useCallback(async () => {
    await executeLogout();
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    let active = true;
    readSession()
      .catch((error): HydrateOutcome => {
        // A transient failure (cognitoCurrentUser rethrows those) or anything
        // unexpected: no verdict on the stored session.
        display('useAuth.hydrate FAILED', inspectError(error));
        return { status: 'indeterminate' };
      })
      .then(outcome => {
        if (!active) {
          return;
        }
        if (outcome.status !== 'authenticated') {
          setStatus(outcome.status);
          return;
        }
        const { claims } = outcome;
        setUser(userFromClaims(claims));
        const claimedName = claims['custom:userName'];
        // Same render batch as setStatus below — the caption can never see
        // 'authenticated' without the name.
        setDisplayName(
          typeof claimedName === 'string' && claimedName.trim()
            ? claimedName.trim()
            : '',
        );
        setStatus('authenticated');
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  return { status, logout, displayName };
};
