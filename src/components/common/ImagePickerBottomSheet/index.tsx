import React, { FC, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AppText, Spacer } from 'src/components/common';
import { duration as durationTokens } from 'src/theme';
import { normalizeHeight, normalizeWidth, BLUE, WHITE, BACKGROUND } from 'src/utils';

interface ImagePickerBottomSheetProps {
  visible: boolean;
  onHide: () => void;
  onSelectCamera: () => void;
  onSelectLibrary: () => void;
}

const SCREEN_H = Dimensions.get('window').height;

/**
 * Bottom sheet for choosing an image source. Built on RN's **core**
 * `Modal` + a Reanimated slide/fade (NOT `react-native-modal`, which
 * double-presents under the New Architecture). Stays mounted through the
 * exit animation so the close still animates.
 */
const ImagePickerBottomSheet: FC<ImagePickerBottomSheetProps> = ({
  visible,
  onHide,
  onSelectCamera,
  onSelectLibrary,
}) => {
  // Keep the Modal mounted through the slide-out so the exit animates.
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: durationTokens.base });
    } else {
      progress.value = withTiming(
        0,
        { duration: durationTokens.base },
        finished => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
    // progress is a stable shared value; only react to `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (sheetH || SCREEN_H) }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onHide}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Close image source picker">
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}
          />
        </Pressable>

        <Animated.View
          style={[styles.container, sheetStyle]}
          onLayout={e => setSheetH(e.nativeEvent.layout.height)}>
          <View style={styles.handle} />
          <Spacer mt={20} />

          <AppText fontSize={18} semi_bold style={styles.title}>
            Select Image Source
          </AppText>

          <Spacer mt={30} />

          <TouchableOpacity style={styles.option} onPress={onSelectCamera}>
            <View style={styles.iconContainer}>
              <Icon name="camera-alt" size={24} color={BLUE} />
            </View>
            <AppText fontSize={16} style={styles.optionText}>
              Take Photo
            </AppText>
            <Icon name="chevron-right" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={onSelectLibrary}>
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
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
