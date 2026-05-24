import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import AppText from '../AppText';
import { FONT_SIZE_XXS } from 'src/utils';

interface OverlineLabelProps {
  children: ReactNode;
  color: string;
  /** Custom font-size override. Defaults to `FONT_SIZE_XXS` (10pt). */
  fontSize?: number;
  /** Pass-through `numberOfLines` (defaults to 1 — overlines should
   *  never wrap). */
  numberOfLines?: number;
  /** Optional caller-provided extra style — merged after the base. */
  style?: TextStyle;
}

/**
 * The small uppercase, tracked label used as a section heading across
 * every hero and section card in the redesigned UI ("POWER MIX",
 * "TOTAL LOAD", "PLANT YIELD", "DISTRIBUTION", etc.).
 */
const OverlineLabel: FC<OverlineLabelProps> = ({
  children,
  color,
  fontSize = FONT_SIZE_XXS,
  numberOfLines = 1,
  style,
}) => {
  const merged = useMemo<TextStyle>(
    () => StyleSheet.flatten([styles.base, style]) as TextStyle,
    [style],
  );
  return (
    <AppText
      fontSize={fontSize}
      bold
      color={color}
      numberOfLines={numberOfLines}
      style={merged}>
      {children}
    </AppText>
  );
};

const styles = StyleSheet.create({
  base: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default OverlineLabel;
