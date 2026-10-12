# Pragmatic Energy Solution — Mobile App Context

> **Purpose**: drop a fresh Claude session into the same context the previous
> sessions had. Read this before touching code. Updated for the **v2 design
> system + redesign** that's now shipped across every primary screen.

---

## 1. Project at a glance

React Native 0.77.3 (TypeScript) mobile dashboard for **Pragmatic Energy Solution**
— energy-monitoring platform for solar / wind / grid / genset / battery sites.
Backend is AWS-hosted (Cognito + CloudFront + API Gateway + Lambda). Mobile app
talks to a CloudFront-fronted REST API.

```
yarn ios    # iOS build
yarn android
yarn start  # Metro
yarn start --reset-cache   # after env / asset changes
yarn test
yarn lint
```

Quick health-check anytime: **`npx tsc --noEmit`** — should be zero errors anywhere.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | React Native 0.77.3, React 18.3 |
| Auth | AWS Cognito (User Pool SRP) via `aws-amplify@6.16.4` + `@aws-amplify/react-native@1.3.3` |
| Networking | `axios@1.7.9` |
| Server state | `@tanstack/react-query@5.62` (mostly `useQuery`, plus `useInfiniteQuery` for the site list) |
| Local state | `zustand@5.0.6` (theme, user, app config) |
| Navigation | `@react-navigation/native` + native-stack + drawer |
| Forms | `react-hook-form@7.54` + `yup@1.6` |
| Charts | `react-native-gifted-charts` (bar, line, pie) — **kept**, only visually refreshed |
| Animations | `react-native-reanimated@3.16.7`, `lottie-react-native@7.3.6`, `react-native-linear-gradient@2.8.3` |
| Storage | `@react-native-async-storage/async-storage` |
| Env | `react-native-dotenv` (`@env` import) |
| Logger | Reactotron (dev only) |

---

## 3. Backend

| Thing | Value |
|---|---|
| API base URL | `https://d28614wxzuokob.cloudfront.net` (CloudFront → API Gateway in `ap-southeast-1`) |
| API Gateway direct | `https://qpd9twkb6d.execute-api.ap-southeast-1.amazonaws.com/Prod/` |
| Public asset CDN | `https://d1syhs8qvp9sng.cloudfront.net` (site logos) |
| Cognito Region | `ap-southeast-1` |
| Cognito User Pool | `ap-southeast-1_HvF8AdDd1` |
| Cognito Mobile Client | `6umtg1l889sv8ot3jabgd31hl` (`mobile-client-v2`, since 2026-09-27; old `27sa4crum5hb010qar9sja1l09` is being retired) |
| Cognito Identity Pool | `ap-southeast-1:3e0c5cdc-877a-4db7-9a77-8f85c668acff` |
| IoT Endpoint | `a1wxyzja5wktis-ats.iot.ap-southeast-1.amazonaws.com` (not yet wired) |

All values live in `.env` and `src/types/env.d.ts`. Hard-coded fallbacks in
`src/utils/constants/app.ts` and `src/config/amplify.ts` so runtime never crashes
if env injection fails. OpenAPI spec is in `openapi.yaml` at the repo root.

---

## 4. v2 design system — READ THIS BEFORE STYLING ANYTHING

The app went through a full visual redesign. There's a strict design system
in place — using it is **mandatory** for any new screen / component.

### 4.1 Tokens — `src/theme/tokens.ts`

The single source of truth for **colors, spacing, radii, type, shadow, motion**.

```ts
// Spacing — 4px grid
space.xs = 4  space.sm = 8  space.md = 12  space.lg = 16
space.xl = 20  space['2xl'] = 24  space['3xl'] = 32  space['4xl'] = 48

// Radii
radius.sm = 6  radius.md = 12  radius.lg = 16  radius.xl = 20
radius['2xl'] = 28  radius.pill = 9999

// Elevation (use as preset name, not raw values)
elevation.none | sm | md | lg | xl

// Motion
duration.instant = 120  fast = 180  base = 240  slow = 320  expressive = 480
spring.responsive | gentle | expressive | cushion   // Reanimated 3 spring configs

// Glass overlays (theme-agnostic; for use on saturated/gradient bgs)
glass.subtle | low | medium | strong              // backgrounds
glass.borderSubtle | border                       // borders
glass.textMuted | textBold                        // text on glass
glass.transparent                                 // for gradient sheen end-stops

// Energy source palette (use these — never hardcode the hex)
energyPalette.solar    = '#84CC16'  // lime
energyPalette.wind     = '#06B6D4'  // cyan
energyPalette.grid     = '#3B82F6'  // blue
energyPalette.genset   = '#F97316'  // orange
energyPalette.battery  = '#A855F7'  // purple

// Semantic
semantic.success | warning | danger | info
```

### 4.2 `useScheme()` — `src/theme/index.ts`

The theme-aware hook. Replaces the legacy `useThemeStore().colors`. Returns a
`ColorScheme` object with **semantic** color slots that flip between light and
dark mode automatically:

```ts
const scheme = useScheme();

scheme.bg              // page background (FAFAFA / 0A0E1A)
scheme.surface         // cards (FFFFFF / 111827)
scheme.surfaceRaised   // raised surfaces (FFFFFF / 1F2937)
scheme.surfaceMuted    // inactive pill bg (F4F5F7 / 171F2E)

scheme.textPrimary     // body text (111827 / F9FAFB)
scheme.textSecondary   // labels (6B7280 / 9CA3AF)
scheme.textTertiary    // placeholders / overlines (9CA3AF / 6B7280)
scheme.textOnBrand     // text on brand-fill (FFFFFF / 0A0E1A)

scheme.brand           // primary brand emerald (10B981 / 34D399)
scheme.brandSoft       // 10-14% brand fill (selected backgrounds)
scheme.brandBold       // hover/pressed
scheme.accentGold      // premium accent (used sparingly)

scheme.hairline        // dividers (rgba 6%)
scheme.border          // visible 1px borders

scheme.skeletonBase | skeletonHighlight   // Skeleton component fills

// Hero gradient (brand variant — emerald)
scheme.heroGradient: [c1, c2, c3]
scheme.heroOnGradient        // text on gradient (white-ish)
scheme.heroOnGradientMuted   // muted text on gradient (pale mint)
scheme.heroGlow              // iOS shadow color under hero

// Hero gradient (danger variant — used by AlarmsView when alarms are unsolved)
scheme.heroDangerGradient: [c1, c2, c3]
scheme.heroDangerOnGradientMuted
scheme.heroDangerGlow

scheme.isDark           // boolean for any branching
```

**Don't use the legacy `useThemeStore().colors.X` keys in new code.** They still
work — `src/utils/theme/colors.ts` is a compat shim that re-derives from the
scheme tokens — but new code should pull from `useScheme()`.

