# Pragmatics Engineering Solutions - React Native App Project Plan

## Project Overview

A React Native mobile application for **Pragmatics Engineering Solutions (PES)** - an energy/power management platform that monitors solar panels, wind turbines, and grid power across multiple sites.

---

## Screens Identified from Figma Design

### Authentication Flow
1. **Splash 0** - Loading animation (3 green dots)
2. **Splash 1** - Brand splash screen (PES logo + company name)
3. **Splash 2** - Login screen (email/password, remember me, login button)

### Main Dashboard
4. **Dashboard 2.0** - Main site summary list with power metrics, search, filters, export

### Site Detailed View (from Dashboard card tap)
Site Detail has **4 separate views**, navigable from a menu or action buttons:

#### View 1: Main View (with 4 tabs)
5. **Main View** - Contains tabbed navigation:
   - **Summary Tab** - Detailed site overview with charts
   - **Cards Tab** - Card-based metrics view
   - **Alarms Tab** - Alarm notifications list
   - **Trends Tab** - Trend charts and analytics

#### View 2: Live Parameters View
6. **Live Parameters View** - Real-time power data

#### View 3: Devices View
7. **Devices View** - Device listing

#### View 4: Alarm Management View
8. **Alarm Management View** - Full alarm view

### Drawer Menu Screens
9. **Profile Edit** - User profile editing
10. **Password Change** - Security settings
11. **Account Deactivation** - Deactivate account
12. **Terms & Conditions** - Legal terms page
13. **About Us** - Company information page

---

## Navigation Flow Diagram

