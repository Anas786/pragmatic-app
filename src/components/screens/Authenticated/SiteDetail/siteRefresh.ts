import { createContext, useCallback, useContext } from 'react';
import { runUserRefresh } from 'src/networking/freshFetch';

/**
 * SiteDetail's ONE refresh path (header button, pull-to-refresh, Retry),
 * shared with the tabs: a tab's own refresh icon refetches /data/all (the
 * header's "Updated x min ago") together with every mounted tab query —
 * its own included — instead of only its own report. One in-flight guard,
 * one request per query, CDN bypassed (see freshFetch.ts).
 */
export const SiteRefreshContext = createContext<(() => void) | null>(null);

/**
 * The screen-level refresh for a tab's refresh icon / Retry. Outside
 * SiteDetail (tests, a future standalone use) it falls back to a user
 * refresh of the caller's own query.
 */
export const useSiteRefresh = (fallback: () => Promise<unknown>): (() => void) => {
  const shellRefresh = useContext(SiteRefreshContext);
  return useCallback(() => {
    if (shellRefresh) {
      shellRefresh();
      return;
    }
    runUserRefresh(fallback).catch(() => undefined);
  }, [shellRefresh, fallback]);
};
