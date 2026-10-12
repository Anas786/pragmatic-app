// vendor.mjs — fetch (or restore) the web portal's compiled 3D twin into
// scripts/web-twin/vendor/ and write vendor/manifest.json.
//
//   node scripts/web-twin/vendor.mjs                       re-download the manifest's build, verify every md5
//   node scripts/web-twin/vendor.mjs --build <id> --html-runtimes <turbopack-a.js,turbopack-b.js>
//                                                          vendor ANOTHER web build (after a web deploy)
//   node scripts/web-twin/vendor.mjs --from-generated      offline: restore vendor/ from the committed
//                                                          twinHtml.generated.js and verify every md5
//   node scripts/web-twin/vendor.mjs --fonts-only          re-fetch only Inter (every subset) into the
//                                                          manifest; the chunks / CSS stay as they are
// Options: --twin <id> --react <id> --jsx <id> --reactDomClient <id> --reactRedux <id>
//          --sldModel <id> --sldLook <id>
//          (override the auto-detected module ids), --refresh-fonts (re-fetch Inter).
//
// Network: only public files under <origin>/_next/static/ (the same files
// every visitor's browser downloads) and Google Fonts. Never a page, an API
// or a sign-in.
//
// How the closure is found (proven in the original harness, see README):
//  1. <origin>/_next/static/<build>/_buildManifest.js → the site-view page
//     chunk (route /apps/site/view); with the turbopack runtime chunks the
//     site's HTML loads (`--html-runtimes`: Next's `main` and `_app` — they
//     carry the smallest react / react-redux chunks) → crawl every
//     `static/chunks/*.js` they reference, transitively (that reaches the
//     lazily loaded twin chunks).
//  2. Evaluate every chunk with a recording TURBOPACK → module id →
//     factory source + the chunks that carry it; deps = `<ctx>.<x>(<id>)`.
//  3. Detect the 7 modules bridge.js needs (twin, react-dom/client, and the
//     twin's react / jsx-runtime / react-redux imports by source signature;
//     its SLD-model imports `fromSldV2` / `lookOf` by the export they register),
//     take the dependency closure of {twin, react-dom/client} — it must be
//     complete and have NO lazy imports (a lazy chunk load would hit the
//     network) — and cover it with the fewest bytes of chunks.
//  4. The page's own turbopack runtime chunk (all runtimes are the same
//     code) goes last in the page.
//  5. CSS: the `_app` runtime (one of `--html-runtimes`) lists every global
//     CSS file; the three the twin needs are picked by content (theme
//     tokens, the `.spf-panel` host tokens, the `sld-*` / `tw-*` styles).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import {
  GENERATED,
  MANIFEST,
  MODULE_ROLES,
  ORIGIN,
  ROOT,
  VENDOR,
  fail,
  fetchStatic,
  md5,
  readJson,
  unescapeInlineScript,
  vendorPath,
  writeJson,
} from './lib.mjs';

const ROUTE = '/apps/site/view';
const CRAWL_LIMIT = 600;
const FETCH_CONCURRENCY = 8;
const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
const FONT_WEIGHTS = [400, 500, 600, 700];
// Google serves woff2 only to a modern browser user agent.
const FONT_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const CSS_ROLES = [
  { role: 'theme', why: 'global theme tokens (body / body.light --bg-*, --ink-*, --brand*)', markers: ['body{--bg-0:', 'body.light{--bg-0:'] },
  { role: 'host', why: 'site-view host panel tokens (.spf-panel / .spf-panel.light)', markers: ['.spf-panel{', '.spf-panel.light{'] },
  { role: 'twin', why: 'the twin styles (.sld-* / .tw-*)', markers: ['.sld-canvas.tw-view{', '.tw-tags.is-ready{'] },
];

// ---- args ----------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
function opt(name) {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) fail(`--${name} needs a value`);
  return v;
}
const previous = fs.existsSync(MANIFEST) ? readJson(MANIFEST) : null;

if (flag('from-generated')) {
  restoreFromGenerated();
} else if (flag('fonts-only')) {
  await refreshFontsOnly();
} else {
  await vendorFromWeb();
}

