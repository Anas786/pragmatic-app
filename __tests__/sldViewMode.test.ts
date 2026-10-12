/**
 * SLD view store: the 3D / 2D view is PERSISTED (`{ view }` only — the
 * user's choice survives a cold start), while the Grouped / Units mode —
 * ONE mode shared by the Diagram and the 3D twin — and the Pause control
 * stay in memory (every cold start opens grouped, moving).
 */
import { beforeEach, describe, expect, it } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SLD_MODE,
  DEFAULT_SLD_VIEW,
  migratePersistedSldView,
  SLD_VIEW_STORAGE_KEY,
  useSldViewMode,
} from '../src/hooks/useSldViewMode';

/** Let zustand persist's async storage write land. */
const flush = () => new Promise(r => setTimeout(r, 0));

const stored = async (): Promise<unknown> => {
  const raw = await AsyncStorage.getItem(SLD_VIEW_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: unknown }).state : null;
};

beforeEach(async () => {
  useSldViewMode.setState({ mode: DEFAULT_SLD_MODE, view: DEFAULT_SLD_VIEW, motionPaused: false });
  await flush();
  await AsyncStorage.clear();
});

describe('defaults', () => {
  it('opens in 3D, grouped, moving', () => {
    expect(DEFAULT_SLD_VIEW).toBe('3d');
    expect(DEFAULT_SLD_MODE).toBe('grouped');
    const s = useSldViewMode.getState();
    expect([s.view, s.mode, s.motionPaused]).toEqual(['3d', 'grouped', false]);
  });
});

describe('migratePersistedSldView', () => {
  it('keeps a valid stored view, defaults anything else', () => {
    expect(migratePersistedSldView({ view: '2d' })).toBe('2d');
    expect(migratePersistedSldView({ view: '3d' })).toBe('3d');
    expect(migratePersistedSldView({ view: '4d' })).toBe('3d');
    expect(migratePersistedSldView({})).toBe('3d');
    expect(migratePersistedSldView(undefined)).toBe('3d');
    expect(migratePersistedSldView('2d')).toBe('3d');
  });
});

describe('one Grouped / Units mode for both views', () => {
  it('a mode set while 3D shows is the mode the Diagram shows (and the reverse)', () => {
    const s = useSldViewMode.getState();
    s.setView('3d');
    s.setMode('units');
    s.setView('2d');
    expect(useSldViewMode.getState().mode).toBe('units');
    useSldViewMode.getState().setMode('grouped');
    useSldViewMode.getState().setView('3d');
    expect(useSldViewMode.getState().mode).toBe('grouped');
  });
});

describe('persistence', () => {
  it('writes ONLY the view (mode and pause stay in memory)', async () => {
    const s = useSldViewMode.getState();
    s.setView('2d');
    s.setMode('units');
    s.setMotionPaused(true);
    await flush();
    expect(await stored()).toEqual({ view: '2d' });
    const now = useSldViewMode.getState();
    expect([now.view, now.mode, now.motionPaused]).toEqual(['2d', 'units', true]);
  });

  it('a cold start restores the view, never the mode or the pause', async () => {
    // A fresh session's in-memory defaults (setState persists too, so let
    // that write land BEFORE seeding the previous session's storage) …
    useSldViewMode.setState({ mode: 'grouped', view: '3d', motionPaused: false });
    await flush();
    // … and what the previous session stored (even a stray mode / pause).
    await AsyncStorage.setItem(
      SLD_VIEW_STORAGE_KEY,
      JSON.stringify({ state: { view: '2d', mode: 'units', motionPaused: true }, version: 0 }),
    );
    await useSldViewMode.persist.rehydrate();
    const s = useSldViewMode.getState();
    expect([s.view, s.mode, s.motionPaused]).toEqual(['2d', 'grouped', false]);
  });

  it('a garbled stored value falls back to 3D', async () => {
    useSldViewMode.setState({ view: '2d' });
    await flush();
    await AsyncStorage.setItem(
      SLD_VIEW_STORAGE_KEY,
      JSON.stringify({ state: { view: 'hologram' }, version: 0 }),
    );
    await useSldViewMode.persist.rehydrate();
    expect(useSldViewMode.getState().view).toBe('3d');
  });

  it('nothing stored keeps the default', async () => {
    await useSldViewMode.persist.rehydrate();
    expect(useSldViewMode.getState().view).toBe('3d');
  });
});
