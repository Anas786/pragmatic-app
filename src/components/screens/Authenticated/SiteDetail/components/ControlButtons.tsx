import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from 'src/components/common';
import { ICON_SIZE_MD, normalizeWidth } from 'src/utils';
import { radius as radiusTokens, space, useScheme } from 'src/theme';
import {
  FitOverviewIcon,
  LockIcon,
  LockIconOpen,
  Minus,
  NodeExpandIcon,
  Plus,
} from 'src/assets/icons';

interface ControlButtonsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Toggle edge routing between curved bezier and straight orthogonal. */
  onToggleRouting: () => void;
  /** True when edges are in straight/orthogonal mode (highlights the button). */
  routingOrthogonal: boolean;
  onToggleLock: () => void;
  onFullscreen: () => void;
  isLocked: boolean;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  insetLeft?: number;
  insetBottom?: number;
}

const ControlButtons: FC<ControlButtonsProps> = ({
  onZoomIn,
  onZoomOut,
  onToggleRouting,
  routingOrthogonal,
  onToggleLock,
  onFullscreen,
  isLocked,
  currentZoom,
  minZoom,
  maxZoom,
  insetLeft = 0,
  insetBottom = 0,
}) => {
  const scheme = useScheme();
  const styles = useMemo(() => createStyles(scheme), [scheme]);
  const isZoomInDisabled = isLocked || currentZoom >= maxZoom - 0.001;
  const isZoomOutDisabled = isLocked || currentZoom <= minZoom + 0.001;
  const containerStyle = useMemo(
    () => [
      styles.container,
      { left: space.lg + insetLeft, bottom: space.lg + insetBottom },
    ],
    [styles.container, insetLeft, insetBottom],
  );

  return (
    <View style={containerStyle}>
      <PressableScale
        disabled={isZoomInDisabled}
        style={styles.button}
        onPress={onZoomIn}
        accessibilityLabel="Zoom in">
        <Plus
          size={ICON_SIZE_MD}
          color={isZoomInDisabled ? scheme.textSecondary : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        disabled={isZoomOutDisabled}
        style={styles.button}
        onPress={onZoomOut}
        accessibilityLabel="Zoom out">
        <Minus
          size={ICON_SIZE_MD}
          color={isZoomOutDisabled ? scheme.textSecondary : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onToggleRouting}
        accessibilityLabel={
          routingOrthogonal ? 'Use curved lines' : 'Use straight lines'
        }>
        <FitOverviewIcon
          size={ICON_SIZE_MD}
          color={routingOrthogonal ? scheme.brand : scheme.textPrimary}
        />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onFullscreen}
        accessibilityLabel="Fullscreen">
        <NodeExpandIcon size={ICON_SIZE_MD} color={scheme.textPrimary} />
      </PressableScale>
      <PressableScale
        style={styles.button}
        onPress={onToggleLock}
        accessibilityLabel={isLocked ? 'Unlock pan' : 'Lock pan'}>
        {isLocked ? (
          <LockIcon size={ICON_SIZE_MD} color={scheme.textSecondary} />
        ) : (
          <LockIconOpen size={ICON_SIZE_MD} color={scheme.textPrimary} />
        )}
      </PressableScale>
    </View>
  );
};

const createStyles = (scheme: ReturnType<typeof useScheme>) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: space.lg,
      left: space.lg,
      backgroundColor: scheme.isDark
        ? 'rgba(17, 24, 39, 0.92)'
        : 'rgba(244, 245, 247, 0.92)',
      borderRadius: radiusTokens.md,
      borderWidth: 1,
      borderColor: scheme.border,
      padding: normalizeWidth(6),
      gap: normalizeWidth(2),
    },
    button: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.sm,
    },
  });

export default ControlButtons;
