# web-twin — the web portal's 3D twin, packaged for the app

The SLD "3D" view in the app is the **web portal's own compiled 3D twin**: the
same JavaScript and CSS files <https://www.pragmaticengineeringsolutions.com>
serves, byte for byte, packed into one offline HTML page that runs in a
`react-native-webview` (`SiteDetail/components/SldTwin/`). This folder is the
dev-time pipeline that makes that page. Nothing here ships except its output,
`SldTwin/twinHtml.generated.js`.

| | |
|---|---|
| Web build | `V8bQ6PlHPUKSpJxgVf8cc` (Next.js build id), vendored 2026-10-09 |
| Twin | turbopack module **748776** (chunk `28y14me-d_32j.js`), `default({ sld, liveValues, siteName, isLight, onExit, … })` |
| Closure | 28 modules from {748776, 681912 `react-dom/client`}: React 19.3.0, react-dom, react-redux 9, the SLD model lib, three.js r186 + 3 addons, the twin |
| Page | the third-party notices · 8 chunks + the turbopack runtime (1,333,454 B) · 3 CSS files (338,022 B) · Inter, every subset (218,888 B woff2) · `app.css` · `bridge.js` → **≈ 2.0 MB** HTML, ≈ 2.04 MB module |
| Exact files + md5 | `vendor/manifest.json` (and `TWIN_MANIFEST` in the generated module) |

## Files

