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
| Cognito Mobile Client | `27sa4crum5hb010qar9sja1l09` |
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
│   │   ├── raw/            (flat .gif files for the Cards-tab map)
│   │   └── lottie-icons.ts (lottiePathGif map + optional `lottieSource` for vector variants)
│   ├── lottie/             (Lottie JSON animations — Summary tab + recolor sources)
│   ├── lottie-gif/         (additional animated GIFs)
│   ├── lotties-icons/      (alt animated icons)
│   ├── device-icons/       (SLD device-state SVGs)
│   ├── images/             (static images)
│   └── svg/                (misc SVG)
├── components/
│   ├── common/             ← shared design-system primitives
│   │   ├── AppText, AppTextInput, Surface, PressableScale, Skeleton,
│   │   ├── PulseDot, OverlineLabel, GlassChip, PowerMixBar,
│   │   ├── HeroGradientCard
│   │   └── (legacy: Avatar, Button, Header, TextField, etc.)
│   └── screens/
│       ├── Onboarding/     (Splash, Login)
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
│           │       ├── PerformanceReportCard.tsx ← HeroGradientCard + donut + source list + stacked bar
│           │       ├── InverterTableCard.tsx     ← HeroGradientCard (fleet aggregates) + filter pills + animated bars
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
│   │   └── session.ts      (token cache + getValidIdToken with auto-refresh)
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
- **Every axios request** runs through the request interceptor → `getValidIdToken()` → either returns the cached idToken or calls `fetchAuthSession()` to refresh. 60-s expiry buffer, in-flight dedup, in-memory cache (`session.ts`).
- **401 retry**: response interceptor force-refreshes once, retries, then calls `executeLogout()` if still 401.
- `executeLogout` clears React Query (`queryClient.clear()`), Cognito session, in-memory user, and `resetActiveSite()`.
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
  - **Custom** → `DateRangePickerModal` (max 1 month — enforced at the picker level)
  - **Month** → `MonthYearPickerModal mode="month"`
  - **Year** → `MonthYearPickerModal mode="year"`
  - **Life Time** → pill is non-interactive (`pillDisabled`)
- **Default Custom range** = `today - 15 days` → `today` (`DEFAULT_CUSTOM_RANGE_DAYS = 15`).

Each card holds its own `startDate`, `endDate`, `selectedMonth: MonthSelection`,
`selectedYear: number`, `activeFilter: InverterFilterOption` state. They feed
`buildReportFilter(...)` which produces the discriminated `ReportFilter`.

### Performance Report (Reports tab) — v3

**Layout flow (control → snapshot → detail):**
1. `DateFilterHeader` (`title="Energy Mix"`)
2. Filter pills
3. **HeroGradientCard** — `●LIVE · ENERGY` + `Σ N` GlassChip + `TOTAL GENERATED`
   big number + `POWER MIX` overline + `PowerMixBar` segmented bar
4. **Surface (`DISTRIBUTION`)** — donut chart with center label showing the
   selected source's short name + percentage + compact value
5. **Source cards** — interactive `PressableScale` rows, brand-soft tint when
   active, percentage badge on the right
6. **Surface (`ENERGY OVER TIME`)** — stacked bar chart with zoom controls
   (`PressableScale` brand-soft fill) + compact legend

**Chart styling note**: bar chart uses `chartAxisLabel` style (Poppins-Medium
10pt textSecondary) + dashed `scheme.border` gridlines.

### Inverter Table (Tables tab) — v3

**Layout flow:**
1. `DateFilterHeader` (`title="Inverter Fleet"`)
2. Filter pills (above the hero, matches Tables UX)
3. **HeroGradientCard** — `●LIVE · FLEET` + count + `FLEET AVERAGE PR` (with
   status pill `EXCELLENT`/`GOOD`/`FAIR`/`POOR`) + divider + best/worst/total rows
4. **Inverter cards** — each row has:
   - Color-coded inverter badge (cycles through `energyPalette` by inverter num)
   - `EXCELLENT/GOOD/FAIR/POOR` status pill (PR thresholds 90/80/70)
   - Production + Yield metric tiles
   - Two **animated horizontal progress bars** (Reanimated `withTiming`) for PR + Uptime
   - First `ANIM_LIMIT=10` get FadeInDown stagger entrance; rest plain View

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

- Auto-categorises parameters by name keyword: `power` / `voltage` / `current` /
  `energy` / `temperature` / `frequency` / `other`.
- **Filter pills** with per-category counts, hide categories with 0 items.
- **2-col bento grid** of tiles, each with category-tinted gradient sweep + pill
  badge + name + big value + relative time.
- **Pulsing LIVE indicator** in the header (shared `PulseDot`).
- **Skeleton** placeholders on initial load.
- **Deferred render** via `InteractionManager.runAfterInteractions` — the tile
  grid only mounts after the tab transition finishes (the legacy "all params
  mount on tab tap" pattern caused noticeable jank with 100+ entries).
- **Animation cap**: only the first `ANIM_LIMIT=12` tiles get `FadeInDown`;
  the rest render as plain Views.

---

## 12. Site list (Dashboard)

- Paginated: `?page=N&pageSize=50` (default page size). Response envelope is
  `{ metadata: { total, page, pageSize, ... }, data: ISite[] }`. Legacy
  bare-array also supported via `normalizeSiteListResponse`.
- Server-side search: `?q=<string>` (case-insensitive substring match against name).
  Length 1–128 enforced client-side.
- Search input has a **350 ms debounce** AND a **4-character minimum** before
  triggering. Below 4 chars, hook reverts to unfiltered list.
- Pagination active during search too.
- Dashboard FlatList virtualised (`initialNumToRender=6`, `windowSize=7`).
- **Search bar is pinned outside the FlatList** (between the top bar and the
  FlatList), not inside `ListHeaderComponent`. This sidesteps an iOS keyboard
  auto-scroll → blur cascade that was dropping focus after the second tap.
- Search uses the redesigned `SearchBar` component which owns its own
  `value`/`focused` state internally + debounces internally, only emitting the
  **debounced** value upward via `onDebouncedChange`. This prevents Dashboard
  re-renders during typing.
- **SiteCard** has: avatar with brand-emerald ring + `PRO` badge for controllers
  + status row (live `state` + `formatRelativeTime(dataLastUpdate)`) + a
  **`PowerMixBar`** with total + 3 `MetricChip`s with mini % bars. Expand toggle
  for >3 sources.

The mock `86.56%` efficiency row was dropped — real data drives the status row.

---

## 13. Theme

`useThemeStore` (Zustand, persisted) toggles `isDark`. **New code reads from
`useScheme()`** (see §4.2). Legacy screens still use `useThemeStore().colors`
which is auto-derived from the scheme tokens — they pick up the v2 palette
automatically.

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

Some mock data still in `src/data/mock/`:

| Mock | Used by | Status |
|---|---|---|
| `mockTrendsData` | TrendView's GradientRangeBar (Chart Analysis card) | Not yet API-wired |
| `mockAlarmsData` | AlarmsView | Not yet wired |
| `trendAnalysisSeries` | TrendAnalysisCard (line + bar charts) | Not yet wired |
| `inverterFilters`, `InverterFilterOption` | Filter pills on Reports / Tables — pure constant, fine to keep |

`mockSitesData`, `mockYieldMetrics`, `mockEnvironmentalMetrics`, `mockCardsData`
were all removed — Dashboard and Summary now drive off real backend data.

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
- **ImagePickerBottomSheet legacy cleanup** — has hardcoded greys (`#999`, `#666`, etc.). Not used by redesigned UI but still in the bundle.

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
