// smoke.mjs — render the GENERATED page (SldTwin/twinHtml.generated.js) offline in
// headless Chrome with the Lucky Cement fixture, the way the app drives it,
// and assert the web twin's own output (SPEC §8):
//   "5.82 MW producing now", the status chips "14 producing / 1 drawing /
//   4 idle", the 20 equipment tags, the hidden toolbar, Inter loaded (and
//   its greek subset for the group tags' Σ), the visibility shim, a live
//   update (→ 6.97 MW, 16 producing), 0 JS exceptions, 0 bridge errors and
//   0 network requests. A third run serves the page the way the app does in
//   LIGHT mode and checks it paints light before `init`, that a twin
//   mounted hidden (init visible:false — the inline card below the fold)
//   runs no frames until shown, and that an uncaught error once the twin
//   is up is only a `warn`.
// Grouped (the app's Grouped | Units in 3D, fixtures/lucky-grouped.json —
// the app adapter's own output, kept equal to it by
// __tests__/sldTwinGrouped.test.ts): a desktop run switches the RUNNING
// page Units → Grouped → Units the way the app does (`live` then `sld`, then
// `sld` then `live`) and checks the 7 tags (LCL Plant, Wind · 6, Solar · 9,
// Captive Plant, BESS, WHR Plant, SVG), the "producing now" mix EQUAL to
// Units (total, per-source kW and %), the groups' 3D models resolved with
// the web's own lookOf (Wind · 6 = the members' direct-drive turbine,
// Solar · 9 = their solarLg array), the readings card's worded flow rule;
// a phone run inits Grouped directly.
// The phone run also drives real touches (CDP) at the inline page: a finger
// on the canvas posts `gesture` true at touch-down and false on lift (one
// pair per drag), a HUD control touch none, the full screen none.
// Screenshots (dark, light, plan view, 390×844 phone, grouped desktop +
// phone) go to a fresh OS tmp dir; their paths are printed.
//
//   node scripts/web-twin/smoke.mjs [--chrome <path>] [--keep]
//
// Chrome runs with an isolated --user-data-dir under that tmp dir and the
// SwiftShader software GL (headless Metal is unreliable). SwiftShader blocks
// the page for 60–90 s compiling the twin's 15 shader programs and then runs
// at ~1 fps (the intro needs ≥ 27 frames), so every wait here is long. Only
// the Chrome processes started here (found by their unique profile path) are
// ever killed, by exact PID.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { GENERATED, HERE, ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const KEEP = args.includes('--keep');
const CHROME =
  (args.includes('--chrome') && args[args.indexOf('--chrome') + 1]) ||
  process.env.CHROME_PATH ||
  {
    darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    linux: '/usr/bin/google-chrome',
    win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  }[process.platform];
if (!CHROME || !fs.existsSync(CHROME)) {
  console.error(`Chrome not found (${CHROME}); pass --chrome <path> or set CHROME_PATH`);
  process.exit(1);
}

const CDP_TIMEOUT_MS = 300_000; // one call can wait out the whole SwiftShader stall
const ENTER_TIMEOUT_MS = 600_000;
const POLL_MS = 2_000;

const { TWIN_HTML, TWIN_BUILD_ID, TWIN_THEME_PLACEHOLDER } = createRequire(import.meta.url)(GENERATED);
const fixture = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/lucky.json'), 'utf8'));
const groupedFixture = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/lucky-grouped.json'), 'utf8'));
const GROUPED_HEADINGS = ['LCL Plant', 'Wind · 6', 'Solar · 9', 'Captive Plant', 'BESS', 'WHR Plant', 'SVG'];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'pes-twin-smoke-'));
// The page as the app serves it: the <body> class filled with the theme
// (SldTwinView: the placeholder's first occurrence).
const PAGE_URLS = {};
for (const theme of ['dark', 'light']) {
  const file = path.join(TMP, `twin-${theme}.html`);
  fs.writeFileSync(file, TWIN_HTML.replace(TWIN_THEME_PLACEHOLDER, theme));
  PAGE_URLS[theme] = `file://${file}`;
}
const PAGE_URL = PAGE_URLS.dark;
const isPageUrl = (u) => Object.values(PAGE_URLS).includes(u);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const shots = [];
const started = []; // { pid, profile }
let failed = false;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failed = true;
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- live envelope helpers ----------------------------------------------------------
/** The fixture's envelope (`source`: Units by default) with every `update_at` = `ageS` seconds ago (epoch s). */
function stampedLive(ageS, overrides = {}, source = fixture.live) {
  const ts = Math.floor(Date.now() / 1000) - ageS;
  const live = { live: {}, update_at: ts };
  for (const [p, v] of Object.entries(source.live)) live.live[p] = { ...v, update_at: ts };
  for (const [p, value] of Object.entries(overrides)) live.live[p] = { ...live.live[p], value, update_at: ts };
  return live;
}

