/**
 * SLD "3D" = the web portal's OWN compiled 3D twin, in a WebView, fed by RN.
 *
 * The page is the generated `twinHtml.generated.js` (the web's unchanged
 * chunks + `scripts/web-twin/bridge.js`), loaded from an inline string —
 * the path the app already ships for ECharts — and required on first use,
 * never at module scope, so nothing on the cold-start path parses it. Its
 * `<body>` class is filled with the theme the WebView is created in
 * ({@link twinPageHtml}), so the page's first paint is already in the
 * app's theme; later flips are `theme` messages (no reload).
 *
 * Talk (protocol.ts): the page posts `ready` once loaded; the host then
 * sends `init` (raw `sldV2`, `live.data`, theme, site name, host,
 * visibility) as soon as the diagram is loaded and `/data/all` has
 * answered (with no live data the twin shows every reading "—", like the
 * web), and afterwards ONLY what changed — `sld`, `live`, `theme`,
 * `visible` — compared by reference against what was last sent (the
 * inputs keep their references across unrelated renders,
 * `useSldTwinInputs`). Grouped | Units (`mode`, shared with the Diagram)
 * is just another `sld` + `live` pair for the running page — never a
 * reload — sent in the order that keeps every step consistent (see
 * `sync`). `mounted` / `entered` are logged with `display()`
 * (first-frame evidence) and a skeleton covers the panel until `mounted`;
 * `warn` is logged; `error` is logged and reported once through `onFail`
 * (the host falls back to the Diagram for the session); `exit` (the twin's
 * WebGL fallback, "Show the diagram") calls `onExit`.
 *
 * WebView rules:
 *  - `autoManageStatusBarEnabled={false}` stays the LAST status-bar prop
 *    with no spread after it (`chartWebViewSettings.test.ts`, CLAUDE.md §19);
 *  - `androidLayerType` is left at its default — `'software'` disables WebGL;
 *  - nothing scrolls, bounces or zooms: the twin owns its gestures;
 *  - inline, `nestedScrollEnabled` (Android only — iOS ignores it): the
 *    native WebView then calls `requestDisallowInterceptTouchEvent(true)`
 *    on the UI thread from the very first touch, so SiteDetail's body
 *    ScrollView never takes over a drag that starts on the 3D (it
 *    intercepts after ~8 dp of travel, long before a JS hold could land —
 *    the page used to scroll the whole drag while the twin got a cancel).
 *    Pull-to-refresh ignores that request (ReactSwipeRefreshLayout), so
 *    the host's JS hold still switches it off;
 *  - the page may only load itself (`isTwinNavigationAllowed`), never
 *    opens windows;
 *  - painted natively with the page's own background (`webTwin` tokens),
 *    so it never flashes white while the page parses;
 *  - a killed web content process (iOS) / renderer (Android) remounts the
 *    WebView by key. Only a crash LOOP gives up (`onFail`): the
 *    {@link TWIN_MAX_CRASHES}th death in a row of pages that never came
 *    back — no `entered` — and died within {@link TWIN_CRASH_WINDOW_MS} of
 *    their start. A page that entered, or ran longer, was a routine kill
 *    (iOS reclaims a backgrounded WebView's process) and starts the count
 *    again.
 *
 * No per-frame work on the RN side: the WebView draws on its own.
 */

