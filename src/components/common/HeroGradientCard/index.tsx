import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  glass,
  radius as radiusTokens,
  space,
  useScheme,
} from 'src/theme';

export type HeroVariant = 'brand' | 'danger';

interface HeroGradientCardProps {
  children: ReactNode;
  /** Selects the 3-stop gradient palette. */
  variant?: HeroVariant;
  /** Hide the diagonal sheen overlay (rarely needed). */
  hideSheen?: boolean;
  /** Custom padding override — defaults to `space.xl`. */
  padding?: number;
  /** Outer wrapper style (e.g. marginBottom). */
  style?: ViewStyle;
}

const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;
const SHEEN_END = { x: 1, y: 0.6 } as const;

/**
 * The premium 3-layer gradient card used as the "snapshot" hero on
 * every redesigned tab (Cards, Alarms, Tables, Reports, Summary).
 *
 * Three layers because of two iOS constraints:
 *   1. `overflow: hidden` clips the shadow if applied to the same View
 *      that owns the shadow → split into `heroShadow` (no overflow)
 *      and `heroClip` (overflow:hidden).
 *   2. LinearGradient's intrinsic height calc is unreliable when it
 *      wraps complex flex children. Putting the gradient inside as
 *      `absoluteFillObject` and letting a regular `<View>` own the
 *      layout sidesteps the bug.
 *
 * Variants:
 *  - `brand` (default) — emerald gradient + brand glow.
 *  - `danger` — saturated-rose gradient + danger glow (Alarms).
 */
const HeroGradientCard: FC<HeroGradientCardProps> = ({
  children,
  variant = 'brand',
  hideSheen = false,
  padding = space.xl,
  style,
}) => {
  const scheme = useScheme();

  const gradientColors =
    variant === 'danger' ? scheme.heroDangerGradient : scheme.heroGradient;
  const glowColor =
    variant === 'danger' ? scheme.heroDangerGlow : scheme.heroGlow;

  const shadowStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.shadow,
        { shadowColor: glowColor },
        style,
      ]) as ViewStyle,
    [glowColor, style],
  );
  const contentStyle = useMemo<ViewStyle>(() => ({ padding }), [padding]);

  return (
    <View style={shadowStyle}>
      <View style={styles.clip}>
        <LinearGradient
          colors={gradientColors}
          start={GRADIENT_TL}
          end={GRADIENT_BR}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        {!hideSheen ? (
          <LinearGradient
            colors={[glass.low, glass.transparent]}
            start={GRADIENT_TL}
            end={SHEEN_END}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        ) : null}
        <View style={contentStyle}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadow: {
    borderRadius: radiusTokens['2xl'],
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  clip: {
    borderRadius: radiusTokens['2xl'],
    overflow: 'hidden',
  },
});

export default HeroGradientCard;
