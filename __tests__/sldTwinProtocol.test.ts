/**
 * SLD web twin — the RN ⇄ page message contract (SldTwin/protocol.ts).
 *
 *  - page → RN: `parseTwinEvent` types every known message and ignores
 *    everything else (non-strings, bad JSON, unknown types, oversized)
 *    without ever throwing;
 *  - RN → page: `encodeTwinCommand` produces `window.__pesTwinReceive(
 *    <json>);true;` that, RUN as a script, hands the page exactly the
 *    command — with U+2028 / U+2029 and `</` escaped;
 *  - navigation: only the page's own load passes, through
 *    react-native-webview's REAL whitelist gate too.
 */
import { describe, expect, it, jest } from '@jest/globals';
import {
  encodeTwinCommand,
  isTwinNavigationAllowed,
  parseTwinEvent,
  TWIN_BASE_URL,
  TWIN_ERROR_TEXT_MAX,
  TWIN_EVENT_MAX_CHARS,
  TWIN_ORIGIN_WHITELIST,
  TWIN_RECEIVE_FN,
  TwinCommand,
  twinTheme,
} from '../src/components/screens/Authenticated/SiteDetail/components/SldTwin/protocol';

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/** Runs an encoded command as the page would and returns what it received. */
const deliver = (code: string): unknown[] => {
  const received: unknown[] = [];
  const page = { [TWIN_RECEIVE_FN]: (msg: unknown) => received.push(msg) };
  // eslint-disable-next-line no-new-func
  const result = new Function('window', `return eval(${JSON.stringify(code)});`)(page);
  expect(result).toBe(true); // the trailing `true;` is the script's value
  return received;
};

describe('parseTwinEvent — page → RN', () => {
  const parse = (msg: unknown) => parseTwinEvent(JSON.stringify(msg));

  it('types every message of the contract', () => {
    expect(parse({ type: 'ready', build: 'V8bQ6PlHPUKSpJxgVf8cc', react: '19.3.0' })).toEqual({
      type: 'ready',
      build: 'V8bQ6PlHPUKSpJxgVf8cc',
      react: '19.3.0',
    });
    expect(parse({ type: 'mounted', ms: 133 })).toEqual({ type: 'mounted', ms: 133 });
    expect(parse({ type: 'entered', ms: 2410.5 })).toEqual({ type: 'entered', ms: 2410.5 });
    expect(parse({ type: 'error', where: 'onerror', message: 'boom' })).toEqual({
      type: 'error',
      where: 'onerror',
      message: 'boom',
    });
    expect(parse({ type: 'exit' })).toEqual({ type: 'exit' });
    expect(parse({ type: 'warn', where: 'window', message: 'ResizeObserver loop' })).toEqual({
      type: 'warn',
      where: 'window',
      message: 'ResizeObserver loop',
    });
    expect(parse({ type: 'gesture', active: true })).toEqual({ type: 'gesture', active: true });
    expect(parse({ type: 'gesture', active: false })).toEqual({ type: 'gesture', active: false });
    // `active` must be a boolean — anything else is not a contract message.
    expect(parse({ type: 'gesture' })).toBeNull();
    expect(parse({ type: 'gesture', active: 1 })).toBeNull();
  });

  it('keeps only well-formed optional fields', () => {
    expect(parse({ type: 'ready' })).toEqual({ type: 'ready', build: null, react: null });
    expect(parse({ type: 'ready', build: 7, react: { v: 19 } })).toEqual({
      type: 'ready',
      build: null,
      react: null,
    });
    expect(parse({ type: 'mounted' })).toEqual({ type: 'mounted', ms: null });
    expect(parse({ type: 'mounted', ms: -4 })).toEqual({ type: 'mounted', ms: null });
    expect(parse({ type: 'entered', ms: '120' })).toEqual({ type: 'entered', ms: null });
    // JSON has no NaN / Infinity: the page's NaN arrives as null.
    expect(parse({ type: 'entered', ms: Number.NaN })).toEqual({ type: 'entered', ms: null });
    expect(parse({ type: 'exit', extra: true })).toEqual({ type: 'exit' });
  });

  it('an error always has a where and a message, cut to a loggable length', () => {
    expect(parse({ type: 'error' })).toEqual({ type: 'error', where: 'page', message: 'unknown error' });
    expect(parse({ type: 'error', where: '  ', message: 42 })).toEqual({
      type: 'error',
      where: 'page',
      message: 'unknown error',
    });
    const long = 'x'.repeat(TWIN_ERROR_TEXT_MAX + 50);
    const ev = parse({ type: 'error', where: 'react', message: long });
    expect(ev).toEqual({ type: 'error', where: 'react', message: `${'x'.repeat(TWIN_ERROR_TEXT_MAX)}…` });
    // A warning is held to the same shape.
    expect(parse({ type: 'warn', message: long })).toEqual({
      type: 'warn',
      where: 'page',
      message: `${'x'.repeat(TWIN_ERROR_TEXT_MAX)}…`,
    });
  });

  it('ignores anything that is not a contract message — and never throws', () => {
    const garbage: unknown[] = [
      undefined,
      null,
      42,
      true,
      { type: 'ready' }, // an object, not the posted string
      '',
      'ready',
      '{"type":',
      'null',
      '"ready"',
      '[{"type":"ready"}]',
      '{"kind":"ready"}',
      '{"type":7}',
      '{"type":"viewChange","view":"diagram"}',
      '{"type":"READY"}',
      '{"type":"__proto__"}',
      `{"type":"error","message":"${'y'.repeat(TWIN_EVENT_MAX_CHARS)}"}`,
    ];
    garbage.forEach(g => {
      expect(() => parseTwinEvent(g)).not.toThrow();
      expect(parseTwinEvent(g)).toBeNull();
    });
  });
});