import React, { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewRenderProcessGoneEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { Skeleton } from 'src/components/common';
import type { SldViewMode } from 'src/hooks/useSldViewMode';
import { webTwin } from 'src/theme';
import { display } from 'src/utils/logger';
import {
  encodeTwinCommand,
  isTwinNavigationAllowed,
  parseTwinEvent,
  TWIN_BASE_URL,
  TWIN_ORIGIN_WHITELIST,
  TwinCommand,
  TwinHost,
  TwinJson,
  TwinTheme,
} from './protocol';
import { useSldTwinInputs } from './useSldTwinInputs';

export interface SldTwinViewProps {
  siteId: string;
  /** `inline` (the Summary card) or `fullscreen` (the sideways route). */
  host: TwinHost;
  /**
   * Grouped | Units — the Diagram's own choice (`useSldViewMode`). Grouped
   * on a site with nothing to group shows Units. A change re-feeds the
   * running page (no reload).
   */
  mode: SldViewMode;
  /**
   * Whether the twin can be seen right now (inline: in the body viewport
   * AND the screen focused; full screen: focused). The page pauses itself
   * while false.
   */
  visible: boolean;
  /** Size / position of the panel — the WebView fills it. */
  style?: StyleProp<ViewStyle>;
  /** The twin's own "Show the diagram" (WebGL unavailable). */
  onExit: () => void;
  /** The twin can't be shown (page error, load failure, repeated crashes). Called once. */
  onFail: (reason: string) => void;
  /**
   * Inline: a finger landed on the 3D (`true`) or the last one lifted
   * (`false`) — the host holds the page's scroll still in between.
   * Always paired: a page that goes away (unmount, reload, crash, failure)
   * mid-gesture reports `false`.
   */
  onGesture?: (active: boolean) => void;
}

/**
 * Deaths in a row (of pages that never `entered`, each within
 * {@link TWIN_CRASH_WINDOW_MS} of its start) before the twin gives up
 * (`onFail`): every earlier death remounts the WebView.
 */
export const TWIN_MAX_CRASHES = 2;

/**
 * A page that died later than this after its WebView (re)started had been
 * running: a routine kill, not part of a crash loop.
 */
export const TWIN_CRASH_WINDOW_MS = 30_000;

/** The generated page, as required (once per session). */
let twinPage: { html: string; placeholder: string } | null = null;
/** The page per theme — built at most once each, kept for the session. */
const themedPages: Partial<Record<TwinTheme, string>> = {};

/**
 * The page with its `<body>` class set to `theme` (the generated page's
 * `TWIN_THEME_PLACEHOLDER`), so it boots — and paints — in the app's
 * theme. Requires the generated module on first use; null (logged) when it
 * can't be loaded.
 */
const twinPageHtml = (theme: TwinTheme): string | null => {
  const cached = themedPages[theme];
  if (cached !== undefined) return cached;
  try {
    if (twinPage === null) {
      const { TWIN_HTML, TWIN_THEME_PLACEHOLDER } =
        require('./twinHtml.generated') as typeof import('./twinHtml.generated');
      if (typeof TWIN_HTML !== 'string' || TWIN_HTML.length === 0) {
        throw new Error('TWIN_HTML is empty');
      }
      if (typeof TWIN_THEME_PLACEHOLDER !== 'string' || !TWIN_HTML.includes(TWIN_THEME_PLACEHOLDER)) {
        throw new Error('TWIN_HTML has no theme placeholder');
      }
      twinPage = { html: TWIN_HTML, placeholder: TWIN_THEME_PLACEHOLDER };
    }
    // The placeholder's first (and only) occurrence is the <body> class (build.mjs).
    const html = twinPage.html.replace(twinPage.placeholder, theme);
    themedPages[theme] = html;
    return html;
  } catch (e) {
    display('sld twin: page unavailable', e, undefined, true);
    return null;
  }
};

/** Only the page's own load passes (`onShouldStartLoadWithRequest`). */
const allowTwinNavigation = (request: WebViewNavigation): boolean => {
  const allowed = isTwinNavigationAllowed(request.url);
  if (!allowed) display('sld twin: navigation refused', { url: request.url });
  return allowed;
};

/** The inputs as last rendered — read by the message handlers. */
interface TwinInputsNow {
  sld: TwinJson | null;
  live: TwinJson | null;
  /** Effective Grouped | Units of `sld` / `live`. */
  mode: SldViewMode;
  theme: TwinTheme;
  siteName: string;
  visible: boolean;
}

/** What the current page has been sent. */
interface TwinSent {
  sld: TwinJson;
  live: TwinJson;
  theme: TwinTheme;
  visible: boolean;
}

const SldTwinView: FC<SldTwinViewProps> = ({
  siteId,
  host,
  mode: requestedMode,
  visible,
  style,
  onExit,
  onFail,
  onGesture,
}) => {
  const { sld, live, mode, siteName, theme } = useSldTwinInputs(siteId, requestedMode);
  /**
   * The theme the current page boots in: fixed per WebView (a flip while
   * it is up is a `theme` message — no reload), re-read on a remount.
   */
  const [pageTheme, setPageTheme] = useState(theme);
  const html = useMemo(() => twinPageHtml(pageTheme), [pageTheme]);
  const source = useMemo(
    () => (html !== null ? { html, baseUrl: TWIN_BASE_URL } : null),
    [html],
  );
  /** Bumped to remount the WebView after its content process died. */
  const [instance, setInstance] = useState(0);
  const [failed, setFailed] = useState(false);
  /** The current page has posted `mounted` (the skeleton comes off). */
  const [pageUp, setPageUp] = useState(false);
  /** The panel's height, for the loading skeleton (0 until laid out). */
  const [panelHeight, setPanelHeight] = useState(0);

  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const sentRef = useRef<TwinSent | null>(null);
  const failedRef = useRef(false);
  const crashesRef = useRef(0);
  const startedAtRef = useRef(0);
  const inputsRef = useRef<TwinInputsNow>({ sld, live, mode, theme, siteName, visible });
  const callbacksRef = useRef({ onExit, onFail, onGesture });
  /** The page reported a turn / pinch that hasn't ended yet. */
  const gestureRef = useRef(false);

  useEffect(() => {
    callbacksRef.current = { onExit, onFail, onGesture };
  }, [onExit, onFail, onGesture]);

  /** Forwards a gesture start / end to the host — once per change. */
  const setGesture = useCallback((active: boolean) => {
    if (gestureRef.current === active) return;
    gestureRef.current = active;
    callbacksRef.current.onGesture?.(active);
  }, []);
  // A page that goes away mid-gesture never sends its end: release the host.
  useEffect(() => () => setGesture(false), [setGesture]);

  const fail = useCallback(
    (reason: string) => {
      if (failedRef.current) return;
      failedRef.current = true;
      readyRef.current = false;
      setGesture(false);
      setFailed(true);
      callbacksRef.current.onFail(reason);
    },
    [setGesture],
  );

  /** Hands one command to the page; false when it wasn't sent. */
  const send = useCallback(
    (cmd: TwinCommand): boolean => {
      const web = webRef.current;
      if (failedRef.current || web === null) return false;
      const code = encodeTwinCommand(cmd);
      if (code === null) {
        display('sld twin: command not serialisable', { type: cmd.type }, undefined, true);
        fail(`encode: ${cmd.type}`);
        return false;
      }
      web.injectJavaScript(code);
      return true;
    },
    [fail],
  );

  /** Brings the page up to date: `init` first, then only what changed. */
  const sync = useCallback(() => {
    if (!readyRef.current || failedRef.current) return;
    const now = inputsRef.current;
    const sent = sentRef.current;
    if (sent === null) {
      // The page never sees a half-loaded site: the diagram, and
      // `/data/all`'s answer (EMPTY_LIVE when it had no live data).
      if (now.sld === null || now.live === null) return;
      const init: TwinCommand = {
        type: 'init',
        sld: now.sld,
        live: now.live,
        theme: now.theme,
        siteName: now.siteName,
        host,
        visible: now.visible,
      };
      if (send(init)) {
        sentRef.current = { sld: now.sld, live: now.live, theme: now.theme, visible: now.visible };
      }
      return;
    }
    // A null input (a query not loaded / evicted) never replaces what the
    // page shows.
    const sendSld = () => {
      if (now.sld !== null && now.sld !== sent.sld && send({ type: 'sld', sld: now.sld })) {
        sent.sld = now.sld;
      }
    };
    const sendLive = () => {
      if (now.live !== null && now.live !== sent.live && send({ type: 'live', live: now.live })) {
        sent.live = now.live;
      }
    };
    // A Grouped | Units switch changes both. Grouped's live data is Units'
    // plus the groups' own readings, so the page must never hold a diagram
    // without the data it reads: into Grouped the data goes first, back to
    // Units the diagram does (the page renders after each message).
    if (now.mode === 'grouped') {
      sendLive();
      sendSld();
    } else {
      sendSld();
      sendLive();
    }
    if (now.theme !== sent.theme && send({ type: 'theme', theme: now.theme })) {
      sent.theme = now.theme;
    }
    if (now.visible !== sent.visible && send({ type: 'visible', visible: now.visible })) {
      sent.visible = now.visible;
    }
  }, [host, send]);

  // A new WebView (first mount, a remount, another site / host) starts
  // with a page that has been sent nothing. Declared before the input
  // effect so a key change resets first.
  useEffect(() => {
    startedAtRef.current = Date.now();
    readyRef.current = false;
    sentRef.current = null;
  }, [instance, siteId, host]);

  useEffect(() => {
    inputsRef.current = { sld, live, mode, theme, siteName, visible };
    sync();
  }, [sld, live, mode, theme, siteName, visible, sync]);

  useEffect(() => {
    if (html === null) fail('page: the twin page could not be loaded');
  }, [html, fail]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (failedRef.current) return;
      const msg = parseTwinEvent(event.nativeEvent.data);
      if (msg === null) return;
      const sinceViewMs = Date.now() - startedAtRef.current;
      switch (msg.type) {
        case 'ready':
          display('sld twin ready', { host, build: msg.build, react: msg.react, sinceViewMs });
          // A (re)loaded page holds nothing yet: everything goes again —
          // and no gesture of the page before it is still down.
          readyRef.current = true;
          sentRef.current = null;
          setGesture(false);
          setPageUp(false);
          sync();
          return;
        case 'mounted':
          display('sld twin mounted', { host, pageMs: msg.ms, sinceViewMs });
          setPageUp(true);
          return;
        case 'entered':
          display('sld twin entered', { host, pageMs: msg.ms, sinceViewMs });
          // The page came back: an earlier death was not a crash loop.
          crashesRef.current = 0;
          return;
        case 'warn':
          display('sld twin warning', { host, where: msg.where, message: msg.message });
          return;
        case 'error':
          display('sld twin error', { host, where: msg.where, message: msg.message }, undefined, true);
          fail(`${msg.where}: ${msg.message}`);
          return;
        case 'exit':
          callbacksRef.current.onExit();
          return;
        case 'gesture':
          setGesture(msg.active);
          return;
      }
    },
    [fail, host, setGesture, sync],
  );

  /** The web content process died: remount by key, or give up on a crash loop. */
  const restart = useCallback(
    (why: string) => {
      if (failedRef.current) return;
      const ranMs = Date.now() - startedAtRef.current;
      // A page that ran past the window was killed, not crash-looping.
      if (ranMs >= TWIN_CRASH_WINDOW_MS) crashesRef.current = 0;
      crashesRef.current += 1;
      readyRef.current = false;
      sentRef.current = null;
      setGesture(false);
      display(
        'sld twin: web content process gone',
        { host, why, ranMs, crashes: crashesRef.current },
        undefined,
        true,
      );
      if (crashesRef.current >= TWIN_MAX_CRASHES) {
        fail(`crash: ${why}`);
        return;
      }
      // The new page boots in the theme of now, behind the skeleton.
      setPageTheme(inputsRef.current.theme);
      setPageUp(false);
      setInstance(n => n + 1);
    },
    [fail, host, setGesture],
  );
  const onContentProcessDidTerminate = useCallback(
    () => restart('web content process terminated'),
    [restart],
  );
  const onRenderProcessGone = useCallback(
    (event: WebViewRenderProcessGoneEvent) =>
      restart(event.nativeEvent.didCrash ? 'renderer crashed' : 'renderer killed'),
    [restart],
  );
  const onError = useCallback(
    (event: WebViewErrorEvent) => {
      const { code, description } = event.nativeEvent;
      display('sld twin: page load failed', { host, code, description }, undefined, true);
      fail(`load: ${description || code}`);
    },
    [fail, host],
  );

  const bgStyle = useMemo(
    () => ({ backgroundColor: theme === 'dark' ? webTwin.bgDark : webTwin.bgLight }),
    [theme],
  );
  const rootStyle = useMemo(() => [styles.root, bgStyle, style], [bgStyle, style]);
  const webStyle = useMemo(() => [styles.web, bgStyle], [bgStyle]);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const h = Math.round(event.nativeEvent.layout.height);
    setPanelHeight(prev => (prev === h ? prev : h));
  }, []);

  const showWeb = source !== null && !failed;
  return (
    <View style={rootStyle} onLayout={onLayout}>
      {showWeb ? (
        <WebView
          key={`${siteId}:${host}:${instance}`}
          ref={webRef}
          style={webStyle}
          source={source}
          originWhitelist={TWIN_ORIGIN_WHITELIST}
          onShouldStartLoadWithRequest={allowTwinNavigation}
          setSupportMultipleWindows={false}
          onMessage={onMessage}
          onError={onError}
          onContentProcessDidTerminate={onContentProcessDidTerminate}
          onRenderProcessGone={onRenderProcessGone}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setBuiltInZoomControls={false}
          nestedScrollEnabled={host === 'inline'}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          webviewDebuggingEnabled={__DEV__}
          autoManageStatusBarEnabled={false}
        />
      ) : null}
      {/* Until the twin's React root is up (page parse, `init`, first
          commit) the panel shimmers like every loading card — the Summary
          placeholder's skeleton carries straight on. Touch-through. */}
      {showWeb && !pageUp && panelHeight > 0 ? (
        <View
          style={styles.loading}
          pointerEvents="none"
          accessible
          accessibilityLabel="Loading the 3D view">
          <Skeleton width="100%" height={panelHeight} radius={0} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  web: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default memo(SldTwinView);