// ---- fonts only -------------------------------------------------------------------
async function refreshFontsOnly() {
  if (!previous) fail('vendor/manifest.json is missing: vendor a build first');
  const fonts = await vendorFonts();
  writeJson(MANIFEST, { ...previous, fonts });
  for (const e of fonts) console.log(`  ${`${e.dir}/${e.name}`.padEnd(36)} ${String(e.bytes).padStart(8)} B  ${e.md5}`);
  console.log(`Inter: ${fonts.length} subsets, ${fonts.reduce((s, e) => s + e.bytes, 0)} B → ${path.relative(ROOT, MANIFEST)}\nnext: node scripts/web-twin/build.mjs && node scripts/web-twin/smoke.mjs`);
}

// ---- offline restore -------------------------------------------------------------
function restoreFromGenerated() {
  if (!previous) fail('vendor/manifest.json is missing: nothing to verify the restored files against');
  if (!fs.existsSync(GENERATED)) fail(`${path.relative(ROOT, GENERATED)} is missing — run vendor.mjs without --from-generated`);
  const { TWIN_HTML, TWIN_BUILD_ID } = createRequire(import.meta.url)(GENERATED);
  if (TWIN_BUILD_ID !== previous.buildId) fail(`the generated page is build ${TWIN_BUILD_ID}, the manifest says ${previous.buildId}`);
  const blocks = new Map();
  for (const m of TWIN_HTML.matchAll(/<script data-chunk="([^"]+)">([\s\S]*?)<\/script>/g)) blocks.set(`chunks/${m[1]}`, unescapeInlineScript(m[2]));
  for (const m of TWIN_HTML.matchAll(/<style data-chunk="([^"]+)">([\s\S]*?)<\/style>/g)) blocks.set(`css/${m[1]}`, m[2]);
  const entries = [...previous.chunks, previous.runtime, ...previous.css];
  for (const entry of entries) {
    const text = blocks.get(`${entry.dir}/${entry.name}`);
    if (text == null) fail(`${entry.dir}/${entry.name} is not in the generated page`);
    const buf = Buffer.from(text, 'utf8');
    if (buf.length !== entry.bytes || md5(buf) !== entry.md5) fail(`restored ${entry.dir}/${entry.name} does not match the manifest md5`);
  }
  resetDir('chunks');
  resetDir('css');
  for (const entry of entries) fs.writeFileSync(vendorPath(entry), blocks.get(`${entry.dir}/${entry.name}`), 'utf8');
  console.log(`restored ${entries.length} files of build ${previous.buildId} from ${path.relative(ROOT, GENERATED)} — every md5 matches the manifest`);
}

