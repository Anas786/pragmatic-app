/**
 * Scoped report periods: `useDateFilter({ siteId, card })` remembers the
 * selection per `${siteId}:${card}` (non-persisted) so Reports and Tables
 * keep separate periods across tab switches; without a scope it is the
 * original component-local state. `onFilterPress` re-tap opens the picker.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import React from 'react';
import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { useDateFilter } from '../src/hooks/useDateFilter';
import {
  reportPeriodKey,
  ReportPeriodScope,
  useReportPeriodStore,
} from '../src/hooks/useReportPeriodStore';
import { useUserStore } from '../src/hooks/useUserStore';
import type { IUser } from '../src/types';

type FilterApi = ReturnType<typeof useDateFilter>;

/** Mount `useDateFilter(scope)`; `api()` returns the latest hook result. */
const mountFilter = (scope?: ReportPeriodScope) => {
  let latest: FilterApi | undefined;
  const Probe = () => {
    latest = useDateFilter(scope);
    return null;
  };
  let tree: ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(React.createElement(Probe));
  });
  return {
    api: () => latest as FilterApi,
    unmount: () => act(() => tree?.unmount()),
  };
};

beforeEach(() => {
  useReportPeriodStore.getState().reset();
});

afterEach(() => {
  useReportPeriodStore.getState().reset();
  useUserStore.setState({ user: null });
});

const user = (user_id: string): IUser => ({
  user_id,
  name: `User ${user_id}`,
  email: `${user_id}@example.com`,
  login_date: new Date(2026, 9, 1),
});

const ENTRY = {
  activeFilter: 'Year' as const,
  startDate: new Date(2026, 0, 1),
  endDate: new Date(2026, 0, 31),
  selectedMonth: { month: 1, year: 2026 },
  selectedYear: 2025,
};

describe('useReportPeriodStore', () => {
  it('keys entries per site and card', () => {
    expect(reportPeriodKey({ siteId: 'a', card: 'reports' })).toBe('a:reports');
    const entry = {
      activeFilter: 'Year' as const,
      startDate: new Date(2026, 0, 1),
      endDate: new Date(2026, 0, 31),
      selectedMonth: { month: 1, year: 2026 },
      selectedYear: 2025,
    };
    useReportPeriodStore.getState().setEntry('a:reports', entry);
    expect(useReportPeriodStore.getState().entries).toEqual({ 'a:reports': entry });
    useReportPeriodStore.getState().reset();
    expect(useReportPeriodStore.getState().entries).toEqual({});
  });
});

describe('sign-out / account switch', () => {
  it('sign-out (executeLogout → removeUser) forgets every selection', () => {
    act(() => useUserStore.getState().setUser(user('u1')));
    useReportPeriodStore.getState().setEntry('site-1:reports', ENTRY);
    act(() => useUserStore.getState().removeUser());
    expect(useReportPeriodStore.getState().entries).toEqual({});
  });

  it('a different account forgets them; a re-hydrate of the same user keeps them', () => {
    act(() => useUserStore.getState().setUser(user('u1')));
    useReportPeriodStore.getState().setEntry('site-1:reports', ENTRY);

    act(() => useUserStore.getState().setUser(user('u1')));
    expect(useReportPeriodStore.getState().entries).toEqual({ 'site-1:reports': ENTRY });

    act(() => useUserStore.getState().setUser(user('u2')));
    expect(useReportPeriodStore.getState().entries).toEqual({});
  });

  it('the first sign-in (no previous user) does not touch the store', () => {
    useReportPeriodStore.getState().setEntry('site-1:reports', ENTRY);
    act(() => useUserStore.getState().setUser(user('u1')));
    expect(useReportPeriodStore.getState().entries).toEqual({ 'site-1:reports': ENTRY });
  });
});

