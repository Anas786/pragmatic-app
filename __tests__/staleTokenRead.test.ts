/**
 * A token read the app ABANDONED (session.ts' 15 s timeout) keeps running
 * inside Amplify, and settles onto whatever session is stored by then. If
 * that is a NEW session — the user signed out and back in meanwhile — a late
 * definitive failure makes Amplify wipe it (clearTokens) and onSessionEnded
 * log the new user straight out; a late success stores the previous user's
 * tokens again.
 *
 * Pinned here: sign-out (cognitoSignOut, under executeLogout) and sign-in
 * (cognitoSignIn, before SRP) first WAIT — at most TOKEN_READ_SETTLE_CAP_MS,
 * and only wait: nothing writes Amplify's token store — for such reads to
 * settle, and sign-in also for the logout one of them triggered. A read
 * that is merely slow thus lands on the session it belongs to. Past the cap
 * both go ahead; the residual race that leaves (session.ts, "Abandoned
 * reads") is fail-closed when the late read is a definitive failure — also
 * pinned below.
 *
 * Real Amplify refresh over the AsyncStorage mock, `fetch` playing Cognito;
 * only Amplify's signIn() is mocked (it stores the "new" session, as SRP
 * would).
 */
import { afterEach, beforeAll, beforeEach, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '../src/config/amplify';
import { useUserStore } from '../src/hooks/useUserStore';
import { resetToLogin } from '../src/routes/navigationRef';
import { executeLogout } from '../src/networking/config';
import {
  cognitoCurrentUser,
  cognitoSignIn,
} from '../src/networking/auth/cognito';
import {
  clearSessionCache,
  getValidAccessToken,
  peekSession,
  TOKEN_FETCH_TIMEOUT_MS,
  TOKEN_READ_SETTLE_CAP_MS,
} from '../src/networking/auth/session';
import type { IUser } from '../src/types';
import {
  cognitoError,
  cognitoKeys,
  cognitoOk,
  cognitoRefreshed,
  flush,
  OTHER_USER,
  resetStorage,
  seedSession,
  storedAccessToken,
  USER,
} from './fixtures/cognitoSession';

jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));
jest.mock('aws-amplify/auth', () => ({
  ...(jest.requireActual('aws-amplify/auth') as object),
  signIn: jest.fn(),
}));

type AnyFn = (...args: any[]) => any;
const resetToLoginMock = resetToLogin as unknown as Mock<AnyFn>;
const amplify = jest.requireMock('aws-amplify/auth') as { signIn: Mock<AnyFn> };
const fetchMock = jest.fn<AnyFn>();

const SIGNED_IN = { user_id: 'u-1', name: 'Ada' } as unknown as IUser;
const DONE = { isSignedIn: true, nextStep: { signInStep: 'DONE' } };

const track = <T,>(p: Promise<T>) => {
  const box: { value: T | 'pending' } = { value: 'pending' };
  p.then(v => {
    box.value = v;
  });
  return box;
};

/** Several flush rounds: Amplify's sign-out is a long microtask chain. */
const settleAll = async () => {
  for (let i = 0; i < 6; i++) {
    await flush();
  }
};

/**
 * Refreshes a test left hanging, answered after it: Amplify dedupes token
 * refreshes module-wide, so one left hanging would capture every later
 * test's refresh.
 */
const unanswered: Array<(response: unknown) => void> = [];

/**
 * Seeds the OLD session with an expired access token, makes its refresh
 * hang, and lets the app give up on it (TOKEN_FETCH_TIMEOUT_MS) — the read
 * keeps running inside Amplify. Returns the function that answers it.
 */
const abandonARefresh = async ({ revocable = false } = {}) => {
  seedSession({ accessExpired: true, tag: 'old', revocable });
  let answer: (response: unknown) => void = () => undefined;
  fetchMock.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        answer = resolve;
      }),
  );
  unanswered.push(response => answer(response));
  const caller = track(getValidAccessToken());
  await flush();
  jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS);
  await flush();
  expect(caller.value).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return (response: unknown) => answer(response);
};

/** Amplify signIn() as SRP: stores a brand-new, valid session of `user`. */
const srpStoresNewSession = (user: string = USER, { revocable = false } = {}) => {
  const stored = { accessToken: '' };
  amplify.signIn.mockImplementation(async () => {
    stored.accessToken = seedSession({ accessExpired: false, tag: 'new', user, revocable })
      .accessToken;
    return DONE;
  });
  return stored;
};

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

beforeEach(() => {
  jest.useFakeTimers();
  resetStorage();
  clearSessionCache();
  jest.clearAllMocks();
  fetchMock.mockReset();
  // Anything beyond the one hanging refresh fails fast (never hangs).
  fetchMock.mockImplementation(async () => {
    throw new TypeError('Network request failed');
  });
  useUserStore.setState({ user: SIGNED_IN });
});