// ---- download ------------------------------------------------------------------------
async function vendorFromWeb() {
  const buildId = opt('build') ?? previous?.buildId;
  const sameBuild = !opt('build') || opt('build') === previous?.buildId;
  const htmlRuntimes = opt('html-runtimes')?.split(',').map((s) => s.trim()).filter(Boolean) ?? (sameBuild ? previous?.htmlRuntimes : undefined);
  if (!buildId) fail('--build <buildId> is required (no manifest yet)');
  if (!htmlRuntimes?.length || htmlRuntimes.some((n) => !/^turbopack-[A-Za-z0-9_-]+\.js$/.test(n))) {
    fail('--html-runtimes <turbopack-a.js,turbopack-b.js> is required for a new build: the turbopack-*.js files of the <script src="/_next/static/chunks/…"> tags in the site\'s HTML (view source of the sign-in page) — Next\'s main + _app runtimes');
  }
  console.log(`build ${buildId} · route ${ROUTE} · html runtimes ${htmlRuntimes.join(', ')}`);

  // 1. build manifest → page chunk
  const bm = await fetchStatic(`${ORIGIN}/_next/static/${buildId}/_buildManifest.js`).catch((e) => fail(`build ${buildId} is not served by ${ORIGIN} (${e.message})`));
  const sandbox = { self: {} };
  vm.runInNewContext(bm.toString('utf8'), sandbox, { timeout: 5000 });
  const pageFiles = sandbox.self.__BUILD_MANIFEST?.[ROUTE];
  if (!Array.isArray(pageFiles) || pageFiles.length === 0) fail(`route ${ROUTE} is not in the build manifest`);

  // 2. crawl
  const chunks = await crawl([...pageFiles, ...htmlRuntimes.map((n) => `static/chunks/${n}`)]);
  console.log(`crawled ${chunks.size} chunks`);
  const pageChunk = path.basename(pageFiles[0]);
  const pageRuntimes = [...new Set(chunks.get(pageChunk).toString('utf8').match(/turbopack-[A-Za-z0-9_-]+\.js/g) ?? [])];
  if (pageRuntimes.length !== 1) fail(`expected one turbopack runtime in ${pageChunk}, found ${pageRuntimes.join(', ') || 'none'}`);
  const runtimeName = pageRuntimes[0];

  // 3. index + detect + closure
  const index = indexModules(chunks);
  console.log(`indexed ${index.size} modules`);
  const modules = detectModules(index);
  const closure = computeClosure(index, [modules.twin, modules.reactDomClient]);
  for (const role of MODULE_ROLES) if (!closure.has(modules[role])) fail(`module ${role} (${modules[role]}) is not in the closure`);
  const chosen = coverClosure(index, closure, chunks);

  // 4. CSS
  const cssNames = [...new Set(htmlRuntimes.flatMap((n) => chunks.get(n).toString('utf8').match(/static\/chunks\/[A-Za-z0-9_.-]+\.css/g) ?? []))].map((p) => path.basename(p));
  if (cssNames.length === 0) fail(`${htmlRuntimes.join(', ')} list no CSS — is the _app runtime among them?`);
  const cssFiles = new Map();
  await mapLimit(cssNames, FETCH_CONCURRENCY, async (name) => cssFiles.set(name, await fetchStatic(`${ORIGIN}/_next/static/chunks/${name}`)));
  const css = CSS_ROLES.map(({ role, why, markers }) => {
    const hits = cssNames.filter((n) => markers.every((m) => cssFiles.get(n).toString('utf8').includes(m)));
    if (hits.length !== 1) fail(`CSS for ${why}: expected exactly one file with ${markers.join(' + ')}, found ${hits.join(', ') || 'none'} (of ${cssNames.length})`);
    return { role, name: hits[0] };
  });

  // 5. fonts
  const fonts = await vendorFonts();

  // 6. write
  resetDir('chunks');
  resetDir('css');
  const entry = (dir, name, buf, extra = {}) => {
    fs.writeFileSync(path.join(VENDOR, dir, name), buf);
    return { dir, name, bytes: buf.length, md5: md5(buf), ...extra };
  };
  const manifest = {
    comment: 'Generated by scripts/web-twin/vendor.mjs — the web files inlined into SldTwin/twinHtml.generated.js. chunks/ and css/ are not committed (restore: vendor.mjs --from-generated).',
    origin: ORIGIN,
    buildId,
    route: ROUTE,
    pageChunk,
    htmlRuntimes,
    vendoredOn: new Date().toISOString().slice(0, 10),
    modules,
    closure: { roots: [modules.twin, modules.reactDomClient], moduleCount: closure.size, moduleIds: [...closure].sort((a, b) => a - b) },
    chunks: chosen.map((name) => entry('chunks', name, chunks.get(name), { modules: [...closure].filter((id) => index.get(id).chunks.includes(name)).length })),
    runtime: entry('chunks', runtimeName, chunks.get(runtimeName)),
    css: css.map(({ role, name }) => entry('css', name, cssFiles.get(name), { role })),
    fonts,
  };
  if (previous && previous.buildId === buildId) assertSameBuild(previous, manifest);
  if (previous && previous.vendoredOn && previous.buildId === buildId) manifest.vendoredOn = previous.vendoredOn;
  writeJson(MANIFEST, manifest);
  report(previous, manifest);
}

// ---- crawl -------------------------------------------------------------------------------
async function crawl(pageFiles) {
  const out = new Map();
  const queued = new Set(pageFiles.map((p) => path.basename(p)));
  let frontier = [...queued];
  while (frontier.length) {
    const next = [];
    await mapLimit(frontier, FETCH_CONCURRENCY, async (name) => {
      const buf = await fetchStatic(`${ORIGIN}/_next/static/chunks/${name}`).catch((e) => fail(`chunk ${name}: ${e.message}`));
      out.set(name, buf);
      for (const ref of buf.toString('utf8').match(/static\/chunks\/[A-Za-z0-9_.-]+\.js/g) ?? []) {
        const n = path.basename(ref);
        if (!queued.has(n)) {
          queued.add(n);
          next.push(n);
        }
      }
    });
    if (queued.size > CRAWL_LIMIT) fail(`crawl exceeded ${CRAWL_LIMIT} chunks`);
    frontier = next;
  }
  return out;
}

