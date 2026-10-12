// build.mjs — inline the vendored web twin into ONE self-contained HTML page
// and write it as SldTwin/twinHtml.generated.js (TWIN_HTML, TWIN_BUILD_ID,
// TWIN_MANIFEST, TWIN_THEME_PLACEHOLDER). Deterministic: the same vendor/
// inputs give the same bytes.
//
//   node scripts/web-twin/build.mjs            regenerate
//   node scripts/web-twin/build.mjs --check    exit 1 if the committed file is stale
//   node scripts/web-twin/build.mjs --html <file>   also write the raw page (debugging)
//
// Page order (the turbopack runtime MUST come after every other chunk):
//           the third-party notices (THIRD_PARTY_NOTICES.txt + the Inter
//           OFL) as an HTML comment — the chunks carry no licence comments
//   <head>  Inter @font-face rules (data URIs, every subset) · the 3 web CSS
//           files · app.css · config (build id + module ids for bridge.js) ·
//           the pre-runtime TURBOPACK array
//   <body class="__PES_TWIN_THEME__">  #root · the chunks · the turbopack
//           runtime · bridge.js
//
// The <body> class is a placeholder (TWIN_THEME_PLACEHOLDER, exactly once in
// the page): the app replaces it with 'dark' / 'light' before loading the
// page, so the page's first paint is already in the app's theme (bridge.js
// boots with that class; later flips are `theme` messages).
//
// Why the runtime goes last: every chunk pushes `document.currentScript` as
// its chunk id and the runtime reads its `src` — null for an inline script
// (TypeError). Until the runtime loads, `globalThis.TURBOPACK` is our array,
// whose push() swaps the src-less script for a string id and drops the
// runtime's own entry push (the Next.js bootstrap: router, _app, auth — never
// run). The runtime then drains the array: module factories only.
import fs from 'node:fs';
import path from 'node:path';
import {
  GENERATED,
  HERE,
  MAX_HTML_BYTES,
  MODULE_ROLES,
  ROOT,
  escapeInlineScript,
  fail,
  md5,
  readManifest,
  readVendored,
} from './lib.mjs';

const args = process.argv.slice(2);
const htmlOut = args.includes('--html') ? args[args.indexOf('--html') + 1] : null;
const check = args.includes('--check');

const manifest = readManifest();
for (const role of MODULE_ROLES) if (typeof manifest.modules?.[role] !== 'number') fail(`manifest.modules.${role} is missing`);

const files = []; // TWIN_MANIFEST.files, in page order
const track = (name, buf) => {
  files.push({ name, bytes: buf.length, md5: md5(buf) });
  return buf;
};
const local = (name) => track(name, fs.readFileSync(path.join(HERE, name)));

const THEME_PLACEHOLDER = '__PES_TWIN_THEME__';

// ---- notices -----------------------------------------------------------------------
// MIT and OFL both require their notice in every copy: they ship inside the
// page itself. An HTML comment may not contain "<!--", "-->" or "--!>".
const notices = [
  local('THIRD_PARTY_NOTICES.txt').toString('utf8').trimEnd(),
  track('fonts/OFL.txt', fs.readFileSync(path.join(HERE, 'vendor/fonts/OFL.txt'))).toString('utf8').trimEnd(),
].join('\n\n');
if (/<!--|-->|--!>/.test(notices)) fail('THIRD_PARTY_NOTICES.txt / OFL.txt contain "<!--", "-->" or "--!>" — they would break the notices comment');

// ---- styles ------------------------------------------------------------------------
const styles = [];
for (const font of manifest.fonts) {
  const buf = track(`${font.dir}/${font.name}`, readVendored(font));
  styles.push({
    attr: `data-src="${font.dir}/${font.name}"`,
    css: `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};font-display:block;src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');unicode-range:${font.unicodeRange}}`,
  });
}
for (const entry of manifest.css) styles.push({ attr: `data-chunk="${entry.name}"`, css: track(`${entry.dir}/${entry.name}`, readVendored(entry)).toString('utf8') });
styles.push({ attr: 'data-src="app.css"', css: local('app.css').toString('utf8') });
for (const s of styles) if (/<\/style/i.test(s.css)) fail(`${s.attr}: CSS contains "</style" — it would end the inline <style> element`);

// ---- scripts -----------------------------------------------------------------------
const config = { build: manifest.buildId, modules: Object.fromEntries(MODULE_ROLES.map((r) => [r, manifest.modules[r]])) };
const preRuntime = `window.__PES_TWIN_CONFIG__=${JSON.stringify(config)};
(function () {
  var arr = [];
  arr.push = function () {
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      // the runtime's own entry (Next.js bootstrap): never run
      if (Array.isArray(a) && a.length === 2 && a[1] && typeof a[1] === 'object' && 'runtimeModuleIds' in a[1]) continue;
      // an inline <script> has no src: give the chunk a string id instead
      if (Array.isArray(a) && a[0] && typeof a[0] === 'object' && !a[0].getAttribute('src')) a[0] = 'inline/' + (a[0].getAttribute('data-chunk') || 'chunk-' + i);
      Array.prototype.push.call(this, a);
    }
    return this.length;
  };
  globalThis.TURBOPACK = arr;
  // only used by lazy chunk loads; the closure has none (vendor.mjs checks)
  globalThis.TURBOPACK_CHUNK_BASE_PATH = './_next/';
})();`;

