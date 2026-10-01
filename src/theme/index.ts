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

import { useThemeStore } from 'src/hooks/useThemeStore';
import { ColorScheme } from './tokens';
import { DARK_SCHEME, LIGHT_SCHEME } from './useThemedStyles';

export * from './tokens';
export { useThemedStyles, LIGHT_SCHEME, DARK_SCHEME } from './useThemedStyles';
export type { Scheme } from './useThemedStyles';

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
 * The mode follows the theme preference (System / Light / Dark).
 */
export const useScheme = (): ColorScheme & { isDark: boolean } => {
  const isDark = useThemeStore(s => s.isDark);
  return isDark ? DARK_SCHEME : LIGHT_SCHEME;
};
