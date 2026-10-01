/**
 * Foundation primitives: behaviour + accessibility contracts that screen
 * packages build on (AppText, PressableScale, Pill/PillGroup, IconButton,
 * TopBar, ScreenHeader, FreshnessStatus + the shared useNow ticker,
 * HeroStatusBadge, PulseDot, EmptyStateCard, ErrorBoundary, Avatar,
 * SiteLogo) and friendlyError copy.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React, { useState } from 'react';
import renderer, { act, ReactTestInstance, ReactTestRenderer } from 'react-test-renderer';
import {
  AppState,
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import * as Reanimated from 'react-native-reanimated';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as object;
  return { ...actual, useIsFocused: () => true };
});

import AppText from '../src/components/common/AppText';
import Avatar from '../src/components/common/Avatar';
import EmptyStateCard from '../src/components/common/EmptyStateCard';
import ErrorBoundary from '../src/components/common/ErrorBoundary';
import FreshnessStatus from '../src/components/common/FreshnessStatus';
import { HeroStatusBadge } from '../src/components/common/HeroRow';
import IconButton from '../src/components/common/IconButton';
import { Pill, PillGroup } from '../src/components/common/Pill';
import PressableScale from '../src/components/common/PressableScale';
import PulseDot from '../src/components/common/PulseDot';
import ScreenHeader from '../src/components/common/ScreenHeader';
import SiteLogo from '../src/components/common/SiteLogo';
import TopBar from '../src/components/common/TopBar';
import ReportFilterPill from '../src/components/screens/Authenticated/SiteDetail/components/PerformanceReport/ReportFilterPill';
import { __nowTickerState } from '../src/hooks/useNow';
import { useThemeStore } from '../src/hooks/useThemeStore';
import { DARK_SCHEME, LIGHT_SCHEME } from '../src/theme/useThemedStyles';
import { touch } from '../src/theme/tokens';
import { friendlyError } from '../src/utils/errors';
import { haptics } from '../src/utils/haptics';

const MIN = 60_000;

/* ─────────── helpers ─────────── */

let tree: ReactTestRenderer | undefined;
const render = (el: React.ReactElement) => {
  act(() => {
    tree = renderer.create(el);
  });
  return tree as ReactTestRenderer;
};
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
});

/** All rendered strings, in order. */
const texts = (root: ReactTestInstance): string[] =>
  root
    .findAllByType(Text)
    .map(t => [t.props.children].flat(Infinity).filter(c => typeof c === 'string' || typeof c === 'number').join(''))
    .filter(s => s.length > 0);

type FlatStyle = Record<string, any>;
const flat = (style: unknown): FlatStyle =>
  (StyleSheet.flatten(style as StyleProp<ViewStyle>) ?? {}) as FlatStyle;

/** Host nodes carrying a given accessibility label. */
const byLabel = (root: ReactTestInstance, label: string) =>
  root.findAll(n => typeof n.type === 'string' && n.props.accessibilityLabel === label);

const pressables = (root: ReactTestInstance) => root.findAllByType(Pressable);

/** Flattened style of the first host view under `node` that sets `key`. */
const hostStyleWith = (node: ReactTestInstance, key: string) =>
  node
    .findAll(n => typeof n.type === 'string')
    .map(n => flat(n.props.style))
    .find(st => st[key] !== undefined) ?? {};

beforeEach(() => {
  useThemeStore.setState({ isDark: true });
});

/* ─────────── AppText ─────────── */

