/**
 * Design system entry point.
 *
 * Import order of preference for new code:
 *   import { useScheme, space, radius, elevation, spring, type } from 'src/theme';
 *
 * The legacy color exports in `src/utils/theme/index.ts` still work and
 * have been re-derived from this file under the hood — no need to migrate
 * old screens in lockstep.
 */

import { useThemeStore } from 'src/hooks';
import { darkScheme, lightScheme, ColorScheme } from './tokens';

export * from './tokens';
export { useThemedStyles } from './useThemedStyles';
export type { Scheme } from './useThemedStyles';

// Built once at module load so `useScheme()` returns the *same* object
// reference on every call for a given mode — keeps memoized children
// (React.memo / useMemo deps) from invalidating on unrelated re-renders.
const LIGHT: ColorScheme & { isDark: boolean } = {
  ...lightScheme,
  isDark: false,
};
const DARK: ColorScheme & { isDark: boolean } = {
  ...darkScheme,
  isDark: true,
};

/**
 * Subscribes a component to the active color scheme.
 *
 * Replaces the older `useThemeStore().colors` lookup for new code — the
 * returned object is the richer semantic palette (`bg`, `surface`,
 * `brand`, `brandSoft`, `hairline`, `skeletonBase`, …) defined in
 * `tokens.ts`.
 *
 * Referentially stable: the same frozen-by-convention object is returned
 * for every call in a given mode, so it's safe to use directly in
 * `useMemo`/`useCallback` deps and `React.memo`'d component props.
 */
export const useScheme = (): ColorScheme & { isDark: boolean } => {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? DARK : LIGHT;
};