| File | What |
|---|---|
| `vendor.mjs` | Finds the twin's dependency closure in a web build, downloads the chunks + CSS + Inter, writes `vendor/manifest.json` (md5 + bytes of every file). Fails loudly on a missing module, a lazy import (it would load over the network), an md5 change under the same build, or an ambiguous module / CSS match. `--from-generated` restores `vendor/` offline from the committed page; `--fonts-only` re-fetches only Inter. |
| `build.mjs` | Inlines everything into ONE page and writes `twinHtml.generated.js` (`TWIN_HTML`, `TWIN_BUILD_ID`, `TWIN_MANIFEST`, `TWIN_THEME_PLACEHOLDER`). The page starts with the third-party notices as an HTML comment; its `<body>` class is a theme placeholder the app fills (exactly once — checked). Deterministic. `--check` fails if the committed file is stale; `--html <file>` also writes the raw page (placeholder unfilled). |
| `THIRD_PARTY_NOTICES.txt` | The MIT notices of the open-source code in the chunks; build.mjs puts it and the Inter OFL into every copy of the page. |
| `bridge.js` | The page side of the app ⇄ page protocol (the app side: `SldTwin/protocol.ts` — change them together). Mounts the twin bare, re-implements the web's `liveValues` hook, a tiny redux store, the `document.hidden` shim, error reporting, and gives the app's Grouped-mode group nodes their members' 3D model with the web's own `lookOf` ("grouped looks"). |
| `app.css` | The only CSS changes, appended after the vendored CSS (whose bytes are never edited): canvas fills the WebView, the twin's toolbar hidden, full-screen `touch-action: none`, body background `--bg-0`, Inter, `--brand-rgb`. |
| `smoke.mjs` | Renders the GENERATED page in headless Chrome (isolated profile, SwiftShader) with the Lucky Cement fixture and asserts the web's own output; a third run checks the light page before `init`, a twin mounted hidden (no frames until shown) and post-mount errors as warnings; two Grouped runs (a Units → Grouped → Units switch on the running page, desktop; Grouped from `init`, phone) check the 7 grouped tags, the "producing now" mix equal to Units, the groups' models (Wind · 6 = direct-drive, Solar · 9 = solarLg) and the worded flow rule on the readings card. Prints screenshot paths. |
| `fixture.mjs` → `fixtures/lucky.json` | The smoke input: `src/data/mock/sld.ts` (raw `sldV2` + readings) as the app sends it. |
| `fixtures/lucky-grouped.json` | The Grouped smoke input: the app adapter's own output (`SldTwin/twinGrouped.ts`, `twinDataFor('grouped', …)`) for `lucky.json`. `__tests__/sldTwinGrouped.test.ts` fails when it differs and rewrites it with `SLD_TWIN_WRITE_FIXTURES=1 npx jest __tests__/sldTwinGrouped.test.ts` (after `fixture.mjs`, or any change to the adapter / the grouping). |
| `lib.mjs` | Shared paths and helpers. |
| `vendor/manifest.json` | Committed. Build id, module ids (`jsx`, `react`, `reactDomClient`, `reactRedux`, `twin`, and the web SLD model's `sldModel` = `fromSldV2` / `sldLook` = `lookOf`), closure, every inlined file with md5 + bytes. |
| `vendor/fonts/` | Committed: `inter-<subset>.woff2` — every subset Google Fonts serves for Inter v4 (latin, latin-ext, greek, greek-ext, cyrillic, cyrillic-ext, vietnamese; one variable font each for weights 400–700), inlined with their own `unicode-range` like the web loads them (the twin's group tags draw a greek Σ) — + `OFL.txt`. |
| `vendor/chunks/`, `vendor/css/` | **Not committed** (`.gitignore`). |

**Why the chunks are not committed:** they are 1.67 MB of minified third-party and
web code nobody can review, and every byte of them is already in the committed
`twinHtml.generated.js` (verbatim; the only change is one `</script` → `<\/script`
inside a react-dom string, which is the same string value). The manifest pins
each file's md5, so `node scripts/web-twin/vendor.mjs --from-generated` restores
them exactly, offline, and `vendor.mjs` without it re-downloads them from the
website (and fails if a single byte differs). The font IS committed: Google can
change the file behind the same CSS URL, and it is small.

## Commands

Node ≥ 22 (built-in `fetch` / `WebSocket`). From the repo root:

```sh
node scripts/web-twin/vendor.mjs --from-generated   # restore vendor/ offline (after a fresh clone)
node scripts/web-twin/build.mjs                      # regenerate SldTwin/twinHtml.generated.js
node scripts/web-twin/build.mjs --check              # is the committed page up to date?
node scripts/web-twin/vendor.mjs --fonts-only        # re-fetch Inter (every subset) only, then build
node scripts/web-twin/smoke.mjs                      # headless render + assertions (≈ 10–15 min, 5 Chrome runs)
node scripts/web-twin/fixture.mjs                    # rebuild fixtures/lucky.json from src/data/mock/sld.ts
SLD_TWIN_WRITE_FIXTURES=1 npx jest __tests__/sldTwinGrouped.test.ts   # then rebuild fixtures/lucky-grouped.json
```

`smoke.mjs` needs Google Chrome (`--chrome <path>` or `CHROME_PATH` elsewhere).
SwiftShader (software GL) blocks the page for 60–90 s compiling the twin's 15
shader programs and then draws ≈ 1 frame/s, so the run is slow; a real phone GPU
is not. It only ever kills the Chrome processes it started (matched by its own
random profile directory, killed by exact PID).

## Re-sync after a web deploy

Module ids and chunk names change with every web build. The vendored page keeps
working forever — it just stops tracking the web. To follow a new web build:

1. Find the new build id and the runtime chunks the site's HTML loads: open the
   sign-in page in a browser → View Source → the `/_next/static/<buildId>/…`
   paths give the build id; the `<script src="/_next/static/chunks/turbopack-….js">`
   tags are Next's `main` and `_app` runtimes (the `_app` one lists the CSS).
2. `node scripts/web-twin/vendor.mjs --build <buildId> --html-runtimes turbopack-a.js,turbopack-b.js`
   — it crawls the `/apps/site/view` page chunks, detects the seven modules
   `bridge.js` needs — five by source signature, `sldModel` / `sldLook` by
   the export they register (`fromSldV2` / `lookOf`; one turbopack factory
   registers several modules, so the id is the one closing that
   registration) — (override any with `--twin <id>`, `--react`, `--jsx`,
   `--reactDomClient`, `--reactRedux`, `--sldModel`, `--sldLook`), computes
   the closure, picks the smallest chunk cover and the three CSS files by
   content, and prints what changed.
3. `node scripts/web-twin/build.mjs`, then `node scripts/web-twin/smoke.mjs`.
   The smoke asserts the Lucky figures the web showed on 2026-10-09 ("5.82 MW
   producing now", "14 producing / 1 drawing / 4 idle", 20 tags, the live
   update to 6.97 MW; Grouped: 7 tags, the same mix, Wind · 6 = direct-drive).
   If the web changed its wording or numbers on purpose, update the
   assertions; if it changed the twin's props, its redux key
   (`site.unprocessedLiveParameters`) or `lookOf`'s arguments, update
   `bridge.js`.
4. Check the app on a device (the page is the same on iOS and Android) and
   commit the manifest, the generated module and any bridge changes together.

What can silently change on the web side: the twin's prop contract, the redux
shape, the `liveValues` rules of the web hook (re-implemented in `bridge.js`),
CSS class names used by `app.css` (`.sld-toolbar`, `.sld-canvas`, `.tw-canvas`,
`.spf-panel`), its strings. The smoke test catches most of it.

## How the page works (details: `build.mjs`, `bridge.js` headers)

- The turbopack runtime runs WITHOUT the Next.js bootstrap: a pre-runtime
  `TURBOPACK` array drops the runtime's own entry (router, `_app`, auth, MUI —
  never evaluated) and names the inline chunks; the runtime goes last.
- `bridge.js` registers its own module to get a `require`, loads the five
  modules, posts `ready`, and mounts the twin on `init` — bare: no web toolbar,
  no "Diagram | 3D" switch, no "Streaming" tag (the app draws its own header and
  its honest freshness). The twin sits in an element with the web host's
  `.spf-panel` class only for its colour tokens; `app.css` removes that panel's
  frame.
- The app serves the page with its theme as the `<body>` class (the
  `__PES_TWIN_THEME__` placeholder), and bridge.js boots from it, so the
  first paint is already in the app's theme; later flips are `theme`
  messages.
- Live values follow the web hook: `lodash.get(store, param)`, numbers to 2
  decimals, "—" for missing, 0 decimals at ≥ 1000; flow = the node's
  `animation` rule, read the way the web's mathjs reads it (the six
  comparisons, its number literals and constants, its tolerance; anything
  mathjs would throw on is idle — `__tests__/sldTwinBridge.test.ts`). The
  liveValues object keeps its identity until the diagram or the live data
  change, as the web memoises it. Site expressions (`explve…`) and group
  formulas are not evaluated — the app has no expression evaluator either.
