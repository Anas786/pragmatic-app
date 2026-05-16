import React, { FC, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  FONT_SIZE_LG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  WHITE,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import {
  Close,
  DownArrow,
  UpArrow,
} from 'src/assets/icons';

export type PickerMode = 'month' | 'year';

interface MonthYearPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** What to pick: a (month, year) tuple or just a year. */
  mode: PickerMode;
  /** Initial year (always required — `mode='month'` adds month on top). */
  initialYear: number;
  /** Initial 1-based month — only used in `mode='month'`. */
  initialMonth?: number;
  /**
   * Apply handler. For `mode='year'` only `year` is meaningful. For
   * `mode='month'` both fields are populated; consumers can ignore
   * `month` if they only need a year.
   */
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

/**
 * Lightweight calendar-style modal for picking either:
 *   - a specific month within a year (`mode='month'`), or
 *   - just a year (`mode='year'`).
 *
 * Shape mirrors `DateRangePickerModal` so the two feel like the same
 * component family — header / content / footer with rounded corners
 * and a 60 %-opacity backdrop.
 */
const MonthYearPickerModal: FC<MonthYearPickerModalProps> = ({
  visible,
  onClose,
  mode,
  initialYear,
  initialMonth,
  onApply,
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tempYear, setTempYear] = useState(initialYear);
  const [tempMonth, setTempMonth] = useState(initialMonth ?? 1);

  // Reset working state on every open so a previously-cancelled change
  // doesn't bleed into the next session.
  const handleVisible = (vis: boolean) => {
    if (vis) {
      setTempYear(initialYear);
      setTempMonth(initialMonth ?? 1);
    }
  };

  // Apply the visible→`true` reset on each open.
  const wasVisibleRef = React.useRef(visible);
  if (visible && !wasVisibleRef.current) handleVisible(true);
  wasVisibleRef.current = visible;

  const handleApply = () => {
    onApply({ year: tempYear, month: tempMonth });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const adjustYear = (delta: number) => {
    setTempYear(prev => prev + delta);
  };

  const title = mode === 'month' ? 'Select Month' : 'Select Year';

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleCancel}
      onBackButtonPress={handleCancel}
      backdropOpacity={0.6}
      style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
            {title}
          </AppText>
          <TouchableOpacity onPress={handleCancel} hitSlop={8}>
            <Close size={ICON_SIZE_XS} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Year stepper — always visible. */}
          <View style={styles.yearRow}>
            <TouchableOpacity
              onPress={() => adjustYear(-1)}
              style={styles.yearButton}
              accessibilityRole="button"
              accessibilityLabel="Previous year"
              hitSlop={8}>
              <DownArrow size={ICON_SIZE_XS} color={colors.primaryText} />
            </TouchableOpacity>
            <AppText
              fontSize={FONT_SIZE_LG}
              bold
              color={colors.primaryText}
              center>
              {tempYear}
            </AppText>
            <TouchableOpacity
              onPress={() => adjustYear(1)}
              style={styles.yearButton}
              accessibilityRole="button"
              accessibilityLabel="Next year"
              hitSlop={8}>
              <UpArrow size={ICON_SIZE_XS} color={colors.primaryText} />
            </TouchableOpacity>
          </View>

          {/* Month grid — only when picking a month. */}
          {mode === 'month' ? (
            <View style={styles.monthGrid}>
              {MONTH_LABELS.map((label, idx) => {
                const monthNum = idx + 1;
                const isActive = tempMonth === monthNum;
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => setTempMonth(monthNum)}
                    style={[
                      styles.monthCell,
                      isActive && styles.monthCellActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}>
                    <AppText
                      fontSize={FONT_SIZE_XS}
                      medium
                      color={isActive ? WHITE : colors.primaryText}
                      center>
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <AppText
              fontSize={FONT_SIZE_XS}
              medium
              color={colors.textSecondary}>
              Cancel
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
              Apply
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    modal: {
      justifyContent: 'center',
      margin: normalizeWidth(20),
    },
    container: {
      borderRadius: normalizeWidth(16),
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
    },
    header: {
      backgroundColor: colors.cardBg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
    },
    content: {
      backgroundColor: colors.inputDarkBg,
      padding: normalizeWidth(16),
      gap: normalizeHeight(16),
    },
    yearRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBg,
      borderRadius: normalizeWidth(12),
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      paddingVertical: normalizeHeight(12),
      paddingHorizontal: normalizeWidth(16),
    },
    yearButton: {
      width: normalizeWidth(32),
      height: normalizeWidth(32),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: normalizeWidth(16),
      backgroundColor: colors.inputDarkBg,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalizeWidth(8),
    },
    monthCell: {
      width: '23%',
      paddingVertical: normalizeHeight(12),
      borderRadius: normalizeWidth(10),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthCellActive: {
      backgroundColor: ACCENT_GREEN,
      borderColor: ACCENT_GREEN,
    },
    footer: {
      backgroundColor: colors.inputDarkBg,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: normalizeWidth(16),
      paddingBottom: normalizeHeight(16),
      gap: normalizeWidth(12),
    },
    cancelButton: {
      paddingHorizontal: normalizeWidth(20),
      paddingVertical: normalizeHeight(10),
      borderRadius: 100,
      borderWidth: 1,
      borderColor: colors.textSecondary,
    },
    applyButton: {
      paddingHorizontal: normalizeWidth(20),
      paddingVertical: normalizeHeight(10),
      borderRadius: 100,
      backgroundColor: ACCENT_GREEN,
    },
  });

export default MonthYearPickerModal;
