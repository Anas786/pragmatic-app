import React, { FC, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_XS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { formatDate } from 'src/utils/format';

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
          <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
            Select Date Range
          </AppText>
          <TouchableOpacity onPress={handleCancel}>
            <Icon name="close" size={ICON_SIZE_XS} color={TEXT_SECONDARY} />
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
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                Start Date
              </AppText>
              <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
                {formatDate(tempStart, DATE_DISPLAY_FORMAT)}
              </AppText>
            </View>
            <Icon
              name="calendar-outline"
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
              themeVariant="dark"
              textColor={WHITE}
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
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                End Date
              </AppText>
              <AppText fontSize={FONT_SIZE_XS} color={WHITE}>
                {formatDate(tempEnd, DATE_DISPLAY_FORMAT)}
              </AppText>
            </View>
            <Icon
              name="calendar-outline"
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
              themeVariant="dark"
              textColor={WHITE}
            />
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <AppText fontSize={FONT_SIZE_XS} medium color={TEXT_SECONDARY}>
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

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    margin: normalizeWidth(20),
  },
  container: {
    borderRadius: normalizeWidth(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
  },
  header: {
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(16),
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(16),
    gap: normalizeHeight(12),
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
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
    backgroundColor: INPUT_DARK_BG,
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
    borderColor: TEXT_SECONDARY,
  },
  applyButton: {
    paddingHorizontal: normalizeWidth(20),
    paddingVertical: normalizeHeight(10),
    borderRadius: 100,
    backgroundColor: ACCENT_GREEN,
  },
});

export default DateRangePickerModal;
