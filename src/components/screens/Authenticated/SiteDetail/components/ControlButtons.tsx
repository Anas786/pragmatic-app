import React, { FC, useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  ICON_SIZE_MD,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from "src/utils";
import { useThemeStore } from "src/hooks";
import { LockIcon, LockIconOpen, Minus, NodeExpandIcon, Plus } from "src/assets/icons";

interface ControlButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLock: () => void;
  onFullscreen: () => void;
  isLocked: boolean;
  currentZoom: number;
}

const ControlButtons: FC<ControlButtonsProps> = ({
  onZoomIn,
  onZoomOut,
  onToggleLock,
  onFullscreen,
  isLocked,
  currentZoom
}) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isZoomInDisabled = isLocked || currentZoom >= 3 - 0.001;
  const isZoomOutDisabled = isLocked || currentZoom <= 0.5 + 0.001;

  return (
    <View style={styles.container}>
      <TouchableOpacity disabled={isZoomInDisabled} style={styles.button} onPress={onZoomIn}>
        <Plus size={ICON_SIZE_MD} color={isZoomInDisabled ? colors.textSecondary : colors.primaryText} />
      </TouchableOpacity>
      <TouchableOpacity disabled={isZoomOutDisabled} style={styles.button} onPress={onZoomOut}>
        <Minus size={ICON_SIZE_MD} color={isZoomOutDisabled ? colors.textSecondary : colors.primaryText} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onFullscreen}>
        <NodeExpandIcon size={ICON_SIZE_MD} color={colors.primaryText} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={onToggleLock}>
        {isLocked ? (
          <LockIcon
            size={ICON_SIZE_MD}
            color={isLocked ? colors.textSecondary : colors.primaryText}
          />
        ) : (
          <LockIconOpen
            size={ICON_SIZE_MD}
            color={isLocked ? colors.textSecondary : colors.primaryText}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: normalizeHeight(16),
      left: normalizeWidth(16),
      backgroundColor: colors.controlButtonBg,
      borderRadius: normalizeWidth(12),
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      padding: normalizeWidth(6),
      gap: normalizeWidth(2),
    },
    button: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      alignItems: "center",
      justifyContent: "center",
      borderRadius: normalizeWidth(8),
    },
  });

export default ControlButtons;
