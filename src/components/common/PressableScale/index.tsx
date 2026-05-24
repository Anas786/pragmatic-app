import React, { FC, ReactNode, useCallback } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { spring } from 'src/theme';
import { haptics } from 'src/utils/haptics';

interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  scaleTo?: number;
  disabled?: boolean;
  haptic?: boolean | keyof typeof haptics;
  style?: StyleProp<ViewStyle>;
  /** Hit-slop in points (uniform). */
  hitSlop?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Touchable that responds with a spring-based scale (no opacity drop).
 *
 * Built on RN's `Pressable` (not Gesture Handler) so it composes cleanly
 * with FlatList scroll, TextInput focus, sticky headers, and parent
 * scroll views. Spring is driven on the UI thread via Reanimated 3
 * shared values — feel is identical to a native gesture, but RN owns
 * the touch decision so nothing competes for the event.
 */
const PressableScale: FC<PressableScaleProps> = ({
  children,
  onPress,
  onLongPress,
  scaleTo = 0.96,
  disabled = false,
  haptic = true,
  style,
  hitSlop,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const scale = useSharedValue(1);

  const fireHaptic = useCallback(() => {
    if (!haptic) return;
    const fn = typeof haptic === 'string' ? haptics[haptic] : haptics.tap;
    fn?.();
  }, [haptic]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    fireHaptic();
    onPress?.();
  }, [disabled, onPress, fireHaptic]);

  const handleLongPress = useCallback(() => {
    if (disabled || !onLongPress) return;
    fireHaptic();
    onLongPress();
  }, [disabled, onLongPress, fireHaptic]);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(scaleTo, spring.responsive);
  }, [disabled, scale, scaleTo]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, spring.responsive);
  }, [disabled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      hitSlop={hitSlop ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}>
      <Animated.View style={animatedStyle}>
        <View style={style}>{children}</View>
      </Animated.View>
    </Pressable>
  );
};

export default PressableScale;
