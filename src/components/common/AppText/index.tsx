import React, { FC, memo } from 'react';
import {
  ColorValue,
  DimensionValue,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from 'react-native';
import { INPUT, normalizeFont } from 'src/utils';

interface AppTextProps extends TextProps {
  bold?: boolean;
  color?: ColorValue;
  style?: TextStyle | TextStyle[];
  fontSize?: number;
  medium?: boolean;
  semi_bold?: boolean;
  center?: boolean;
  lineHeight?: number;
  width?: DimensionValue;
  opacity?: number;
}

const AppText: FC<AppTextProps> = ({
  children,
  color = INPUT,
  bold = false,
  medium = false,
  semi_bold = false,
  style,
  fontSize = 14,
  center,
  lineHeight,
  width = 'auto',
  opacity = 1,
  ...rest
}) => {
  const weightStyle = bold
    ? styles.bold
    : medium
    ? styles.medium
    : semi_bold
    ? styles.semiBold
    : styles.regular;
  // Only the per-instance values live in this small object; the static
  // parts are StyleSheet entries so RN flattens the array natively —
  // and caller `style` arrays survive intact (the old `{...style}`
  // object-spread silently dropped them).
  const dynamic: TextStyle = {
    color,
    fontSize: normalizeFont(fontSize),
    width,
    opacity,
  };
  if (lineHeight) {
    dynamic.lineHeight = lineHeight;
  }
  return (
    <Text
      allowFontScaling={false}
      style={[weightStyle, center ? styles.center : styles.left, dynamic, style]}
      {...rest}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  regular: { fontFamily: 'Poppins-Regular' },
  medium: { fontFamily: 'Poppins-Medium' },
  semiBold: { fontFamily: 'Poppins-SemiBold' },
  bold: { fontFamily: 'Poppins-Bold' },
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
});

export default memo(AppText);
