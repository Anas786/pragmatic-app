/**
 * useAuth — the cold-start session hydrate behind the splash.
 *
 * Three outcomes: 'authenticated'; 'unauthenticated' ONLY when there is
 * definitively no session (nothing stored, or Cognito rejected the refresh
 * token); 'indeterminate' when the check itself failed transiently
 * (offline, DNS, Cognito 5xx / throttling, a timed-out token read) — the
 * splash then routes by the stored-session probe instead of sending a user
 * with a valid refresh token to Login.
 *
 * Invariants pinned here (they make the splash's no-verdict → Drawer paths
 * safe): no outcome ever signs out or clears the user store, and an outcome
 * that arrives after the hook unmounted (the splash already routed and left)
 * touches nothing.
 */
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import React from 'react';
import renderer from 'react-test-renderer';
import { Amplify } from 'aws-amplify';
import { AuthError } from 'aws-amplify/auth';
import { amplifyConfig } from '../src/config/amplify';
import { useAuth } from '../src/hooks/useAuth';
import { useUserStore } from '../src/hooks/useUserStore';
import { clearSessionCache } from '../src/networking/auth/session';
import type { IUser } from '../src/types';
import {
  cognitoError,
  cognitoKeys,
  resetStorage,
  seedSession,
} from './fixtures/cognitoSession';

jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));
jest.mock('../src/networking/auth/cognito', () => ({
  ...(jest.requireActual('../src/networking/auth/cognito') as object),
  cognitoCurrentUser: jest.fn(),
  cognitoGetTokens: jest.fn(),
  cognitoSignOut: jest.fn(),
}));

type AnyFn = (...args: any[]) => any;
const cognito = jest.requireMock('../src/networking/auth/cognito') as {
  cognitoCurrentUser: Mock<AnyFn>;
  cognitoGetTokens: Mock<AnyFn>;
  cognitoSignOut: Mock<AnyFn>;
};
const actualCognito = jest.requireActual(
  '../src/networking/auth/cognito',
) as typeof import('../src/networking/auth/cognito');

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/, '');
const ID_TOKEN = `${b64url({ alg: 'RS256' })}.${b64url({
  sub: 'u-1',
  email: 'ada@example.com',
  'custom:userName': '  Ada Lovelace ',
  exp: 4102444800,
  iat: 4102358400,
})}.sig`;

const OTHER_USER: IUser = {
  user_id: 'someone-else',
  name: 'Set by another path',
  email: 'x@example.com',
  is_client_admin: false,
  is_customer_admin: false,
  login_date: new Date(0),
} as IUser;

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  for (let i = 0; i < 50; i++) {
    await Promise.resolve();
  }
};

type AuthResult = ReturnType<typeof useAuth>;
const render = () => {
  const out: { current: AuthResult | null; tree: renderer.ReactTestRenderer } = {
    current: null,
    tree: null as unknown as renderer.ReactTestRenderer,
  };
  function Harness() {
    out.current = useAuth();
    return null;
  }
  renderer.act(() => {
    out.tree = renderer.create(<Harness />);
  });
  return out;
};

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ user: null });
});

it('a restored session → authenticated, user store + trimmed display name', async () => {
  cognito.cognitoCurrentUser.mockResolvedValue({ username: 'u-1', userId: 'u-1' });
  cognito.cognitoGetTokens.mockResolvedValue({ idToken: ID_TOKEN, accessToken: 'a', expiresAt: 0 });
  const out = render();
  expect(out.current?.status).toBe('loading');
  await renderer.act(flush);
  expect(out.current?.status).toBe('authenticated');
  expect(out.current?.displayName).toBe('Ada Lovelace');
  expect(useUserStore.getState().user?.user_id).toBe('u-1');
});

it('no session → unauthenticated; never signs out, never clears the user store', async () => {
  useUserStore.setState({ user: OTHER_USER });
  cognito.cognitoCurrentUser.mockResolvedValue(null);
  const out = render();
  await renderer.act(flush);
  expect(out.current?.status).toBe('unauthenticated');
  expect(useUserStore.getState().user).toBe(OTHER_USER);
  expect(cognito.cognitoSignOut).not.toHaveBeenCalled();
});

