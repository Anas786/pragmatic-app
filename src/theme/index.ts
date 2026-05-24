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

/**
 * Subscribes a component to the active color scheme.
 *
 * Replaces the older `useThemeStore().colors` lookup for new code — the
 * returned object is the richer semantic palette (`bg`, `surface`,
 * `brand`, `brandSoft`, `hairline`, `skeletonBase`, …) defined in
 * `tokens.ts`.
 */
export const useScheme = (): ColorScheme & { isDark: boolean } => {
  const isDark = useThemeStore(s => s.isDark);
  const scheme = isDark ? darkScheme : lightScheme;
  return { ...scheme, isDark };
};
