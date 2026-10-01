/**
 * Offline-safe "is a Cognito session stored on this device?" probe.
 *
 * Used ONLY to pick the route when the real auth hydrate gives no verdict —
 * the splash gave up waiting for it (useAuth, still 'loading' after
 * STALL_MAX_MS), or it failed transiently (useAuth 'indeterminate': offline,
 * Cognito 5xx …): a stored session → Drawer, otherwise → Login. That is
 * exactly when the network is hanging or down, so this must never touch it:
 *
 *  - It reads Amplify's OWN token store — the DefaultTokenStore of the
 *    `cognitoUserPoolsTokenProvider` that `Amplify.configure` wires to
 *    `defaultStorage` (AsyncStorage on React Native) — via `loadTokens()`,
 *    which only reads storage and base64-decodes the JWTs. It never
 *    refreshes and never throws (any failure → null).
 *  - NOT getCurrentUser() / fetchAuthSession(): both go through
 *    TokenOrchestrator.getTokens(), which refreshes an expired token over the
 *    network (GetTokensFromRefreshToken), and fetchAuthSession additionally
 *    fetches identity-pool AWS credentials (GetCredentialsForIdentity) —
 *    the very calls that are hanging when the abort fires.
 *
 * Storage layout read by loadTokens() (@aws-amplify/auth 6.20, TokenStore;
 * the native DefaultStorage of @aws-amplify/core adds a `@MemoryStorage:`
 * prefix to every AsyncStorage key):
 *   CognitoIdentityServiceProvider.<userPoolClientId>.LastAuthUser
 *   CognitoIdentityServiceProvider.<userPoolClientId>.<LastAuthUser>.accessToken
 *   CognitoIdentityServiceProvider.<userPoolClientId>.<LastAuthUser>.idToken
 *   CognitoIdentityServiceProvider.<userPoolClientId>.<LastAuthUser>.refreshToken
 *   (+ clockDrift, signInDetails, device keys)
 * `userPoolClientId` is the one passed to Amplify.configure in
 * src/config/amplify.ts (env COGNITO_USER_POOL_CLIENT_ID, hard-coded
 * mobile-client-v2 fallback) — read by Amplify itself, not duplicated here.
 *
 * Read-only by construction: it never signs out and never clears anything.
 * Bounded by its own timeout; an error or timeout means "no session" (Login).
 */
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import type { CognitoIdTokenClaims } from 'src/utils/jwt';
import { STORED_SESSION_PROBE_MS } from './timeline';

export interface StoredSession {
  /** Stored ID-token claims (for the user store), or null if unusable. */
  idClaims: CognitoIdTokenClaims | null;
}

const readStoredSession = async (): Promise<StoredSession | null> => {
  const tokens = await cognitoUserPoolsTokenProvider.authTokenStore.loadTokens();
  if (!tokens?.accessToken) {
    // No session at all (Amplify's own rule: no access token, no session).
    return null;
  }
  if (!tokens.refreshToken) {
    // Nothing to refresh with: even a still-valid access token dies within
    // a day, and Amplify then fails the refresh with a NON-definitive error
    // (TokenRefreshException) that neither clears the store nor ends the
    // session — the Drawer would be stuck on failing loads with no way out
    // but a manual logout. (Never happens after a USER_SRP_AUTH sign-in,
    // which always stores a refresh token.)
    return null;
  }
  const id = tokens.idToken?.payload;
  const idClaims =
    id && typeof id.sub === 'string'
      ? (id as unknown as CognitoIdTokenClaims)
      : null;
  return { idClaims };
};

/**
 * Resolves the locally stored session, or null when there is none / the read
 * failed / it took longer than `timeoutMs`. Never rejects.
 *
 * "Stored" means resumable without asking the user: an access token plus a
 * refresh token (the access token may be expired). Whether Cognito still
 * accepts the refresh token cannot be known offline — the first refresh
 * settles it: success, or Amplify clears the tokens and the app's
 * onSessionEnded listener (src/networking/config.ts) logs out.
 */
export function probeStoredSession(
  timeoutMs: number = STORED_SESSION_PROBE_MS,
): Promise<StoredSession | null> {
  return new Promise(resolve => {
    let settled = false;
    const finish = (value: StoredSession | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    readStoredSession().then(finish, () => finish(null));
  });
}
