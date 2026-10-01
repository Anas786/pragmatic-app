/**
 * Cold-start splash — routing without an auth verdict.
 *
 * When useAuth is still 'loading' at STALL_MAX_MS — or resolves
 * 'indeterminate' (the hydrate failed transiently: offline, Cognito 5xx …) —
 * the overlay routes by a LOCAL stored-session probe: a Cognito session
 * stored on the device → Drawer, none / storage error / timeout → Login. It
 * never signs out or clears the session, a late auth outcome can never
 * re-route, and a session Cognito has definitively ended meanwhile is no
 * longer "stored".
 *
 * The probe runs against the REAL Amplify token store (configured exactly as
 * the app does) over the AsyncStorage jest mock, seeded with the key layout
 * @aws-amplify/auth 6.x writes — so these tests also pin that layout.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import React from 'react';
import renderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { Hub } from 'aws-amplify/utils';
import { AMPLIFY_SYMBOL } from '@aws-amplify/core/internals/utils';
import type { FrameInfo, SharedValue } from 'react-native-reanimated';
import { amplifyConfig } from '../src/config/amplify';
import { useUserStore } from '../src/hooks/useUserStore';
import SplashOverlay, {
  type SplashRoute,
} from '../src/components/screens/Onboarding/Splash';
import { probeStoredSession } from '../src/components/screens/Onboarding/Splash/storedSession';
import {
  STALL_MAX_MS,
  STORED_SESSION_PROBE_MS,
} from '../src/components/screens/Onboarding/Splash/timeline';

/* ───────────────────────── mocks ───────────────────────── */

// Capture the splash frame callback so the clock can be stepped by hand.
// The stock mock's useSharedValue returns a NEW object on every render;
// real shared values are stable for the component's lifetime, and the
// overlay re-renders mid-splash (caption latch, auth outcome) — so pin them.
const mockFrame: { cb: ((fi: FrameInfo) => void) | null } = { cb: null };
jest.mock('react-native-reanimated', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const mock = jest.requireActual('react-native-reanimated/mock') as {
    useSharedValue: (init: unknown) => unknown;
  };
  return {
    __esModule: true,
    ...mock,
    useSharedValue: (init: unknown) => {
      const ref = ReactActual.useRef<unknown>(null);
      if (ref.current === null) {
        ref.current = mock.useSharedValue(init);
      }
      return ref.current;
    },
    useReducedMotion: () => false,
    useFrameCallback: (cb: (fi: FrameInfo) => void) => {
      mockFrame.cb = cb;
      return { setActive: () => undefined, isActive: false, callbackId: -1 };
    },
  };
});

// useAuth under test control: starts 'loading'; `mockAuth.set` resolves it.
type MockAuthState = { status: string; displayName: string };
const mockAuth: { set: ((s: MockAuthState) => void) | null } = { set: null };
jest.mock('../src/hooks/useAuth', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  return {
    useAuth: () => {
      const [state, setState] = ReactActual.useState<MockAuthState>({
        status: 'loading',
        displayName: '',
      });
      mockAuth.set = setState;
      return { ...state, logout: async () => undefined };
    },
  };
});

/* ───────────────────────── stored-session fixtures ───────────────────────── */

type AnyFn = (...args: any[]) => any;
const storage = AsyncStorage as unknown as {
  __INTERNAL_MOCK_STORAGE__: Record<string, string>;
  getItem: Mock<AnyFn>;
  setItem: Mock<AnyFn>;
  removeItem: Mock<AnyFn>;
  multiRemove: Mock<AnyFn>;
  clear: Mock<AnyFn>;
};

const CLIENT_ID = amplifyConfig.Auth.Cognito.userPoolClientId;
const USER = 'f1e2d3c4-0000-4000-8000-000000000001';
// Amplify's native DefaultStorage prefixes every key with `@MemoryStorage:`.
const key = (suffix: string) =>
  `@MemoryStorage:CognitoIdentityServiceProvider.${CLIENT_ID}.${suffix}`;

const b64url = (o: object) =>
  Buffer.from(JSON.stringify(o))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/, '');
