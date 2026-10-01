import React, { FC, memo } from 'react';
import {
  ColorValue,
  DimensionValue,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from 'react-native';
import { ColorScheme, type as typeRamp, useScheme } from 'src/theme';
import { normalizeFont, normalizeFontLegacy } from 'src/utils/format';

export type TextVariant = keyof typeof typeRamp;

/** Semantic text colour roles (see the "Colour roles" design decision). */
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'brand'
  | 'onBrand'
  | 'onHero'
  | 'onHeroMuted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

/** Smallest rendered size (pt/sp) — only `fixedSize` canvases go below. */
export const MIN_FONT_SIZE = 11;
/** OS text-size scaling cap for regular UI text. */
export const DEFAULT_MAX_FONT_SCALE = 1.3;

interface AppTextProps extends TextProps {
  /** Type-ramp key (`h3`, `body`, `caption`, …) — size, line, weight,
   *  tracking. Explicit `fontSize` / weight props override it. */
  variant?: TextVariant;
  /** Semantic colour role. `color` wins over `tone`; default 'primary'. */
  tone?: TextTone;
  /**
   * Fixed-geometry canvases only (SLD node cards): no OS font scaling,
   * no 11pt floor and the legacy size formula — renders exactly as the
   * pre-v3 AppText did.
   */
  fixedSize?: boolean;
  bold?: boolean;
  color?: ColorValue;
  style?: StyleProp<TextStyle>;
  fontSize?: number;
  medium?: boolean;
  semi_bold?: boolean;
  center?: boolean;
  lineHeight?: number;
  width?: DimensionValue;
  opacity?: number;
}

const toneColor = (scheme: ColorScheme, tone: TextTone): string => {
  switch (tone) {
    case 'secondary':
      return scheme.textSecondary;
    case 'tertiary':
      return scheme.textTertiary;
    case 'disabled':
      return scheme.textDisabled;
    case 'brand':
      return scheme.brandText;
    case 'onBrand':
      return scheme.textOnBrand;
    case 'onHero':
      return scheme.heroOnGradient;
    case 'onHeroMuted':
      return scheme.heroOnGradientMuted;
    case 'success':
    case 'warning':
    case 'danger':
    case 'info':
      return scheme.statusInk[tone];
    case 'primary':
    default:
      return scheme.textPrimary;
  }
};

const WEIGHT_STYLE = {
  '400': 'regular',
  '500': 'medium',
  '600': 'semiBold',
  '700': 'bold',
} as const;

/**
 * The app's text primitive. Everything visible goes through it.
 *
 * - Font scaling is ON (accessibility text sizes) with a 1.3× cap by
 *   default; pass `maxFontSizeMultiplier` to change it (long-form body
 *   uses 1.6) or `fixedSize` for fixed-geometry canvases.
 * - Sizes are width-scaled via `normalizeFont`, floored at 11pt.
 * - Colour precedence: `color` > `tone` > scheme.textPrimary.
 */
const AppText: FC<AppTextProps> = ({
  children,
  variant,
  tone,
  fixedSize = false,
  color,
  bold,
  medium,
  semi_bold,
  style,
  fontSize,
  center,
  lineHeight,
  width = 'auto',
  opacity = 1,
  ...rest
}) => {
  const scheme = useScheme();
  const v = variant ? typeRamp[variant] : undefined;

  // Same precedence as before variants existed: bold > medium > semi_bold.
  const weightKey = bold
    ? 'bold'
    : medium
    ? 'medium'
    : semi_bold
    ? 'semiBold'
    : v
    ? WEIGHT_STYLE[v.weight]
    : 'regular';

  const requested = fontSize ?? v?.size ?? 14;
  const scaled = fixedSize ? normalizeFontLegacy(requested) : normalizeFont(requested);
  const size = fixedSize ? scaled : Math.max(MIN_FONT_SIZE, scaled);
  // How much the 11pt floor enlarged the text — line heights follow it so
  // a floored 10→11pt label with lineHeight 13 doesn't clip descenders.
  const floorRatio = scaled > 0 ? size / scaled : 1;

  // Only the per-instance values live in this small object; the static
  // parts are StyleSheet entries so RN flattens the array natively.
  const dynamic: TextStyle = {
    color: color ?? toneColor(scheme, tone ?? 'primary'),
    fontSize: size,
    width,
    opacity,
  };
  if (lineHeight) {
    dynamic.lineHeight = floorRatio > 1 ? Math.round(lineHeight * floorRatio) : lineHeight;
  } else if (v && fontSize === undefined) {
    dynamic.lineHeight = Math.round(v.line * (size / v.size));
  }
  if (v && v.tracking !== 0) {
    dynamic.letterSpacing = v.tracking;
  }

  return (
    <Text
      allowFontScaling={!fixedSize}
      maxFontSizeMultiplier={fixedSize ? undefined : DEFAULT_MAX_FONT_SCALE}
      {...rest}
      style={[styles[weightKey], center ? styles.center : styles.left, dynamic, style]}>
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
