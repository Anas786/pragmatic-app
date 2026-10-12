/**
 * SiteDetail's body-scroll gate (pullToRefreshGate.ts): a gesture owner (the
 * inline 3D twin while a finger is on it) holds the body scroll AND
 * pull-to-refresh still, and always lets both go; each hook call is one
 * independent hold (the twin takes two: the page's claim, RN's touches).
 */
import { afterEach, describe, expect, it } from '@jest/globals';
import React, { FC, useEffect } from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import {
  BodyScrollGateContext,
  PullToRefreshGateContext,
  useBodyScrollHold,
  usePullToRefreshGate,
} from '../src/components/screens/Authenticated/SiteDetail/pullToRefreshGate';

let hold: ((active: boolean) => void) | null = null;
let second: ((active: boolean) => void) | null = null;
let state: { scroll: boolean; pull: boolean } = { scroll: false, pull: false };

/** An owner with two sources (the inline 3D: the page's claim + RN's touches). */
const Owner: FC = () => {
  const h = useBodyScrollHold();
  const h2 = useBodyScrollHold();
  useEffect(() => {
    hold = h;
    second = h2;
  }, [h, h2]);
  return null;
};

const Screen: FC<{ withOwner: boolean }> = ({ withOwner }) => {
  const scroll = usePullToRefreshGate();
  const pull = usePullToRefreshGate();
  state = { scroll: scroll.blocked, pull: pull.blocked };
  return (
    <PullToRefreshGateContext.Provider value={pull.acquire}>
      <BodyScrollGateContext.Provider value={scroll.acquire}>
        {withOwner ? <Owner /> : null}
      </BodyScrollGateContext.Provider>
    </PullToRefreshGateContext.Provider>
  );
};

let tree: ReactTestRenderer | undefined;
afterEach(() => {
  if (tree) act(() => tree?.unmount());
  tree = undefined;
  hold = null;
  second = null;
});

describe('useBodyScrollHold', () => {
  it('holds the body scroll and pull-to-refresh while active, releases both after', () => {
    act(() => {
      tree = renderer.create(<Screen withOwner />);
    });
    expect(state).toEqual({ scroll: false, pull: false });
    act(() => hold?.(true));
    expect(state).toEqual({ scroll: true, pull: true });
    act(() => hold?.(true)); // idempotent: one hold, not two
    act(() => hold?.(false));
    expect(state).toEqual({ scroll: false, pull: false });
    act(() => hold?.(false));
    expect(state).toEqual({ scroll: false, pull: false });
  });

  it('two holds of one owner are independent: neither releases the other', () => {
    act(() => {
      tree = renderer.create(<Screen withOwner />);
    });
    act(() => hold?.(true));
    act(() => second?.(true));
    act(() => hold?.(false));
    expect(state).toEqual({ scroll: true, pull: true });
    act(() => second?.(false));
    expect(state).toEqual({ scroll: false, pull: false });
    act(() => second?.(true));
    act(() => hold?.(false)); // the other's release is a no-op
    expect(state).toEqual({ scroll: true, pull: true });
    act(() => second?.(false));
    expect(state).toEqual({ scroll: false, pull: false });
  });

  it('an owner unmounted mid-gesture releases its hold', () => {
    act(() => {
      tree = renderer.create(<Screen withOwner />);
    });
    act(() => hold?.(true));
    act(() => second?.(true));
    expect(state).toEqual({ scroll: true, pull: true });
    act(() => tree?.update(<Screen withOwner={false} />));
    expect(state).toEqual({ scroll: false, pull: false });
  });

  it('is a no-op outside a provider (the full-screen route, tests)', () => {
    act(() => {
      tree = renderer.create(<Owner />);
    });
    expect(() => act(() => hold?.(true))).not.toThrow();
    expect(() => act(() => hold?.(false))).not.toThrow();
  });
});
