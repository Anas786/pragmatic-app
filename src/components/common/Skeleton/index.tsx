import React, { FC, useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
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
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    ).start();
    return () => anim.stopAnimation();
  }, [anim]);

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [scheme.skeletonBase, scheme.skeletonHighlight],
  });

  const borderRadius =
    typeof radius === 'number' ? radius : radiusTokens[radius];

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, backgroundColor: bg },
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
