import { StyleSheet } from 'react-native';
import { useThemeStore } from 'src/hooks/useThemeStore';
import { darkScheme, lightScheme, ColorScheme } from './tokens';

export type Scheme = ColorScheme & { isDark: boolean };

/**
 * The two app-wide scheme singletons. Built ONCE at module load so
 * `useScheme()` returns the *same* object reference on every call for a
 * given mode — keeps memoized children (React.memo / useMemo deps) from
 * invalidating on unrelated re-renders. Never mutate them.
 */
export const LIGHT_SCHEME: Scheme = { ...lightScheme, isDark: false };
export const DARK_SCHEME: Scheme = { ...darkScheme, isDark: true };

type StyleCache = { light?: unknown; dark?: unknown };

/**
 * Per-factory StyleSheet cache, keyed by the factory function itself.
 * Every component instance that uses the same (module-scope) factory
 * shares ONE StyleSheet per mode, so `themed.x` identity is stable across
 * renders AND instances within a mode (safe in memo deps), and a theme
 * flip builds each sheet at most once per mode for the app's lifetime.
 */
const cache = new WeakMap<Function, StyleCache>();

const resolve = <T>(factory: (scheme: Scheme) => T, isDark: boolean): T => {
  let entry = cache.get(factory);
  if (!entry) {
    entry = {};
    cache.set(factory, entry);
  }
  const key = isDark ? 'dark' : 'light';
  if (entry[key] === undefined) {
    entry[key] = StyleSheet.create(
      factory(isDark ? DARK_SCHEME : LIGHT_SCHEME) as any,
    );
  }
  return entry[key] as T;
};

/**
 * Builds a memoised StyleSheet that depends on the active color scheme.
 *
 * Bakes theme-driven values (borders, fills, tinted surfaces) into a real
 * StyleSheet so call-sites can write `style={themed.card}` — RN can then
 * hash the style ID across the bridge once instead of per render.
 *
 * **The factory MUST be declared at module scope** (outside the component
 * body) — the cache is keyed by the factory reference, so an inline arrow
 * would build (and leak into the WeakMap) a new sheet on every render.
 */
export function useThemedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (scheme: Scheme) => T): T {
  const isDark = useThemeStore(s => s.isDark);
  return resolve(factory, isDark);
}
