# Claude Context - Pragmatics Engineering Solutions App

Use this file to continue the conversation context on a different machine.

**Last Updated:** January 2026

---

## Current Status: UI Complete, Backend Integration Pending

### What's Been Done:
- ✅ React Native CLI 0.76.9 project initialized
- ✅ NativeWind 4.x (Tailwind CSS) configured
- ✅ Folder structure created
- ✅ Theme configured (colors, typography, spacing)
- ✅ Base UI components created (Button, Input, Card, Badge, ProgressBar, Checkbox, SearchBar)
- ✅ React Navigation 7.x set up (RootNavigator, AuthNavigator, MainNavigator, SiteNavigator, ProfileNavigator)
- ✅ ESLint & Prettier configured
- ✅ TypeScript compiles without errors
- ✅ App.tsx wired up with providers (GestureHandler, SafeArea, QueryClient)
- ✅ **SplashLoadingScreen** - Animated 3-dot loading animation
- ✅ **SplashBrandScreen** - PES logo with fade-in animation
- ✅ **LoginScreen** - Form with validation (React Hook Form + Zod) - Email only
- ✅ **Auth Store** - Zustand store with persistence (100% test coverage)
- ✅ **DashboardScreen** - Site list with SiteCard components
- ✅ **SiteDetailScreen** - 4-tab view (Summary, Cards, Alarms, Trends)
- ✅ **LiveParametersScreen** - Real-time metrics display
- ✅ **DevicesScreen** - Device list with filtering
- ✅ **AlarmManagementScreen** - Alarm list with acknowledgment
- ✅ **ProfileScreen** - User profile with settings menu
- ✅ **EditProfileScreen** - Edit user information form
- ✅ **ChangePasswordScreen** - Password change with strength indicator
- ✅ **DeactivateAccountScreen** - Account deactivation flow
- ✅ **TermsScreen** - Terms & Conditions
- ✅ **AboutScreen** - Company info, features, contact
- ✅ **Jest Testing** - 134 tests passing with coverage
- ✅ **ECharts Integration** - Chart components (LineChart, BarChart, AreaChart, PieChart, GaugeChart, MixedChart)
- ✅ **SLD (Single Line Diagram)** - Native SVG implementation with animated power flow

### What's Next:
- Set up AWS Amplify with Cognito authentication
- Connect to real API endpoints
- Real-time PubSub (AWS IoT Core)
- E2E tests (Detox/Maestro)

---

## Project Summary

Building a **React Native CLI** mobile app for **Pragmatics Engineering Solutions (PES)** - an energy/power management platform that monitors solar panels, wind turbines, and grid power across multiple industrial sites.

---

## Quick Reference

### Tech Stack
- **React Native CLI 0.76.9** (NOT Expo)
- **TypeScript 5.x**
- **NativeWind 4.x** (Tailwind CSS)
- **React Navigation 7.x** (Drawer + Stack)
- **React Flow 11.x** (Single Line Diagram)
- **ECharts** (react-native-echarts-pro)
- **AWS Amplify 6.x** (Cognito, PubSub, API)
- **Zustand 5.x** (State management)
- **TanStack Query 5.x** (Server state)

### Key Design Decisions
1. **No Bottom Tabs** - Using Drawer navigation instead
2. **Dark Theme Only** - No light mode
3. **SLD with Native SVG** - Power flow diagram using react-native-svg (not WebView)
4. **Real-time with AWS IoT PubSub**

---

## Files Created in Phase 1

### Configuration Files
| File | Purpose |
|------|---------|
| `tailwind.config.js` | NativeWind/Tailwind theme with custom colors |
| `metro.config.js` | Metro bundler with NativeWind |
| `babel.config.js` | Babel with NativeWind + Reanimated |
| `global.css` | Tailwind base styles |
| `nativewind-env.d.ts` | NativeWind TypeScript types |
| `.eslintrc.js` | ESLint configuration |
| `.prettierrc.js` | Prettier configuration |

### Theme Files (`src/theme/`)
| File | Purpose |
|------|---------|
| `colors.ts` | Color constants matching Figma |
| `typography.ts` | Font sizes and families |
| `spacing.ts` | Spacing scale |
| `index.ts` | Theme exports |

### UI Components (`src/components/ui/`)
| Component | Purpose |
|-----------|---------|
| `Button.tsx` | Primary/secondary/outline/ghost variants |
| `Input.tsx` | Text input with label, error, icons |
| `Card.tsx` | Container with variants |
| `Badge.tsx` | Status badges (success/warning/error/info) |
| `ProgressBar.tsx` | Power efficiency display |
| `Checkbox.tsx` | Checkbox with label |
| `SearchBar.tsx` | Search input with filter button |
| `index.ts` | Component exports |

