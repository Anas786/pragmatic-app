/**
 * SiteDetail body viewport (`SiteDetail/bodyViewport.ts`) — the scroll
 * offset + height published by the body ScrollView, and the visibility
 * gate the inline SLD hands to its Skia layer: the flow clock only ticks
 * while the panel overlaps the visible body, and the gate is a shared value
 * written only when the answer flips (never a React re-render).
 */
import { describe, expect, it, jest } from '@jest/globals';
import React, { FC, useEffect } from 'react';
import renderer, { act } from 'react-test-renderer';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import {
  BodyViewportContext,
  createBodyViewportStore,
  isInBodyViewport,
  useBodyViewportVisibility,
} from '../src/components/screens/Authenticated/SiteDetail/bodyViewport';

describe('isInBodyViewport', () => {
  const vp = { scrollY: 1000, height: 700 }; // visible content: 1000…1700

  it('is true for any overlap and false once fully above or below', () => {
    expect(isInBodyViewport(1200, 400, vp)).toBe(true); // inside
    expect(isInBodyViewport(600, 401, vp)).toBe(true); // 1 pt peeks in at the top
    expect(isInBodyViewport(1699, 500, vp)).toBe(true); // 1 pt peeks in at the bottom
    expect(isInBodyViewport(600, 400, vp)).toBe(false); // ends exactly at the top edge
    expect(isInBodyViewport(1700, 500, vp)).toBe(false); // starts exactly at the bottom edge
    expect(isInBodyViewport(0, 300, vp)).toBe(false);
    expect(isInBodyViewport(900, 2000, vp)).toBe(true); // taller than the viewport
  });

  it('counts everything as visible before the viewport is laid out', () => {
    expect(isInBodyViewport(5000, 100, { scrollY: 0, height: 0 })).toBe(true);
  });
});

describe('createBodyViewportStore', () => {
  it('publishes scroll / height changes and stays quiet when nothing changed', () => {
    const pub = createBodyViewportStore(() => null);
    const listener = jest.fn();
    const unsubscribe = pub.store.subscribe(listener);
    pub.setHeight(700);
    pub.setScrollY(120);
    pub.setScrollY(120); // same offset (scroll-end after the last onScroll)
    expect(listener).toHaveBeenCalledTimes(2);
    expect(pub.store.get()).toEqual({ scrollY: 120, height: 700 });
    pub.notify(); // content size changed: always re-check
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    pub.setScrollY(500);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

/* ─────────── the consumer hook (the inline SLD's gate) ─────────── */

const CONTENT = { tag: 'scroll-content' } as never;

/** A raw host element: RN's jest `View` is a class mock whose ref is the
 *  mock instance, so `createNodeMock` (our measureLayout) would never be
 *  reached through it. */
const HostView = 'View' as unknown as typeof View;

let gate: SharedValue<boolean> | null = null;
let onLayout: (() => void) | null = null;
const Probe: FC = () => {
  const v = useBodyViewportVisibility();
  useEffect(() => {
    gate = v.visible;
    onLayout = v.onLayout;
  });
  return <HostView ref={v.ref} onLayout={v.onLayout} />;
};

/** The panel lives at content y 1500, 600 pt tall. */
const mount = (pub: ReturnType<typeof createBodyViewportStore> | null) => {
  const measureLayout = jest.fn(
    (relativeTo: unknown, onSuccess: (x: number, y: number, w: number, h: number) => void) => {
      expect(relativeTo).toBe(CONTENT);
      onSuccess(0, 1500, 360, 600);
    },
  );
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(
      pub ? (
        <BodyViewportContext.Provider value={pub.store}>
          <Probe />
        </BodyViewportContext.Provider>
      ) : (
        <Probe />
      ),
      { createNodeMock: () => ({ measureLayout }) },
    );
  });
  return { tree: tree as renderer.ReactTestRenderer, measureLayout };
};

describe('useBodyViewportVisibility', () => {
  it('flips the gate as the panel scrolls out of and back into view', () => {
    const pub = createBodyViewportStore(() => CONTENT);
    pub.setHeight(700);
    const { tree } = mount(pub);
    act(() => onLayout?.()); // first layout: content 0…700, panel at 1500 → hidden
    expect(gate?.value).toBe(false);

    act(() => pub.setScrollY(900)); // 900…1600 overlaps 1500…2100
    expect(gate?.value).toBe(true);

    act(() => pub.setScrollY(2200)); // scrolled past it
    expect(gate?.value).toBe(false);
    act(() => tree.unmount());
  });

  it('writes the shared value only when the answer changes', () => {
    const pub = createBodyViewportStore(() => CONTENT);
    pub.setHeight(700);
    const { tree } = mount(pub);
    act(() => pub.setScrollY(1000));
    const g = gate as SharedValue<boolean>;
    let writes = 0;
    let current = g.value;
    Object.defineProperty(g, 'value', {
      get: () => current,
      set: (v: boolean) => {
        writes++;
        current = v;
      },
      configurable: true,
    });
    act(() => {
      for (let y = 1010; y < 1300; y += 10) pub.setScrollY(y); // stays in view
    });
    expect(writes).toBe(0);
    act(() => pub.setScrollY(3000));
    expect(writes).toBe(1);
    act(() => tree.unmount());
  });

  it('stops listening once unmounted', () => {
    const pub = createBodyViewportStore(() => CONTENT);
    pub.setHeight(700);
    const { tree, measureLayout } = mount(pub);
    act(() => tree.unmount());
    const calls = measureLayout.mock.calls.length;
    pub.setScrollY(1800);
    expect(measureLayout.mock.calls.length).toBe(calls);
  });

  it('outside SiteDetail (no provider, e.g. full screen) it stays visible', () => {
    const { tree, measureLayout } = mount(null);
    act(() => onLayout?.());
    expect(gate?.value).toBe(true);
    expect(measureLayout).not.toHaveBeenCalled();
    act(() => tree.unmount());
  });
});
