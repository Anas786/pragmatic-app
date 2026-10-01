/**
 * The REAL appAxios interceptors (src/networking/config.ts) end to end.
 *
 * jest.setup.js mocks axios globally (no test may reach the live API); this
 * suite un-mocks it and swaps in a recording adapter instead, so every
 * request runs through the real request + response interceptors, the real
 * session.ts token cache and — where noted — the real Amplify refresh over
 * the AsyncStorage mock with `fetch` playing Cognito.
 *
 * Pinned (CLAUDE.md §6):
 *  - requests and the 401 retry carry the ACCESS token, never the ID token;
 *  - a 401 gets exactly ONE forced refresh and ONE retry; sign-out only when
 *    the RETRIED request is 401 again (403 / 419: terminal at once);
 *  - no token → nothing is sent, nothing signs out (network-style error);
 *  - a post-401 forced refresh that times out or fails transiently never
 *    signs anyone out — only Cognito definitively rejecting the refresh
 *    token does, via the session-ending Hub event Amplify dispatches BEFORE
 *    the token read resolves.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { Hub } from 'aws-amplify/utils';
import { amplifyConfig } from '../src/config/amplify';
import { useUserStore } from '../src/hooks/useUserStore';
import { resetToLogin } from '../src/routes/navigationRef';
import { appAxios } from '../src/networking/config';
import {
  clearSessionCache,
  TOKEN_FETCH_TIMEOUT_MS,
  TOKEN_READ_SETTLE_CAP_MS,
} from '../src/networking/auth/session';
import type { IUser } from '../src/types';
import {
  cognitoError,
  cognitoKeys,
  flush,
  jwt,
  nowS,
  resetStorage,
  seedSession,
  USER,
} from './fixtures/cognitoSession';

jest.unmock('axios');
jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));

type AnyFn = (...args: any[]) => any;
const resetToLoginMock = resetToLogin as unknown as Mock<AnyFn>;
const fetchMock = jest.fn<AnyFn>();

const SIGNED_IN: IUser = {
  user_id: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  is_client_admin: false,
  is_customer_admin: false,
  login_date: new Date(0),
} as IUser;

/** A token-provider result; access and ID tokens are distinguishable. */
const providerTokens = (tag: string) => {
  const exp = nowS() + 3600;
  const access = jwt({ sub: USER, exp, token_use: 'access', tag });
  const id = jwt({ sub: USER, exp, token_use: 'id', tag });
  return {
    access,
    id,
    tokens: {
      accessToken: { toString: () => access, payload: { sub: USER, exp } },
      idToken: { toString: () => id, payload: { sub: USER, exp } },
    } as never,
  };
};

/* ───────────── recording adapter (stands in for the network) ───────────── */

/** Authorization header of every request that actually went out. */
const sent: string[] = [];
let respond: (authorization: string) => number = () => 200;
// A broken retry guard would loop forever on a permanent 401; past this
// many sends the adapter answers 200, so such a regression fails on the
// send count instead of hanging the suite.
const MAX_SENDS = 6;

const recordingAdapter = async (
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => {
  const authorization = String(config.headers?.Authorization ?? '');
  sent.push(authorization);
  const status = sent.length > MAX_SENDS ? 200 : respond(authorization);
  const response = {
    status,
    statusText: String(status),
    headers: new AxiosHeaders(),
    config,
    data: {},
  } as AxiosResponse;
  if (status >= 400) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      response,
    );
  }
  return response;
};

/**
 * A provider read that hangs (stalled network) until the test ends. session.ts
 * tracks every read until it SETTLES (sign-in / sign-out wait for them,
 * bounded), so a read left hanging forever would make every later sign-out
 * in this file wait out the settle cap.
 */
const hanging: Array<(v: null) => void> = [];
const hang = () =>
  new Promise<never>(resolve => {
    hanging.push(resolve as unknown as (v: null) => void);
  });

const hubEvents: string[] = [];
let stopHub: () => void = () => undefined;

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  appAxios.defaults.adapter = recordingAdapter;
});

beforeEach(() => {
  resetStorage();
  clearSessionCache();
  fetchMock.mockReset();
  resetToLoginMock.mockClear();
  sent.length = 0;
  respond = () => 200;
  useUserStore.setState({ user: SIGNED_IN });
  hubEvents.length = 0;
  stopHub = Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'tokenRefresh_failure') {
      hubEvents.push(`tokenRefresh_failure:${payload.data?.error?.name}`);
    }
  });
});