**Referential stability (perf pass)**: `useScheme()` returns one of two
module-level singletons (light/dark) — the reference only changes on theme
flip. It is therefore safe in `useMemo`/`useCallback` deps and as a prop to
`React.memo` children. Never mutate the returned object (it's shared app-wide).

### 4.3 Shared primitives — `src/components/common/`

Pulled out as part of the refactor. **Use these instead of hand-rolling.**

| Primitive | Purpose |
|---|---|
| `AppText` | Wrapper around `<Text>` with weight props (`bold`/`medium`/`semi_bold`/`center`) and per-instance color/size |
| `AppTextInput` | Theme-aware `<TextInput>` — auto-applies textPrimary color, textTertiary placeholder, Poppins-Regular font, zero internal padding. `forwardRef` enabled so `.focus()` still works. |
| `Surface` | Soft-elevated card. Props: `elevation` (`none`/`sm`/`md`/`lg`/`xl`), `radius`, `background`, `padding`, `bordered` |
| `PressableScale` | Tappable that responds with spring-based scale + optional haptic. Built on RN `Pressable` (NOT gesture-handler) so it composes cleanly with FlatList scroll + TextInput focus |
| `Skeleton` | Animated shimmer loader. Use instead of `ActivityIndicator` for content-loading states |
| `PulseDot` | Pulsing brand-coloured dot for LIVE indicators. Single shared implementation. **Don't duplicate.** |
| `OverlineLabel` | Section heading (`POWER MIX`, `TOTAL LOAD`, etc.) — uppercase, `letterSpacing: 1.5`, bold. **Use everywhere** instead of `<AppText style={overline}>` |
| `GlassChip` | Translucent white pill for hero contexts (count chips, period chips, param pills). Uses `glass.medium` bg + `glass.borderSubtle` border |
| `PowerMixBar` | Segmented horizontal flex bar visualising a source/severity mix. Props: `segments` (`[{key, color, weight}, ...]`), `height`, `radius`, `trackColor`, `minWeight`, `gap` |
| `HeroGradientCard` | The premium 3-layer gradient hero (shadow / clip / content). Props: `variant` (`'brand'` \| `'danger'`), `hideSheen`, `padding`. Used on every redesigned tab's top card |
| *(v4)* | `ScreenHeader`, `Pill`/`PillGroup`, `FreshnessStatus`, `HeroStatusBadge`, `SiteLogo`, `Avatar`, `IconButton`, `EmptyStateCard` kind — see **§22.2** |
| `PESLogo` | The PES brand mark as vector art (`width`, `height`, `tone: 'auto'\|'light'\|'dark'`). **Theme-aware ink** from the `brandMark` token: white on dark, `#092819` on light. Use it wherever the logo sits directly on the themed background — the bundled `logo.png` is light-background artwork and vanishes in dark mode (Login uses PESLogo; Dashboard/AboutUs keep the PNG on their white/glass tiles). Same glyph paths as the splash (`PESLogo/glyphs.ts`) |

### 4.4 Shared helpers — `src/utils/sources.ts`

```ts
sourceTokenFromName(name)    // → 'solar' | 'wind' | 'grid' | 'genset' | 'battery' | undefined
shortSourceLabel(name)       // → 'Solar' / 'Wind' / 'Grid' / 'Genset' / 'Battery' / truncated
formatCompact(value)         // → "121.4K" / "17K" / "1.0B" / "850" — accepts number|string|null
numericCardValue(value)      // → number | null  (parses "NA" / strings, returns null on non-numeric)
```

Re-exported from `src/utils` so you can `import { formatCompact } from 'src/utils'`.

### 4.5 Haptics — `src/utils/haptics.ts`

`haptics.tap()` / `select()` / `success()` / `warning()` / `error()`.

**v4: `PressableScale` haptics default OFF** — see §22.2.

Currently a no-op on iOS + Vibration fallback on Android. To upgrade to true
Taptic Engine: `yarn add react-native-haptic-feedback` + `cd ios && pod install`,
then swap the body of each helper. Call sites don't change.

### 4.6 Lottie recolor (Cards tab tile icon)

The bundled icon Lotties (`revenue.json`, `meter.json`) had `#E4E4E4` (near-white)
strokes that were invisible on tinted backgrounds.

- **`revenue.json`** was patched in-place to deep gold (`#9C7A1F`) — bundle-time fix.
- **`meter.json`** was patched in-place to slate-700 (`#374151`) AND gets a **runtime theme-aware recolor** via a `recolorLottie(source, hex)` helper in `CardsView.tsx`. The helper walks the JSON and rewrites every `c.k` color triplet, caching by `(source, hex)`. Used by `SourceTile` to set the strokes to `scheme.textPrimary` (light = slate-900, dark = slate-50).

`lottie-react-native`'s `colorFilters` prop is unreliable when keypaths use the
`.primary` / `.secondary` dot-prefix convention (it silently no-ops). The
JSON-clone approach is deterministic.

### 4.7 Reanimated false-positive warning ⚠️

Reanimated has a heuristic that fires "shared value `.value` inside inline
style" warnings whenever ANY `.value` property access appears inside an inline
style object — even on plain JS objects.

**Rule**: never write `style={{ flex: someObject.value, ... }}` where `someObject`
is a plain JS object with a `.value` property. Either:
- **Rename the property** (e.g. `breakdown[i].value` → `breakdown[i].count` /
  `.amount`), or
- **Extract to a local before the JSX** (e.g.
  `const flexShare = s.value; return <View style={{ flex: flexShare }} />`)

The audit was done; the codebase is currently clean of this.

---

## 5. File layout (current state)

```
src/
├── App.tsx (top-level)
├── theme/                  ← v2 design system
│   ├── tokens.ts           ← colors / space / radius / elevation / type / spring
│   └── index.ts            ← useScheme() + barrel
├── assets/
│   ├── icons/              (SVG components — generic UI icons)
│   ├── gif/
│   │   ├── raw/            (flat .gif files for the Cards-tab map — re-encoded to 128×128, perf pass)
│   │   ├── lottie-icons.ts (lottiePathGif map + optional `lottieSource` for vector variants)
│   │   ├── GifImage/       (plain <Image> GIF wrapper)
│   │   └── index.ts        (barrel — exports ONLY GifImage + lottie-icons; legacy wrappers deleted)
│   ├── lottie/             (Lottie JSON animations — only the 5 referenced files remain)
│   ├── images/             (static images)
│   └── svg/                (misc SVG)
├── components/
│   ├── common/             ← shared design-system primitives
│   │   ├── AppText, AppTextInput, Surface, PressableScale, Skeleton,
│   │   ├── PulseDot, OverlineLabel, GlassChip, PowerMixBar,
│   │   ├── HeroGradientCard
│   │   └── (legacy survivors: Avatar, EmptyStateCard — the other legacy
│   │        components were deleted in the July 2026 dead-code sweep)
│   └── screens/
│       ├── Onboarding/     (Splash = cold-start SplashOverlay, see §20; Login)
│       └── Authenticated/
│           ├── Dashboard/  ← site-list grid (redesigned)
│           │   └── index.tsx (also defines SearchBar, MetricChip, SiteCard inline)
│           ├── SiteDetail/ ← per-site screen (redesigned header + body)
│           │   └── components/
│           │       ├── TabSelector.tsx           (top tab strip — Summary/Cards/Live/Alarms/Trend/Reports/Tables)
│           │       ├── ViewsContent.tsx          (tab dispatch)
│           │       ├── SummaryView.tsx           ← HeroGradientCard + Env Impact + SLD
│           │       ├── CardsView.tsx             ← HeroGradientCard + PowerMixBar + bento tiles
│           │       ├── LiveParameterView.tsx     ← LIVE header + category filters + 2-col bento
│           │       ├── AlarmsView.tsx            ← HeroGradientCard (brand/danger variant) + severity bar + alarm rows
│           │       ├── TrendView.tsx             (Chart Analysis card + TrendAnalysisCard)
│           │       ├── ReportsView.tsx           (PerformanceReportCard only)
│           │       ├── TablesView.tsx            (InverterTableCard only)
│           │       ├── DateFilterHeader.tsx      ← v2: section-overline pattern, NOT a bar
│           │       ├── DateRangePickerModal.tsx  (Custom range, max 1 month — still uses @react-native-community/datetimepicker)
│           │       ├── MonthYearPickerModal.tsx  (Month / Year picker)
│           │       ├── PerformanceReportCard.tsx ← period hero + Sources card + stacked bar (v4, §8)
│           │       ├── InverterTableCard.tsx     ← fleet hero + compact InverterRows (v4, §8)
│           │       ├── TrendAnalysisCard.tsx     (line chart, gifted-charts)
│           │       ├── SLDDiagram.tsx / SLDFullscreenScreen.tsx / SLDViewport.tsx  (energy-flow hosts + the Diagram's pan/zoom surface, §19 / §23)
│           │       ├── SldTwin/                 ← "3D" = the web portal's own twin in a WebView (§23)
│           │       ├── GradientRangeBar.tsx      ← v2: Surface elevation, semantic gradient
│           │       └── …
│           └── Profile, AboutUs, ContactUs, TermsAndConditions
├── config/
│   └── amplify.ts          (Amplify.configure + Hub listener)
├── data/mock/              (still some mocks — see "What's still mock" below)
├── hooks/
│   ├── useAuth.ts
│   ├── useLogin.ts
│   ├── useLogout.ts
│   ├── useUserStore.ts     (Zustand)
│   ├── useThemeStore.ts    (Zustand, persist — `isDark` only; new code uses `useScheme()`)
│   ├── useAppConfigStore.ts (Zustand persist — params-mapping)
│   ├── useBootstrap.ts     (cold-start fetches)
│   ├── useSiteList.ts      (paginated infinite-query + server-side search)
│   ├── useSiteData.ts      ( /protected/data/all/{siteId} )
│   ├── useSiteConfig.ts    ( /protected/config/site/{siteId} )
│   ├── useSwitchActiveSite.ts (atomic site change → cache eviction + prefetch)
│   ├── useReportMapping.ts ( /public/config/report-mapping )
│   ├── useEnergyReport.ts  ( /protected/data/v2/report?type=energy_queries )
│   └── useInverterReport.ts ( /protected/data/v2/report?type=inverter_queries )
├── networking/
│   ├── config.ts           (appAxios + interceptors + executeLogout)
│   ├── auth/
│   │   ├── cognito.ts      (signIn, signOut, currentUser, etc.)
│   │   └── session.ts      (token cache + getValidAccessToken with auto-refresh)
│   ├── user/index.ts       (paginated getSiteList + search)
│   ├── site/index.ts       (getSiteAllData, getSiteConfig, getInverterReport, getEnergyReport, ReportFilter union)
│   └── config-service/index.ts (public config endpoints)
├── routes/
│   ├── index.tsx           (root: Onboarding ↔ Drawer)
│   ├── onboardingStack.tsx
│   ├── drawerNavigator.tsx
│   └── dashboardStack.tsx  (Dashboard → SiteDetail)
├── types/
│   ├── auth.ts, user.ts, site.ts, cards.ts, config.ts, navigation.ts, env.d.ts, app.ts
│   └── index.ts            (barrel)
└── utils/
    ├── constants/app.ts    (BASE_URL, ASSETS_CDN, WIDTH, HEIGHT)
    ├── theme/              ← legacy compat shim (re-derives `darkColors`/`lightColors` from scheme tokens)
    │   ├── colors.ts       (ThemeColors keys — kept working for unmigrated legacy screens)
    │   └── index.ts        (legacy constants — `ACCENT_GREEN`, `ENERGY_SOURCE_*`, etc.; mapped to v2 palette)
    ├── format/             (formatDate, normalizeFont/Width/Height)
    ├── schema/             (yup schemas)
    ├── jwt.ts              (decodeJwt, isTokenExpired)
    ├── logger.ts           (display, log — Reactotron + console)
    ├── site.ts             (buildSiteLogoUrl)
    ├── cards.ts            (Cards-tab resolver: dataStore branching, dotted objKey walker)
    ├── reports.ts          (buildReportFilter, formatChartLabel, formatDateFilterLabel, daysAgo, MonthSelection)
    ├── sources.ts          ← v2: sourceTokenFromName / shortSourceLabel / formatCompact / numericCardValue
    ├── haptics.ts          ← v2: haptic abstraction
    └── (re-exports everything above)
```

---

## 6. Authentication

Single source of truth = **Amplify**. We never store tokens manually.

- `signIn` → `cognitoSignIn(username, password)` (USER_SRP_AUTH). Handles `NEW_PASSWORD_REQUIRED` challenge.
- Tokens persist via `@aws-amplify/react-native` (AsyncStorage adapter). Survives app restarts.
- **Every axios request** runs through the request interceptor → `getValidAccessToken()` → either returns the cached **accessToken** or reads the user-pool token provider (`cognitoUserPoolsTokenProvider.getTokens({forceRefresh})`), which refreshes when needed. 60-s expiry buffer corrected by Amplify's stored `clockDrift`, in-flight dedup, in-memory cache (`session.ts`).
- **Not `fetchAuthSession()`** (2026-10-01): with an identity pool configured it ALSO calls GetCredentialsForIdentity on every cold start / forced refresh and throws when that fails, so a slow cognito-identity endpoint blocked every API call and the splash hydrate. Nothing in the app uses those AWS credentials today; identity-pool callers (future IoT/MQTT, S3) must call `fetchAuthSession()` themselves.
- **Token reads are capped at `TOKEN_FETCH_TIMEOUT_MS` = 15 s** (Amplify's fetch has no timeout on Android). Past the cap the request rejects as a retriable `ERR_NETWORK` (React Query error/retry state, never a sign-out). An abandoned read keeps running inside Amplify (its promise can't be cancelled), so in-flight reads are tracked and sign-in / sign-out first wait for them (`settlePendingTokenReads`, ≤ 3 s, no side effects). **Residual race, accepted and pre-existing** (HEAD had no wait at all): a refresh still hanging after that cap when a user signs out and someone signs in can settle onto the new session — usually as NotAuthorized after our RevokeToken, which makes Amplify clear the store and the new user is signed out (fail-closed). A hand-rolled "undo" that rewrote Amplify's token-store keys was tried and REMOVED (2026-10-01): it never converged and created new failure modes in the ordinary log-out → log-in flow. **Never write Amplify's token-store keys directly.**
- **⚠️ Which token goes where** (`mobile-client-v2` handoff, 2026-09-27). Getting this wrong is a 401:

  | Destination | Token |
  |---|---|
  | Mobile API (`/private/*`, `/protected/*`) | **access** |
  | Identity pool → IoT/MQTT, S3 exports | **ID** (Amplify builds the Logins map itself — don't touch) |
  | User name / role / company in the UI | **ID** claims (access token has no `email`, no `custom:*`) |
  | `/public/*` | none |

  `expiresAt` in `session.ts` is decoded from the **accessToken** — the token
  we actually send — not the idToken. The idToken is still fetched and kept in
  the `SessionTokens` bundle for `userFromClaims`.
- **401 retry**: response interceptor force-refreshes once, retries, then calls `executeLogout()` only if the **retried** request is still 401 (`_retried`); 403/419 sign out immediately. **If the forced refresh yields no token** (timeout, NetworkError, Cognito 5xx/429) the request rejects as retriable `ERR_NETWORK` — **never a sign-out**: a slow or flaky network must never sign anyone out. **Never fall back to the ID token** — a `mobile-client-v2` ID token is rejected with 401 by design, so a fallback would mask the real failure.
- **Session ended by Cognito**: when a refresh is DEFINITIVELY rejected (Amplify's own session-ending names: NotAuthorized, TokenRevoked, UserNotFound, PasswordResetRequired, UserNotConfirmed, RefreshTokenReuse), Amplify clears its store and reports it only via Hub `tokenRefresh_failure` — no 401 ever happens because the request is never sent. `onSessionEnded` (cognito.ts), wired in config.ts, turns that into `executeLogout()`. Amplify dispatches the Hub event before the read settles, so this always runs first.
- **Interceptor rules are tested for real**: `__tests__/authInterceptors.test.ts` un-mocks axios (jest.setup.js mocks it globally) and asserts access-token-only, one refresh + one retry per 401, no sign-out on transient refresh failure, sign-out on a definitive one.
- **Client-id swap invalidates stored sessions.** Amplify keys AsyncStorage by client id, so the v2 cutover makes every existing user sign in once. That path is clean — `useAuth` finds no session and routes to Login (`useUserStore` is in-memory only, so no half-authenticated state). The old client's orphaned AsyncStorage keys are never read again.
- `executeLogout` clears React Query (`queryClient.clear()`), Cognito session, in-memory user, and `resetActiveSite()`. It is **deduped via a module-scope in-flight promise** — concurrent 401 cascades (and the `executeLogout ↔ globalLogout` mutual recursion) collapse into one sign-out.
- All requests have a **15 s axios timeout**; `isFresh` compares against the expiry decoded **once per token** (no per-request JWT decode).
- `/public/*` paths skip the Authorization header attachment automatically.

---

## 7. Site flow & cache lifecycle

### When user taps a site card on Dashboard

`useSwitchActiveSite()` runs:

1. If different site → `removeQueries` for the previous site's three caches:
   - `siteDataQueryKey(prev)` — `/protected/data/all/{prev}`
   - `siteConfigQueryKey(prev)` — `/protected/config/site/{prev}`
   - `REPORT_MAPPING_QUERY_KEY` — `/public/config/report-mapping`
2. Update `lastSiteId` (module-scope ref).
3. `prefetchQuery` for all three of the new site (parallel).
4. Navigation pushes SiteDetail.

SiteDetail subscribes via `useSiteData(siteId)`, `useSiteConfig(siteId)`,
`useReportMapping()` — these are typically synchronous reads from cache because
of step 3.

### Refresh = really fresh — `src/networking/freshFetch.ts`

The API marks responses cacheable: `/protected/data/all` and
`/protected/config/site` `max-age=600, s-maxage=900`, `/protected/data/v2/trends`
`max-age=600, s-maxage=1800`, `/private/user/site-list` `max-age=60`
(report: `max-age=0`). RN's device HTTP caches honour that (Android OkHttp
has a 10 MB cache; iOS NSURLCache stores small responses) and CloudFront
serves a shared copy, so a pull-to-refresh used to return the same data and
the same "x min ago" for up to 10–15 min.

- Every protected GET sends `Cache-Control: no-cache` + `Pragma: no-cache`
  (request interceptor) — React Query is the app's cache, never the device.
- **User refreshes** (pull-to-refresh, any refresh icon, Retry — never
  mount / focus / resume / stale-time) run inside `runUserRefresh(fn)`;
  while one is in flight, protected GETs carry a unique `_r=<ms>` param →
  CDN miss → origin. Verified 2026-10-01: every protected endpoint ignores
  unknown params, and `_r` IS in the CDN cache key (a new value always went
  to origin, a repeated one was served from cache). Automatic fetches keep
  the CDN. `/public/*` untouched. A user refresh must START its requests
  (`cancelRefetch: true`) — joining an in-flight automatic fetch would hand
  back the CDN copy. Offline it opens no window (the fetch pauses until
  reconnect; the reconnect burst must keep the CDN) and joins the paused
  fetch instead.
- When a user refresh settles, the shared `useNow` clock ticks at once, so
  every "x min ago" re-derives immediately.
- **SiteDetail**: header button / pull / Retry share `startRefresh`, provided
  to the tabs as `SiteRefreshContext` (`useSiteRefresh(refetch)` in
  `SiteDetail/siteRefresh.ts`) — a tab's own refresh icon refetches
  `/data/all` (the header stamp) + every mounted tab query. Dashboard pull
  and its error Retry wrap `useSiteList().refresh` in `runUserRefresh`;
  `refresh` itself stays CDN-neutral because the automatic foreground-resume
  refresh (list > 5 min old) calls it too.
- **Opening a site** (`useSwitchActiveSite`) fetches its `/data/all` with
  `getSiteAllData(id, { bypassCdn: true })` — a per-request `_r`, no global
  window, so the config / report-mapping prefetches sent alongside keep the
  CDN. Without it the first paint showed the CDN copy (seen: "13 min ago"
  while origin had 3 min). Same-site re-tap within staleTime sends nothing.
- **Site data never goes backwards** (Oct 2026, seen on Android, Lucky
  Cement Live tab: "Updated 7 min ago" → "23 min ago", tile ages 3 → 22
  min). Automatic fetches keep the CDN, so after a user refresh / site
  open brought origin data, a later automatic refetch (staleTime 3 min <
  s-maxage 15 min, focus, resume) could get an OLDER CloudFront copy and
  overwrite it. `/data/all` therefore swaps responses in through
  `structuralSharing: keepNewerSiteData` (useSiteData.ts — pass it from
  EVERY fetcher of that key; the prefetch in `useSwitchActiveSite` does):
  - a response sent past the CDN (`_r` on the final request →
    `getSiteAllData` tags it `markFromOrigin`) is the origin's current
    state → always replaces (a user refresh shows exactly what origin has);
  - otherwise, if `isOlderSiteSnapshot(next, cached)` (siteDetailModel.ts,
    like with like only: `live.metadata.last_update` when BOTH payloads
    have one and they differ, else the newest live `update_at` of both —
    the sync stamp and the readings are different clocks) → the cached
    object is kept (same reference). The query still settles as a SUCCESS
    (no error strip) and `dataUpdatedAt` moves on, which keeps Live tile
    ages right;
  - …but only while a CDN copy CAN predate the cache: within
    `SITE_DATA_CDN_WINDOW_MS` (2 × s-maxage = 30 min — two CloudFront tiers)
    of when the cached object was accepted (`keepNewerSnapshot`,
    freshFetch.ts, records it). Past that every CDN copy was fetched after
    it, so a cached wrong (e.g. future) stamp can't freeze the values for
    longer, while a real big jump (a site uploading hours of backlog) is
    still protected inside the window. No magnitude cap on purpose. The
    phone clock only measures that elapsed time (a clock set back → no
    guard); server stamps are never compared with it;
  - no common timestamp → normal replacement (never invent an order).
  - **Trends too** (`keepNewerTrendData`, useTrendData.ts): preset URLs
    never change (`now() - INTERVAL N HOUR`), staleTime 2 min vs s-maxage
    30 min, so a remount/focus refetch could drop the newest buckets. Older
    = earlier newest row `time`; window 60 min; `getTrendData` tags origin
    responses and the hook's `{ ...rows, windowMs }` spread carries the tag.
    `keepPreviousData` placeholders are another key's data and never take
    part. Tests: `__tests__/trendDataMonotonic.test.ts`.
  - NOT applied to `/config/site` (no timestamp in the payload, and its
    30 min staleTime > s-maxage 15 min means an automatic refetch can't get
    a copy older than the cache) nor the site list (no list-level stamp —
    rows carry their own; resume refresh only past 5 min vs `max-age=60`;
    per-row merging would fabricate a snapshot) nor reports (`max-age=0`).
    Re-check if a staleTime or Cache-Control changes. Tests:
    `__tests__/siteDataMonotonic.test.ts`.
- If the age doesn't drop after a refresh, the SITE hasn't synced: origin's
  `live.metadata.last_update` is the truth (Lucky Cement sat at 20:04 for
  25+ min on 2026-10-01 even with a cache-busting request).
- `pullToRefreshGate.ts` is now wired: a child that owns vertical drags (the
  unlocked SLD viewport) disables pull (`RefreshControl enabled`, Android;
  ScrollView `bounces`, iOS — never drop the RefreshControl, on Android it
  wraps the ScrollView and removing it remounts the body).

### React Query cache keys

| Hook | Key |
|---|---|
| `useSiteList({ q })` | `['user', 'site-list', q?.trim() \|\| null, pageSize]` (infinite) |
| `useSiteData(siteId)` | `['site', 'all', siteId]` |
| `useSiteConfig(siteId)` | `['site', 'config', siteId]` |
| `useReportMapping()` | `['config', 'report-mapping']` |
| `useEnergyReport(siteId, filter)` | `['energy-report', siteId, filter]` |
| `useInverterReport(siteId, filter)` | `['inverter-report', siteId, filter]` |

`filter` is the `ReportFilter` discriminated union from `src/networking/site/index.ts`.

---

## 8. Reports & date-filter system

All cards that show time-series data (Chart Analysis, Trend Analysis,
Performance Report, Inverter Table) share the same filter UX:

- **Filter pills** at the top — same `PressableScale` + brand-fill active pattern
  used everywhere (Tables, Reports).
- **DateFilterHeader** above them — overline-style section heading + soft-fill
  date pill + brand-soft circular refresh button. Accepts `refreshing` prop to
  show a spinner during background refetches.
- Tapping the date pill dispatches to:
  - **Custom** → `DateRangePickerModal`, cap enforced at the picker level via `maxRangeDays`: **31 days** for Reports/Tables (`REPORT_CUSTOM_MAX_DAYS`, src/utils/reports.ts) and **3 days** for Trends (`TREND_CUSTOM_MAX_DAYS`, src/utils/trends.ts). Presets carry a static `maxSpanDays` and only those that fit the cap are shown (`presetsWithinRange`) — Trends shows just "Today"; Reports/Tables show Today / Last 7d / This week / Last 15d.
  - **Month** → `MonthYearPickerModal mode="month"`
  - **Year** → `MonthYearPickerModal mode="year"`
  - **Life Time** → pill is non-interactive (`pillDisabled`)
- **Default Custom range** = the full cap: `today - (cap − 1)` → `today` (`DEFAULT_CUSTOM_RANGE_DAYS = REPORT_CUSTOM_MAX_DAYS − 1`; Trends seeds `daysAgo(TREND_CUSTOM_MAX_RANGE)`).
- **Chart value labels**: every ECharts Y-axis (Trends + Reports) and the Trends tooltip use ONE formatter, `Y_AXIS_LABEL_FORMATTER` / `COMPACT_VALUE_FN_SRC` in `chartConfig.ts` — a JS **source string** evaluated inside the WebView (`enableParseStringFunction`), so it must stay self-contained (no closures over RN values). K/M/B/T with ≤3 significant digits, float noise stripped, `4e31`-style beyond T. Unit-tested by evaluating the string (`__tests__/chartValueFormatter.test.ts`).
- **Trend charts use ONE shared scale in both the card and fullscreen** (bars on a left axis; a right axis only when bars and lines are mixed). Per-series axes were removed on purpose: per-series scales drew a 48K bar and a 750M bar at the same height, misrepresenting relative magnitude (and made fullscreen diverge from the card). `detailed` (fullscreen) changes density only — axis assignment must never branch on it.
- **Trend chart animation is presentation-only and off when large** (Oct 2026, Android perf pass): `option.animation` is always set — `false` in full screen (`detailed`) and inline once buckets × series > `TREND_ANIMATION_MAX_POINTS` (2000; Lucky 24H = 9 × 1,440). The intro animation re-rastered the whole canvas every frame (seconds on a slow GPU). Values never change with it (`trendComboOption` test).
- **Full-screen chart first-paint watchdog** (`ChartFullscreenModal`): the chart subscribes to echarts' `finished` via ONE stable `eventActions` map (the library writes the event list into its injected script), logs `display('chart fullscreen paint', {ms})`, and remounts its WebView ONCE if nothing painted within `FULLSCREEN_CHART_PAINT_TIMEOUT_MS` (45 s) — a never-painting fullscreen WebView was seen once on an emulator (cause unproven; if it shows up on a device, the structural fix is to stop rotating the native WebView and rotate inside the page instead). echarts fires `finished` after EVERY idle render (tooltip moves, dataZoom drags), so the patched library posts it only ONCE per chart (§19). Tests: `__tests__/chartFullscreenPaint.test.tsx` (watchdog, library mocked) and `__tests__/echartsFinishedEvent.test.tsx` (the real patched library + the shipped echarts 5.4.2: subscribed before the first setOption, `onMessage` → `eventActions.finished`, exactly once).
- **Device garbage is SHOWN, never hidden** (user rule, Oct 2026 — "hide kuch nahi karna… show karna ha ka device sa aya ha garbage", and "follow the same" as the web): every finite reading is plotted at its TRUE value on the shared scale (Trends card + fullscreen, Reports chart), exactly like the web portal's Analysis chart, even when one value (Lucky Cement "Wind Energy Day" ≈ −1.2e35) flattens the others. Value axes have no forced min/max; when any reading is negative every series shares the left axis (no mismatched zeros). `SUSPECT_READING_ABS` = 1e15 (`src/utils/units.ts`, re-exported by chartConfig.ts) is DETECTION ONLY: it words one note per chart — "N readings look invalid — shown exactly as sent by the device" (inline: drawn inside the chart, pre-wrapped by `layoutTrendNote`, card height unchanged; full screen: the `warning` prop; screen-reader summary includes it; Reports' Energy-over-time card too, via `countInvalidReportReadings`). The tooltip shows such a value exactly (`toExponential()`); axis ticks use compact e-notation ("-1.2e35"), with a guard against echarts' float-noise ticks past 2^53. Only null / blank / non-numeric / NaN / ±Infinity is a gap ("—"). **Never reintroduce a magnitude filter, clamp or gap.** Everywhere else (Cards, SLD, Live, Dashboard chips, Reports text) such a value prints in the same e-notation via `formatScientific` (`formatSig3` / `formatQuantity` / `formatCompact` / `formatCardValue`), in the backend's own unit, never a 30–50-digit string and never "—". Tests: `__tests__/suspectReadings.test.ts`, `trendComboOption`, `echartsAxisTicks`.

Each card holds its own `startDate`, `endDate`, `selectedMonth: MonthSelection`,
`selectedYear: number`, `activeFilter: InverterFilterOption` state. They feed
`buildReportFilter(...)` which produces the discriminated `ReportFilter`.

### Performance Report (Reports tab) — v4 (Oct 2026)

**Layout flow:** `DateFilterHeader` "Energy mix" → `PillGroup` (Custom /
Month / Year / Lifetime) → **period hero** (`HeroStatusBadge mode='period'` —
never LIVE/pulsing, this is historical data; "N sources"; **TOTAL ENERGY**
— not "generated": the mix includes grid import; "Updated hh:mm"; POWER MIX
"Mostly X · %") → **Sources** card (one ≥48pt row per source, share %) →
one **Energy over time** stacked-bar WebView. The DISTRIBUTION donut and its
slice-select code are **removed** (one view per fact). Every returned bucket
is kept, zero-production days included (`formatNoProductionCaption`), so
outages are never hidden. Previous period's data stays visible while a new
period loads (`placeholderData`, same site only). The selected period is
persisted per site + card (`useReportPeriodStore`). Labels: "1 Sep – 1 Oct
2026", "September 2026", "Lifetime"; axis "1 Sep" / "1" / "Sep".
Backend note: daily buckets are cut on **UTC** days, so a PKT range returns
one extra leading bucket (e.g. 32 bars for 31 days) — both web and app.

### Inverter Table (Tables tab) — v4 (Oct 2026)

`DateFilterHeader` "Inverter fleet" → PillGroup → fleet hero (period badge,
FLEET AVERAGE PR + status, best / worst / total; an "Offline / 0% PR"
row when any inverter is 0) → **compact `InverterRow`s** (64–72pt, hairline
separators, neutral number badge — the energy palette is reserved for
sources) with PR + uptime mini-bars and sort (worst first / number /
energy). PR/uptime are `number | null`: a missing value shows "—" and is
never coerced to 0 (a dead inverter must be able to be WORST).

**PR bands = the web's rule** (`InverterTable/prBands.ts`, read from the web
bundle 2026-10-01): < 40 Poor (web `err`) · 40–< 62 Fair (`warn`) · 62–< 82
Good (`lime`) · ≥ 82 Excellent (`ok`); missing = neutral "No data", never
Poor. PR bar = the band's gradient (`prBandPalette` in tokens.ts — the web's
exact hexes, same in light and dark, fills only); PR text in
`scheme.prBandInk[band]` (AA, tokenContrast-tested). Uptime bar is ALWAYS
the excellent gradient (the web never grades uptime), its caption neutral,
≥ 99.95 shows as 100, missing → "Up —" with no bar. Cells print up to 2
decimals with no trailing zeros (61 / 61.46, like the web); the hero
average is rounded ONCE to 1 decimal and that value drives both the text and
the band (no "82% · Good"). Hero shows band dots (ringed for contrast on the
emerald hero). Rows are 72pt (PR + uptime bars). The old 90/80/70
`src/utils/colors.ts` classifier is deleted.