// ---- Chrome + CDP -------------------------------------------------------------------------
async function launch(name, { width, height }, pageUrl = PAGE_URL) {
  const profile = path.join(TMP, `profile-${name}`);
  fs.mkdirSync(profile);
  const proc = spawn(
    CHROME,
    [
      '--headless=new',
      `--user-data-dir=${profile}`,
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--disable-component-update',
      '--disable-background-networking',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--mute-audio',
      `--window-size=${width},${height}`,
      '--remote-debugging-port=0',
      // open the page directly: a CDP navigation away from about:blank left
      // Runtime.evaluate hanging in the original harness
      pageUrl,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );
  started.push({ pid: proc.pid, profile });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port = null;
  for (let i = 0; i < 300 && !port; i++) {
    await sleep(100);
    if (fs.existsSync(portFile)) port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]) || null;
  }
  if (!port) throw new Error('Chrome did not open its DevTools port');
  let wsUrl = null;
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = list.find((t) => t.type === 'page' && t.url.startsWith('file://'))?.webSocketDebuggerUrl ?? null;
    } catch {
      // not up yet
    }
    if (!wsUrl) await sleep(100);
  }
  if (!wsUrl) throw new Error('no page target');
  const cdp = await connect(wsUrl);
  cdp.proc = proc;
  return cdp;
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 1;
  const pending = new Map();
  const cdp = { exceptions: [], consoleErrors: [], requests: [] };
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error(`${p.method}: ${m.error.message}`));
      else p.resolve(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      cdp.exceptions.push((d.exception?.description || d.text || '').slice(0, 1500));
    } else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) {
      cdp.consoleErrors.push(m.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 800));
    } else if (m.method === 'Network.requestWillBeSent') {
      cdp.requests.push(m.params.request.url);
    }
  };
  cdp.send = (method, params = {}, timeoutMs = CDP_TIMEOUT_MS) => {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timeout ${method}`));
      }, timeoutMs);
      pending.set(id, {
        method,
        resolve: (v) => (clearTimeout(to), resolve(v)),
        reject: (e) => (clearTimeout(to), reject(e)),
      });
    });
  };
  cdp.eval = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`page eval failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  cdp.receive = (msg) => cdp.eval(`window.__pesTwinReceive(${JSON.stringify(msg)}), true`);
  cdp.shot = async (name) => {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(TMP, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    shots.push(file);
    return file;
  };
  cdp.close = () => ws.close();
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  return cdp;
}

async function waitFor(cdp, label, expression, timeoutMs) {
  const t0 = Date.now();
  for (;;) {
    if (await cdp.eval(expression)) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error(`timed out after ${Math.round(timeoutMs / 1000)} s waiting for ${label}`);
    await sleep(POLL_MS);
  }
}

/** Kills (by exact PID) only Chrome processes whose command line holds our unique profile path. */
function stopChrome() {
  for (const { pid } of started) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
  const leftovers = () => {
    try {
      return execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' })
        .split('\n')
        .filter((line) => started.some(({ profile }) => line.includes(profile)))
        .map((line) => Number(line.trim().split(/\s+/)[0]))
        .filter((pid) => pid && pid !== process.pid);
    } catch {
      return [];
    }
  };
  const deadline = Date.now() + 5000;
  while (leftovers().length && Date.now() < deadline) execFileSync('sleep', ['0.3']);
  for (const pid of leftovers()) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // already gone
    }
  }
}
process.on('SIGINT', () => {
  stopChrome();
  process.exit(130);
});

// ---- page probes ---------------------------------------------------------------------------
const STATE = `(() => {
  const canvas = document.querySelector('.sld-canvas');
  const r = canvas ? canvas.getBoundingClientRect() : null;
  const toolbar = document.querySelector('.sld-toolbar');
  return {
    events: (window.__pesTwinEvents || []).slice(),
    text: document.body.innerText,
    buttons: [...document.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.innerText || '').trim()).filter(Boolean),
    tags: [...document.querySelectorAll('.tw-tags > .tw-tag')].map((b) => b.getAttribute('aria-label')),
    tagsReady: !!document.querySelector('.tw-tags.is-ready'),
    toolbarDisplay: toolbar ? getComputedStyle(toolbar).display : null,
    canvas: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
    viewport: { w: innerWidth, h: innerHeight },
    glCanvas: !!document.querySelector('canvas.tw-canvas'),
    fallback: document.querySelector('.tw-fallback') ? document.querySelector('.tw-fallback').innerText : null,
    inter: [...document.fonts].filter((f) => f.family.replace(/["']/g, '') === 'Inter').map((f) => f.status),
    interUsed: document.fonts.check('600 12px Inter'),
    bodyClass: document.body.className,
    scopeClass: document.querySelector('.pes-twin-scope') ? document.querySelector('.pes-twin-scope').className : null,
    htmlClass: document.documentElement.className,
    touchAction: document.querySelector('canvas.tw-canvas') ? getComputedStyle(document.querySelector('canvas.tw-canvas')).touchAction : null,
    resources: performance.getEntriesByType('resource').map((e) => e.name),
  };
})()`;