describe('useDateFilter with a scope', () => {
  it('survives an unmount/remount (tab switch) for the same site + card', () => {
    const scope = { siteId: 'site-1', card: 'reports' as const };
    const first = mountFilter(scope);
    act(() => first.api().setActiveFilter('Year'));
    act(() => first.api().yearPickerProps.onApply({ year: 2024 }));
    first.unmount();

    const again = mountFilter(scope);
    expect(again.api().activeFilter).toBe('Year');
    expect(again.api().selectedYear).toBe(2024);
    expect(again.api().reportFilter).toEqual(first.api().reportFilter);
    again.unmount();
  });

  it('isolates cards and sites — a second site starts from defaults', () => {
    const reports = mountFilter({ siteId: 'site-1', card: 'reports' });
    const tables = mountFilter({ siteId: 'site-1', card: 'tables' });
    const otherSite = mountFilter({ siteId: 'site-2', card: 'reports' });

    act(() => reports.api().setActiveFilter('Month'));
    expect(reports.api().activeFilter).toBe('Month');
    expect(tables.api().activeFilter).toBe('Custom');
    expect(otherSite.api().activeFilter).toBe('Custom');
    expect(Object.keys(useReportPeriodStore.getState().entries)).toEqual(['site-1:reports']);

    reports.unmount();
    tables.unmount();
    otherSite.unmount();
  });

  it('accepts updater functions like the old useState setter', () => {
    const f = mountFilter({ siteId: 's', card: 'tables' });
    act(() => f.api().setActiveFilter(prev => (prev === 'Custom' ? 'Life Time' : 'Custom')));
    expect(f.api().activeFilter).toBe('Life Time');
    expect(f.api().pillDisabled).toBe(true);
    f.unmount();
  });

  it('keeps stable default dates across renders (no query-key churn)', () => {
    const f = mountFilter({ siteId: 'stable', card: 'reports' });
    const firstFilter = f.api().reportFilter;
    const firstStart = f.api().startDate;
    act(() => f.api().monthPickerProps.onClose());
    expect(f.api().startDate).toBe(firstStart);
    expect(f.api().reportFilter).toBe(firstFilter);
    f.unmount();
  });
});

describe('useDateFilter without a scope', () => {
  it("keeps today's component-local behaviour (no store writes, resets on remount)", () => {
    const a = mountFilter();
    const b = mountFilter();
    act(() => a.api().setActiveFilter('Year'));
    expect(a.api().activeFilter).toBe('Year');
    expect(b.api().activeFilter).toBe('Custom');
    expect(useReportPeriodStore.getState().entries).toEqual({});
    a.unmount();
    const c = mountFilter();
    expect(c.api().activeFilter).toBe('Custom');
    b.unmount();
    c.unmount();
  });
});

describe('onFilterPress', () => {
  it('re-tapping the active pill opens its picker; another pill selects', () => {
    const f = mountFilter({ siteId: 's', card: 'reports' });
    act(() => f.api().onFilterPress('Month'));
    expect(f.api().activeFilter).toBe('Month');
    expect(f.api().monthPickerProps.visible).toBe(false);

    act(() => f.api().onFilterPress('Month'));
    expect(f.api().monthPickerProps.visible).toBe(true);
    act(() => f.api().monthPickerProps.onClose());

    act(() => f.api().onFilterPress('Custom'));
    act(() => f.api().onFilterPress('Custom'));
    expect(f.api().dateRangePickerProps.visible).toBe(true);
    f.unmount();
  });

  it("'Life Time' opens nothing", () => {
    const f = mountFilter();
    act(() => f.api().onFilterPress('Life Time'));
    act(() => f.api().onFilterPress('Life Time'));
    expect(f.api().activeFilter).toBe('Life Time');
    expect(f.api().dateRangePickerProps.visible).toBe(false);
    expect(f.api().monthPickerProps.visible).toBe(false);
    expect(f.api().yearPickerProps.visible).toBe(false);
    f.unmount();
  });
});
