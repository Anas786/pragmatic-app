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
 *   - beyond the `T` range → a short exponent form (`"4e31"`, never the
 *     `toFixed`-on-a-huge-number garbage this replaces, e.g. `"4e+25M"`)
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

/** Compact axis-tick formatter (string fn — needs `enableParseStringFunction`). */
export const Y_AXIS_LABEL_FORMATTER = `function(v){${COMPACT_VALUE_FN_SRC} return __fmtCompactVal(v);}`;