function checkCommon(label, s, cdp, headings = fixture.sld.nodes.map((n) => n.data.heading)) {
  const ready = s.events.find((e) => e.type === 'ready');
  check(`${label}: ready`, !!ready && ready.build === TWIN_BUILD_ID && /^19\./.test(ready.react || ''), JSON.stringify(ready));
  const mounted = s.events.find((e) => e.type === 'mounted');
  const entered = s.events.find((e) => e.type === 'entered');
  check(`${label}: mounted + entered posted`, !!mounted && !!entered, `mounted ${mounted?.ms} ms, entered ${entered?.ms} ms (page clock)`);
  const errors = s.events.filter((e) => e.type === 'error');
  check(`${label}: 0 bridge errors`, errors.length === 0, errors.map((e) => `${e.where}: ${e.message}`).join(' | '));
  const warns = s.events.filter((e) => e.type === 'warn');
  if (warns.length) console.log(`    (warnings: ${warns.map((e) => `${e.where}: ${e.message}`).join(' | ')})`);
  check(`${label}: 0 JS exceptions`, cdp.exceptions.length === 0, cdp.exceptions.join(' | '));
  if (cdp.consoleErrors.length) console.log(`    (console.error: ${cdp.consoleErrors.join(' | ')})`);
  const net = cdp.requests.filter((u) => !u.startsWith('data:') && !isPageUrl(u));
  check(`${label}: 0 network requests (CDP, after load)`, net.length === 0, net.join(', '));
  const res = s.resources.filter((u) => !u.startsWith('data:'));
  check(`${label}: 0 fetched resources (Resource Timing, whole load)`, res.length === 0, res.join(', '));
  check(`${label}: WebGL canvas, no fallback`, s.glCanvas && !s.fallback, s.fallback || '');
  check(`${label}: "producing now"`, s.text.includes('producing now'));
  const missing = headings.filter((h) => !s.tags.some((t) => t && t.startsWith(`${h},`)));
  check(`${label}: ${headings.length} equipment tags`, s.tags.length === headings.length && missing.length === 0, `${s.tags.length} tags${missing.length ? `, missing ${missing.join(', ')}` : ''}`);
  check(`${label}: toolbar hidden, no "Streaming"`, s.toolbarDisplay === 'none' && !s.text.includes('Streaming') && !s.buttons.includes('Fullscreen'));
  const fills = s.canvas && Math.abs(s.canvas.w - s.viewport.w) <= 1 && Math.abs(s.canvas.h - s.viewport.h) <= 1;
  check(`${label}: canvas fills the viewport`, !!fills, `${JSON.stringify(s.canvas)} in ${JSON.stringify(s.viewport)}`);
  check(`${label}: Inter loaded from the inlined woff2`, s.inter.includes('loaded') && s.interUsed, JSON.stringify(s.inter));
}

/** A point (CSS px) where the 3D canvas itself is the topmost element, or null. */
const POINT_ON_CANVAS = `(() => {
  const c = document.querySelector('canvas.tw-canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  for (let y = r.top + r.height * 0.5; y < r.bottom - 8; y += 10)
    for (let x = r.left + 12; x < r.right - 12; x += 10) if (document.elementFromPoint(x, y) === c) return { x, y };
  for (let y = r.top + 8; y < r.top + r.height * 0.5; y += 10)
    for (let x = r.left + 12; x < r.right - 12; x += 10) if (document.elementFromPoint(x, y) === c) return { x, y };
  return null;
})()`;

/** The "producing now" mix: total, per-source [name, kW, %] rows, the charging / export note. */
const MIX = `(() => {
  const m = document.querySelector('.tw-mix');
  if (!m) return null;
  const t = (el) => (el ? el.textContent.trim() : null);
  return {
    total: t(m.querySelector('.tw-mix-head b')),
    rows: [...m.querySelectorAll('.tw-mix-keys button')].map((b) => [t(b.querySelector('.tw-mix-name')), t(b.querySelector('.tw-mix-kw')), t(b.querySelector('.tw-mix-pc'))]),
    note: t(m.querySelector('.tw-mix-note')),
  };
})()`;
const tagCount = (n) => `document.querySelectorAll('.tw-tags > .tw-tag').length === ${n} && document.body.innerText.includes('producing now')`;

