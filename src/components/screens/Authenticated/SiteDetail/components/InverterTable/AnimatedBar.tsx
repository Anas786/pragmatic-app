import React, { FC, memo, useEffect, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { radius as radiusTokens } from 'src/theme';
import { BAR_ANIM_MS } from './helpers';

interface AnimatedBarProps {
  /** Fill share, 0–1 (clamped). */
  fraction: number;
  /**
   * Fill gradient, left → right (a `prBandPalette` FILL, never text ink).
   * It spans the FILLED width, like the web's `linear-gradient(90deg, …)`
   * on a `width: n%` bar. Pass a module-level/token array (stable ref).
   */
  colors: [string, string];
  trackColor: string;
  /** Fixed track width in pt — the scaleX origin maths depends on it. */
  width: number;
  height?: number;
  /**
   * Animate the fill in (rows below ANIM_LIMIT). The caller freezes this
   * at first mount, so a re-sort can't swap the hook set under a row.
   * When false the fill is a plain View: no shared value, no timer.
   */
  animate?: boolean;
  /** Entrance delay, ms (already capped by the caller). */
  delay?: number;
}

const clamp01 = (x: number): number => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

/** Horizontal gradient axis (module-level: stable props for the native view). */
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

/** The full-width gradient that the (scaled) fill wraps. */
const GradientFill: FC<{ colors: [string, string] }> = ({ colors }) => (
  <LinearGradient
    colors={colors}
    start={GRADIENT_START}
    end={GRADIENT_END}
    style={StyleSheet.absoluteFill}
  />
);

/**
 * Left-anchored scaleX: scaling happens about the centre, so shift left
 * by half the lost width. Pure arithmetic on the fixed `width` — no
 * dependency on `transformOrigin` support in the animated-props path.
 */
const leftAnchorShift = (scale: number, width: number): number => {
  'worklet';
  return -((1 - scale) * width) / 2;
};

interface AnimatedFillProps {
  fraction: number;
  colors: [string, string];
  width: number;
  delay: number;
  style: StyleProp<ViewStyle>;
}

const AnimatedFill: FC<AnimatedFillProps> = ({
  fraction,
  colors,
  width,
  delay,
  style,
}) => {
  const progress = useSharedValue(0);
  // The stagger delay applies to the entrance only; a later value change
  // (new period) re-targets the bar straight away.
  const entered = useRef(false);

  useEffect(() => {
    const timing = withTiming(fraction, {
      duration: BAR_ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
    progress.value = entered.current || delay <= 0 ? timing : withDelay(delay, timing);
    entered.current = true;
  }, [fraction, delay, progress]);

  // Transform ONLY (never width / layout props, never non-style props).
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [
        { translateX: leftAnchorShift(progress.value, width) },
        { scaleX: progress.value },
      ],
    }),
    [width],
  );

  return (
    <Animated.View style={[style, animatedStyle]}>
      <GradientFill colors={colors} />
    </Animated.View>
  );
};

/**
 * Small horizontal bar (PR / uptime per inverter). The fill is a
 * full-width gradient View scaled on X — a GPU transform, not a width
 * (layout) animation.
 */
const AnimatedBar: FC<AnimatedBarProps> = ({
  fraction,
  colors,
  trackColor,
  width,
  height = 4,
  animate = false,
  delay = 0,
}) => {
  const share = clamp01(fraction);

  const trackStyle = useMemo(
    () => [styles.track, { width, height, borderRadius: height / 2, backgroundColor: trackColor }],
    [width, height, trackColor],
  );
  const staticFillStyle = useMemo(
    () => [
      styles.fill,
      { transform: [{ translateX: leftAnchorShift(share, width) }, { scaleX: share }] },
    ],
    [share, width],
  );

  return (
    <View style={trackStyle}>
      {animate ? (
        <AnimatedFill
          fraction={share}
          colors={colors}
          width={width}
          delay={delay}
          style={styles.fill}
        />
      ) : (
        <View style={staticFillStyle}>
          <GradientFill colors={colors} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    borderRadius: radiusTokens.pill,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});

export default memo(AnimatedBar);
