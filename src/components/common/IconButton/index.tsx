import React, { FC, useEffect, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { radius as radiusTokens, Scheme, touch, useThemedStyles } from 'src/theme';
import PressableScale, { PressableScaleProps } from '../PressableScale';

export interface IconButtonProps extends Omit<PressableScaleProps, 'style'> {
  /**
   * 'plain' — transparent; 'soft' — a brandSoft circle behind the icon
   * (header refresh / secondary actions).
   */
  variant?: 'plain' | 'soft';
  /** Visual diameter in pt (default 40 soft / 44 plain). The tappable box
   *  is never smaller than `touch.min` (44pt iOS / 48dp Android). */
  size?: number;
  /** Outer-box style (margins / alignment). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Icon-only button with a guaranteed ≥ touch.min target. The box is REAL
 * size (not hitSlop), so it also works inside `overflow: 'hidden'`
 * parents. Always give it an `accessibilityLabel` (warned in dev).
 */
const IconButton: FC<IconButtonProps> = ({
  variant = 'plain',
  size,
  style,
  children,
  ...rest
}) => {
  const themed = useThemedStyles(createIconButtonStyles);
  const visual = size ?? (variant === 'soft' ? 40 : touch.min);
  const box = Math.max(visual, touch.min);

  const label = rest.accessibilityLabel;
  useEffect(() => {
    if (__DEV__ && !label) {
      console.warn('[IconButton] missing accessibilityLabel — screen readers will announce an unlabeled button.');
    }
  }, [label]);

  const boxStyle = useMemo(
    () => [styles.box, { width: box, height: box }, style],
    [box, style],
  );
  const softStyle = useMemo(
    () => [
      themed.soft,
      { width: visual, height: visual, borderRadius: visual / 2 },
    ],
    [themed.soft, visual],
  );

  return (
    <PressableScale {...rest} style={boxStyle}>
      {variant === 'soft' ? <View style={softStyle}>{children}</View> : children}
    </PressableScale>
  );
};
IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const createIconButtonStyles = (scheme: Scheme) =>
  StyleSheet.create({
    soft: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brandSoft,
    },
  });

export default IconButton;
