import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_XXS, ICON_SIZE_XS } from 'src/utils';
import AppText from '../AppText';
import PressableScale from '../PressableScale';

interface ZoomButtonProps {
  Icon: FC<{ size?: number; color?: string }>;
  enabled: boolean;
  onPress: () => void;
}

const ZoomButton: FC<ZoomButtonProps> = ({ Icon, enabled, onPress }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const buttonStyle = enabled ? themed.zoomButton : themed.zoomButtonDisabled;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!enabled}
      haptic="tap"
      scaleTo={0.9}
      style={buttonStyle}>
      <Icon
        size={ICON_SIZE_XS}
        color={enabled ? scheme.textPrimary : scheme.textSecondary}
      />
    </PressableScale>
  );
};

export interface ZoomControlsProps {
  MinusIcon: FC<{ size?: number; color?: string }>;
  PlusIcon: FC<{ size?: number; color?: string }>;
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const ZoomControls: FC<ZoomControlsProps> = ({
  MinusIcon,
  PlusIcon,
  zoom,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}) => {
  const scheme = useScheme();
  return (
    <View style={styles.row}>
      <ZoomButton Icon={MinusIcon} enabled={canZoomOut} onPress={onZoomOut} />
      <AppText
        fontSize={FONT_SIZE_XXS}
        bold
        color={scheme.textSecondary}
        style={styles.label}>
        {zoom.toFixed(1)}x
      </AppText>
      <ZoomButton Icon={PlusIcon} enabled={canZoomIn} onPress={onZoomIn} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    minWidth: 32,
    textAlign: 'center',
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    zoomButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: scheme.surfaceMuted,
      borderColor: scheme.border,
    },
    zoomButtonDisabled: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      backgroundColor: scheme.surfaceMuted,
      borderColor: scheme.border,
      opacity: 0.4,
    },
  });

export default ZoomControls;