const jwt = (payload: object) =>
  `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(payload)}.signature`;

const nowS = () => Math.floor(Date.now() / 1000);
const ID_CLAIMS = {
  sub: USER,
  email: 'ada@example.com',
  'custom:userName': 'Ada Lovelace',
  'custom:company': 'Analytical Engines',
  token_use: 'id',
};

/** Seeds a session the way Amplify's TokenStore.storeTokens lays it out. */
const seedSession = ({
  accessExpired = true,
  refresh = true,
}: { accessExpired?: boolean; refresh?: boolean } = {}) => {
  const exp = accessExpired ? nowS() - 3600 : nowS() + 3600;
  const s = storage.__INTERNAL_MOCK_STORAGE__;
  s[key('LastAuthUser')] = USER;
  s[key(`${USER}.accessToken`)] = jwt({ sub: USER, exp, iat: exp - 86400, token_use: 'access' });
  s[key(`${USER}.idToken`)] = jwt({ ...ID_CLAIMS, exp, iat: exp - 86400 });
  if (refresh) {
    s[key(`${USER}.refreshToken`)] = 'opaque-refresh-token';
  }
  s[key(`${USER}.clockDrift`)] = '0';
};

const storedKeys = () => Object.keys(storage.__INTERNAL_MOCK_STORAGE__).sort();

const expectNothingCleared = (before: string[]) => {
  expect(storedKeys()).toEqual(before);
  expect(storage.removeItem).not.toHaveBeenCalled();
  expect(storage.multiRemove).not.toHaveBeenCalled();
  expect(storage.clear).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
};

/** Drains promise chains (the AsyncStorage mock is microtask-based). */
const flush = async () => {
  for (let i = 0; i < 200; i++) {
    await Promise.resolve();
  }
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
};

// Network tripwire: the probe must stay offline even with an EXPIRED access
// token (getCurrentUser / fetchAuthSession would refresh it over fetch).
const fetchSpy = jest.fn(() => new Promise(() => undefined));

/** What Amplify's TokenOrchestrator.handleErrors dispatches on a failed refresh. */
const refreshFailed = (name: string) =>
  Hub.dispatch(
    'auth',
    { event: 'tokenRefresh_failure', data: { error: { name, message: name } } },
    'Auth',
    AMPLIFY_SYMBOL,
  );

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchSpy;
});

beforeEach(() => {
  storage.__INTERNAL_MOCK_STORAGE__ = {};
  // clearAllMocks keeps the mock implementations (resetAllMocks would not).
  jest.clearAllMocks();
  useUserStore.setState({ user: null });
});

afterEach(() => {
  jest.useRealTimers();
});

/* ───────────────────────── 1. the probe ───────────────────────── */

