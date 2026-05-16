import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  confirmSignIn as amplifyConfirmSignIn,
  getCurrentUser,
  AuthError,
} from 'aws-amplify/auth';
import { display, inspectError, log } from 'src/utils/logger';
import {
  clearSessionCache,
  getSessionTokens,
  SessionTokens,
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
 * Start a sign-in session against the Cognito User Pool.
 */
export const cognitoSignIn = async (
  username: string,
  password: string,
): Promise<CognitoSignInResult> => {
  log('[cognito] signIn →', { username });
  try {
    const { isSignedIn, nextStep } = await amplifySignIn({
      username,
      password,
      options: { authFlowType: 'USER_SRP_AUTH' },
    });
    log('[cognito] signIn ✓', { isSignedIn, nextStep });
    if (isSignedIn) {
      // Warm the session cache immediately so the very first authenticated
      // request after sign-in skips a round-trip to fetchAuthSession.
      await getSessionTokens(true);
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
    if (isSignedIn) await getSessionTokens(true);
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
    if (isSignedIn) await getSessionTokens(true);
    return mapNextStep(isSignedIn, nextStep);
  } catch (err) {
    display('cognito.confirmCode FAILED', inspectError(err), undefined, true);
    throw err;
  }
};

/**
 * Fresh tokens. `forceRefresh=true` re-derives JWTs from the refresh token,
 * even if the cached idToken still looks valid — use after a 401.
 */
export const cognitoGetTokens = async (
  forceRefresh = false,
): Promise<CognitoTokens | null> => getSessionTokens(forceRefresh);

/** Returns the signed-in Cognito user, or null when no session exists. */
export const cognitoCurrentUser = async () => {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
};

/** Global sign-out — revokes refresh token and wipes Amplify storage. */
export const cognitoSignOut = async () => {
  try {
    await amplifySignOut();
  } catch (err) {
    display('cognito.signOut FAILED', inspectError(err));
  } finally {
    clearSessionCache();
  }
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
