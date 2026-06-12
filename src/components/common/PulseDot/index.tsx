import React, { FC, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { duration } from 'src/theme';

interface PulseDotProps {
  color: string;
  size?: number;
}

/**
 * Pulsing brand-coloured dot for LIVE indicators.
 *
 * Uses an infinite scale + opacity loop driven on the UI thread via
 * Reanimated 3 shared values — no JS involvement after mount, so this
 * is free at 60fps even when 100+ tiles are on screen.
 *
 * The loops only run while the owning screen is focused: infinite
 * `withRepeat`s otherwise keep ticking on the UI thread behind covered
 * screens (CPU drain / device heat). PulseDot is only ever rendered
 * inside navigator screens, so `useIsFocused` is safe here.
 */
const PulseDot: FC<PulseDotProps> = ({ color, size = 8 }) => {
  const isFocused = useIsFocused();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

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

  return (
    <Animated.View
      style={[
        style,
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  dot: {
    flexShrink: 0,
  },
});

export default PulseDot;
