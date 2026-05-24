/**
 * MonthYearPickerModal — v2 (modern grids).
 *
 * Two modes share the same bottom-sheet shell:
 *
 *   - `month` — a 4×3 grid of months with a year nav header above.
 *     Tap a month to select; ±1 chevrons step the year.
 *
 *   - `year`  — a 3×4 grid of years drawn from the current decade.
 *     Header shows the decade range (e.g. "2020 – 2029"); ±1
 *     chevrons step the decade.
 *
 * Selected cell uses brand fill + glow shadow; today's month / year
 * gets a brand-coloured ring for context.
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
import { FONT_SIZE_SM, FONT_SIZE_XS } from 'src/utils';
import { DownArrow, UpArrow } from 'src/assets/icons';
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

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/* ─────────────── nav header ─────────────── */

const NavHeader: FC<{
  label: string;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}> = ({ label, onPrev, onNext, prevLabel, nextLabel }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  return (
    <View style={themed.nav}>
      <PressableScale
        onPress={onPrev}
        haptic="tap"
        scaleTo={0.92}
        style={themed.navArrow}
        accessibilityLabel={prevLabel}>
        <DownArrow size={14} color={scheme.textPrimary} />
      </PressableScale>
      <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
        {label}
      </AppText>
      <PressableScale
        onPress={onNext}
        haptic="tap"
        scaleTo={0.92}
        style={themed.navArrow}
        accessibilityLabel={nextLabel}>
        <UpArrow size={14} color={scheme.textPrimary} />
      </PressableScale>
    </View>
  );
};
NavHeader.displayName = 'NavHeader';

/* ─────────────── selectable cell ─────────────── */

const GridCell: FC<{
  label: string;
  selected: boolean;
  highlighted?: boolean;
  onPress: () => void;
  widthPct: `${number}%`;
}> = ({ label, selected, highlighted, onPress, widthPct }) => {
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
  ];
  const textColor = selected
    ? scheme.textOnBrand
    : highlighted
      ? scheme.brand
      : scheme.textPrimary;
  return (
    <View style={[themed.slot, { width: widthPct }]}>
      <PressableScale
        onPress={onPress}
        haptic="select"
        scaleTo={0.94}
        style={cellStyle}
        accessibilityLabel={label}>
        <AppText
          fontSize={FONT_SIZE_SM}
          semi_bold={selected || highlighted}
          color={textColor}>
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
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  const [tempYear, setTempYear] = useState(initialYear);
  const [tempMonth, setTempMonth] = useState(initialMonth ?? 1);
  // For year mode, the decade cursor controls which 12-year window
  // is shown. We compute its start as `floor(year/10)*10`.
  // Year-page cursor: align to a 12-year page that contains the
  // initial year. Using a 12-year window keeps the grid balanced
  // (4×3) and matches the page header.
  const pageOf = (y: number) => Math.floor(y / 12) * 12;
  const [decadeStart, setDecadeStart] = useState(() => pageOf(initialYear));

  // Reset working state on every open.
  const wasVisibleRef = React.useRef(visible);
  if (visible && !wasVisibleRef.current) {
    setTempYear(initialYear);
    setTempMonth(initialMonth ?? 1);
    setDecadeStart(pageOf(initialYear));
  }
  wasVisibleRef.current = visible;

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const handleApply = () => {
    onApply({ year: tempYear, month: tempMonth });
    onClose();
  };

  const subtitle = mode === 'month' ? `${MONTH_LABELS[tempMonth - 1]} ${tempYear}` : `${tempYear}`;

  return (
    <PickerSheet
      visible={visible}
      title={mode === 'month' ? 'Pick Month' : 'Pick Year'}
      subtitle={subtitle}
      onCancel={onClose}
      onApply={handleApply}>
      {mode === 'month' ? (
        <View style={themed.card}>
          <NavHeader
            label={String(tempYear)}
            onPrev={() => setTempYear(y => y - 1)}
            onNext={() => setTempYear(y => y + 1)}
            prevLabel="Previous year"
            nextLabel="Next year"
          />
          <Grid>
            {MONTH_LABELS.map((label, idx) => {
              const monthNum = idx + 1;
              return (
                <GridCell
                  key={label}
                  label={label}
                  selected={tempMonth === monthNum}
                  highlighted={
                    tempYear === todayYear && todayMonth === monthNum
                  }
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
            label={`${decadeStart} – ${decadeStart + 11}`}
            onPrev={() => setDecadeStart(d => d - 12)}
            onNext={() => setDecadeStart(d => d + 12)}
            prevLabel="Previous years"
            nextLabel="Next years"
          />
          <Grid>
            {Array.from({ length: 12 }).map((_, i) => {
              // 4×3 grid showing 12 years per page so the layout reads
              // as a balanced block (5×2 looks awkward, 4×3 with 10
              // years leaves two empty slots). The header label uses
              // the actual 12-year span shown.
              const year = decadeStart + i;
              return (
                <GridCell
                  key={year}
                  label={String(year)}
                  selected={tempYear === year}
                  highlighted={todayYear === year}
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
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surface,
      transform: [{ rotate: '90deg' }],
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
      paddingVertical: 14,
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
      shadowColor: scheme.brand,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    cellHighlighted: {
      borderColor: scheme.brand,
    },
  });

export default MonthYearPickerModal;
