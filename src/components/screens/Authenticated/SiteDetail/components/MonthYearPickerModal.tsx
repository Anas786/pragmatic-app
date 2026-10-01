/**
 * MonthYearPickerModal — v3 (modern grids).
 *
 * Two modes share the same bottom-sheet shell:
 *
 *   - `month` — a 4×3 grid of months with a year nav header above.
 *     Tap a month to select; ±1 chevrons step the year.
 *
 *   - `year`  — a 3×4 grid of 12 years. The first page ENDS at the
 *     current year (2015 – 2026 in 2026); ‹ › step whole pages.
 *
 * Nothing in the future can be picked (no data exists yet): later months
 * of the current year, later years and the "next" chevrons that would
 * only reach them are disabled (dimmed + accessibilityState.disabled),
 * matching the date-range picker, which never allows future days.
 *
 * Selected cell uses brand fill; today's month / year gets a brand ring.
 */

import React, { FC, ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppText, PressableScale } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { formatMonthYear, MONTHS_LONG, MONTHS_SHORT } from 'src/utils/dates';
import PickerSheet from './pickers/PickerSheet';

export type PickerMode = 'month' | 'year';

interface MonthYearPickerModalProps {
  visible: boolean;
  onClose: () => void;
  mode: PickerMode;
  initialYear: number;
  initialMonth?: number;
  onApply: (selection: { year: number; month: number }) => void;
}

/** Years shown per page of the year grid (4 × 3). */
export const YEAR_PAGE_SIZE = 12;

/* ─────────────── pure helpers (exported for tests) ─────────────── */

/**
 * Last year of the page that shows `year`, with pages anchored so the
 * FIRST page ends at `currentYear` (2015–2026, 2003–2014, …). A year
 * after `currentYear` is clamped onto the first page.
 */
export const yearPageEnd = (year: number, currentYear: number): number => {
  if (year >= currentYear - (YEAR_PAGE_SIZE - 1)) return currentYear;
  const pagesBack = Math.ceil((currentYear - (YEAR_PAGE_SIZE - 1) - year) / YEAR_PAGE_SIZE);
  return currentYear - pagesBack * YEAR_PAGE_SIZE;
};

/** True when (year, 1-based month) is after the current calendar month. */
export const isFutureMonth = (year: number, month: number, now: Date = new Date()): boolean =>
  year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);

/**
 * Keep a draft month valid after the year changes: a month that would be
 * in the future (e.g. stepping from Dec 2025 to 2026 in October) snaps to
 * the current month.
 */
export const clampMonthToNow = (year: number, month: number, now: Date = new Date()): number =>
  isFutureMonth(year, month, now) && year === now.getFullYear() ? now.getMonth() + 1 : month;

/* ─────────────── nav header ─────────────── */

const NAV_SIZE = 32;
const NAV_SLOP = Math.max(0, Math.ceil((touch.min - NAV_SIZE) / 2));
const NAV_HIT_SLOP = { top: NAV_SLOP, bottom: NAV_SLOP, left: NAV_SLOP, right: NAV_SLOP };

const NavHeader: FC<{
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  nextDisabled?: boolean;
  prevDisabled?: boolean;
}> = ({ label, onPrev, onNext, prevLabel, nextLabel, nextDisabled = false, prevDisabled = false }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <View style={themed.nav}>
      <PressableScale
        onPress={onPrev}
        scaleTo={0.92}
        disabled={prevDisabled}
        hitSlop={NAV_HIT_SLOP}
        style={[themed.navArrow, prevDisabled ? themed.disabled : null]}
        accessibilityLabel={prevLabel}>
        <Icon name="chevron-left" size={20} color={scheme.textPrimary} />
      </PressableScale>
      <AppText variant="bodySm" semi_bold accessibilityRole="header">
        {label}
      </AppText>
      <PressableScale
        onPress={onNext}
        scaleTo={0.92}
        disabled={nextDisabled}
        hitSlop={NAV_HIT_SLOP}
        style={[themed.navArrow, nextDisabled ? themed.disabled : null]}
        accessibilityLabel={nextLabel}>
        <Icon name="chevron-right" size={20} color={scheme.textPrimary} />
      </PressableScale>
    </View>
  );
};
NavHeader.displayName = 'NavHeader';

/* ─────────────── selectable cell ─────────────── */

const GridCell: FC<{
  label: string;
  /** Spoken label when the visible one is abbreviated ('September 2026'). */
  spokenLabel?: string;
  selected: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  onPress: () => void;
  widthPct: `${number}%`;
}> = ({ label, spokenLabel, selected, highlighted, disabled = false, onPress, widthPct }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // The width has to live on a real flex child of the Grid row —
  // PressableScale's `style` lands on a nested View inside a default
  // column-direction parent, where `flexBasis` / `width: %` doesn't
  // resolve the way we want. Wrapping with an explicit-width slot
  // makes the layout deterministic.
  const cellStyle = [
    themed.cellInner,
    selected ? themed.cellSelected : null,
    !selected && highlighted ? themed.cellHighlighted : null,
    disabled ? themed.disabled : null,
  ];
  const textColor = selected
    ? scheme.textOnBrand
    : highlighted
      ? scheme.brandText
      : scheme.textPrimary;
  const slotStyle = useMemo(() => [themed.slot, { width: widthPct }], [themed.slot, widthPct]);
  return (
    <View style={slotStyle}>
      <PressableScale
        onPress={onPress}
        haptic="select"
        scaleTo={0.94}
        disabled={disabled}
        selected={selected}
        style={cellStyle}
        accessibilityLabel={spokenLabel ?? label}>
        <AppText variant="bodySm" semi_bold={selected || highlighted} color={textColor}>
          {label}
        </AppText>
      </PressableScale>
    </View>
  );
};
GridCell.displayName = 'GridCell';