```
App Launch
    │
    ├── Splash 0 (Loading)
    │       │
    │       ▼
    ├── Splash 1 (Brand)
    │       │
    │       ▼
    └── Splash 2 (Login)
            │
            ▼ (Authenticated)

    ┌──────────────────────────────────────────────────────────┐
    │                      DASHBOARD                            │
    ├──────────────────────────────────────────────────────────┤
    │  ┌─ Header ────────────────────────────────────────────┐ │
    │  │  [☰ Drawer]     PES Logo     [🔔 Notifications]     │ │
    │  │                              [👤 Profile Icon]      │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    │  ┌─ Search & Filters ──────────────────────────────────┐ │
    │  │  [🔍 Search]                    [⚙ Filters] [Export]│ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    │  ┌─ Site Card List ────────────────────────────────────┐ │
    │  │  Site 1 Card (tap to expand/view details)           │ │
    │  │  Site 2 Card                                        │ │
    │  │  Site 3 Card                                        │ │
    │  │  ...                                                │ │
    │  └─────────────────────────────────────────────────────┘ │
    └──────────────────────────────────────────────────────────┘
           │                           │
           │ (Tap Card)                │ (Tap ☰ Drawer)
           ▼                           ▼

    ┌─────────────────────┐     ┌─────────────────────────────┐
    │   SITE DETAIL       │     │        DRAWER MENU          │
    │   (4 Views)         │     ├─────────────────────────────┤
    │                     │     │  👤 Profile                 │
    │  • Main View        │     │     ├── Edit Profile        │
    │    (4 tabs)         │     │     ├── Change Password     │
    │  • Live Parameters  │     │     └── Deactivate Account  │
    │  • Devices          │     │                             │
    │  • Alarm Management │     │  📄 Terms & Conditions      │
    └─────────────────────┘     │  ℹ️  About Us               │
                                │                             │
                                │  🚪 Logout                  │
                                └─────────────────────────────┘

    ┌──────────────────────────────────────────────────────────┐
    │              SITE DETAIL (4 Views)                       │
    ├──────────────────────────────────────────────────────────┤
    │                                                          │
    │  ┌─ View 1: MAIN VIEW ─────────────────────────────────┐ │
    │  │  ┌─────────┬─────────┬─────────┬─────────┐          │ │
    │  │  │ Summary │  Cards  │ Alarms  │ Trends  │ ← 4 Tabs │ │
    │  │  └─────────┴─────────┴─────────┴─────────┘          │ │
    │  │  ┌─────────────────────────────────────────┐        │ │
    │  │  │          Tab Content Area               │        │ │
    │  │  │      (Charts, Metrics, Lists, etc.)     │        │ │
    │  │  └─────────────────────────────────────────┘        │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    │  ┌─ View 2: LIVE PARAMETERS VIEW ──────────────────────┐ │
    │  │  Real-time power data display                       │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    │  ┌─ View 3: DEVICES VIEW ──────────────────────────────┐ │
    │  │  Device listing and status                          │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    │  ┌─ View 4: ALARM MANAGEMENT VIEW ─────────────────────┐ │
    │  │  Full alarm list, details, and actions              │ │
    │  └─────────────────────────────────────────────────────┘ │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native CLI | 0.76.9 | Mobile framework (New Architecture) |
| TypeScript | 5.x | Type safety |
| React Navigation | 7.x | Navigation (Drawer + Stack) |
| NativeWind | 4.x | Tailwind CSS styling |
| React Native Reanimated | 3.x | Animations |
| React Flow | 11.x | Single Line Diagram (SLD) visualization |
| ECharts (react-native-echarts-pro) | 1.x | Charts and graphs |
| Zustand | 5.x | State management |
| React Query (TanStack) | 5.x | Server state & caching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |

### Backend Integration (AWS)
| Service | Purpose |
|---------|---------|
| Amazon Cognito | Authentication (login, signup, password reset) |
| AWS Amplify | SDK for Cognito integration |
| AWS IoT Core / PubSub | Real-time data streaming |
| AWS API Gateway + Lambda | REST API backend |
| AWS AppSync (optional) | GraphQL API (if needed) |

---

## Project Structure

```
pragmatic-app/
├── src/
│   ├── navigation/               # React Navigation setup
│   │   ├── RootNavigator.tsx     # Root navigator (Auth check)
│   │   ├── AuthNavigator.tsx     # Auth stack (Splash, Login)
│   │   ├── MainNavigator.tsx     # Main drawer navigator
│   │   ├── SiteNavigator.tsx     # Site detail stack
│   │   └── types.ts              # Navigation types
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SplashLoadingScreen.tsx   # Splash 0 (Loading animation)
│   │   │   ├── SplashBrandScreen.tsx     # Splash 1 (Brand)
│   │   │   └── LoginScreen.tsx           # Splash 2 (Login)
│   │   ├── main/
│   │   │   └── DashboardScreen.tsx       # Dashboard - Site list
│   │   ├── site/
│   │   │   ├── SiteDetailScreen.tsx      # View 1: Main View (4 tabs)
│   │   │   ├── LiveParametersScreen.tsx  # View 2: Live Parameters
│   │   │   ├── DevicesScreen.tsx         # View 3: Devices
│   │   │   └── AlarmManagementScreen.tsx # View 4: Alarm Management
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx         # Profile main
│   │   │   ├── EditProfileScreen.tsx     # Edit profile
│   │   │   ├── ChangePasswordScreen.tsx  # Change password
│   │   │   └── DeactivateScreen.tsx      # Deactivate account
│   │   ├── TermsScreen.tsx               # Terms & Conditions
│   │   └── AboutScreen.tsx               # About Us
│   │
│   ├── components/
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── charts/               # Chart components (ECharts) ✅
│   │   │   ├── chartConfig.ts        # Theme, colors, axis configs
│   │   │   ├── types.ts              # TypeScript interfaces
│   │   │   ├── LineChart.tsx         # Time series trends
│   │   │   ├── BarChart.tsx          # Categorical data
│   │   │   ├── AreaChart.tsx         # Stacked power generation
│   │   │   ├── PieChart.tsx          # Power distribution donut
│   │   │   ├── GaugeChart.tsx        # Efficiency percentage
│   │   │   ├── MixedChart.tsx        # Combined bar + line
│   │   │   └── index.ts              # Exports
│   │   ├── sld/                  # Single Line Diagram (Native SVG) ✅
│   │   │   ├── types.ts              # SLD type definitions & colors
│   │   │   ├── SLDCanvas.tsx         # Main SLD canvas with layout
│   │   │   ├── nodes/
│   │   │   │   ├── index.ts          # Node exports
│   │   │   │   ├── SiteNode.tsx      # Central site node (factory icon, load)
│   │   │   │   └── SourceNode.tsx    # Power source nodes (Solar, Wind, Grid, PCS, Battery)
│   │   │   ├── edges/
│   │   │   │   ├── index.ts          # Edge exports
│   │   │   │   └── PowerFlowEdge.tsx # Animated bezier edge (SVG)
│   │   │   ├── controls/             # Future: zoom, fullscreen controls
│   │   │   └── index.ts              # All SLD exports
│   │   ├── site/                 # Site-specific components
│   │   │   ├── SiteCard.tsx          # Dashboard site card (expandable)
│   │   │   ├── MetricCard.tsx        # Power metric display card
│   │   │   ├── PowerEfficiencyBar.tsx
│   │   │   ├── DropdownTabs.tsx      # Summary/Cards/Alarms/Trends switcher
│   │   │   ├── SummaryView.tsx       # Summary tab content
│   │   │   ├── CardsView.tsx         # Cards tab content
│   │   │   ├── AlarmsView.tsx        # Alarms tab content
│   │   │   ├── TrendsView.tsx        # Trends tab content
│   │   │   ├── AlarmItem.tsx
│   │   │   └── DeviceItem.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── DrawerContent.tsx     # Custom drawer menu content
│   │   │   └── StatusBar.tsx
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── RememberMe.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSites.ts
│   │   ├── useDevices.ts
│   │   ├── useAlarms.ts
│   │   ├── usePubSub.ts          # Real-time subscriptions
│   │   └── useChartData.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── client.ts         # API client setup
│   │   │   ├── sites.ts
│   │   │   ├── devices.ts
│   │   │   └── alarms.ts
│   │   ├── auth/
│   │   │   ├── cognito.ts        # Cognito configuration
│   │   │   └── authService.ts
│   │   └── pubsub/
│   │       ├── client.ts         # PubSub client
│   │       └── topics.ts         # Topic definitions
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── siteStore.ts
│   │   └── settingsStore.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── site.ts
│   │   ├── device.ts
│   │   ├── alarm.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── theme/
│       ├── colors.ts
│       ├── typography.ts
│       └── spacing.ts
├── android/                      # Android native code
├── ios/                          # iOS native code
├── assets/
│   ├── images/
│   │   └── logo.png
│   ├── icons/
│   └── fonts/
├── index.js                      # App entry point
├── App.tsx                       # Root App component
├── babel.config.js
├── metro.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── Gemfile                       # iOS CocoaPods
└── .env                          # Environment variables
```

---

## Implementation Phases

### Phase 1: Project Setup & Foundation ✅ COMPLETED
- [x] Initialize React Native CLI project (0.76.9) with TypeScript
  ```bash
  npx @react-native-community/cli init PragmaticApp --version 0.76.9
  ```
- [x] Configure NativeWind (Tailwind CSS)
- [x] Set up folder structure (src/screens, src/components, src/navigation, etc.)
- [x] Configure theme (dark mode colors, typography)
- [x] Create base UI components (Button, Input, Card, Badge, ProgressBar, Checkbox, SearchBar)
- [x] Set up React Navigation (Drawer + Stack navigators)
- [x] Configure ESLint, Prettier
- [ ] Set up iOS CocoaPods (requires Xcode SDK configuration)
- [x] Android Gradle configured

### Phase 2: Authentication (AWS Cognito) - UI COMPLETE ✅
- [ ] Install and configure AWS Amplify
- [ ] Set up Cognito User Pool integration
- [x] Implement splash screens (loading animation, branding)
- [x] Build login screen with form validation
- [ ] Implement "Remember Me" functionality (react-native-keychain)
- [x] Add authentication state management (Zustand)
- [x] Protected route handling
- [ ] Error handling for auth flows

### Phase 3: Dashboard & Drawer Navigation ✅ COMPLETE
- [x] Implement Drawer navigation
- [x] Build header component with:
  - Drawer toggle (hamburger menu)
  - PES Logo
  - Notifications icon
  - Profile icon (quick access)
- [x] **Drawer Menu Items:**
  - Profile section
  - Terms & Conditions
  - About Us
  - Logout
- [x] Create search bar with filter functionality
- [x] Build SiteCard component with expandable view
- [x] Implement site list with FlatList/FlashList
- [x] Add pull-to-refresh functionality
- [ ] Create MetricCard components (Solar, Wind, Grid, PV Size)
- [ ] Build PowerEfficiencyBar progress component
- [ ] Implement Export functionality

### Phase 4: Site Detail - Main View (4 Tabs) ✅ UI COMPLETE
- [x] Create site detail layout with view navigation
- [x] **Main View with Tab Navigation:**
  - [x] Implement tab bar (Summary | Cards | Alarms | Trends)
  - [x] **Summary Tab:**
    - Site overview header
    - Power metrics grid
    - SLD placeholder (React Flow pending)
  - [x] **Cards Tab:**
    - Device cards layout placeholder
  - [x] **Alarms Tab:**
    - Alarm list with severity indicators
  - [x] **Trends Tab (ECharts integrated):**
    - Power Generation stacked area chart
    - Efficiency trend line chart
    - Power distribution donut chart
    - Weekly alarm bar chart
    - Efficiency gauge chart

### Phase 5: Charts & Data Visualization (ECharts) ✅ COMPLETE
- [x] Configure react-native-echarts-pro
- [x] Chart configuration system (chartConfig.ts)
- [x] TypeScript types for chart props (types.ts)
- [x] Implement LineChart for trends
- [x] Implement BarChart for comparisons
- [x] Implement AreaChart for power output (stacked)
- [x] Implement PieChart/DonutChart for power distribution
- [x] Implement GaugeChart for efficiency display
- [x] Implement MixedChart (combined bar + line)
- [x] Integrate charts into SiteDetailScreen Trends tab
- [x] Add chart interactions (tooltips)
- [x] Create chart legend components
- [x] Implement time axis formatting

### Phase 5.1: Single Line Diagram (Native SVG) ✅ COMPLETE
- [x] Native React Native SLD implementation (react-native-svg)
- [x] **Custom Nodes:**
  - [x] SiteNode - Central node showing site name + load (e.g., Lucky Cement, Load: 315.44)
  - [x] SourceNode - Power source nodes (Solar, Wind, Grid, PCS, Battery) with metrics (Q, PF)
  - [x] Status indicators (active/inactive/warning/error)
- [x] **Custom Edges:**
  - [x] PowerFlowEdge - Animated dashed lines (green for renewable, blue for grid, purple for storage)
  - [x] Curved bezier connections with SVG Path
  - [x] Animated flow indicators
- [x] **Layout:**
  - [x] Semi-circle layout for source nodes
  - [x] Dot grid background
  - [x] Color-coded edge legend
- [x] **Integration:**
  - [x] Integrated into SiteDetailScreen Summary tab
  - [x] Mock data generation from site metrics
  - [x] Touch interactions (onNodePress callbacks)
- [ ] **Future Enhancements (Phase 9+):**
  - [ ] Real-time data updates via PubSub
  - [ ] Zoom controls (+/-)
  - [ ] Fullscreen toggle
  - [ ] Touch gestures (pinch zoom, pan)

### Phase 6: Site Detail - Other Views (Live Parameters, Devices, Alarm Management) ✅ UI COMPLETE
- [x] **View 2: Live Parameters View:**
  - [x] Real-time power data display (mock data)
  - [ ] Configure AWS IoT Core client
  - [ ] Set up PubSub topic subscriptions
  - [x] Add connection status indicators
  - [ ] Handle reconnection logic
- [x] **View 3: Devices View:**
  - [x] Device listing screen
  - [x] Device status indicators (online/offline)
  - [x] Device filtering and search
- [x] **View 4: Alarm Management View:**
  - [x] Full alarm list
  - [x] Alarm details and history
  - [x] Alarm actions (acknowledge, resolve)

### Phase 7: Real-time Data Integration (AWS IoT PubSub)
- [ ] Configure AWS IoT Core client globally
- [ ] Implement real-time metric updates across views
- [ ] Implement data buffering for offline

### Phase 8: Profile & Drawer Screens ✅ UI COMPLETE
- [x] Profile main screen
- [x] Profile information display/edit
- [x] Password change screen (Cognito pending)
- [x] Account deactivation flow
- [x] Terms & Conditions page
- [x] About Us page
- [x] Logout functionality

### Phase 9: API Integration
- [ ] Set up React Query for data fetching
- [ ] Implement API client with interceptors
- [ ] Create API hooks for all endpoints
- [ ] Add error handling and retry logic
- [ ] Implement offline data caching
- [ ] Add loading states and skeletons

### Phase 10: Polish & Testing ✅ TESTING COMPLETE
- [ ] Add animations (Reanimated)
- [ ] Implement skeleton loaders
- [ ] Error boundaries and fallback UI
- [x] **Unit tests (Jest) - 134 tests passing**
  - [x] Jest configuration with React Native mocks
  - [x] Test utilities and providers
  - [x] UI component tests (Button, Input, Card, Checkbox)
  - [x] Screen tests (LoginScreen, DashboardScreen, ProfileScreen)
  - [x] Store tests (authStore - 100% coverage)
  - [x] Navigation tests (RootNavigator)
- [ ] Integration tests
- [ ] E2E tests (Detox/Maestro)
- [ ] Performance optimization
- [ ] Accessibility improvements

---

## Design Specifications

### Color Palette (Dark Theme)
```typescript
const colors = {
  // Background
  background: {
    primary: '#0D0D0D',      // Main background
    secondary: '#1A1A1A',    // Card background
    tertiary: '#262626',     // Input background
  },
  // Brand
  brand: {
    primary: '#00D26A',      // Green accent
    secondary: '#00FF7F',    // Lighter green
  },
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#666666',
  },
  // Status
  status: {
    success: '#00D26A',
    warning: '#FFB800',
    error: '#FF4757',
    info: '#3498DB',
  },
  // Border
  border: {
    default: '#333333',
    focus: '#00D26A',
  },
};
```

### Typography
```typescript
const typography = {
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semiBold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 24,
    '3xl': 30,
  },
};
```

### Spacing
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
};
```