afterEach(async () => {
  // A plain client error: no retry, no store change, no session-ending event.
  unanswered.splice(0).forEach(answer => answer(cognitoError('InvalidParameterException')));
  await settleAll();
  jest.useRealTimers();
});

it('sign-in waits for it: its late NotAuthorized — and the logout that triggers — finish BEFORE SRP; the new session survives', async () => {
  const answerRefresh = await abandonARefresh();
  const newSession = srpStoresNewSession();

  // The user signs in (e.g. the splash had routed to Login).
  const signedIn = track(cognitoSignIn('ada@example.com', 'pw'));
  await flush();
  jest.advanceTimersByTime(1000);
  await flush();
  expect(amplify.signIn).not.toHaveBeenCalled(); // waiting on the old read

  // The old refresh finally answers — its refresh token was revoked.
  answerRefresh(cognitoError('NotAuthorizedException'));
  await settleAll();

  expect(signedIn.value).toMatchObject({ step: 'DONE', isSignedIn: true });
  // The OLD session's logout (onSessionEnded → executeLogout) ran first …
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
  expect(resetToLoginMock.mock.invocationCallOrder[0]).toBeLessThan(
    amplify.signIn.mock.invocationCallOrder[0],
  );
  // … and the NEW session is stored, intact — nothing left to undo it.
  expect(storedAccessToken()).toBe(newSession.accessToken);
  jest.advanceTimersByTime(60000);
  await settleAll();
  expect(storedAccessToken()).toBe(newSession.accessToken);
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
});

it('sign-out waits for it: a late NotAuthorized lands BEFORE the wipe (one logout), and the next sign-in survives', async () => {
  const answerRefresh = await abandonARefresh();

  // The user taps "Sign out" while the old refresh still runs.
  const loggedOut = track(executeLogout());
  await flush();
  jest.advanceTimersByTime(1000);
  await flush();
  expect(loggedOut.value).toBe('pending');
  expect(resetToLoginMock).not.toHaveBeenCalled();

  answerRefresh(cognitoError('NotAuthorizedException'));
  await settleAll();
  expect(loggedOut.value).toBeUndefined();
  // Its Hub event re-entered executeLogout — deduped into this one.
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
  expect(cognitoKeys()).toEqual([]);

  // Sign back in: nothing from the old session can reach the new one.
  const newSession = srpStoresNewSession();
  const signedIn = track(cognitoSignIn('ada@example.com', 'pw'));
  await settleAll();
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  jest.advanceTimersByTime(60000);
  await settleAll();
  expect(storedAccessToken()).toBe(newSession.accessToken);
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
});

it('a refresh that never settles does not block sign-in: SRP goes ahead at the settle cap', async () => {
  await abandonARefresh(); // never answered
  const newSession = srpStoresNewSession();

  const signedIn = track(cognitoSignIn('ada@example.com', 'pw'));
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1);
  await flush();
  expect(amplify.signIn).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1);
  await settleAll();
  expect(amplify.signIn).toHaveBeenCalledTimes(1);
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  expect(storedAccessToken()).toBe(newSession.accessToken);
});

it('a refresh that never settles does not block sign-out: the wipe goes ahead at the settle cap', async () => {
  await abandonARefresh(); // never answered
  const before = cognitoKeys();

  const loggedOut = track(executeLogout());
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1);
  await flush();
  expect(loggedOut.value).toBe('pending');
  expect(cognitoKeys()).toEqual(before); // nothing wiped while it waits
  expect(resetToLoginMock).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1);
  await settleAll();
  expect(loggedOut.value).toBeUndefined();
  expect(cognitoKeys()).toEqual([]);
  expect(peekSession()).toBeNull();
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
});

it('sign-out waits for it: a late refresh SUCCESS lands BEFORE the wipe — the sign-out revokes the refreshed session, and none is left stored', async () => {
  const answerRefresh = await abandonARefresh({ revocable: true });
  // Amplify's signOut() revokes the STORED refresh token (RevokeToken) and
  // then wipes the store; record which token it revokes.
  const revoked: string[] = [];
  fetchMock.mockImplementation(async (_url: unknown, init: any) => {
    if (init?.headers?.['x-amz-target']?.endsWith('.RevokeToken')) {
      revoked.push(JSON.parse(init.body).Token);
      return cognitoOk();
    }
    throw new TypeError('Network request failed');
  });

  const loggedOut = track(executeLogout());
  await flush();
  jest.advanceTimersByTime(500);
  await flush();
  expect(loggedOut.value).toBe('pending');
  expect(revoked).toEqual([]); // nothing revoked / wiped while it runs

  // The network comes back: the old refresh succeeds mid-sign-out, and
  // Cognito's refresh-token rotation hands out a new refresh token.
  answerRefresh(
    cognitoRefreshed(USER, 'late', {
      rotatedRefreshToken: 'opaque-refresh-token-rotated',
      revocable: true,
    }).response,
  );
  await settleAll();
  expect(loggedOut.value).toBeUndefined();
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
  // The sign-out acted on the session the refresh left on the device: it
  // revoked the ROTATED refresh token, not the superseded one (wiping first
  // would revoke the old token and leave the rotated one valid server-side).
  expect(revoked).toEqual(['opaque-refresh-token-rotated']);
  expect(cognitoKeys()).toEqual([]);
  await expect(cognitoCurrentUser()).resolves.toBeNull(); // next cold start: Login
});

