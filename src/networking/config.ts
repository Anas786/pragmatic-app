import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL } from 'src/utils';
import { display, inspectError } from 'src/utils/logger';
import { useUserStore } from 'src/hooks/useUserStore';
import { queryClient } from 'src/queryClient';
import { resetToLogin } from 'src/routes/navigationRef';
import { cognitoSignOut } from './auth/cognito';
import { getValidIdToken } from './auth/session';

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
 * The single sign-out routine, used by BOTH:
 *  - the response interceptor below (forced logout on terminal 401/403/419), and
 *  - the drawer's user-initiated sign-out (useLogout delegates here).
 *
 * Owning the complete cleanup in one place keeps the two paths from drifting:
 *  1. Cognito sign-out — revokes the refresh token, wipes Amplify storage and
 *     the in-memory session/token cache (clearSessionCache runs in its finally).
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

appAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicPath(config.url)) return config;

    let idToken: string | null = null;
    try {
      idToken = await getValidIdToken();
    } catch (err) {
      display('axios.request token FAILED', inspectError(err));
    }

    if (!idToken) {
      // A protected request without a token is guaranteed to 401 — sending it
      // anyway would escalate a transient token-acquisition failure (Cognito
      // endpoint unreachable, keychain hiccup) into a forced sign-out via the
      // response interceptor. Reject locally with a network-style
      // (response-less) error instead, so React Query treats it as retriable
      // per its own policy.
      return Promise.reject(
        new AxiosError(
          'Could not obtain an auth token for a protected request.',
          AxiosError.ERR_NETWORK,
          config,
        ),
      );
    }

    config.headers.Authorization = `Bearer ${idToken}`;
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
 *     token to mint a brand-new idToken and tries the original request once.
 *  2. If the retry also fails (or we already retried once), trigger logout.
 *  3. 403 / 419 are treated as terminal — no retry, log out immediately.
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
      try {
        const idToken = await getValidIdToken(true);
        if (idToken) {
          original.headers = original.headers ?? {};
          (original.headers as any).Authorization = `Bearer ${idToken}`;
          return appAxios.request(original);
        }
      } catch (err) {
        display('axios.response retry FAILED', inspectError(err));
      }
    }

    if (status === 401 || status === 403 || status === 419) {
      executeLogout();
    }
    return Promise.reject(error);
  },
);