### Single Line Diagram (SLD) Specifications
```typescript
// SLD Color Scheme
const sldColors = {
  background: '#0D0D0D',           // Dark background
  dotGrid: '#2A2A2A',              // Subtle dot grid

  // Edge Colors (Power Flow Lines)
  edges: {
    renewable: '#00D26A',          // Green dashed - Solar/Wind power flow
    grid: '#3B82F6',               // Blue solid - Grid power flow
    pcs: '#3B82F6',                // Blue - PCS connection
  },

  // Node Colors
  nodes: {
    site: {
      background: '#1A1A1A',
      border: '#EF4444',           // Red border for main site
      icon: '#EF4444',             // Red icon (volcano/factory)
    },
    source: {
      background: '#1A1A1A',
      border: '#333333',
    },
    metric: {
      background: 'transparent',
      text: '#A0A0A0',
    },
  },
};

// SLD Node Types
interface SLDNodes {
  siteNode: {
    icon: 'volcano' | 'factory';   // Site type icon
    name: string;                   // "Lucky Cement"
    load: number;                   // Load: 315.44
  };
  sourceNode: {
    type: 'solar' | 'wind' | 'grid' | 'pcs';
    icon: string;                   // Solar panel, wind turbine, grid, PCS icons
    metrics: {
      q: number;                    // Q: 58.95
      pf: number;                   // PF: 58.95
    };
  };
}

// SLD Edge Types
interface SLDEdges {
  powerFlow: {
    type: 'renewable' | 'grid';
    animated: boolean;              // Dashed animation
    style: 'dashed' | 'solid';
    curvature: 'bezier' | 'straight';
  };
}

// SLD Controls
interface SLDControls {
  zoomIn: () => void;
  zoomOut: () => void;
  lock: boolean;                    // Lock pan/zoom
  fullscreen: () => void;
}
```

