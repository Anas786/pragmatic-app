import React, { FC, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BAR_ANIM_MS } from './helpers';

interface AnimatedBarProps {
  percent: number;
  color: string;
  trackColor: string;
  delay?: number;
}

const AnimatedBar: FC<AnimatedBarProps> = ({ percent, color, trackColor, delay = 0 }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const handle = setTimeout(() => {
      progress.value = withTiming(Math.max(0, Math.min(100, percent)), {
        duration: BAR_ANIM_MS,
        easing: Easing.out(Easing.cubic),
      });
    }, delay);
    return () => clearTimeout(handle);
  }, [percent, delay, progress]);

  const fillStyle = useAnimatedStyle(
    () => ({
      width: `${progress.value}%`,
      height: '100%',
      backgroundColor: color,
      borderRadius: 4,
    }),
    [color],
  );

  const trackStyle = useMemo(
    () => StyleSheet.flatten([styles.barTrack, { backgroundColor: trackColor }]),
    [trackColor],
  );

  return (
    <View style={trackStyle}>
      <Animated.View style={fillStyle} />
    </View>
  );
};

const styles = StyleSheet.create({
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default AnimatedBar;
