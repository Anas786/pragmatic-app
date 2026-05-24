import React, { FC, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface DotProps {
  /** Fill color. */
  color: string;
  /** Diameter in points. Defaults to 8. */
  size?: number;
  /** Optional outer style override (e.g. marginRight). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Solid-color round dot used everywhere the design system shows a
 * colored marker — chip dots, status dots, legend dots, category dots,
 * severity bars endpoints, etc.
 */
const Dot: FC<DotProps> = ({ color, size = 8, style }) => {
  const dotStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]) as ViewStyle,
    [size, color, style],
  );
  return <View style={dotStyle} />;
};

export default Dot;