afterEach(async () => {
  hanging.splice(0).forEach(release => release(null));
  await flush();
  stopHub();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const spyGetTokens = () =>
  jest.spyOn(cognitoUserPoolsTokenProvider, 'getTokens');

const forcedFlags = (getTokens: { mock: { calls: unknown[][] } }) =>
  getTokens.mock.calls.map(c => (c[0] as { forceRefresh?: boolean }).forceRefresh);

it('runs against the real axios (not the jest.setup.js mock)', () => {
  expect(jest.isMockFunction(axios.create)).toBe(false);
  expect(jest.isMockFunction(appAxios.interceptors.response.use)).toBe(false);
});

/* ───────────────────────── which token ───────────────────────── */

it('sends the stored ACCESS token from the real token store — never the ID token', async () => {
  const { accessToken, idToken } = seedSession({ accessExpired: false });
  await appAxios.get('/protected/data/all/1');
  expect(sent).toEqual([`Bearer ${accessToken}`]);
  expect(sent.join('\n')).not.toContain(idToken);
});

/* ───────────────────────── 401 handling ───────────────────────── */

it('401 → exactly one forced refresh and ONE retry with the NEW access token → success, no sign-out', async () => {
  const old = providerTokens('old');
  const fresh = providerTokens('fresh');
  const getTokens = spyGetTokens()
    .mockResolvedValueOnce(old.tokens)
    .mockResolvedValue(fresh.tokens);
  respond = auth => (auth === `Bearer ${fresh.access}` ? 200 : 401);

  const res = await appAxios.get('/protected/data/all/1');

  expect(res.status).toBe(200);
  expect(sent).toEqual([`Bearer ${old.access}`, `Bearer ${fresh.access}`]);
  expect(forcedFlags(getTokens)).toEqual([false, true]);
  expect(resetToLoginMock).not.toHaveBeenCalled();
  expect(useUserStore.getState().user).toEqual(SIGNED_IN);
});

it('the RETRIED request is 401 again → sign-out once; still one retry; the ID token is never sent', async () => {
  const old = providerTokens('old');
  const fresh = providerTokens('fresh');
  const getTokens = spyGetTokens()
    .mockResolvedValueOnce(old.tokens)
    .mockResolvedValue(fresh.tokens);
  respond = () => 401;

  const err = (await appAxios.get('/protected/x').catch(e => e)) as AxiosError;
  await flush();

  expect(err.response?.status).toBe(401);
  expect(sent).toEqual([`Bearer ${old.access}`, `Bearer ${fresh.access}`]);
  expect(forcedFlags(getTokens)).toEqual([false, true]);
  expect(sent.some(s => s.includes(old.id) || s.includes(fresh.id))).toBe(false);
  expect(resetToLoginMock).toHaveBeenCalledTimes(1);
  expect(useUserStore.getState().user).toBeNull();
});

it.each([403, 419])(
  '%i is terminal: sign-out at once — no forced refresh, no retry',
  async status => {
    const old = providerTokens('old');
    const getTokens = spyGetTokens().mockResolvedValue(old.tokens);
    respond = () => status;

    const err = (await appAxios.get('/protected/x').catch(e => e)) as AxiosError;
    await flush();

    expect(err.response?.status).toBe(status);
    expect(sent).toEqual([`Bearer ${old.access}`]);
    expect(forcedFlags(getTokens)).toEqual([false]);
    expect(resetToLoginMock).toHaveBeenCalledTimes(1);
  },
);

it('/public/* carries no token, reads none, and an auth status there never signs out', async () => {
  const getTokens = spyGetTokens();
  respond = () => 401;

  const err = (await appAxios
    .get('/public/config/report-mapping')
    .catch(e => e)) as AxiosError;
  await flush();

  expect(err.response?.status).toBe(401);
  expect(sent).toEqual(['']);
  expect(getTokens).not.toHaveBeenCalled();
  expect(resetToLoginMock).not.toHaveBeenCalled();
});

/* ───────────────────────── no token ───────────────────────── */

describe('no token to send', () => {
  const expectNetworkStyle = (err: unknown) => {
    expect(err).toBeInstanceOf(AxiosError);
    expect((err as AxiosError).code).toBe(AxiosError.ERR_NETWORK);
    // Response-less: React Query retries it, nothing reads it as a 401.
    expect((err as AxiosError).response).toBeUndefined();
  };

  it('none stored → rejected locally (ERR_NETWORK): nothing sent, no sign-out', async () => {
    spyGetTokens().mockResolvedValue(null as never);
    const err = await appAxios.get('/protected/x').catch(e => e);
    await flush();
    expectNetworkStyle(err);
    expect(sent).toEqual([]);
    expect(resetToLoginMock).not.toHaveBeenCalled();
    expect(useUserStore.getState().user).toEqual(SIGNED_IN);
  });

  it('a token read that hangs → ERR_NETWORK at TOKEN_FETCH_TIMEOUT_MS: nothing sent, no sign-out', async () => {
    jest.useFakeTimers();
    spyGetTokens().mockImplementation(hang);
    const p = appAxios.get('/protected/x').catch(e => e);
    await flush();
    jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS);
    await flush();
    expectNetworkStyle(await p);
    jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS + 1000);
    await flush();
    expect(sent).toEqual([]);
    expect(resetToLoginMock).not.toHaveBeenCalled();
  });

  it('401, then the forced refresh TIMES OUT (slow network) → ERR_NETWORK; no retry, no sign-out, session kept', async () => {
    jest.useFakeTimers();
    seedSession({ accessExpired: false });
    const before = cognitoKeys();
    const old = providerTokens('old');
    spyGetTokens()
      .mockResolvedValueOnce(old.tokens)
      .mockImplementation(hang);
    respond = () => 401;

    const p = appAxios.get('/protected/x').catch(e => e);
    await flush();
    expect(sent).toEqual([`Bearer ${old.access}`]);
    jest.advanceTimersByTime(TOKEN_FETCH_TIMEOUT_MS);
    await flush();
    const err = await p;
    // Give a wrong sign-out every chance to finish: executeLogout first
    // waits (bounded) for the still-hanging refresh to settle.
    jest.advanceTimersByTime(TOKEN_READ_SETTLE_CAP_MS + 1000);
    await flush();

    expectNetworkStyle(err);
    expect(sent).toHaveLength(1);
    expect(resetToLoginMock).not.toHaveBeenCalled();
    expect(useUserStore.getState().user).toEqual(SIGNED_IN);
    expect(cognitoKeys()).toEqual(before);
  });

  it.each([
    ['offline (NetworkError)', () => Promise.reject(new TypeError('Network request failed'))],
    ['Cognito 5xx', async () => cognitoError('InternalErrorException', 500)],
  ])(
    '401, then the forced refresh fails transiently — %s (real Amplify) → no sign-out, session kept',
    async (_label, cognito) => {
      seedSession({ accessExpired: false });
      const before = cognitoKeys();
      fetchMock.mockImplementation(cognito);
      respond = () => 401;

      const err = await appAxios.get('/protected/x').catch(e => e);
      await flush();

      expectNetworkStyle(err);
      expect(fetchMock).toHaveBeenCalled(); // the forced refresh really ran
      expect(hubEvents).toHaveLength(1); // …and Amplify reported it failed
      expect(hubEvents[0]).not.toMatch(/NotAuthorized|Revoked|UserNotFound/);
      expect(sent).toHaveLength(1); // nothing re-sent without a new token
      expect(resetToLoginMock).not.toHaveBeenCalled();
      expect(useUserStore.getState().user).toEqual(SIGNED_IN);
      expect(cognitoKeys()).toEqual(before);
    },
  );
});

