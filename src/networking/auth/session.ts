import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { CognitoAccessTokenClaims, decodeJwt } from 'src/utils/jwt';
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
 * Which token goes where (mobile-client-v2 handoff, 2026-09-27):
 *   - Mobile API (`/private/*`, `/protected/*`) → ACCESS token. This client's
 *     ID token is rejected with 401 by design, so there is no ID-token
 *     fallback to add on failure — a 401 means refresh once, then sign out.
 *   - Identity pool (IoT/MQTT, S3 exports) → ID token. Amplify builds that
 *     Logins map itself from the session; we must not touch it.
 *   - User profile shown in the UI (name / role / company) → ID token claims.
 *     The access token carries no `email` and no `custom:*` attributes, which
 *     is why the idToken stays in the bundle below for `userFromClaims`.
 *
 * Refresh:
 *   Tokens come from the user-pool token provider (the same TokenOrchestrator
 *   `fetchAuthSession()` uses for its `tokens`): the stored idToken/
 *   accessToken if still valid, otherwise it exchanges the refreshToken for
 *   new ones and persists them. We add a 60-second expiry buffer to refresh
 *   proactively so requests don't go out with a token that's about to
 *   expire mid-flight.
 *   NOT `fetchAuthSession()`: with an identityPoolId configured it ALSO
 *   fetches identity-pool AWS credentials (GetCredentialsForIdentity) on
 *   every cold start and every forced refresh, and throws when that fails —
 *   so a slow or unreachable cognito-identity endpoint blocked every API
 *   call (and the splash's session hydrate) even with a perfectly valid
 *   access token on the device. Nothing here uses those credentials;
 *   identity-pool callers (IoT/MQTT, S3) call fetchAuthSession themselves.
 *
 * Bounded:
 *   Amplify's fetch has no timeout (RN Android's OkHttp timeouts are 0) and
 *   retries connection errors, and axios' `timeout` only starts once the
 *   async request interceptor has its token. So a token read that needs the
 *   network (a refresh) is capped at TOKEN_FETCH_TIMEOUT_MS: past that the
 *   callers get null — the interceptor rejects the request as a retriable
 *   network error, so screens reach React Query's error/retry state instead
 *   of an endless skeleton — and the late result is dropped. The next call
 *   starts a fresh read; note Amplify dedupes refreshes internally, so it
 *   joins a refresh request that is still hanging until that one settles.
 *
 * Abandoned reads:
 *   Dropping a late result does not stop the read: it keeps running inside
 *   Amplify, and Amplify acts on whatever session is stored WHEN it settles —
 *   a definitive refresh failure runs its clearTokens() (+ the Hub event that
 *   onSessionEnded turns into a logout), a success stores the refreshed
 *   tokens under the user the read started for (and points Amplify's
 *   LastAuthUser back at them). So every provider read is tracked until it
 *   settles (`trackTokenRead` — bookkeeping only, nothing happens when it
 *   settles), and `settlePendingTokenReads()` lets sign-in and sign-out
 *   (cognito.ts) wait for them first, at most TOKEN_READ_SETTLE_CAP_MS. A
 *   read that is merely slow therefore settles onto the session it belongs
 *   to, before that session is wiped or replaced.
 *
 *   Residual race (pre-existing — before the wait there was no protection
 *   at all): a refresh STILL pending when the cap runs out at sign-out keeps
 *   running, and when it finally settles it can
 *    (a) fail with NotAuthorized (e.g. the sign-out revoked its refresh
 *        token): Amplify clears whatever session is stored by then. If
 *        someone has signed in meanwhile, they are signed out
 *        (onSessionEnded) and must sign in again — fail-closed.
 *    (b) succeed, in an even narrower window — its response was already on
 *        its way before the revoke (or there was nothing to revoke, or the
 *        revoke failed: Amplify's signOut wipes locally regardless):
 *        Amplify stores the PREVIOUS user's refreshed tokens and points its
 *        store back at them. The signed-out session comes back (next cold
 *        start → Drawer), or a user who signed in since is served the
 *        previous account's tokens from then on. Amplify also dedupes
 *        refreshes, so any refresh started while that one is in flight —
 *        the next user's included — receives its result.
 *   Both need a refresh that hangs past the cap AND a sign-out (plus, for a
 *   second account, a sign-in) within its lifetime. Nothing here writes
 *   Amplify's token storage to undo either outcome: an earlier attempt did,
 *   raced Amplify's own writes, and could delete a valid new session.
 *
 * Clock drift:
 *   Amplify stores `clockDrift` (server minus device time, measured at each
 *   sign-in / refresh) and applies it in its own expiry check. The cache
 *   below applies the same correction, so a device whose clock runs slow
 *   doesn't keep sending an access token the server already considers
 *   expired (an avoidable 401 + forced refresh + retry).
 *
 * Concurrency:
 *   Multiple parallel API calls during cold start would each read tokens.
 *   Amplify dedupes refreshes internally, but we also dedupe at this layer
 *   to keep our logging clean and to short-circuit when we already have a
 *   known-valid token in memory. The dedup is force-aware: a forced caller
 *   (post-401) never silently joins a non-forced fetch — that would hand
 *   back the exact token the server just rejected.
 *
 * Session ended:
 *   When Cognito definitively rejects the refresh token, Amplify clears its
 *   store and the read below returns null. The logout that follows is driven
 *   by `onSessionEnded` (cognito.ts), wired in src/networking/config.ts.
 */

export interface SessionTokens {
  idToken: string;
  accessToken: string;
  /** Unix epoch seconds when the accessToken claims it expires. */
  expiresAt: number;
  /**
   * Amplify's stored clock drift in ms (server time minus device time; 0
   * when unknown). Server "now" ≈ Date.now() + clockDriftMs.
   */
  clockDriftMs: number;
}

const EXPIRY_BUFFER_SECONDS = 60;

/**
 * Cap on one token read (refresh included). Matches appAxios' request
 * timeout: a protected request waits at most this long for its token, then
 * at most that long for the response.
 */
export const TOKEN_FETCH_TIMEOUT_MS = 15000;

/**
 * Default cap for `settlePendingTokenReads()`: long enough for a refresh
 * that is merely slow to land, short enough that a sign-in / sign-out never
 * waits noticeably on a connection that is truly hanging.
 */
export const TOKEN_READ_SETTLE_CAP_MS = 3000;

/* -------------------- Provider reads still running in Amplify ---- */

/**
 * Every token read handed to Amplify that has not settled yet. Each entry is
 * the read's settle signal (it never rejects).
 */
const pendingReads = new Set<Promise<void>>();
const noop = () => undefined;

/**
 * Track `read` (a promise that runs Amplify's token read — a refresh may be
 * inside) until it settles, including after its caller stopped waiting.
 * Bookkeeping only: it records what is pending for settlePendingTokenReads()
 * and does nothing when the read settles. Returns `read` itself. Used for
 * this module's provider reads and for cognitoCurrentUser's getCurrentUser()
 * (the splash hydrate).
 */
export const trackTokenRead = <T>(read: Promise<T>): Promise<T> => {
  const settled = read.then(noop, noop);
  pendingReads.add(settled);
  settled.then(() => {
    pendingReads.delete(settled);
  });
  return read;
};

/**
 * Wait until no tracked token read is running inside Amplify, at most
 * `capMs`. Only waits — no other side effect — and never rejects; resolves
 * at once when nothing is pending. Reads that START while waiting are waited
 * for too (same deadline). cognito.ts calls it before SRP sign-in and before
 * Amplify's signOut, so a read that is merely slow settles onto the session
 * it started for (see "Abandoned reads" above). When the cap wins, the caller
 * proceeds anyway — a connection that hangs for minutes must not block
 * signing in or out — and the residual race described above applies. (A
 * read that never settles — RN Android's fetch has no timeout — stays
 * tracked, so each later sign-in / sign-out pays the cap again; a bounded
 * cost, in that rare state only.)
 */
export const settlePendingTokenReads = async (
  capMs: number = TOKEN_READ_SETTLE_CAP_MS,
): Promise<void> => {
  if (pendingReads.size === 0) {
    return;
  }
  const deadline = Date.now() + capMs;
  while (pendingReads.size > 0) {
    const left = deadline - Date.now();
    if (left <= 0) {
      display('session.settlePendingTokenReads GAVE UP', {
        pending: pendingReads.size,
        afterMs: capMs,
      });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.all(pendingReads),
      new Promise<void>(resolve => {
        timer = setTimeout(resolve, left);
      }),
    ]);
    clearTimeout(timer);
  }
};

