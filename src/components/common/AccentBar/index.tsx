import React, { FC, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface AccentBarProps {
  /** Bar fill color. */
  color: string;
  /** Bar thickness in points (defaults to 3). */
  width?: number;
  /** Bar height in points (defaults to 36). */
  height?: number;
  /** Border radius in points (defaults to 2). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thin vertical color strip — used on the leading edge of cards as
 * the "accent bar" that hints at category / severity / source.
 */
const AccentBar: FC<AccentBarProps> = ({
  color,
  width = 3,
  height = 36,
  radius = 2,
  style,
}) => {
  const barStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: color,
        },
        style,
      ]) as ViewStyle,
    [width, height, radius, color, style],
  );
  return <View style={barStyle} />;
};

export default AccentBar;
