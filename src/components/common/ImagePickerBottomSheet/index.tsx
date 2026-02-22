import React, { FC } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppText, Spacer } from 'src/components/common';
import { normalizeHeight, normalizeWidth, BLUE, WHITE, BACKGROUND } from 'src/utils';

interface ImagePickerBottomSheetProps {
  visible: boolean;
  onHide: () => void;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
}

const ImagePickerBottomSheet: FC<ImagePickerBottomSheetProps> = ({
  visible,
  onHide,
  onSelectCamera,
  onSelectLibrary,
}) => {
  const handleCameraPress = () => {
    onSelectCamera();
  };

  const handleLibraryPress = () => {
    onSelectLibrary();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onHide}
      onSwipeComplete={onHide}
      swipeDirection={['down']}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        <Spacer mt={20} />

        <AppText fontSize={18} semi_bold style={styles.title}>
          Select Image Source
        </AppText>

        <Spacer mt={30} />

        <TouchableOpacity style={styles.option} onPress={handleCameraPress}>
          <View style={styles.iconContainer}>
            <Icon name="camera-alt" size={24} color={BLUE} />
          </View>
          <AppText fontSize={16} style={styles.optionText}>
            Take Photo
          </AppText>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.option} onPress={handleLibraryPress}>
          <View style={styles.iconContainer}>
            <Icon name="photo-library" size={24} color={BLUE} />
          </View>
          <AppText fontSize={16} style={styles.optionText}>
            Choose from Library
          </AppText>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>

        <Spacer mt={30} />

        <TouchableOpacity style={styles.cancelButton} onPress={onHide}>
          <AppText fontSize={16} color="#666">
            Cancel
          </AppText>
        </TouchableOpacity>

        <Spacer mt={20} />
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: normalizeWidth(20),
    paddingBottom: normalizeHeight(20),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalizeHeight(15),
    paddingHorizontal: normalizeWidth(15),
    backgroundColor: WHITE,
    borderRadius: 12,
    marginBottom: normalizeHeight(10),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: normalizeWidth(40),
    height: normalizeHeight(40),
    borderRadius: normalizeWidth(20),
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalizeWidth(15),
  },
  optionText: {
    flex: 1,
    color: '#333',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: normalizeHeight(15),
  },
});

export default ImagePickerBottomSheet;
