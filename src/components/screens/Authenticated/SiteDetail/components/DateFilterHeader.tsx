import React, { FC, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { CalendarIcon, RefreshIcon } from 'src/assets/icons';

interface DateFilterHeaderProps {
  /** Section title shown on the leading edge of the header. */
  title: string;
  /**
   * Pre-formatted label shown inside the date pill. Caller computes
   * this via `formatDateFilterLabel(...)` so the pill stays in sync
   * with the active filter (date range / month-year / year / lifetime).
   */
  dateLabel: string;
  /** Tap handler for the pill. Caller decides which picker to open. */
  onDatePress: () => void;
  /**
   * When true (Lifetime filter), the pill is rendered as non-interactive
   * — there's nothing to pick.
   */
  pillDisabled?: boolean;
  /**
   * Tap handler for the green-bordered refresh button. When omitted, the
   * button is hidden — useful for cards that don't need a manual refetch
   * trigger.
   */
  onRefresh?: () => void;
}

/**
 * Shared header used by every card on the Trends tab (Chart Analysis,
 * Trend Analysis, Performance Report, Inverter Table). Centralising the
 * layout here:
 *  - Guarantees pixel-perfect visual parity across cards.
 *  - Keeps the date-range pill and refresh button in lock-step
 *    (paddings, gap, border radius, sizes, theme tokens) so a future
 *    design tweak only touches this file.
 *  - Refresh button is opt-in via `onRefresh` so cards that don't need
 *    it (e.g. read-only summaries) don't render an empty placeholder.
 */
const DateFilterHeader: FC<DateFilterHeaderProps> = ({
  title,
  dateLabel,
  onDatePress,
  pillDisabled = false,
  onRefresh,
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <AppText
        fontSize={FONT_SIZE_SM}
        bold
        color={colors.primaryText}
        numberOfLines={2}
        style={styles.title}>
        {title}
      </AppText>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.dateRangeContainer}
          onPress={onDatePress}
          disabled={pillDisabled}
          accessibilityRole="button"
          accessibilityLabel="Pick date filter"
          accessibilityState={{ disabled: pillDisabled }}>
          <CalendarIcon size={ICON_SIZE_XS} color={colors.dateFilterText} />
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.dateFilterText}
            numberOfLines={1}>
            {dateLabel}
          </AppText>
        </TouchableOpacity>

        {onRefresh ? (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Refresh">
            <RefreshIcon size={ICON_SIZE_MD} color={ACCENT_GREEN} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      backgroundColor: colors.inputDarkBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
      gap: normalizeWidth(10),
    },
    title: {
      // Take whatever's left after the actions row claims its width,
      // and shrink (wrapping to 2 lines if necessary) so the date pill
      // and refresh button never get clipped on long titles.
      flexShrink: 1,
      flexGrow: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(10),
      // Don't allow the actions row to shrink — date pill + refresh
      // button stay full size; the title gives way instead.
      flexShrink: 0,
    },
    dateRangeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.dateFilterBg,
      borderWidth: 1,
      borderColor: colors.dateFilterBg,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(14),
      paddingVertical: normalizeHeight(8),
      gap: normalizeWidth(8),
    },
    refreshButton: {
      width: normalizeWidth(38),
      height: normalizeWidth(38),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: ACCENT_GREEN,
      borderRadius: 100,
    },
  });

export default DateFilterHeader;
