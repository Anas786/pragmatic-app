import React, { FC, useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet } from 'react-native';
import { radius as radiusTokens, useScheme } from 'src/theme';

type RadiusKey = keyof typeof radiusTokens;

interface SkeletonProps {
  width: DimensionValue;
  height: number;
  radius?: RadiusKey | number;
}

/**
 * Animated shimmer loader — replaces `ActivityIndicator` for
 * content-loading states so the layout doesn't shift when data arrives.
 */
const Skeleton: FC<SkeletonProps> = ({ width, height, radius = 'sm' }) => {
  const scheme = useScheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse opacity (native-driver capable) rather than interpolating
    // backgroundColor (which forces useNativeDriver:false → a JS-thread
    // loop per skeleton). Many skeletons mount at once during load — the
    // exact moment the JS thread is already busy — so keep this on the
    // UI thread.
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    return () => anim.stopAnimation();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const borderRadius =
    typeof radius === 'number' ? radius : radiusTokens[radius];

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
          backgroundColor: scheme.skeletonHighlight,
          opacity,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

export default Skeleton;