describe('AppText', () => {
  it('defaults to scheme.textPrimary, follows the theme, and caps font scaling at 1.3', () => {
    const t = render(<AppText>hi</AppText>);
    let text = t.root.findByType(Text);
    expect(flat(text.props.style).color).toBe(DARK_SCHEME.textPrimary);
    expect(text.props.allowFontScaling).toBe(true);
    expect(text.props.maxFontSizeMultiplier).toBe(1.3);
    act(() => {
      useThemeStore.setState({ isDark: false });
    });
    text = t.root.findByType(Text);
    expect(flat(text.props.style).color).toBe(LIGHT_SCHEME.textPrimary);
  });

  it('colour precedence: color > tone > primary', () => {
    const t = render(
      <>
        <AppText tone="danger">a</AppText>
        <AppText tone="danger" color="#123456">
          b
        </AppText>
        <AppText tone="brand">c</AppText>
      </>,
    );
    const [a, b, c] = t.root.findAllByType(Text).map(n => flat(n.props.style).color);
    expect(a).toBe(DARK_SCHEME.statusInk.danger);
    expect(b).toBe('#123456');
    expect(c).toBe(DARK_SCHEME.brandText);
  });

  it('floors at 11pt unless fixedSize, which keeps the legacy no-scaling path', () => {
    const t = render(
      <>
        <AppText fontSize={4}>small</AppText>
        <AppText fontSize={4} fixedSize>
          canvas
        </AppText>
      </>,
    );
    const [floored, fixed] = t.root.findAllByType(Text);
    expect(flat(floored.props.style).fontSize).toBeGreaterThanOrEqual(11);
    expect(flat(fixed.props.style).fontSize).toBeLessThan(11);
    expect(fixed.props.allowFontScaling).toBe(false);
  });

  it('variant sets weight/size; explicit props override it', () => {
    const t = render(
      <>
        <AppText variant="h3">title</AppText>
        <AppText variant="h3" medium fontSize={20}>
          over
        </AppText>
      </>,
    );
    const [v, o] = t.root.findAllByType(Text).map(n => flat(n.props.style));
    expect(v.fontFamily).toBe('Poppins-SemiBold');
    expect(v.lineHeight).toBeGreaterThan(0);
    expect(o.fontFamily).toBe('Poppins-Medium');
    expect(o.lineHeight).toBeUndefined();
  });
});

/* ─────────── PressableScale / IconButton / TopBar ─────────── */