---

## AWS Configuration Requirements

### Cognito User Pool
- Email/phone sign-in
- Password requirements (min 8 chars, uppercase, lowercase, number)
- Remember device functionality
- Password reset via email

### API Gateway Endpoints (Expected)
```
GET    /sites                    - List all sites
GET    /sites/:id                - Get site details
GET    /sites/:id/metrics        - Get site metrics
GET    /sites/:id/devices        - List site devices
GET    /sites/:id/alarms         - List site alarms
PUT    /sites/:id/alarms/:aid    - Acknowledge alarm
GET    /sites/:id/trends         - Get trend data
GET    /devices/:id              - Get device details
GET    /devices/:id/health       - Get device health
GET    /user/profile             - Get user profile
PUT    /user/profile             - Update user profile
POST   /export                   - Export site data
```

### PubSub Topics
```
sites/{siteId}/metrics           - Real-time metrics
sites/{siteId}/alarms            - Alarm notifications
devices/{deviceId}/status        - Device status updates
devices/{deviceId}/health        - Device health updates
```

---

## Dependencies (package.json)

```json
{
  "name": "pragmatic-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "18.3.1",
    "react-native": "0.76.9",

    "nativewind": "^4.1.0",
    "tailwindcss": "^3.4.0",

    "@react-navigation/native": "^7.0.0",
    "@react-navigation/drawer": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",

    "aws-amplify": "^6.0.0",
    "@aws-amplify/react-native": "^1.0.0",
    "@aws-amplify/pubsub": "^6.0.0",

    "react-native-echarts-pro": "^1.9.0",
    "reactflow": "^11.11.0",
    "react-native-webview": "^13.8.0",
    "react-native-svg": "^15.0.0",

    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",

    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",

    "react-native-reanimated": "^3.16.0",
    "react-native-gesture-handler": "^2.20.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "^4.1.0",

    "react-native-keychain": "^8.2.0",
    "@react-native-async-storage/async-storage": "^2.0.0",

    "@shopify/flash-list": "^1.7.1",
    "date-fns": "^3.3.0",
    "react-native-vector-icons": "^10.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@babel/preset-env": "^7.24.0",
    "@babel/runtime": "^7.24.0",
    "@react-native/babel-preset": "0.76.9",
    "@react-native/eslint-config": "0.76.9",
    "@react-native/metro-config": "0.76.9",
    "@react-native/typescript-config": "0.76.9",
    "@types/react": "^18.3.0",
    "@types/react-native-vector-icons": "^6.4.0",
    "typescript": "~5.3.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "jest": "^29.7.0",
    "@testing-library/react-native": "^12.4.0"
  }
}
```