### Chart Components (`src/components/charts/`)
| Component | Purpose |
|-----------|---------|
| `chartConfig.ts` | ECharts theme configuration, colors, helpers |
| `types.ts` | TypeScript types for chart props |
| `LineChart.tsx` | Time series data, efficiency trends |
| `BarChart.tsx` | Categorical data, alarm counts |
| `AreaChart.tsx` | Stacked power generation (solar/wind/grid) |
| `PieChart.tsx` | Power distribution donut chart |
| `GaugeChart.tsx` | Single value metrics (efficiency %) |
| `MixedChart.tsx` | Combined bar + line charts |
| `index.ts` | Component exports |

### SLD Components (`src/components/sld/`)
| Component | Purpose |
|-----------|---------|
| `types.ts` | SLD types, colors, icons, and labels |
| `SLDCanvas.tsx` | Main canvas with layout, background, legend |
| `nodes/SiteNode.tsx` | Central factory/site node |
| `nodes/SourceNode.tsx` | Power source nodes (Solar, Wind, Grid, PCS, Battery) |
| `edges/PowerFlowEdge.tsx` | Animated bezier curve edges (SVG) |
| `index.ts` | Component exports |

### Navigation (`src/navigation/`)
| File | Purpose |
|------|---------|
| `types.ts` | Navigation TypeScript types |
| `AuthNavigator.tsx` | Auth stack (Splash, Login) |
| `MainNavigator.tsx` | Drawer with Dashboard, Profile, etc. |
| `SiteNavigator.tsx` | Site detail stack |
| `RootNavigator.tsx` | Root navigator with auth check |
| `index.ts` | Navigation exports |

### Screens (`src/screens/`)
- `auth/` - SplashLoadingScreen, SplashBrandScreen, LoginScreen ✅
- `main/` - DashboardScreen ✅
- `site/` - SiteDetailScreen, LiveParametersScreen, DevicesScreen, AlarmManagementScreen ✅
- `profile/` - ProfileScreen, EditProfileScreen, ChangePasswordScreen, DeactivateAccountScreen ✅
- `TermsScreen.tsx`, `AboutScreen.tsx` ✅

### Tests (`__tests__/` and `src/**/__tests__/`)
- UI component tests (Button, Input, Card, Checkbox)
- Screen tests (LoginScreen, DashboardScreen, ProfileScreen)
- Store tests (authStore)
- Navigation tests (RootNavigator)
- App integration tests

---

## Screen Count: 14 Screens

| Category | Screens |
|----------|---------|
| Auth Flow | Splash 0 (Loading), Splash 1 (Brand), Login |
| Main | Dashboard (with Drawer) |
| Site Detail | Main View (4 tabs), Live Parameters, Devices, Alarm Management |
| Drawer | Profile, Edit, Password, Deactivate, Terms, About |

---

## Navigation Structure

```
Auth Stack (unauthenticated)
├── SplashLoadingScreen
├── SplashBrandScreen
└── LoginScreen

Main Drawer (authenticated)
├── DashboardScreen
├── ProfileScreen
│   ├── EditProfileScreen
│   ├── ChangePasswordScreen
│   └── DeactivateScreen
├── TermsScreen
└── AboutScreen

Site Stack (from Dashboard)
├── SiteDetailScreen (4 tabs: Summary, Cards, Alarms, Trends)
├── LiveParametersScreen
├── DevicesScreen
└── AlarmManagementScreen
```

---

## Folder Structure

```
pragmatic-app/
├── src/
│   ├── navigation/          # React Navigation ✅
│   ├── screens/             # Screen components (placeholders)
│   │   ├── auth/
│   │   ├── main/
│   │   ├── site/
│   │   └── profile/
│   ├── components/
│   │   ├── ui/              # Base components ✅
│   │   ├── charts/          # ECharts ✅
│   │   ├── sld/             # Native SVG SLD ✅
│   │   ├── site/            # Site components (pending)
│   │   └── layout/          # Header, Drawer (pending)
│   ├── hooks/               # Custom hooks (pending)
│   ├── services/            # API, Auth, PubSub (pending)
│   ├── store/               # Zustand stores (pending)
│   ├── types/               # TypeScript types (pending)
│   ├── utils/               # Utilities (pending)
│   └── theme/               # Theme config ✅
├── docs/
│   ├── CLAUDE_CONTEXT.md    # This file
│   └── figma/
│       ├── FIGMA_CONTEXT.md
│       └── SCREENS.md
├── android/
├── ios/
├── App.tsx                  # Root component ✅
├── index.js
├── package.json
├── PROJECT_PLAN.md
└── tailwind.config.js       # ✅
```

