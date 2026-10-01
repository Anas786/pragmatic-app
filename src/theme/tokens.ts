/**
 * ─────────────────────────────────────────────────────────────────────
 *  Pragmatic Energy — Design Tokens (v2)
 * ─────────────────────────────────────────────────────────────────────
 *
 *  Single source of truth for the redesigned UI. Older screens still
 *  read from `src/utils/theme/colors.ts` (key-compatible shim that
 *  pulls from this file under the hood); new screens import directly
 *  from here.
 *
 *  Direction: "premium minimal" — soft elevation over hard borders,
 *  generous spacing, one bold brand accent, expressive motion.
 * ─────────────────────────────────────────────────────────────────────
 */

import { Platform, ViewStyle } from 'react-native';

/* ─────────── 1. Color primitives (palette) ─────────── */

/**
 * Brand primary — refined emerald. Evolves the legacy `#22c55e` toward
 * a deeper, more "premium SaaS" green while keeping clear lineage with
 * the PES logo.
 */
const emerald = {
  50: '#ECFDF5',
  100: '#D1FAE5',
  200: '#A7F3D0',
  300: '#6EE7B7',
  400: '#34D399',
  500: '#10B981', // primary
  600: '#059669',
  700: '#047857',
  800: '#065F46',
  900: '#064E3B',
};

/** Anchor neutrals — midnight scale, not pure black. */
const slate = {
  0: '#FFFFFF',
  50: '#FAFAFA', // light bg
  100: '#F4F5F7', // light surface alt
  200: '#E5E7EB', // hairline divider
  300: '#D1D5DB',
  400: '#9CA3AF', // light secondary text
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151', // dark divider
  800: '#1F2937', // dark surface raised
  850: '#171F2E',
  900: '#111827', // dark surface
  950: '#0A0E1A', // dark anchor bg
  1000: '#000000',
};

/** Premium accent — warm gold. Used sparingly for signature moments. */
const gold = {
  300: '#E8C887',
  400: '#DCB976',
  500: '#D4AF37',
  600: '#B8932B',
};

/** Energy-source palette — refreshed from the legacy `ENERGY_SOURCE_*`. */
export const energyPalette = {
  solar: '#84CC16', // lime — distinct from primary emerald, still in green family
  wind: '#06B6D4', // cyan
  grid: '#3B82F6', // blue
  genset: '#F97316', // orange
  battery: '#A855F7', // purple
};

