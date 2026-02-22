import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  BACKGROUND,
  BORDER_GRAY,
  INPUT,
  normalizeHeight,
  normalizeWidth,
  WHITE,
  TEXT_DARK,
} from 'src/utils';
import AppText from '../AppText';
import Button from '../Button';
import CustomIcon from '../CustomIcon';
import Spacer from '../Spacer';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (dates: { date_from: string; date_to: string }) => void;
  loading?: boolean;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  loading = false,
}) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  // Initialize dates once and preserve them
  const [fromDate, setFromDate] = useState<Date>(() => new Date());
  const [toDate, setToDate] = useState<Date>(() => new Date());
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);
  const prevVisibleRef = useRef<boolean>(false);

  // Reset dates when modal opens to ensure fresh state (only on open, not on every render)
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      // Modal just opened - reset dates
      const now = new Date();
      setFromDate(now);
      setToDate(now);
      setActivePicker(null);
    }
    prevVisibleRef.current = visible;
  }, [visible]);

  const handleApply = () => {
    onApply({
      date_from: dayjs(fromDate).format('YYYY-MM-DD'),
      date_to: dayjs(toDate).format('YYYY-MM-DD'),
    });
    onClose();
  };

  const formatDate = (date: Date) => {
    return dayjs(date).format('DD MMM YYYY');
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      useNativeDriverForBackdrop
      hideModalContentWhileAnimating>
      <View style={styles.container}>
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <CustomIcon name="filter" size={24} color={INPUT} />
            <Spacer mh={12} />
            <AppText fontSize={20} semi_bold color={INPUT}>
              {t('orders_filter')}
            </AppText>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CustomIcon name="close" size={20} color={INPUT} />
          </TouchableOpacity>
        </View>

        <Spacer mt={8} />

        {/* Description */}
        <AppText fontSize={14} color="#666" style={styles.description}>
          {t('filter_orders_by_status')}
        </AppText>

        <Spacer mt={24} />

        {/* Date Pickers */}
        <View style={styles.dateContainer}>
          {/* From Date */}
          <View style={styles.dateInputWrapper}>
            <AppText fontSize={14} semi_bold color={INPUT} style={styles.label}>
              {t('start_date')}
            </AppText>
            <Spacer mt={8} />
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setActivePicker('from')}
              activeOpacity={0.7}
              disabled={loading}>
              <View style={styles.dateInputContent}>
                <Icon name="calendar-today" size={normalizeWidth(20)} color="#1EC2F3" />
                <Spacer mh={12} />
                <AppText fontSize={16} color={INPUT} style={styles.dateText}>
                  {fromDate ? formatDate(fromDate) : ''}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>

          <Spacer mh={12} />

          {/* To Date */}
          <View style={styles.dateInputWrapper}>
            <AppText fontSize={14} semi_bold color={INPUT} style={styles.label}>
              {t('end_date')}
            </AppText>
            <Spacer mt={8} />
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setActivePicker('to')}
              activeOpacity={0.7}
              disabled={loading}>
              <View style={styles.dateInputContent}>
                <Icon name="calendar-today" size={normalizeWidth(20)} color="#1EC2F3" />
                <Spacer mh={12} />
                <AppText fontSize={16} color={INPUT} style={styles.dateText}>
                  {toDate ? formatDate(toDate) : ''}
                </AppText>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Spacer mt={32} />

        {/* Footer buttons */}
        <View style={styles.footer}>
          <Button
            title={t('cancel')}
            width={normalizeWidth(160)}
            type="secondary"
            onPress={onClose}
            disabled={loading}
          />
          <Spacer mh={12} />
          <Button
            title={t('apply')}
            width={normalizeWidth(160)}
            onPress={handleApply}
            loading={loading}
            disabled={loading}
          />
        </View>

        <Spacer mt={20} />

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1EC2F3" />
            <Spacer mt={16} />
            <AppText fontSize={16} color={WHITE}>
              {t('applying_filter') || 'Applying filter...'}
            </AppText>
          </View>
        )}
      </View>

      {/* Date Picker Modal - iOS */}
      {Platform.OS === 'ios' && activePicker && (
        <Modal
          isVisible={activePicker !== null}
          onBackdropPress={() => setActivePicker(null)}
          style={styles.pickerModal}
          animationIn="fadeIn"
          animationOut="fadeOut"
          backdropOpacity={0.5}>
          <View
            style={[
              styles.pickerContainer,
              isDarkMode && styles.pickerContainerDark,
            ]}>
            <View
              style={[
                styles.pickerHeader,
                isDarkMode && styles.pickerHeaderDark,
              ]}>
              <TouchableOpacity
                onPress={() => setActivePicker(null)}
                style={styles.pickerCancelButton}>
                <AppText
                  fontSize={16}
                  color={isDarkMode ? WHITE : INPUT}>
                  {t('cancel')}
                </AppText>
              </TouchableOpacity>
              <AppText
                fontSize={18}
                semi_bold
                color={isDarkMode ? WHITE : INPUT}>
                {activePicker === 'from' ? t('start_date') : t('end_date')}
              </AppText>
              <TouchableOpacity
                onPress={() => setActivePicker(null)}
                style={styles.pickerDoneButton}>
                <AppText fontSize={16} color="#1EC2F3">
                  {t('done') || 'Done'}
                </AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContent}>
              <DateTimePicker
                value={activePicker === 'from' ? fromDate : toDate}
                mode="date"
                display="spinner"
                themeVariant={isDarkMode ? 'dark' : 'light'}
                onChange={(e, date) => {
                  if (date) {
                    if (activePicker === 'from') {
                      setFromDate(date);
                    } else {
                      setToDate(date);
                    }
                  }
                }}
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker - Android */}
      {Platform.OS === 'android' && activePicker && (
        <DateTimePicker
          value={activePicker === 'from' ? fromDate : toDate}
          mode="date"
          display="default"
          themeVariant={isDarkMode ? 'dark' : 'light'}
          onChange={(e, date) => {
            if (e.type === 'set' && date) {
              if (activePicker === 'from') {
                setFromDate(date);
              } else {
                setToDate(date);
              }
            }
            setActivePicker(null);
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: normalizeWidth(20),
    paddingTop: normalizeHeight(12),
    paddingBottom: normalizeHeight(20),
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: normalizeWidth(40),
    height: normalizeHeight(4),
    backgroundColor: '#D0D5DD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: normalizeHeight(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: normalizeHeight(8),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: normalizeWidth(8),
  },
  description: {
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateInputWrapper: {
    flex: 1,
  },
  label: {
    marginBottom: normalizeHeight(4),
  },
  dateInput: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER_GRAY,
    borderRadius: 8,
    paddingVertical: normalizeHeight(14),
    paddingHorizontal: normalizeWidth(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInputContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerModal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  pickerContainer: {
    backgroundColor: WHITE,
    borderRadius: 16,
    width: '90%',
    maxWidth: normalizeWidth(400),
    overflow: 'hidden',
  },
  pickerContainerDark: {
    backgroundColor: TEXT_DARK,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: normalizeWidth(20),
    paddingVertical: normalizeHeight(16),
    borderBottomWidth: 1,
    borderBottomColor: BORDER_GRAY,
  },
  pickerHeaderDark: {
    borderBottomColor: '#444',
  },
  pickerCancelButton: {
    padding: normalizeWidth(8),
    minWidth: normalizeWidth(60),
  },
  pickerDoneButton: {
    padding: normalizeWidth(8),
    minWidth: normalizeWidth(60),
    alignItems: 'flex-end',
  },
  pickerContent: {
    paddingVertical: normalizeHeight(20),
    alignItems: 'center',
  },
  picker: {
    width: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
});

export default FilterModal;