/* ─────────────── Cognito definitively ends the session ─────────────── */

describe('the post-401 refresh is definitively rejected (real Amplify)', () => {
  it.each(['NotAuthorizedException', 'TokenRevokedException'])(
    '%s → Hub event BEFORE the request settles → exactly one sign-out, store cleared',
    async errorName => {
      seedSession({ accessExpired: false });
      fetchMock.mockImplementation(async () => cognitoError(errorName));
      respond = () => 401;
      const order: string[] = [];
      const stop = Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'tokenRefresh_failure') {
          order.push('hub');
        }
      });
      try {
        const err = await appAxios.get('/protected/x').catch(e => {
          order.push('request rejected');
          return e;
        });
        await flush();

        expect(order).toEqual(['hub', 'request rejected']);
        expect((err as AxiosError).code).toBe(AxiosError.ERR_NETWORK);
        expect(hubEvents).toEqual([`tokenRefresh_failure:${errorName}`]);
        expect(sent).toHaveLength(1);
        expect(resetToLoginMock).toHaveBeenCalledTimes(1);
        expect(useUserStore.getState().user).toBeNull();
        expect(cognitoKeys()).toEqual([]);
      } finally {
        stop();
      }
    },
  );
});

/* ─────────── the Amplify ordering the interceptor relies on ─────────── */

describe('@aws-amplify/auth TokenOrchestrator (installed version)', () => {
  it.each([
    ['NotAuthorizedException', 'resolves null'],
    ['TokenRevokedException', 'rejects'],
    ['UserNotFoundException', 'rejects'],
  ])(
    'dispatches the session-ending tokenRefresh_failure (%s) before the token read settles (it %s)',
    async (errorName, settles) => {
      seedSession({ accessExpired: true });
      fetchMock.mockImplementation(async () => cognitoError(errorName));
      const order: string[] = [];
      const stop = Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'tokenRefresh_failure') {
          order.push(`hub:${payload.data?.error?.name}`);
        }
      });
      try {
        await cognitoUserPoolsTokenProvider.getTokens().then(
          tokens => order.push(`resolved:${tokens}`),
          error => order.push(`rejected:${(error as Error).name}`),
        );
        expect(order).toEqual([
          `hub:${errorName}`,
          settles === 'resolves null' ? 'resolved:null' : `rejected:${errorName}`,
        ]);
        // (config.ts' onSessionEnded logout runs too — let it finish here.)
        await flush();
      } finally {
        stop();
      }
    },
  );
});
