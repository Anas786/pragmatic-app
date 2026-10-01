import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import AppText, { TextTone } from '../AppText';

interface OverlineLabelProps {
  children: ReactNode;
  /** Explicit colour. Omit to use `tone` (default 'secondary'). */
  color?: string;
  /** Semantic colour role when no `color` is given. */
  tone?: TextTone;
  /** Custom font-size override. Defaults to the 11pt overline size. */
  fontSize?: number;
  /** Pass-through `numberOfLines` (defaults to 1 — overlines should
   *  never wrap). */
  numberOfLines?: number;
  /** Optional caller-provided extra style — merged after the base. */
  style?: TextStyle;
}

/**
 * The small uppercase, tracked label for short APP-AUTHORED in-card labels
 * ("POWER MIX", "TOTAL ENERGY") — 11pt SemiBold, tracking 1.0. Section
 * titles use a sentence-case h3 instead, and backend-provided names are
 * never put in an overline (they keep their own case).
 */
const OverlineLabel: FC<OverlineLabelProps> = ({
  children,
  color,
  tone = 'secondary',
  fontSize,
  numberOfLines = 1,
  style,
}) => {
  const merged = useMemo<TextStyle>(
    () => StyleSheet.flatten([styles.base, style]) as TextStyle,
    [style],
  );
  return (
    <AppText
      variant="overline"
      fontSize={fontSize}
      semi_bold
      color={color}
      tone={tone}
      numberOfLines={numberOfLines}
      style={merged}>
      {children}
    </AppText>
  );
};

const styles = StyleSheet.create({
  base: {
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
});

export default OverlineLabel;