it('sign-out drops the in-memory token cache: the next user who signs in is never served the previous user\'s token', async () => {
  const previous = seedSession({ accessExpired: false, tag: 'previous' });
  await expect(getValidAccessToken()).resolves.toBe(previous.accessToken);
  expect(peekSession()?.accessToken).toBe(previous.accessToken);

  const loggedOut = track(executeLogout());
  await settleAll();
  expect(loggedOut.value).toBeUndefined();
  expect(peekSession()).toBeNull();

  const other = srpStoresNewSession(OTHER_USER);
  const signedIn = track(cognitoSignIn('grace@example.com', 'pw'));
  await settleAll();
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  await expect(getValidAccessToken()).resolves.toBe(other.accessToken);
});

it('residual race, fail-closed: a refresh hanging past BOTH caps that finally fails NotAuthorized signs the next user out — it never leaves a session behind', async () => {
  const answerRefresh = await abandonARefresh(); // USER's refresh

  // USER signs out; the wait runs out while the refresh hangs.
  const loggedOut = track(executeLogout());
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS);
  await settleAll();
  expect(loggedOut.value).toBeUndefined();
  expect(cognitoKeys()).toEqual([]);

  // OTHER_USER signs in; that wait runs out too.
  const other = srpStoresNewSession(OTHER_USER);
  const signedIn = track(cognitoSignIn('grace@example.com', 'pw'));
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS);
  await settleAll();
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  await expect(getValidAccessToken()).resolves.toBe(other.accessToken);

  // USER's refresh is finally rejected: Amplify clears the store it finds
  // (OTHER_USER's), and the Hub event signs OTHER_USER out.
  answerRefresh(cognitoError('NotAuthorizedException'));
  await settleAll();

  expect(resetToLoginMock).toHaveBeenCalledTimes(2);
  expect(cognitoKeys()).toEqual([]);
  expect(peekSession()).toBeNull();
  expect(useUserStore.getState().user).toBeNull();
  await expect(getValidAccessToken()).resolves.toBeNull();
});

it('normal sign-out → sign-in (same user, the old read still pending): its late transient failure leaves the new session alone', async () => {
  const answerRefresh = await abandonARefresh();

  const loggedOut = track(executeLogout());
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS);
  await settleAll();
  expect(loggedOut.value).toBeUndefined();

  const again = srpStoresNewSession(USER);
  const signedIn = track(cognitoSignIn('ada@example.com', 'pw'));
  await flush();
  jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS);
  await settleAll();
  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  const keysAfterSignIn = cognitoKeys();

  // Not session-ending: Amplify keeps the store; nothing else touches it.
  answerRefresh(cognitoError('InvalidParameterException'));
  await settleAll();
  expect(cognitoKeys()).toEqual(keysAfterSignIn);
  expect(storedAccessToken()).toBe(again.accessToken);
  await expect(getValidAccessToken()).resolves.toBe(again.accessToken);
  expect(resetToLoginMock).toHaveBeenCalledTimes(1); // only the sign-out
});

it('a storage hiccup right after sign-in never removes the session it just stored', async () => {
  const loggedOut = track(executeLogout());
  await settleAll();
  expect(loggedOut.value).toBeUndefined();

  let newAccessToken = '';
  let keysAfterSrp: string[] = [];
  amplify.signIn.mockImplementation(async () => {
    newAccessToken = seedSession({ accessExpired: false, tag: 'new' }).accessToken;
    keysAfterSrp = cognitoKeys();
    // The next storage read — the post-sign-in cache warm-up's — fails.
    (AsyncStorage.getItem as unknown as Mock<AnyFn>).mockRejectedValueOnce(
      new Error('storage hiccup'),
    );
    return DONE;
  });
  const signedIn = track(cognitoSignIn('ada@example.com', 'pw'));
  await settleAll();

  expect(signedIn.value).toMatchObject({ isSignedIn: true });
  expect(peekSession()).toBeNull(); // the warm-up read failed …
  expect(cognitoKeys()).toEqual(keysAfterSrp); // … and nothing was removed
  await expect(getValidAccessToken()).resolves.toBe(newAccessToken);
  expect(resetToLoginMock).toHaveBeenCalledTimes(1); // only the sign-out
});
