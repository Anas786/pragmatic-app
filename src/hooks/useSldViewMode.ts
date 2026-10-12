import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * SLD view state, shared by the inline panel and the full-screen route
 * (both always show the same view, mode and motion setting):
 *
 *  - `view` — the "Diagram | 3D" switch: `3d` (the web portal's own 3D
 *    twin, `SldTwin/` — the default, like the web) or `2d` (the app's
 *    phone Diagram). The user's choice is PERSISTED (zustand persist +
 *    AsyncStorage): someone who prefers the Diagram keeps it across
 *    launches. The stored values stay `'3d'` / `'2d'`.
 *  - `mode` — Grouped / Units, ONE mode for both views (switching it in 3D
 *    switches the Diagram too, and vice versa): `grouped` collapses source
 *    units into one box per energy type (see `buildSldGrouping`) — in 3D
 *    one twin model per group, carrying the group's totals; `units` is the
 *    raw per-unit diagram / the twin exactly as the web draws it.
 *    In-memory: every cold start opens on the grouped overview.
 *  - `motionPaused` — the Diagram's Pause / Play control (WCAG 2.2.2):
 *    stops its flow animation. In-memory. (The twin draws its own motion.)
 *
 * Only `view` is written to storage (`partialize`); a missing or garbled
 * stored value falls back to the default.
 */
export type SldViewMode = 'grouped' | 'units';

/** Every cold start opens grouped (the overview), in both views. */
export const DEFAULT_SLD_MODE: SldViewMode = 'grouped';

/** How the energy flow is drawn: the 3D web twin or the 2D Diagram. */
export type SldView = '3d' | '2d';

export const DEFAULT_SLD_VIEW: SldView = '3d';

type SldViewModeStore = {
  mode: SldViewMode;
  setMode: (mode: SldViewMode) => void;
  view: SldView;
  setView: (view: SldView) => void;
  motionPaused: boolean;
  setMotionPaused: (paused: boolean) => void;
};

const isSldView = (v: unknown): v is SldView => v === '3d' || v === '2d';

/** The stored view (`{ view }`), or the default for anything else. */
export const migratePersistedSldView = (persisted: unknown): SldView => {
  const p = (persisted ?? {}) as { view?: unknown };
  return isSldView(p.view) ? p.view : DEFAULT_SLD_VIEW;
};

export const SLD_VIEW_STORAGE_KEY = 'sld-view-storage';

export const useSldViewMode = create<SldViewModeStore>()(
  persist(
    set => ({
      mode: DEFAULT_SLD_MODE,
      setMode: mode => set({ mode }),
      view: DEFAULT_SLD_VIEW,
      setView: view => set({ view }),
      motionPaused: false,
      setMotionPaused: motionPaused => set({ motionPaused }),
    }),
    {
      name: SLD_VIEW_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ view: state.view }),
      merge: (persisted, current) => ({
        ...current,
        view: migratePersistedSldView(persisted),
      }),
    },
  ),
);
