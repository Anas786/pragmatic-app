import { create } from 'zustand';
import { Appearance, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';
import { darkColors, lightColors, ThemeColors } from 'src/utils/theme/colors';

/**
 * What the user picked. `'system'` follows the OS appearance live; the
 * explicit modes pin it. New installs default to `'dark'` (dark-first
 * brand, and the cold-start splash is dark-locked).
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'dark';

type ThemeStore = {
  preference: ThemePreference;
  /** Resolved mode — what `useScheme()` / `useThemedStyles()` read. */
  isDark: boolean;
  /** Legacy key-compatible palette (new code reads `useScheme()`). */
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
  /** Flip to the explicit opposite of the CURRENT resolved mode. */
  toggleTheme: () => void;
};

const isPreference = (v: unknown): v is ThemePreference =>
  v === 'system' || v === 'light' || v === 'dark';

/** OS appearance; `null`/unknown resolves to light (RN's own default). */
export const systemIsDark = (): boolean => {
  try {
    return Appearance.getColorScheme() === 'dark';
  } catch {
    return false;
  }
};

export const resolveIsDark = (preference: ThemePreference): boolean =>
  preference === 'system' ? systemIsDark() : preference === 'dark';

const modeFields = (isDark: boolean) => ({
  isDark,
  colors: isDark ? darkColors : lightColors,
});

/**
 * Migrates whatever was persisted under `theme-storage` into a preference:
 *  - v2 shape `{ preference }`            → that preference,
 *  - legacy `{ isDark: true | false }`    → `'dark'` / `'light'`
 *    (an existing user keeps exactly the theme they had),
 *  - nothing / garbage                    → the default (`'dark'`).
 */
export const migratePersistedTheme = (persisted: unknown): ThemePreference => {
  const p = (persisted ?? {}) as { preference?: unknown; isDark?: unknown };
  if (isPreference(p.preference)) return p.preference;
  if (typeof p.isDark === 'boolean') return p.isDark ? 'dark' : 'light';
  return DEFAULT_THEME_PREFERENCE;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      preference: DEFAULT_THEME_PREFERENCE,
      ...modeFields(resolveIsDark(DEFAULT_THEME_PREFERENCE)),
      setPreference: preference => {
        const isDark = resolveIsDark(preference);
        const s = get();
        if (s.preference === preference && s.isDark === isDark) return;
        set({ preference, ...modeFields(isDark) });
      },
      toggleTheme: () => {
        get().setPreference(get().isDark ? 'light' : 'dark');
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ preference: state.preference }),
      merge: (persisted, current) => {
        const preference = migratePersistedTheme(persisted);
        return {
          ...current,
          preference,
          ...modeFields(resolveIsDark(preference)),
        };
      },
    },
  ),
);

/**
 * Re-resolve `'system'` against the OS. Writes only when the resolved
 * mode actually changed, so it never re-renders the tree for nothing.
 */
const syncSystemAppearance = (scheme?: string | null) => {
  const s = useThemeStore.getState();
  if (s.preference !== 'system') return;
  const isDark = scheme === undefined ? systemIsDark() : scheme === 'dark';
  if (isDark !== s.isDark) useThemeStore.setState(modeFields(isDark));
};

/*
 * Module-level OS-appearance follower (one listener for the app's
 * lifetime, never per component). iOS re-renders the app in BOTH
 * appearances while snapshotting for the app switcher, firing spurious
 * change events in the background — so changes are only applied while
 * active, and the real value is re-read on every return to 'active'.
 */
try {
  Appearance.addChangeListener(({ colorScheme }) => {
    if (AppState.currentState !== 'active') return;
    syncSystemAppearance(colorScheme);
  });
  AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') syncSystemAppearance();
  });
} catch {
  // Test / headless environments without the native modules.
}