---

## 9. Energy-source palette (brand)

| Source | Token | Hex |
|---|---|---|
| Solar | `solar` / substring `solar`/`pv` | `#84CC16` (lime) |
| Wind | `wind` | `#06B6D4` (cyan) |
| Grid | `grid` | `#3B82F6` (blue) |
| Genset | `genset` / `dg` | `#F97316` (orange) |
| Battery | `battery` / `bess` | `#A855F7` (purple) |

**Always use `energyPalette.X` from `src/theme`** — not the legacy
`ENERGY_SOURCE_*` constants. Labels resolved via `sourceTokenFromName(name)`
+ `shortSourceLabel(name)` from `src/utils`.

Backend column names can use any prefix (`ed_`, `et_`, `hi_`, …);
`findSourceForColumn(name)` does a case-insensitive substring match on the
token. Multiple variant columns sum into the same source bucket.

---

## 10. Cards tab data resolver

Backend's `siteConfig.siteComponents.cards[]` describes each card. Each card has:

```
{ name, unit, colour, icon, decimalPlaces, dataStore, objKey }
```

Where `dataStore` is `'live'` or `'processed'` and `objKey` may be a single key
OR a dotted path. Resolution rule **per dataStore**:

```
dataStore='processed' → liveData.processed.data.processed[<objKey-segments>]
dataStore='live'      → liveData.live.data[<objKey-segments>]
```

See `src/utils/cards.ts#resolveCardValue`.

`icon` is mapped to a GIF via `src/assets/gif/lottie-icons.ts#lottiePathGif`. If
an entry has a `lottieSource` field, the new Cards-tab `SourceTile` renders the
Lottie variant instead (with runtime theme-aware recolor — see §4.6).

All Cards-tab values render at **2 decimal places** via `formatCardValue`, or
compact-K via `formatCompact` for hero / chip contexts.

---

## 11. Live Parameters tab

- **v6 (Oct 2026), logic in `src/utils/liveParams.ts`** (direct import):
  - **Names resolve like the web**: the site's own `siteConfig.globalParams.live`
    name first (p1000005 → "Captive Plant kW"), then
    `/public/config/params-mapping` (which only says "Custom Parameter 5"),
    then the raw code — `resolveLiveParamName` / `buildSiteParamNames`. The
    Trend legends use the same order (`selectTrends`).
  - **Units** come from `buildParamUnitIndex` (card configs → SLD keys → trend
    config → a trailing "(unit)" in the name; trend `payload.unit` is a time
    granularity, never a unit). Unknown units render nothing — never guessed.
  - **Honest ages**: per-tile time is relative and anchored to the fetch
    (`dataUpdatedAt`), "30 Sep, 14:05" after 24 h — never a bare clock time;
    a reading older than `FRESH_LIVE_MS` is marked stale. Only the header
    status line ticks (`useNow`); the PulseDot pulses only while live.
  - `Pill` category filters with counts, each with its category glyph;
    search spans ALL categories; one Sort control cycles 5 orders;
    impossible readings (≥1e15) render in e-notation.
- Auto-categorises parameters by name keyword: `power` / `voltage` / `current` /
  `energy` / `temperature` / `frequency` / `other`.
- **2-col bento grid, v7 colour + icon tiles** (user feedback: the flat v6
  tiles looked "old, not eye catching"): icon well + time on top, name
  (2 lines), value + unit at the bottom.
  - **Icon = measurement category** (`LIVE_CATEGORY_ICON`, MaterialIcons:
    energy `electric-meter`, power `bolt`, voltage `electrical-services`,
    current `cable`, temperature `device-thermostat`, frequency `graphic-eq`,
    other `sensors`) — the same glyph leads the category pill.
  - **Colour = the ENERGY SOURCE the parameter's name names**
    (`liveSourceFromName` = the SLD grouping's tag rules: "DG 1 …" → genset
    orange, "PV …" → solar lime, "WTG …"/"Wind …" → wind cyan, "Grid …" →
    grid blue, "BESS …" → battery purple): a `LinearGradient` diagonal sweep
    (`fill+'24'` → transparent) + the `IconWell` in that colour
    (`energyInk` glyph), sweep alpha `SOURCE_SWEEP_ALPHA` '24' (~14%). No
    source (load, bus, WHR …) → a SOFT brand sweep (`BRAND_SWEEP_ALPHA`
    '14', ~8%) + brand icon well (`brandText` glyph), so every tile has
    colour but source tiles still lead (user asked for more colour; a full
    '24' brand sweep failed textTertiary contrast in dark). Text ≥ 4.5:1 and
    glyph ≥ 3:1 over each sweep are tested. Categories never get colours.
    One per-theme accent table (WeakMap on the scheme singleton), so tiles
    allocate nothing per render. A missing reading is neutral throughout.
  - The time row stays full-width under the value — a stale reading's date
    ("30 Sep, 02:05 PM") must never be cut off.
- **Skeleton** placeholders on initial load.
- **Deferred render** via `InteractionManager.runAfterInteractions` — the tile
  grid only mounts after the tab transition finishes (the legacy "all params
  mount on tab tap" pattern caused noticeable jank with 100+ entries).
- **v5 perf pass**: `ParamTile` is `React.memo`'d (props: stable `param` +
  `themed` only — it reads `useScheme()` itself); search input keeps instant
  local state but feeds a **200 ms debounced** copy into the filter memo;
  `displayValue`/`displayTime`/gradient colors are **precomputed once per fetch**
  in `extractLiveParams` (one module-level `Intl.NumberFormat`); tiles mount in
  **chunks of 20 per frame** (rAF counter, reset on category/search change) so
  no single commit exceeds ~20 tiles. NO per-tile `entering` animations — they
  caused a ShadowTree commit SIGABRT at 100+ tiles (see file header).

---

## 12. Site list (Dashboard)

- Paginated: `?page=N&pageSize=50` (default page size). Response envelope is
  `{ metadata: { total, page, pageSize, ... }, data: ISite[] }`. Legacy
  bare-array also supported via `normalizeSiteListResponse`.
- Server-side search: `?q=<string>` (case-insensitive substring match against name).
  Length 1–128 enforced client-side.
- Search input has a **350 ms debounce** AND a **2-character minimum** (was 4
  — site names are often short acronyms like "CCI"); the keyboard Search key
  searches immediately from 1 character; 1 character shows "Keep typing to
  search".
- Pagination active during search too.
- Dashboard FlatList virtualised (`initialNumToRender=6`, `windowSize=7`).
- **Search bar is pinned outside the FlatList** (between the top bar and the
  FlatList), not inside `ListHeaderComponent`. This sidesteps an iOS keyboard
  auto-scroll → blur cascade that was dropping focus after the second tap.
- Search uses the redesigned `SearchBar` component which owns its own
  `value`/`focused` state internally + debounces internally, only emitting the
  **debounced** value upward via `onDebouncedChange`. This prevents Dashboard
  re-renders during typing.
- **SiteCard — the v2 look, restored (Oct 2026; user preference over the
  compact v3 card, see memory `feedback_card_visual_style`)**, driven by the
  pure `buildSiteCardModel(site)` (`Dashboard/siteCardModel.ts`):
  - Round 52pt avatar with a status ring (brand only while live), name, a
    status row (dot + text from `siteStatus()` in `utils/freshness.ts` —
    "Live · 3 min ago", "Delayed · 39 min ago", "Offline · last data 28 Sep"),
    gold "Controller" pill for controller sites.
  - **Hero tile** = the card's largest metric (compared in base units, so
    2 MWh beats 500 kWh), tinted with its source colour (`heroTint`: light
    starts at `20`, dark `2E` — AA for `energyInk` on every stop, checked in
    `tokenContrast.test.ts`), static dot + overline + big value + unit. The
    right side is deliberately EMPTY — the old hero sparkline was one
    hard-coded curve drawn on every site and is deleted.
  - Up to 3 satellite `MetricChip`s ("● SOLAR 76.4 MWh"), then the
    full-width "Show all N" / "Show less" toggle (also an accessibility
    action). A chip's period, when the card mixes periods, is its own
    `caption` line — never appended to the 1-line label.
  - Honesty rules kept from v3: values are the backend site-list cards
    **verbatim** (`siteComponents.sitelist` → processed `ed_*`), compact via
    `formatQuantity` ("3.21 MWh", never "3.2K kWh"), missing/NA → muted "—";
    never summed or derived; no PulseDot and never "LIVE" on list cards; a
    period only when the backend NAME states one (`periodFromName`). Plain
    source names become the uppercase source word ("SOLAR · TODAY"); other
    backend names keep their own case ("Grid Import Today").
  - Perf: `React.memo` with the site/index comparator, entrance animation
    frozen at first mount (`ANIM_LIMIT`), only the status row rides the
    `useNow` ticker. Tests: `__tests__/siteCardModel.test.ts`.
- ⚠️ Backend inconsistency (not an app bug): the site-list "Energy Today"
  cards (processed `ed_*`) differ from the site's own Cards-tab "Energy
  Today" (live counters `p2`, `p10391`) — e.g. Lucky Cement solar 63K vs
  132K kWh on 2026-10-01.

---

## 13. Theme

`useThemeStore` (Zustand, persisted) holds a **preference** — `'system' |
'light' | 'dark'` (default `'dark'`: dark-first brand + dark-locked splash;
old persisted `isDark` migrates) — and the derived `isDark`. `'system'`
follows OS Appearance live (events are ignored while backgrounded and
re-read on resume). The appearance control lives in the drawer
(Preferences) with a shortcut in the Dashboard header; the SiteDetail header
has no theme toggle. **New code reads from `useScheme()`** (see §4.2).
Legacy screens still use `useThemeStore().colors`, auto-derived from the
scheme tokens.

---

## 14. Conventions / patterns to follow

