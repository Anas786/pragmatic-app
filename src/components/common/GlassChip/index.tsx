import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { glass, radius as radiusTokens, space } from 'src/theme';

interface GlassChipProps {
  children: ReactNode;
  /** Increase padding for chips that hold longer content. */
  size?: 'sm' | 'md';
  /** Center the chip's child horizontally. Useful for single-number
   *  count chips like `Σ 5`. */
  alignCenter?: boolean;
  /** Override min-width — useful when the chip needs to be a fixed
   *  slot (e.g. param-count chips that show 1-3 digits). */
  minWidth?: number;
  /** Extra style override (border-radius, margin, etc.). */
  style?: ViewStyle;
}

/**
 * Translucent white "glass" chip used on saturated/colored hero
 * backgrounds — count chips, period chips (e.g. TODAY), small icon
 * wells. Background + border use the `glass` token scale so they
 * read consistently against every gradient variant (brand, danger).
 *
 * For text colour, the caller passes `color={scheme.heroOnGradient}`
 * on its `<AppText>` child — the chip itself is just the surround.
 */
const GlassChip: FC<GlassChipProps> = ({
  children,
  size = 'sm',
  alignCenter = true,
  minWidth = 30,
  style,
}) => {
  const merged = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.base,
        size === 'md' ? styles.md : styles.sm,
        alignCenter ? styles.centered : null,
        { minWidth },
        style,
      ]) as ViewStyle,
    [size, alignCenter, minWidth, style],
  );
  return <View style={merged}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radiusTokens.pill,
    backgroundColor: glass.medium,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    flexShrink: 0,
  },
  sm: {
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  md: {
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  centered: {
    justifyContent: 'center',
  },
});

export default GlassChip;
