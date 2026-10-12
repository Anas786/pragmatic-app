// Shared paths and helpers of the web-twin pipeline (vendor / build / smoke).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export const VENDOR = path.join(HERE, 'vendor');
export const MANIFEST = path.join(VENDOR, 'manifest.json');
export const GENERATED = path.join(
  ROOT,
  'src/components/screens/Authenticated/SiteDetail/components/SldTwin/twinHtml.generated.js',
);

/** The website the chunks come from; only its public `/_next/static/` files are ever fetched. */
export const ORIGIN = 'https://www.pragmaticengineeringsolutions.com';
const ALLOWED_FETCH = [`${ORIGIN}/_next/static/`, 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

/**
 * The modules bridge.js requires, by role. `sldModel` (fromSldV2) and
 * `sldLook` (lookOf) are the web's own SLD model code the twin imports:
 * the bridge uses them to give an app GROUP node (Grouped mode) its
 * members' 3D model.
 */
export const MODULE_ROLES = ['jsx', 'react', 'reactDomClient', 'reactRedux', 'twin', 'sldModel', 'sldLook'];

/** Generated page size target (UTF-8 bytes). */
export const MAX_HTML_BYTES = 2_200_000;

export const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');

export function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

export function readManifest() {
  if (!fs.existsSync(MANIFEST)) fail(`${path.relative(ROOT, MANIFEST)} is missing — run: node scripts/web-twin/vendor.mjs --build <buildId> --app-runtime <turbopack-*.js>`);
  return readJson(MANIFEST);
}

/** `vendor/<dir>/<name>` of a manifest entry ({dir: 'chunks'|'css'|'fonts', name}). */
export const vendorPath = (entry) => path.join(VENDOR, entry.dir, entry.name);

/** Reads a vendored file and checks it against its manifest md5 + size. */
export function readVendored(entry) {
  const file = vendorPath(entry);
  const rel = path.relative(ROOT, file);
  if (!fs.existsSync(file)) {
    fail(`${rel} is missing — restore the vendored files with: node scripts/web-twin/vendor.mjs --from-generated   (offline, from the committed page)   or   node scripts/web-twin/vendor.mjs   (re-download)`);
  }
  const buf = fs.readFileSync(file);
  if (buf.length !== entry.bytes || md5(buf) !== entry.md5) {
    fail(`${rel} does not match the manifest (bytes ${buf.length} vs ${entry.bytes}, md5 ${md5(buf)} vs ${entry.md5})`);
  }
  return buf;
}

/** GET a public file (website static files, Google Fonts only), with retries. */
export async function fetchStatic(url, { headers = {}, tries = 3 } = {}) {
  if (!ALLOWED_FETCH.some((p) => url.startsWith(p))) throw new Error(`refusing to fetch ${url}: not a public static file`);
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers, redirect: 'error' });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { notFound: true });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      if (e.notFound) break;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

// ---- inline <script> safety --------------------------------------------------
// Inside an HTML <script> element the first `</script` (any case) ends the
// element, whatever JS context it sits in. `<\/script` is the same string
// value in a JS string / template / regex literal, so it is rewritten (case
// kept). `<!--` would put the HTML tokenizer into the "script data escaped"
// state, where a later `<script` changes how `</script>` is found — the
// vendored chunks have none, and build.mjs refuses any that do.
const SCRIPT_CLOSE = /<\/(script)/gi;
const SCRIPT_CLOSE_ESCAPED = /<\\\/(script)/gi;

export function escapeInlineScript(js) {
  let count = 0;
  const text = js.replace(SCRIPT_CLOSE, (_m, word) => {
    count++;
    return `<\\/${word}`;
  });
  return { text, count };
}

/** Inverse of escapeInlineScript (exact as long as the original had no `<\/script`; md5 checks it). */
export const unescapeInlineScript = (js) => js.replace(SCRIPT_CLOSE_ESCAPED, (_m, word) => `</${word}`);
