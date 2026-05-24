import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeStore } from 'src/hooks';
import { darkScheme, lightScheme, ColorScheme } from './tokens';

export type Scheme = ColorScheme & { isDark: boolean };

/**
 * Builds a memoised StyleSheet that depends on the active color scheme.
 *
 * Bakes theme-driven values (borders, fills, tinted surfaces) into a real
 * StyleSheet so call-sites can write `style={themed.card}` — RN can then
 * hash the style ID across the bridge once instead of per render.
 *
 * **The factory MUST be declared at module scope** (outside the component
 * body) — passing an inline arrow on every render breaks the memo.
 */
export function useThemedStyles<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(factory: (scheme: Scheme) => T): T {
  const isDark = useThemeStore(s => s.isDark);
  return useMemo(() => {
    const base = isDark ? darkScheme : lightScheme;
    return StyleSheet.create(factory({ ...base, isDark }));
  }, [isDark, factory]);
}
