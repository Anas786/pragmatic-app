import React, { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_LG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

interface ControlButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLock: () => void;
  onFullscreen: () => void;
  isLocked: boolean;
}

const ControlButtons: FC<ControlButtonsProps> = ({
  onZoomIn,
  onZoomOut,
  onToggleLock,
  onFullscreen,
  isLocked,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onZoomIn}>
        <AppText fontSize={FONT_SIZE_LG} color={WHITE}>
          +
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onZoomOut}>
        <AppText fontSize={FONT_SIZE_LG} color={WHITE}>
          −
        </AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onToggleLock}>
        <AppText fontSize={FONT_SIZE_LG}>{isLocked ? '🔒' : '🔓'}</AppText>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onFullscreen}>
        <AppText fontSize={FONT_SIZE_LG}>⛶</AppText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: normalizeHeight(16),
    right: normalizeWidth(16),
    flexDirection: 'row',
    backgroundColor: 'rgba(27, 26, 27, 0.9)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    padding: normalizeWidth(8),
    gap: normalizeWidth(4),
  },
  button: {
    width: normalizeWidth(36),
    height: normalizeWidth(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
});

export default ControlButtons;