---

## Milestones & Deliverables

| Milestone | Deliverables | Status |
|-----------|--------------|--------|
| M1 | Project setup, theme, base components | ✅ Complete |
| M2 | Authentication flow complete | ✅ UI Complete (Cognito pending) |
| M3 | Dashboard with mock data | ✅ Complete |
| M4 | Site detail screens | ✅ Complete (with Charts) |
| M5 | Charts integration | ✅ Complete |
| M5.1 | Single Line Diagram (SLD) | ✅ Complete |
| M6 | Real-time PubSub integration | Pending |
| M7 | Device management | ✅ UI Complete |
| M8 | Profile & settings | ✅ UI Complete |
| M9 | Full API integration | Pending |
| M10 | Testing & polish | ✅ Unit Tests Complete (134 tests) |

---

## Questions/Clarifications Needed

1. **Authentication:** Do you need signup functionality or just login?
2. **API:** Do you have existing API documentation or should I design the endpoints?
3. **PubSub:** What is the expected data format for real-time updates?
4. **Export:** What formats are needed (PDF, CSV, Excel)?
5. **Notifications:** Do you need push notifications for alarms?
6. **Offline:** What level of offline support is required?
7. **Multi-language:** Is internationalization needed?
8. **Tablet support:** Should the app support tablet layouts?