describe('PressableScale', () => {
  it('no haptic by default; role + state reach the accessibility tree', () => {
    const tap = jest.spyOn(haptics, 'tap').mockImplementation(() => {});
    const onPress = jest.fn();
    const t = render(
      <PressableScale onPress={onPress} role="tab" selected busy accessibilityLabel="Go">
        <AppText>Go</AppText>
      </PressableScale>,
    );
    const p = pressables(t.root)[0];
    act(() => p.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(tap).not.toHaveBeenCalled();
    expect(p.props.accessibilityRole).toBe('tab');
    expect(p.props.accessibilityState).toMatchObject({ selected: true, busy: true, disabled: false });
    tap.mockRestore();
  });
});

describe('IconButton', () => {
  it('is at least touch.min square and warns in dev without a label', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const t = render(
      <IconButton onPress={() => {}} size={24}>
        <AppText>x</AppText>
      </IconButton>,
    );
    const box = hostStyleWith(pressables(t.root)[0], 'width');
    expect(box.width).toBeGreaterThanOrEqual(touch.min);
    expect(box.height).toBeGreaterThanOrEqual(touch.min);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("soft variant draws a 40pt circle inside the ≥44pt box", () => {
    const t = render(
      <IconButton variant="soft" accessibilityLabel="Refresh" onPress={() => {}}>
        <AppText>r</AppText>
      </IconButton>,
    );
    const circle = t.root.findAll(
      n => typeof n.type === 'string' && flat(n.props.style).borderRadius === 20,
    );
    expect(circle.length).toBeGreaterThan(0);
    expect(byLabel(t.root, 'Refresh')).toHaveLength(1);
  });
});

describe('TopBar', () => {
  it('is a non-accessible container so its buttons stay individually focusable', () => {
    const t = render(
      <TopBar>
        <IconButton accessibilityLabel="Open menu" onPress={() => {}}>
          <AppText>≡</AppText>
        </IconButton>
      </TopBar>,
    );
    const root = pressables(t.root)[0];
    expect(root.props.accessible).toBe(false);
    expect(root.props.importantForAccessibility).toBe('no');
    expect(byLabel(t.root, 'Open menu')).toHaveLength(1);
  });
});

/* ─────────── ScreenHeader ─────────── */

describe('ScreenHeader', () => {
  it('centred title with the header role, a labelled Back button and equal side slots', () => {
    const onBack = jest.fn();
    const t = render(<ScreenHeader title="Profile" onBack={onBack} testID="hdr" />);
    const title = t.root.findAll(
      n => n.type === Text && n.props.accessibilityRole === 'header',
    );
    expect(title).toHaveLength(1);
    expect(texts(title[0])).toEqual(['Profile']);
    expect(flat(title[0].props.style).textAlign).toBe('center');

    const left = flat(t.root.findByProps({ testID: 'hdr-left' }).props.style);
    const right = flat(t.root.findByProps({ testID: 'hdr-right' }).props.style);
    expect(left.flexGrow).toBe(1);
    expect(right.flexGrow).toBe(left.flexGrow);
    expect(left.flexBasis).toBe(right.flexBasis);
    expect(left.minWidth).toBe(touch.min);

    const back = pressables(t.root).find(p => p.props.accessibilityLabel === 'Back');
    expect(back?.props.accessibilityRole).toBe('button');
    act(() => back?.props.onPress());
    expect(onBack).toHaveBeenCalled();
  });

  it("align='left' drops empty slots and renders a node subtitle as-is", () => {
    const t = render(
      <ScreenHeader
        title="Lucky Cement Nooriabad"
        align="left"
        subtitle={<AppText testID="sub">Live · 3 min ago</AppText>}
        testID="hdr"
      />,
    );
    expect(t.root.findAllByProps({ testID: 'hdr-left' })).toHaveLength(0);
    expect(t.root.findAllByProps({ testID: 'hdr-right' })).toHaveLength(0);
    expect(t.root.findAllByProps({ testID: 'sub' }).length).toBeGreaterThan(0);
  });
});

/* ─────────── Pill / PillGroup / ReportFilterPill ─────────── */

describe('Pill', () => {
  it("fires 'select' only when the selection changes; exposes radio state + position", () => {
    const select = jest.spyOn(haptics, 'select').mockImplementation(() => {});
    const onA = jest.fn();
    const onB = jest.fn();
    const t = render(
      <PillGroup label="Report period">
        <Pill label="Custom" selected onPress={onA} />
        <Pill label="Month" selected={false} onPress={onB} />
      </PillGroup>,
    );
    const [a, b] = pressables(t.root);
    expect(a.props.accessibilityRole).toBe('radio');
    expect(a.props.accessibilityState.selected).toBe(true);
    expect(b.props.accessibilityState.selected).toBe(false);
    expect(a.props.accessibilityValue).toEqual({ text: '1 of 2' });
    expect(b.props.accessibilityValue).toEqual({ text: '2 of 2' });

    act(() => a.props.onPress());
    expect(onA).toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    act(() => b.props.onPress());
    expect(select).toHaveBeenCalledTimes(1);

    const group = t.root.findAll(
      n => typeof n.type === 'string' && n.props.accessibilityRole === 'radiogroup',
    );
    expect(group).toHaveLength(1);
    expect(group[0].props.accessibilityLabel).toBe('Report period');
    select.mockRestore();
  });

  it('tops the visual height up to touch.min with vertical hitSlop', () => {
    const t = render(<Pill label="Power" count={12} selected={false} onPress={() => {}} />);
    const p = pressables(t.root)[0];
    const visual = hostStyleWith(p, 'minHeight').minHeight as number;
    expect(visual + p.props.hitSlop.top + p.props.hitSlop.bottom).toBeGreaterThanOrEqual(touch.min);
    expect(p.props.accessibilityLabel).toBe('Power, 12');
  });

  it.each(['sm', 'md'] as const)(
    "a short-label %p pill is never narrower than touch.min (no horizontal slop needed)",
    size => {
      const t = render(<Pill label="1" size={size} selected={false} onPress={() => {}} />);
      const p = pressables(t.root)[0];
      const box = hostStyleWith(p, 'minHeight');
      expect(box.minWidth).toBeGreaterThanOrEqual(touch.min);
      expect(p.props.hitSlop.left + p.props.hitSlop.right).toBe(0);
    },
  );

  it("ReportFilterPill shows 'Life Time' as 'Lifetime'", () => {
    const t = render(<ReportFilterPill label="Life Time" active={false} onPress={() => {}} />);
    expect(texts(t.root)).toEqual(['Lifetime']);
    expect(pressables(t.root)[0].props.accessibilityLabel).toBe('Lifetime');
  });
});

/* ─────────── FreshnessStatus + useNow ─────────── */

describe('FreshnessStatus + shared ticker', () => {
  let appStateHandler: ((s: string) => void) | undefined;
  const NOW = new Date(2026, 9, 1, 14, 0, 0).getTime();

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
    (AppState as unknown as { currentState: string }).currentState = 'active';
    (AppState.addEventListener as unknown as jest.Mock).mockImplementation(((
      _t: string,
      fn: (s: string) => void,
    ) => {
      appStateHandler = fn;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('updates itself on the tick without re-rendering its parent', () => {
    let parentRenders = 0;
    const Parent = () => {
      parentRenders += 1;
      const [ts] = useState(NOW - 29 * MIN - 30_000);
      return <FreshnessStatus lastUpdate={ts} trailing="1.25 MW" />;
    };
    const t = render(<Parent />);
    expect(texts(t.root)).toEqual(['Live · 29 min ago · 1.25 MW']);
    expect(__nowTickerState()).toEqual({ subscribers: 1, running: true });

    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(texts(t.root)).toEqual(['Live · 30 min ago · 1.25 MW']);
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(texts(t.root)).toEqual(['Delayed · 30 min ago · 1.25 MW']);
    expect(parentRenders).toBe(1);

    const label = t.root.findAll(n => typeof n.type === 'string' && n.props.accessible === true)[0]
      .props.accessibilityLabel;
    expect(label).toBe('Delayed, last updated 30 minutes ago, 1.25 MW');
  });

  it('pauses while backgrounded and refreshes immediately on resume', () => {
    const t = render(<FreshnessStatus lastUpdate={NOW - 2 * MIN} variant="updated" />);
    expect(texts(t.root)).toEqual(['Updated 2 min ago']);

    act(() => appStateHandler?.('background'));
    expect(__nowTickerState().running).toBe(false);
    act(() => {
      jest.advanceTimersByTime(10 * MIN);
    });
    expect(texts(t.root)).toEqual(['Updated 2 min ago']);

    act(() => appStateHandler?.('active'));
    expect(__nowTickerState().running).toBe(true);
    expect(texts(t.root)).toEqual(['Updated 12 min ago']);
  });

  it('stops the interval when the last subscriber unmounts', () => {
    const t = render(<FreshnessStatus lastUpdate={NOW} />);
    expect(__nowTickerState().running).toBe(true);
    act(() => t.unmount());
    tree = undefined;
    expect(__nowTickerState()).toEqual({ subscribers: 0, running: false });
  });

  it('offline wins and shows a solid danger dot', () => {
    const t = render(<FreshnessStatus lastUpdate={NOW - 3 * MIN} state="OFFLINE" />);
    expect(texts(t.root)[0]).toBe('Offline · last data 3 min ago');
  });
});

/* ─────────── PulseDot / HeroStatusBadge ─────────── */

describe('PulseDot / HeroStatusBadge', () => {
  it('PulseDot active={false} creates no Reanimated values or loops', () => {
    const repeat = jest.spyOn(Reanimated, 'withRepeat');
    const shared = jest.spyOn(Reanimated, 'useSharedValue');
    render(<PulseDot color="#fff" active={false} />);
    expect(repeat).not.toHaveBeenCalled();
    expect(shared).not.toHaveBeenCalled();
    repeat.mockRestore();
    shared.mockRestore();
  });

  it("mode 'period' never renders a PulseDot", () => {
    const t = render(<HeroStatusBadge mode="period" label="Energy" periodLabel="September 2026" />);
    expect(t.root.findAllByType(PulseDot)).toHaveLength(0);
    expect(texts(t.root)).toEqual(['Energy · September 2026']);
    act(() =>
      t.update(<HeroStatusBadge mode="period" periodLabel="2026" updating />),
    );
    expect(texts(t.root)).toEqual(['Updating…']);
  });

  it("mode 'live' pulses only for live data, otherwise states the age", () => {
    const now = Date.now();
    const t = render(<HeroStatusBadge mode="live" label="Plant" lastUpdate={now - 3 * MIN} />);
    expect(t.root.findAllByType(PulseDot)).toHaveLength(1);
    expect(texts(t.root)).toEqual(['Live · Plant']);

    act(() => t.update(<HeroStatusBadge mode="live" label="Plant" lastUpdate={now - 45 * MIN} />));
    expect(t.root.findAllByType(PulseDot)).toHaveLength(0);
    expect(texts(t.root)).toEqual(['Delayed · 45 min']);
    expect(
      t.root.findAll(n => typeof n.type === 'string' && n.props.accessible === true)[0].props
        .accessibilityLabel,
    ).toBe('Delayed, last updated 45 minutes ago');

    act(() => t.update(<HeroStatusBadge mode="live" label="Plant" lastUpdate={now - 4 * 3_600_000} />));
    expect(texts(t.root)).toEqual(['Last data · 4 h ago']);

    act(() => t.update(<HeroStatusBadge mode="live" label="Plant" lastUpdate="NA" />));
    expect(texts(t.root)).toEqual(['Last update unknown']);
  });
});

/* ─────────── EmptyStateCard / ErrorBoundary ─────────── */

describe('EmptyStateCard', () => {
  it('kind adds an icon; retry is a ≥ touch.min button labelled with its verb', () => {
    const onRetry = jest.fn();
    const t = render(
      <EmptyStateCard kind="offline" size="inline" title="You're offline" onRetry={onRetry} retryLabel="Retry" />,
    );
    const retry = pressables(t.root)[0];
    expect(retry.props.accessibilityLabel).toBe('Retry');
    expect(hostStyleWith(retry, 'minHeight').minHeight).toBeGreaterThanOrEqual(touch.min);
    act(() => retry.props.onPress());
    expect(onRetry).toHaveBeenCalled();
  });

  it('existing call shape (message only) still renders', () => {
    const t = render(<EmptyStateCard message="No data for this period." />);
    expect(texts(t.root)).toEqual(['No data for this period.']);
  });
});

describe('ErrorBoundary', () => {
  const Boom = ({ boom }: { boom: boolean }) => {
    if (boom) throw new TypeError('secret detail 0xDEAD');
    return <AppText>content</AppText>;
  };
  const devFlag = (global as { __DEV__?: boolean }).__DEV__;
  let consoleError: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = devFlag;
    consoleError.mockRestore();
  });

  it('release fallback leaks no error name, message or stack', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    const t = render(
      <ErrorBoundary label="Live Parameters" resetKey="a">
        <Boom boom />
      </ErrorBoundary>,
    );
    const shown = texts(t.root).join(' | ');
    expect(shown).toContain("This section couldn't be displayed");
    expect(shown).toContain('Reload section');
    expect(shown).not.toMatch(/TypeError|secret|0xDEAD|crashed|at /);
  });

  it('a new resetKey clears the error', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    const t = render(
      <ErrorBoundary resetKey="site-1">
        <Boom boom />
      </ErrorBoundary>,
    );
    expect(texts(t.root).join()).toContain("couldn't be displayed");
    act(() =>
      t.update(
        <ErrorBoundary resetKey="site-2">
          <Boom boom={false} />
        </ErrorBoundary>,
      ),
    );
    expect(texts(t.root)).toEqual(['content']);
  });

  it('dev builds keep the diagnostic card', () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const t = render(
      <ErrorBoundary label="Live Parameters">
        <Boom boom />
      </ErrorBoundary>,
    );
    expect(texts(t.root).join(' ')).toContain('Live Parameters crashed');
  });
});

