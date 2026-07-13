import { fetchAuthSession } from 'aws-amplify/auth';
import { decodeJwt } from 'src/utils/jwt';
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
 *   already have a known-valid token in memory. The dedup is force-aware:
 *   a forced caller (post-401) never silently joins a non-forced fetch —
 *   that would hand back the exact token the server just rejected.
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
/** Whether the current `inflight` fetch (or chain) ends in a forced refresh. */
let inflightForced = false;
/**
 * Bumped by clearSessionCache() — a fetch started BEFORE a logout must not
 * repopulate `cached` with the signed-out user's tokens when it resolves
 * after the logout.
 */
let generation = 0;

// Freshness check against the expiry we decoded ONCE when the token was
// cached (fetchAndCache) — avoids a full base64 JWT decode on every
// authenticated request. `expiresAt` is keyed to `idToken` by construction:
// both are only ever written together. expiresAt=0 (decode failure) is never
// fresh, so we fall through to fetchAuthSession, same as before.
const isFresh = (tokens: SessionTokens): boolean =>
  Date.now() < (tokens.expiresAt - EXPIRY_BUFFER_SECONDS) * 1000;

const fetchAndCache = async (
  forceRefresh: boolean,
): Promise<SessionTokens | null> => {
  const startedInGeneration = generation;
  try {
    const session = await fetchAuthSession({ forceRefresh });

    if (generation !== startedInGeneration) {
      // clearSessionCache() ran while this fetch was in flight (logout) —
      // discard the result instead of resurrecting the old user's tokens.
      return null;
    }

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
    if (generation === startedInGeneration) {
      cached = null;
    }
    return null;
  }
};

/**
 * Register `p` as the current in-flight fetch. Cleanup is identity-guarded:
 * when a forced fetch is chained behind a non-forced one, the superseded
 * promise's `finally` must not clobber the tracking of its replacement
 * (that would break dedup and leave `inflightForced` stale).
 */
const trackInflight = (
  p: Promise<SessionTokens | null>,
  forced: boolean,
): Promise<SessionTokens | null> => {
  const tracked: Promise<SessionTokens | null> = p.finally(() => {
    if (inflight === tracked) {
      inflight = null;
      inflightForced = false;
    }
  });
  inflight = tracked;
  inflightForced = forced;
  return tracked;
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

  if (inflight) {
    // Join the in-flight fetch only when its force level satisfies the
    // caller. A forced caller joining a non-forced fetch would receive the
    // same not-yet-rotated token the server just rejected — the 401 retry
    // would then re-send it and escalate into a spurious sign-out. Chain a
    // genuine forced refresh behind the current fetch instead.
    // (fetchAndCache never rejects, so the chain always runs.)
    if (!forceRefresh || inflightForced) return inflight;
    return trackInflight(
      inflight.then(() => fetchAndCache(true)),
      true,
    );
  }

  return trackInflight(fetchAndCache(forceRefresh), forceRefresh);
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
  generation += 1;
  cached = null;
  inflight = null;
  inflightForced = false;
};

/** For diagnostics / Reactotron — exposes the current cached snapshot. */
export const peekSession = (): SessionTokens | null => cached;
