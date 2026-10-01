/**
 * Refresh = really fresh (src/networking/freshFetch.ts).
 *
 * The API marks /protected/data/all cacheable (max-age=600, s-maxage=900),
 * so the device HTTP cache and CloudFront both answered a pull-to-refresh
 * with the copy they already had: same data, same "x min ago". Pinned:
 *  - every protected GET asks the device cache to revalidate;
 *  - while a user refresh runs, protected GETs carry a unique `_r` param
 *    (CDN miss); automatic fetches do not; /public/* and non-GETs are
 *    untouched;
 *  - a settled user refresh ticks the shared clock at once, so every
 *    "x min ago" is re-derived immediately (not up to 30 s later).
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { AppState, Text } from 'react-native';
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { appAxios } from '../src/networking/config';
import {
  FRESH_PARAM,
  isUserRefreshActive,
  onUserRefreshSettled,
  runUserRefresh,
} from '../src/networking/freshFetch';
import { useNow } from '../src/hooks/useNow';
import { resetActiveSite, useSwitchActiveSite } from '../src/hooks/useSwitchActiveSite';
import {
  SiteRefreshContext,
  useSiteRefresh,
} from '../src/components/screens/Authenticated/SiteDetail/siteRefresh';

jest.unmock('axios');
jest.mock('../src/routes/navigationRef', () => ({ resetToLogin: jest.fn() }));
jest.mock('../src/networking/auth/session', () => ({
  getValidAccessToken: async () => 'access-token',
}));
jest.mock('../src/networking/auth/cognito', () => ({
  cognitoSignOut: async () => undefined,
  onSessionEnded: () => () => undefined,
}));

/* ───────────── recording adapter ───────────── */