/* ─────────────── main ─────────────── */

const MonthYearPickerModal: FC<MonthYearPickerModalProps> = ({
  visible,
  onClose,
  mode,
  initialYear,
  initialMonth,
  onApply,
}) => {
  const themed = useThemedStyles(createStyles);

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const [tempYear, setTempYear] = useState(initialYear);
  const [tempMonth, setTempMonth] = useState(initialMonth ?? 1);
  // Year-page cursor: the LAST year shown on the current 12-year page.
  const [pageEnd, setPageEnd] = useState(() => yearPageEnd(initialYear, todayYear));

  // Reset working state on every open.
  const wasVisibleRef = React.useRef(visible);
  if (visible && !wasVisibleRef.current) {
    setTempYear(initialYear);
    setTempMonth(initialMonth ?? 1);
    setPageEnd(yearPageEnd(initialYear, todayYear));
  }
  wasVisibleRef.current = visible;

  const stepYear = (delta: number) => {
    const y = Math.min(todayYear, tempYear + delta);
    setTempYear(y);
    setTempMonth(m => clampMonthToNow(y, m, today));
  };

  const handleApply = () => {
    onApply({ year: tempYear, month: tempMonth });
    onClose();
  };

  const subtitle =
    mode === 'month' ? formatMonthYear({ month: tempMonth, year: tempYear }) : `${tempYear}`;
  const pageStart = pageEnd - (YEAR_PAGE_SIZE - 1);

  return (
    <PickerSheet
      visible={visible}
      title={mode === 'month' ? 'Pick a month' : 'Pick a year'}
      subtitle={subtitle}
      onCancel={onClose}
      onApply={handleApply}>
      {mode === 'month' ? (
        <View style={themed.card}>
          <NavHeader
            label={String(tempYear)}
            onPrev={() => stepYear(-1)}
            onNext={() => stepYear(1)}
            nextDisabled={tempYear >= todayYear}
            prevLabel="Previous year"
            nextLabel="Next year"
          />
          <Grid>
            {MONTHS_SHORT.map((label, idx) => {
              const monthNum = idx + 1;
              return (
                <GridCell
                  key={label}
                  label={label}
                  spokenLabel={`${MONTHS_LONG[idx]} ${tempYear}`}
                  selected={tempMonth === monthNum}
                  highlighted={tempYear === todayYear && todayMonth === monthNum}
                  disabled={isFutureMonth(tempYear, monthNum, today)}
                  onPress={() => setTempMonth(monthNum)}
                  widthPct="25%"
                />
              );
            })}
          </Grid>
        </View>
      ) : (
        <View style={themed.card}>
          <NavHeader
            label={`${pageStart} – ${pageEnd}`}
            onPrev={() => setPageEnd(e => e - YEAR_PAGE_SIZE)}
            onNext={() => setPageEnd(e => Math.min(todayYear, e + YEAR_PAGE_SIZE))}
            nextDisabled={pageEnd >= todayYear}
            prevLabel="Earlier years"
            nextLabel="Later years"
          />
          <Grid>
            {Array.from({ length: YEAR_PAGE_SIZE }).map((_, i) => {
              // 4×3 grid of 12 years per page, a balanced block.
              const year = pageStart + i;
              return (
                <GridCell
                  key={year}
                  label={String(year)}
                  selected={tempYear === year}
                  highlighted={todayYear === year}
                  disabled={year > todayYear}
                  onPress={() => setTempYear(year)}
                  widthPct="33.333%"
                />
              );
            })}
          </Grid>
        </View>
      )}
    </PickerSheet>
  );
};
MonthYearPickerModal.displayName = 'MonthYearPickerModal';

/* ─────────────── styled helpers ─────────────── */

const Grid: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.grid}>{children}</View>;
};
Grid.displayName = 'Grid';

/* ─────────────── styles ─────────────── */

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: scheme.surfaceMuted,
      borderRadius: radiusTokens.xl,
      padding: space.md,
      gap: space.md,
    },
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.sm,
    },
    navArrow: {
      width: NAV_SIZE,
      height: NAV_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surface,
    },
    disabled: {
      opacity: 0.35,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      // Negative inset balances the per-slot padding so the grid's
      // outer edges sit flush with the card padding.
      marginHorizontal: -4,
    },
    slot: {
      // Half-gap per side → 8px visual gap between neighbouring cells.
      padding: 4,
    },
    cellInner: {
      minHeight: touch.min,
      paddingVertical: space.sm,
      borderRadius: radiusTokens.md,
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellSelected: {
      backgroundColor: scheme.brand,
      borderColor: scheme.brand,
    },
    cellHighlighted: {
      borderColor: scheme.brand,
    },
  });

export default MonthYearPickerModal;