/** Grouped-mode checks shared by the desktop and phone runs. */
async function checkGrouped(label, cdp, unitsMix) {
  const s = await cdp.eval(STATE);
  const missing = GROUPED_HEADINGS.filter((h) => !s.tags.some((t) => t && t.startsWith(`${h},`)));
  check(`${label}: the ${GROUPED_HEADINGS.length} grouped tags`, s.tags.length === GROUPED_HEADINGS.length && missing.length === 0, `${s.tags.length} tags: ${s.tags.map((t) => (t || '').split(',')[0]).join(' | ')}${missing.length ? `; missing ${missing.join(', ')}` : ''}`);
  check(`${label}: WebGL canvas, no fallback`, s.glCanvas && !s.fallback, s.fallback || '');
  const mix = await cdp.eval(MIX);
  check(`${label}: "producing now" mix EQUAL to Units (total, per-source kW + %)`, JSON.stringify(mix) === JSON.stringify(unitsMix), `grouped ${JSON.stringify(mix)} vs units ${JSON.stringify(unitsMix)}`);
  check(`${label}: "5.82 MW producing now"`, mix?.total === '5.82 MW', mix?.total);
  const looks = await cdp.eval('window.__pesTwinGroupLooks || null');
  const byTitle = (t) => (looks || []).find((e) => e.title === t);
  const wind = byTitle('Wind · 6');
  check(`${label}: Wind · 6 draws the members' direct-drive turbine (web lookOf)`, wind?.drawn?.kind === 'wind' && wind?.drawn?.variant === 'directDrive' && wind?.want?.variant === 'directDrive' && wind?.members === 6, JSON.stringify(wind));
  const solar = byTitle('Solar · 9');
  check(`${label}: Solar · 9 draws the members' solarLg array (web lookOf)`, solar?.drawn?.kind === 'solarLg' && solar?.drawn?.variant === 'fixed' && solar?.members === 9, JSON.stringify(solar));
  const chips = s.buttons.filter((b) => /^\d+ (producing|drawing|idle|no data)$/.test(b));
  console.log(`    (grouped status chips: ${chips.join(' · ')})`);
  const errors = s.events.filter((e) => e.type === 'error');
  const groupWarns = s.events.filter((e) => e.type === 'warn' && e.where === 'group-look');
  check(`${label}: 0 bridge errors, 0 group-look warnings`, errors.length === 0 && groupWarns.length === 0, [...errors, ...groupWarns].map((e) => `${e.where}: ${e.message}`).join(' | '));
  check(`${label}: 0 JS exceptions`, cdp.exceptions.length === 0, cdp.exceptions.join(' | '));
  const net = cdp.requests.filter((u) => !u.startsWith('data:') && !isPageUrl(u));
  check(`${label}: 0 network requests`, net.length === 0, net.join(', '));
  return s;
}

/** The Inter faces that draw `text` once loaded (a subset covering it, from its data URI). */
const interFacesFor = (cdp, text) =>
  cdp.eval(`document.fonts.load('600 12px Inter', ${JSON.stringify(text)}).then((faces) => faces.map((f) => f.status + ' ' + f.unicodeRange.slice(0, 24)))`);

