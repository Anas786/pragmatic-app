import { SetStateAction, useCallback, useMemo, useState } from 'react';
import {
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  formatDateFilterLabel,
  MonthSelection,
} from 'src/utils';
import { ReportFilter } from 'src/networking';
import { InverterFilterOption } from 'src/data/mock';
import {
  ReportPeriodEntry,
  ReportPeriodScope,
  reportPeriodKey,
  useReportPeriodStore,
} from './useReportPeriodStore';

/**
 * Shared date-filter state machine for the "report-style" cards on
 * SiteDetail (Performance Report, Inverter Table, …).
 *
 * Owns the full filter surface each card used to copy-paste:
 *   - the Custom range (`startDate`/`endDate`, seeded to the default
 *     span so "open the tab, see the last N days" works untouched),
 *   - the Month / Year selections,
 *   - the three picker-modal visibility flags,
 *   - the active pill (`Custom` / `Month` / `Year` / `Life Time`),
 *   - the derived `ReportFilter` payload + header pill label.
 *
 * Each card keeps its OWN selection (per CLAUDE.md §8 Reports and Tables
 * deliberately keep separate periods):
 *   - without a `scope`, the state is local to the calling component
 *     (resets when the tab unmounts) — the original behaviour;
 *   - with `{ siteId, card }`, the selection lives in the non-persisted
 *     `useReportPeriodStore` under `${siteId}:${card}`, so it survives tab
 *     switches, stays isolated per site and per card, and a site that was
 *     never touched starts from the defaults.
 * Picker-visibility flags are always local.
 *
 * The three `*PickerProps` bundles spread straight onto the picker
 * modals so the card JSX stays a one-liner per modal:
 *
 *     <DateRangePickerModal {...dateRangePickerProps} />
 *     <MonthYearPickerModal {...monthPickerProps} />
 *     <MonthYearPickerModal {...yearPickerProps} />
 */
