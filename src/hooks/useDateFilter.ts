import { useCallback, useMemo, useState } from 'react';
import {
  buildReportFilter,
  daysAgo,
  DEFAULT_CUSTOM_RANGE_DAYS,
  formatDateFilterLabel,
  MonthSelection,
} from 'src/utils';
import { ReportFilter } from 'src/networking';
import { InverterFilterOption } from 'src/data/mock';

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
 * Each call site gets its OWN independent state (per CLAUDE.md §8 the
 * cards deliberately keep separate filter selections) — only the code
 * is shared, not the state.
 *
 * The three `*PickerProps` bundles spread straight onto the picker
 * modals so the card JSX stays a one-liner per modal:
 *
 *     <DateRangePickerModal {...dateRangePickerProps} />
 *     <MonthYearPickerModal {...monthPickerProps} />
 *     <MonthYearPickerModal {...yearPickerProps} />
 */
export const useDateFilter = () => {
  const [startDate, setStartDate] = useState(() => daysAgo(DEFAULT_CUSTOM_RANGE_DAYS));
  const [endDate, setEndDate] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState<MonthSelection>(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [activeFilter, setActiveFilter] = useState<InverterFilterOption>('Custom');

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

  const handleDateApply = useCallback((start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  }, []);
  const handleMonthApply = useCallback((sel: { year: number; month: number }) => {
    setSelectedMonth({ year: sel.year, month: sel.month });
  }, []);
  const handleYearApply = useCallback((sel: { year: number }) => {
    setSelectedYear(sel.year);
  }, []);

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
