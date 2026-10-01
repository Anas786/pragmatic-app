/**
 * Legacy `ThemeColors` shim — key-compatible with the pre-redesign
 * theme object, but every value is now RE-DERIVED from the v2 design
 * tokens (`src/theme/tokens.ts`), as CLAUDE.md §4.2/§13 document.
 * Unmigrated call sites (`useThemeStore().colors.X`) therefore pick up
 * the v2 palette automatically, and tuning `tokens.ts` propagates here.
 *
 * New code should NOT use this — read from `useScheme()` instead.
 *
 * Import note: pull from `src/theme/tokens` directly (never the
 * `src/theme` barrel) to avoid a require cycle:
 * theme/index → hooks/useThemeStore → utils/theme/colors.
 */
import {
  ColorScheme,
  darkScheme,
  glass,
  lightScheme,
} from 'src/theme/tokens';

export type ThemeColors = {
  // Backgrounds
  splashBg: string;
  inputDarkBg: string;
  cardBg: string;
  metricCardBg: string;
  dropdownBg: string;
  tabInactiveBg: string;
  progressBg: string;
  progressFilled: string,
  darkBgSecondary: string;
  rememberMeFilled: string;

  // Borders
  inputDarkBorder: string;

  // Text
  primaryText: string;
  textSecondary: string;

  // Overlays
  overlayDark: string;
  overlayLightBorder: string;
  overlayLightStrip: string;
  chartRuleColor: string;
  divider: string;

  // Buttons & links
  loginButtonBg: string;
  termsLink: string;

  // Bubbles (GradientRangeBar)
  bubbleTextDark: string;
  bubbleBg: string;

  // SLD / fullscreen
  fullscreenBg: string;
  controlButtonBg: string;

  // StatusBar
  statusBarStyle: 'light-content' | 'dark-content';

  // Navigation
  navigationBg: string;

  // Header
  headerBg: string;

  // Date filter
  dateFilterBg: string;
  dateFilterText: string;

  // Tabs
  tabActiveBg: string;
};

/**
 * Map every legacy key to its nearest v2 scheme token. The scrim
 * (`overlayDark`) has no scheme token yet, so it keeps a literal value
 * per mode.
 */
const deriveColors = (scheme: ColorScheme, isDark: boolean): ThemeColors => ({
  splashBg: scheme.bg,
  inputDarkBg: scheme.surfaceMuted,
  cardBg: scheme.surface,
  metricCardBg: scheme.surfaceRaised,
  dropdownBg: scheme.surfaceRaised,
  tabInactiveBg: scheme.surfaceMuted,
  progressBg: scheme.skeletonBase,
  progressFilled: scheme.brand,
  darkBgSecondary: scheme.surfaceRaised,
  rememberMeFilled: scheme.brand,

  inputDarkBorder: scheme.border,

  primaryText: scheme.textPrimary,
  textSecondary: scheme.textSecondary,

  // No scrim token in tokens.ts — keep the literal per-mode values.
  overlayDark: isDark ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.95)',
  overlayLightBorder: isDark ? glass.borderSubtle : scheme.hairline,
  overlayLightStrip: isDark ? glass.medium : scheme.hairline,
  chartRuleColor: scheme.hairline,
  divider: scheme.hairline,

  loginButtonBg: scheme.brand,
  termsLink: scheme.brand,

  // Bubble is always a light chip with dark text, in both modes.
  bubbleTextDark: lightScheme.textPrimary,
  bubbleBg: isDark ? lightScheme.surface : lightScheme.surfaceMuted,

  fullscreenBg: scheme.bg,
  controlButtonBg: scheme.surfaceRaised,

  statusBarStyle: isDark ? 'light-content' : 'dark-content',
  navigationBg: scheme.bg,

  headerBg: scheme.surfaceMuted,

  // Light mode kept its high-contrast "dark pill on light page" look.
  // The light text is the white `surface` — NOT `textOnBrand`, which is
  // dark ink in both themes now and would vanish on the dark pill.
  dateFilterBg: isDark ? scheme.surfaceRaised : scheme.textPrimary,
  dateFilterText: isDark ? scheme.textPrimary : scheme.surface,

  tabActiveBg: scheme.brand,
});

export const darkColors: ThemeColors = deriveColors(darkScheme, true);

export const lightColors: ThemeColors = deriveColors(lightScheme, false);
