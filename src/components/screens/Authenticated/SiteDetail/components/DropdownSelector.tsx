import React, { FC, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_SM,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import CustomIcon from 'src/components/common/CustomIcon';

type DropdownOption = 'Views' | 'Live Parameter' | 'Alarm';

interface DropdownSelectorProps {
  selected: DropdownOption;
  onSelect: (value: DropdownOption) => void;
}

const options: DropdownOption[] = ['Views', 'Live Parameter', 'Alarm'];

const DropdownSelector: FC<DropdownSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (option: DropdownOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setIsOpen(true)}>
        <AppText fontSize={FONT_SIZE_SM} color={colors.textSecondary}>
          {selected}
        </AppText>
        <CustomIcon name="down_arrow" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionItem,
                      index < options.length - 1 && styles.optionBorder,
                    ]}
                    onPress={() => handleSelect(option)}>
                    <AppText
                      fontSize={FONT_SIZE_SM}
                      color={selected === option ? colors.primaryText : colors.textSecondary}>
                      {option}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.dropdownBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(12),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.dropdownBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      paddingVertical: normalizeHeight(8),
      width: normalizeWidth(200),
    },
    optionItem: {
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(12),
    },
    optionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.inputDarkBorder,
    },
  });

export default DropdownSelector;
