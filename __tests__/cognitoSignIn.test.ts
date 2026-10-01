/**
 * cognito.ts sign-in / sign-out flows, with Amplify's signIn / signOut /
 * confirmSignIn mocked.
 *
 *  - Stale-session recovery: the cold-start splash can route to Login while
 *    Amplify still holds a stored session (transient hydrate failure, or the
 *    20 s stall abort) — by design it never clears the session itself.
 *    Amplify's signIn() then throws UserAlreadyAuthenticatedException, which
 *    cognitoSignIn must turn into a sign-out + ONE retry with the
 *    credentials the user just entered.
 *  - The bounded wait for token reads still running inside Amplify
 *    (settlePendingTokenReads): costs nothing when none is pending, and
 *    precedes SRP — on the retry path too — and Amplify's signOut.
 *  - cognitoSignOut never rejects, even when Amplify's signOut does.
 *  - NEW_PASSWORD_REQUIRED: the challenge answer is a plain confirmSignIn().
 */
import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import { AuthError } from 'aws-amplify/auth';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import {
  cognitoConfirmNewPassword,
  cognitoSignIn,
  cognitoSignOut,
} from '../src/networking/auth/cognito';
import {
  getValidAccessToken,
  peekSession,
  TOKEN_READ_SETTLE_CAP_MS,
} from '../src/networking/auth/session';
import { flush, jwt, nowS, USER } from './fixtures/cognitoSession';

jest.mock('aws-amplify/auth', () => ({
  ...(jest.requireActual('aws-amplify/auth') as object),
  signIn: jest.fn(),
  signOut: jest.fn(),
  confirmSignIn: jest.fn(),
}));

type AnyFn = (...args: any[]) => any;
const amplify = jest.requireMock('aws-amplify/auth') as {
  signIn: Mock<AnyFn>;
  signOut: Mock<AnyFn>;
  confirmSignIn: Mock<AnyFn>;
};

const alreadySignedIn = () =>
  new AuthError({
    name: 'UserAlreadyAuthenticatedException',
    message: 'There is already a signed in user.',
  });

const DONE = { isSignedIn: true, nextStep: { signInStep: 'DONE' } };

const track = <T,>(p: Promise<T>) => {
  const box: { value: T | 'pending' } = { value: 'pending' };
  p.then(v => {
    box.value = v;
  });
  return box;
};

/**
 * Token-provider reads left hanging (a refresh on a stalled network) until
 * released. Tracked reads are module state, so afterEach releases any a test
 * leaves behind — otherwise every later wait in this file would run its cap.
 */
const hanging: Array<() => void> = [];
const hang = () =>
  new Promise<never>(resolve => {
    hanging.push(() => resolve(null as never));
  });

let getTokens: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  jest.clearAllMocks();
  amplify.signOut.mockResolvedValue(undefined);
  // getSessionTokens() warm-up after a successful sign-in (session.ts reads
  // the user-pool token provider).
  getTokens = jest
    .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
    .mockResolvedValue(null);
});

