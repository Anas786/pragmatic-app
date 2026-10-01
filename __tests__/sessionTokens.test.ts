/**
 * session.ts — the token read behind every protected API request (and the
 * splash's session hydrate).
 *
 *  - User-pool tokens only: a valid stored access token is served without
 *    any network — in particular without the identity-pool credentials round
 *    trip fetchAuthSession() makes (GetId / GetCredentialsForIdentity), which
 *    used to hang every API call while cognito-identity was unreachable.
 *  - Bounded: a read that hangs (a refresh on a stalled network) releases
 *    every waiting caller with null after TOKEN_FETCH_TIMEOUT_MS instead of
 *    holding the Dashboard on an endless skeleton; its late result is
 *    dropped, and the next call (React Query retry / pull-to-refresh) starts
 *    a fresh read.
 *  - Abandoned reads stay tracked until they settle, and
 *    settlePendingTokenReads() waits for them (bounded, and only waits) —
 *    what sign-in and sign-out rely on so a merely slow old read settles
 *    before the session changes hands.
 *  - The cache's freshness check applies Amplify's stored clock drift.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { amplifyConfig } from '../src/config/amplify';
import { cognitoCurrentUser } from '../src/networking/auth/cognito';
import {
  clearSessionCache,
  getValidAccessToken,
  peekSession,
  settlePendingTokenReads,
  TOKEN_FETCH_TIMEOUT_MS,
  TOKEN_READ_SETTLE_CAP_MS,
} from '../src/networking/auth/session';
import {
  flush,
  jwt,
  nowS,
  resetStorage,
  seedSession,
  USER,
} from './fixtures/cognitoSession';

// Network tripwire — any Cognito call (user pool or identity pool) lands here.
const fetchSpy = jest.fn(() => new Promise(() => undefined));

/** A token-provider result whose access token is tagged for identification. */
const providerTokens = (tag: string) => {
  const exp = nowS() + 3600;
  const raw = jwt({ sub: USER, exp, token_use: 'access', tag });
  const id = jwt({ sub: USER, exp, token_use: 'id' });
  return {
    raw,
    tokens: {
      accessToken: { toString: () => raw, payload: { sub: USER, exp } },
      idToken: { toString: () => id, payload: { sub: USER, exp } },
    },
  };
};

const track = (p: Promise<unknown>) => {
  const box: { value: unknown } = { value: 'pending' };
  p.then(v => {
    box.value = v;
  });
  return box;
};

/**
 * A provider read that hangs until released (by the test, or after it).
 * Tracked reads are module state: one left hanging forever would make every
 * later settlePendingTokenReads() in this file wait out its cap.
 */
const hanging: Array<(v: unknown) => void> = [];
const hang = () =>
  new Promise<never>(resolve => {
    hanging.push(resolve as unknown as (v: unknown) => void);
  });

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchSpy;
});

beforeEach(() => {
  resetStorage();
  clearSessionCache();
  jest.clearAllMocks();
});

afterEach(async () => {
  hanging.splice(0).forEach(release => release(null));
  await flush();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('serves a valid stored access token with no network at all (no identity-pool round trip)', async () => {
  // amplifyConfig configures an identityPoolId, so fetchAuthSession() would
  // go on to GetId / GetCredentialsForIdentity here.
  const { accessToken } = seedSession({ accessExpired: false });
  const result = track(getValidAccessToken());
  await flush();
  expect(result.value).toBe(accessToken);
  expect(fetchSpy).not.toHaveBeenCalled();
});

it('a hanging read releases all its waiters at TOKEN_FETCH_TIMEOUT_MS; the next call reads afresh; the late result is dropped', async () => {
  jest.useFakeTimers();
  let answerLate: (tokens: unknown) => void = () => undefined;
  const fresh = providerTokens('fresh');
  const late = providerTokens('late');
  const getTokens = jest
    .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
    .mockImplementationOnce(
      () =>
        new Promise(resolve => {
          answerLate = resolve as (tokens: unknown) => void;
        }),
    )
    .mockResolvedValue(fresh.tokens as never);
  try {
    const hydrate = track(getValidAccessToken()); // the splash's hydrate
    const dashboard = track(getValidAccessToken()); // joins the same read
    await flush();
    expect(getTokens).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS - 1);
    await flush();
    expect([hydrate.value, dashboard.value]).toEqual(['pending', 'pending']);

    jest.advanceTimersByTime(1);
    await flush();
    expect([hydrate.value, dashboard.value]).toEqual([null, null]);

    // React Query retry / pull-to-refresh: a NEW read, not the hung one.
    const retry = track(getValidAccessToken());
    await flush();
    expect(getTokens).toHaveBeenCalledTimes(2);
    expect(retry.value).toBe(fresh.raw);

    // The abandoned read finally answers: it must not overwrite the cache.
    answerLate(late.tokens);
    await flush();
    await expect(getValidAccessToken()).resolves.toBe(fresh.raw);
    expect(getTokens).toHaveBeenCalledTimes(2);
  } finally {
    getTokens.mockRestore();
  }
});

it('a post-401 forced refresh queued behind a hanging read is bounded too', async () => {
  jest.useFakeTimers();
  const forcedTokens = providerTokens('forced');
  const getTokens = jest
    .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
    .mockImplementationOnce(hang)
    .mockResolvedValue(forcedTokens.tokens as never);
  try {
    track(getValidAccessToken()); // hangs
    const forced = track(getValidAccessToken(true));
    await flush();
    expect(forced.value).toBe('pending');

    jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS);
    await flush();
    expect(getTokens).toHaveBeenCalledTimes(2);
    expect(getTokens).toHaveBeenLastCalledWith({ forceRefresh: true });
    expect(forced.value).toBe(forcedTokens.raw);
  } finally {
    getTokens.mockRestore();
  }
});

