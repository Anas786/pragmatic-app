import React, { FC, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import { AppText } from 'src/components/common';
import { FONT_SIZE_SM, normalizeHeight, normalizeWidth } from 'src/utils';
import { radius as radiusTokens, space, useScheme } from 'src/theme';
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
  const scheme = useScheme();
  const styles = useMemo(() => createStyles(scheme), [scheme]);

  const handleSelect = (option: DropdownOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setIsOpen(true)}>
        <AppText fontSize={FONT_SIZE_SM} color={scheme.textSecondary}>
          {selected}
        </AppText>
        <CustomIcon name="down_arrow" size={18} color={scheme.textSecondary} />
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
                      color={selected === option ? scheme.textPrimary : scheme.textSecondary}>
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

const createStyles = (scheme: ReturnType<typeof useScheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: radiusTokens.pill,
      paddingHorizontal: space.lg,
      paddingVertical: normalizeHeight(12),
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: radiusTokens.lg,
      paddingVertical: normalizeHeight(8),
      width: normalizeWidth(200),
    },
    optionItem: {
      paddingHorizontal: space.lg,
      paddingVertical: normalizeHeight(12),
    },
    optionBorder: {
      borderBottomWidth: 1,
      borderBottomColor: scheme.border,
    },
  });

export default DropdownSelector;
