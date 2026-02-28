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

  const handleStartChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (date) {
      setTempStart(date);
      if (date > tempEnd) {
        setTempEnd(date);
      }
    }
  };

  const handleEndChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setActivePicker(null);
    }
    if (date) {
      if (date >= tempStart) {
        setTempEnd(date);
      }
    }
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

        <View style={styles.body}>
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
            <CalendarIcon
              size={ICON_SIZE_XS}
              color={ACCENT_GREEN}
            />
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
            <CalendarIcon
              size={ICON_SIZE_XS}
              color={ACCENT_GREEN}
            />
          </TouchableOpacity>

          {activePicker === 'end' && (
            <DateTimePicker
              value={tempEnd}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndChange}
              minimumDate={tempStart}
              themeVariant={isDark ? 'dark' : 'light'}
              textColor={colors.primaryText}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <AppText fontSize={FONT_SIZE_XS} medium color={colors.textSecondary}>
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
    body: {
      backgroundColor: colors.inputDarkBg,
      padding: normalizeWidth(16),
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

export default DateRangePickerModal;