/** Semantic states. */
export const semantic = {
  success: emerald[500],
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

/**
 * Inverter performance-ratio bands — the web portal's rule (Tables tab):
 * < 40 poor · 40–< 62 fair · 62–< 82 good · ≥ 82 excellent.
 */
export type PrBand = 'poor' | 'fair' | 'good' | 'excellent';

/**
 * The web portal's PR bar gradients, verbatim (`err` / `warn` / `lime` /
 * `ok`, `linear-gradient(90deg, from, to)`). Theme-agnostic — the web uses
 * the same colours in light and dark. FILLS ONLY (PR / uptime mini bars,
 * band dots): text beside them uses the scheme's `prBandInk`. The uptime
 * bar is always `excellent`, like the web.
 */
export const prBandPalette: Readonly<Record<PrBand, [string, string]>> = {
  poor: ['#E2685F', '#F2867D'],
  fair: ['#DE9B36', '#F2B64A'],
  good: ['#7FAE39', '#A6D45E'],
  excellent: ['#27A86A', '#46CF89'],
};

/* ─────────── 2. Mode-aware semantic tokens ─────────── */

/** Energy-source keys (same set as `energyPalette`). */
export type EnergySource = keyof typeof energyPalette;

/** One colour per semantic status role. */
export interface StatusRoles {
  success: string;
  warning: string;
  danger: string;
  info: string;
}

/** `rgba()` of a 6-digit hex at `alpha` — used to derive soft fills. */
const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const statusSoftAt = (alpha: number): StatusRoles => ({
  success: withAlpha(semantic.success, alpha),
  warning: withAlpha(semantic.warning, alpha),
  danger: withAlpha(semantic.danger, alpha),
  info: withAlpha(semantic.info, alpha),
});

export interface ColorScheme {
  /** Page background — the deepest surface. */
  bg: string;
  /** Card / panel surface — sits on bg. */
  surface: string;
  /** Raised surface — sits on top of `surface` (e.g. modal, sheet, chip). */
  surfaceRaised: string;
  /** Subtle muted fill (e.g. inactive pill background). */
  surfaceMuted: string;

  /** Primary text — highest contrast. */
  textPrimary: string;
  /** Secondary text — labels, captions. */
  textSecondary: string;
  /** Tertiary text — placeholders, low-emphasis. */
  textTertiary: string;
  /** Disabled-control text only (NOT AA — never for readable content). */
  textDisabled: string;
  /**
   * Ink for anything sitting on a SOLID brand or energy-source fill
   * (active pills/tabs, CTA buttons, source badges). Dark ink in BOTH
   * themes: ≥7.59:1 on the light brand, ≥4.87:1 on every energyPalette
   * fill (enforced by __tests__/tokenContrast.test.ts).
   */
  textOnBrand: string;

  /** Brand primary (emerald) — used for active states, CTAs, success. */
  brand: string;
  /** Brand subtle — 10% emerald fill for selected backgrounds. */
  brandSoft: string;
  /** Brand bold — deeper emerald for hover/pressed states. */
  brandBold: string;
  /** Brand-coloured TEXT/ICON ink on neutral surfaces (AA on bg + surface).
   *  `brand` itself is a fill — it fails AA as text on light surfaces. */
  brandText: string;

  /** Premium accent (gold) — used very sparingly. */
  accentGold: string;

  /** Hairline divider. Prefer shadows over borders; this is for unavoidable splits. */
  hairline: string;
  /** Soft border — when an outline is structurally required. */
  border: string;
  /** Strong border — form-field outlines and other UI boundaries that
   *  must meet the 3:1 non-text contrast minimum on `surface`. */
  borderStrong: string;
  /** Modal / sheet backdrop scrim. */
  scrim: string;
  /** Plate behind site logos (logos are light-background artwork). */
  logoPlate: string;

  /** Text/icon ink per energy source — for the RARE case where a source
   *  name is coloured. `energyPalette` stays fills-only. */
  energyInk: Record<EnergySource, string>;
  /** Text/icon ink for status (PR values, status pills, uptime, errors). */
  statusInk: StatusRoles;
  /** Soft status fills (semantic hue at 12% light / 16% dark) — pair with
   *  `statusInk` for status pills. */
  statusSoft: StatusRoles;
  /** Text ink for a PR value in its band (Tables tab) — the hue of that
   *  band's `prBandPalette` gradient, AA on bg / surface / surfaceMuted /
   *  surfaceRaised (enforced by __tests__/tokenContrast.test.ts). */
  prBandInk: Record<PrBand, string>;

  /** Skeleton base + shimmer highlight. */
  skeletonBase: string;
  skeletonHighlight: string;

  /* ── Hero gradient (Cards-tab top card) ─────────────────────── */
  /** 3-stop gradient sweep on the hero card (brand variant). */
  heroGradient: [string, string, string];
  /** Primary text/icon color on hero gradient (always white-ish). */
  heroOnGradient: string;
  /** Secondary, muted text on hero gradient. */
  heroOnGradientMuted: string;
  /** Glow color used by the hero's iOS shadow. */
  heroGlow: string;

  /* ── Danger hero gradient (e.g. Alarms tab "unsolved" state) ─── */
  /** 3-stop gradient sweep for the danger hero variant. */
  heroDangerGradient: [string, string, string];
  /** Secondary, muted text on the danger gradient. */
  heroDangerOnGradientMuted: string;
  /** Glow color for the danger hero's iOS shadow. */
  heroDangerGlow: string;
}

/* ─────────── 2b. Glass overlay scale (theme-agnostic) ─────────── */

/**
 * Translucent white overlays for use on saturated/dark backgrounds —
 * the hero gradient, dark-mode surfaces, deep accent fills. Same values
 * work in both themes because the gradient itself is always dark/
 * saturated. Avoids hardcoded `rgba(255,255,255,0.xx)` everywhere.
 */
export const glass = {
  /** Barely-there fill (sheen, subtle layering) */
  subtle: 'rgba(255,255,255,0.06)',
  /** Low-emphasis surface (e.g. icon halo) */
  low: 'rgba(255,255,255,0.10)',
  /** Standard glass surface (icon well, count chip) */
  medium: 'rgba(255,255,255,0.18)',
  /** Strong glass surface (frosted button) */
  strong: 'rgba(255,255,255,0.28)',
  /** Hairline border on glass */
  borderSubtle: 'rgba(255,255,255,0.14)',
  /** Standard glass border */
  border: 'rgba(255,255,255,0.32)',
  /** Muted text on glass */
  textMuted: 'rgba(255,255,255,0.78)',
  /** High-contrast text/icon on glass */
  textBold: '#FFFFFF',
  /** Transparent end-stop for sheen gradients */
  transparent: 'rgba(255,255,255,0)',
} as const;

export const lightScheme: ColorScheme = {
  bg: slate[50],
  surface: slate[0],
  surfaceRaised: slate[0],
  surfaceMuted: slate[100],

  textPrimary: slate[900],
  // AA on every light surface (was slate-500/400, which failed on muted).
  textSecondary: slate[600],
  textTertiary: '#636B78',
  textDisabled: slate[400],
  // Dark ink on the brand fill in BOTH themes (7.59:1 on emerald-500).
  textOnBrand: slate[950],

  brand: emerald[500],
  brandSoft: 'rgba(16, 185, 129, 0.10)',
  brandBold: emerald[600],
  brandText: emerald[700],

  accentGold: gold[500],

  hairline: 'rgba(17, 24, 39, 0.06)',
  border: slate[200],
  borderStrong: slate[500],
  scrim: 'rgba(10, 14, 26, 0.40)',
  logoPlate: slate[0],

  energyInk: {
    solar: '#4D7C0F',
    wind: '#0E7490',
    grid: '#1D4ED8',
    genset: '#C2410C',
    battery: '#7E22CE',
  },
  statusInk: {
    success: emerald[700],
    // amber-800: amber-700 (#B45309) is only 4.4:1 on its own soft fill.
    warning: '#92400E',
    danger: '#B91C1C',
    info: '#1D4ED8',
  },
  statusSoft: statusSoftAt(0.12),
  // The web gradients are too light for text on white (1.7–3.3:1), so
  // light mode darkens each hue: red-700, amber-800, lime-800, emerald-700
  // (≥ 5.0:1 on every light surface).
  prBandInk: {
    poor: '#B91C1C',
    fair: '#92400E',
    good: '#3F6212',
    excellent: emerald[700],
  },

  skeletonBase: slate[100],
  skeletonHighlight: slate[200],

  // Deeper emerald (700→900) so white hero text is ≥5.48:1 on every stop.
  heroGradient: [emerald[700], emerald[800], emerald[900]],
  heroOnGradient: slate[0],
  heroOnGradientMuted: emerald[100], // pale mint, ≥4.84:1 on emerald-700
  heroGlow: emerald[700],

  /** Deep rose stack — `red-700/800/900` for the "needs attention" hero,
   *  matched to the deeper brand hero so white text stays AA. */
  heroDangerGradient: ['#B91C1C', '#991B1B', '#7F1D1D'],
  heroDangerOnGradientMuted: '#FEE2E2',
  heroDangerGlow: '#EF4444',
};

export const darkScheme: ColorScheme = {
  bg: slate[950],
  surface: slate[900],
  surfaceRaised: slate[800],
  surfaceMuted: slate[850],

  textPrimary: slate[50],
  textSecondary: slate[400],
  // Brighter than slate-500 so it is AA on surfaceRaised (4.85:1).
  textTertiary: '#8B95A5',
  textDisabled: slate[600],
  textOnBrand: slate[950],

  brand: emerald[400], // slightly lighter in dark for AAA contrast
  brandSoft: 'rgba(52, 211, 153, 0.14)',
  brandBold: emerald[500],
  brandText: emerald[400],

  accentGold: gold[400],

  hairline: 'rgba(255, 255, 255, 0.06)',
  border: slate[700],
  borderStrong: slate[500],
  scrim: 'rgba(0, 0, 0, 0.60)',
  logoPlate: slate[200],

  energyInk: {
    solar: '#84CC16',
    wind: '#06B6D4',
    grid: '#60A5FA',
    genset: '#F97316',
    battery: '#C084FC',
  },
  statusInk: {
    success: emerald[400],
    warning: '#FBBF24',
    danger: '#F87171',
    info: '#60A5FA',
  },
  statusSoft: statusSoftAt(0.16),
  // Each band's bright gradient stop is AA on every dark surface (≥ 5.9:1).
  prBandInk: {
    poor: prBandPalette.poor[1],
    fair: prBandPalette.fair[1],
    good: prBandPalette.good[1],
    excellent: prBandPalette.excellent[1],
  },

  skeletonBase: slate[800],
  skeletonHighlight: slate[700],

  /**
   * Custom 3-stop deep-emerald-on-midnight set tuned to read as a
   * "premium" surface in dark mode without becoming a bright green
   * billboard. Hand-picked rather than emerald[800/900] which were
   * still too saturated.
   */
  heroGradient: ['#0E2A23', '#062018', '#031914'],
  heroOnGradient: slate[0],
  heroOnGradientMuted: '#9CD9C0', // mid-mint, AAA on the dark gradient
  heroGlow: emerald[500],

  /** Same recipe applied to red — deep-rose-on-near-black so the
   *  alarms hero reads as "active danger" without burning the eye in
   *  dark mode. */
  heroDangerGradient: ['#2A1314', '#220F10', '#180A0B'],
  heroDangerOnGradientMuted: '#FCA5A5', // pale rose on dark rose
  heroDangerGlow: '#EF4444',
};

/* ─────────── 3. Spacing — 4px grid ─────────── */

export const space = {
  /** 2 — micro gap (icon to label) */
  '2xs': 2,
  /** 4 — tight inline */
  xs: 4,
  /** 8 — default tight */
  sm: 8,
  /** 12 — list-item internal */
  md: 12,
  /** 16 — card padding */
  lg: 16,
  /** 20 — section padding */
  xl: 20,
  /** 24 — between cards */
  '2xl': 24,
  /** 32 — between sections */
  '3xl': 32,
  /** 48 — between major regions */
  '4xl': 48,
};

/* ─────────── 4. Radii ─────────── */

export const radius = {
  /** 6 — small chips, badges */
  sm: 6,
  /** 12 — buttons, inputs */
  md: 12,
  /** 16 — chips inside cards */
  lg: 16,
  /** 20 — cards (default) */
  xl: 20,
  /** 28 — sheets, hero surfaces */
  '2xl': 28,
  /** 9999 — pills, avatars */
  pill: 9999,
};

/* ─────────── 5. Elevation (shadows) ─────────── */

/**
 * Layered shadow recipes. Soft + tight + ambient combo on iOS for that
 * premium-app feel; android falls back to `elevation` integer.
 */
type Elevation = ViewStyle;

const shadow = (
  opacity: number,
  shadowRadius: number,
  offsetY: number,
  color = '#000',
): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius,
  shadowOffset: { width: 0, height: offsetY },
});