describe('probeStoredSession', () => {
  it('nothing stored → null', async () => {
    await expect(probeStoredSession()).resolves.toBeNull();
  });

  it('expired access token + refresh token → stored session with ID claims, offline', async () => {
    seedSession({ accessExpired: true, refresh: true });
    const result = await probeStoredSession();
    expect(result).not.toBeNull();
    expect(result?.idClaims?.sub).toBe(USER);
    expect(result?.idClaims?.['custom:userName']).toBe('Ada Lovelace');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('valid access token + refresh token → stored session', async () => {
    seedSession({ accessExpired: false, refresh: true });
    await expect(probeStoredSession()).resolves.not.toBeNull();
  });

  it('valid access token WITHOUT a refresh token → null (would strand the Drawer once it expires)', async () => {
    seedSession({ accessExpired: false, refresh: false });
    await expect(probeStoredSession()).resolves.toBeNull();
  });

  it('expired access token and no refresh token → null (cannot resume)', async () => {
    seedSession({ accessExpired: true, refresh: false });
    await expect(probeStoredSession()).resolves.toBeNull();
  });

  it('a session stored for ANOTHER client id is not ours → null', async () => {
    const s = storage.__INTERNAL_MOCK_STORAGE__;
    const old = '@MemoryStorage:CognitoIdentityServiceProvider.27sa4crum5hb010qar9sja1l09';
    s[`${old}.LastAuthUser`] = USER;
    s[`${old}.${USER}.accessToken`] = jwt({ sub: USER, exp: nowS() + 3600 });
    s[`${old}.${USER}.refreshToken`] = 'r';
    await expect(probeStoredSession()).resolves.toBeNull();
  });

  it('token-store error → null (never rejects)', async () => {
    seedSession();
    const spy = jest
      .spyOn(cognitoUserPoolsTokenProvider.authTokenStore, 'loadTokens')
      .mockRejectedValueOnce(new Error('keystore unavailable'));
    await expect(probeStoredSession()).resolves.toBeNull();
    spy.mockRestore();
  });

  it('storage that never answers → null after its own timeout', async () => {
    jest.useFakeTimers();
    seedSession();
    storage.getItem.mockImplementationOnce(() => new Promise(() => undefined));
    let result: unknown = 'pending';
    probeStoredSession(500).then(r => {
      result = r;
    });
    await flush();
    expect(result).toBe('pending');
    jest.advanceTimersByTime(500);
    await flush();
    expect(result).toBeNull();
  });

  it('is read-only: never removes, writes or clears a key', async () => {
    seedSession();
    const before = storedKeys();
    storage.setItem.mockClear();
    await probeStoredSession();
    expectNothingCleared(before);
  });
});

/* ───────────────────────── 2. overlay routing ───────────────────────── */

describe('SplashOverlay stall abort', () => {
  const FRAME = 1000 / 60;

  interface Run {
    routes: SplashRoute[];
    exited: number;
    step: (ms: number) => void;
    tree: renderer.ReactTestRenderer;
  }

  /**
   * Mounts the overlay (fake timers) and lets the stored-session probe
   * settle. `beforeProbeSettles` runs after mount, while the probe's
   * storage reads are still pending.
   */
  const mount = async (beforeProbeSettles?: () => void): Promise<Run> => {
    jest.useFakeTimers();
    const destReady = { value: 0 } as SharedValue<number>;
    const run = { routes: [] as SplashRoute[], exited: 0 } as Run;
    mockFrame.cb = null;
    renderer.act(() => {
      run.tree = renderer.create(
        <SplashOverlay
          destReady={destReady}
          onRoute={route => {
            run.routes.push(route);
            destReady.value = 1; // App: the destination laid out
          }}
          onExited={() => {
            run.exited++;
          }}
          destMounted={false}
        />,
      );
    });
    beforeProbeSettles?.();
    await flush(); // the probe settles (a ref write — no React update)
    const cb = mockFrame.cb as unknown as (fi: FrameInfo) => void;
    expect(cb).toBeTruthy();
    let now = 0;
    renderer.act(() => {
      cb({ timestamp: 0, timeSincePreviousFrame: null, timeSinceFirstFrame: 0 });
    });
    run.step = (ms: number) => {
      // CLAUDE.md §20.3: the frame callback stays referentially stable across
      // the overlay's re-renders (useFrameCallback re-registers on change).
      expect(mockFrame.cb).toBe(cb);
      renderer.act(() => {
        const end = now + ms;
        while (now < end && run.exited === 0) {
          now += FRAME;
          cb({ timestamp: now, timeSincePreviousFrame: FRAME, timeSinceFirstFrame: now });
        }
      });
    };
    return run;
  };

  const unmount = (run: Run) => {
    renderer.act(() => {
      run.tree.unmount();
    });
  };

  it('stored session → Drawer at the stall cap; user store from stored claims; nothing cleared', async () => {
    seedSession();
    const before = storedKeys();
    storage.setItem.mockClear();
    const run = await mount();

    run.step(STALL_MAX_MS - 500);
    expect(run.routes).toEqual([]); // still waiting on auth

    run.step(1000);
    expect(run.routes).toEqual(['Drawer']);
    expect(useUserStore.getState().user?.name).toBe('Ada Lovelace');
    expect(useUserStore.getState().user?.company).toBe('Analytical Engines');

    run.step(2000);
    expect(run.exited).toBe(1);
    expect(run.routes).toEqual(['Drawer']);
    // Drain the AsyncStorage mock's microtasks first: a clear or a network
    // refresh started during the frame steps only reaches storage / fetch
    // several hops later, so a synchronous check could never see it.
    await flush();
    expectNothingCleared(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount(run);
  });

  it('no stored session → Login at the stall cap', async () => {
    const run = await mount();
    run.step(STALL_MAX_MS + 2000);
    expect(run.routes).toEqual(['Onboarding']);
    expect(run.exited).toBe(1);
    expect(useUserStore.getState().user).toBeNull();
    unmount(run);
  });

  it('storage that never answers → probe times out → Login; nothing cleared', async () => {
    seedSession();
    const before = storedKeys();
    storage.setItem.mockClear();
    const realGetItem = storage.getItem.getMockImplementation() as AnyFn;
    storage.getItem.mockImplementation(() => new Promise(() => undefined));
    try {
      const run = await mount();
      // The probe's own budget elapses long before the 20 s abort.
      renderer.act(() => {
        jest.advanceTimersByTime(STORED_SESSION_PROBE_MS);
      });
      await flush();
      run.step(STALL_MAX_MS + 2000);
      expect(run.routes).toEqual(['Onboarding']);
      expect(run.exited).toBe(1);
      await flush();
      // Limitation: with getItem hung, a stray clearTokens() would stall in
      // its own LastAuthUser read and never reach removeItem — so this pins
      // routing + "no write" here; the Drawer test above is the one that
      // proves the abort path clears nothing.
      expectNothingCleared(before);
      unmount(run);
    } finally {
      storage.getItem.mockImplementation(realGetItem);
    }
  });

  it('a late auth outcome after the abort never re-routes (clock, effects or JS fallback)', async () => {
    seedSession();
    const before = storedKeys();
    storage.setItem.mockClear();
    const run = await mount();
    run.step(STALL_MAX_MS + FRAME);
    expect(run.routes).toEqual(['Drawer']);

    // The hydrate finally answers — 'unauthenticated' would point at Login.
    renderer.act(() => {
      mockAuth.set?.({ status: 'unauthenticated', displayName: '' });
    });
    // That arms the 4 s post-auth JS fallback; fire it before the UI exit.
    renderer.act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(run.exited).toBe(1);
    run.step(2000);
    expect(new Set(run.routes)).toEqual(new Set(['Drawer']));
    await flush();
    expectNothingCleared(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    unmount(run);
  });

  it('Cognito ends the stored session before the abort → Login, never the Drawer', async () => {
    seedSession();
    const run = await mount();
    // The hydrate's refresh was definitively rejected: Amplify cleared the
    // tokens and dispatched this — but 'unauthenticated' has not reached the
    // overlay yet (it is still 'loading' when the abort fires).
    refreshFailed('NotAuthorizedException');
    run.step(STALL_MAX_MS + 2000);
    expect(run.routes).toEqual(['Onboarding']);
    expect(useUserStore.getState().user).toBeNull();
    unmount(run);
  });

  it('a session-ending refresh failure before the probe settles is not undone by its late answer', async () => {
    seedSession();
    const run = await mount(() => refreshFailed('TokenRevokedException'));
    run.step(STALL_MAX_MS + 2000);
    expect(run.routes).toEqual(['Onboarding']);
    unmount(run);
  });

  it('a TRANSIENT refresh failure keeps the stored session → Drawer', async () => {
    seedSession();
    const run = await mount();
    refreshFailed('NetworkError');
    run.step(STALL_MAX_MS + 2000);
    expect(run.routes).toEqual(['Drawer']);
    unmount(run);
  });

  it('an auth outcome that is already known wins over the probe (no stall, no abort)', async () => {
    seedSession(); // a session IS stored…
    const run = await mount();
    renderer.act(() => {
      // …but the hydrate resolved (e.g. the refresh token was rejected).
      mockAuth.set?.({ status: 'unauthenticated', displayName: '' });
    });
    run.step(4000);
    expect(run.routes).toEqual(['Onboarding']);
    expect(run.exited).toBe(1);
    expect(useUserStore.getState().user).toBeNull();
    unmount(run);
  });

  it('authenticated at once → Drawer via the normal land, probe not consulted', async () => {
    const run = await mount();
    renderer.act(() => {
      mockAuth.set?.({ status: 'authenticated', displayName: 'Ada' });
    });
    run.step(3000);
    expect(run.routes).toEqual(['Drawer']);
    expect(run.exited).toBe(1);
    // The store is useAuth's job on this path (mocked here) — the overlay
    // only writes it on the no-auth Drawer route.
    expect(useUserStore.getState().user).toBeNull();
    unmount(run);
  });

  /* ── 'indeterminate': the hydrate failed transiently (no verdict) ── */

  describe("'indeterminate' hydrate → routed like the stall abort, without the stall", () => {
    const indeterminate = () => {
      renderer.act(() => {
        mockAuth.set?.({ status: 'indeterminate', displayName: '' });
      });
    };

    it('stored session → Drawer at the normal land (no 20 s wait); stored claims; nothing cleared', async () => {
      seedSession();
      const before = storedKeys();
      storage.setItem.mockClear();
      const run = await mount();
      indeterminate();
      await renderer.act(flush);

      run.step(3000); // the normal land, far below STALL_MAX_MS
      expect(run.routes).toEqual(['Drawer']);
      expect(run.exited).toBe(1);
      expect(useUserStore.getState().user?.name).toBe('Ada Lovelace');
      expect(useUserStore.getState().user?.company).toBe('Analytical Engines');
      await flush();
      expectNothingCleared(before);
      expect(fetchSpy).not.toHaveBeenCalled();
      unmount(run);
    });

    it('no stored session → Login at the normal land', async () => {
      const run = await mount();
      indeterminate();
      await renderer.act(flush);
      run.step(3000);
      expect(run.routes).toEqual(['Onboarding']);
      expect(run.exited).toBe(1);
      expect(useUserStore.getState().user).toBeNull();
      unmount(run);
    });

    it('arriving BEFORE the probe has answered → waits for it, never a default Login', async () => {
      seedSession();
      const realGetItem = storage.getItem.getMockImplementation() as AnyFn;
      const storageGate = deferred();
      storage.getItem.mockImplementation(async (...args: unknown[]) => {
        await storageGate.promise;
        return realGetItem(...args);
      });
      try {
        // A fast failure (offline: ~1 s) beats a slow storage read.
        const run = await mount(indeterminate);
        run.step(1500); // a decided route would have pre-mounted by now
        expect(run.routes).toEqual([]);

        storageGate.resolve();
        await renderer.act(flush);
        run.step(3000);
        expect(run.routes).toEqual(['Drawer']);
        expect(run.exited).toBe(1);
        unmount(run);
      } finally {
        storage.getItem.mockImplementation(realGetItem);
      }
    });

    it('Cognito ends the stored session first → Login, never the Drawer', async () => {
      seedSession();
      const run = await mount();
      refreshFailed('NotAuthorizedException');
      indeterminate();
      await renderer.act(flush);
      run.step(3000);
      expect(run.routes).toEqual(['Onboarding']);
      expect(useUserStore.getState().user).toBeNull();
      unmount(run);
    });

    it('arriving after the stall abort routed never re-routes (first route wins)', async () => {
      seedSession();
      const run = await mount();
      run.step(STALL_MAX_MS + FRAME);
      expect(run.routes).toEqual(['Drawer']);
      // Meanwhile Cognito ended the session (the Drawer's own logout handles
      // it) and the hydrate gives up: neither may flip the route.
      refreshFailed('NotAuthorizedException');
      indeterminate();
      await renderer.act(flush);
      renderer.act(() => {
        jest.advanceTimersByTime(5000);
      });
      run.step(2000);
      expect(new Set(run.routes)).toEqual(new Set(['Drawer']));
      expect(run.exited).toBe(1);
      unmount(run);
    });
  });
});