---

## Figma Reference

- **File URL:** https://www.figma.com/design/60AYkSkEGPv2uYjg0UpRPx/Pragmatics-Engineering-Solutions
- **File Key:** `60AYkSkEGPv2uYjg0UpRPx`

### Key Node IDs
| Screen | Node ID |
|--------|---------|
| Splash 0 (Loading) | `2:164` |
| Splash 1 (Brand) | `1:109` |
| Splash 2 (Login) | `14:2417` |
| Dashboard 2.0 | `146:182` |
| Site Summary | `8:1372` |
| Site Cards | `250:422` |
| Site Alarms | `250:1700` |
| Site Trends | `250:1913` |
| Live Parameters | `14:354` |
| Devices | `14:1177` |
| Alarm Management | `14:1748` |

---

## Color Palette

```typescript
const colors = {
  background: {
    primary: '#0D0D0D',
    secondary: '#1A1A1A',
    tertiary: '#262626',
  },
  brand: {
    primary: '#00D26A',    // Green
    secondary: '#00FF7F',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#666666',
  },
  status: {
    success: '#00D26A',
    warning: '#FFB800',
    error: '#FF4757',
    info: '#3498DB',
  },
  border: {
    default: '#333333',
    focus: '#00D26A',
  },
};
```

---

## Commands to Run

```bash
# Navigate to project
cd /Users/muhammad.wahab/Documents/projects/pragmatic-app

# Install dependencies
npm install

# Run on Android
npm run android

# Run on iOS (after configuring Xcode SDK)
cd ios && pod install && cd ..
npm run ios

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Known Issues

1. **iOS CocoaPods:** Xcode SDK not properly configured (`xcrun: error: SDK "iphoneos" cannot be located`). Need to configure Xcode command line tools.

---

## Prompt to Resume

Copy this to Claude to continue:

```
I'm continuing work on the Pragmatics Engineering Solutions React Native app.

Please read these files for context:
- PROJECT_PLAN.md
- docs/CLAUDE_CONTEXT.md
- docs/figma/FIGMA_CONTEXT.md

Current status: All UI phases complete (Charts + SLD). All screens built with mock data. 134 unit tests passing.

Next task: [WHAT YOU WANT TO DO NEXT]

Options:
- Set up AWS Amplify with Cognito authentication
- Connect to real API endpoints
- Add real-time PubSub (AWS IoT Core)
- Add E2E tests (Detox/Maestro)
- Add animations and polish
```

---

## Implementation Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project Setup (RN CLI, NativeWind, Navigation) | ✅ Complete |
| 2 | Authentication (Cognito, Splash, Login) | ✅ UI Complete (Cognito pending) |
| 3 | Dashboard & Drawer | ✅ Complete |
| 4 | Site Detail - Main View (4 tabs) | ✅ Complete |
| 5 | Charts (ECharts) | ✅ Complete |
| 5.1 | Single Line Diagram (Native SVG) | ✅ Complete |
| 6 | Site Detail - Other Views | ✅ Complete |
| 7 | Real-time (PubSub) | Pending |
| 8 | Profile & Drawer Screens | ✅ UI Complete |
| 9 | API Integration | Pending |
| 10 | Polish & Testing | ✅ Unit Tests Complete (134 tests)

---

## Testing Summary

### Test Configuration Files
| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration with RN transforms |
| `jest.setup.js` | Mocks for RN modules, navigation, etc. |
| `babel.config.js` | Excludes NativeWind preset in test env |
| `__mocks__/styleMock.js` | CSS file mock |
| `src/test-utils.tsx` | Custom render with providers |

### Test Files (134 tests total)
| Category | File | Tests |
|----------|------|-------|
| UI Components | `Button.test.tsx` | 15 |
| UI Components | `Input.test.tsx` | 12 |
| UI Components | `Card.test.tsx` | 12 |
| UI Components | `Checkbox.test.tsx` | 13 |
| Screens | `LoginScreen.test.tsx` | 11 |
| Screens | `DashboardScreen.test.tsx` | 14 |
| Screens | `ProfileScreen.test.tsx` | 16 |
| Store | `authStore.test.ts` | 18 |
| Navigation | `RootNavigator.test.tsx` | 5 |
| App | `App.test.tsx` | 3 |

### Test Scripts
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run test:ci       # CI mode
```
