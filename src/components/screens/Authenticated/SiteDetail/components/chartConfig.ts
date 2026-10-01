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
 *   - `COMPACT_VALUE_FN_SRC`   — JS source of a single-value compact formatter
 *   - `Y_AXIS_LABEL_FORMATTER` — the above wrapped as an axisLabel formatter
 *   - `SUSPECT_READING_ABS` / `formatInvalidReadingsNote()` — the
 *     invalid-looking-reading threshold + the note every chart shows for
 *     it (detection only: such readings are always plotted as sent)
 */

import type { ComponentProps } from 'react';
import type { WebView } from 'react-native-webview';
import { Scheme } from 'src/theme';
import { SUSPECT_READING_ABS } from 'src/utils/units';

// Spread by react-native-echarts-pro onto its <WebView> AFTER its own
// defaults, so these win. Module-level so the prop reference stays stable
// across renders. Pass it to EVERY RNEChartsPro instance (CLAUDE.md §19,
// enforced by __tests__/chartWebViewSettings.test.ts). `satisfies` checks
// every key against react-native-webview's own props — echarts-pro types
// `webViewSettings` as `any`, so a misspelt or removed prop would otherwise
// be dropped silently (that is how `androidHardwareAccelerationDisabled`,
// which react-native-webview ≥ 11 no longer has, sat here as a no-op; the
// charts are GPU-composited by default — androidLayerType 'none').
//
// autoManageStatusBarEnabled: false — iOS. react-native-webview 13.16
// snapshots the status-bar style when a WebView is created and re-applies
// that snapshot on EVERY window show / hide anywhere in the app (alerts,
// keyboards, dev banners — RNCWebViewImpl.m showFullScreenVideoStatusBars /
// hideFullScreenVideoStatusBars, observers on object:nil). Fabric pools the
// views, so the snapshot outlives the chart: a chart first drawn in dark
// mode turned the status bar white-on-white in light mode after the
// Sign-out alert (reproduced in Release, 2026-10-01). RN <StatusBar> must
// stay the only writer of the style.
export const WEBVIEW_SETTINGS = {
  autoManageStatusBarEnabled: false,
} satisfies Partial<ComponentProps<typeof WebView>>;

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
  /** Brand emerald — dataZoom handles / selected-range outline. */
  brand: string;
  /** 10–14% brand tint — the dataZoom selected-range fill. */
  brandSoft: string;
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
    brand: scheme.brand,
    brandSoft: scheme.brandSoft,
    isDark: scheme.isDark,
  };
  themeCache.set(scheme, theme);
  return theme;
};

/**
 * JS **source** (not a real function) for a single-value compact-number
 * formatter. react-native-echarts-pro's `formatter` props are evaluated as
 * function-source STRINGS inside the WebView (`enableParseStringFunction`)
 * with no shared JS closure across them — so this text is spliced into
 * every axis/tooltip formatter string that needs it (see
 * `Y_AXIS_LABEL_FORMATTER` below, and the Trends tooltip formatter) rather
 * than imported as a real function.
 *
 * Declares `__fmtCompactVal(v)`, which maps a finite number to:
 *   - `0` → `"0"`
 *   - `|v| < 1000` → up to 2 decimals, trailing zeros trimmed
 *   - otherwise → `K`/`M`/`B`/`T` suffix with ≤3 significant digits, float
 *     noise rounded away (e.g. `3.9999999999999995` → `4`). A value that
 *     rounds up into the next bucket (e.g. `999999` → `1000K`) is bumped
 *     to that bucket instead (`"1M"`).
 *   - beyond the `T` range → a short exponent form (`"4e31"`, `"-1.2e35"`,
 *     never the `toFixed`-on-a-huge-number garbage this replaces, e.g.
 *     `"4e+25M"`). Charts plot a device's invalid-looking readings at their
 *     true value, so ticks this large are real and must stay readable.
 *   - negative input keeps its sign; non-finite input → `""`
 */
