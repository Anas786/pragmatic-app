import React, { FC, useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { duration } from 'src/theme';

interface PulseDotProps {
  color: string;
  size?: number;
  /**
   * false → a plain static dot: no Reanimated values, no loop. Use it
   * whenever the data is not live (see the freshness model) — a pulse
   * claims "this is updating right now".
   */
  active?: boolean;
}

const useDotStyle = (color: string, size: number): ViewStyle =>
  useMemo(
    () => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: color }),
    [color, size],
  );

const StaticDot: FC<{ color: string; size: number }> = ({ color, size }) => {
  const dot = useDotStyle(color, size);
  return <View style={[styles.dot, dot]} />;
};

/**
 * The animated variant. Uses an infinite scale + opacity loop driven on
 * the UI thread via Reanimated 3 shared values — no JS involvement after
 * mount.
 *
 * The loops only run while the owning screen is focused: infinite
 * `withRepeat`s otherwise keep ticking on the UI thread behind covered
 * screens (CPU drain / device heat). Only rendered inside navigator
 * screens, so `useIsFocused` is safe here.
 */
const AnimatedPulse: FC<{ color: string; size: number }> = ({ color, size }) => {
  const isFocused = useIsFocused();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const dot = useDotStyle(color, size);

  useEffect(() => {
    if (!isFocused) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: duration.slow }),
        withTiming(1, { duration: duration.slow }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: duration.slow }),
        withTiming(1, { duration: duration.slow }),
      ),
      -1,
      false,
    );
    return () => {
      // Stop the infinite loops on blur/unmount and reset to the rest
      // state so the dot doesn't freeze mid-pulse.
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = 1;
      opacity.value = 1;
    };
  }, [isFocused, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[style, styles.dot, dot]} />;
};

/**
 * Brand-coloured dot for LIVE indicators. Pulses only when `active`
 * (default) and the OS "reduce motion" setting is off; otherwise renders
 * a static dot. At most one pulsing element per screen.
 */
const PulseDot: FC<PulseDotProps> = ({ color, size = 8, active = true }) => {
  const reduceMotion = useReducedMotion();
  return active && !reduceMotion ? (
    <AnimatedPulse color={color} size={size} />
  ) : (
    <StaticDot color={color} size={size} />
  );
};

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});

export default PulseDot;