const lift = (
  iosOpacity: number,
  iosRadius: number,
  iosOffset: number,
  androidElevation: number,
): ViewStyle =>
  Platform.OS === 'ios'
    ? shadow(iosOpacity, iosRadius, iosOffset)
    : { elevation: androidElevation };

export const elevation: Record<'none' | 'sm' | 'md' | 'lg' | 'xl', Elevation> = {
  none: { shadowOpacity: 0, elevation: 0 },
  sm: lift(0.05, 8, 2, 1),
  md: lift(0.08, 16, 4, 3),
  lg: lift(0.12, 24, 8, 6),
  xl: lift(0.18, 40, 16, 12),
};

/* ─────────── 6. Typography scale ─────────── */

/**
 * Type ramp. Pairs with the existing `AppText` primitive — sizes flow
 * through `fontSize`, weights via the `bold/medium/semi_bold` props.
 */
export const type = {
  // Display — hero numbers, splash, signature moments
  displayLg: { size: 40, line: 48, weight: '700' as const, tracking: -0.5 },
  displayMd: { size: 32, line: 40, weight: '700' as const, tracking: -0.4 },

  // Headings
  h1: { size: 24, line: 32, weight: '700' as const, tracking: -0.3 },
  h2: { size: 20, line: 28, weight: '600' as const, tracking: -0.2 },
  h3: { size: 18, line: 24, weight: '600' as const, tracking: -0.1 },

  // Body
  bodyLg: { size: 16, line: 24, weight: '400' as const, tracking: 0 },
  body: { size: 14, line: 20, weight: '400' as const, tracking: 0 },
  bodySm: { size: 13, line: 18, weight: '400' as const, tracking: 0 },

  // Support
  caption: { size: 12, line: 16, weight: '400' as const, tracking: 0.1 },
  overline: { size: 11, line: 14, weight: '600' as const, tracking: 1.0 },
  // 11pt is the app-wide floor (AppText enforces it unless `fixedSize`).
  micro: { size: 11, line: 14, weight: '500' as const, tracking: 0.2 },

  // Number — for big readouts (use tabular variant + tighter tracking)
  numberLg: { size: 28, line: 32, weight: '600' as const, tracking: -0.4 },
  numberMd: { size: 20, line: 24, weight: '600' as const, tracking: -0.2 },
};