/* ─────────── Avatar / SiteLogo ─────────── */

describe('Avatar / SiteLogo', () => {
  it.each([48, 72, 100])('Avatar is exactly square at %p pt with 0.38× initials', size => {
    const t = render(<Avatar name="Muhammad Anas" size={size} />);
    const circle = t.root.findAll(
      n => typeof n.type === 'string' && flat(n.props.style).borderWidth === 2,
    )[0];
    const s = flat(circle.props.style);
    expect([s.width, s.height]).toEqual([size, size]);
    expect(s.borderRadius).toBe(size / 2);
    expect(s.borderColor).toBe(DARK_SCHEME.brand);
    expect(s.backgroundColor).toBe(DARK_SCHEME.brandSoft);
    expect(texts(t.root)).toEqual(['MA']);
  });

  it('Avatar falls back to initials when its photo fails, and retries a NEW url', () => {
    const photo = (root: ReactTestInstance) => root.findAllByType(Image);
    const t = render(<Avatar name="Muhammad Anas" imageUrl="https://cdn/bad.png" />);
    expect(photo(t.root)).toHaveLength(1);
    act(() => photo(t.root)[0].props.onError());
    expect(photo(t.root)).toHaveLength(0);
    expect(texts(t.root)).toEqual(['MA']);

    // Same url again → still initials (no retry loop on a known-bad url).
    act(() => t.update(<Avatar name="Muhammad Anas" imageUrl="https://cdn/bad.png" />));
    expect(photo(t.root)).toHaveLength(0);

    // A different url → the photo is tried again.
    act(() => t.update(<Avatar name="Muhammad Anas" imageUrl="https://cdn/good.png" />));
    expect(photo(t.root)).toHaveLength(1);
    expect(photo(t.root)[0].props.source).toEqual({ uri: 'https://cdn/good.png' });
  });

  it('SiteLogo draws contain on the logo plate and falls back to initials on error', () => {
    const t = render(<SiteLogo uri="https://cdn/x.png" name="Lucky Cement" size={40} />);
    const img = t.root.findAll(n => n.props.resizeMode === 'contain' && typeof n.type !== 'string')[0];
    expect(img).toBeDefined();
    const plate = byLabel(t.root, 'Lucky Cement logo')[0];
    expect(flat(plate.props.style).backgroundColor).toBe(DARK_SCHEME.logoPlate);
    act(() => img.props.onError());
    expect(texts(t.root)).toEqual(['LC']);

    act(() => t.update(<SiteLogo uri={null} name="Lucky Cement" />));
    expect(texts(t.root)).toEqual(['LC']);
  });
});

