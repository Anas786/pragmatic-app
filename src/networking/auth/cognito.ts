import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignIn as amplifyConfirmSignIn,
  getCurrentUser,
  AuthError,
  type SignInOutput,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { display, inspectError, log } from 'src/utils/logger';
import {
  clearSessionCache,
  getSessionTokens,
  SessionTokens,
  settlePendingTokenReads,
  trackTokenRead,
} from './session';

export type CognitoSignInStep =
  | 'DONE'
  | 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  | 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
  | 'CONFIRM_SIGN_IN_WITH_TOTP_CODE'
  | 'RESET_PASSWORD'
  | 'CONFIRM_SIGN_UP'
  | 'UNKNOWN';

export interface CognitoSignInResult {
  step: CognitoSignInStep;
  isSignedIn: boolean;
  missingAttributes?: string[];
}

/** Backwards-compat alias — same shape, lives in session.ts now. */
export type CognitoTokens = SessionTokens;

/**
 * Never log the raw sign-in identifier — it's the user's email (PII).
 * Keep only the domain as a debugging breadcrumb.
 */
const redactUsername = (username: string): string => {
  const at = username.indexOf('@');
  return at > 0 ? `***@${username.slice(at + 1)}` : '***';
};

const isAlreadyAuthenticated = (err: unknown): boolean =>
  err instanceof AuthError && err.name === 'UserAlreadyAuthenticatedException';

const srpSignIn = (username: string, password: string) =>
  amplifySignIn({
    username,
    password,
    options: { authFlowType: 'USER_SRP_AUTH' },
  });

/** The sign-out currently running (cognitoSignOut), if any. */
let signOutInFlight: Promise<void> | null = null;

/**
 * Let the PREVIOUS session's token work finish before a new one is stored.
 * A token read still running inside Amplify (one session.ts' timeout
 * abandoned, or the splash hydrate's) settles onto whatever session is
 * stored by then: if that is the new one, a definitive refresh failure makes
 * Amplify wipe it and onSessionEnded log the new user straight out. So wait
 * for those reads (bounded — see settlePendingTokenReads), then for any
 * sign-out one of them just triggered (onSessionEnded → executeLogout →
 * cognitoSignOut, started synchronously from Amplify's Hub dispatch before
 * the read settles), so its store wipe and its user/cache reset can't land
 * on top of the new session either. Only waits; past the cap, the residual
 * race in session.ts ("Abandoned reads") applies.
 */
const settlePreviousSession = async (): Promise<void> => {
  await settlePendingTokenReads();
  if (signOutInFlight) {
    await signOutInFlight;
  }
};

/**
 * Start a sign-in session against the Cognito User Pool.
 *
 * Amplify's signIn() refuses to run while ANY session is stored
 * (UserAlreadyAuthenticatedException). The Login screen can legitimately be
 * reached with one still stored: the cold-start splash routes to Login when
 * the session hydrate fails transiently or stalls past its 20 s cap AND its
 * local stored-session probe failed (with a readable stored session both go
 * to the Drawer) — and we deliberately don't wipe the session there, so a
 * slow launch never signs anyone out. The user is
 * re-entering credentials now, so this is the moment to drop the stale
 * session (local sign-out) and retry once. Retrying with THESE credentials —
 * rather than resuming the stored session — also means a different account
 * signing in can never inherit the previous user's session.
 *
 * Before the first SRP attempt, the previous session's token reads (and a
 * sign-out one of them triggers) get to settle — see settlePreviousSession.
 * On the retry path, cognitoSignOut runs the same bounded wait before it
 * wipes the stale session, right before the second attempt.
 */
export const cognitoSignIn = async (
  username: string,
  password: string,
): Promise<CognitoSignInResult> => {
  log('[cognito] signIn →', { username: redactUsername(username) });
  try {
    await settlePreviousSession();
    let output: SignInOutput;
    try {
      output = await srpSignIn(username, password);
    } catch (err) {
      if (!isAlreadyAuthenticated(err)) {
        throw err;
      }
      log('[cognito] signIn: stale stored session — local sign-out, retrying');
      await cognitoSignOut();
      output = await srpSignIn(username, password);
    }
    const { isSignedIn, nextStep } = output;
    log('[cognito] signIn ✓', { isSignedIn, nextStep });
    if (isSignedIn) {
      // Warm the session cache immediately so the very first authenticated
      // request after sign-in skips a token-store read.
      // NON-forced on purpose: the SRP flow just minted the tokens, so this
      // reads them from Amplify's store with no network I/O — forceRefresh
      // would discard them and pay a second Cognito exchange on the login
      // critical path.
      await getSessionTokens();
    }
    return mapNextStep(isSignedIn, nextStep);
  } catch (err) {
    display('cognito.signIn FAILED', inspectError(err), undefined, true);
    throw err;
  }
};

