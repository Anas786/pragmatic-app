/**
 * Cold start end to end: SplashOverlay + the REAL useAuth hydrate + the
 * REAL Amplify token store / refresh (AsyncStorage mock, `fetch` playing
 * Cognito). Only the splash clock is stepped by hand.
 *
 * The regression this pins: a FAST transient failure at launch (airplane
 * mode, DNS, Cognito 5xx) used to resolve the hydrate 'unauthenticated'
 * within ~1 s, so the splash sent a user whose refresh token was perfectly
 * valid to Login. Now such a failure is 'indeterminate' and routed by the
 * stored-session probe — Drawer — while a definitive rejection still goes
 * to Login. Nothing here ever clears a stored session that Cognito did not
 * reject.
 */
import { afterEach, beforeAll, beforeEach, expect, it, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import React from 'react';
import renderer from 'react-test-renderer';
import { Amplify } from 'aws-amplify';
import type { FrameInfo, SharedValue } from 'react-native-reanimated';
import { amplifyConfig } from '../src/config/amplify';
import { useUserStore } from '../src/hooks/useUserStore';
import { resetToLogin } from '../src/routes/navigationRef';
import { clearSessionCache } from '../src/networking/auth/session';
import SplashOverlay, {
  type SplashRoute,
} from '../src/components/screens/Onboarding/Splash';
import {
  NEUTRAL_CAPTION,
  SIGNING_IN,
} from '../src/components/screens/Onboarding/Splash/SplashCaption';
import { STALL_MAX_MS } from '../src/components/screens/Onboarding/Splash/timeline';
import {
  cognitoError,
  cognitoKeys,
  resetStorage,
  seedSession,
} from './fixtures/cognitoSession';

jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));

// Capture the splash frame callback so the clock can be stepped by hand
// (same harness as splashAbortRouting.test.tsx).
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

type AnyFn = (...args: any[]) => any;
const resetToLoginMock = resetToLogin as unknown as Mock<AnyFn>;
const fetchMock = jest.fn<AnyFn>();
const FRAME = 1000 / 60;

const flush = async () => {
  for (let i = 0; i < 400; i++) {
    await Promise.resolve();
  }
};

/**
 * Mounts the overlay on fake timers. `step(ms)` plays ~100 ms of frames at a
 * time, then advances timers by as much (Amplify's retry backoff) and
 * drains promises — so the real hydrate progresses alongside the clock.
 */
const start = async () => {
  jest.useFakeTimers();
  const destReady = { value: 0 } as SharedValue<number>;
  const out = { routes: [] as SplashRoute[], exited: 0, routedAtMs: -1 };
  let now = 0; // clock time (ms) of the frames played so far
  let tree!: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(
      <SplashOverlay
        destReady={destReady}
        onRoute={route => {
          out.routes.push(route);
          if (out.routedAtMs < 0) {
            out.routedAtMs = now;
          }
          destReady.value = 1;
        }}
        onExited={() => {
          out.exited++;
        }}
        destMounted={false}
      />,
    );
  });
  await renderer.act(flush);
  const cb = mockFrame.cb as (fi: FrameInfo) => void;
  expect(cb).toBeTruthy();
  renderer.act(() => {
    cb({ timestamp: 0, timeSincePreviousFrame: null, timeSinceFirstFrame: 0 });
  });
  const step = async (ms: number) => {
    const end = now + ms;
    while (now < end && out.exited === 0) {
      for (let k = 0; k < 6 && out.exited === 0; k++) {
        now += FRAME;
        renderer.act(() => {
          cb({ timestamp: now, timeSincePreviousFrame: FRAME, timeSinceFirstFrame: now });
        });
      }
      await renderer.act(async () => {
        jest.advanceTimersByTime(100);
        await flush();
      });
    }
  };
  const unmount = () => {
    renderer.act(() => {
      tree.unmount();
    });
  };
  /** Everything the overlay renders, as text (the caption included). */
  const rendered = () => JSON.stringify(tree.toJSON());
  return { out, step, unmount, rendered };
};

