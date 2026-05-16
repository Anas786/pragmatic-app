import React, { FC, useMemo, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_XS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
  WHITE,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { formatDate } from 'src/utils/format';
import { CalendarIcon, Close } from 'src/assets/icons';

interface DateRangePickerModalProps {
  visible: boolean;
  onClose: () => void;
  startDate: Date;
  endDate: Date;
  onApply: (start: Date, end: Date) => void;
}

const DATE_DISPLAY_FORMAT = 'DD/MM/YY';

/**
 * Maximum span (in calendar months) the Custom date range can cover.
 * Backend reports get heavy when the period grows, so we hard-cap the
 * picker — the end-date control's `maximumDate` greys out anything
 * past `start + MAX_RANGE_MONTHS`, and the change handlers clamp
 * defensively in case a platform ignores the limit.
 */
const MAX_RANGE_MONTHS = 1;

/**
 * Add `months` calendar months to a date. Handles month-end edge cases
 * the same way `Date.setMonth` does (e.g. 31 Jan + 1 month → 28 Feb /
 * 2 Mar depending on the year — the JS runtime chooses, we don't
 * second-guess it).
 */
const addMonths = (d: Date, months: number): Date => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

const DateRangePickerModal: FC<DateRangePickerModalProps> = ({
  visible,
  onClose,
  startDate,
  endDate,
  onApply,
}) => {
  const { isDark, colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(
    null,
  );

  /** End-date upper bound derived from the working start date. */
  const maxEndDate = useMemo(
    () => addMonths(tempStart, MAX_RANGE_MONTHS),
    [tempStart],
  );

  const handleStartChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (!date) return;
    setTempStart(date);
    const newMax = addMonths(date, MAX_RANGE_MONTHS);
    if (tempEnd > newMax) {
      // End was beyond the new max-range window — pull it back in.
      setTempEnd(newMax);
    } else if (date > tempEnd) {
      // Start moved past end — sync end forward.
      setTempEnd(date);
    }
  };

  const handleEndChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (!date) return;
    if (date < tempStart) return;
    // Defensive clamp — `maximumDate` should already block this on the
    // native picker, but we guard the logic anyway.
    setTempEnd(date > maxEndDate ? maxEndDate : date);
  };

  const handleApply = () => {
    onApply(tempStart, tempEnd);
    onClose();
  };

  const handleCancel = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    onClose();
  };

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
            Select Date Range
          </AppText>
          <TouchableOpacity onPress={handleCancel}>
            <Close size={ICON_SIZE_XS} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Single contiguous body+footer container — avoids the hairline
            seam that appeared on some devices when these were two
            separate Views with the same background colour. */}
        <View style={styles.content}>
          <View style={styles.dateFields}>
            {/* Start Date */}
            <TouchableOpacity
              style={[
                styles.dateField,
                activePicker === 'start' && styles.dateFieldActive,
              ]}
              onPress={() =>
                setActivePicker(activePicker === 'start' ? null : 'start')
              }>
              <View style={styles.dateFieldContent}>
                <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                  Start Date
                </AppText>
                <AppText fontSize={FONT_SIZE_XS} color={colors.primaryText}>
                  {formatDate(tempStart, DATE_DISPLAY_FORMAT)}
                </AppText>
              </View>
              <CalendarIcon size={ICON_SIZE_XS} color={ACCENT_GREEN} />
            </TouchableOpacity>

            {activePicker === 'start' && (
              <DateTimePicker
                value={tempStart}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartChange}
                themeVariant={isDark ? 'dark' : 'light'}
                textColor={colors.primaryText}
              />
            )}

            {/* End Date */}
            <TouchableOpacity
              style={[
                styles.dateField,
                activePicker === 'end' && styles.dateFieldActive,
              ]}
              onPress={() =>
                setActivePicker(activePicker === 'end' ? null : 'end')
              }>
              <View style={styles.dateFieldContent}>
                <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                  End Date
                </AppText>
                <AppText fontSize={FONT_SIZE_XS} color={colors.primaryText}>
                  {formatDate(tempEnd, DATE_DISPLAY_FORMAT)}
                </AppText>
              </View>
              <CalendarIcon size={ICON_SIZE_XS} color={ACCENT_GREEN} />
            </TouchableOpacity>

            {activePicker === 'end' && (
              <DateTimePicker
                value={tempEnd}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndChange}
                minimumDate={tempStart}
                maximumDate={maxEndDate}
                themeVariant={isDark ? 'dark' : 'light'}
                textColor={colors.primaryText}
              />
            )}

            {/* Hint reminding the user about the cap — keeps the
                modal honest about why later dates are greyed out. */}
            <AppText
              fontSize={FONT_SIZE_XXS}
              color={colors.textSecondary}
              center
              style={styles.hint}>
              Max range: 1 month
            </AppText>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}>
              <AppText
                fontSize={FONT_SIZE_XS}
                medium
                color={colors.textSecondary}>
                Cancel
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}>
              <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
                Apply
              </AppText>
            </TouchableOpacity>
          </View>
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
    /**
     * Body + footer share a single background container so there's no
     * possible visual seam between them. The internal vertical rhythm is
     * driven by the flex `gap` rather than by competing paddings.
     */
    content: {
      backgroundColor: colors.inputDarkBg,
      padding: normalizeWidth(16),
      gap: normalizeHeight(16),
    },
    dateFields: {
      gap: normalizeHeight(12),
    },
    dateField: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.textSecondary,
      borderRadius: normalizeWidth(12),
      paddingHorizontal: normalizeWidth(14),
      paddingVertical: normalizeHeight(12),
    },
    dateFieldActive: {
      borderColor: ACCENT_GREEN,
    },
    dateFieldContent: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    hint: {
      marginTop: normalizeHeight(2),
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
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

export default DateRangePickerModal;
