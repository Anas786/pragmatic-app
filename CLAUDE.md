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
│           │       ├── SLDDiagram.tsx
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
- **Impossible-reading guard** (`IMPOSSIBLE_READING_CEILING = 1e15`, Trends/helpers.ts): finite values with |v| ≥ 1e15 become gaps and a visible "N invalid readings hidden" caption appears in both views — real backend data shipped ~4e31 for "Wind Energy Day", which flattened every other series on the shared scale. Never hide such points silently.

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
never coerced to 0 (a dead inverter must be able to be WORST). PR status
bands stay 90/80/70 (`PR_STATUS_THRESHOLDS`); the web colours its PR bars at
40/62/82 — product decision pending.

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
    (`energyInk` glyph). No source (load, bus, WHR …) → a flat, neutral
    tile whose icon well alone is brand-tinted (`brandText` glyph) — a full
    brand sweep read as solar / "OK" (§22.2). Categories never get colours.
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
  after touching SLD transform code (inline + fullscreen rotated mode).
- **SLD grouping** (Grouped / Units toggle, `src/utils/sldGroup.ts`):
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
    non-persisted `useSldViewMode` zustand store. `SLDViewport` is keyed by
    mode so a switch remounts + re-fits; its lock + orthogonal-routing state
    is lifted to the parents (controlled props) so it survives the remount.
    The toggle is its own `SldModeToggle` (ControlButtons.tsx), pinned to the
    top-right of the safe area and **always visible** — only the zoom / lock /
    fullscreen column auto-fades (users never found Units mode behind the
    fade). Hidden when no type has ≥2 units; segments labelled with their
    visible text (WCAG 2.5.3). Its footprint `SLD_MODE_TOGGLE_BOX` is the real
    layout box: Fabric hit-tests stop at the parent's bounds, so `hitSlop`
    can't reach past the container — `sldModeToggleMetrics` sizes the pill
    itself to a ≥44pt target. The fit (`computeSldFit`) keeps a strip free
    for it only when needed, so the pill never covers a card at open/re-fit
    (after the user pans it may, by design).
  - **Fullscreen safe area**: the route rotates content 90° in JS
    (`SLD_FULLSCREEN_ROTATION_DEG`), so device insets are mapped through the
    rotation (`rotateInsets`: device top → content left, right → top, bottom
    → right, left → bottom) and the rotated container is sized from
    `useSafeAreaFrame()`. Fit, re-fit, button column and pill all respect the
    mapped insets (nothing under the Dynamic Island / status / nav bar).
    The rotation constant and SLDViewport's pan remap (`tx += dy; ty -= dx`)
    must change together. Pure helpers live in `sldViewportFit.ts`.
  - Tests: `__tests__/sldGroup.test.ts` (incl. route-clearance mutation check,
    WHR cases), `__tests__/sldViewportFit.test.ts` (inset mapping, fit,
    44pt touch target).
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
  caught one R8 crash, see §21. ⚠️ Release still signs with the **debug keystore** —
  must fix before store submission.
- **Removed deps** (zero imports): lodash, @reduxjs/toolkit, i18next,
  @react-navigation/bottom-tabs, react-native-otp-entry,
  react-native-sticky-range-slider, @react-native-community/geolocation,
  sharp. **Keep `@react-native-community/netinfo`** — required by
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

### 20.5 react-native-bootsplash — intentionally unwired

`react-native-bootsplash` is still installed but NOT natively wired (no
`RNBootSplash.init*`), and `App.tsx` no longer calls `RNBootSplash.hide`.
Follow-up uninstall PR: `yarn remove react-native-bootsplash` + `cd ios &&
pod install`, delete `assets/bootsplash/`, `ios/.../BootSplash.storyboard`
(and its pbxproj refs), `BootSplashLogo-615311.imageset`,
`android/.../drawable-*/bootsplash_logo.png`, and the bootsplash mock in
`jest.setup.js`.

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
  Inverter badges, Live categories, PR status, load/other tiles are neutral
  or semantic.
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