/* ─────────── 6b. Touch targets ─────────── */

/**
 * Minimum interactive target: 44×44pt (Apple HIG) on iOS, 48×48dp
 * (Material) on Android. Reach it by visual size or `hitSlop` — but inside
 * `overflow: 'hidden'` parents the size must be real (hitSlop is clipped).
 * `pillVisual` is the default visual height of a `Pill`.
 */
export const touch = {
  min: Platform.select({ ios: 44, android: 48, default: 44 }) as number,
  pillVisual: 36,
} as const;

/* ─────────── 7. Motion — durations + spring presets ─────────── */

export const duration = {
  /** 120ms — instantaneous feedback (button press) */
  instant: 120,
  /** 180ms — micro interactions (chip toggle) */
  fast: 180,
  /** 240ms — standard UI transitions */
  base: 240,
  /** 320ms — screen-level transitions */
  slow: 320,
  /** 480ms — emphasised, signature reveals */
  expressive: 480,
};

/**
 * Reanimated 3 spring configs. Use these instead of hand-rolling per
 * call — keeps the motion language consistent across the app.
 */
export const spring = {
  /** Snappy — taps, toggles. */
  responsive: { damping: 18, stiffness: 240, mass: 0.8 },
  /** Smooth — entrances, slides. */
  gentle: { damping: 22, stiffness: 180, mass: 1 },
  /** Bouncy — signature moments only (use sparingly). */
  expressive: { damping: 12, stiffness: 220, mass: 1 },
  /** Cushion — soft settle for layout changes. */
  cushion: { damping: 26, stiffness: 160, mass: 1 },
};

