/**
 * A session Cognito has definitively ended always ends in executeLogout —
 * even though no request ever receives a 401.
 *
 * When Cognito rejects the refresh token (30-day expiry, revocation, deleted
 * user …), Amplify clears its token store and reports it ONLY via Hub
 * ('tokenRefresh_failure'): the token read then resolves null, and the
 * request interceptor rejects locally without sending anything. That is the
 * state the splash's stall abort can route into the Drawer; config.ts'
 * onSessionEnded listener must finish the logout. A transient failure must
 * never sign anyone out.
 *
 * Runs the REAL Amplify refresh (TokenOrchestrator + refreshAuthTokens) over
 * the AsyncStorage mock, with `fetch` playing Cognito.
 */
import { afterEach, beforeAll, beforeEach, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { Hub } from 'aws-amplify/utils';
import { amplifyConfig } from '../src/config/amplify';
import { useUserStore } from '../src/hooks/useUserStore';
import { resetToLogin } from '../src/routes/navigationRef';
import '../src/networking/config'; // registers onSessionEnded → executeLogout
import {
  clearSessionCache,
  getValidAccessToken,
} from '../src/networking/auth/session';
import type { IUser } from '../src/types';
import {
  cognitoKeys,
  flush,
  resetStorage,
  seedSession,
} from './fixtures/cognitoSession';

jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));

type AnyFn = (...args: any[]) => any;
const resetToLoginMock = resetToLogin as unknown as Mock<AnyFn>;

/** A Cognito JSON-protocol error response, as Amplify's fetch handler reads it. */
const cognitoError = (name: string) => ({
  status: 400,
  headers: {
    forEach: (cb: (value: string, key: string) => void) =>
      cb(name, 'x-amzn-errortype'),
  },
  body: null,
  json: async () => ({ __type: name, message: `${name} (test)` }),
  text: async () => JSON.stringify({ __type: name }),
  blob: async () => undefined,
});

const fetchMock = jest.fn<AnyFn>();

const SIGNED_IN: IUser = {
  user_id: 'u-1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  is_client_admin: false,
  is_customer_admin: false,
  login_date: new Date(0),
} as IUser;

const refreshFailures: string[] = [];
let stopHub: () => void = () => undefined;

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

beforeEach(() => {
  resetStorage();
  clearSessionCache();
  jest.clearAllMocks();
  useUserStore.setState({ user: SIGNED_IN });
  refreshFailures.length = 0;
  stopHub = Hub.listen('auth', ({ payload }) => {
    if (payload.event === 'tokenRefresh_failure') {
      refreshFailures.push(payload.data?.error?.name ?? '?');
    }
  });
});

afterEach(() => {
  stopHub();
});

it.each(['NotAuthorizedException', 'UserNotFoundException'])(
  'a definitive refresh failure (%s) → executeLogout: Login, user store and stored session cleared',
  async errorName => {
    // Expired access token → the next token read must refresh over the network.
    seedSession({ accessExpired: true });
    fetchMock.mockImplementation(async () => cognitoError(errorName));

    // A Dashboard request's token read AND the still-pending splash hydrate
    // (getCurrentUser → same token provider) wait on one deduplicated refresh.
    const dashboard = getValidAccessToken();
    const hydrate = cognitoUserPoolsTokenProvider.getTokens().catch(() => null);
    await expect(dashboard).resolves.toBeNull();
    await hydrate;
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1); // the one refresh, nothing else
    expect(refreshFailures).toEqual([errorName, errorName]);
    // Two Hub events, ONE logout (executeLogout is deduplicated).
    expect(resetToLoginMock).toHaveBeenCalledTimes(1);
    expect(useUserStore.getState().user).toBeNull();
    expect(cognitoKeys()).toEqual([]);
  },
);

it('a transient refresh failure (network) never signs out: session and user kept', async () => {
  seedSession({ accessExpired: true });
  const before = cognitoKeys();
  fetchMock.mockImplementation(async () => {
    throw new TypeError('Network request failed');
  });

  const dashboard = getValidAccessToken();
  // Amplify retries a connection error (3 attempts, sub-second jittered
  // backoff on real timers) before giving up.
  await expect(dashboard).resolves.toBeNull();
  await flush();

  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(refreshFailures).toEqual(['NetworkError']);
  expect(resetToLoginMock).not.toHaveBeenCalled();
  expect(useUserStore.getState().user).toEqual(SIGNED_IN);
  expect(cognitoKeys()).toEqual(before);
});