const sent: InternalAxiosRequestConfig[] = [];
/** Status per send, in order; 200 once exhausted. */
let statuses: number[] = [];
const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  sent.push({ ...config, params: config.params ? { ...config.params } : config.params });
  const status = statuses.shift() ?? 200;
  const response = { status, statusText: String(status), headers: new AxiosHeaders(), config, data: {} };
  if (status >= 400) {
    throw new AxiosError(`status ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
  }
  return response;
};
const header = (c: InternalAxiosRequestConfig, name: string) =>
  AxiosHeaders.from(c.headers).get(name);

beforeEach(() => {
  sent.length = 0;
  statuses = [];
  onlineManager.setOnline(true);
});

describe('request interceptor — device cache + CDN', () => {
  it('an automatic protected GET revalidates the device cache but keeps the CDN', async () => {
    await appAxios.get('/protected/data/all/site-1', { adapter });
    expect(header(sent[0], 'Cache-Control')).toBe('no-cache');
    expect(header(sent[0], 'Pragma')).toBe('no-cache');
    expect(sent[0].params?.[FRESH_PARAM]).toBeUndefined();
  });

  it('a user refresh adds a unique cache-busting param and keeps the real params', async () => {
    await runUserRefresh(async () => {
      expect(isUserRefreshActive()).toBe(true);
      await appAxios.get('/private/user/site-list', {
        adapter,
        params: { page: 1, pageSize: 50, q: 'Lucky' },
      });
    });
    expect(isUserRefreshActive()).toBe(false);
    expect(sent[0].params).toMatchObject({ page: 1, pageSize: 50, q: 'Lucky' });
    expect(typeof sent[0].params[FRESH_PARAM]).toBe('number');
    // After it settles, fetches go back to the CDN.
    await appAxios.get('/protected/data/all/site-1', { adapter });
    expect(sent[1].params?.[FRESH_PARAM]).toBeUndefined();
  });

  it('a failed refresh still ends the bypass window', async () => {
    await expect(runUserRefresh(async () => Promise.reject(new Error('offline')))).rejects.toThrow(
      'offline',
    );
    expect(isUserRefreshActive()).toBe(false);
  });

  it('/public/* config and non-GET requests are left alone', async () => {
    await runUserRefresh(async () => {
      await appAxios.get('/public/config/params-mapping', { adapter });
      await appAxios.post('/protected/thing', {}, { adapter });
    });
    expect(header(sent[0], 'Cache-Control')).toBeFalsy();
    expect(sent[0].params?.[FRESH_PARAM]).toBeUndefined();
    expect(header(sent[1], 'Cache-Control')).toBeFalsy();
    expect(sent[1].params?.[FRESH_PARAM]).toBeUndefined();
  });

  it('never mutates the caller\'s params object', async () => {
    const params = { page: 1, pageSize: 50 };
    await runUserRefresh(() => appAxios.get('/private/user/site-list', { adapter, params }));
    expect(params).toEqual({ page: 1, pageSize: 50 });
  });

  it('the 401 retry inside a user refresh is bypassed and revalidated too', async () => {
    statuses = [401, 200];
    await runUserRefresh(() => appAxios.get('/protected/data/all/site-1', { adapter }));
    expect(sent).toHaveLength(2);
    for (const c of sent) {
      expect(typeof c.params?.[FRESH_PARAM]).toBe('number');
      expect(header(c, 'Cache-Control')).toBe('no-cache');
    }
  });

  it('offline, a user refresh opens no bypass window (the reconnect burst keeps the CDN)', async () => {
    onlineManager.setOnline(false);
    await runUserRefresh(async () => {
      expect(isUserRefreshActive()).toBe(false);
    });
  });

  it('a throwing settle listener neither fails the refresh nor starves the others', async () => {
    const bad = onUserRefreshSettled(() => {
      throw new Error('boom');
    });
    const good = jest.fn();
    const offGood = onUserRefreshSettled(good);
    // The failure is reported via display() — keep the expected log quiet.
    const quiet = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await expect(runUserRefresh(async () => 'ok')).resolves.toBe('ok');
      expect(good).toHaveBeenCalledTimes(1);
    } finally {
      quiet.mockRestore();
      bad();
      offGood();
    }
  });

  it('settle listeners fire once per refresh and can unsubscribe', async () => {
    const listener = jest.fn();
    const off = onUserRefreshSettled(listener);
    await runUserRefresh(async () => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    await runUserRefresh(async () => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

/* ───────────── shared clock ───────────── */

describe('useNow after a user refresh', () => {
  let tree: ReactTestRenderer | undefined;
  const appState = AppState as unknown as { currentState: unknown };
  let prevState: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    prevState = appState.currentState;
    appState.currentState = 'active';
  });
  afterEach(() => {
    if (tree) act(() => tree?.unmount());
    tree = undefined;
    appState.currentState = prevState;
    jest.useRealTimers();
  });

  it('re-derives "now" the moment the refresh settles, not at the next 30 s tick', async () => {
    const Clock = () => React.createElement(Text, null, String(useNow()));
    act(() => {
      tree = renderer.create(React.createElement(Clock));
    });
    const shown = () => Number((tree as ReactTestRenderer).root.findByType(Text).props.children);
    const before = shown();

    jest.setSystemTime(before + 12_000); // 12 s later — no tick yet
    expect(shown()).toBe(before);

    await act(async () => {
      await runUserRefresh(async () => undefined);
    });
    expect(shown()).toBe(before + 12_000);
  });
});

/* ───────────── tab refresh → SiteDetail's one refresh path ───────────── */

describe('useSiteRefresh', () => {
  const Probe = ({ fallback, out }: { fallback: () => Promise<unknown>; out: { fn?: () => void } }) => {
    out.fn = useSiteRefresh(fallback);
    return null;
  };

  it('inside SiteDetail a tab refresh runs the shell refresh, not just its own query', () => {
    const shell = jest.fn();
    const fallback = jest.fn(async () => undefined);
    const out: { fn?: () => void } = {};
    act(() => {
      renderer.create(
        React.createElement(
          SiteRefreshContext.Provider,
          { value: shell },
          React.createElement(Probe, { fallback, out }),
        ),
      );
    });
    out.fn?.();
    expect(shell).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('outside SiteDetail it runs its own query as a user refresh', async () => {
    let bypassed: boolean | undefined;
    const fallback = jest.fn(async () => {
      bypassed = isUserRefreshActive();
    });
    const out: { fn?: () => void } = {};
    act(() => {
      renderer.create(React.createElement(Probe, { fallback, out }));
    });
    await act(async () => {
      out.fn?.();
    });
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(bypassed).toBe(true);
  });
});

/* ───────────── opening a site ───────────── */

describe('opening a site (useSwitchActiveSite)', () => {
  it('fetches its live data past the CDN; config keeps the CDN', async () => {
    const prev = appAxios.defaults.adapter;
    appAxios.defaults.adapter = adapter;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let tree: ReactTestRenderer | undefined;
    try {
      const out: { open?: (id: string) => void } = {};
      const Probe = () => {
        out.open = useSwitchActiveSite();
        return null;
      };
      act(() => {
        tree = renderer.create(
          React.createElement(QueryClientProvider, { client }, React.createElement(Probe)),
        );
      });
      await act(async () => {
        out.open?.('site-9');
        for (let i = 0; i < 5; i += 1) await new Promise(r => setTimeout(r, 0));
      });
      const data = sent.find(c => c.url?.includes('/protected/data/all/site-9'));
      const config = sent.find(c => c.url?.includes('/protected/config/site/site-9'));
      expect(data).toBeDefined();
      expect(typeof data?.params?.[FRESH_PARAM]).toBe('number');
      expect(config).toBeDefined();
      expect(config?.params?.[FRESH_PARAM]).toBeUndefined();
    } finally {
      if (tree) act(() => tree?.unmount());
      client.clear();
      resetActiveSite();
      appAxios.defaults.adapter = prev;
    }
  });
});