/* ─────────── 7b. Splash palette (brand-locked dark) ─────────── */

/**
 * Cold-start splash colours — a port of the web "signing-in" overlay
 * (`.sit` custom properties, dark mode only). Brand-locked: the native
 * launch screen can't read the persisted theme, so the splash never flips.
 *
 * `bg` is a NATIVE CONTRACT: it must equal the iOS LaunchScreen storyboard
 * colour, the iOS root view / window background (AppDelegate) and Android
 * `@color/splashBg` (windowBackground + v31 splash) so the native → JS
 * handoff is seamless.
 */
/**
 * The PES brand mark's colours (see `PESLogo`). Ink is the P, S and E-base;
 * bars are the two green E bars (horizontal gradient per bar). The ink pair
 * is the website's own light/dark treatment (`.sit.light --sit-ink #092819`
 * vs `.sit --sit-ink #fff`); the bundled logo.png's ink (#0A281A) is the
 * light one, which is why the PNG vanishes on dark backgrounds.
 */
export const brandMark = {
  inkOnLight: '#092819',
  inkOnDark: '#FFFFFF',
  barFrom: '#A2CC3A',
  barTo: '#4EA847',
} as const;

export const splashPalette = {
  bg: '#0B0F14',
  grid: '#94A3B8',
  /** 0x12 / 255 — web `--sit-grid: #94a3b812`. */
  gridAlpha: 0.0706,
  idle: '#94A3B8',
  lit: '#4ADE80',
  core: '#FFFFFF',
  substrate: '#0B0F14',
  ink: brandMark.inkOnDark,
  ink2: '#A6B3C4',
  barFrom: brandMark.barFrom,
  barTo: brandMark.barTo,
} as const;

/* ─────────── 8. Z-index scale ─────────── */

export const zIndex = {
  base: 0,
  raised: 1,
  dropdown: 10,
  sticky: 100,
  sheet: 1000,
  modal: 1100,
  toast: 1200,
};