/* ───────────── clock drift (finding: avoidable 401s on a slow clock) ───────────── */

describe('freshness applies Amplify\'s stored clockDrift', () => {
  it.each([
    // [label, access token life left by the DEVICE clock (s), stored clockDrift, provider reads for 2 calls]
    ['no drift, 1 h left → cached', 3600, 0, 1],
    ['slow device clock (server 1 h ahead): expired on the server 30 min ago → not cached', 1800, 3600000, 2],
    ['fast device clock (server 10 min behind): inside the buffer by device time, 10 min left → cached', 30, -600000, 1],
    ['unparseable stored drift → treated as 0 → cached', 3600, 'garbage', 1],
  ])('%s', async (_label, lifeLeftS, clockDriftMs, expectedReads) => {
    seedSession({ accessExpired: false, clockDriftMs });
    const exp = nowS() + (lifeLeftS as number);
    const raw = jwt({ sub: USER, exp, token_use: 'access' });
    const id = jwt({ sub: USER, exp, token_use: 'id' });
    const getTokens = jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockResolvedValue({
        accessToken: { toString: () => raw, payload: { sub: USER, exp } },
        idToken: { toString: () => id, payload: { sub: USER, exp } },
      } as never);

    await expect(getValidAccessToken()).resolves.toBe(raw);
    await expect(getValidAccessToken()).resolves.toBe(raw);

    expect(getTokens).toHaveBeenCalledTimes(expectedReads as number);
    const drift = Number.parseInt(String(clockDriftMs), 10);
    expect(peekSession()?.clockDriftMs).toBe(Number.isFinite(drift) ? drift : 0);
  });

  it('a failing drift read never fails the token read (drift 0)', async () => {
    const fresh = providerTokens('fresh');
    jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockResolvedValue(fresh.tokens as never);
    jest
      .spyOn(cognitoUserPoolsTokenProvider.authTokenStore, 'loadTokens')
      .mockRejectedValue(new Error('keystore unavailable'));
    await expect(getValidAccessToken()).resolves.toBe(fresh.raw);
    expect(peekSession()?.clockDriftMs).toBe(0);
  });
});

/* ───────────── abandoned reads (finding: old refresh lands on a new session) ───────────── */

describe('settlePendingTokenReads', () => {
  it('nothing pending → resolves at once', async () => {
    jest.useFakeTimers();
    const settled = track(settlePendingTokenReads());
    await flush();
    expect(settled.value).toBeUndefined();
  });

  it('waits for a read the timeout ABANDONED (still running inside Amplify) until it settles', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockImplementationOnce(hang);
    const caller = track(getValidAccessToken());
    await flush();
    jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS);
    await flush();
    expect(caller.value).toBeNull(); // the caller gave up …

    const settled = track(settlePendingTokenReads());
    jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1000);
    await flush();
    expect(settled.value).toBe('pending'); // … the read is still waited for

    hanging.splice(0).forEach(release => release(null));
    await flush();
    expect(settled.value).toBeUndefined();
  });

  it('gives up at the cap on a read that never settles', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockImplementationOnce(hang);
    track(getValidAccessToken());
    await flush();

    const settled = track(settlePendingTokenReads());
    jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS - 1);
    await flush();
    expect(settled.value).toBe('pending');
    jest.advanceTimersByTime(1);
    await flush();
    expect(settled.value).toBeUndefined();
  });

  it('also waits for a read that starts while it is waiting (same deadline)', async () => {
    jest.useFakeTimers();
    jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockImplementation(hang);
    track(getValidAccessToken());
    await flush();
    const settled = track(settlePendingTokenReads());

    // Another read starts while it waits (here the hydrate's) …
    track(cognitoCurrentUser().catch(() => 'failed'));
    await flush();
    hanging.shift()?.(null); // … then the first one settles:
    await flush();
    expect(settled.value).toBe('pending'); // still waiting for the second

    hanging.splice(0).forEach(release => release(null));
    await flush();
    expect(settled.value).toBeUndefined();
  });

  it("tracks the splash hydrate's getCurrentUser() read too", async () => {
    jest.useFakeTimers();
    jest
      .spyOn(cognitoUserPoolsTokenProvider, 'getTokens')
      .mockImplementationOnce(hang);
    const hydrate = track(cognitoCurrentUser().catch(() => 'failed'));
    await flush();
    const settled = track(settlePendingTokenReads());
    jest.advanceTimersByTime(1000);
    await flush();
    expect(settled.value).toBe('pending');

    hanging.splice(0).forEach(release => release(null));
    await flush();
    expect(settled.value).toBeUndefined();
    expect(hydrate.value).toBeNull(); // null tokens → no session
  });
});
