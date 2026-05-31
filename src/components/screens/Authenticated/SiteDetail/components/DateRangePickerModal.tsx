/**
 * DateRangePickerModal — v2 (modern calendar grid + presets).
 *
 * Replaces the native @react-native-community/datetimepicker spinner
 * with a custom calendar grid. Date-range UX patterns:
 *
 *   1. Tap a day → sets start, clears end (range in progress)
 *   2. Tap another day after start → sets end (range complete)
 *   3. Tap a day before start → restart with new start
 *
 * The range cap (MAX_RANGE_MONTHS = 1) is enforced by greying out
 * days past `start + cap`. Tapping a greyed day is a no-op.
 *
 * Preset chips above the calendar (Last 7d / 30d / This week / This
 * month) let the user pick common ranges in one tap.
 */

import React, { FC, ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PressableScale } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  addDays,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
} from 'src/utils';
import { formatDate } from 'src/utils/format';
import { DownArrow, UpArrow } from 'src/assets/icons';
import PickerSheet from './pickers/PickerSheet';

interface DateRangePickerModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onApply: (start: Date, end: Date) => void;
  /**
   * Extra days allowed AFTER the start day → inclusive span is
   * `maxRangeDays + 1`. Defaults to the report cap (14 → 15-day span).
   * Trends pass a tighter cap (2 → 3-day span).
   */
  maxRangeDays?: number;
}

/**
 * Maximum span the Custom range can cover. The backend reports get
 * heavy past this window, so the calendar greys out anything past
 * `start + MAX_RANGE_DAYS` and the tap handler clamps any later
 * second-tap to the cap defensively.
 *
 * Counted as 14 *additional* days after the start day → a 15-day
 * inclusive range (e.g. tap Dec 1 → max end is Dec 15).
 */
const MAX_RANGE_DAYS = 14;
const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/* ─────────────── date helpers ─────────────── */

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isBetween = (d: Date, start: Date, end: Date): boolean => {
  const t = startOfDay(d).getTime();
  return t > startOfDay(start).getTime() && t < startOfDay(end).getTime();
};

/* ─────────────── presets ─────────────── */

interface Preset {
  label: string;
  build: () => { start: Date; end: Date };
}

// Presets capped to fit within the 15-day max range. "Last month"
// or "Last 30d" would overflow the cap and force a clamp on apply,
// which is confusing — better to only surface ranges the user can
// actually pick by hand.
const PRESETS: Preset[] = [
  {
    label: 'Today',
    build: () => {
      const today = new Date();
      return { start: today, end: today };
    },
  },
  {
    label: 'Last 7d',
    build: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      return { start, end };
    },
  },
  {
    label: 'This week',
    build: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - end.getDay());
      return { start, end };
    },
  },
  {
    label: 'Last 15d',
    build: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 14);
      return { start, end };
    },
  },
];

/* ─────────────── month / year nav header ─────────────── */

/**
 * The label between the chevrons is tappable — tap it to flip the
 * calendar body into "pick a month" mode, where the year is set with
 * its own stepper and you can jump directly to any month. Tap a
 * month to return to the day grid at that month/year.
 */