---

## Screen Count Summary

| Category | Screens | Count |
|----------|---------|-------|
| Auth Flow | Splash 0, Splash 1, Login | 3 |
| Main | Dashboard (with Drawer) | 1 |
| Site Detail - View 1 | Main View (with 4 tabs: Summary, Cards, Alarms, Trends) | 1 |
| Site Detail - View 2 | Live Parameters View | 1 |
| Site Detail - View 3 | Devices View | 1 |
| Site Detail - View 4 | Alarm Management View | 1 |
| Drawer Screens | Profile, Edit, Password, Deactivate, Terms, About | 6 |
| **Total** | | **14 screens** |

---

## Next Steps

**Phase 5.1 (SLD) is COMPLETE.** All UI screens and visualizations are done with mock data.

```bash
# Navigate to project
cd pragmatic-app

# Install dependencies (if needed)
npm install

# Run on Android
npm run android

# Run on iOS (after fixing Xcode SDK config)
cd ios && pod install && cd ..
npm run ios

# Run tests
npm test
```

### Immediate Next Tasks (Backend Integration):
1. **Set up AWS Amplify** with Cognito authentication
2. **API Integration** - Connect to real backend endpoints
3. **Real-time PubSub** - AWS IoT Core integration for live metrics
4. **Polish** - Animations, loading states, error handling

---

## Documentation Files

- `PROJECT_PLAN.md` - This file (full project plan)
- `docs/CLAUDE_CONTEXT.md` - Quick context for continuing with Claude
- `docs/figma/FIGMA_CONTEXT.md` - Figma design details and tokens
- `docs/figma/SCREENS.md` - ASCII wireframes of all screens
