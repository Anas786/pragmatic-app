/**
 * Message contract between the app and the web twin page (SLD "3D").
 *
 * The page (`twinHtml.generated.js`, built by `scripts/web-twin/`) runs the
 * web portal's OWN compiled 3D twin inside a WebView; its bridge
 * (`scripts/web-twin/bridge.js`) is the other half of this file — change
 * the two together.
 *
 *  - RN → page ({@link TwinCommand}): `injectJavaScript` of
 *    `window.__pesTwinReceive(<json>);true;` ({@link encodeTwinCommand}).
 *    The same call on iOS and Android — the `postMessage` event targets
 *    differ per platform (`window` vs `document`).
 *  - page → RN ({@link TwinEvent}): `window.ReactNativeWebView.postMessage(
 *    JSON)`, read by {@link parseTwinEvent}, which never throws: anything
 *    unknown or garbled is ignored (`null`).
 *
 * Pure (no RN imports) so it is unit-testable in Node.
 */

/** The page's colour scheme (`body.dark` / `body.light` + `isLight`). */
export type TwinTheme = 'dark' | 'light';

/**
 * Where the twin is shown: the Summary card (`inline` — vertical swipes
 * scroll the page) or the sideways full screen (`fullscreen` — every
 * gesture goes to the twin).
 */
export type TwinHost = 'inline' | 'fullscreen';

/**
 * A JSON object from the API, passed to the page untouched: the RAW
 * `siteComponents.sldV2` (the twin parses it itself, `fromSldV2`) or the
 * `/protected/data/all` → `live.data` envelope
 * (`{ live: { pN: { value, update_at } }, update_at }`). In Grouped mode
 * both are their grouped forms (`twinGrouped.ts`): group nodes reading
 * synthetic params, the envelope with those params added.
 */
export type TwinJson = Readonly<Record<string, unknown>>;

/** RN → page. */
export type TwinCommand =
  /**
   * The first message after `ready` — mounts the twin. Sent only once both
   * the diagram and the live data are loaded (the page never sees a
   * half-loaded site), and again after a `ready` from a reloaded page.
   * `siteName` and `host` travel only here: they are fixed for a page's
   * life (another site or host remounts the WebView).
   */
  | {
      type: 'init';
      sld: TwinJson;
      live: TwinJson;
      theme: TwinTheme;
      siteName: string;
      host: TwinHost;
      visible: boolean;
    }
  /** A `/data/all` refetch (or a Grouped | Units switch) changed the live envelope. */
  | { type: 'live'; live: TwinJson }
  /** A config refetch (or a Grouped | Units switch) changed the `sldV2` object. */
  | { type: 'sld'; sld: TwinJson }
  | { type: 'theme'; theme: TwinTheme }
  /**
   * Drives the page's `document.hidden` / `visibilityState` shim and its
   * `visibilitychange` event — the twin pauses itself on it (its own
   * IntersectionObserver cannot see RN scrolling or a screen on top).
   */
  | { type: 'visible'; visible: boolean };

/** page → RN. */
export type TwinEvent =
  /** Page loaded, waiting for `init`. Strings as the page sent them, else null. */
  | { type: 'ready'; build: string | null; react: string | null }
  /** React root committed, `ms` after the page started (null when not sent). */
  | { type: 'mounted'; ms: number | null }
  /** Intro done (the tags are shown), `ms` after the page started. */
  | { type: 'entered'; ms: number | null }
  /**
   * The twin can't run: the page failed to boot, React gave up on the root
   * (`onUncaughtError`), or an uncaught error before the twin was up / once
   * nothing is rendered. The host falls back to the Diagram.
   */
  | { type: 'error'; where: string; message: string }
  /**
   * Something the twin keeps running through — an uncaught error while it is
   * up (the web keeps running on it too), a ResizeObserver loop notice, a
   * recovered React error, a malformed app message. Logged, never fatal.
   */
  | { type: 'warn'; where: string; message: string }
  /** The twin's WebGL fallback button ("Show the diagram"). */
  | { type: 'exit' }
  /**
   * Inline only: a finger landed on the 3D canvas (`active: true`, at
   * touch-down, before any movement) — the host holds the page's scroll
   * still, every drag there moves the model — and the last finger lifted
   * (`active: false`).
   */
  | { type: 'gesture'; active: boolean };