/* ─────────── friendlyError ─────────── */

describe('friendlyError', () => {
  // friendlyError logs the raw error in dev — keep the test output clean.
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    (console.log as unknown as jest.Mock).mockRestore();
  });

  const axiosErr = (extra: object) =>
    Object.assign(new Error('Request failed with status code 503'), { isAxiosError: true }, extra);

  it('logs the raw error only in dev builds', () => {
    const log = console.log as unknown as jest.Mock;
    const devFlag = (global as { __DEV__?: boolean }).__DEV__;
    try {
      (global as { __DEV__?: boolean }).__DEV__ = false;
      friendlyError(new Error('raw detail'));
      expect(log).not.toHaveBeenCalled();
      (global as { __DEV__?: boolean }).__DEV__ = true;
      friendlyError(new Error('raw detail'));
      expect(log).toHaveBeenCalled();
    } finally {
      (global as { __DEV__?: boolean }).__DEV__ = devFlag;
    }
  });

  it.each([
    [axiosErr({ code: 'ERR_NETWORK', message: 'Network Error', request: {} }), 'offline'],
    [axiosErr({ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }), 'timeout'],
    [axiosErr({ response: { status: 401 } }), 'auth'],
    [axiosErr({ response: { status: 403 } }), 'auth'],
    [axiosErr({ response: { status: 503 } }), 'server'],
    [axiosErr({ response: { status: 404 } }), 'unknown'],
    [new Error('boom'), 'unknown'],
    ['a string', 'unknown'],
    [null, 'unknown'],
  ])('%#: → %p', (err, kind) => {
    const r = friendlyError(err);
    expect(r.kind).toBe(kind);
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.message.length).toBeGreaterThan(0);
    const copy = `${r.title} ${r.message}`;
    expect(copy).not.toMatch(/\d{3}|status code|Network Error|timeout of|ECONN|ERR_|boom/);
  });
});