afterEach(async () => {
  hanging.splice(0).forEach(release => release());
  await flush();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** Starts a tracked token read that hangs until released (or the test ends). */
const startHangingRead = async () => {
  getTokens.mockImplementationOnce(hang);
  track(getValidAccessToken());
  await flush();
  expect(hanging).toHaveLength(1);
};

it('signs in directly when no session is stored (no sign-out)', async () => {
  amplify.signIn.mockResolvedValueOnce(DONE);

  const result = await cognitoSignIn('user@example.com', 'pw');

  expect(result).toEqual({ step: 'DONE', isSignedIn: true, missingAttributes: undefined });
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  expect(amplify.signOut).not.toHaveBeenCalled();
});

it('drops a stale stored session and retries once with the same credentials', async () => {
  amplify.signIn.mockRejectedValueOnce(alreadySignedIn()).mockResolvedValueOnce(DONE);

  const result = await cognitoSignIn('user@example.com', 'pw');

  expect(result.isSignedIn).toBe(true);
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(amplify.signIn).toHaveBeenCalledTimes(2);
  expect(amplify.signIn.mock.calls[1][0]).toMatchObject({
    username: 'user@example.com',
    password: 'pw',
    options: { authFlowType: 'USER_SRP_AUTH' },
  });
  // The sign-out happens BEFORE the retry.
  expect(amplify.signOut.mock.invocationCallOrder[0]).toBeLessThan(
    amplify.signIn.mock.invocationCallOrder[1],
  );
});

it('does not retry more than once', async () => {
  amplify.signIn
    .mockRejectedValueOnce(alreadySignedIn())
    .mockRejectedValueOnce(alreadySignedIn());

  await expect(cognitoSignIn('user@example.com', 'pw')).rejects.toMatchObject({
    name: 'UserAlreadyAuthenticatedException',
  });
  expect(amplify.signIn).toHaveBeenCalledTimes(2);
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
});

it('rethrows other sign-in errors untouched — no sign-out, no retry', async () => {
  const wrongPassword = new AuthError({
    name: 'NotAuthorizedException',
    message: 'Incorrect username or password.',
  });
  amplify.signIn.mockRejectedValueOnce(wrongPassword);

  await expect(cognitoSignIn('user@example.com', 'bad')).rejects.toBe(wrongPassword);
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  expect(amplify.signOut).not.toHaveBeenCalled();
});

/* ───────────── the bounded wait for pending token reads ───────────── */

it('nothing pending → sign-in and sign-out run at once (no timer needed)', async () => {
  jest.useFakeTimers();
  amplify.signIn.mockResolvedValueOnce(DONE);

  const signedIn = track(cognitoSignIn('user@example.com', 'pw'));
  await flush();
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  expect(signedIn.value).toMatchObject({ isSignedIn: true });

  const signedOut = track(cognitoSignOut());
  await flush();
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(signedOut.value).toBeUndefined();
});

it('sign-in waits for a pending token read before SRP — until it settles', async () => {
  jest.useFakeTimers();
  await startHangingRead();
  amplify.signIn.mockResolvedValueOnce(DONE);

  const signedIn = track(cognitoSignIn('user@example.com', 'pw'));
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1000);
  await flush();
  expect(amplify.signIn).not.toHaveBeenCalled();

  hanging.splice(0).forEach(release => release());
  await flush();
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
});

it('sign-out waits for a pending token read before Amplify\'s signOut — at most the cap, then proceeds', async () => {
  jest.useFakeTimers();
  await startHangingRead(); // never released by the test

  const signedOut = track(cognitoSignOut());
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1);
  await flush();
  expect(amplify.signOut).not.toHaveBeenCalled();
  expect(signedOut.value).toBe('pending');

  jest.advanceTimersByTime(1);
  await flush();
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(signedOut.value).toBeUndefined();
});

it('UserAlreadyAuthenticated retry path: the sign-out before the retry waits for a still-pending read, and the retry follows it', async () => {
  jest.useFakeTimers();
  await startHangingRead();
  amplify.signIn.mockRejectedValueOnce(alreadySignedIn()).mockResolvedValueOnce(DONE);

  const signedIn = track(cognitoSignIn('user@example.com', 'pw'));
  // First attempt: the wait runs out at the cap, SRP is refused …
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS);
  await flush();
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  // … and the sign-out on the retry path waits for the read again.
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1000);
  await flush();
  expect(amplify.signOut).not.toHaveBeenCalled();
  expect(amplify.signIn).toHaveBeenCalledTimes(1);

  hanging.splice(0).forEach(release => release());
  await flush();
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(amplify.signIn).toHaveBeenCalledTimes(2);
  expect(amplify.signOut.mock.invocationCallOrder[0]).toBeLessThan(
    amplify.signIn.mock.invocationCallOrder[1],
  );
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
});

/* ───────────── Amplify's signOut failing ───────────── */

/**
 * Amplify's signOut() can really reject: its clearCredentials() removes
 * AsyncStorage items, and that rejects when storage fails. cognitoSignOut
 * must still resolve — sign-in awaits it (the in-flight join before SRP and
 * the UserAlreadyAuthenticated retry path) and its own bookkeeping `.then`
 * has no rejection handler.
 */
const storageFailure = () => new Error('AsyncStorage.multiRemove failed');