- A twin mounted or rebuilt while hidden runs no frames: the bridge replays
  the hidden state to it after every commit (the twin reads
  `document.hidden` only in its `visibilitychange` listener).
- Grouped | Units: the app's Grouped mode (`SldTwin/twinGrouped.ts`) sends
  the Diagram's own grouping as REGULAR sldV2 nodes ("Wind · 6": the
  grouping's id, position, rows reading synthetic `live.<id>.value` params
  the app adds to the envelope, a worded flow rule) with the raw members in
  `data.pesGroupMembers`. Before the twin sees the diagram, the bridge
  resolves every member exactly as the twin resolves a node (`fromSldV2`,
  then `lookOf`), takes the majority model and pins it on the group (the
  members' asset, else `look`, else `look` + their icon — each confirmed with
  `lookOf`), then removes `pesGroupMembers`; when none matches (or the model
  modules are missing: a `warn`, never fatal) the group keeps its own icon /
  title. The result is memoised per diagram object; the log of the last
  resolution is `window.__pesTwinGroupLooks`. Never the web's own group
  schema (`aggregation`, `groupMembers`, an edge into the node) — the twin
  draws that as a plain "junction" cabinet.
- Every NEW diagram (an `sld` message — a Grouped | Units switch, a config
  refetch — or a second `init`) mounts a NEW twin (React key = diagram
  generation), so it gets a fresh canvas. The twin's own in-place rebuild
  disposes its renderer with `forceContextLoss()` and creates the next one on
  the SAME canvas, whose context is lost for good: it showed "3D isn't
  available here" after the first switch in the smoke. The web never hits it
  (it remounts the twin per site). Live data, theme and visibility carry
  over; camera, selection and Plan view start fresh.
- Errors: fatal (`error`, the app falls back to the Diagram) only when the
  twin can't run — a boot failure, React's `onUncaughtError`, an uncaught
  error before the twin is up or once nothing is rendered. An uncaught
  error while it is up is a `warn` (the web keeps running on it too).
- Offline: no network request of any kind (fonts are data URIs; the smoke test
  asserts zero requests). Never load the twin from the live site: Apple 2.5.2
  forbids downloading executable code.

## Licences and the public repo

This repository is **public**. The vendored chunks are the same files the
website serves publicly, unauthenticated, to every visitor under
`/_next/static/` — client bundles with no credentials (checked: only React's
form-type tables, an auth-context factory that is never executed, and the
public logo CDN template). The web portal code (the twin, the SLD model
library) is the company's own.

| Component | Licence |
|---|---|
| three.js r186 (core, WebGLRenderer, RoomEnvironment, RoundedBoxGeometry, BufferGeometryUtils) | MIT |
| React 19.3, react-dom, scheduler | MIT |
| react-redux 9, use-sync-external-store | MIT |
| The turbopack runtime (Next.js) | MIT |
| Inter 4 (© 2016 The Inter Project Authors) | SIL Open Font License 1.1 — `vendor/fonts/OFL.txt` |
| The twin, the SLD model library | Pragmatic Energy Solution's own web code |

The web build strips licence comments from the chunks, so the notices do not
travel with them. `build.mjs` therefore puts `THIRD_PARTY_NOTICES.txt` (the
MIT texts, copied from the packages' own LICENSE files) and `OFL.txt` into the
page itself, as an HTML comment at its top — every copy of the page carries
them (`--check` covers them like everything else). The app has no licences
screen; if one is added, it should list the same components.