// ---- scenario 1: desktop 1280×800 ------------------------------------------------------------------
async function desktop() {
  console.log('\n[desktop 1280×800] launching Chrome (SwiftShader)…');
  const cdp = await launch('desktop', { width: 1280, height: 800 });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await waitFor(cdp, 'ready', `(window.__pesTwinEvents || []).some((e) => e.type === 'ready')`, 60_000);
  const t0 = Date.now();
  await cdp.receive({ type: 'init', sld: fixture.sld, live: stampedLive(60), theme: 'dark', siteName: fixture.siteName, host: 'inline', visible: true });
  console.log('  init sent; waiting for the first frame + intro (SwiftShader: minutes)…');
  await waitFor(cdp, 'the intro (.tw-tags.is-ready)', `!!document.querySelector('.tw-tags.is-ready') && document.body.innerText.includes('producing now')`, ENTER_TIMEOUT_MS);
  console.log(`  entered after ${Math.round((Date.now() - t0) / 1000)} s wall`);
  await sleep(4000); // tag fade-in (0.35 s) + a few SwiftShader frames
  let s = await cdp.eval(STATE);
  checkCommon('desktop', s, cdp);
  check('desktop: "5.82 MW" total', s.text.includes('5.82 MW'));
  for (const chip of ['14 producing', '1 drawing', '4 idle']) check(`desktop: status chip "${chip}"`, s.buttons.includes(chip));
  check('desktop: dark theme', s.bodyClass.includes('dark') && !/\blight\b/.test(s.scopeClass || ''), `${s.bodyClass} / ${s.scopeClass}`);
  const sigma = await interFacesFor(cdp, 'Σ');
  check('desktop: Σ (group tags) is drawn with Inter (greek subset inlined)', sigma.length > 0 && sigma.every((f) => f.startsWith('loaded')), JSON.stringify(sigma));
  check('desktop: inline host class', s.htmlClass.includes('pes-host-inline'), s.htmlClass);
  await cdp.shot('desktop-dark');

  await cdp.receive({ type: 'theme', theme: 'light' });
  await sleep(8000);
  s = await cdp.eval(STATE);
  check('desktop: light theme applied', /\blight\b/.test(s.bodyClass) && /\blight\b/.test(s.scopeClass || ''), `${s.bodyClass} / ${s.scopeClass}`);
  await cdp.shot('desktop-light');

  const clicked = await cdp.eval(`(() => { const b = document.querySelector('[aria-label="Plan view"]'); if (!b) return false; b.click(); return true; })()`);
  check('desktop: Plan view button', clicked);
  await sleep(15000); // camera flight to top-down
  await cdp.shot('desktop-plan-light');

  const hidden = await cdp.eval(`(() => { window.__pesTwinReceive({ type: 'visible', visible: false }); const a = [document.hidden, document.visibilityState]; window.__pesTwinReceive({ type: 'visible', visible: true }); return a.concat([document.hidden, document.visibilityState]); })()`);
  check('desktop: visibility shim', JSON.stringify(hidden) === JSON.stringify([true, 'hidden', false, 'visible']), JSON.stringify(hidden));

  // WTG-04 P → 900 kW, BESS P → +250 kW (verified on the web code in the harness)
  await cdp.receive({ type: 'live', live: stampedLive(30, { p10329: 900, p10385: 250 }) });
  const ms = await waitFor(cdp, 'the live update', `document.body.innerText.includes('6.97 MW')`, 120_000).catch((e) => (check('desktop: live update', false, e.message), null));
  if (ms !== null) {
    s = await cdp.eval(STATE);
    check('desktop: live update → "6.97 MW", "16 producing", "3 idle"', s.buttons.includes('16 producing') && s.buttons.includes('3 idle'), `after ${ms} ms`);
  }
  s = await cdp.eval(STATE);
  const errors = s.events.filter((e) => e.type === 'error');
  check('desktop: still 0 errors / exceptions after theme, plan, visibility, live', errors.length === 0 && cdp.exceptions.length === 0, [...errors.map((e) => e.message), ...cdp.exceptions].join(' | '));
  const net = cdp.requests.filter((u) => !u.startsWith('data:') && !isPageUrl(u));
  check('desktop: still 0 network requests', net.length === 0, net.join(', '));
  cdp.close();
}

