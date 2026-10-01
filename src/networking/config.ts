import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL } from 'src/utils';
import { display, inspectError } from 'src/utils/logger';
import { useUserStore } from 'src/hooks/useUserStore';
import { queryClient } from 'src/queryClient';
import { resetToLogin } from 'src/routes/navigationRef';
import { cognitoSignOut, onSessionEnded } from './auth/cognito';
import { getValidAccessToken } from './auth/session';

export const appAxios = axios.create({
  baseURL: BASE_URL,
  // Fail fast instead of hanging forever on a dead connection — React Query
  // surfaces the error and retries per its own policy.
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* -------------------- Logout plumbing ---------------------------- */

// In-flight dedup: N parallel 401 cascades collapse into a single logout,
// and any re-entrant call short-circuits instead of looping.
let logoutInFlight: Promise<void> | null = null;

/**
 * The single sign-out routine, used by:
 *  - the response interceptor below (forced logout on terminal 401/403/419),
 *  - the session-ended listener below (Cognito rejected the refresh token), and
 *  - the drawer's user-initiated sign-out (useLogout delegates here).
 *
 * Owning the complete cleanup in one place keeps the two paths from drifting:
 *  1. Cognito sign-out — revokes the refresh token, wipes Amplify storage and
 *     the in-memory session/token cache (clearSessionCache runs in its finally).
 *     It first lets token reads still running inside Amplify settle (bounded,
 *     a few seconds), so a merely slow one settles onto the session it
 *     belongs to rather than the NEXT one — see cognitoSignOut /
 *     settlePendingTokenReads (and session.ts for the residual race past
 *     that cap).
 *  2. Clear the in-memory user store.
 *  3. Wipe every cached query so the next login can't briefly surface the
 *     previous user's data (the site-list cache key is user-agnostic).
 *  4. Forget the last-active site so the first card tap after re-login always
 *     runs the full switch lifecycle.
 *  5. Reset navigation to Onboarding → Login via the app-lifetime
 *     navigationRef — never a hook-registered handler, which goes stale when
 *     its screen unmounts. resetToLogin() no-ops while the container isn't
 *     ready or the user is already on the onboarding stack.
 */
export const executeLogout = (): Promise<void> => {
  if (logoutInFlight) return logoutInFlight;

  logoutInFlight = (async () => {
    try {
      await cognitoSignOut();
    } catch (err) {
      display('executeLogout cognitoSignOut FAILED', inspectError(err));
    } finally {
      useUserStore.getState().removeUser();
      queryClient.clear();
      // Deferred require: useSwitchActiveSite imports from src/networking,
      // so a top-level import here would create a require cycle. By the time
      // executeLogout runs, every module is initialized and this resolves to
      // the same singleton the hooks use.
      const { resetActiveSite } =
        require('src/hooks/useSwitchActiveSite') as typeof import('src/hooks/useSwitchActiveSite');
      resetActiveSite();
      resetToLogin();
    }
  })().finally(() => {
    logoutInFlight = null;
  });

  return logoutInFlight;
};

/* -------------------- Session ended by Cognito ------------------- */

// When Cognito DEFINITIVELY rejects the refresh token (expired, revoked, user
// deleted / disabled …), Amplify clears its token store and says so only via
// Hub. The token read then resolves null, the request interceptor below
// rejects locally (never sent → no 401), and the response interceptor never
// gets a chance to sign out: the user would sit in an authenticated shell
// where every load fails. That is reachable when the cold-start splash's
// stall abort routes a stored-but-dead session into the Drawer, and when a
// session dies while the app is open. Finish the logout Amplify started.
// Transient refresh failures never get here (onSessionEnded filters to
// Amplify's own session-ending errors), and executeLogout is deduped, so one
// failed refresh shared by N waiting callers is one sign-out.
onSessionEnded(() => {
  executeLogout();
});

/* -------------------- Request interceptor ----------------------- */

const isPublicPath = (url?: string): boolean => {
  if (!url) return false;
  // Anything under /public/* is unauthenticated by API Gateway, so don't
  // even try to attach a Bearer token (avoids needless refresh attempts
  // on the login screen before the user has signed in).
  return /(?:^|\/)public\//i.test(url);
};

// Marker so we only retry a 401 once.
type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * The rejection for "no token to send": network-style (no `response`), so
 * React Query treats it as retriable per its own policy, and nothing reads
 * it as an auth verdict on the session.
 */
const noTokenError = (message: string, config: InternalAxiosRequestConfig) =>
  new AxiosError(message, AxiosError.ERR_NETWORK, config);

appAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicPath(config.url)) return config;

    let accessToken: string | null = null;
    try {
      accessToken = await getValidAccessToken();
    } catch (err) {
      display('axios.request token FAILED', inspectError(err));
    }

    if (!accessToken) {
      // A protected request without a token is guaranteed to 401 — sending it
      // anyway would escalate a transient token-acquisition failure (Cognito
      // endpoint unreachable, keychain hiccup) into a forced sign-out via the
      // response interceptor. Reject locally with a network-style
      // (response-less) error instead, so React Query treats it as retriable
      // per its own policy. (No token because Cognito ended the session is
      // NOT transient — onSessionEnded above signs out for that case.)
      return Promise.reject(
        noTokenError(
          'Could not obtain an auth token for a protected request.',
          config,
        ),
      );
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  },
  (error) => Promise.reject(error),
);

/* -------------------- Response interceptor ---------------------- */

/**
 * Auth-error handling (protected endpoints only — /public/* is exempt):
 *
 *  1. On 401, attempt a single retry with `forceRefresh=true`. This handles
 *     the common case where API Gateway rejects a token because it expired
 *     in flight or because of clock drift — the retry uses the refresh
 *     token to mint a brand-new accessToken and retries the original request
 *     once.
 *  2. If that forced refresh yields NO token, don't sign out: it timed out
 *     or failed transiently (offline, DNS, Cognito 5xx / throttling), which
 *     says nothing about the refresh token. Reject with the same
 *     network-style error as the request interceptor's no-token case so
 *     React Query retries later. A refresh token Cognito DEFINITIVELY
 *     rejected is covered by onSessionEnded above: Amplify dispatches that
 *     Hub event (and clears its store) BEFORE the token read resolves, so
 *     the logout is already running by the time we get null here.
 *  3. If the RETRIED request is 401 again, trigger logout — the server
 *     rejects even a just-minted token. Never fall back to the ID token:
 *     mobile-client-v2 ID tokens are rejected with 401 by design, so that
 *     would just mask the real cause.
 *  4. 403 / 419 are treated as terminal — no retry, log out immediately.
 */
appAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetriableConfig | undefined;

    // /public/* requests carry no Bearer token, so an auth-status code from
    // them says nothing about the user's session (e.g. a CloudFront/WAF 403
    // on a public config fetch). Surface it as an ordinary error — never
    // retry with a token attached, never sign the user out.
    if (isPublicPath(original?.url)) {
      return Promise.reject(error);
    }

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      let accessToken: string | null = null;
      try {
        accessToken = await getValidAccessToken(true);
      } catch (err) {
        display('axios.response refresh FAILED', inspectError(err));
      }
      if (!accessToken) {
        // Rule 2 above: no verdict on the session → no sign-out.
        return Promise.reject(
          noTokenError(
            'Could not refresh the auth token after a 401.',
            original,
          ),
        );
      }
      original.headers = original.headers ?? {};
      (original.headers as any).Authorization = `Bearer ${accessToken}`;
      return appAxios.request(original);
    }

    if (status === 401 || status === 403 || status === 419) {
      executeLogout();
    }
    return Promise.reject(error);
  },
);
