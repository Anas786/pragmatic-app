/**
 * Shared config for every react-native-echarts-pro (WebView) chart in
 * SiteDetail — the Trends combo chart, the full-screen chart viewer and
 * the Performance Report charts all import from here instead of keeping
 * per-file copies. Deliberately a leaf module (types + constants only,
 * no component imports) so consumers don't drag extra trees in.
 *
 * Exports:
 *   - `WEBVIEW_SETTINGS`       — the mandatory `webViewSettings` prop
 *   - `ChartTheme`             — the scheme subset the option builders consume
 *   - `chartThemeFromScheme()` — stable-reference `ChartTheme` per scheme
 */

import { Scheme } from 'src/theme';

// react-native-echarts-pro hardcodes androidHardwareAccelerationDisabled
// on its WebView but spreads `webViewSettings` AFTER it — so this
// override wins and re-enables GPU compositing on Android. Module-level
// so the prop reference stays stable across renders. Pass it to EVERY
// RNEChartsPro instance (CLAUDE.md §19) — a missed one silently regresses
// that chart to software rendering on Android.
export const WEBVIEW_SETTINGS = { androidHardwareAccelerationDisabled: false };

/**
 * The scheme-derived colour/typography subset every echarts `option`
 * builder needs (Trends combo chart + Performance Report pie/stack).
 */
export interface ChartTheme {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  /** Raised surface — used as the tooltip background. */
  surface: string;
  isDark: boolean;
}

// `useScheme()` returns one of two module-level singletons (CLAUDE.md
// §4.2), so caching per scheme keeps the derived theme referentially
// stable too — call sites can use the result directly in useMemo deps /
// React.memo props without wrapping it in their own useMemo.
const themeCache = new WeakMap<Scheme, ChartTheme>();

/** Derive the {@link ChartTheme} for the active scheme (stable reference). */
export const chartThemeFromScheme = (scheme: Scheme): ChartTheme => {
  const cached = themeCache.get(scheme);
  if (cached) return cached;
  const theme: ChartTheme = {
    textPrimary: scheme.textPrimary,
    textSecondary: scheme.textSecondary,
    textTertiary: scheme.textTertiary,
    border: scheme.border,
    surface: scheme.surfaceRaised,
    isDark: scheme.isDark,
  };
  themeCache.set(scheme, theme);
  return theme;
};
