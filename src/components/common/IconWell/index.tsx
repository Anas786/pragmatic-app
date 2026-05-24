import React, { FC, ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface IconWellProps {
  /** Tint color of the well background (applied with `alpha`). */
  color: string;
  /** Hex alpha suffix appended to `color` for the fill. Defaults `'1F'`. */
  alpha?: string;
  /** Diameter in points. Defaults to 40. */
  size?: number;
  /** Border radius. Defaults to half of `size` (circle). */
  radius?: number;
  /** Optional border. */
  bordered?: boolean;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Centered square/circular "well" for an icon with a tinted background.
 * Replaces the recurring per-instance background-tint pattern from CardsView,
 * LiveParameterView, AlarmsView, SummaryView, etc.
 */
const IconWell: FC<IconWellProps> = ({
  color,
  alpha = '1F',
  size = 40,
  radius,
  bordered = false,
  borderColor,
  style,
  children,
}) => {
  const merged = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        {
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          borderRadius: radius ?? size / 2,
          backgroundColor: color + alpha,
          borderWidth: bordered ? 1 : 0,
          borderColor: bordered ? borderColor ?? color : undefined,
        },
        style,
      ]) as ViewStyle,
    [size, radius, color, alpha, bordered, borderColor, style],
  );
  return <View style={merged}>{children}</View>;
};

export default IconWell;