/** The page-side function every {@link TwinCommand} is handed to. */
export const TWIN_RECEIVE_FN = '__pesTwinReceive';

/** Longest page message read — the contract's messages are tiny. */
export const TWIN_EVENT_MAX_CHARS = 64 * 1024;

/** Longest `where` / `message` kept from an `error` / `warn` event (they are logged). */
export const TWIN_ERROR_TEXT_MAX = 500;

export const twinTheme = (isDark: boolean): TwinTheme => (isDark ? 'dark' : 'light');

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const optionalString = (v: unknown): string | null =>
  typeof v === 'string' ? v : null;

const optionalMs = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

const errorText = (v: unknown, fallback: string): string => {
  const text = typeof v === 'string' && v.trim() !== '' ? v : fallback;
  return text.length > TWIN_ERROR_TEXT_MAX ? `${text.slice(0, TWIN_ERROR_TEXT_MAX)}…` : text;
};

/**
 * A page message (`nativeEvent.data`) as a typed {@link TwinEvent}, or
 * `null` for anything that isn't one — non-strings, oversized or invalid
 * JSON, unknown types. Never throws.
 */
export const parseTwinEvent = (data: unknown): TwinEvent | null => {
  if (typeof data !== 'string' || data.length === 0 || data.length > TWIN_EVENT_MAX_CHARS) {
    return null;
  }
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return null;
  }
  if (!isRecord(msg)) return null;
  switch (msg.type) {
    case 'ready':
      return { type: 'ready', build: optionalString(msg.build), react: optionalString(msg.react) };
    case 'mounted':
    case 'entered':
      return { type: msg.type, ms: optionalMs(msg.ms) };
    case 'error':
    case 'warn':
      return {
        type: msg.type,
        where: errorText(msg.where, 'page'),
        message: errorText(msg.message, 'unknown error'),
      };
    case 'exit':
      return { type: 'exit' };
    case 'gesture':
      return typeof msg.active === 'boolean' ? { type: 'gesture', active: msg.active } : null;
    default:
      return null;
  }
};

/**
 * The `injectJavaScript` source that hands `cmd` to the page, or `null`
 * when it can't be serialised (never for API JSON; a cycle or a BigInt
 * would be a bug). The JSON is embedded as a JS literal, so the two
 * characters that a JSON string may hold raw but a script must not are
 * escaped — U+2028 / U+2029 (line terminators in pre-ES2019 engines) —
 * and every `</` becomes `<\/` (same string value; can never close a
 * script element). The trailing `true;` keeps iOS from trying to return
 * the call's result.
 */
export const encodeTwinCommand = (cmd: TwinCommand): string | null => {
  let json: string | undefined;
  try {
    json = JSON.stringify(cmd);
  } catch {
    return null;
  }
  if (typeof json !== 'string') return null;
  const safe = json
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/<\//g, '<\\/');
  return `window.${TWIN_RECEIVE_FN}(${safe});true;`;
};

/**
 * The base URL the inline page is loaded with: `about:blank` on both
 * platforms. NOT `''` — iOS converts an empty `baseUrl` (RCTConvert NSURL)
 * into a `file://` URL of the app bundle's resource folder, which would
 * give the page a file origin and fail the whitelist below.
 */
export const TWIN_BASE_URL = 'about:blank';

/**
 * `originWhitelist` of the twin's WebView. react-native-webview checks it
 * BEFORE `onShouldStartLoadWithRequest`; note that a URL failing it is
 * handed to `Linking.openURL` — the twin never navigates (no links, no
 * `location` writes), so in practice nothing reaches either gate.
 */
export const TWIN_ORIGIN_WHITELIST: string[] = ['about:*'];

/**
 * The only navigations the twin's WebView may perform: loading its own
 * inline page ({@link TWIN_BASE_URL}; `about:srcdoc` is an inline frame of
 * it). Everything else — http(s), file, data, custom schemes, other
 * `about:` pages — is refused: the page is bundled code that must never
 * leave the app or fetch anything.
 */
export const isTwinNavigationAllowed = (url: unknown): boolean =>
  url === TWIN_BASE_URL || url === 'about:srcdoc';
