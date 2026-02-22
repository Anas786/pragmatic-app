import React, { FC } from 'react';
import {
  ColorValue,
  DimensionValue,
  I18nManager,
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
}) => (
  <Text
    allowFontScaling={false}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{
      color,
      fontSize: normalizeFont(fontSize),
      textAlign: center ? 'center' : I18nManager.isRTL ? 'left' : 'left',
      lineHeight: lineHeight ? lineHeight : undefined,
      width,
      opacity,
      fontFamily: bold
        ? 'Poppins-Bold'
        : medium
        ? 'Poppins-Medium'
        : semi_bold
        ? 'Poppins-SemiBold'
        : 'Poppins-Regular',
      ...style,
    }}
    {...rest}>
    {children}
  </Text>
);

export default AppText;