/** Real ms by which the caption is up (its entrance starts at ~914 ms). */
const CAPTION_UP_MS = 1300;

beforeAll(() => {
  Amplify.configure(amplifyConfig as never);
  (globalThis as { fetch: unknown }).fetch = fetchMock;
});

beforeEach(() => {
  resetStorage();
  clearSessionCache();
  fetchMock.mockReset();
  resetToLoginMock.mockClear();
  useUserStore.setState({ user: null });
});

afterEach(() => {
  jest.useRealTimers();
});

it.each([
  ['offline / DNS (fetch rejects at once)', async () => {
    throw new TypeError('Network request failed');
  }],
  ['Cognito 5xx', async () => cognitoError('InternalErrorException', 500)],
])(
  'expired access + valid refresh token, refresh fails fast — %s → Drawer at the normal land, session kept',
  async (_label, cognitoAnswer) => {
    seedSession({ accessExpired: true });
    const before = cognitoKeys();
    fetchMock.mockImplementation(cognitoAnswer);

    const run = await start();
    await run.step(CAPTION_UP_MS);
    // No verdict on the session → the neutral line, never a greeting.
    expect(run.rendered()).toContain(NEUTRAL_CAPTION);
    expect(run.rendered()).not.toContain(SIGNING_IN);
    await run.step(6000 - CAPTION_UP_MS);

    expect(fetchMock).toHaveBeenCalled(); // the refresh really failed
    expect(run.out.routes).toEqual(['Drawer']);
    expect(run.out.routedAtMs).toBeLessThan(STALL_MAX_MS); // not the stall abort
    expect(run.out.exited).toBe(1);
    // Display-only fill from the stored ID token (no auth bypass: every
    // request still needs a valid access token).
    expect(useUserStore.getState().user?.name).toBe('Ada Lovelace');
    expect(cognitoKeys()).toEqual(before);
    expect(resetToLoginMock).not.toHaveBeenCalled();
    run.unmount();
  },
);

it('Cognito definitively rejects the refresh token at launch → Login; Amplify cleared the store', async () => {
  seedSession({ accessExpired: true });
  fetchMock.mockImplementation(async () => cognitoError('NotAuthorizedException'));

  const run = await start();
  await run.step(6000);

  expect(run.out.routes).toEqual(['Onboarding']);
  expect(run.out.exited).toBe(1);
  expect(cognitoKeys()).toEqual([]);
  run.unmount();
});

it('nothing stored → neutral caption, Login at the normal land, no network', async () => {
  const run = await start();
  await run.step(CAPTION_UP_MS);
  expect(run.rendered()).toContain(NEUTRAL_CAPTION);
  expect(run.rendered()).not.toContain(SIGNING_IN);
  await run.step(6000 - CAPTION_UP_MS);
  expect(run.out.routes).toEqual(['Onboarding']);
  expect(run.out.routedAtMs).toBeLessThan(STALL_MAX_MS);
  expect(fetchMock).not.toHaveBeenCalled();
  run.unmount();
});

it('a valid stored session → "Signing you in, <custom:userName>", then Drawer with the hydrated user, no network', async () => {
  seedSession({ accessExpired: false });
  const run = await start();
  await run.step(CAPTION_UP_MS);
  expect(run.rendered()).toContain(SIGNING_IN);
  expect(run.rendered()).toContain('Ada Lovelace');
  expect(run.rendered()).not.toContain(NEUTRAL_CAPTION);
  await run.step(6000 - CAPTION_UP_MS);
  expect(run.out.routes).toEqual(['Drawer']);
  expect(useUserStore.getState().user?.name).toBe('Ada Lovelace');
  expect(fetchMock).not.toHaveBeenCalled();
  run.unmount();
});