async function mapLimit(items, limit, fn) {
  let i = 0;
  const worker = async () => {
    while (i < items.length) await fn(items[i++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

// ---- module index ----------------------------------------------------------------------------
// Each chunk is `(globalThis.TURBOPACK||…).push([script, id, factory, id, factory, …])`;
// a runtime chunk pushes `[script, {otherChunks, runtimeModuleIds}]` first.
function indexModules(chunks) {
  const index = new Map(); // id → { src, chunks[], deps[], lazy[] }
  for (const name of [...chunks.keys()].sort()) {
    const pushes = [];
    const ctx = { TURBOPACK: { push: (a) => pushes.push(a) }, __turbopack_load_page_chunks__: () => {}, self: {}, window: {}, document: undefined };
    ctx.globalThis = ctx;
    try {
      vm.runInNewContext(chunks.get(name).toString('utf8'), ctx, { timeout: 5000 });
    } catch {
      // runtime chunks run their bootstrap after the push and fail without a DOM: the push was recorded
    }
    for (const a of pushes) {
      if (!Array.isArray(a) || (a.length === 2 && a[1] && typeof a[1] === 'object')) continue;
      let pending = [];
      for (let i = 1; i < a.length; i++) {
        if (typeof a[i] === 'function') {
          const src = a[i].toString();
          for (const id of pending) {
            if (!index.has(id)) index.set(id, { src, chunks: [] });
            index.get(id).chunks.push(name);
          }
          pending = [];
        } else {
          pending.push(a[i]);
        }
      }
    }
  }
  for (const m of index.values()) {
    const v = (m.src.match(/^\(?\s*([A-Za-z_$][\w$]*)/) ?? [])[1] ?? 'e';
    const re = new RegExp(`(?<![\\w$.])${v.replace(/\$/g, '\\$')}\\.([a-zA-Z])\\((\\d+)\\)`, 'g');
    const deps = new Set();
    const lazy = new Set();
    for (const mm of m.src.matchAll(re)) (mm[1] === 'A' ? lazy : deps).add(Number(mm[2]));
    m.deps = [...deps];
    m.lazy = [...lazy];
  }
  return index;
}

// ---- module roles -------------------------------------------------------------------------------
// A re-export shim (`t.exports = e.r(N)`) stands for its target.
function resolveShim(index, id) {
  const src = index.get(id)?.src ?? '';
  const m = src.length < 600 ? src.match(/\.exports=[A-Za-z_$][\w$]*\.r\((\d+)\)/) : null;
  return m && index.has(Number(m[1])) ? Number(m[1]) : id;
}
function detectModules(index) {
  const ids = [...index.keys()];
  const src = (id) => index.get(resolveShim(index, id))?.src ?? '';
  const unique = (role, list) => {
    if (list.length !== 1) fail(`cannot detect module "${role}" (${list.length} candidates: ${list.slice(0, 8).join(', ')}) — pass --${role} <id>`);
    return list[0];
  };
  const pick = (role, detect) => {
    const forced = opt(role);
    return forced !== undefined ? Number(forced) : detect();
  };
  const twin = pick('twin', () => unique('twin', ids.filter((id) => index.get(id).src.includes('sld-page sld-embed tw-page'))));
  if (!index.has(twin)) fail(`twin module ${twin} is not in the crawled chunks`);
  const twinDeps = index.get(twin).deps;
  // The twin import that registers export `name`. One factory can register
  // several modules (`e.s([…, "name", 0, value, …], id)` per module, all
  // sharing its source), so the module is the id closing the registration
  // that lists the name — the first `],<id>)` after it that is one of this
  // factory's ids.
  const registeredBy = (id, name) => {
    const s = index.get(id).src;
    const at = s.indexOf(`"${name}",0,`);
    if (at < 0) return null;
    const close = /\],(\d+)\)/g;
    close.lastIndex = at;
    for (let m; (m = close.exec(s)); ) if (index.get(Number(m[1]))?.src === s) return Number(m[1]);
    return null;
  };
  const exporter = (role, name) => unique(role, twinDeps.filter((id) => registeredBy(id, name) === id));
  const modules = {
    jsx: pick('jsx', () => unique('jsx', twinDeps.filter((id) => src(id).includes('.jsxs=')))),
    react: pick('react', () => unique('react', twinDeps.filter((id) => /\.useState=function/.test(src(id)) && /\.version="/.test(src(id))))),
    reactDomClient: pick('reactDomClient', () =>
      unique('reactDomClient', ids.filter((id) => index.get(id).src.includes('checkDCE') && resolveShim(index, id) !== id && src(id).includes('.createRoot=')))),
    reactRedux: pick('reactRedux', () => unique('reactRedux', twinDeps.filter((id) => src(id).includes('react-redux') && src(id).includes('"Provider"')))),
    twin,
    sldModel: pick('sldModel', () => exporter('sldModel', 'fromSldV2')),
    sldLook: pick('sldLook', () => exporter('sldLook', 'lookOf')),
  };
  for (const role of MODULE_ROLES) if (!index.has(modules[role])) fail(`module ${role} (${modules[role]}) is missing from the crawled chunks`);
  console.log('modules', modules);
  return modules;
}

// ---- closure + chunk cover -------------------------------------------------------------------------
function computeClosure(index, roots) {
  const seen = new Set();
  const missing = [];
  const lazy = new Set();
  const stack = [...roots];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const m = index.get(id);
    if (!m) {
      missing.push(id);
      continue;
    }
    stack.push(...m.deps);
    m.lazy.forEach((x) => lazy.add(x));
  }
  if (missing.length) fail(`the closure of ${roots.join(', ')} needs modules that no crawled chunk carries: ${missing.join(', ')}`);
  if (lazy.size) fail(`the closure has lazy imports (they would load chunks over the network): ${[...lazy].join(', ')}`);
  console.log(`closure of ${roots.join(' + ')}: ${seen.size} modules`);
  return seen;
}

// Greedy set cover: repeatedly take the chunk covering the most still-needed
// modules per byte (ties → name order, so the result is deterministic).
function coverClosure(index, closure, chunks) {
  const byChunk = new Map();
  for (const id of closure) for (const c of index.get(id).chunks) (byChunk.get(c) ?? byChunk.set(c, new Set()).get(c)).add(id);
  const left = new Set(closure);
  const chosen = [];
  while (left.size) {
    let best = null;
    let bestScore = -1;
    for (const c of [...byChunk.keys()].sort()) {
      let n = 0;
      for (const id of byChunk.get(c)) if (left.has(id)) n++;
      const score = n / chunks.get(c).length;
      if (n > 0 && score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    chosen.push(best);
    for (const id of byChunk.get(best)) left.delete(id);
  }
  return chosen.sort();
}

// ---- fonts -------------------------------------------------------------------------------------------
// Every subset Google serves for Inter — what the web loads (its stylesheet
// is the whole css2 response; the browser fetches a subset when a glyph in
// its unicode-range is drawn: Σ of the twin's group tags is greek, equipment
// names may need latin-ext …). Here each one is inlined; the browser still
// only decodes the ones it draws. Kept in the CSS's order: where ranges
// overlap the browser tries the LAST declared face first, as on the web.
async function vendorFonts() {
  const prev = previous?.fonts;
  if (prev?.length && !flag('refresh-fonts') && !flag('fonts-only')) {
    const intact = prev.every((f) => fs.existsSync(vendorPath(f)) && md5(fs.readFileSync(vendorPath(f))) === f.md5);
    if (intact) return prev;
  }
  const cssText = (await fetchStatic(FONT_CSS_URL, { headers: { 'User-Agent': FONT_UA } })).toString('utf8');
  const faces = [...cssText.matchAll(/\/\* ([a-z0-9-]+) \*\/\s*@font-face\s*\{([^}]*)\}/g)].map(([, subset, block]) => ({
    subset,
    weight: Number((block.match(/font-weight:\s*(\d+)/) ?? [])[1]),
    url: (block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/) ?? [])[1],
    unicodeRange: (block.match(/unicode-range:\s*([^;]+);/) ?? [])[1],
  }));
  const subsets = [...new Set(faces.map((f) => f.subset))];
  if (!subsets.includes('latin')) fail(`Inter: the Google Fonts CSS has no latin subset (got ${subsets.join(', ') || 'none'})`);
  const fontsDir = path.join(VENDOR, 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  const out = [];
  for (const subset of subsets) {
    const mine = faces.filter((f) => f.subset === subset);
    const urls = new Set(FONT_WEIGHTS.map((w) => mine.find((f) => f.weight === w)?.url));
    if (urls.size !== 1 || urls.has(undefined)) fail(`Inter ${subset}: expected ONE variable woff2 for weights ${FONT_WEIGHTS.join('/')}, got ${[...urls].join(', ')}`);
    const ranges = new Set(mine.map((f) => f.unicodeRange));
    if (ranges.size !== 1 || ranges.has(undefined)) fail(`Inter ${subset}: expected one unicode-range for every weight, got ${[...ranges].join(' | ')}`);
    const url = [...urls][0];
    const buf = await fetchStatic(url, { headers: { 'User-Agent': FONT_UA } });
    const name = `inter-${subset}.woff2`;
    fs.writeFileSync(path.join(fontsDir, name), buf);
    out.push({
      dir: 'fonts',
      name,
      bytes: buf.length,
      md5: md5(buf),
      family: 'Inter',
      subset,
      // one variable font (wght axis) serves every weight the twin uses
      weight: `${FONT_WEIGHTS[0]} ${FONT_WEIGHTS[FONT_WEIGHTS.length - 1]}`,
      unicodeRange: [...ranges][0],
      source: url,
      css: FONT_CSS_URL,
      license: 'fonts/OFL.txt',
    });
  }
  // a subset Google no longer serves leaves no stale file behind
  for (const f of fs.readdirSync(fontsDir)) if (f.endsWith('.woff2') && !out.some((e) => e.name === f)) fs.unlinkSync(path.join(fontsDir, f));
  return out;
}

// ---- helpers ---------------------------------------------------------------------------------------------
function resetDir(dir) {
  const full = path.join(VENDOR, dir);
  fs.mkdirSync(full, { recursive: true });
  for (const f of fs.readdirSync(full)) fs.unlinkSync(path.join(full, f));
}

function assertSameBuild(prev, next) {
  const key = (e) => `${e.dir}/${e.name}`;
  const prevFiles = new Map([...prev.chunks, prev.runtime, ...prev.css].map((e) => [key(e), e.md5]));
  for (const e of [...next.chunks, next.runtime, ...next.css]) {
    const was = prevFiles.get(key(e));
    if (was && was !== e.md5) fail(`${key(e)} changed for the SAME build ${next.buildId} (md5 ${was} → ${e.md5}) — the website served different bytes under an immutable name`);
  }
  for (const role of MODULE_ROLES) {
    if (prev.modules?.[role] !== next.modules[role]) fail(`module ${role}: detected ${next.modules[role]}, the manifest has ${prev.modules?.[role]} for the same build — fix the detector or pass --${role}`);
  }
}

function report(prev, next) {
  const files = [...next.chunks, next.runtime, ...next.css, ...next.fonts];
  for (const e of files) console.log(`  ${`${e.dir}/${e.name}`.padEnd(36)} ${String(e.bytes).padStart(8)} B  ${e.md5}${e.role ? `  (${e.role})` : ''}${e.modules ? `  ${e.modules} modules` : ''}`);
  console.log(`  total ${files.reduce((s, e) => s + e.bytes, 0)} B`);
  if (!prev) return;
  const names = (m) => new Set([...m.chunks, m.runtime, ...m.css].map((e) => e.name));
  const a = names(prev);
  const b = names(next);
  const added = [...b].filter((n) => !a.has(n));
  const removed = [...a].filter((n) => !b.has(n));
  if (prev.buildId === next.buildId && !added.length && !removed.length) console.log(`build ${next.buildId}: unchanged, every md5 verified`);
  else console.log(`vs build ${prev.buildId}: +${added.join(', +') || ' none'} / -${removed.join(', -') || ' none'}\nnext: node scripts/web-twin/build.mjs && node scripts/web-twin/smoke.mjs`);
}
