/* eslint-env browser */
/*
 * PES web 3D twin — page-side bridge (inlined LAST into the generated page by
 * build.mjs, after the vendored chunks and the turbopack runtime).
 *
 * Mounts the web portal's OWN compiled 3D twin (the turbopack module
 * `config.modules.twin`, unchanged bytes) outside Next.js and talks to the
 * app. Everything the twin normally gets from the web app shell is replaced
 * here, and nothing else:
 *   - Next.js bootstrap  → never runs (the pre-runtime array in build.mjs
 *                          drops the runtime's entry push)
 *   - redux store        → a tiny store holding `site.unprocessedLiveParameters`
 *                          (the twin's only `useSelector`)
 *   - liveValues hook    → re-implemented below with the web hook's rules
 *                          (the web's lives in a 1,290-module 2D/api bundle)
 *   - theme              → `isLight` prop + `body.light` / `body.dark`; the
 *                          page is served with the app's theme already on
 *                          `<body>` (build.mjs placeholder, filled by the
 *                          app), so it never paints the other one first
 *   - host panel         → none: the twin is mounted BARE (no toolbar, no
 *                          "Diagram | 3D" switch, no "Streaming" tag — the app
 *                          draws those). The wrapper only carries the web
 *                          host's `.spf-panel` class for its colour tokens;
 *                          app.css removes the panel's frame.
 * One addition: the app's Grouped mode sends group nodes carrying their raw
 * members (`data.pesGroupMembers`); each gets its members' 3D model with the
 * web's own `lookOf` before the twin sees the diagram ("grouped looks").
 *
 * Protocol (the app half is SldTwin/protocol.ts — change them together):
 *   app → page  window.__pesTwinReceive(msg)   msg: object or JSON string
 *     {type:'init', sld, live, theme, siteName, host, visible}
 *     {type:'live', live} · {type:'sld', sld} · {type:'theme', theme}
 *     {type:'visible', visible}
 *   page → app  window.ReactNativeWebView.postMessage(JSON)
 *     {type:'ready', build, react} · {type:'mounted', ms} · {type:'entered', ms}
 *     {type:'error', where, message} · {type:'exit'}
 *     {type:'gesture', active} — inline: a finger landed on the 3D / the last
 *     one lifted (the app holds its page scroll still in between)
 *     {type:'warn', where, message} — logged by the app, never fatal: noise
 *     and errors the twin keeps running through, which must NOT take the 3D
 *     view down (the app falls back to the Diagram on any `error`).
 *   `ms` = performance.now() (ms since the page started).
 *
 * Rule: nothing thrown here may escape into the page — every entry point is
 * wrapped and reports `{type:'error'}` instead.
 */
