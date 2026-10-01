import { create } from 'zustand';

/**
 * SLD view mode: `grouped` collapses source units into one box per energy
 * type (see `buildSldGrouping`); `units` is the raw per-unit diagram.
 *
 * Deliberately NOT persisted — a tiny in-memory store so the inline diagram
 * and the full-screen route always show the same mode within a session, and
 * every cold start opens on the grouped overview.
 */
export type SldViewMode = 'grouped' | 'units';

type SldViewModeStore = {
  mode: SldViewMode;
  setMode: (mode: SldViewMode) => void;
};

export const useSldViewMode = create<SldViewModeStore>(set => ({
  mode: 'grouped',
  setMode: mode => set({ mode }),
}));