export const COMPACT_VALUE_FN_SRC = `function __fmtCompactVal(v){
  if(typeof v!=='number'||!isFinite(v))return '';
  if(v===0)return '0';
  var sign=v<0?'-':'';
  var a=Math.abs(v);
  function __rs(x,sig){
    if(x===0)return 0;
    var p=sig-1-Math.floor(Math.log10(x));
    var m=Math.pow(10,p);
    return Math.round(x*m)/m;
  }
  if(a<1){
    return sign+String(__rs(a,3));
  }
  if(a<1000){
    var r=Math.round(a*100)/100;
    if(r===0)return '0';
    if(r<1000)return sign+String(r);
    a=r;
  }
  var tiers=[[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']];
  for(var i=0;i<tiers.length;i++){
    var div=tiers[i][0],suf=tiers[i][1];
    if(a>=div){
      var sc=__rs(a/div,3);
      if(sc>=1000){
        if(i===0)break;
        var up=tiers[i-1];
        return sign+String(__rs(a/up[0],3))+up[1];
      }
      return sign+String(sc)+suf;
    }
  }
  var exp=Math.floor(Math.log10(a));
  var mant=__rs(a/Math.pow(10,exp),3);
  if(mant>=10){mant=mant/10;exp++;}
  if(mant<1){mant=mant*10;exp--;}
  return sign+String(mant)+'e'+exp;
}`;

/**
 * A tick smaller than this fraction of the largest tick already formatted
 * on the same axis pass is float noise standing in for 0 (see
 * {@link Y_AXIS_LABEL_FORMATTER}). Real ticks are whole multiples of the
 * axis interval, so a non-zero one is never below ~1/20 of the largest;
 * the accumulated noise is ~1e-16 of it.
 */
const AXIS_TICK_NOISE_RATIO = 1e-9;

/**
 * Compact axis-tick formatter (string fn — needs `enableParseStringFunction`).
 *
 * Float-noise guard: echarts 5.4.2 builds value-axis ticks by adding the
 * interval step by step. Past ~2^53 (a device's 1e31–1e35 garbage, plotted
 * as sent) the steps aren't exact, so the tick where 0 belongs comes out
 * as noise (-562949953421312, -1.15e18 …) — which would print a made-up
 * "-563T" on the axis. echarts formats one axis's ticks in index order,
 * smallest first (index 0 = the axis minimum), so the formatter keeps the
 * largest |tick| of the current pass and prints '0' for a tick that is a
 * vanishing fraction of it. The pass restarts at index 0, so after a
 * legend tap rescales the axis (garbage series hidden) ordinary small
 * ticks are never mistaken for noise. The state lives on the WebView's
 * global (`new Function` bodies can't close over anything — the library's
 * own `formatterVariable` uses the same channel); a direct call without
 * an index (tests, tooltips) formats statelessly.
 */
export const Y_AXIS_LABEL_FORMATTER = `function(v,i){${COMPACT_VALUE_FN_SRC}
  if(typeof i==='number'&&typeof v==='number'&&isFinite(v)){
    var __g=typeof window!=='undefined'?window:globalThis;
    var __a=Math.abs(v);
    if(i===0){__g.__pesAxisTickMax=__a;}
    else{var __m=__g.__pesAxisTickMax||0;if(__a>0&&__a<__m*${AXIS_TICK_NOISE_RATIO})return '0';if(__a>__m)__g.__pesAxisTickMax=__a;}
  }
  return __fmtCompactVal(v);
}`;

/**
 * |value| at or beyond which a device reading LOOKS invalid: no metric in
 * any unit the backend ships gets near it (even a 1 GW plant only makes
 * ~2.4e7 kWh/day). Devices do send such values — Lucky Cement's "Wind
 * Energy Day" daily aggregate came back as ~4e31 and later ~-1.2e35; the
 * web portal's Analysis chart plots it as-is.
 *
 * DETECTION ONLY — never a filter, clamp or gap. A chart plots such a
 * reading at its TRUE value on the shared scale (like the web), even though
 * it flattens the other series: hiding it would hide that the device sent
 * garbage. The count only words {@link formatInvalidReadingsNote}. The
 * threshold lives in utils/units.ts (shared with the Live tab, Cards, SLD
 * and Dashboard chips, which write such values in 'e' notation).
 */
export { SUSPECT_READING_ABS };

/**
 * The data-quality note a chart shows when it plotted invalid-looking
 * readings. It hides nothing — it says where the odd values came from:
 * '1 reading looks invalid — shown exactly as sent by the device' /
 * 'N readings look invalid — …'.
 */
export const formatInvalidReadingsNote = (count: number): string =>
  `${count} ${count === 1 ? 'reading looks' : 'readings look'} invalid — shown exactly as sent by the device`;