/* -------------------- Bounded read ------------------------------- */

type ProviderTokens = Awaited<
  ReturnType<typeof cognitoUserPoolsTokenProvider.getTokens>
>;
const TIMED_OUT = Symbol('token read timed out');

/**
 * Amplify's stored clock drift (ms) — the correction its own expiry check
 * applies (`isTokenExpired`: now + clockDrift > expiresAt), written at each
 * sign-in / refresh as `iat·1000 − Date.now()`. The provider's getTokens()
 * doesn't return it, so read it from the token store: local storage only
 * (loadTokens never refreshes, and resolves null instead of throwing).
 * 0 on any problem — exactly the pre-drift behaviour.
 */
const readClockDriftMs = async (): Promise<number> => {
  try {
    const stored =
      await cognitoUserPoolsTokenProvider.authTokenStore.loadTokens();
    const drift = stored?.clockDrift;
    return typeof drift === 'number' && Number.isFinite(drift) ? drift : 0;
  } catch {
    return 0;
  }
};

/**
 * The provider's token read (+ the stored clock drift), raced against
 * TOKEN_FETCH_TIMEOUT_MS. Amplify's promise can't be cancelled; once the
 * timer wins, its eventual outcome is ignored here (the rejection handler
 * below keeps a late failure from surfacing as an unhandled rejection) — but
 * it stays tracked until it settles (trackTokenRead).
 */