const MonthNav: FC<{
  cursor: Date;
  pickerOpen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onTogglePicker: () => void;
}> = ({ cursor, pickerOpen, onPrev, onNext, onTogglePicker }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const label = `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  return (
    <View style={themed.monthNav}>
      <PressableScale
        onPress={onPrev}
        haptic="tap"
        scaleTo={0.92}
        style={themed.navArrow}
        accessibilityLabel="Previous month">
        <DownArrow size={14} color={scheme.textPrimary} />
      </PressableScale>
      <PressableScale
        onPress={onTogglePicker}
        haptic="tap"
        scaleTo={0.95}
        style={themed.labelButton}
        accessibilityLabel="Change month or year">
        <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
          {label}
        </AppText>
        <View style={pickerOpen ? themed.chevronOpen : themed.chevronClosed}>
          <DownArrow size={10} color={scheme.textSecondary} />
        </View>
      </PressableScale>
      <PressableScale
        onPress={onNext}
        haptic="tap"
        scaleTo={0.92}
        style={themed.navArrow}
        accessibilityLabel="Next month">
        <UpArrow size={14} color={scheme.textPrimary} />
      </PressableScale>
    </View>
  );
};
MonthNav.displayName = 'MonthNav';

/* ─────────────── inline month picker ─────────────── */

const MonthPicker: FC<{
  cursor: Date;
  onSelect: (year: number, month: number) => void;
  onYearStep: (delta: number) => void;
}> = ({ cursor, onSelect, onYearStep }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();
  return (
    <View style={themed.pickerBody}>
      <View style={themed.yearStepper}>
        <PressableScale
          onPress={() => onYearStep(-1)}
          haptic="tap"
          scaleTo={0.92}
          style={themed.navArrow}
          accessibilityLabel="Previous year">
          <DownArrow size={14} color={scheme.textPrimary} />
        </PressableScale>
        <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
          {year}
        </AppText>
        <PressableScale
          onPress={() => onYearStep(1)}
          haptic="tap"
          scaleTo={0.92}
          style={themed.navArrow}
          accessibilityLabel="Next year">
          <UpArrow size={14} color={scheme.textPrimary} />
        </PressableScale>
      </View>
      <View style={themed.monthGrid}>
        {MONTH_LABELS.map((name, idx) => {
          const selected = idx === month;
          const isCurrent =
            year === today.getFullYear() && idx === today.getMonth();
          return (
            <View key={name} style={themed.monthSlot}>
              <PressableScale
                onPress={() => onSelect(year, idx)}
                haptic="select"
                scaleTo={0.94}
                style={[
                  themed.monthCell,
                  selected ? themed.monthCellSelected : null,
                  !selected && isCurrent ? themed.monthCellToday : null,
                ]}
                accessibilityLabel={`${name} ${year}`}>
                <AppText
                  fontSize={FONT_SIZE_XS}
                  semi_bold={selected || isCurrent}
                  color={
                    selected
                      ? scheme.textOnBrand
                      : isCurrent
                        ? scheme.brand
                        : scheme.textPrimary
                  }>
                  {name.slice(0, 3)}
                </AppText>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
};
MonthPicker.displayName = 'MonthPicker';

/* ─────────────── day cell ─────────────── */

const DayCell: FC<{
  date: Date;
  inMonth: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  isToday: boolean;
  disabled: boolean;
  onPress: (d: Date) => void;
}> = ({ date, inMonth, isStart, isEnd, inRange, isToday, disabled, onPress }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  const endpoint = isStart || isEnd;
  // Range backdrop: a softly-tinted square that fills the row between
  // start and end so the eye reads the range as a single bar.
  const backdrop =
    endpoint || inRange ? (
      <View
        style={[
          themed.rangeBackdrop,
          isStart ? themed.rangeBackdropLeft : null,
          isEnd ? themed.rangeBackdropRight : null,
        ]}
      />
    ) : null;

  const cellInnerStyle = [
    themed.dayInner,
    endpoint ? themed.dayInnerSelected : null,
    isToday && !endpoint ? themed.dayInnerToday : null,
  ];

  const textColor = (() => {
    if (disabled) return scheme.textTertiary;
    if (endpoint) return scheme.textOnBrand;
    if (!inMonth) return scheme.textTertiary;
    if (isToday) return scheme.brand;
    return scheme.textPrimary;
  })();

  return (
    <PressableScale
      onPress={() => onPress(date)}
      haptic="select"
      scaleTo={0.9}
      disabled={disabled}
      style={[themed.dayCell, disabled ? themed.dayDisabled : null]}
      accessibilityLabel={formatDate(date, 'DD MMM YYYY')}>
      {backdrop}
      <View style={cellInnerStyle}>
        <AppText
          fontSize={FONT_SIZE_XS}
          semi_bold={endpoint || isToday}
          color={textColor}>
          {date.getDate()}
        </AppText>
      </View>
    </PressableScale>
  );
};
DayCell.displayName = 'DayCell';

/* ─────────────── calendar grid ─────────────── */

interface CalendarGridProps {
  cursor: Date;
  start: Date | null;
  end: Date | null;
  today: Date;
  maxAllowed: Date | null;
  onSelect: (d: Date) => void;
}

const CalendarGrid: FC<CalendarGridProps> = ({
  cursor,
  start,
  end,
  today,
  maxAllowed,
  onSelect,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Build a 6×7 cell grid for the cursor's month. First cell is the
  // Sunday of the week containing the 1st (which may belong to the
  // previous month — we render those greyed-out for context).
  const cells = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstDow = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - firstDow);
    const list: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      list.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
    }
    return list;
  }, [cursor]);

  return (
    <View>
      <View style={themed.dowRow}>
        {DOW_LABELS.map((d, i) => (
          <View key={i} style={themed.dowCell}>
            <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.textTertiary}>
              {d}
            </AppText>
          </View>
        ))}
      </View>
      <View style={themed.grid}>
        {cells.map(({ date, inMonth }) => {
          const isStart = !!start && sameDay(date, start);
          const isEnd = !!end && sameDay(date, end);
          const inRange = !!start && !!end && isBetween(date, start, end);
          const isToday = sameDay(date, today);
          const dayMs = startOfDay(date).getTime();
          // Never allow future dates (no data exists yet), and never past
          // the per-start range cap once a start is picked.
          const disabled =
            dayMs > startOfDay(today).getTime() ||
            (!!maxAllowed && dayMs > startOfDay(maxAllowed).getTime());
          return (
            <DayCell
              key={date.toISOString()}
              date={date}
              inMonth={inMonth}
              isStart={isStart}
              isEnd={isEnd}
              inRange={inRange}
              isToday={isToday}
              disabled={disabled}
              onPress={onSelect}
            />
          );
        })}
      </View>
    </View>
  );
};
CalendarGrid.displayName = 'CalendarGrid';

/* ─────────────── main ─────────────── */

const DateRangePickerModal: FC<DateRangePickerModalProps> = ({
  visible,
  onClose,
  startDate,
  endDate,
  onApply,
  maxRangeDays = MAX_RANGE_DAYS,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);
  // Cursor controls which calendar month is rendered.
  const [cursor, setCursor] = useState<Date>(() => new Date(startDate));
  // Inline view-mode: 'days' shows the day grid, 'months' shows the
  // month/year picker. Tap the header label to flip between them so
  // the user can jump straight to any month without 12+ chevron taps.
  const [view, setView] = useState<'days' | 'months'>('days');

  // Reset working state every time the sheet opens so a previously-
  // cancelled session doesn't bleed into the next open.
  const wasVisibleRef = React.useRef(visible);
  if (visible && !wasVisibleRef.current) {
    setTempStart(startDate);
    setTempEnd(endDate);
    setCursor(new Date(startDate));
    setView('days');
  }
  wasVisibleRef.current = visible;

  const today = useMemo(() => new Date(), []);
  // The range cap only constrains the *second* tap (picking an end after a
  // start). While a complete range is showing — e.g. the sheet just
  // reopened with the previously-applied range — leave every day up to
  // today enabled so the user can begin a fresh selection anywhere.
  const maxAllowed = useMemo(
    () => (tempStart && !tempEnd ? addDays(tempStart, maxRangeDays) : null),
    [tempStart, tempEnd, maxRangeDays],
  );

  // Only surface presets whose inclusive span fits within the cap —
  // a preset that overflows would silently clamp on apply.
  const availablePresets = useMemo(
    () =>
      PRESETS.filter(p => {
        const { start, end } = p.build();
        const spanDays = Math.round(
          (startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000,
        );
        return spanDays <= maxRangeDays;
      }),
    [maxRangeDays],
  );

  const handleDayPress = (d: Date) => {
    const day = startOfDay(d);
    // First tap or restart-before-start
    if (!tempStart || (tempStart && tempEnd) || day < startOfDay(tempStart)) {
      setTempStart(day);
      setTempEnd(null);
      return;
    }
    // Second tap: complete the range (clamp to MAX cap)
    const cap = addDays(tempStart, maxRangeDays);
    if (day > cap) {
      setTempEnd(startOfDay(cap));
      return;
    }
    setTempEnd(day);
  };

  const handlePreset = (preset: Preset) => {
    const { start, end } = preset.build();
    setTempStart(startOfDay(start));
    setTempEnd(startOfDay(end));
    setCursor(new Date(start));
  };

  const handlePrevMonth = () =>
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const handleYearStep = (delta: number) =>
    setCursor(prev => new Date(prev.getFullYear() + delta, prev.getMonth(), 1));

  const handleMonthPickerSelect = (year: number, monthIdx: number) => {
    setCursor(new Date(year, monthIdx, 1));
    setView('days');
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
    } else if (tempStart) {
      onApply(tempStart, tempStart);
    }
    onClose();
  };

  const subtitle =
    tempStart && tempEnd
      ? `${formatDate(tempStart, 'DD MMM')} – ${formatDate(tempEnd, 'DD MMM YYYY')}`
      : tempStart
        ? `${formatDate(tempStart, 'DD MMM YYYY')} – Pick end date`
        : 'Pick a start date';

  return (
    <PickerSheet
      visible={visible}
      title="Date Range"
      subtitle={subtitle}
      onCancel={onClose}
      onApply={handleApply}
      applyDisabled={!tempStart}>
      <PresetRow>
        {availablePresets.map(p => (
          <PressableScale
            key={p.label}
            onPress={() => handlePreset(p)}
            haptic="select"
            scaleTo={0.95}
            style={themed.presetChip}
            accessibilityLabel={p.label}>
            <AppText
              fontSize={FONT_SIZE_XXS}
              bold
              color={scheme.textPrimary}>
              {p.label}
            </AppText>
          </PressableScale>
        ))}
      </PresetRow>

      <View style={themed.calendarCard}>
        <MonthNav
          cursor={cursor}
          pickerOpen={view === 'months'}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
          onTogglePicker={() =>
            setView(v => (v === 'days' ? 'months' : 'days'))
          }
        />
        {view === 'days' ? (
          <CalendarGrid
            cursor={cursor}
            start={tempStart}
            end={tempEnd}
            today={today}
            maxAllowed={maxAllowed}
            onSelect={handleDayPress}
          />
        ) : (
          <MonthPicker
            cursor={cursor}
            onSelect={handleMonthPickerSelect}
            onYearStep={handleYearStep}
          />
        )}
      </View>

      <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary} center>
        Max range: {maxRangeDays + 1} days
      </AppText>
    </PickerSheet>
  );
};
DateRangePickerModal.displayName = 'DateRangePickerModal';

/* ─────────────── styled helpers ─────────────── */

const PresetRow: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.presetRow}>{children}</View>;
};
PresetRow.displayName = 'PresetRow';

/* ─────────────── styles ─────────────── */

const CELL_SIZE = 40;

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    presetRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.sm,
    },
    presetChip: {
      paddingHorizontal: space.md,
      paddingVertical: 8,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
      borderWidth: 1,
      borderColor: scheme.hairline,
    },
    calendarCard: {
      backgroundColor: scheme.surfaceMuted,
      borderRadius: radiusTokens.xl,
      padding: space.md,
      gap: space.md,
    },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.sm,
    },
    navArrow: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surface,
      transform: [{ rotate: '90deg' }], // DownArrow becomes ← / UpArrow becomes →
    },
    labelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space.md,
      paddingVertical: 6,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surface,
    },
    chevronClosed: {
      // Plain down chevron — indicates "tap to expand"
    },
    chevronOpen: {
      transform: [{ rotate: '180deg' }],
    },
    pickerBody: {
      gap: space.md,
      paddingVertical: space.sm,
    },
    yearStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.sm,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    monthSlot: {
      width: '25%',
      padding: 4,
    },
    monthCell: {
      paddingVertical: 14,
      borderRadius: radiusTokens.md,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthCellSelected: {
      backgroundColor: scheme.brand,
      borderColor: scheme.brand,
      shadowColor: scheme.brand,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    monthCellToday: {
      borderColor: scheme.brand,
    },
    dowRow: {
      flexDirection: 'row',
    },
    dowCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    dayCell: {
      width: `${100 / 7}%`,
      height: CELL_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    dayDisabled: {
      opacity: 0.35,
    },
    rangeBackdrop: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 0,
      right: 0,
      backgroundColor: scheme.brandSoft,
    },
    rangeBackdropLeft: {
      left: '25%',
      borderTopLeftRadius: CELL_SIZE / 2,
      borderBottomLeftRadius: CELL_SIZE / 2,
    },
    rangeBackdropRight: {
      right: '25%',
      borderTopRightRadius: CELL_SIZE / 2,
      borderBottomRightRadius: CELL_SIZE / 2,
    },
    dayInner: {
      width: CELL_SIZE - 8,
      height: CELL_SIZE - 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: (CELL_SIZE - 8) / 2,
    },
    dayInnerSelected: {
      backgroundColor: scheme.brand,
      shadowColor: scheme.brand,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    dayInnerToday: {
      borderWidth: 1.5,
      borderColor: scheme.brand,
    },
  });

export default DateRangePickerModal;
