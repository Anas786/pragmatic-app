/**
 * SLD web twin — the page bridge's gesture ownership (scripts/web-twin/bridge.js,
 * section "gesture ownership"), run as shipped against fake pointer events.
 *
 * Every gesture on the inline 3D belongs to the twin (app.css:
 * `touch-action: none`). The app's native scroll view sits under the
 * WebView and followed any drag on it — user reports 2026-10-10: "when
 * moving 3d sld it scrolls down the screen too", then "scroll up and down
 * still scroll screen". So the moment a finger lands on the 3D canvas the
 * page claims the gesture (`{type:'gesture', active:true}`) — before any
 * movement, so the app holds its scroll before the scroll view could start —
 * and releases it when the last finger lifts.
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

type Listener = (e: unknown) => void;
interface Section {
  setInline: (inline: boolean) => void;
}

const load = () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/bridge.js'), 'utf8');
  const start = src.indexOf('// ---- gesture ownership');
  const end = src.indexOf('// ---- live values');
  if (start < 0 || end < start) throw new Error('bridge.js: the "gesture ownership" section markers moved');
  const listeners: Record<string, Listener[]> = {};
  const fakeWindow = {
    addEventListener: (type: string, fn: Listener) => (listeners[type] ||= []).push(fn),
  };
  const docListeners: Record<string, Listener[]> = {};
  const fakeDocument = {
    hidden: false,
    addEventListener: (type: string, fn: Listener) => (docListeners[type] ||= []).push(fn),
  };
  const posted: { type: string; active: boolean }[] = [];
  const post = (msg: { type: string; active: boolean }) => posted.push(msg);
  const guard = (_where: string, fn: Listener) => fn;
  // eslint-disable-next-line no-new-func
  const section = new Function(
    'window',
    'document',
    'post',
    'guard',
    `${src.slice(start, end)}; return { setInline: function (v) { inlineHost = v; resetGesture(); } };`,
  )(fakeWindow, fakeDocument, post, guard) as Section;
  const fire = (type: string, e: Record<string, unknown>) =>
    (listeners[type] || []).forEach(fn => fn(e));
  const touch = (id: number, x: number, y: number, tagName = 'CANVAS') => ({
    pointerId: id,
    pointerType: 'touch',
    clientX: x,
    clientY: y,
    target: { tagName },
  });
  return { section, fire, touch, posted, listeners, docListeners, fakeDocument };
};

let t: ReturnType<typeof load>;
beforeEach(() => {
  t = load();
});

const ON = { type: 'gesture', active: true };
const OFF = { type: 'gesture', active: false };

describe('inline: a finger on the 3D owns the gesture — the page never scrolls under it', () => {
  it('claims at touch-down, before any movement (the scroll view needs ~10 pt of travel)', () => {
    t.fire('pointerdown', t.touch(1, 100, 100));
    expect(t.posted).toEqual([ON]);
  });

  it('a vertical drag is the twin’s too (it tilts the model) — released when the finger lifts', () => {
    t.fire('pointerdown', t.touch(1, 100, 100));
    t.fire('pointermove', t.touch(1, 102, 180));
    t.fire('pointerup', t.touch(1, 102, 180));
    expect(t.posted).toEqual([ON, OFF]);
  });

  it('a pinch stays claimed until BOTH fingers lift (one claim, one release)', () => {
    t.fire('pointerdown', t.touch(1, 100, 100));
    t.fire('pointerdown', t.touch(2, 200, 200));
    t.fire('pointerup', t.touch(1, 100, 100));
    expect(t.posted).toEqual([ON]);
    t.fire('pointercancel', t.touch(2, 200, 200));
    expect(t.posted).toEqual([ON, OFF]);
  });

  it('touches off the canvas (a tool, the mix / legend, the readings card) and mouse pointers never count', () => {
    t.fire('pointerdown', t.touch(1, 100, 100, 'BUTTON'));
    t.fire('pointerdown', { ...t.touch(2, 100, 100), pointerType: 'mouse' });
    t.fire('pointerup', t.touch(1, 100, 100, 'BUTTON'));
    expect(t.posted).toEqual([]);
  });

  it('a lift of a finger it never saw changes nothing', () => {
    t.fire('pointerdown', t.touch(1, 100, 100));
    t.fire('pointerup', t.touch(9, 100, 100));
    expect(t.posted).toEqual([ON]);
  });

  it('full screen never claims (there is no page scroll there)', () => {
    t.section.setInline(false);
    t.fire('pointerdown', t.touch(1, 100, 100));
    t.fire('pointerdown', t.touch(2, 200, 200));
    expect(t.posted).toEqual([]);
  });

  it('a page that loses focus or is hidden mid-gesture releases it', () => {
    t.fire('pointerdown', t.touch(1, 100, 100));
    (t.listeners.blur || []).forEach(fn => fn({}));
    expect(t.posted).toEqual([ON, OFF]);
    t.fire('pointerdown', t.touch(3, 100, 100));
    t.fakeDocument.hidden = true;
    (t.docListeners.visibilitychange || []).forEach(fn => fn({}));
    expect(t.posted).toEqual([ON, OFF, ON, OFF]);
  });
});

describe('app.css: the inline canvas sends every gesture to the twin', () => {
  it('touch-action none inline as in full screen (no more pan-y page scroll on the 3D)', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../scripts/web-twin/app.css'), 'utf8');
    expect(css).toMatch(/html\.pes-host-inline \.sld-page \.tw-canvas[^{]*\{\s*touch-action: none !important;/);
    expect(css).toMatch(/html\.pes-host-fullscreen \.sld-page \.tw-canvas/);
  });
});