export const useDateFilter = (scope?: ReportPeriodScope) => {
  // Local state doubles as the stable DEFAULTS for scoped mode: a scoped
  // key with no stored entry reads these, so the Date identities (and the
  // memoised reportFilter) don't churn render to render.
  const [localStart, setLocalStart] = useState(() => daysAgo(DEFAULT_CUSTOM_RANGE_DAYS));
  const [localEnd, setLocalEnd] = useState(() => new Date());
  const [localMonth, setLocalMonth] = useState<MonthSelection>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [localYear, setLocalYear] = useState<number>(() => new Date().getFullYear());
  const [localFilter, setLocalFilter] = useState<InverterFilterOption>('Custom');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const key = scope ? reportPeriodKey(scope) : null;
  const stored = useReportPeriodStore(s => (key ? s.entries[key] : undefined));
  const setEntry = useReportPeriodStore(s => s.setEntry);

  const startDate = stored?.startDate ?? localStart;
  const endDate = stored?.endDate ?? localEnd;
  const selectedMonth = stored?.selectedMonth ?? localMonth;
  const selectedYear = stored?.selectedYear ?? localYear;
  const activeFilter = stored?.activeFilter ?? localFilter;

  /** Write a partial selection: to the store when scoped (seeding the
   *  untouched fields from the current effective values), else locally. */
  const commit = useCallback(
    (patch: Partial<ReportPeriodEntry>) => {
      if (key) {
        const current = useReportPeriodStore.getState().entries[key];
        setEntry(key, {
          activeFilter: current?.activeFilter ?? localFilter,
          startDate: current?.startDate ?? localStart,
          endDate: current?.endDate ?? localEnd,
          selectedMonth: current?.selectedMonth ?? localMonth,
          selectedYear: current?.selectedYear ?? localYear,
          ...patch,
        });
        return;
      }
      if (patch.activeFilter !== undefined) setLocalFilter(patch.activeFilter);
      if (patch.startDate !== undefined) setLocalStart(patch.startDate);
      if (patch.endDate !== undefined) setLocalEnd(patch.endDate);
      if (patch.selectedMonth !== undefined) setLocalMonth(patch.selectedMonth);
      if (patch.selectedYear !== undefined) setLocalYear(patch.selectedYear);
    },
    [key, setEntry, localFilter, localStart, localEnd, localMonth, localYear],
  );

  /** Same call shape as the old `useState` setter (value or updater). */
  const setActiveFilter = useCallback(
    (next: SetStateAction<InverterFilterOption>) => {
      const value = typeof next === 'function' ? next(activeFilter) : next;
      commit({ activeFilter: value });
    },
    [commit, activeFilter],
  );

  const reportFilter = useMemo<ReportFilter>(
    () => buildReportFilter(activeFilter, startDate, endDate, selectedMonth, selectedYear),
    [activeFilter, startDate, endDate, selectedMonth, selectedYear],
  );

  const dateLabel = formatDateFilterLabel(
    activeFilter,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
  );

  /** Lifetime has no pickable range — the header pill goes inert. */
  const pillDisabled = activeFilter === 'Life Time';

  const handleDateApply = useCallback(
    (start: Date, end: Date) => commit({ startDate: start, endDate: end }),
    [commit],
  );
  const handleMonthApply = useCallback(
    (sel: { year: number; month: number }) =>
      commit({ selectedMonth: { year: sel.year, month: sel.month } }),
    [commit],
  );
  const handleYearApply = useCallback(
    (sel: { year: number }) => commit({ selectedYear: sel.year }),
    [commit],
  );

  /** Date-pill tap → open whichever picker matches the active pill. */
  const handlePillPress = useCallback(() => {
    switch (activeFilter) {
      case 'Custom':
        setShowDatePicker(true);
        break;
      case 'Month':
        setShowMonthPicker(true);
        break;
      case 'Year':
        setShowYearPicker(true);
        break;
      case 'Life Time':
      default:
        break;
    }
  }, [activeFilter]);

  /**
   * Filter-pill tap: tapping the ALREADY-active pill opens its picker
   * (Custom → range, Month → month, Year → year, Life Time → nothing);
   * tapping another pill just selects it.
   */
  const onFilterPress = useCallback(
    (option: InverterFilterOption) => {
      if (option === activeFilter) {
        handlePillPress();
        return;
      }
      commit({ activeFilter: option });
    },
    [activeFilter, handlePillPress, commit],
  );

  const closeDatePicker = useCallback(() => setShowDatePicker(false), []);
  const closeMonthPicker = useCallback(() => setShowMonthPicker(false), []);
  const closeYearPicker = useCallback(() => setShowYearPicker(false), []);

  const dateRangePickerProps = useMemo(
    () => ({
      visible: showDatePicker,
      onClose: closeDatePicker,
      startDate,
      endDate,
      onApply: handleDateApply,
    }),
    [showDatePicker, closeDatePicker, startDate, endDate, handleDateApply],
  );

  const monthPickerProps = useMemo(
    () => ({
      visible: showMonthPicker,
      onClose: closeMonthPicker,
      mode: 'month' as const,
      initialYear: selectedMonth.year,
      initialMonth: selectedMonth.month,
      onApply: handleMonthApply,
    }),
    [showMonthPicker, closeMonthPicker, selectedMonth, handleMonthApply],
  );

  const yearPickerProps = useMemo(
    () => ({
      visible: showYearPicker,
      onClose: closeYearPicker,
      mode: 'year' as const,
      initialYear: selectedYear,
      onApply: handleYearApply,
    }),
    [showYearPicker, closeYearPicker, selectedYear, handleYearApply],
  );

  return {
    /** Active pill label — feed the filter-pill row. */
    activeFilter,
    setActiveFilter,
    /** Discriminated payload for the report endpoints (memoized). */
    reportFilter,
    /** Pre-formatted label for the DateFilterHeader pill. */
    dateLabel,
    pillDisabled,
    /** DateFilterHeader `onDatePress` handler. */
    handlePillPress,
    /** Filter-pill handler: re-tap opens the picker, else selects. */
    onFilterPress,
    /** Spread bundles for the three picker modals. */
    dateRangePickerProps,
    monthPickerProps,
    yearPickerProps,
    /** Raw selections, for callers that need them directly. */
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
  };
};