(function () {
  'use strict';

  var config = window.__PES_TWIN_CONFIG__ || {};
  var MOD = config.modules || {};
  var BRIDGE_MODULE_ID = 990000001; // outside turbopack's id range
  var EVENT_LOG_MAX = 100;

  // ---- page → app ----------------------------------------------------------
  // Every message is also kept in `window.__pesTwinEvents` (last 100) for the
  // smoke test and for the Safari / Chrome WebView inspectors.
  var events = (window.__pesTwinEvents = []);
  function post(msg) {
    events.push(msg);
    if (events.length > EVENT_LOG_MAX) events.shift();
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    } catch (e) {
      // the app is gone (unmounting WebView): nothing to report to
    }
  }
  function errorText(e) {
    if (e == null) return 'unknown error';
    return String((e && e.stack) || (e && e.message) || e).slice(0, 2000);
  }
  function reportError(where, e) {
    post({ type: 'error', where: where, message: errorText(e) });
  }
  function reportWarn(where, e) {
    post({ type: 'warn', where: where, message: errorText(e) });
  }
  function guard(where, fn) {
    return function () {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        reportError(where, e);
        return undefined;
      }
    };
  }

  // Uncaught errors. Until the twin is up, one means a broken page (a chunk,
  // the runtime or the first render failed): fatal. Once it is up, the web
  // keeps running on the same error — a throw in a pointer handler, a
  // rejected promise; React reports render / effect errors through the
  // root's own `onUncaughtError` instead, below — so the page does too and
  // only warns, unless React has nothing rendered any more.
  // Chrome / Android WebView also report a ResizeObserver callback that
  // resized its own target as a window error; it is harmless (the next
  // frame delivers it).
  var BENIGN_WINDOW_ERROR = /^ResizeObserver loop/;
  function twinShown() {
    var el = document.getElementById('root');
    return mountedSent && !!(el && el.firstElementChild);
  }
  function reportUncaught(where, e) {
    if (twinShown()) reportWarn(where, e);
    else reportError(where, e);
  }
  window.addEventListener('error', function (e) {
    var where = 'window' + (e.filename ? ' ' + e.filename + ':' + e.lineno : '');
    if (!e.error && BENIGN_WINDOW_ERROR.test(String(e.message))) reportWarn(where, e.message);
    else reportUncaught(where, e.error || e.message);
  });
  window.addEventListener('unhandledrejection', function (e) {
    reportUncaught('promise', e.reason);
  });

  // ---- visibility shim ------------------------------------------------------
  // The twin pauses its render loop on `visibilitychange` + `document.hidden`.
  // Its IntersectionObserver cannot see RN scrolling or a screen pushed on
  // top, so the app drives visibility; the real page visibility (app in the
  // background) still counts.
  var appVisible = true;
  var realHidden = (function () {
    var d = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    return function () {
      try {
        return !!(d && d.get && d.get.call(document));
      } catch (e) {
        return false;
      }
    };
  })();
  try {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: function () {
        return !appVisible || realHidden();
      },
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: function () {
        return !appVisible || realHidden() ? 'hidden' : 'visible';
      },
    });
  } catch (e) {
    // the twin still works, it just can't be paused by the app
    reportWarn('visibility-shim', e);
  }
  function setVisible(visible) {
    var next = visible !== false;
    if (next === appVisible) return;
    appVisible = next;
    document.dispatchEvent(new Event('visibilitychange'));
  }

  // ---- host + theme -----------------------------------------------------------
  // `host` switches CSS classes only (app.css: every gesture on the canvas is
  // the twin's, `touch-action: none`, in BOTH hosts) and turns the inline
  // gesture-ownership claims below on or off.
  function applyHost(host) {
    var full = host === 'fullscreen';
    var cl = document.documentElement.classList;
    cl.toggle('pes-host-fullscreen', full);
    cl.toggle('pes-host-inline', !full);
    if (inlineHost !== !full) {
      inlineHost = !full;
      resetGesture();
    }
  }

  // ---- gesture ownership (inline) -------------------------------------------
  // Every gesture on the 3D belongs to the twin, inline too (app.css:
  // `touch-action: none` — a vertical drag tilts the model). But the app's
  // native scroll view sits under the WebView and follows any drag on it: the
  // page moved while the model turned (user reports 2026-10-10 — first "it
  // scrolls down the screen too", then "scroll up and down still scroll
  // screen" when only turns / pinches were claimed). So the moment a finger
  // lands on the 3D canvas the page claims the gesture —
  // `{type:'gesture', active:true}` — BEFORE any movement, so the scroll view
  // is held before it could start (it needs ~10 pt of travel), and releases it
  // when the last finger lifts (`active:false`). The app keeps page visible
  // around the inline card to scroll by (sldTwinInlineHeight). The full
  // screen has no page scroll: never claimed. Only touches on the canvas
  // count here: a tool button, the mix / status legend or the readings card
  // is not the 3D (the twin's tags are pointer-events:none labels — a
  // finger on one lands on the canvas, and counts).
  // This claim is ONE of the app's holds, not the first: the app also holds
  // natively (Android: the WebView's `nestedScrollEnabled`; iOS: a
  // gesture-handler pan around the panel that fails the scroll view's own
  // pan) and on RN's touch-down for ANY touch in the panel (SLDDiagram
  // `SldTwinPanel`), each released independently.
  var inlineHost = true;
  var touchIds = {}; // pointerId → true while that finger is down
  var touchCount = 0;
  var gestureClaimed = false;
  function claimGesture(active) {
    if (gestureClaimed === active) return;
    gestureClaimed = active;
    post({ type: 'gesture', active: active });
  }
  function resetGesture() {
    touchIds = {};
    touchCount = 0;
    claimGesture(false);
  }
  function onTouchDown(e) {
    if (!inlineHost || e.pointerType !== 'touch') return;
    if (!e.target || e.target.tagName !== 'CANVAS') return;
    if (!touchIds[e.pointerId]) {
      touchIds[e.pointerId] = true;
      touchCount += 1;
    }
    claimGesture(true);
  }
  function onTouchEnd(e) {
    if (!touchIds[e.pointerId]) return;
    delete touchIds[e.pointerId];
    touchCount = Math.max(0, touchCount - 1);
    if (touchCount === 0) claimGesture(false);
  }
  var touchListen = { capture: true, passive: true };
  window.addEventListener('pointerdown', guard('gesture', onTouchDown), touchListen);
  window.addEventListener('pointerup', guard('gesture', onTouchEnd), touchListen);
  window.addEventListener('pointercancel', guard('gesture', onTouchEnd), touchListen);
  // Fingers can't still be down on a page that was hidden or lost focus.
  window.addEventListener('blur', guard('gesture', resetGesture));
  document.addEventListener(
    'visibilitychange',
    guard('gesture', function () {
      if (document.hidden) resetGesture();
    }),
  );
  function applyTheme(theme) {
    var light = theme === 'light';
    document.body.classList.toggle('light', light);
    document.body.classList.toggle('dark', !light);
  }

  // ---- live values: the web hook's rules ------------------------------------
  // Web: hook module 843544 (`default(sld, siteExpressions)`), called by the
  // site-view host 582755. Per node: every key's value → `fmt`; the node's
  // `animation` rule → edgeMode 'flow' | 'idle'. Site expressions (explve…)
  // and group formulas are not evaluated (the app has no expression
  // evaluator either), so brokenRefs / brokenGroups stay empty.
  function lodashGet(obj, path, dflt) {
    var segs = String(path)
      .replace(/\[(\w+)\]/g, '.$1')
      .split('.')
      .filter(Boolean);
    var cur = obj;
    for (var i = 0; i < segs.length; i++) {
      if (cur == null) return dflt;
      cur = cur[segs[i]];
    }
    return cur === undefined ? dflt : cur;
  }
  // web util 720699 getValueFromStore: lodash.get(store, path, "NA"); numbers → toFixed(2)
  function getValueFromStore(store, path) {
    var r = lodashGet(store, path, 'NA');
    return typeof r === 'number' ? r.toFixed(2) : r;
  }
  // web hook formatter: "—" for null / NA / "" / NaN; |v| ≥ 1000 → 0 decimals, else 2
  function fmt(v) {
    if (v == null || v === 'NA' || v === '' || Number.isNaN(Number(v))) return '—';
    var n = Number(v);
    return Math.abs(n) >= 1e3 ? n.toFixed(0) : n.toFixed(2);
  }
  // The flow rule. Web: mathjs `evaluate(`${name} ${operator || '!='} ${value ?? 0}`,
  // { [name]: Number(reading) })` — any throw → idle. Mirrored for what an
  // SLD rule is, ONE comparison, with mathjs's own reading of it (checked
  // against the web's mathjs, __tests__/sldTwinBridge.test.ts):
  //  - == != > < >= <=, spaces / tabs around them fine; anything else → idle
  //    (mathjs would evaluate " ", "=", "and", "+" as arithmetic / logic —
  //    never an SLD rule);
  //  - the right-hand side must be what mathjs reads as a number: a decimal
  //    literal (".5", "5.", "1E3", leading zeros, signs — "- 5", "--5"),
  //    true / false (1 / 0), NaN, Infinity, null (compares like NaN).
  //    Anything else makes mathjs throw ("", " ", "abc", "1,000", "10kW",
  //    "1_000") → idle. (Inputs mathjs evaluates but no rule would hold —
  //    hex, pi, "(5)", "5e" = 5·e — read as idle here.)
  //  - numbers compare with mathjs's tolerance (relTol 1e-12, absTol 1e-15):
  //    0 != 1e-16 is false, 0 >= 1e-16 is true.
  var RULE_TRIM = /^[ \t]+|[ \t]+$/g;
  var RULE_OPERAND = /^((?:[+-][ \t]*)*)(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|(true|false|NaN|Infinity|null))$/;
  var RULE_CONSTANT = { true: 1, false: 0, NaN: NaN, Infinity: Infinity, null: NaN };
  function ruleOperand(ref) {
    var text = String(ref).replace(RULE_TRIM, '');
    var m = RULE_OPERAND.exec(text);
    if (!m) throw new Error('not a number for the rule: ' + text);
    var n = m[2] !== undefined ? Number(m[2]) : RULE_CONSTANT[m[3]];
    return (m[1].match(/-/g) || []).length % 2 ? -n : n;
  }
  // mathjs nearlyEqual with its default config (relTol 1e-12, absTol 1e-15)
  function nearlyEqual(a, b) {
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    if (a === b) return true;
    return Math.abs(a - b) <= Math.max(1e-12 * Math.max(Math.abs(a), Math.abs(b)), 1e-15);
  }
  function evalRule(v, op, ref) {
    var a = Number(v);
    var b = ruleOperand(ref);
    var o = String(op || '!=').replace(RULE_TRIM, '');
    switch (o) {
      case '!=':
        return !nearlyEqual(a, b);
      case '==':
        return nearlyEqual(a, b);
      case '>':
        return a > b && !nearlyEqual(a, b);
      case '<':
        return a < b && !nearlyEqual(a, b);
      case '>=':
        return a > b || nearlyEqual(a, b);
      case '<=':
        return a < b || nearlyEqual(a, b);
      default:
        throw new Error('unsupported operator ' + o);
    }
  }
  function buildLiveValues(sld, store) {
    if (!sld || !Array.isArray(sld.nodes) || !sld.nodes.length || !store) return null;
    var nodeKv = {};
    var edgeMode = {};
    sld.nodes.forEach(function (node) {
      var a = (node && node.data) || {};
      if (Array.isArray(a.keys) && a.keys.length) {
        var kv = {};
        a.keys.forEach(function (k) {
          var p = (k && (k.param || k.liveParams)) || null;
          if (!p || !k.label) return;
          kv[k.label] = fmt(getValueFromStore(store, p));
        });
        if (Object.keys(kv).length) nodeKv[node.id] = kv;
      }
      var an = a.animation;
      if (an && an.animationParams) {
        var v = getValueFromStore(store, an.animationParams);
        if (v === 'NA' || v == null) {
          edgeMode[node.id] = 'idle';
        } else {
          try {
            edgeMode[node.id] = evalRule(v, an.operator, an.value == null ? 0 : an.value) ? 'flow' : 'idle';
          } catch (e) {
            edgeMode[node.id] = 'idle';
          }
        }
      }
    });
    return { nodeKv: nodeKv, edgeMode: edgeMode, brokenGroups: [], brokenRefs: [] };
  }
  // The web memoises liveValues on [sld, store, expressions]: a new object
  // only when the diagram or the live data changed. A re-render for anything
  // else (a theme flip) must hand the twin the SAME object — it samples each
  // asset's readings sparkline whenever liveValues changes.
  var liveValuesMemo = { sld: undefined, live: undefined, value: null };
  function liveValuesFor(sld, live) {
    if (liveValuesMemo.sld !== sld || liveValuesMemo.live !== live) {
      liveValuesMemo = { sld: sld, live: live, value: buildLiveValues(sld, live) };
    }
    return liveValuesMemo.value;
  }

  // ---- redux store (react-redux 9 needs getState / subscribe / dispatch) -----
  // Shape of the web slice: state.site.unprocessedLiveParameters = the live
  // envelope ({ live: { pN: { value, update_at } }, update_at }); the twin
  // reads per-param `update_at` for "Updated … ago" and pulses on a new one.
  var LIVE_ACTION = 'pes/setLive';
  function createStore(live) {
    var state = { site: { unprocessedLiveParameters: live || {}, processParameters: {} } };
    var subs = [];
    return {
      getState: function () {
        return state;
      },
      subscribe: function (f) {
        subs.push(f);
        return function () {
          var i = subs.indexOf(f);
          if (i >= 0) subs.splice(i, 1);
        };
      },
      dispatch: function (action) {
        if (action && action.type === LIVE_ACTION) {
          state = { site: { unprocessedLiveParameters: action.payload || {}, processParameters: {} } };
          subs.slice().forEach(function (f) {
            f();
          });
        }
        return action;
      },
    };
  }

  // ---- grouped looks ---------------------------------------------------------
  // The app's Grouped mode (SldTwin/twinGrouped.ts) sends ONE regular node
  // per group ("Wind · 6") carrying the raw member nodes in
  // `data.pesGroupMembers`. The twin draws one model per node, picked by the
  // web's own `lookOf` (module `sldLook`) from the node's asset / icon / title
  // / look — and a group's own icon + title can pick another model than its
  // members do ("Solar · 9" → the small `solar` array where the members are
  // `solarLg`; "Wind · 6" → a tubular tower where the GW members are
  // direct-drive). So each group node gets its members' MAJORITY model (ties →
  // the earliest member), each member resolved exactly as the twin resolves a
  // node (module 748776: `fromSldV2`, then `lookOf` with the raw node's asset /
  // icon / look), pinned the lightest way that makes `lookOf(group)` return
  // it — checked with `lookOf` after each step:
  //   1. the members' own catalogue `asset` (when their model came from one);
  //   2. `look` = their variant (the group's own icon);
  //   3. `look` + their icon name (the group's colour kept).
  // When none matches, or the model modules are missing, the group keeps its
  // own icon / title. `pesGroupMembers` is always removed; nothing here
  // throws. Members (and groups) are leaf sources: never the hub.
  var GROUP_MEMBERS = 'pesGroupMembers';
  var hasOwn = function (o, k) {
    return Object.prototype.hasOwnProperty.call(o, k);
  };
  function iconNameOf(node) {
    var icon = node && node.data && node.data.icon;
    return icon && typeof icon === 'object' ? icon.name : icon;
  }
  // The twin's own call for one raw node (it keys the raw asset / icon / look
  // by String(id) and the parsed node by fromSldV2's id).
  function lookOfNode(look, raw) {
    var parsed = look.fromSldV2({ nodes: [raw], edges: [] });
    var id = Object.keys((parsed && parsed.nodes) || {})[0];
    if (id === undefined) return null;
    var o = parsed.nodes[id];
    var mine = String(raw && raw.id) === id;
    var d = (raw && raw.data) || {};
    var r = look.lookOf({
      asset: mine ? d.asset || null : undefined,
      icon: mine ? iconNameOf(raw) : undefined,
      type: o.type,
      group: !!o.isGroup,
      hub: false,
      title: o.title || id,
      look: mine ? d.look || null : undefined,
    });
    if (!r || typeof r.kind !== 'string') return null;
    return { kind: r.kind, variant: r.variant || null, asset: r.asset || null, icon: mine ? iconNameOf(raw) : undefined };
  }
  function lookKey(l) {
    return l.kind + '|' + (l.variant || '');
  }
  function majorityLook(looks) {
    var counts = {};
    var best = null;
    looks.forEach(function (l) {
      if (l) counts[lookKey(l)] = (counts[lookKey(l)] || 0) + 1;
    });
    looks.forEach(function (l) {
      if (l && (!best || counts[lookKey(l)] > best.n)) best = { n: counts[lookKey(l)], look: l };
    });
    return best ? best.look : null;
  }
  function sameLook(a, b) {
    return !!a && !!b && a.kind === b.kind && (a.variant || null) === (b.variant || null);
  }
  // A copy of `node` whose data has `patch` applied and `drop` removed.
  function withData(node, patch, drop) {
    var data = {};
    var src = node.data || {};
    Object.keys(src).forEach(function (k) {
      if (k !== drop) data[k] = src[k];
    });
    Object.keys(patch).forEach(function (k) {
      data[k] = patch[k];
    });
    var out = {};
    Object.keys(node).forEach(function (k) {
      out[k] = node[k];
    });
    out.data = data;
    return out;
  }
  function pinGroupLook(look, node, members) {
    var want = majorityLook(members.map(function (m) {
      return lookOfNode(look, m);
    }));
    if (!want) return { node: node, via: 'own', want: null };
    var tries = [];
    if (want.asset) tries.push(['asset', { asset: want.asset }]);
    tries.push(['look', want.variant ? { look: want.variant } : {}]);
    if (want.icon != null && want.icon !== '') {
      var icon = node.data && node.data.icon;
      var named = icon && typeof icon === 'object' ? withData({ data: icon }, { name: want.icon }).data : want.icon;
      var patch = { icon: named };
      if (want.variant) patch.look = want.variant;
      tries.push(['icon', patch]);
    }
    for (var i = 0; i < tries.length; i++) {
      var candidate = withData(node, tries[i][1]);
      if (sameLook(lookOfNode(look, candidate), want)) return { node: candidate, via: tries[i][0], want: want };
    }
    return { node: node, via: 'own', want: want };
  }
  // `look` = { fromSldV2, lookOf } or null. Returns the diagram the twin gets
  // (the SAME object when it has no group node) and one log entry per group.
  function resolveGroupLooks(sld, look) {
    var log = [];
    if (!sld || !Array.isArray(sld.nodes)) return { sld: sld, log: log };
    var touched = false;
    var nodes = sld.nodes.map(function (node) {
      var data = node && node.data;
      if (!data || typeof data !== 'object' || !hasOwn(data, GROUP_MEMBERS)) return node;
      touched = true;
      var members = data[GROUP_MEMBERS];
      var plain = withData(node, {}, GROUP_MEMBERS);
      var entry = { id: String(node.id), title: data.heading, members: Array.isArray(members) ? members.length : 0, via: 'own' };
      try {
        if (!look) entry.reason = 'the web SLD model modules are not loaded';
        else if (!Array.isArray(members) || !members.length) entry.reason = 'no members';
        else {
          var r = pinGroupLook(look, plain, members);
          plain = r.node;
          entry.via = r.via;
          if (r.want) entry.want = { kind: r.want.kind, variant: r.want.variant };
          var drawn = lookOfNode(look, plain);
          if (drawn) entry.drawn = { kind: drawn.kind, variant: drawn.variant };
          if (r.via === 'own') entry.reason = r.want ? 'no pin gives the model of the members' : 'the members resolve to no model';
        }
      } catch (e) {
        entry.via = 'own';
        entry.reason = String((e && e.message) || e);
      }
      log.push(entry);
      return plain;
    });
    if (!touched) return { sld: sld, log: log };
    var out = {};
    Object.keys(sld).forEach(function (k) {
      out[k] = sld[k];
    });
    out.nodes = nodes;
    return { sld: out, log: log };
  }

  // ---- turbopack require -----------------------------------------------------
  // The runtime exposes no global require: register a tiny module and a
  // runtime entry that instantiates it; its context's `r(id)` is require.
  function getRequire() {
    return new Promise(function (resolve, reject) {
      try {
        window.TURBOPACK.push([
          'pes/bridge-module.js',
          BRIDGE_MODULE_ID,
          function (ctx) {
            resolve(function (id) {
              return ctx.r(id);
            });
          },
        ]);
        window.TURBOPACK.push(['pes/bridge-entry.js', { otherChunks: [], runtimeModuleIds: [BRIDGE_MODULE_ID] }]);
      } catch (e) {
        reject(e);
      }
    });
  }
  function loadModules(req) {
    var names = ['jsx', 'react', 'reactDomClient', 'reactRedux', 'twin'];
    var out = {};
    names.forEach(function (name) {
      if (typeof MOD[name] !== 'number') throw new Error('module id missing from the page config: ' + name);
      out[name] = req(MOD[name]);
      if (!out[name]) throw new Error('module ' + name + ' (' + MOD[name] + ') has no exports');
    });
    out.Twin = out.twin.default;
    if (typeof out.Twin !== 'function') throw new Error('the twin module has no default component');
    if (typeof out.reactDomClient.createRoot !== 'function') throw new Error('react-dom/client has no createRoot');
    if (!out.reactRedux.Provider) throw new Error('react-redux has no Provider');
    // Grouped looks only — the twin runs without them (groups keep their own
    // icon / title), so a missing one is a warning, not a boot failure.
    out.look = null;
    out.lookError = null;
    try {
      var model = typeof MOD.sldModel === 'number' ? req(MOD.sldModel) : null;
      var looks = typeof MOD.sldLook === 'number' ? req(MOD.sldLook) : null;
      if (!model || typeof model.fromSldV2 !== 'function') throw new Error('module sldModel (' + MOD.sldModel + ') has no fromSldV2');
      if (!looks || typeof looks.lookOf !== 'function') throw new Error('module sldLook (' + MOD.sldLook + ') has no lookOf');
      out.look = { fromSldV2: model.fromSldV2, lookOf: looks.lookOf };
    } catch (e) {
      out.lookError = e;
    }
    return out;
  }

  // ---- mount + render --------------------------------------------------------
  var R = null; // loaded modules
  var root = null;
  var store = null;
  var mountedSent = false;
  var enteredSent = false;
  var initReceived = false; // an init that beat the module load mounts once it is done
  // The app serves the page with its theme on <body> (build.mjs placeholder).
  var bootTheme = document.body.classList.contains('light') ? 'light' : 'dark';
  var state = { sld: null, live: null, theme: bootTheme, siteName: '' };

  // Wraps the twin; re-rendered by every `render()` (init, live, sld, theme).
  //  - Its layout effect runs right after the twin's first DOM commit
  //    (children's effects run first) → `mounted`.
  //  - Its passive effect replays a hidden page to the twin: the twin starts
  //    every scene build (mount, a new `sld`) with its render loop ON and
  //    reads `document.hidden` only in its `visibilitychange` listener, so
  //    a scene built while the app hides it (init with visible:false — the
  //    inline card below the fold —, an `sld` refetch off screen) would
  //    render off screen at full rate. Passive effects run children first,
  //    so this one runs after the twin's scene effect of the same commit.
  function MountProbe(props) {
    R.react.useLayoutEffect(function () {
      if (!mountedSent) {
        mountedSent = true;
        post({ type: 'mounted', ms: Math.round(performance.now()) });
      }
    }, []);
    R.react.useEffect(function () {
      if (document.hidden) document.dispatchEvent(new Event('visibilitychange'));
    });
    return props.children;
  }

  // `entered` = the twin's intro is done: its `onEntered` adds `is-ready` to
  // `.tw-tags` (immediately under reduced motion).
  function watchEntered(el) {
    var check = function () {
      if (enteredSent) return true;
      if (el.querySelector('.tw-tags.is-ready')) {
        enteredSent = true;
        post({ type: 'entered', ms: Math.round(performance.now()) });
        return true;
      }
      return false;
    };
    if (check()) return;
    var mo = new MutationObserver(
      guard('entered-observer', function () {
        if (check()) mo.disconnect();
      }),
    );
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }

  // The diagram the twin gets for `state.sld` — memoised per object, so a
  // re-render for anything else hands the twin the same one. The group-look
  // log is kept for the inspectors and the smoke test
  // (`window.__pesTwinGroupLooks`).
  //
  // Every NEW diagram (an `sld` message: a Grouped | Units switch, a config
  // refetch; a second `init`) mounts a NEW twin — `generation` is its React
  // key. The twin rebuilds its scene in place on a new `sld` by disposing its
  // renderer with `forceContextLoss()` and creating the next one on the SAME
  // canvas, whose WebGL context is then lost for good: three.js can't start
  // on it and the twin shows its "3D isn't available here" fallback (seen in
  // the smoke on a Grouped | Units switch). The web never hits it — it
  // remounts the twin per site. A new twin gets a new canvas; the store
  // (live data), theme and visibility carry over; the camera, the selection
  // and Plan view start fresh, as for a newly opened site.
  var twinSldMemo = { input: undefined, output: null, generation: 0 };
  function twinSld(input) {
    if (twinSldMemo.input !== input) {
      var r = resolveGroupLooks(input, R.look);
      twinSldMemo = { input: input, output: r.sld, generation: twinSldMemo.generation + 1 };
      window.__pesTwinGroupLooks = r.log;
      r.log.forEach(function (e) {
        if (e.via === 'own') reportWarn('group-look', e.title + ': ' + e.reason);
      });
    }
    return twinSldMemo.output;
  }

  function render() {
    if (!R || !root) return;
    var sld = twinSld(state.sld);
    if (!sld || !Array.isArray(sld.nodes) || !sld.nodes.length) {
      reportError('render', 'the sld has no nodes');
      return;
    }
    var jsx = R.jsx.jsx;
    var isLight = state.theme === 'light';
    var twin = jsx(
      R.Twin,
      {
        sld: sld,
        liveValues: liveValuesFor(sld, state.live),
        siteName: state.siteName,
        isLight: isLight,
        onExit: function () {
          post({ type: 'exit' });
        },
      },
      'sld-' + twinSldMemo.generation,
    );
    root.render(
      jsx(R.reactRedux.Provider, {
        store: store,
        children: jsx('div', {
          className: 'spf-panel pes-twin-scope' + (isLight ? ' light' : ''),
          children: jsx(MountProbe, { children: twin }),
        }),
      }),
    );
  }

  function mount(el) {
    store = createStore(state.live);
    root = R.reactDomClient.createRoot(el, {
      onUncaughtError: function (e) {
        reportError('react-uncaught', e);
      },
      onCaughtError: function (e) {
        reportError('react-caught', e);
      },
      onRecoverableError: function (e) {
        reportWarn('react-recoverable', e);
      },
    });
    watchEntered(el);
    render();
  }

  // ---- app → page ------------------------------------------------------------
  var handlers = {
    init: function (msg) {
      state.sld = msg.sld || null;
      state.live = msg.live || null;
      state.theme = msg.theme === 'light' ? 'light' : 'dark';
      state.siteName = typeof msg.siteName === 'string' ? msg.siteName : '';
      applyHost(msg.host);
      applyTheme(state.theme);
      setVisible(msg.visible);
      initReceived = true;
      if (!R) return; // still booting: mounted right after `ready`
      if (!root) {
        mount(document.getElementById('root'));
      } else {
        // a second init (the app re-sent everything): update in place
        store.dispatch({ type: LIVE_ACTION, payload: state.live });
        render();
      }
    },
    live: function (msg) {
      state.live = msg.live || null;
      if (store) store.dispatch({ type: LIVE_ACTION, payload: state.live });
      render();
    },
    sld: function (msg) {
      state.sld = msg.sld || null;
      if (typeof msg.siteName === 'string') state.siteName = msg.siteName;
      render();
    },
    theme: function (msg) {
      state.theme = msg.theme === 'light' ? 'light' : 'dark';
      applyTheme(state.theme);
      render();
    },
    visible: function (msg) {
      setVisible(msg.visible);
    },
  };

  // A malformed or unknown message is an app bug, not a broken twin: it is
  // reported as a warning and ignored. A handler that throws is an error.
  window.__pesTwinReceive = function (input) {
    var msg;
    try {
      msg = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (e) {
      reportWarn('receive', e);
      return;
    }
    var type = msg && typeof msg.type === 'string' ? msg.type : null;
    if (!type || !Object.prototype.hasOwnProperty.call(handlers, type)) {
      reportWarn('receive', 'unknown message type: ' + type);
      return;
    }
    try {
      handlers[type](msg);
    } catch (e) {
      reportError(type, e);
    }
  };

  // ---- boot --------------------------------------------------------------------
  // Resolve every module now (evaluates React, react-dom, three.js and the
  // twin once) so `ready` means "all code loaded, waiting for init".
  applyHost('inline');
  applyTheme(bootTheme);
  getRequire()
    .then(function (req) {
      R = loadModules(req);
      post({ type: 'ready', build: config.build || null, react: String(R.react.version || '') || null });
      if (R.lookError) reportWarn('boot', R.lookError);
      if (initReceived && !root) mount(document.getElementById('root'));
    })
    .catch(function (e) {
      reportError('boot', e);
    });
})();
