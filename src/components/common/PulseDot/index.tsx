import React, { FC, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
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
 */
const PulseDot: FC<PulseDotProps> = ({ color, size = 8 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
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
  }, [scale, opacity]);

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