const scripts = [];
let escapes = 0;
const addScript = (attr, js, label) => {
  if (js.includes('<!--')) fail(`${label}: contains "<!--" — it would change how the HTML parser finds </script>`);
  const { text, count } = escapeInlineScript(js);
  escapes += count;
  if (count) console.log(`  ${label}: ${count} "</script" escaped as "<\\/script"`);
  scripts.push(`<script ${attr}>${text}</script>`);
};
for (const entry of manifest.chunks) addScript(`data-chunk="${entry.name}"`, track(`${entry.dir}/${entry.name}`, readVendored(entry)).toString('utf8'), entry.name);
addScript(`data-chunk="${manifest.runtime.name}"`, track(`${manifest.runtime.dir}/${manifest.runtime.name}`, readVendored(manifest.runtime)).toString('utf8'), manifest.runtime.name);
addScript('data-src="bridge.js"', local('bridge.js').toString('utf8'), 'bridge.js');

// ---- page ---------------------------------------------------------------------------
const html = `<!doctype html>
<!-- GENERATED by scripts/web-twin/build.mjs from ${manifest.origin} build ${manifest.buildId} (vendored ${manifest.vendoredOn}). Do not edit: see scripts/web-twin/README.md. -->
<!--
${notices}
-->
<html lang="en" class="pes-host-inline">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="pes-twin-build" content="${manifest.buildId}">
<title>PES 3D twin</title>
${styles.map((s) => `<style ${s.attr}>${s.css}</style>`).join('\n')}
<script data-src="pre-runtime">${preRuntime}</script>
</head>
<body class="${THEME_PLACEHOLDER}">
<div id="root"></div>
${scripts.join('\n')}
</body>
</html>
`;
// The app fills the FIRST occurrence: it must be the <body> class, and the only one.
if (html.split(THEME_PLACEHOLDER).length !== 2) fail(`${THEME_PLACEHOLDER} must occur exactly once in the page (the <body> class)`);
const htmlBytes = Buffer.byteLength(html, 'utf8');
if (htmlBytes > MAX_HTML_BYTES) fail(`the page is ${htmlBytes} B, over the ${MAX_HTML_BYTES} B target`);

// ---- module -------------------------------------------------------------------------
// Plain CommonJS with one string literal: no syntax beyond what Metro, babel-jest
// and Node accept as-is. ASCII only (every non-ASCII char as \uXXXX), so no
// tool can mis-decode it.
const jsString = (s) => JSON.stringify(s).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
const twinManifest = { files, totalBytes: files.reduce((s, f) => s + f.bytes, 0), htmlBytes };
const moduleText = `// GENERATED by scripts/web-twin/build.mjs - do not edit (types: twinHtml.generated.d.ts).
// The web portal's own compiled 3D twin (${manifest.origin}, build ${manifest.buildId}) as one
// self-contained HTML page; inputs and their md5s: scripts/web-twin/vendor/manifest.json.
// prettier-ignore
exports.TWIN_BUILD_ID = ${JSON.stringify(manifest.buildId)};
// prettier-ignore
exports.TWIN_MANIFEST = ${JSON.stringify(twinManifest)};
// prettier-ignore
exports.TWIN_THEME_PLACEHOLDER = ${JSON.stringify(THEME_PLACEHOLDER)};
// prettier-ignore
exports.TWIN_HTML = ${jsString(html)};
`;

if (check) {
  const current = fs.existsSync(GENERATED) ? fs.readFileSync(GENERATED, 'utf8') : '';
  if (current !== moduleText) fail(`${path.relative(ROOT, GENERATED)} is stale — run: node scripts/web-twin/build.mjs`);
  console.log(`${path.relative(ROOT, GENERATED)} is up to date (build ${manifest.buildId}, ${htmlBytes} B page)`);
  process.exit(0);
}

fs.writeFileSync(GENERATED, moduleText);
if (htmlOut) fs.writeFileSync(path.resolve(htmlOut), html);
for (const f of files) console.log(`  ${f.name.padEnd(36)} ${String(f.bytes).padStart(8)} B  ${f.md5}`);
console.log(`page ${htmlBytes} B (target ≤ ${MAX_HTML_BYTES}), module ${Buffer.byteLength(moduleText)} B, ${escapes} "</script" escaped`);
console.log(`wrote ${path.relative(ROOT, GENERATED)}${htmlOut ? ` and ${htmlOut}` : ''}`);
