/**
 * Theme preference store: 'system' | 'light' | 'dark', persisted as
 * `{ preference }`, migrating the legacy persisted `{ isDark }`. 'system'
 * follows the OS appearance live (only while the app is active).
 */
import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, AppState } from 'react-native';
import { darkColors } from '../src/utils/theme/colors';

type StoreModule = typeof import('../src/hooks/useThemeStore');

const appearanceListeners: Array<(p: { colorScheme: string | null }) => void> = [];
const appStateListeners: Array<(s: string) => void> = [];
let osScheme: 'light' | 'dark' | null = 'light';
const setAppState = (s: string) => {
  (AppState as unknown as { currentState: string }).currentState = s;
};

let store: StoreModule;

beforeAll(() => {
  // Installed BEFORE the store module loads: its OS listeners register at
  // module scope, once for the app's lifetime.
  jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => osScheme as never);
  jest.spyOn(Appearance, 'addChangeListener').mockImplementation(((
    fn: (p: { colorScheme: string | null }) => void,
  ) => {
    appearanceListeners.push(fn);
    return { remove: jest.fn() };
  }) as never);
  (AppState.addEventListener as unknown as jest.Mock).mockImplementation(((
    _type: string,
    fn: (s: string) => void,
  ) => {
    appStateListeners.push(fn);
    return { remove: jest.fn() };
  }) as never);
  store = require('../src/hooks/useThemeStore');
});

beforeEach(async () => {
  await AsyncStorage.clear();
  osScheme = 'light';
  setAppState('active');
  store.useThemeStore.setState({ preference: 'dark', isDark: true, colors: darkColors });
});

const loadStore = (): StoreModule => store;

describe('migratePersistedTheme', () => {
  it('maps legacy isDark and defaults to dark', () => {
    const { migratePersistedTheme } = loadStore();
    expect(migratePersistedTheme({ isDark: true })).toBe('dark');
    expect(migratePersistedTheme({ isDark: false })).toBe('light');
    expect(migratePersistedTheme(undefined)).toBe('dark');
    expect(migratePersistedTheme({})).toBe('dark');
    expect(migratePersistedTheme({ preference: 'system' })).toBe('system');
    expect(migratePersistedTheme({ preference: 'sepia', isDark: false })).toBe('light');
  });
});

describe('hydration', () => {
  const hydrateWith = async (state: object | null) => {
    const { useThemeStore } = loadStore();
    // Start from the opposite of what we expect so a no-op merge would fail.
    // (setState persists too, so let that write land BEFORE seeding.)
    useThemeStore.setState({ preference: 'system', isDark: false });
    await new Promise(r => setTimeout(r, 0));
    await AsyncStorage.removeItem('theme-storage');
    if (state) {
      await AsyncStorage.setItem('theme-storage', JSON.stringify({ state, version: 0 }));
    }
    await useThemeStore.persist.rehydrate();
    return useThemeStore.getState();
  };

  it('an existing dark user stays dark', async () => {
    const s = await hydrateWith({ isDark: true });
    expect([s.preference, s.isDark]).toEqual(['dark', true]);
  });

  it('an existing light user stays light (with the light legacy palette)', async () => {
    const { lightColors } = require('../src/utils/theme/colors');
    const s = await hydrateWith({ isDark: false });
    expect([s.preference, s.isDark]).toEqual(['light', false]);
    expect(s.colors).toEqual(lightColors);
  });

  it('a new install is dark', async () => {
    const s = await hydrateWith(null);
    expect([s.preference, s.isDark]).toEqual(['dark', true]);
  });

  it('persists only the preference', async () => {
    const { useThemeStore } = loadStore();
    await useThemeStore.persist.rehydrate();
    useThemeStore.getState().setPreference('light');
    await new Promise(r => setTimeout(r, 0));
    const raw = JSON.parse((await AsyncStorage.getItem('theme-storage')) as string);
    expect(raw.state).toEqual({ preference: 'light' });
  });
});

describe('preference actions', () => {
  it("setPreference('system') resolves from Appearance", () => {
    const { useThemeStore } = loadStore();
    osScheme = 'dark';
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState()).toMatchObject({ preference: 'system', isDark: true });
    useThemeStore.getState().setPreference('light');
    osScheme = 'light';
    useThemeStore.getState().setPreference('system');
    expect(useThemeStore.getState()).toMatchObject({ preference: 'system', isDark: false });
  });

  it('toggleTheme sets the explicit opposite of the resolved mode', () => {
    const { useThemeStore } = loadStore();
    osScheme = 'dark';
    useThemeStore.getState().setPreference('system');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState()).toMatchObject({ preference: 'light', isDark: false });
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState()).toMatchObject({ preference: 'dark', isDark: true });
  });
});

describe('following the OS', () => {
  it("flips with the OS only while preference is 'system' and the app is active", () => {
    const { useThemeStore } = loadStore();
    expect(appearanceListeners).toHaveLength(1);
    expect(appStateListeners).toHaveLength(1);
    useThemeStore.getState().setPreference('system'); // OS light
    expect(useThemeStore.getState().isDark).toBe(false);

    osScheme = 'dark';
    appearanceListeners[0]({ colorScheme: 'dark' });
    expect(useThemeStore.getState().isDark).toBe(true);

    // Background snapshot events (iOS renders both appearances) are ignored…
    setAppState('background');
    appearanceListeners[0]({ colorScheme: 'light' });
    expect(useThemeStore.getState().isDark).toBe(true);
    // …and the real OS value is re-read on return to active.
    osScheme = 'light';
    setAppState('active');
    appStateListeners.forEach(fn => fn('active'));
    expect(useThemeStore.getState().isDark).toBe(false);

    // An explicit mode ignores the OS.
    useThemeStore.getState().setPreference('dark');
    appearanceListeners[0]({ colorScheme: 'light' });
    expect(useThemeStore.getState().isDark).toBe(true);
  });

  it('does not write the store when nothing changed', () => {
    const { useThemeStore } = loadStore();
    useThemeStore.getState().setPreference('system');
    const listener = jest.fn();
    const unsub = useThemeStore.subscribe(listener);
    appearanceListeners[0]({ colorScheme: 'light' });
    useThemeStore.getState().setPreference('system');
    expect(listener).not.toHaveBeenCalled();
    unsub();
  });
});