describe('encodeTwinCommand — RN → page', () => {
  const sld = {
    nodes: [
      {
        id: '1',
        type: 'custom',
        position: { x: 479.2, y: 498.18 },
        data: { heading: `LCL Plant${LS}${PS} </script><script>alert(1)</script>`, keys: [] },
      },
    ],
    edges: [],
  };
  const live = { live: { p30: { value: 218.1, update_at: 1759310000 } }, update_at: 1759310000 };

  it('hands the page exactly the command, as an object literal', () => {
    const cmds: TwinCommand[] = [
      { type: 'init', sld, live, theme: 'dark', siteName: 'Lucky Cement Nooriabad', host: 'inline', visible: true },
      { type: 'live', live },
      { type: 'sld', sld },
      { type: 'theme', theme: 'light' },
      { type: 'visible', visible: false },
    ];
    cmds.forEach(cmd => {
      const code = encodeTwinCommand(cmd) as string;
      expect(code.startsWith(`window.${TWIN_RECEIVE_FN}({`)).toBe(true);
      expect(code.endsWith(');true;')).toBe(true);
      expect(deliver(code)).toEqual([cmd]);
    });
  });

  it('escapes the line separators and every `</` (same string value on the page)', () => {
    const code = encodeTwinCommand({ type: 'sld', sld }) as string;
    expect(code.includes(LS)).toBe(false);
    expect(code.includes(PS)).toBe(false);
    expect(code.includes('</')).toBe(false);
    expect(code).toContain('\\u2028');
    expect(code).toContain('\\u2029');
    expect(code).toContain('<\\/script>');
    const [received] = deliver(code) as Array<{ sld: typeof sld }>;
    expect(received.sld.nodes[0].data.heading).toBe(sld.nodes[0].data.heading);
  });

  it('returns null for a value JSON cannot carry (never throws)', () => {
    const cyclic: Record<string, unknown> = { nodes: [] };
    cyclic.self = cyclic;
    expect(encodeTwinCommand({ type: 'sld', sld: cyclic })).toBeNull();
    expect(encodeTwinCommand({ type: 'live', live: { n: BigInt(1) } })).toBeNull();
  });
});

describe('navigation — the page may only load itself', () => {
  it('allows the inline page and its frames, refuses everything else', () => {
    expect(TWIN_BASE_URL).toBe('about:blank');
    expect(isTwinNavigationAllowed('about:blank')).toBe(true);
    expect(isTwinNavigationAllowed('about:srcdoc')).toBe(true);
    [
      'https://www.pragmaticengineeringsolutions.com/',
      'http://localhost:8081',
      'file:///private/var/containers/Bundle/Application/X/PES.app/',
      'data:text/html,<b>x</b>',
      ['javascript', 'alert(1)'].join(':'),
      'about:config',
      'about:blank.evil',
      'tel:123',
      '',
      undefined,
      null,
    ].forEach(url => expect(isTwinNavigationAllowed(url)).toBe(false));
  });

  it("passes react-native-webview's own whitelist gate for the page's load only", async () => {
    const { Linking } = jest.requireActual('react-native') as typeof import('react-native');
    const canOpen = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { createOnShouldStartLoadWithRequest } = jest.requireActual(
      'react-native-webview/lib/WebViewShared',
    ) as {
      createOnShouldStartLoadWithRequest: (
        load: (shouldStart: boolean, url: string, lock?: number) => void,
        whitelist: string[],
        cb: (e: { url: string }) => boolean,
      ) => (e: { nativeEvent: { url: string; lockIdentifier: number } }) => void;
    };
    const decisions: Array<[boolean, string]> = [];
    const gate = createOnShouldStartLoadWithRequest(
      (shouldStart, url) => decisions.push([shouldStart, url]),
      TWIN_ORIGIN_WHITELIST,
      e => isTwinNavigationAllowed(e.url),
    );
    ['about:blank', 'about:srcdoc', 'about:config', 'https://example.com/x', 'file:///etc/hosts'].forEach(
      (url, i) => gate({ nativeEvent: { url, lockIdentifier: i } }),
    );
    expect(decisions).toEqual([
      [true, 'about:blank'],
      [true, 'about:srcdoc'],
      [false, 'about:config'],
      [false, 'https://example.com/x'],
      [false, 'file:///etc/hosts'],
    ]);
    // The library's own behaviour for a whitelist miss (see
    // TWIN_ORIGIN_WHITELIST): the URL is offered to the OS, never loaded.
    await Promise.resolve();
    await Promise.resolve();
    expect(canOpen.mock.calls.map(c => c[0])).toEqual(['https://example.com/x', 'file:///etc/hosts']);
    canOpen.mockRestore();
    warn.mockRestore();
  });
});

describe('twinTheme', () => {
  it('maps the app theme onto the page classes', () => {
    expect(twinTheme(true)).toBe('dark');
    expect(twinTheme(false)).toBe('light');
  });
});
