import { create } from 'zustand';
import type { InverterFilterOption } from 'src/data/mock';
import type { MonthSelection } from 'src/utils/reports';
import { useUserStore } from './useUserStore';

/**
 * Remembered period selections for the report-style cards, keyed
 * `${siteId}:${card}` — so Reports and Tables each keep their own period
 * (CLAUDE.md §8), per site, across tab switches (the tabs unmount on
 * switch, which used to reset every selection to the defaults).
 *
 * Deliberately NOT persisted: a cold start begins from the defaults.
 * Entries hold only what the user changed; `useDateFilter` fills the rest
 * from its own stable defaults, so a site nobody touched has no entry.
 * Cleared automatically on sign-out / account switch (see the user-store
 * subscription at the bottom), so the next account never inherits them.
 */
export type ReportCard = 'reports' | 'tables';

export interface ReportPeriodScope {
  siteId: string;
  card: ReportCard;
}

export interface ReportPeriodEntry {
  activeFilter: InverterFilterOption;
  startDate: Date;
  endDate: Date;
  selectedMonth: MonthSelection;
  selectedYear: number;
}

type ReportPeriodStore = {
  entries: Record<string, ReportPeriodEntry>;
  /** Merge `entry` into the key's selection (a full entry on first write). */
  setEntry: (key: string, entry: ReportPeriodEntry) => void;
  /** Forget every remembered selection (e.g. on sign-out). */
  reset: () => void;
};

export const reportPeriodKey = (scope: ReportPeriodScope): string =>
  `${scope.siteId}:${scope.card}`;

export const useReportPeriodStore = create<ReportPeriodStore>()(set => ({
  entries: {},
  setEntry: (key, entry) =>
    set(state => ({ entries: { ...state.entries, [key]: entry } })),
  reset: () => set({ entries: {} }),
}));

/**
 * Forget every selection when the signed-in user goes away or changes.
 * `executeLogout` (networking/config.ts) — the ONE sign-out routine for both
 * the drawer and the forced-401 path — always calls `removeUser()`, so
 * subscribing here covers every logout without that module having to know
 * about this store. A re-hydrate of the SAME user (same `user_id`) keeps
 * the selections. Module-level and registered once (ES module singleton).
 */
useUserStore.subscribe((state, prev) => {
  if (!prev.user) return;
  if (!state.user || state.user.user_id !== prev.user.user_id) {
    useReportPeriodStore.getState().reset();
  }
});
