import { fetchAuthSession } from 'aws-amplify/auth';
import { decodeJwt, isTokenExpired } from 'src/utils/jwt';
import { display, inspectError } from 'src/utils/logger';

/**
 * Single source of truth for Cognito tokens consumed by the networking layer
 * and any non-HTTP caller (MQTT, signed URLs, etc.).
 *
 * Storage:
 *   Tokens are NOT stored by us. `@aws-amplify/react-native` registers an
 *   AsyncStorage adapter; Amplify writes idToken / accessToken / refreshToken
 *   under keys like:
 *     CognitoIdentityServiceProvider.<clientId>.<sub>.idToken
 *     CognitoIdentityServiceProvider.<clientId>.<sub>.accessToken
 *     CognitoIdentityServiceProvider.<clientId>.<sub>.refreshToken
 *     CognitoIdentityServiceProvider.<clientId>.<sub>.clockDrift
 *     CognitoIdentityServiceProvider.<clientId>.LastAuthUser
 *   These survive app restarts. Amplify `signOut()` deletes them.
 *
 * Refresh:
 *   `fetchAuthSession()` returns the cached idToken/accessToken if still
 *   valid; otherwise it exchanges the refreshToken for new ones and
 *   persists them. We add a 60-second expiry buffer to refresh proactively
 *   so requests don't go out with a token that's about to expire mid-flight.
 *
 * Concurrency:
 *   Multiple parallel API calls during cold start would each call
 *   fetchAuthSession(). Amplify dedupes internally, but we also dedupe at
 *   this layer to keep our logging clean and to short-circuit when we
 *   already have a known-valid token in memory.
 */

export interface SessionTokens {
  idToken: string;
  accessToken: string;
  identityId?: string;
  /** Unix epoch seconds when the idToken claims it expires. */
  expiresAt: number;
}

const EXPIRY_BUFFER_SECONDS = 60;

let cached: SessionTokens | null = null;
let inflight: Promise<SessionTokens | null> | null = null;

const isFresh = (tokens: SessionTokens): boolean =>
  !isTokenExpired(tokens.idToken, EXPIRY_BUFFER_SECONDS);

const fetchAndCache = async (
  forceRefresh: boolean,
): Promise<SessionTokens | null> => {
  try {
    const session = await fetchAuthSession({ forceRefresh });
    const idToken = session.tokens?.idToken?.toString();
    const accessToken = session.tokens?.accessToken?.toString();
    if (!idToken || !accessToken) {
      cached = null;
      return null;
    }
    const claims = decodeJwt(idToken);
    cached = {
      idToken,
      accessToken,
      identityId: session.identityId,
      expiresAt: claims?.exp ?? 0,
    };
    return cached;
  } catch (err) {
    display('session.fetch FAILED', inspectError(err));
    cached = null;
    return null;
  }
};

/**
 * Returns a fresh, non-expired idToken bundle. Triggers a refresh when the
 * cached token is missing or within the expiry buffer.
 *
 * Pass `forceRefresh: true` after a 401 to discard the cache and exchange
 * the refresh token for a brand-new pair.
 */
export const getSessionTokens = async (
  forceRefresh = false,
): Promise<SessionTokens | null> => {
  if (!forceRefresh && cached && isFresh(cached)) return cached;

  if (inflight) return inflight;

  inflight = fetchAndCache(forceRefresh).finally(() => {
    inflight = null;
  });
  return inflight;
};

/** Convenience — returns just the idToken string, or null. */
export const getValidIdToken = async (
  forceRefresh = false,
): Promise<string | null> => {
  const tokens = await getSessionTokens(forceRefresh);
  return tokens?.idToken ?? null;
};

/** Drop the in-memory cache. Call this on logout to avoid stale reads. */
export const clearSessionCache = () => {
  cached = null;
  inflight = null;
};

/** For diagnostics / Reactotron — exposes the current cached snapshot. */
export const peekSession = (): SessionTokens | null => cached;
