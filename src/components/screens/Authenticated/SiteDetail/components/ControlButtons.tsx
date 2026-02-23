import React, { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  ICON_SIZE_MD,
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
        <Icon name="plus" size={ICON_SIZE_MD} color={WHITE} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onZoomOut}>
        <Icon name="minus" size={ICON_SIZE_MD} color={WHITE} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onFullscreen}>
        <Icon name="arrow-expand-all" size={ICON_SIZE_MD} color={WHITE} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onToggleLock}>
        <Icon
          name={isLocked ? 'lock' : 'lock-open-variant'}
          size={ICON_SIZE_MD}
          color={isLocked ? WHITE : TEXT_SECONDARY}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: normalizeHeight(16),
    left: normalizeWidth(16),
    backgroundColor: 'rgba(27, 26, 27, 0.9)',
    borderRadius: normalizeWidth(12),
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    padding: normalizeWidth(6),
    gap: normalizeWidth(2),
  },
  button: {
    width: normalizeWidth(36),
    height: normalizeWidth(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: normalizeWidth(8),
  },
});

export default ControlButtons;