/** Complete a CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED challenge. */
export const cognitoConfirmNewPassword = async (
  newPassword: string,
): Promise<CognitoSignInResult> => {
  try {
    const { isSignedIn, nextStep } = await amplifyConfirmSignIn({
      challengeResponse: newPassword,
    });
    // Non-forced warm-up — see cognitoSignIn.
    if (isSignedIn) await getSessionTokens();
    log('[cognito] confirmNewPassword ✓', { isSignedIn, nextStep });
    return mapNextStep(isSignedIn, nextStep);
  } catch (err) {
    display(
      'cognito.confirmNewPassword FAILED',
      inspectError(err),
      undefined,
      true,
    );
    throw err;
  }
};

/** Complete an SMS / TOTP challenge. */
export const cognitoConfirmCode = async (
  code: string,
): Promise<CognitoSignInResult> => {
  try {
    const { isSignedIn, nextStep } = await amplifyConfirmSignIn({
      challengeResponse: code,
    });
    // Non-forced warm-up — see cognitoSignIn.
    if (isSignedIn) await getSessionTokens();
    return mapNextStep(isSignedIn, nextStep);
  } catch (err) {
    display('cognito.confirmCode FAILED', inspectError(err), undefined, true);
    throw err;
  }
};

/**
 * Fresh tokens. `forceRefresh=true` re-derives JWTs from the refresh token,
 * even if the cached accessToken still looks valid — use after a 401.
 */
export const cognitoGetTokens = async (
  forceRefresh = false,
): Promise<CognitoTokens | null> => getSessionTokens(forceRefresh);

/**
 * Returns the signed-in Cognito user, or null when there is DEFINITIVELY no
 * session (isNoSessionError): nothing stored, Cognito rejected the refresh
 * token, or there is no refresh token to renew an expired session with.
 *
 * Any OTHER failure is RETHROWN — NetworkError (offline, DNS), throttling,
 * Cognito 5xx, an unknown error. Those say nothing about the stored session
 * (Amplify keeps its tokens), and the only caller — the cold-start hydrate in
 * useAuth — must be able to tell "signed out" from "couldn't check", so a
 * user whose refresh token is fine isn't sent to Login because the network
 * was down at launch.
 *
 * Its token read (a refresh may be inside) is tracked like session.ts' own,
 * so a sign-in / sign-out waits for it (settlePendingTokenReads).
 */
export const cognitoCurrentUser = async () => {
  try {
    return await trackTokenRead(getCurrentUser());
  } catch (error) {
    if (isNoSessionError(error)) {
      return null;
    }
    throw error;
  }
};

/**
 * Refresh errors after which the session is OVER, not merely unreachable.
 * Mirrors Amplify's own list exactly (TokenOrchestrator.isAuthenticationError,
 * @aws-amplify/auth 6.20): on precisely these, Amplify has ALREADY cleared the
 * stored tokens itself. Transient failures (NetworkError, throttling, 5xx,
 * clock skew) keep the tokens and are deliberately absent — a slow or flaky
 * network must never sign anyone out.
 */
const SESSION_ENDING_REFRESH_ERRORS = [
  'NotAuthorizedException', // refresh token expired / invalid
  'TokenRevokedException',
  'UserNotFoundException',
  'PasswordResetRequiredException',
  'UserNotConfirmedException',
  'RefreshTokenReuseException',
] as const;

export const isSessionEndingRefreshError = (error: unknown): boolean => {
  const name = (error as { name?: unknown } | null | undefined)?.name;
  return (
    typeof name === 'string' &&
    SESSION_ENDING_REFRESH_ERRORS.some(ending => name.startsWith(ending))
  );
};

/**
 * getCurrentUser() failures that mean "no usable session", not "couldn't
 * check" (@aws-amplify/auth 6.20):
 *  - UserUnAuthenticatedException — no tokens stored, the store unreadable
 *    (its loadTokens() resolves null on any storage error), or a
 *    NotAuthorized refresh that already cleared the store;
 *  - TokenRefreshException — an expired token stored WITHOUT a refresh
 *    token (Amplify's implicit-grant check): it can never be renewed;
 *  - the session-ending refresh errors above.
 * Deliberately NOT added to SESSION_ENDING_REFRESH_ERRORS: that list drives
 * onSessionEnded's logout and mirrors exactly what makes Amplify clear its
 * store.
 */