const readTokensWithin = (
  forceRefresh: boolean,
): Promise<
  { tokens: ProviderTokens; clockDriftMs: number } | typeof TIMED_OUT
> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), TOKEN_FETCH_TIMEOUT_MS);
    trackTokenRead(cognitoUserPoolsTokenProvider.getTokens({ forceRefresh }))
      .then(async tokens => ({
        tokens,
        // After the read: a refresh inside it stores a new drift.
        clockDriftMs: tokens ? await readClockDriftMs() : 0,
      }))
      .then(
        result => {
          clearTimeout(timer);
          resolve(result);
        },
        error => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });

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
// authenticated request. `expiresAt` is keyed to `accessToken` by
// construction: both are only ever written together, and the accessToken is
// the one we send. Cognito configures the id/access validity windows
// independently (both 1 day on this client), so keying off the idToken could
// hand out an already-expired accessToken. expiresAt=0 (decode failure) is
// never fresh, so we fall through to the token provider, same as before.
// "Now" is the SERVER's now (device clock + Amplify's stored drift), the
// same correction Amplify's own expiry check makes — otherwise a slow device
// clock keeps serving a token API Gateway already rejects as expired.
const isFresh = (tokens: SessionTokens): boolean =>
  Date.now() + tokens.clockDriftMs <
  (tokens.expiresAt - EXPIRY_BUFFER_SECONDS) * 1000;

const fetchAndCache = async (
  forceRefresh: boolean,
): Promise<SessionTokens | null> => {
  const startedInGeneration = generation;
  try {
    const read = await readTokensWithin(forceRefresh);

    if (generation !== startedInGeneration) {
      // clearSessionCache() ran while this fetch was in flight (logout) —
      // discard the result instead of resurrecting the old user's tokens.
      return null;
    }

    if (read === TIMED_OUT) {
      display('session.fetch TIMED OUT', {
        forceRefresh,
        afterMs: TOKEN_FETCH_TIMEOUT_MS,
      });
      cached = null;
      return null;
    }

    const { tokens, clockDriftMs } = read;
    const idToken = tokens?.idToken?.toString();
    const accessToken = tokens?.accessToken?.toString();
    if (!idToken || !accessToken) {
      cached = null;
      return null;
    }
    const claims = decodeJwt<CognitoAccessTokenClaims>(accessToken);
    cached = {
      idToken,
      accessToken,
      expiresAt: claims?.exp ?? 0,
      clockDriftMs,
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
 * Returns a fresh, non-expired token bundle. Triggers a refresh when the
 * cached accessToken is missing or within the expiry buffer.
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

/**
 * Convenience — returns just the accessToken string, or null. This is the
 * token attached as `Authorization: Bearer …` on every protected request.
 * The ID token is NOT interchangeable here: mobile-client-v2 ID tokens are
 * rejected with 401 on purpose.
 */
export const getValidAccessToken = async (
  forceRefresh = false,
): Promise<string | null> => {
  const tokens = await getSessionTokens(forceRefresh);
  return tokens?.accessToken ?? null;
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