it.each([
  [
    'the user check fails transiently (NetworkError)',
    () => {
      cognito.cognitoCurrentUser.mockRejectedValue(
        new AuthError({ name: 'NetworkError', message: 'A network error has occurred.' }),
      );
    },
  ],
  [
    'the token read yields nothing after the user check passed (timeout)',
    () => {
      cognito.cognitoCurrentUser.mockResolvedValue({ username: 'u-1', userId: 'u-1' });
      cognito.cognitoGetTokens.mockResolvedValue(null);
    },
  ],
  [
    'the token read throws unexpectedly',
    () => {
      cognito.cognitoCurrentUser.mockResolvedValue({ username: 'u-1', userId: 'u-1' });
      cognito.cognitoGetTokens.mockRejectedValue(new Error('boom'));
    },
  ],
])('no verdict — %s → indeterminate (NOT unauthenticated); nothing cleared', async (_label, arrange) => {
  useUserStore.setState({ user: OTHER_USER });
  arrange();
  const out = render();
  await renderer.act(flush);
  expect(out.current?.status).toBe('indeterminate');
  expect(useUserStore.getState().user).toBe(OTHER_USER);
  expect(cognito.cognitoSignOut).not.toHaveBeenCalled();
});

it('an outcome arriving after unmount (splash already routed) touches nothing', async () => {
  const pending = deferred<unknown>();
  cognito.cognitoCurrentUser.mockReturnValue(pending.promise);
  cognito.cognitoGetTokens.mockResolvedValue({ idToken: ID_TOKEN, accessToken: 'a', expiresAt: 0 });
  const out = render();
  renderer.act(() => {
    out.tree.unmount();
  });
  // e.g. the stall abort put the user in the Drawer with stored claims.
  useUserStore.setState({ user: OTHER_USER });

  pending.resolve({ username: 'u-1', userId: 'u-1' });
  await renderer.act(flush);
  expect(useUserStore.getState().user).toBe(OTHER_USER);
  expect(cognito.cognitoSignOut).not.toHaveBeenCalled();
});

/* ───────── classification against the REAL Amplify token store ───────── */

describe('outcome classification (real cognitoCurrentUser + Amplify refresh)', () => {
  const fetchMock = jest.fn<AnyFn>();

  beforeAll(() => {
    Amplify.configure(amplifyConfig as never);
    (globalThis as { fetch: unknown }).fetch = fetchMock;
  });

  beforeEach(() => {
    resetStorage();
    clearSessionCache();
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    cognito.cognitoCurrentUser.mockImplementation(actualCognito.cognitoCurrentUser);
    cognito.cognitoGetTokens.mockImplementation(actualCognito.cognitoGetTokens);
  });

  /** Renders the hook and waits (real time: Amplify's retry backoff) for an outcome. */
  const settle = async () => {
    const out = render();
    for (let i = 0; i < 200 && out.current?.status === 'loading'; i++) {
      await renderer.act(() => new Promise<void>(r => setTimeout(r, 25)));
    }
    return out.current?.status;
  };

  it('nothing stored → unauthenticated, offline', async () => {
    await expect(settle()).resolves.toBe('unauthenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a valid stored session → authenticated, offline', async () => {
    seedSession({ accessExpired: false });
    await expect(settle()).resolves.toBe('authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(useUserStore.getState().user?.name).toBe('Ada Lovelace');
  });

  it('expired access token and NO refresh token → unauthenticated (cannot resume)', async () => {
    seedSession({ accessExpired: true, refresh: false });
    await expect(settle()).resolves.toBe('unauthenticated');
  });

  it.each([
    ['offline / DNS (fetch rejects fast)', async () => {
      throw new TypeError('Network request failed');
    }],
    ['Cognito 5xx', async () => cognitoError('InternalErrorException', 500)],
    ['Cognito throttling', async () => cognitoError('TooManyRequestsException')],
  ])(
    'expired access + valid refresh token, refresh fails transiently — %s → indeterminate; session kept, no sign-out',
    async (_label, cognitoAnswer) => {
      seedSession({ accessExpired: true });
      const before = cognitoKeys();
      fetchMock.mockImplementation(cognitoAnswer);
      await expect(settle()).resolves.toBe('indeterminate');
      expect(fetchMock).toHaveBeenCalled();
      expect(cognitoKeys()).toEqual(before);
      expect(cognito.cognitoSignOut).not.toHaveBeenCalled();
    },
  );

  it.each(['NotAuthorizedException', 'TokenRevokedException'])(
    'Cognito definitively rejects the refresh token (%s) → unauthenticated (Amplify cleared the store)',
    async errorName => {
      seedSession({ accessExpired: true });
      fetchMock.mockImplementation(async () => cognitoError(errorName));
      await expect(settle()).resolves.toBe('unauthenticated');
      expect(cognitoKeys()).toEqual([]);
    },
  );
});