const NO_SESSION_ERRORS = [
  'UserUnAuthenticatedException',
  'TokenRefreshException',
] as const;

const isNoSessionError = (error: unknown): boolean => {
  const name = (error as { name?: unknown } | null | undefined)?.name;
  return (
    (typeof name === 'string' &&
      (NO_SESSION_ERRORS as readonly string[]).includes(name)) ||
    isSessionEndingRefreshError(error)
  );
};

/**
 * Calls `onEnded` each time Cognito DEFINITIVELY rejects a token refresh
 * (Hub 'tokenRefresh_failure' carrying a session-ending error). Hub is the
 * only signal Amplify gives for this: on NotAuthorizedException its token
 * read just resolves null afterwards — no error, and since a protected
 * request is never sent without a token, no 401 either. Fires once per
 * caller that was waiting on the failed (deduplicated) refresh, so `onEnded`
 * must be idempotent. Returns the unsubscribe function.
 */
export const onSessionEnded = (onEnded: () => void): (() => void) =>
  Hub.listen('auth', ({ payload }) => {
    if (
      payload.event === 'tokenRefresh_failure' &&
      isSessionEndingRefreshError(payload.data?.error)
    ) {
      onEnded();
    }
  });

/**
 * Sign-out — revokes the refresh token (when the session is revocable) and
 * wipes Amplify's storage, then drops the in-memory token cache.
 *
 * First lets token reads still running inside Amplify settle (bounded, see
 * settlePendingTokenReads): one that settled AFTER the wipe would act on the
 * next session instead — a late refresh success would store the signed-out
 * user's tokens again, a late definitive failure would wipe the next user's
 * session. Waiting first also makes the revoke inside amplifySignOut() target
 * the refresh token the device ends up holding (a refresh can rotate it). If
 * such a read ends the session while we wait, its Hub event re-enters
 * executeLogout, which is deduped. A read that outlasts the cap is not
 * waited for: see the residual race in session.ts ("Abandoned reads").
 * Never rejects; clearSessionCache() runs whatever happens, so the next user
 * is never served this user's cached token.
 */
export const cognitoSignOut = (): Promise<void> => {
  const run = (async () => {
    await settlePendingTokenReads(); // never rejects
    try {
      await amplifySignOut();
    } catch (err) {
      display('cognito.signOut FAILED', inspectError(err));
    } finally {
      clearSessionCache();
    }
  })();
  signOutInFlight = run;
  run.then(() => {
    if (signOutInFlight === run) {
      signOutInFlight = null;
    }
  });
  return run;
};

const mapNextStep = (
  isSignedIn: boolean,
  nextStep: { signInStep: string; missingAttributes?: string[] } | undefined,
): CognitoSignInResult => {
  const stepName = nextStep?.signInStep ?? 'DONE';
  const step: CognitoSignInStep = (
    [
      'DONE',
      'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      'CONFIRM_SIGN_IN_WITH_SMS_CODE',
      'CONFIRM_SIGN_IN_WITH_TOTP_CODE',
      'RESET_PASSWORD',
      'CONFIRM_SIGN_UP',
    ] as const
  ).includes(stepName as any)
    ? (stepName as CognitoSignInStep)
    : 'UNKNOWN';

  return {
    step,
    isSignedIn,
    missingAttributes: nextStep?.missingAttributes,
  };
};

/** Friendly error mapper for UI alerts. */
export const cognitoErrorMessage = (err: unknown): string => {
  if (err instanceof AuthError) {
    switch (err.name) {
      case 'NotAuthorizedException':
        return 'Incorrect email or password.';
      case 'UserNotFoundException':
        return 'No account found for this email.';
      case 'UserNotConfirmedException':
        return 'Please confirm your account before signing in.';
      case 'PasswordResetRequiredException':
        return 'You must reset your password before signing in.';
      case 'NetworkError':
        return 'Network error. Check your connection and try again.';
    }
    const cause = (err as any).underlyingError ?? (err as any).cause;
    const causeMsg =
      cause instanceof Error ? `${cause.name}: ${cause.message}` : '';
    return [err.name, err.message, causeMsg].filter(Boolean).join(' — ');
  }
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  if (typeof err === 'string') return err;
  return 'Unable to sign in.';
};