it('a failing Amplify signOut never rejects: the token cache is still dropped, and a sign-in started meanwhile still reaches SRP', async () => {
  const accessToken = jwt({ sub: USER, exp: nowS() + 3600, token_use: 'access' });
  getTokens.mockResolvedValueOnce({
    accessToken: { toString: () => accessToken },
    idToken: { toString: () => jwt({ sub: USER, token_use: 'id' }) },
  } as never);
  amplify.signIn.mockResolvedValueOnce(DONE);
  await cognitoSignIn('user@example.com', 'pw');
  expect(peekSession()?.accessToken).toBe(accessToken); // warm-up cached it

  amplify.signOut.mockRejectedValueOnce(storageFailure());
  await expect(cognitoSignOut()).resolves.toBeUndefined();
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(peekSession()).toBeNull(); // clearSessionCache ran regardless

  // A sign-in started while a failing sign-out is in flight joins it first
  // (settlePreviousSession) and must not inherit its failure.
  amplify.signOut.mockRejectedValueOnce(storageFailure());
  amplify.signIn.mockResolvedValueOnce(DONE);
  const signedOut = cognitoSignOut();
  const signedIn = cognitoSignIn('other@example.com', 'pw');
  await expect(signedOut).resolves.toBeUndefined();
  await expect(signedIn).resolves.toMatchObject({ isSignedIn: true });
  expect(amplify.signOut).toHaveBeenCalledTimes(2);
  expect(amplify.signIn).toHaveBeenCalledTimes(2);
  expect(amplify.signOut.mock.invocationCallOrder[1]).toBeLessThan(
    amplify.signIn.mock.invocationCallOrder[1],
  );
});

it('UserAlreadyAuthenticated retry path: a failing Amplify signOut still lets the retry SRP run', async () => {
  amplify.signIn.mockRejectedValueOnce(alreadySignedIn()).mockResolvedValueOnce(DONE);
  amplify.signOut.mockRejectedValueOnce(storageFailure());

  await expect(cognitoSignIn('user@example.com', 'pw')).resolves.toMatchObject({
    isSignedIn: true,
  });
  expect(amplify.signOut).toHaveBeenCalledTimes(1);
  expect(amplify.signIn).toHaveBeenCalledTimes(2);
  expect(amplify.signOut.mock.invocationCallOrder[0]).toBeLessThan(
    amplify.signIn.mock.invocationCallOrder[1],
  );
});

/* ───────────── NEW_PASSWORD_REQUIRED ───────────── */

it('NEW_PASSWORD_REQUIRED: sign-in reports the challenge, and answering it completes the sign-in', async () => {
  amplify.signIn.mockResolvedValueOnce({
    isSignedIn: false,
    nextStep: {
      signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
      missingAttributes: ['name'],
    },
  });

  await expect(cognitoSignIn('user@example.com', 'temporary')).resolves.toEqual({
    step: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
    isSignedIn: false,
    missingAttributes: ['name'],
  });
  expect(getTokens).not.toHaveBeenCalled(); // no warm-up: not signed in yet

  amplify.confirmSignIn.mockResolvedValueOnce(DONE);
  await expect(cognitoConfirmNewPassword('n3w-Passw0rd!')).resolves.toEqual({
    step: 'DONE',
    isSignedIn: true,
    missingAttributes: undefined,
  });
  expect(amplify.confirmSignIn).toHaveBeenCalledTimes(1);
  expect(amplify.confirmSignIn).toHaveBeenCalledWith({
    challengeResponse: 'n3w-Passw0rd!',
  });
  expect(getTokens).toHaveBeenCalledTimes(1); // cache warm-up once signed in
  expect(amplify.signOut).not.toHaveBeenCalled();
});

it('NEW_PASSWORD_REQUIRED: a rejected new password is rethrown', async () => {
  const invalid = new AuthError({
    name: 'InvalidPasswordException',
    message: 'Password does not conform to policy.',
  });
  amplify.confirmSignIn.mockRejectedValueOnce(invalid);

  await expect(cognitoConfirmNewPassword('short')).rejects.toBe(invalid);
  expect(getTokens).not.toHaveBeenCalled();
});