- **Use the design system** (§4). No hardcoded hex colors. No `style={[styles.X, { color: '#999' }]}`. Use `useScheme()` for theme-driven values and pass them via the style array; for recurring patterns extract to a primitive.
- **No inline `style={{}}`** for static styling. If it's static, put it in `StyleSheet.create`. If it's runtime-dynamic (theme-driven), pass via style array OR write a styled wrapper (see `AppTextInput`).
- **All asset `require()`** uses **relative paths** (Metro doesn't reliably resolve `'src/...'` aliases for non-JS assets). Wrap them in a TS module that exports the `require()`d reference, then import the named constant.
- **`useState` lazy initialiser** for any non-trivial default (`useState(() => new Date())`, `useState(() => daysAgo(15))`).
- **`numberOfLines={1}` + `adjustsFontSizeToFit` + `minimumFontScale={0.7}`** on long-value text.
- **2-decimal display** is the project default for raw numbers. Use `formatCompact` for cramped slots (chips, hero values).
- **Defensive coercions**: backend sometimes ships numbers as strings, optional fields as `null`. Use `numericCardValue` from `src/utils` or guard with `typeof === 'number' && Number.isFinite(...)`.
- **Stable refs in FlatList**: `keyExtractor`, `renderItem`, separator components are all `useCallback`'d so memoised cells don't re-render.
- **`React.memo` SiteCard** with a custom comparator — tap-to-expand on one card doesn't re-render the other 349.
- **Run `npx tsc --noEmit`** after every change. Goal: zero errors anywhere.
- **Logging**: `display(label, payload, undefined, important?)` from `src/utils/logger` — pipes to Reactotron + `console.log`. Use this instead of bare `console.log`.
- **Reanimated**: never write `style={{ flex: someObj.value }}` even on plain JS objects (§4.7).
- **PressableScale > TouchableOpacity** for any tappable in the redesigned UI. Composes cleanly with FlatList scroll + TextInput focus (uses RN `Pressable`, not gesture-handler).

---

## 15. What's still mock data

`src/data/mock/` barrel exports ONLY (July 2026 dead-code sweep removed the
rest — dashboard/summary/performanceReport mocks are gone; Trends is
API-wired via `useTrendData`):

| Mock | Used by | Status |
|---|---|---|
| `mockAlarmsData` | AlarmsView | Not yet wired to `liveData.alarms` |
| `inverterFilters`, `InverterFilterOption` | Filter pills on Reports / Tables — pure constant, fine to keep |

`src/data/mock/sld.ts` still exists on disk but is deliberately NOT in the
barrel — it's a fixture deep-imported only by `__tests__/sldDeoverlap.test.ts`,
so it stays out of the production bundle.

---

## 16. Pending / nice-to-have

- **Skia chart migration** — gifted-charts works fine but Skia (`victory-native@XL`) would give buttery 60fps animations + better on-data-change transitions. Multi-day pass; defer until client asks.
- **Date pickers** — still uses `@react-native-community/datetimepicker` (iOS wheel). Modernize to a calendar-grid via `react-native-calendars` for a more current feel.
- **Bottom sheets** — center modals could become `@gorhom/bottom-sheet`.
- **Signature SLD particle flow** — animated dots flowing along the SLD diagram arrows.
- **Live-value pulse** — small pulse-glow when a value updates.
- **Real haptics** — install `react-native-haptic-feedback` and swap the abstraction body.
- **AlarmsView wiring** — currently mock; should consume `liveData.alarms` from `useSiteData`.
- **Trend cards real data** — TrendView + TrendAnalysisCard still mock-driven.
- **MQTT live updates** via AWS IoT — `attach-iot-policy` endpoint not yet documented in openapi.yaml.
- **Public bootstrap calls** before sign-in: `params-mapping` is wired (cached + persisted via `useAppConfigStore`). `report-mapping` is wired (per-site cached). `params-hierarchy` and `alarms` config are not yet wired.
- ~~ImagePickerBottomSheet legacy cleanup~~ — DONE (July 2026): component,
  `permissions.ts`, `react-native-image-picker` and `react-native-permissions`
  all removed (zero consumers; the image-picker photo/camera API references
  triggered App Store ITMS-90683). `NSPhotoLibraryUsageDescription` +
  `NSPhotoLibraryAddUsageDescription` are in Info.plist for the
  react-native-share chart-export path (`InstagramShare.m` uses PHPhotoLibrary),
  which DOES remain. The empty `NSLocationWhenInUseUsageDescription` was
  dropped (no location APIs remain).

---

## 17. Quick reference: how to add a new per-site data card

1. Add the API request type + service function in `src/networking/site/index.ts`. Use `appAxios.get<T>` and pipe through `display()` on errors.
2. Add a React Query hook in `src/hooks/useXyz.ts`. Cache key shape: `['xyz', ...args] as const`. Don't retry on 401/403/404.
3. Re-export from `src/hooks/index.ts`.
4. If the card has a date filter, lean on `buildReportFilter(...)` from `src/utils/reports.ts` — same util drives every Reports/Tables card.
5. Use `<DateFilterHeader>` with `formatDateFilterLabel(...)` for the section overline above the card body.
6. Use **`<Surface>`** for the card container (NOT a hard-bordered View).
7. Use **`<HeroGradientCard>`** if it deserves a "snapshot" hero with brand-gradient styling.
8. Use **`<PowerMixBar>`** if it visualises a source/category mix.
9. Use **`<OverlineLabel>`** for any uppercase tracked section heading.
10. Use **`<PressableScale>`** for any tappable element (not `TouchableOpacity`).
11. Resolve labels via `useReportMapping()` + `resolveReportLabel(mapping, key, fallback)` from `src/utils/reports.ts`.

---

## 18. Quick reference: Cognito test creds

Use whatever you've been signing in with — credentials aren't stored in this
repo. Default flow expects email + password, handles `NEW_PASSWORD_REQUIRED`
for first-login users with temporary passwords.

---

## 19. v3 performance pass (June 2026, branch `perf/app-optimizations`)

A full multi-agent perf audit + fix pass. Invariants that future code must
respect:

- **`useScheme()` returns stable singletons** (§4.2) — safe in deps/memo props.
- **`AppText` composes styles via array** and is `React.memo`'d. Caller
  `style` arrays now actually apply (the old object-spread silently dropped
  them — MetricCard's title band re-appeared because of this fix).
- **Poppins fonts are now actually linked** (they never were!) — `npx
  react-native-asset` wired ios pbxproj/Info.plist + android assets/fonts;
  `link-assets-manifest.json` (both platforms) is committed. iOS Info.plist
  registers `MaterialIcons.ttf` (NOT MaterialCommunityIcons).
- **GIF icons are 128×128** (re-encoded from 400×400; ~3× smaller files, ~10×
  less decode work). Source GIFs for re-encoding live in git history. Don't add
  full-res animated GIFs — prefer Lottie JSON or ≤128px assets.
- **`PulseDot` pauses when its screen is unfocused**; loops are cancelled on
  unmount. Don't add uncancelled infinite Reanimated loops.
- **Entrance-animation cap convention**: `entering` only for `index <
  ANIM_LIMIT`, and the wrapper-type decision is frozen at first mount
  (`useState(() => ...)`) so list reordering can't remount rows (SiteCard).
- **ECharts WebViews**: always pass `webViewSettings={WEBVIEW_SETTINGS}`
  (`chartConfig.ts`) and wrap `RNEChartsPro` in a memo so parent state
  changes don't rebuild its ~1MB inline-HTML props (see `ReportChart` in
  PerformanceReportCard, memoized `TrendComboChart`).
  - `WEBVIEW_SETTINGS = { autoManageStatusBarEnabled: false }` — iOS.
    react-native-webview 13.16 snapshots the status-bar style when a WebView
    is created and re-applies it on EVERY window show/hide in the app
    (alerts, keyboards, Metro's dev banners); Fabric pools the views, so the
    stale snapshot outlives the chart. A chart first drawn in dark mode
    turned the bar white-on-white in light mode after the Sign-out alert
    (reproduced in Release 2026-10-01, fixed + re-verified both ways; in
    Debug every "Refreshing…" banner did it). RN `<StatusBar>` must stay the
    ONLY writer of the status-bar style.
  - The object is typed `satisfies Partial<ComponentProps<typeof WebView>>`
    because echarts-pro types `webViewSettings` as `any`: the old
    `androidHardwareAccelerationDisabled: false` key (and echarts-pro's own
    hard-coded `true`) is NOT a react-native-webview ≥ 11 prop — both were
    silent no-ops; Android charts are GPU-composited by default
    (`androidLayerType` 'none'). Don't switch to `androidLayerType:
    'hardware'` without a device test.
  - `__tests__/chartWebViewSettings.test.ts` parses `src` with the
    TypeScript compiler API: every element imported from
    `react-native-echarts-pro` must end with
    `webViewSettings={WEBVIEW_SETTINGS}`, every direct `react-native-webview`
    element with `autoManageStatusBarEnabled={false}` (no later spread or
    duplicate).
- **`react-native-echarts-pro` is PATCHED** via `patch-package`
  (`patches/react-native-echarts-pro+1.9.3.patch`, applied by the
  `postinstall` script). Its `getInstance()` never cleared the previous
  result before asking the WebView for a new one, so the 50 ms poll
  resolved with the PRIOR call's value — chart Export saved the chart's
  previous zoom / legend state, always one render behind. The patch adds
  `delete latestResult.current[functionName]` before the `postMessage`.
  The same patch (Oct 2026 perf pass) also: derives the font / extension /
  event-list values with `useMemo` (they were state set in mount effects →
  every chart rendered 2–3× on mount), memoises the page `source` and the
  injected script, serialises + embeds the option ONCE (was twice), builds
  the ~1 MB world-map literal only when `option.geo` exists, makes the
  event list always an array (the old `"[]"` string subscribed to the events
  "[" and "]"), and unsubscribes a `finished` listener after its first
  message (echarts re-fires `finished` on every idle render → ~60 bridge
  messages/s while a chart is touched). Verified by applying it to a
  pristine 1.9.3 tarball; regenerated with `npx patch-package`.
  ⚠️ 1.9.3 is the latest published version and upstream is unfixed: if
  the dep is ever bumped, the patch will fail to apply — re-make it with
  `npx patch-package react-native-echarts-pro` rather than deleting it.
- **`react-native-reanimated` 3.16.7 is PATCHED** too
  (`patches/react-native-reanimated+3.16.7.patch`, C++ only, both platforms
  compile it from node_modules). Android Release crashed with SIGSEGV in
  `LayoutAnimationsManager::startLayoutAnimation` (`config->toJSValue` on a
  null config): an `entering` animation is queued for the UI thread, its
  view unmounts first (fast SiteDetail tab switch clears the config), then
  the job runs and `operator[]` returns null. The patch is upstream PR #6920
  (shipped in 3.17.0, issue #6908) plus pre-checks in the entering/layout UI
  jobs so no stale animation entry is recorded. **When upgrading Reanimated
  to ≥3.17, drop or regenerate this patch** (the manager hunk is upstream).
  Regenerate with `npx patch-package react-native-reanimated --include
  '^Common/cpp/'` — without `--include` the android/build artifacts get
  swept in. ⚠️ `patches/` must be committed (it was untracked), or a fresh
  install silently loses both patches.
- **SLD**: the Skia `Canvas` is viewport-sized (`DiagramSkiaLayer`) with
  pan/zoom replayed as a Skia Group matrix from the viewport's shared values;
  node cards live in `DiagramNodeLayer` inside the old transformed
  Animated.View. The dot grid is ONE SkPath. Manual device pass recommended
  after touching SLD transform code (inline + fullscreen, pinch + pan,
  +/- at min/max while locked).
- **SLD flow clock — gated + 30 fps, never `useClock()`** (Oct 2026,
  Android perf pass). Every clock write re-records the Skia picture on the
  UI thread and, on Android (RN Skia 1.x TextureView), uploads + swaps on
  the main thread and re-composites the whole window — `useClock()` did
  that every vsync while the SLD was merely mounted (off-screen, idle).
  `DiagramSkiaLayer` now runs its own `useFrameCallback` clock
  (`components/sldFlowClock.ts`, worklets, `sldFlowClock.test.ts`): it only
  ticks while the host's `animate` shared value is true, at most 30×/s
  (time-based motion, same speed), never with reduced motion (static dashes,
  no particles) or when no edge flows — nor while the site's data isn't LIVE
  or the user paused it (`motionAllowed` from `useSldMotion`,
  `components/sldMotion.ts`, `sldMotion.test.ts`: the Pause / Play button in
  the controls column, WCAG 2.2.2; when Reduce Motion or stale data stops
  the flow it is a disabled "animation off" state whose spoken label says
  why, never a Pause that does nothing). The loop itself is paused, not just
  the writes (`components/useSldFlowLoop.ts`, `sldFlowLoop.test.tsx`):
  `setActive(flowing && gateOpen)` (guarded by `isActive` — §20.3), the
  gate reaching JS through a `useAnimatedReaction` → `runOnJS` only when it
  flips. On a Pixel-7a-sized screen the Lucky Cement panel is never fully
  off-screen, so the gate mostly matters on small phones / large text. The inline host gets `animate` from `useBodyViewportVisibility`
  (`SiteDetail/bodyViewport.ts`): SiteDetail's body ScrollView publishes
  scroll offset / height / content-size changes into a re-render-free
  store, the panel `measureLayout`s itself against the scroll content
  (`getInnerViewRef`) and flips the shared value only when it enters or
  leaves the viewport — no React commit. Full screen omits `animate`
  (always on). Tests: `bodyViewport.test.tsx`.
- **SLD phone layout (Oct 2026, user: "boxes are small, not readable")** —
  the backend canvas (desktop-wide, Lucky ≈ 1810×850 units) fitted a phone
  at ≈ 0.2 → 2–3pt text. Now `selectSldGraph → buildSldGrouping →
  buildSldPhoneLayout` (`src/utils/sldPhoneLayout.ts`, structure-only,
  cached per graph ref; live ticks never re-layout) re-arranges the SAME
  nodes/edges for a portrait phone at ≈ 1 unit per pt:
  - Hub = logo node, else most incoming edges → degree → graph order. BFS
    spanning tree; each hub neighbour is a branch (one column, its subtree
    stacked outward). Branch order solar, wind, genset, WHR, grid, battery,
    others. 2 per row; ceil(n/2) rounded to whole rows go ABOVE the hub
    (Lucky Grouped 4/2 = the approved preview, Units 10/9); a lone row is
    centred. Hub-adjacent rows join with a └┬┘ bus; farther rows enter a
    trunk at the hub's centre-x (gaps = 2× `SLD_EDGE_STUB`, routes never
    cross a card). Nested side lanes step out via client-only
    `SLDEdge.routeStub`; non-tree edges get the clearest of 16 handle pairs
    (`clearestHandles`); disconnected components go below. Nodes carry a
    client-only `size` (honoured by `nodeRect`); `resolveNodeRects` is a
    no-op on this layout. Curved routing uses `controlReach` (half the
    distance the other end lies ahead), so curves stay clear too.
  - Cards: `SLD_PHONE_CARD` (148 wide, 14/18 heading ≤ 2 lines, 16/20
    values, 12/16 labels+units) / `SLD_PHONE_HUB` (196×80 capsule) — the
    single source for styles AND layout heights (`sldPhoneCardHeight`).
    AppText `fixedSize="exact"` (size as given, no OS scaling — the canvas
    is already scaled). **Never `adjustsFontSizeToFit` in SLD cards**: on
    iOS Fabric it ignored `minimumFontScale` in the scaled canvas and drew
    some values at ~4pt. `sldValueDisplay` picks 16/14/12 from the text
    (Poppins widths measured from the TTFs, 2% margin) and, when even 12
    can't fit, switches to the compact form with the unit rescaled
    ("1,186,687.53 MW" → "1.19 TW") — a value is never truncated.
  - **Card icons = MaterialIcons glyphs in theme ink, never the GIFs**
    (Oct 2026): the GIF artwork has fixed colours (white turbine, navy
    solar/genset) and vanished on its well — "Wind · 6" was a white
    turbine on pale cyan in light mode. `sldNodeIcon` (`src/utils/sldIcon.ts`,
    direct import): `classifySldNode` source → `energyPalette` well tint +
    `scheme.energyInk` glyph; hub (logo), WHR (no palette token), SVG/switch
    gear, unknown → brand well + `brandText` glyph. The card's top bar /
    border / wash / edges keep the backend `icon.color`. Glyph/well ≥ 3:1
    in both themes (over the dark accent wash too) and every glyph name in
    the font: `tokenContrast.test.ts`.
  - Inline: `computeSldFit` fills the WIDTH (cap `SLD_MAX_FIT_SCALE` = 1),
    centres a diagram that fits, centres a taller one on the hub (`focus`),
    clamped so no empty band shows; zoom-out floor 0.9 × overview, max
    max(3 × fit, 2). Panel height = content × scale, clamped to
    [320, 0.85 × window] (`sldInlineHeight`; skeleton / not-yet-loaded use
    `SLD_INLINE_DEFAULT_HEIGHT`) — no pill strip inline any more: Grouped |
    Units heads the panel (§23.4), so the inline fit reserves no strip /
    mask band. Opens locked (page scroll wins).
  - Zoom (+/- and pinch) pivots on the VIEWPORT centre; pan/pinch end
    settles the translate into the fit area (`sldClampTranslate`, a
    worklet).
- **SLD grouping** (Grouped / Units toggle, `src/utils/sldGroup.ts`; ONE
  mode for the Diagram AND the 3D twin — §23.8):
  - Grouped (default) collapses leaf source units into ONE box per energy
    type — "Solar · 9" with totalled values. Pure transform: downstream
    (bounds, `resolveNodeRects`, both layers) runs on the grouped graph.
  - Type = name tags first (short tags `PV`/`WTG`/`WT`/`BESS`/`BATT`/`DG`/`GEN`
    must be WHOLE tokens; long words `solar`/`wind`/`battery`/`diesel`/
    `generator`/`grid`/`utility`… as substrings; priority battery > solar >
    wind > WHR > genset > grid), icon key only as fallback — real site data
    has wrong icons (a PV inverter with the wind icon, BESS with genset).
    Group box uses the canonical icon + `energyPalette` colour; its edges use
    that colour too.
  - **WHR (waste-heat recovery) is its own type** (2026-10-01): `WHR` as a
    whole token or `waste heat` (separators collapsed) beats genset and the
    icon fallback, so Lucky Cement's "WHR Plant" no longer merges with
    "Captive Plant" into "Genset · 2". ≥2 WHR units group as "WHR · N"; there
    is no palette token for WHR, so that card takes its members' most common
    icon and that member's colour (no new hex/tokens).
  - Never grouped: logo/target node, any node with an incoming edge. Group key
    = type + sorted target set; ≥2 members, singletons stay as-is. One
    group→target edge per target; handles recomputed to face the target; a
    bounded deterministic settle pass keeps OTHER edges' routes (orthogonal
    and bezier, via the renderer's own `bezierControlPoints` /
    `orthogonalEdgePoints` in sld.ts) clear of group cards.
  - `buildSldGrouping(graph)` is STRUCTURE-ONLY (cached per graph ref, memo on
    graph) — live ticks never re-layout. `makeGroupedResolver(base, groups)`
    (memo on the live resolver, values cached per data snapshot) answers the
    synthetic params:
    - additive keys (units parsed as `[k|M|G](W|var|VA|Wh|varh|VAh|A)` →
      family + SI factor) merge by label + family and are SUMMED, shown in the
      members' majority unit. W, var and VA are all the "power" family, so a Q
      key the backend mis-tags `kW` (Lucky Cement's GW-WTG-01) still sums with
      the other turbines' `kVAr` Q — the label decides the quantity (verified
      on live data 2026-10-01: Wind · 6 P/Q = exact sum of the 6 units);
    - all PF keys fold into one row: recomputed |ΣP|/√(ΣP²+ΣQ²) only when every
      reporting member has BOTH P and Q (paired per member), else mean PF;
    - everything else (%, SOC, V, Hz…) is AVERAGED; "—" when nothing numeric;
    - group cards show at most `SLD_GROUP_MAX_ROWS` = 3 keys, ranked by member
      coverage.
  - Flow: each group→target edge carries a client-only `data.animation`
    (synthetic per-(group, target) flag = any member edge to THAT target
    flowing); `isEdgeAnimated` checks `edge.data.animation` first.
  - Shared wiring: `useSldModel(siteId)` (SiteDetail/components) for BOTH the
    inline diagram and the fullscreen route; the mode lives in the
    `useSldViewMode` zustand store (mode + Pause in memory; only the
    Diagram | 3D `view` is persisted). `SLDViewport` is keyed by mode so a
    switch remounts + re-fits; its lock + orthogonal-routing state
    is lifted to the parents (controlled props) so it survives the remount.
    Where the toggle lives: inline, in the header row ABOVE the panel for
    both views (`SldViewHeader`, §23.4 — no pill over the inline diagram);
    sideways 3D, on the rail (§23.4); the 2D FULL SCREEN keeps its own
    `SldModeToggle` (ControlButtons.tsx), pinned to the
    top-right of the safe area and **always visible** — only the zoom / lock /
    fullscreen column auto-fades (users never found Units mode behind the
    fade). Hidden everywhere when no type has ≥2 units; segments labelled with their
    visible text (WCAG 2.5.3). Its footprint `SLD_MODE_TOGGLE_BOX` is the real
    layout box: Fabric hit-tests stop at the parent's bounds, so `hitSlop`
    can't reach past the container — `sldModeToggleMetrics` sizes the pill
    itself to a ≥ touch.min target (44 iOS / 48 Android — both 2D full-screen
    pills share `TOGGLE`, like the inline header and the rail). The 2D full screen also shows the top-LEFT
    "Diagram | 3D" pill (`SldViewToggle`, `SLD_VIEW_TOGGLE_BOX`,
    `overlayLeft`); the controls column never grows up under it — it wraps
    into a second column (`sldControlColumnLayout` /
    `sldControlColumnMaxHeight`, every button ≥ touch.min). The fit
    (`computeSldFit`) keeps a strip free for the pills only when needed, and
    a reserved strip is a real **mask band**
    (`fit.mask`, painted by SLDViewport over the diagram, under the pill;
    canvas fill + hairline): a diagram taller than the view must cover its
    fit area, so centred on the hub its upper rows ran up into the strip —
    the pill covered SG-CI-PV-06 (Lucky Units full screen, Oct 2026). Row
    gaps (16/40) are narrower than the 44pt pill, so no translation clears it
    with the hub in view; the band hides those rows instead, and with the
    card rects (`cards`) the hub-centred fit is nudged (≤ half a card, hub
    row kept in view) so the band's edge falls between rows. The pill never
    covers a visible card, at open or after a pan. Tests:
    `sldViewportFit.test.ts` ("never covers a card at open").
  - **The Diagram's fullscreen = PORTRAIT, no rotation of any kind** (the
    3D twin's is sideways by a transform, §23; the phone layout is
    portrait-shaped; the old 90° JS rotation, `rotateInsets`,
    `SLD_FULLSCREEN_ROTATION_DEG` and the pan remap are gone). Device
    safe-area insets are used directly; fit-width, centred on the hub,
    opens UNLOCKED (no page scroll to protect). OS rotation stays banned.
    Pure helpers live in `sldViewportFit.ts`.
  - Tests: `__tests__/sldGroup.test.ts` (incl. route-clearance mutation check,
    WHR cases), `__tests__/sldViewportFit.test.ts` (inset mapping, fit,
    44pt touch target).
- **SLD "3D" = the web portal's own twin** (Oct 2026) — the DEFAULT view,
  inline + full screen (sideways); the Diagram above is one tap away
  ("Diagram | 3D", persisted). The Skia point-cloud 3D is gone. **§23**.
- **Routes import screens directly** — never import screens from the
  `src/components` root barrel (it drags the whole Authenticated tree into the
  splash render; Metro can't defer `export *` re-exports).
- **Cold start**: the splash is now the App-level `SplashOverlay` (§20) —
  `MIN_SPLASH_MS` is gone; the overlay's timeline (minShow anchored to the
  clock start, not additive to auth) replaced it. App.tsx wires react-query
  `focusManager` (AppState) + `onlineManager` (NetInfo).
- **`useSiteData` staleTime = 3 min** (tabs unmount on switch; 30s caused a
  full refetch mid tab-transition). Pull-to-refresh on Dashboard resets the
  infinite query to page 1 instead of serially refetching every cached page.
- **Android release**: R8 + `shrinkResources` ON (`proguard-rules.pro` has
  per-library keep rules), vector-icons ships only `MaterialIcons.ttf`.
  Release smoke-tested 2026-10-01 (sign-in, charts, SLD, GIFs, splash) — it
  caught one R8 crash, see §21. Play signing: see §21 "Play release".
- **Removed deps** (zero imports): lodash, @reduxjs/toolkit, i18next,
  @react-navigation/bottom-tabs, react-native-otp-entry,
  react-native-sticky-range-slider, @react-native-community/geolocation,
  sharp, react-native-bootsplash (§20.5). **Keep `@react-native-community/netinfo`** — required by
  @aws-amplify/react-native AND used by onlineManager.
- **Deleted assets**: `src/assets/lotties-icons/`, `src/assets/lottie-gif/`,
  legacy GIF wrapper components, `summary-icons.ts`, 19 unreferenced Lottie
  JSONs (§4.6's meter.json runtime-recolor note refers to that era; only 5
  Lottie JSONs remain: electric, revenue, co2, coal, treePlant).
- **`display()` logs to console only in `__DEV__`** (Reactotron unchanged).
- Still pending (unchanged from §16): AlarmsView/Trend real-data wiring, MQTT,
  real haptics — plus a recommended future migration of charts from
  react-native-echarts-pro (WebView) to `@wuba/react-native-echarts` (Skia).

---

## 20. Cold-start splash (Sept 2026) — `src/components/screens/Onboarding/Splash/`

A React Native port of the website's "signing-in" animation: a dark circuit
board whose traces grow outward from around the logo, the PES mark drawing
itself stroke-by-stroke and then filling, an ignition wave lighting the
traces, packets, and the caption "Signing you in, <custom:userName> ···".
Cold start ONLY (not after Login). Dark only (`splashPalette` in
`src/theme/tokens.ts`, brand-locked — the native launch screen can't read
the persisted theme).

### 20.1 Architecture

- **App-level overlay, outside the `NavigationContainer`.** `App.tsx`
  renders `<SplashOverlay destReady onRoute onExited/>` as an absolute sibling
  of the container. It must **never call navigation hooks**. There is no
  `Splash` route any more (`OnboardingStackParamList` is just `Login`).
- The overlay decides the root route from `useAuth()` (`'Drawer'` /
  `'Onboarding'`) and reports it via `onRoute` at the **pre-mount** point;
  App then renders `<Routes initialRouteName={route}/>` UNDER the still-opaque
  overlay inside a wrapper `View` whose `onLayout` + one rAF sets the
  `destReady` shared value. The exit fade only starts once `destReady` (or a
  timeout) — it never reveals a blank container. `onExited` → App unmounts
  the overlay. Until a route is picked the container has no navigator, so a
  cold-start `resetToLogin` is a no-op (navigationRef.ts).
- **Files** (import directly by path, never through a barrel):
  | File | Role |
  |---|---|
  | `timeline.ts` | `WEB_TL` / `REDUCED_TL` (web-ms), warp `K`, stall/fallback constants, DEV knobs |
  | `ease.ts` | allocation-free cubic-bezier easings — **all worklets** |
  | `board.ts` | verbatim port of the web trace generator (mulberry32 seed 7) — JS only |
  | `src/components/common/PESLogo/glyphs.ts` | the 5 PES glyph paths (viewBox 0 0 1000 474.3), copied from the web bundle — shared with the static `PESLogo` |
  | `scene.ts` | `buildScene()` — the ONLY place Skia objects are created, once, after layout |
  | `draw.ts` | per-frame recorder (board + logo + glows) — **all worklets** |
  | `useSplashClock.ts` | one `useFrameCallback` state machine (caption → pre-mount → land/abort → dest gating → exit) |
  | `SplashCanvas.tsx` | memo'd full-screen Skia `<Canvas><Picture/></Canvas>` |
  | `SplashCaption.tsx` | RN caption + 3-dot Skia canvas |
  | `index.tsx` | `SplashOverlay` (layout, auth, AppState, JS fallback, status bar) |

### 20.2 Timeline — warped web clock

All model constants stay in **web-ms (`w`)**; only the clock RATE warps.
Uniform `K = 2200/3610`: the web's 3610 ms (minShow 2750 + landFlare 240 +
landFade 620) plays in exactly **2200 ms real, exit included**. Rate is `1/K`
while running and exiting, **1** once `w ≥ minShow` but not landed (auth
stall), and 1 throughout reduced motion. `dt` is capped at 50 ms.
Key real-ms beats: pre-mount 0 (as soon as auth is known) · traces 49–329
· logo stroke 378 · caption 914 · fills 1036 · ignite 1249 · land 1676 ·
root fade 1822–2200.

Deliberate deviations from the web — **signed off 2026-10-01** (the user
said "do as you recommend"): `packetsStart` 2250 (web 2500) so packets are
visible before land; dot-grid fade-in over the first 300 w; reduced-motion
board fade-in (240 ms); neutral caption **"Powering up"** (no session, or
auth still loading at minShow); caption in **Poppins** (Regular line,
SemiBold name — the app's family, already linked; Inter isn't bundled), dots
aligned by Yoga baseline + `translateY(-1)` with lineHeight 20.3 so Android's
includeFontPadding cancels out.

**Routing without a definitive auth answer** (`routeWithoutAuth`,
`storedSession.ts`): the hydrate (`useAuth`) has three outcomes —
`authenticated` → Drawer; `unauthenticated` (nothing stored, no refresh
token, or a session-ending Cognito error) → Login; `indeterminate` (offline,
DNS, Cognito 5xx/429 — Amplify rethrows those) → routed like the 20 s stall
abort. Both consult an offline stored-session probe started at mount
(`authTokenStore.loadTokens()`, local only, `STORED_SESSION_PROBE_MS` = 3 s
cap): a stored **refresh token** → Drawer (user store filled from the stored
ID-token claims, display only), else Login. The first route decided is final
(`sentRouteRef`); a late real outcome never re-routes. So an airplane-mode
launch with a stored session lands in the Drawer with offline/error states,
not Login. **Nothing in the splash clears the stored session** — a slow or
flaky network at launch must never sign anyone out; a definitively dead
session is signed out by `onSessionEnded` (§6). Login can still run while
Amplify holds a session (e.g. a session-ending error at launch), which makes
`signIn()` throw UserAlreadyAuthenticatedException; `cognitoSignIn` catches
exactly that, signs out locally and retries once (the user is re-entering
credentials, and a different account can't inherit the old session).
Background > 3 s after auth → fast-forward to land on resume. JS hard-cut
fallback: auth + 4 s / mount + 24 s. Tests: `splashAbortRouting.test.tsx`,
`splashColdStart.test.tsx` (real useAuth + Amplify), `useAuthHydrate.test.tsx`.

### 20.3 Invariants (crash rules — see also §19 and MEMORY)

- **All continuous motion is ONE SkPicture per frame**, recorded in a
  `useDerivedValue` on the UI thread (`recordFrame`). No react-native-svg, no
  `withRepeat`/`withTiming`, no per-frame Fabric commits. RN styles animate
  only in two short windows (caption entrance `captionP`, root exit `exitP`),
  and those shared values are written only when they change.
- **`'worklet'` on every function** in `ease.ts` / `draw.ts` — enforced by
  the `__workletHash` test. Don't use Reanimated `Easing.bezierFn` in draw
  code (the Jest mock replaces it with identity).
- **Filter sigmas are in viewBox units**: the logo is drawn after
  `translate(logoX, logoY)·scale(lw/1000)`, so CSS `drop-shadow(Npx)` →
  σ = N/2 in viewBox space (fill glow 14px → σ7, breathe 22px → σ11, land
  26px → σ13; stroke glow 2px/10px → σ1/σ5). Every `saveLayer` is bounded
  by `vbPad`.
- **Never create or change a blur filter per frame.** Every image filter is
  built ONCE in `buildScene`; animation changes only layer-paint alpha. The
  web's animated fill-glow radius is two fixed shadow-only layers (σ7 soft,
  σ13 wide) crossfaded by alpha. A per-frame `MakeDropShadow` with a moving
  σ needs new GPU blur kernels and measured a **~300 ms UI-thread stall at
  ignition on every launch** (iOS simulator, Release).
- **GPU warm-up on the first frames** (`w < WARMUP_BEFORE_W`): `warmUp()`
  runs every logo pipeline (both glow blurs, the stroke layer's chained
  shadows, stroked paths, the bar gradient) once at alpha 1/255 on the still
  -empty board. Measured A/B on fresh installs: without it, first-use shader
  compiles froze the logo **245–261 ms as it starts drawing** and
  **146–156 ms at ignition**; with it those stalls move to the invisible
  first frame, same total duration. Any NEW filter/shader added to the logo
  must be added to `warmUp()` too.
- **Pre-mount at auth-ready, not mid-animation** (`premountAt: 0`). Mounting
  the destination is a UI-thread stall (70–140 ms for Login); scheduled at
  the old 2350 w it landed on the ignition climax.
- **Skia objects only after the first `onLayout`** (`buildScene` in a
  `useMemo` keyed on the frozen layout size). The Skia Jest mock has no
  CanvasKit and the test renderer never fires `onLayout`, so App.test never
  touches Skia. `scene.ts` takes an injectable `api` so the draw-safety tests
  run against a stub.
- After `buildScene` returns, **JS never touches its paints/paths again** —
  they're shared by reference with the UI runtime, which mutates them.
- `recordFrame` never throws and never returns null; only the recorder is
  `dispose()`d, never the returned picture. `ContourMeasure.getSegment`
  throws on failure → only called with `stop > 0.01`, full path at p ≥ 1.
- `SplashCanvas` is `React.memo` with props frozen after mount (a Skia
  Canvas re-render restarts its mapper) and **never `opaque`** (Android
  SurfaceView would ignore the parent's fade/scale).
- **Activate the clock only via `activateClock()`** (guards
  `!clock.isActive`): in Reanimated 3.16 `setActive(true)` on an active
  callback starts a second UI-thread rAF loop.
- **Status bar is opaque** (`translucent: false`, board-coloured) during the
  splash, like the rest of the app: a translucent splash resized the Android
  ≤14 root after the frozen first layout and again on unmount. The overlay's
  `<StatusBar>` is re-keyed on `destMounted` so it re-pushes in the
  destination's mount commit (after the destination's own `<StatusBar>`).
- The frame callback must stay **referentially stable** (`useFrameCallback`
  re-registers on change) — every JS callback passed to `useSplashClock` is
  a ref-reading `useCallback`.
- `DEBUG_FREEZE_REAL_MS` / `DEBUG_HOLD` in `timeline.ts` must be `null` /
  `false` in commits (asserted by `__tests__/splashBoard.test.ts`).
- `__tests__/splashBoard.test.ts` also deep-compares `board.ts` against the
  **verbatim minified web generator** (`__tests__/fixtures/webBoardGenerator.js`,
  excluded from Jest's testMatch via `testPathIgnorePatterns`) on 4
  viewports, and steps the real clock callback frame-by-frame (2200 ms
  reveal, late auth, 20 s abort, reduced motion).

### 20.4 Native colour contract — `#0B0F14` everywhere

The native launch screen is a **plain `#0B0F14` board with NO logo**, so the
native → JS handoff is seamless and the logo draws itself first. The same
colour must be used by: iOS `LaunchScreen.storyboard` background, iOS root
view (`customize(_ rootView:)`) + `window.backgroundColor` in
`AppDelegate.swift`, Android `@color/splashBg` (`SplashTheme`
`windowBackground` + status/nav bars) and the Android 12+ system splash
(`values-v31/styles.xml`, transparent icon). `splashPalette.bg` is the JS
side of that contract — change them together.

### 20.5 react-native-bootsplash — removed (Oct 2026)

The dependency, its pod, `BootSplash.storyboard` (+ pbxproj refs), the
`BootSplashLogo-615311` imageset, the `BootSplashBackground` colorset,
`assets/bootsplash/`, Android `drawable-*/bootsplash_logo.png` and the jest
mock are gone (`sharp`, which it pulled in, left yarn.lock with it). The
native launch screen is `LaunchScreen.storyboard` (plain `#0B0F14`) and
Android `SplashTheme` (`@color/splashBg`) — §20.4. Leftovers outside the
build: the tracked, unused Yarn-PnP files `.pnp.cjs` / `.pnp.loader.mjs`
still mention it (the repo runs yarn 1 with node_modules). The next Android
build may need `rm -rf android/app/.cxx android/app/build` once (stale
RNBootSplashSpec CMake cache).

---

## 21. Android build — aligned to RN 0.77.3 (Sept 2026)

`android/` had been scaffolded from a **newer** React Native template than the
installed **0.77.3**, so no Android build had ever worked on this branch. Fixed
2026-09-30 (verified: Release APK builds, cold-starts on the Pixel 7a /
Android 15 emulator, no crashes):

- **Gradle wrapper 9.0.0 → 8.11.1** (what RN 0.77.3's gradle-plugin requires;
  Gradle 9's Kotlin 2.2 metadata broke the plugin build).
- **`usesCleartextTraffic` placeholder** supplied in `app/build.gradle`
  (`manifestPlaceholders`: debug `true` for Metro, release `false` — the app
  only calls https). Newer RN plugins set it automatically; 0.77.3's doesn't.
- **`MainApplication.kt`** replaced with the official 0.77.3 template form
  (`DefaultReactNativeHost`, `SoLoader.init(..., OpenSourceMergedSoMapping)`,
  `load()`); the newer `ReactNativeApplicationEntryPoint.loadReactNative` API
  doesn't exist in 0.77.3.
- **`react-native-svg` 15.3.0 → 15.8.0** (exact pin). 15.3.0 links the pre-0.76
  per-library `react_render_core` target and overrides `setPointerEvents`
  package-private; 15.8.0 is the smallest release linking the merged
  `ReactAndroid::reactnative` target. Chosen as the SMALLEST fix to limit iOS
  risk — iOS Release build + cold start re-verified afterwards. (15.11+ adds RN
  version gating for 0.77/0.78 Yoga changes in code 15.8 doesn't have.)
- Kept deliberately: compileSdk/targetSdk 36, Kotlin 2.1.20,
  `edgeToEdgeEnabled=false` (harmless on 0.77), icon-font trimming, R8, Fresco.
- **R8 keep rule for `ReactModalHostView`** (2026-10-01). Fabric's C++ finds
  it BY NAME over JNI (`JReactModalHostView.h` `kJavaDescriptor`); only its
  method is `@DoNotStrip`, so R8 renamed the class and every core `<Modal>`
  (date pickers via `PickerSheet`, `ChartFullscreenModal`) crashed the
  Release build with `ClassNotFoundException`. Debug builds don't minify, so
  they never showed it. **After adding any native lib or bumping RN, re-audit**:
  collect every `"Lcom/…;"` descriptor in the libs' `.h`/`.cpp` and check it
  isn't renamed in `app/build/outputs/mapping/release/mapping.txt`.

- **`MainActivity.onCreate` calls `super.onCreate(null)`** (2026-10-01,
  react-native-screens requirement). Without it any activity recreation —
  a config change missing from `configChanges` such as the system font
  size, "Don't keep activities", or process restore — crashed on launch with
  "Unable to instantiate fragment com.swmansion.rnscreens…". Keep it when
  re-syncing MainActivity with the RN template (the template omits it).

- **Play release (Oct 2026)** — `./gradlew bundleRelease` →
  `android/app/build/outputs/bundle/release/app-release.aab`, signed with the
  Play **upload key** (Play App Signing holds the real signing key). The
  keystore is `pes-upload-key.jks` in the repo root, **git-ignored (`*.jks`) —
  this GitHub repo is PUBLIC, never commit it** or any password. Gradle reads
  `PES_UPLOAD_STORE_FILE`, `PES_UPLOAD_KEY_ALIAS`, `PES_UPLOAD_STORE_PASSWORD`,
  `PES_UPLOAD_KEY_PASSWORD` from `~/.gradle/gradle.properties` (backup notes +
  public certificate in `~/Documents/PES-Android-Signing/`). Without them
  release builds fall back to the debug key (emulator tests) and
  `bundleRelease` fails on purpose. Release bundles carry native debug symbols
  (`debugSymbolLevel 'SYMBOL_TABLE'`) and the R8 mapping. **Bump `versionCode`
  for every upload** — 1 (1.0.3) is live/in review on Play since 2026-10-03, so
  the next upload needs 2+.
- **16 KB page size (Play requirement, targetSdk ≥ 35)**: the root
  `android/build.gradle` adds `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON` to
  every `com.android.library` CMake build — reanimated 3.16.7, screens 4.5.0
  and skia 1.12.4 don't pass it themselves, so their 64-bit `.so` files were
  linked with 4 KB pages (Play rejects that). RN core / the app's
  `libappmodules` get it from the RN gradle plugin. Check every 64-bit
  `base/lib/*/*.so` in the `.aab` has ELF `PT_LOAD p_align` = 0x4000 after
  adding or bumping a native library.
- **Permissions (Play-minimal)**: INTERNET, VIBRATE (haptics fallback),
  ACCESS_NETWORK_STATE (netinfo → online/offline), androidx's internal
  DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION. `ACCESS_WIFI_STATE` (netinfo) is
  removed with `tools:node="remove"` — netinfo guards every Wi-Fi call. No
  dangerous/sensitive permission → no Play permission declarations. Chart
  export uses the share sheet (no storage permission). Re-check the merged
  manifest when adding a native library.

**Keep `android/` in step with the installed `react-native` version** when
upgrading — compare against `@react-native-community/template@<rn-version>`.
Emulator builds: `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`
with JDK 17 (full 4-ABI Release builds take 30+ min).


---

## 22. UI/UX v4 pass (Oct 2026) — rules every screen follows

A multi-agent audit (90 findings) → 9 work packages (foundation + 8 screens),
each independently reviewed. Screenshots of the before-state and the plan
live outside the repo; this section is the durable summary.

### 22.1 Web parity (test site: Lucky Cement Nooriabad, `146c5345-8f7f-40e9-9e32-b065e085235d`)

- **Values never change, only presentation.** Summary, Cards, Reports and
  Tables values were cross-checked against the web portal AND both API hosts
  (web: `da2xkphekuara…/v1`, app: `d28614wxzuokob…`) — identical schemas and
  values (the web host's live snapshot runs ~40 min staler). Tests pin the
  Lucky Cement figures. Never change which field a number comes from or how
  it is computed without checking the web.
- **Freshness = the web's rule**: `src/utils/freshness.ts` is the ONLY
  source — live ≤ 30 min, delayed ≤ 60 min, stale beyond (web: online / warning
  / offline), offline when backend `state` says so. The site timestamp is
  `/data/all live.metadata.last_update` first (what the web header uses),
  then the newest live `update_at`, then the Dashboard's `dataLastUpdate`
  (`siteDetailModel.headerLastUpdate`, `cards.siteLiveLastUpdate`).
- **LIVE / PulseDot only for current values that are live** (Summary hero,
  Live tab header). Never on list cards, Cards-tab header, Reports or Tables
  (historical periods use `HeroStatusBadge mode='period'`).
- **Units**: the lifetime yield `p24` is kWh on the wire; the app shows it
  /1000 as **MWh** (web + old app said "mWh" — a casing typo).
  `formatQuantity(v, unit, { mode, decimals, rescale })` formats everything;
  `rescale:false` keeps the backend unit. Missing / NA / null → muted "—".
- **Parameter names**: site `globalParams.live` → params-mapping → raw code
  (Live + Trend).
- **Known backend data issues** (do not "fix" in the app): coal offset is
  kWh/2.086 = kg labelled "Tons" (1000× too high, web shows the same);
  trees implausible; site-list `ed_*` vs live "today" counters disagree;
  trend daily aggregation of `p10391` returns ~-1.3e34 and "Genset Energy"
  is a lifetime counter; config maps PV-SG-CI-01 and -03 to the same param.

### 22.2 Foundation (tokens + primitives + utils)

- **Tokens**: new roles `textDisabled`, `brandText`, `borderStrong`, `scrim`,
  `logoPlate`, `energyInk.<source>`, `statusInk.*`, `statusSoft.*`;
  `textOnBrand` is dark ink in BOTH themes (white on emerald failed AA);
  `touch.min` = 44 (iOS) / 48 (Android); micro type = 11pt; `LIGHT_SCHEME` /
  `DARK_SCHEME` exported. `__tests__/tokenContrast.test.ts` computes WCAG
  ratios for every declared pair — keep it green when touching colours.
- **Energy palette = energy sources only** (dots, bars, series, tints).
  Inverter badges, Live categories and load/other Cards tiles are neutral or
  semantic; non-source Live tiles take a soft BRAND sweep (§11); PR bands
  use their own `prBandPalette` (the web's colours, §8).
- **Irradiance is a whole number** (user decision, the one exception to
  2-decimal web parity): `isIrradiance(unit, name)` in `src/utils/units.ts`
  (any W/m² spelling; or, unitless, a whole-word irradiance / POA / GHI /
  GTI / insolation name, unless the name states another unit) →
  `formatQuantity` rounds to 0 decimals ("862 W/m²", "1,024 W/m²") on
  Cards, Live, SLD (grouped = averaged then rounded), Dashboard chips, and
  the Analysis chart's irradiance series. Callers pass `name`.
- **"Analysis" tab**: the SiteDetail "Trend" tab is labelled "Analysis"
  like the web (`TAB_LABELS` in TabSelector.tsx; the internal key stays
  `Trend`).
- **New primitives** (`src/components/common`): `ScreenHeader` (stack
  screens), `Pill` / `PillGroup` (radio semantics, select haptic on change),
  `FreshnessStatus` (self-ticking via `useNow`, never pulses),
  `HeroStatusBadge` (`live` | `period`), `SiteLogo`, `Avatar` (brand style,
  never cyan); `IconButton` variant/size with a real ≥ touch.min box;
  `EmptyStateCard` kind/size; `ErrorBoundary` resetKey + release-safe
  fallback; `PulseDot active`; `TopBar` is a non-accessible container (it
  used to swallow VoiceOver focus of the header buttons).
- **AppText**: `variant` / `tone` / `fixedSize`; font scaling ON (cap 1.3×,
  11pt floor; long-form body 1.6×); `normalizeFont` no longer subtracts 2 on
  Android (`normalizeFontLegacy` only for `fixedSize`). Fixed-geometry
  canvases (SLD node cards, splash caption) pass `fixedSize`.
- **Utils**: `units.ts`, `freshness.ts`, `a11y.ts`, `errors.ts`
  (`friendlyError` — raw messages only go to `display()`), `dates.ts`
  (`formatDateRange` "1 Sep – 1 Oct 2026", never DD/MM/YY),
  `constants/company.ts`, `APP_VERSION` in `constants/app.ts`.
- **Haptics default OFF** on `PressableScale`; `select` only on selection
  changes, success/error only from outcomes.

### 22.3 Screens

- **Shell**: drawer respects the safe area (it was drawn under the Dynamic
  Island), brand Avatar, no fake "User"/"user@email.com"/"Company"
  placeholders, "Signed in" uses the ID token's `auth_time` (it used to be
  app-open time), "Sign in"/"Sign out" copy everywhere, Profile/About/
  Contact/Terms on `ScreenHeader` inside the Dashboard stack.
- **SiteDetail**: tab strip pinned outside the body ScrollView
  (`TabStripSkeleton` holds its slot while loading); pull-to-refresh
  refetches the site's queries; vertical drags in an unlocked SLD block it
  (`usePullToRefreshBlock`, `SiteDetail/pullToRefreshGate.ts`); each tab body
  has its own `ErrorBoundary` (resetKey `${siteId}:${tab}`).
- **Summary**: hero "TOTAL PLANT YIELD … MWh" + "To date" + "Revenue · to
  date" (currency from the backend only); impact cards say "Since
  commissioning"; sites without a diagram get a compact `SLDEmptyState`;
  fullscreen SLD has a Close button and an error boundary.
- **Cards**: sections from `cardBucket()` — Power now / Energy today / Energy
  this month|year|period / Energy lifetime / Other (YTD cards are no longer
  filed under "Today"); labels wrap to 2 lines in the backend's case;
  "No data" for missing values.
- **Trend**: one heading per section (`trendCaption` drops a subHeading that
  repeats it), a window label like "30 Sep 14:35 – 1 Oct 14:35", legend
  height measured (`trendChartLayout`), previous data kept while refetching.

---

## 23. SLD "3D" = the web portal's own twin (Oct 2026) — `SiteDetail/components/SldTwin/` + `scripts/web-twin/`

The energy flow has ONE switch, **"Diagram | 3D"** (Diagram first, like the
web), opening on **3D** (the choice is persisted, `useSldViewMode.view`):

- **3D** = the web portal's OWN compiled 3D twin — the same JavaScript and
  CSS bytes the website serves — in a `react-native-webview`, fed by RN. It
  brings its own tools (fit, zoom, **Plan view** = the web's top-down view,
  tags), HUD ("5.82 MW producing now", status chips) and readings card on
  tap.
- **Diagram** = the app's phone 2D diagram (§19): Pause, phone layout.

Both views share ONE **"Grouped | Units"** mode (default Grouped, in
memory — §23.8): grouped, the twin draws one model per energy-type group,
exactly the Diagram's groups and totals.

User decisions 2026-10-09 (plan `.omc/plans/sld-web-twin.md`, all the
recommended options): the Skia point-cloud 3D was rejected ("SLD does not
look attractive. Try to copy exactly the browser one.") and is REMOVED — no
`SLD3D/`, no `src/utils/sld3d/`, no `scheme.sld3d`. Only the vendored
bytes are exactly the web; a readable port of the twin (the research
spec's Option B) is the fallback only if the fixed in-page behaviour or the
re-sync cost becomes a problem. Never a native GL re-implementation.

### 23.1 The page — `scripts/web-twin/` (dev-time only; its README is the manual)

- `vendor.mjs` crawls the public `/_next/static` files of web build
  `V8bQ6PlHPUKSpJxgVf8cc`, finds the dependency closure of turbopack module
  **748776** (the twin) + 681912 (`react-dom/client`) — 28 modules: React
  19.3, react-redux 9, the SLD model library, three.js r186 + addons — and
  writes `vendor/manifest.json` (md5 + bytes of every file). It fails on a
  missing module, a lazy import (it would load over the network), an md5
  change under the same build, or an ambiguous match.
- `build.mjs` inlines the 8 chunks (turbopack runtime LAST, the Next.js
  bootstrap never runs), the 3 web CSS files, Inter (OFL, data URIs —
  EVERY subset Google serves, as the web loads them: the twin's group tags
  draw a greek Σ; 219 KB of woff2), `app.css` and `bridge.js` into ONE page
  → `SldTwin/twinHtml.generated.js` (`TWIN_HTML`, `TWIN_BUILD_ID`,
  `TWIN_MANIFEST`, `TWIN_THEME_PLACEHOLDER`; ≈ 2.0 MB, ASCII,
  deterministic) + the hand-written `.d.ts`. The page opens with the
  third-party notices as an HTML comment (`THIRD_PARTY_NOTICES.txt` — the
  MIT texts of three.js, React / react-dom / scheduler /
  use-sync-external-store, react-redux, Next.js — + the Inter OFL): the
  chunks carry no licence comments, so the notices ship inside every copy.
  Its `<body>` class is the placeholder `__PES_TWIN_THEME__` (exactly once;
  the app fills it). `build.mjs --check` fails when the committed module is
  stale. **Never edit the generated module or the vendored bytes** — app
  changes go in `bridge.js` / `app.css`. `vendor.mjs --fonts-only`
  re-fetches only Inter.
- The chunks / CSS are NOT committed (`scripts/web-twin/.gitignore`): every
  byte is already in the generated module; `vendor.mjs --from-generated`
  restores `vendor/` offline (md5-checked). The manifest and the Inter font
  (+ `OFL.txt`) are committed. The repo is public: the vendored files are
  the website's public, unauthenticated client bundles.
- `smoke.mjs` renders the GENERATED page in headless Chrome (isolated
  profile, SwiftShader) with `fixtures/lucky.json` (`fixture.mjs`, from
  `src/data/mock/sld.ts`) and asserts the web's own output: "5.82 MW
  producing now", the status chips, 20 tags, theme flip, Plan view, the
  visibility shim, a live update to 6.97 MW, the phone touch hint, real
  CDP touches (the page claims the app's scroll at touch-down and releases
  on lift — one pair per drag —, never for a HUD control or in the full
  screen), Σ
  drawn with Inter, ZERO network requests, 0 JS exceptions; a third run serves
  the LIGHT page as the app does and checks it is light before `init`,
  that a twin mounted hidden runs ~0 frames until `visible`, and that an
  uncaught error after mount is only a `warn`. It kills only the Chrome it
  started, by PID. (SwiftShader timings say nothing about a phone GPU.)
- Offline by construction: no request of any kind. Never load the twin
  from the live site (Apple 2.5.2: no downloaded executable code).

### 23.2 Message contract — `SldTwin/protocol.ts` ⇄ `scripts/web-twin/bridge.js` (change together)

- **RN → page**: `injectJavaScript("window.__pesTwinReceive(<json>);true;")`
  (`encodeTwinCommand`: escapes U+2028/9 and `</`, returns null instead of
  throwing) — the same on iOS and Android:
  - `init {sld, live, theme, siteName, host, visible}` — after `ready`, and
    only once the diagram is loaded AND `/data/all` has answered (never a
    half-loaded site); again after a re-`ready` (reloaded page). A site
    whose `/data/all` settles without `live.data` (`live: null` — the API
    allows it — or a failed first fetch) gets `EMPTY_LIVE` (`{}`): the web's
    store starts as `{}` too, so the twin draws every reading "—" instead of
    a panel that never fills (`useSldTwinInputs`; `live` is null only while
    the query is `pending`);
  - then only what changed, by reference: `live`, `sld`, `theme`,
    `visible`. A query that goes back to empty never overwrites the page.
  - `sld` = the RAW `siteComponents.sldV2` (the twin parses it itself;
    `selectSldGraph` drops fields it reads), `live` = `/protected/data/all`
    → `live.data` (`useSldTwinInputs`; React Query keeps both references
    across equal refetches) — in **Units**. In **Grouped** both are the
    adapter's (§23.8); a mode switch is just another `sld` + `live` pair for
    the running page (never a reload / WebView remount).
- **page → RN**: `window.ReactNativeWebView.postMessage(JSON)`, read by
  `parseTwinEvent` (never throws; unknown / garbled / > 64 KB → ignored):
  - `ready {build, react}`, `mounted {ms}`, `entered {ms}` (intro done) —
    logged with `display()` (first-frame evidence);
  - `error {where, message}` → `display()` + `onFail` once (the WebView is
    dropped). Only what the twin can't run through: a boot failure,
    React's root `onUncaughtError`, an uncaught window error / rejection
    BEFORE the twin is up or once `#root` renders nothing;
  - `exit` — the twin's own WebGL fallback "Show the diagram";
  - `gesture {active}` — inline only: a finger landed on the 3D canvas /
    the last one lifted → `onGesture` (the host holds the page scroll,
    §23.3 "Gesture ownership");
  - `warn {where, message}` → `display()`, never fatal: ResizeObserver loop
    notices, recovered React errors, a malformed app message, and uncaught
    window errors / rejections while the twin is up (a throw in a pointer
    handler — the web keeps running on it, so does the app). Noise must
    never use `error` (every `error` costs the site its 3D for the
    session).

### 23.3 Page-side adaptations (bridge.js / app.css only)

- Mounted BARE: no web toolbar (title / Fullscreen / Wall), no Diagram | 3D
  switch, no "Streaming" tag — RN draws the switch, the full-screen button
  and the honest freshness. The twin sits in an element with the web's
  `.spf-panel` class ONLY for its colour tokens (app.css removes that
  panel's frame); the canvas keeps the web's 1 px border at a 12 px radius.
- The canvas fills the WebView. **Every gesture on the 3D is the twin's,
  inline too**: `touch-action: none` in both hosts (app.css) — a vertical
  drag tilts the model, unlike the web's coarse-pointer `pan-y` (user,
  2026-10-10).
- **Gesture ownership (inline)** — user reports 2026-10-10: "when moving 3d
  sld it scrolls down the screen too", then (after only turns / pinches
  were claimed) "scroll up and down still scroll screen": the app's native
  scroll view under the WebView followed every drag on the 3D. Layers, from
  the earliest:
  1. **Native, synchronous** (no JS round trip — a JS hold lands a frame or
     more after touch-down, and a brisk swipe passes the scroll view's
     start threshold before that):
     - **Android**: the inline WebView has `nestedScrollEnabled`
       (SldTwinView) → RNCWebView calls `requestDisallowInterceptTouchEvent
       (true)` on the UI thread from the first touch, so the body
       `ReactScrollView` never intercepts a drag that starts on the 3D
       (before: it took over after ~8 dp, sent JS a touchcancel — both JS
       holds released — and scrolled the whole drag while the twin got a
       cancel). NOT for pull-to-refresh: `ReactSwipeRefreshLayout` ignores
       the request, so at scroll 0 a downward drag on the 3D can still start
       a pull until the JS hold's `enabled={false}` lands (residual race,
       pull only).
     - **iOS**: `SldTwinPanel` (SLDDiagram) wraps the panel in a
       gesture-handler `Pan` with NO callbacks, `minDistance(
       SLD_TWIN_IOS_SCROLL_GUARD_PT)` (6 — above a tap's jitter, below the
       scroll view's ~10 pt start), `cancelsTouchesInView(false)`,
       `shouldCancelWhenOutside(false)`: once active it fails the body
       UIScrollView's own pan (no simultaneous recognition), natively; the
       page keeps every touch (WebKit's touch-events recognizer can't be
       prevented — the twin kept turning while the page scrolled before).
       NEVER on Android: an active gesture-handler pan there makes the RNGH
       root intercept and the WebView gets a cancel. **Device check pending**
       (fast vertical / diagonal flicks, pinch, tag + tool taps with a real
       finger's jitter).
  2. **RN touch-down** (`holdTouch`): `SldTwinPanel`'s `onTouchStart` holds
     the body scroll + pull-to-refresh for ANY touch in the panel (canvas,
     tool, mix / legend, readings card, loading skeleton) until the last of THIS
     panel's touches ends — tracked by `changedTouches` identifier, never
     the screen-wide `touches` count (a finger elsewhere that lifts last
     sends its touchend to ITS target: the page stayed stuck). A cancel or
     no finger left anywhere clears the set.
  3. **The page's claim** (`holdPage`): the bridge ("gesture ownership")
     claims the moment a touch pointer lands on the twin's CANVAS (never a
     tool button / the mix / the legend / the readings card; the tags are
     pointer-events:none labels, so a finger on one IS a canvas touch) —
     `{type:'gesture', active:true}` —, and
     `active:false` when the last finger lifts (also on `blur` / a hidden
     page) → `onGesture`.
  2 and 3 are INDEPENDENT `useBodyScrollHold()`s (the gates are ref-counted):
  neither can release the other's. Both drive `BodyScrollGateContext` /
  `PullToRefreshGateContext` (`SiteDetail/pullToRefreshGate.ts`) →
  SiteDetail's ScrollView `scrollEnabled` and `bounces` / RefreshControl
  `enabled` — which stays on while a pull refresh is running
  (`!pullBlocked || refreshSource === 'pull'`: Android's
  `setEnabled(false)` resets — hides — the spinner, and a refreshing layout
  never intercepts a new pull anyway). Because nothing on the 3D scrolls the
  page, the inline card never fills the body viewport (§23.4 card height).
  Full screen never claims (no page scroll; no guard, no
  `nestedScrollEnabled`). Verified on the iOS simulator with the JS holds
  (vertical, diagonal and pinch gestures leave the page still; mouse-speed
  drags); the native layers are not yet device-checked.
- A `document.hidden` / `visibilityState` shim + `visibilitychange` driven
  by `visible`: the twin pauses itself (its IntersectionObserver cannot see
  RN scrolling). The twin starts every scene build (mount, a new `sld`)
  with its loop ON and reads `document.hidden` only in its listener, so the
  bridge's `MountProbe` replays a hidden page to it after every commit
  (a passive effect — children's run first): a twin mounted below the fold
  (`init` with `visible:false`) or rebuilt off screen runs no frames.
- The page boots in the app's theme: `SldTwinView` fills the `<body>`
  class placeholder with the theme the WebView is created in (one string
  per theme per session) and bridge.js boots from that class — the light
  card never paints dark first. Later flips are `theme` messages (no
  reload).
- `--brand-rgb` = the web default; Inter inlined; body background = the
  web's `--bg-0` (#0B0F14 / #F6F8FB — the `webTwin` tokens; keep them equal
  on every re-sync).
- Live values follow the web hook (ported in bridge.js): numbers to 2
  decimals, 0 at ≥ 1000, "—" when missing; flow = the node's `animation`
  rule read the way the web's mathjs reads `${name} ${op} ${value}`: the six
  comparisons with spaces allowed, a right-hand side mathjs can't read as a
  number ('', ' ', 'abc', '1,000', '10kW') → idle, true / false / NaN /
  Infinity / null and signs as mathjs, mathjs's tolerance (relTol 1e-12,
  absTol 1e-15) — a differential run against the web's own mathjs found no
  difference in 15,288 comparison rules (`__tests__/sldTwinBridge.test.ts`
  pins them). Not mirrored (no SLD rule uses them): hex, constants like
  `pi`, parentheses, arithmetic / logic "operators". liveValues keeps its
  identity until `sld` / `live` change (the web memoises it; the twin
  samples its readings sparkline on every new object — a theme flip must
  not add a point). Site expressions (`explve…`) and group formulas are NOT
  evaluated — the app has no expression evaluator either.
- The bridge never throws past itself; an `init` that arrives before the
  modules finished loading mounts as soon as they have.

### 23.4 RN host rules

- **`SldTwinView`** (`siteId`, `host: 'inline' | 'fullscreen'`, `mode` —
  the hosts pass `useSldModel`'s EFFECTIVE mode —, `visible`, `style`,
  `onExit`, `onFail`, `onGesture` — always paired: a page that goes away
  mid-gesture (unmount, reload, crash, failure) reports `false`; the inline
  host passes `useBodyScrollHold()`) requires the generated module on first
  RENDER — never at import (the splash never parses 2 MB); hosts import
  `SldTwin/SldTwinView` directly. The site name comes from the SiteDetail
  route's params, found in the navigation stack by site id.
- **WebView props** (all mandatory): `source={{ html, baseUrl: 'about:blank' }}`
  (an empty `baseUrl` becomes a `file://` URL on iOS and fails the
  whitelist); `originWhitelist={['about:*']}` + `onShouldStartLoadWithRequest`
  allowing only `about:blank` / `about:srcdoc` (note: react-native-webview
  hands a URL that fails the whitelist to `Linking.openURL` BEFORE that
  callback — the twin never navigates); `setSupportMultipleWindows={false}`;
  no scroll / bounce / overscroll / zoom controls; inline,
  `nestedScrollEnabled` (Android; §23.3 "Gesture ownership");
  `webviewDebuggingEnabled={__DEV__}`; painted with the twin's background
  (no white flash); `autoManageStatusBarEnabled={false}` with no later
  spread (`chartWebViewSettings.test.ts`, §19); the DEFAULT
  `androidLayerType` — never `'software'` (it disables WebGL).
- A dead web content process (iOS `onContentProcessDidTerminate`) /
  renderer (Android `onRenderProcessGone`) remounts the WebView by key, its
  page in the theme of now. Only a crash LOOP → `onFail`: 2
  (`TWIN_MAX_CRASHES`) deaths in a row of pages that never `entered`, each
  within 30 s (`TWIN_CRASH_WINDOW_MS`) of its page's start; a page that
  entered or ran longer was a routine kill (iOS reclaims a backgrounded
  WebView's process) and the count starts again. A load error → `onFail`.
- A `Skeleton` covers the panel (touch-through, "Loading the 3D view")
  until the page posts `mounted` — the Summary placeholder's skeleton
  carries straight on — and again after a remount.
- **Inline** (`SLDDiagram`, Summary "Energy flow"): a header row ABOVE the
  panel for BOTH views (`SldViewHeader`, ControlButtons.tsx):
  `[Diagram | 3D] [Grouped | Units] … [full screen]` — the view pill
  (hidden once the twin failed for the site), the mode pill (only when
  something groups — `canGroup`) and, in 3D only, a soft `IconButton` with
  the `screen-rotation` glyph and `SLD_SIDEWAYS_FULLSCREEN_HINT`; the row
  hides when neither pill shows. Geometry = `sldViewHeaderGeometry` /
  `useSldViewHeaderGeometry` (one source for the row AND its skeleton):
  every pill container and segment ≥ `touch.min`; each pill sized to its
  widest BOLD label at the size it renders (the width-scaled 11 pt, AppText's
  11 pt floor, × `useWindowDimensions().fontScale` capped at 1.3) + 4 pt a
  side (`sldHeaderPillMetrics`) — labels never `adjustsFontSizeToFit`, never
  cut. When the pills + the button don't fit one line (a 360 pt Android
  phone at 48 pt targets; a 375 pt iPhone with large text) Grouped | Units
  WRAPS to a second line under Diagram | 3D inside the left cluster, the
  button staying on line 1 (`sldViewHeaderLayout`, a fixed row height, no
  onLayout). The full-screen slot is reserved in BOTH views, so Diagram ⇄
  3D never re-flows the row. 3D body = `SldTwinView host="inline"`,
  `SLD_INLINE_WIDTH` × `useSldTwinInlineHeight()` (`sldTwinInlineHeight(
  window, bodyViewport)`: the web's phone rule `clamp(600px, 78vh, 920px)`
  in window points — a TALL card — CAPPED so `SLD_TWIN_SCROLL_RESERVE`
  (160 pt) of SiteDetail's body viewport stays free, floor
  `SLD_TWIN_INLINE_FLOOR` (360) — but never closer than `SLD_TWIN_MIN_FREE`
  (88) to the viewport's height, which beats the floor (a 280 pt split-screen
  body gets a 192 pt card, not a 360 pt one covering it): every drag on the
  3D moves the model, so a card filling the viewport would leave nothing to
  scroll by (the clamp gave 682 pt in a ≈ 690 pt viewport on a 402 × 874
  iPhone). Before the body is
  laid out — and in tests — `SLD_TWIN_INLINE_HEIGHT` (the clamp alone);
  the viewport height comes from `useBodyViewportHeight` (bodyViewport.ts,
  re-renders on resize only)), clipped to `radius.md` (12, the web canvas's
  own corner — the Summary placeholder's skeleton uses it too in 3D, so the
  300 ms swap keeps its corners).
  `visible` = `useBodyViewportVisibility` (mirrored into state ONLY on change,
  inside `SldTwinPanel`, so a scroll re-renders that panel alone) AND
  `useIsFocused`: under the full-screen route an inline twin that was up
  stays MOUNTED but paused — and none is CREATED there (`twinLatched` in
  SLDDiagram: "Diagram" then "3D" inside the full screen would otherwise
  start a second hidden page — two parses, two three.js scenes, two WebGL
  contexts; one renderer process on Android): a static box in the twin's
  colour until the screen is focused again. The Summary placeholder =
  `SldViewHeaderSkeleton` (the same row, wrapped or not, a skeleton per
  pill + the 3D button) + the panel at the same height (no 300 ms jump).
  Diagram body = the 2D `SLDViewport` as §19 (controls, Pause) WITHOUT its
  in-panel Grouped | Units pill (it heads the panel), so the inline fit and
  `sldInlineHeight` reserve no strip / mask band for it (the 2D FULL SCREEN
  keeps its in-panel pills and their strip).
- **Full screen** (`SLDFullscreenScreen`, a navigation screen): 3D = the
  twin (`host="fullscreen"`, `visible` = focused) SIDEWAYS — a long × short
  container turned +90° about its centre by a TRANSFORM
  (`sldLandscapeContainer`; the ChartFullscreenModal pattern) and
  `sldLandscapeGeometry` (sldViewportFit.ts): the portrait insets turned
  (island → content LEFT, home indicator → RIGHT), the twin in the safe area
  left of the always-visible `SldTwinRail`, top → bottom: Close; a round
  "Diagram" button (glyph + caption; the rail is as wide as the caption at
  its largest, `SLD_TWIN_RAIL`) that turns the screen back UPRIGHT into the
  Diagram full screen, whose top-left "Diagram | 3D" pill turns it sideways
  again; and, when something groups, **Group | Units** — two vertically
  stacked segments in a pill a round button wide (`sldRailMetrics`: the
  round button is ≥ touch.min + the pill's padding + border, so each
  segment is ≥ touch.min wide AND tall; `sldRailStackHeight` fits a 360 pt
  short edge, tested 360–440). Its labels are "Group" / "Units" (same mode,
  same hints as the header), their OS text scaling capped where bold "Group"
  still fits the segment (`sldRailLabelFit` → `SLD_TWIN_RAIL_LABEL_FIT`;
  only a tablet's width-scaled font is shrunk, to an exact size) — never
  `adjustsFontSizeToFit` in the turned view. No Pause / Recentre in 3D (the
  twin has its own Fit and Plan view). The first sideways entry per session shows "↻ Turn
  your phone to the left" in portrait (announced, faded on the UI thread).
  The rail's Close is outside the twin's ErrorBoundary. A window already
  wider than tall (Android tablets / foldables / split screen) is laid out
  sideways WITHOUT a turn. The screen's background is the twin's, so the
  bands under the island and beside the rail read as its own.
- **Never a `<Modal>`, never an OS orientation change** (§19's crash
  class). The turn is one static matrix on one view; the WebView maps
  touches into its turned coordinates natively (UIKit / Android) — device
  check pending.
- **Fallbacks** (`useSldModel`): `onFail` → `fallBackTo2D()` marks the SITE
  for the session (a module Set, `useSyncExternalStore`): effective view
  `2d`, `can3D` false (the switch hides), the stored choice stays `3d`, so
  other sites still open in 3D. `onExit` → `setView('2d')` (persisted).

### 23.5 Honesty split

- **3D = web semantics, unchanged**: it animates whatever the data's age,
  a negative battery reads "Charging" with reversed comets, "Updated …" and
  "… producing now" are the web's wording. The app's ONLY honest freshness
  for it is the Energy-flow section header's status (`SldLiveTag`,
  `headerLastUpdate` — the SiteDetail header's stamp): a brand "Live" tag
  while live, otherwise the shared `FreshnessStatus` ("Delayed · 35 min
  ago", "Offline · last data 28 Sep") — never nothing beside a twin that
  animates stale data. The web's always-on "Streaming" tag is never shown.
  (The sideways full screen has no freshness of its own.)
- **Diagram = the app's rules**: motion only while the data is LIVE, Reduce
  Motion and the user's Pause respected (`useSldMotion`, §19).

### 23.6 Re-sync after a web deploy

Module ids and chunk names change with every web build; the vendored page
keeps working forever, it just stops tracking the web. To follow a new
build (details: `scripts/web-twin/README.md`):

1. Find the build id and the two turbopack runtime chunks (`main`, `_app`)
   from the site's HTML (View Source — `vendor.mjs` may only fetch
   `/_next/static` files, not pages).
2. `node scripts/web-twin/vendor.mjs --build <id> --html-runtimes a.js,b.js`
   (detects the five modules bridge.js needs by source signature; override
   with `--twin`, `--react`, `--jsx`, `--reactDomClient`, `--reactRedux`).
3. `node scripts/web-twin/build.mjs`, then `node scripts/web-twin/smoke.mjs`
   (update its assertions only if the web changed its wording on purpose).
4. Device check; commit the manifest, the generated module and any bridge /
   app.css change together. Re-check the `webTwin` tokens against `--bg-0`.

What can change silently on the web side: the twin's prop contract, the
redux key `site.unprocessedLiveParameters`, the `liveValues` rules (ported
in bridge.js), the CSS classes app.css relies on (`.sld-toolbar`,
`.sld-canvas`, `.tw-canvas`, `.spf-panel`), its strings. After a fresh
clone: `node scripts/web-twin/vendor.mjs --from-generated`.

### 23.7 Tests and known gaps

- Tests: `sldTwinProtocol` (contract incl. `warn`, encoding, navigation
  gate), `sldTwinInputs` (incl. `EMPTY_LIVE` / pending), `sldTwinView`
  (init / sync, no-live and failed-fetch init, the themed page, the
  loading skeleton, exit / fail / warn, crash remount + the crash-loop
  rule, the WebView props), `sldTwinBridge` (bridge.js's liveValues port,
  run as shipped: the mathjs-verified flow rules, formatting, identity),
  `sldHosts` (switch order + default + persistence, the inline and
  full-screen hosts with the real model, exit / fail, no twin created under
  the full screen; Grouped | Units: header order in both views, the shared
  mode across views, `mode` handed to the twin inline + sideways, forced
  units when nothing groups, the wrapped row + its skeleton, the rail's
  Close → Diagram → Group | Units, no in-panel pill inline), `environment`
  (placeholder heights + header skeletons incl. no-group / failed-twin
  rows, the stale-site status, the sideways escapes, the turn hint),
  `sldViewportFit` (twin height, turned container + geometry, rail + its
  Group | Units fit at 360–440, header pills + wrap at 360–440 × text
  scales, inline 2D without the strip vs the 2D full screen with it),
  `sldMotion`, `sldViewMode` (default grouped, one mode for both views),
  `chartWebViewSettings`, plus the adapter's own suites `sldTwinGrouped` and
  `sldTwinFlowRule` (§23.8). The page-scroll holds (§23.3): `sldHosts`
  ("inline 3D in SiteDetail's body": the capped card in the real providers,
  one finger / a pinch / a finger elsewhere lifting last / a cancel / the
  two holds' independence / unmount, the iOS guard's config, none on
  Android), `bodyScrollGate`, `sldTwinGesture`, the `gesture` cases of
  `sldTwinProtocol` / `sldTwinView` (+ `nestedScrollEnabled` inline only),
  `sldViewportFit` (the cap, the short-viewport gutter) and the smoke's CDP
  touches (claim at touch-down, one pair per drag, none for a HUD control or in the
  full screen).
- Not yet verified on a device: first-frame time and memory in WKWebView /
  Android System WebView (shader compile; two WebGL contexts while the full
  screen is over the paused inline twin), the iOS `about:blank` load, the
  inline vertical-scroll vs sideways-turn split, tap → readings card and
  pan direction in the turned container. **Android is untested** (only
  after the user approves iOS).
- No timeout waiting for `ready` / `mounted`: a page that never answers
  stays the loading skeleton (no fallback).
- The crash-loop rule counts per mounted twin (the counter restarts on a
  remount — a tab switch, a new full-screen route — and the inline and
  full-screen twins count separately); a loop (2 deaths in a row, none
  entered, each < 30 s after its page started) switches that site to the
  Diagram for the rest of the session.
- Site expressions (`explve…`) / group formulas are unsupported (as in the
  app).
- Licences: the MIT notices (three.js, React / react-dom / scheduler /
  use-sync-external-store, react-redux, Next.js) and the Inter OFL ship
  INSIDE the page as an HTML comment (`scripts/web-twin/THIRD_PARTY_NOTICES.txt`
  + `vendor/fonts/OFL.txt`, via build.mjs). The app has no licences screen;
  add one there if the store review or the company asks for in-app
  attribution.

### 23.8 Grouped | Units in 3D (Oct 2026)

User request 2026-10-09, after approving the twin: "Do grouped and Units
for 3D too." Decisions:

- **ONE mode for both views** — the existing `useSldViewMode.mode`
  (`DEFAULT_SLD_MODE` = `'grouped'`, in memory, never persisted): switching
  it in 3D switches the Diagram and vice versa. When nothing groups
  (`canGroup` false) every Grouped | Units control hides and the effective
  mode is `'units'` (what the hosts hand `SldTwinView`).
- **Placement**: inline, the header row above the panel for BOTH views
  (§23.4, wraps on narrow phones); sideways 3D, the rail (Close → Diagram →
  Group | Units, §23.4); the 2D full screen keeps its top-right pill.
- **Units = exactly the old 3D**: the RAW `sldV2` + `live.data`, the same
  objects (byte-for-byte what the twin got before).
- **Grouped = the same twin fed the app's OWN grouping** (adapter:
  `SldTwin/twinGrouped.ts` — `buildTwinGroupedSld` / `buildTwinGroupedLive`
  / `twinDataFor`; page side: `scripts/web-twin/bridge.js` "grouped looks";
  wired through `useSldTwinInputs(siteId, mode)`), so 2D and 3D group
  identically. Each group of `buildSldGrouping` (Lucky: "Solar · 9", "Wind ·
  6") becomes ONE regular sldV2 node — NOT the web's own group schema
  (`aggregation` / `groupMembers`), which the twin would draw as a plain
  junction cabinet: id / position = the grouping's group node, heading =
  the group label, icon = the twin's icon for the type (`TWIN_GROUP_ICON`;
  WHR keeps its members' icon so the twin's title rule picks the steam
  variant) in the members' majority BACKEND colour (`data.color` +
  `icon.color`; the group → target cables take the members' majority
  backend cable colour, read the twin's way: `style.stroke` ‖
  `markerEnd.color` ‖ `color`) — NOT the Diagram card's palette colour, so
  a Grouped ⇄ Units switch never recolours the 3D (mix bar, pad rings,
  comets; with the palette, Lucky's wind went orange → cyan and matched
  Generators). Members with no colour → the group node / cable has none
  either (never a palette fallback: the twin's own no-colour path, as for
  those members in Units). Majority ties go to the FIRST member
  (`twinMajority`, like the bridge's `majorityLook`). The Diagram's group
  cards keep their palette colours. `edgesConnect: 'source'`, keys =
  the Diagram group card's rows (≤ `SLD_GROUP_MAX_ROWS`, same labels /
  units) reading SYNTHETIC params `live.<id>.value`, and an `animation`
  rule `live.<flow id>.value != 0` where the flow id's value counts the
  members the twin draws RUNNING in Units, by the twin's OWN rule
  (`SldTwin/twinFlowRule.ts`, a port of bridge.js's liveValues rule,
  differential-tested against the shipped section in `sldTwinFlowRule`:
  a member's `animation` read the web's way — the reading rounded to 2
  decimals, operator `!=` / value 0 when absent —, or, with NO rule,
  "live" = a numeric reading). So a group runs ⟺ one of its units runs in
  Units, and "… producing now" / the mix are the same in both modes
  (`sldTwinGrouped` checks it with the shipped bridge). NOT the Diagram's
  `isEdgeAnimated` (it drops incomplete rules, ignores rule-less "live"
  units and doesn't round): the 2D Diagram and the 3D may disagree on those
  edge cases, Grouped and Units in 3D never. When NO member has a rule the
  group gets none either (the twin calls it "live", like its units) and
  each group → target cable carries the twin's per-edge mode of the
  members' cables to THAT target ('flow' unless every one is `idle`) — the
  twin has only a node-level rule, so a rule would flow every cable of the
  group. (Mixed rule / no-rule members with differing per-target modes
  collapse to the node rule — no site seen.) The flow id
  is WORDED ("Wind units flowing") because the twin's readings card prints
  it ("Energy shows on its cable while Wind units flowing ≠ 0."); key ids
  are `pesgrp<g>k<k>`. Members
  and every edge touching them are removed; the grouping's group → target
  edges replace them; every other node / edge is the SAME raw object, in
  order. The live envelope = the real `live.data` PLUS one
  `{ value: number | 'NA', update_at }` per synthetic param — the numbers
  the Diagram's group card shows (`makeGroupedResolver`: sums in the
  majority unit, the PF fold, means), stamped with the newest member
  `update_at`. Structure is memoised per (raw sldV2, grouping) — config
  only; the envelope per (grouped sld, live) — a live tick resends only
  `live`. `selectSldGraph` caches per `sldV2` OBJECT as well as per config,
  so a config refetch that keeps the diagram (React Query structural
  sharing; only cards / trends changed) yields the same graph → grouping →
  grouped `sld` / `live`: nothing is sent and the twin does NOT remount
  (camera, selection, intro kept) — the Diagram's layout caches hit too.
- **Same 3D model as the members**: RN puts the RAW member nodes on the
  group node (`data.pesGroupMembers`, `TWIN_GROUP_MEMBERS_KEY`); before the
  twin sees the diagram the bridge resolves each member with the web's OWN
  `lookOf`, takes the majority { kind, look } and pins the group node to it
  (the lightest change that makes `lookOf(group)` agree), then deletes
  `pesGroupMembers`. Lucky: Wind · 6 = the members' wind/directDrive,
  Solar · 9 the members' solarLg/fixed, WHR stays the steam genset. The
  web's `lookOf` lives in module 277932 and `fromSldV2` in 91710: manifest
  roles `sldLook` / `sldModel` (`vendor.mjs` finds them by the export they
  register; optional — missing = a `warn`, the group keeps its own
  icon/title).
- **One model per group** (the twin draws one model per node): the tag and
  the readings card carry "Wind · 6" and the totals.
- A mode switch sends the running page `sld` + `live` (into Grouped the
  data first, back to Units the diagram first — the page never holds a
  diagram without the readings it names); no page reload, no WebView
  remount. **But every NEW diagram mounts a NEW twin inside the page**
  (bridge.js keys it by a diagram `generation` — a mode switch, a config
  refetch that changes `sldV2`, a second `init`): the twin rebuilds its
  scene in place by `forceContextLoss()` on its renderer and a new one on
  the SAME canvas, whose context then stays lost ("3D isn't available
  here"); the web never hits it because it remounts per site. The store,
  theme and visibility carry over; camera, selection and Plan view start
  fresh and the short intro replays.
- Tests: `sldTwinGrouped` (the adapter, incl. the backend-colour rule —
  the twin's cable-colour order, no palette fallback, first-member ties —
  and Grouped ⇄ Units running the same units through the shipped bridge:
  rule-less, incomplete-rule, sub-0.005, mixed, per-target cables),
  `sldTwinFlowRule` (the port vs bridge.js over 9,338 rules + key shapes),
  `sldTwinGroupedBridge` (grouped looks against the web's own `lookOf`),
  the `mode` cases of `sldTwinInputs` / `sldTwinView`, the smoke's grouped
  runs (`fixtures/lucky-grouped.json` = the adapter's output; regenerate
  with `SLD_TWIN_WRITE_FIXTURES=1 npx jest sldTwinGrouped`), the UI side in
  `sldHosts`, `sldViewportFit`, `sldViewMode`, `environment` (§23.7), and
  the inline gesture hold: `sldTwinGesture` (the bridge's claim-at-touch-down
  ownership, run as shipped, + app.css `touch-action: none` inline),
  `bodyScrollGate`, the `gesture` cases of `sldTwinProtocol` /
  `sldTwinView`, the panel's RN touch hold + iOS guard in `sldHosts`, the
  card cap in `sldViewportFit` ("never fills the body viewport", the
  short-viewport gutter), the `sldTwinInputs` config-refetch case (the
  diagram kept → nothing sent).
