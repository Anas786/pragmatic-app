import React, { FC, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppText } from 'src/components/common';
import {
  DROPDOWN_BG,
  FONT_SIZE_SM,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import CustomIcon from 'src/components/common/CustomIcon';

interface DropdownSelectorProps {
  selected: string;
  onSelect: (value: string) => void;
}

const options = ['Views', 'Live Parameter', 'Alarm'];

const DropdownSelector: FC<DropdownSelectorProps> = ({
  selected,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setIsOpen(true)}>
        <AppText fontSize={FONT_SIZE_SM} color={TEXT_SECONDARY}>
          {selected}
        </AppText>
        <CustomIcon name="down_arrow" size={18} color={TEXT_SECONDARY} />
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
                      color={selected === option ? WHITE : TEXT_SECONDARY}>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DROPDOWN_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
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
    backgroundColor: DROPDOWN_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
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
    borderBottomColor: INPUT_DARK_BORDER,
  },
});

export default DropdownSelector;
