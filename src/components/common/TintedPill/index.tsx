import React, { FC, ReactNode, useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { radius as radiusTokens, space } from 'src/theme';

interface TintedPillProps {
  color: string;
  alpha?: string;
  bordered?: boolean;
  paddingX?: number;
  paddingY?: number;
  rounded?: number;
  row?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

const ROW_LAYOUT: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
};
const COL_LAYOUT: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
};

const TintedPill: FC<TintedPillProps> = ({
  color,
  alpha = '1F',
  bordered = false,
  paddingX = space.sm,
  paddingY = 3,
  rounded = radiusTokens.pill,
  row = false,
  style,
  children,
}) => {
  const merged = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        row ? ROW_LAYOUT : COL_LAYOUT,
        {
          backgroundColor: color + alpha,
          paddingHorizontal: paddingX,
          paddingVertical: paddingY,
          borderRadius: rounded,
          borderWidth: bordered ? 1 : 0,
          borderColor: bordered ? color : undefined,
        },
        style,
      ]) as ViewStyle,
    [row, color, alpha, paddingX, paddingY, rounded, bordered, style],
  );
  return <View style={merged}>{children}</View>;
};

export default TintedPill;