// ---- scenario 2: phone 390×844 @3x, touch ----------------------------------------------------------
async function phone() {
  console.log('\n[phone 390×844 @3x, touch] launching Chrome (SwiftShader)…');
  const cdp = await launch('phone', { width: 390, height: 844 });
  // emulate the phone BEFORE init: the twin reads (pointer: coarse) and the
  // pixel ratio when it mounts
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await waitFor(cdp, 'ready', `(window.__pesTwinEvents || []).some((e) => e.type === 'ready')`, 60_000);
  const t0 = Date.now();
  await cdp.receive({ type: 'init', sld: fixture.sld, live: stampedLive(60), theme: 'dark', siteName: fixture.siteName, host: 'inline', visible: true });
  console.log('  init sent; waiting for the first frame + intro…');
  await waitFor(cdp, 'the intro (.tw-tags.is-ready)', `!!document.querySelector('.tw-tags.is-ready') && document.body.innerText.includes('producing now')`, ENTER_TIMEOUT_MS);
  console.log(`  entered after ${Math.round((Date.now() - t0) / 1000)} s wall`);
  await sleep(4000);
  const s = await cdp.eval(STATE);
  checkCommon('phone', s, cdp);
  check('phone: coarse-pointer hint', /swipe/i.test(s.text), (s.text.match(/[^\n]*(Swipe|Drag)[^\n]*/) || [''])[0]);
  // Every gesture on the inline 3D is the twin's (the app holds its page
  // scroll while a finger is on it — bridge.js "gesture ownership").
  check('phone: inline touch-action none', s.touchAction === 'none', s.touchAction);
  await cdp.shot('phone-dark');

  // Gesture ownership, end to end (real touches → pointer events): a finger
  // on the canvas claims the app's page scroll at touch-DOWN (before any
  // movement) and releases it when it lifts; a drag stays one claim; a
  // finger on a HUD control (not the 3D) never claims.
  const gestures = () => cdp.eval(`(window.__pesTwinEvents || []).filter((e) => e.type === 'gesture').map((e) => e.active)`);
  const canvasPoint = () => cdp.eval(POINT_ON_CANVAS);
  const touchAt = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  const pt = await canvasPoint();
  check('phone: found a point on the canvas', !!pt, JSON.stringify(pt));
  if (pt) {
    await touchAt('touchStart', pt);
    await sleep(300);
    const down = await gestures();
    await touchAt('touchEnd', null);
    await sleep(300);
    const up = await gestures();
    check('phone: canvas touch → gesture claimed at touch-down, released on lift', JSON.stringify(down) === '[true]' && JSON.stringify(up) === '[true,false]', `down ${JSON.stringify(down)}, up ${JSON.stringify(up)}`);
    await touchAt('touchStart', pt);
    for (let i = 1; i <= 4; i++) await touchAt('touchMove', { x: pt.x, y: pt.y - 12 * i });
    await touchAt('touchEnd', null);
    await sleep(300);
    const drag = await gestures();
    check('phone: a vertical drag on the canvas = one claim + one release (no pointercancel)', JSON.stringify(drag) === '[true,false,true,false]', JSON.stringify(drag));
    // A HUD control over the canvas — not the 3D (the twin's tags are
    // pointer-events:none labels: a tap on one IS a canvas touch). Any of
    // the mix, the status legend or a tool button whose centre it is on top
    // at.
    const tag = await cdp.eval(`(() => {
      const els = [...document.querySelectorAll('.tw-tools button, .tw-legend, .tw-mix')];
      for (const t of els) {
        const r = t.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const p = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        const el = document.elementFromPoint(p.x, p.y);
        if (el && el.tagName !== 'CANVAS' && t.contains(el)) return { ...p, what: (t.getAttribute('aria-label') || t.className).slice(0, 40) };
      }
      return { none: els.length };
    })()`);
    if (tag && tag.x !== undefined) {
      await touchAt('touchStart', tag);
      await touchAt('touchEnd', null);
      await sleep(300);
      const after = await gestures();
      check('phone: a HUD control touch never claims (not the 3D)', JSON.stringify(after) === JSON.stringify(drag), `${tag.what}: ${JSON.stringify(after)}`);
    } else {
      check('phone: a HUD control to touch', false, JSON.stringify(tag));
    }
  }

  await cdp.receive({ type: 'init', sld: fixture.sld, live: stampedLive(60), theme: 'dark', siteName: fixture.siteName, host: 'fullscreen', visible: true });
  await sleep(1500);
  const full = await cdp.eval(STATE);
  check('phone: fullscreen host → touch-action none', full.touchAction === 'none' && full.htmlClass.includes('pes-host-fullscreen'), `${full.touchAction} / ${full.htmlClass}`);
  const fpt = await canvasPoint();
  if (fpt) {
    const before = await gestures();
    await touchAt('touchStart', fpt);
    await touchAt('touchEnd', null);
    await sleep(300);
    const after = await gestures();
    check('phone: the full screen never claims (no page scroll there)', JSON.stringify(after) === JSON.stringify(before), `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  } else {
    check('phone: found a point on the full-screen canvas', false, 'none');
  }
  cdp.close();
}

// ---- scenario 3: light page, mounted hidden ----------------------------------------------------------
// rAF callbacks are counted by wrapping requestAnimationFrame before init
// (the twin looks it up on every call).
const RAF_COUNTER = `(() => {
  if (window.__rafCount !== undefined) return true;
  window.__rafCount = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { window.__rafCount++; cb(t); });
  return true;
})()`;
async function hiddenLight() {
  console.log('\n[light page, init visible:false] launching Chrome (SwiftShader)…');
  const cdp = await launch('hidden', { width: 390, height: 844 }, PAGE_URLS.light);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await waitFor(cdp, 'ready', `(window.__pesTwinEvents || []).some((e) => e.type === 'ready')`, 60_000);
  const before = await cdp.eval(`({ body: document.body.className, bg: getComputedStyle(document.body).backgroundColor, sent: (window.__pesTwinEvents || []).map((e) => e.type) })`);
  check('hidden: the light page is light before init (no dark flash)', before.body === 'light' && before.bg === 'rgb(246, 248, 251)' && !before.sent.includes('mounted'), JSON.stringify(before));

  await cdp.eval(RAF_COUNTER);
  await cdp.receive({ type: 'init', sld: fixture.sld, live: stampedLive(60), theme: 'light', siteName: fixture.siteName, host: 'inline', visible: false });
  await waitFor(cdp, 'mounted', `(window.__pesTwinEvents || []).some((e) => e.type === 'mounted')`, 120_000);
  await sleep(2000); // the scene effect + any frame it asked for
  const r0 = await cdp.eval('window.__rafCount');
  await sleep(10_000);
  const r1 = await cdp.eval('window.__rafCount');
  const hidden = await cdp.eval('[document.hidden, document.visibilityState]');
  check('hidden: a twin mounted hidden runs no frames (10 s)', r1 - r0 <= 2 && hidden[0] === true, `${r1 - r0} rAF callbacks in 10 s, ${r0} before; document.hidden=${hidden[0]}`);

  await cdp.receive({ type: 'visible', visible: true });
  const ms = await waitFor(cdp, 'frames once shown', `window.__rafCount > ${r1}`, 300_000).catch((e) => (check('hidden: frames once shown', false, e.message), null));
  if (ms !== null) check('hidden: frames once shown', true, `first frame after ${ms} ms`);

  // Uncaught errors once the twin is up: the web keeps running → warn, never error.
  await cdp.eval(`(() => { window.dispatchEvent(new ErrorEvent('error', { error: new Error('smoke: pointer handler'), message: 'smoke: pointer handler' })); return true; })()`);
  await cdp.eval(`(() => { const e = new Event('unhandledrejection'); e.reason = new Error('smoke: rejected'); window.dispatchEvent(e); return true; })()`);
  const ev = await cdp.eval(`(window.__pesTwinEvents || []).filter((e) => e.type === 'warn' || e.type === 'error').map((e) => e.type + ' ' + e.where + ' ' + String(e.message).split('\\n')[0])`);
  const smokeEvents = ev.filter((e) => e.includes('smoke:'));
  check('hidden: uncaught errors after mount are warnings, not errors', smokeEvents.length === 2 && smokeEvents.every((e) => e.startsWith('warn ')) && !ev.some((e) => e.startsWith('error ')), JSON.stringify(ev));
  const net = cdp.requests.filter((u) => !u.startsWith('data:') && !isPageUrl(u));
  check('hidden: 0 network requests', net.length === 0, net.join(', '));
  cdp.close();
}

// ---- scenario 4: Grouped on the running page, desktop 1280×800 -------------------------------------
async function groupedDesktop() {
  console.log('\n[grouped, desktop 1280×800] launching Chrome (SwiftShader)…');
  const cdp = await launch('grouped', { width: 1280, height: 800 });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await waitFor(cdp, 'ready', `(window.__pesTwinEvents || []).some((e) => e.type === 'ready')`, 60_000);
  const t0 = Date.now();
  // Units first, as the app shows a site before the user switches.
  await cdp.receive({ type: 'init', sld: fixture.sld, live: stampedLive(60), theme: 'dark', siteName: fixture.siteName, host: 'inline', visible: true });
  console.log('  init (Units) sent; waiting for the first frame + intro…');
  await waitFor(cdp, 'the intro (.tw-tags.is-ready)', `!!document.querySelector('.tw-tags.is-ready') && document.body.innerText.includes('producing now')`, ENTER_TIMEOUT_MS);
  console.log(`  entered after ${Math.round((Date.now() - t0) / 1000)} s wall`);
  await sleep(4000);
  const unitsMix = await cdp.eval(MIX);
  check('grouped desktop: Units mix (reference)', unitsMix?.total === '5.82 MW' && unitsMix.rows.length === 3, JSON.stringify(unitsMix));
  const mounts = () => cdp.eval(`(window.__pesTwinEvents || []).filter((e) => e.type === 'mounted' || e.type === 'ready').length`);
  const before = await mounts();

  // Into Grouped, as SldTwinView sends it: the data first, then the diagram.
  const t1 = Date.now();
  await cdp.receive({ type: 'live', live: stampedLive(60, {}, groupedFixture.live) });
  await cdp.receive({ type: 'sld', sld: groupedFixture.sld });
  await waitFor(cdp, '7 grouped tags', tagCount(GROUPED_HEADINGS.length), 300_000);
  console.log(`  grouped scene after ${Math.round((Date.now() - t1) / 1000)} s wall`);
  await sleep(6000);
  await checkGrouped('grouped desktop', cdp, unitsMix);
  check('grouped desktop: switched on the running page (no new ready / mounted)', (await mounts()) === before, `${before} → ${await mounts()}`);
  await cdp.shot('desktop-grouped-dark');

  // The Wind · 6 readings card: the totals and the worded flow rule.
  const opened = await cdp.eval(`(() => { const b = [...document.querySelectorAll('.tw-tags > .tw-tag')].find((t) => (t.getAttribute('aria-label') || '').startsWith('Wind · 6,')); if (!b) return false; b.click(); return true; })()`);
  check('grouped desktop: Wind · 6 tag opens its readings card', opened);
  const card = await waitFor(cdp, 'the Wind · 6 readings card', `!!document.querySelector('aside.tw-card') && document.querySelector('aside.tw-card').innerText.includes('Wind · 6')`, 120_000)
    .then(() => cdp.eval(`document.querySelector('aside.tw-card').innerText`))
    .catch((e) => (check('grouped desktop: readings card', false, e.message), null));
  if (card !== null) {
    check('grouped desktop: card says "while Wind units flowing ≠ 0" and P 4,642 kW', /Wind units flowing ≠ 0/.test(card) && /4,642/.test(card), card.replace(/\n+/g, ' | ').slice(0, 400));
    await cdp.shot('desktop-grouped-card-dark');
  }

  // Back to Units: the diagram first, then the data.
  await cdp.receive({ type: 'sld', sld: fixture.sld });
  await cdp.receive({ type: 'live', live: stampedLive(60) });
  await waitFor(cdp, '20 unit tags', tagCount(fixture.sld.nodes.length), 300_000);
  await sleep(4000);
  const back = await cdp.eval(MIX);
  check('grouped desktop: back to Units — 20 tags, the same mix', JSON.stringify(back) === JSON.stringify(unitsMix), JSON.stringify(back));
  const s = await cdp.eval(STATE);
  check('grouped desktop: back to Units — WebGL canvas, no fallback', s.glCanvas && !s.fallback, s.fallback || '');
  await cdp.shot('desktop-units-again-dark');
  const errors = s.events.filter((e) => e.type === 'error');
  check('grouped desktop: still 0 errors / exceptions / requests after both switches', errors.length === 0 && cdp.exceptions.length === 0 && cdp.requests.filter((u) => !u.startsWith('data:') && !isPageUrl(u)).length === 0, [...errors.map((e) => e.message), ...cdp.exceptions].join(' | '));
  cdp.close();
  return unitsMix;
}

// ---- scenario 5: Grouped from init, phone 390×844 @3x ---------------------------------------------
async function groupedPhone(unitsMix) {
  console.log('\n[grouped, phone 390×844 @3x, touch] launching Chrome (SwiftShader)…');
  const cdp = await launch('grouped-phone', { width: 390, height: 844 });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await waitFor(cdp, 'ready', `(window.__pesTwinEvents || []).some((e) => e.type === 'ready')`, 60_000);
  const t0 = Date.now();
  await cdp.receive({ type: 'init', sld: groupedFixture.sld, live: stampedLive(60, {}, groupedFixture.live), theme: 'dark', siteName: groupedFixture.siteName, host: 'inline', visible: true });
  console.log('  init (Grouped) sent; waiting for the first frame + intro…');
  await waitFor(cdp, 'the intro (.tw-tags.is-ready)', `!!document.querySelector('.tw-tags.is-ready') && document.body.innerText.includes('producing now')`, ENTER_TIMEOUT_MS);
  console.log(`  entered after ${Math.round((Date.now() - t0) / 1000)} s wall`);
  await sleep(4000);
  const s = await checkGrouped('grouped phone', cdp, unitsMix);
  checkCommon('grouped phone', s, cdp, GROUPED_HEADINGS);
  await cdp.shot('phone-grouped-dark');
  cdp.close();
}

// ---- run -----------------------------------------------------------------------------------------------
console.log(`web twin smoke — build ${TWIN_BUILD_ID}, page ${Buffer.byteLength(TWIN_HTML)} B (${path.relative(ROOT, GENERATED)})`);
console.log(`tmp: ${TMP}`);
try {
  await desktop();
  stopChrome();
  started.length = 0;
  await phone();
  stopChrome();
  started.length = 0;
  await hiddenLight();
  stopChrome();
  started.length = 0;
  const unitsMix = await groupedDesktop();
  stopChrome();
  started.length = 0;
  await groupedPhone(unitsMix);
} catch (e) {
  check('run', false, String(e.stack || e));
} finally {
  stopChrome();
  if (!KEEP) for (const d of fs.readdirSync(TMP)) if (d.startsWith('profile-')) fs.rmSync(path.join(TMP, d), { recursive: true, force: true });
}
console.log(`\nscreenshots:\n${shots.map((f) => `  ${f}`).join('\n') || '  (none)'}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
