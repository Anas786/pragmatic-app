import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { Modal, Pressable } from 'react-native';
import Themestore from '../../store/themestore';
import { getFontFamily } from '../../assets/utils/fontfamily';
import { Modalprops } from "../../types/modal";

const Alertbox: React.FC<Modalprops> = ({visible, setvisible,title, message}) => {
  const theme = Themestore(state => state.theme);

  const handleclose = () => {
    setvisible(false);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleclose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: theme.colors.overlaybackground,
              borderColor: theme.colors.bordercolor,
            },
          ]}
        >
            {title && (
             <Text style={[styles.titleText, { color: theme.colors.title }]}>{title}</Text>
          )}

          <View style={styles.option}>
             <Text style={[styles.optionText, { color: theme.colors.text }]}>
               {message || "Default Alert Message"}
             </Text>
          </View>

          <Pressable style={[styles.cancel, {borderColor: theme.colors.bordercolor}]} onPress={handleclose}>
            <Text style={[styles.cancelText, { color: theme.colors.title }]}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default Alertbox;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    borderRadius: 12,
    paddingVertical: 16,
  },
  titleText: {
    fontSize: 16,
    fontFamily: getFontFamily('true', 'bold'),
    textAlign: 'center',
    marginBottom: 8,
  },
  option: {
    padding: 14,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancel: {
    padding: 14,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 12,
    fontFamily: getFontFamily('true', 'medium'),
  },
});
