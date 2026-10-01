import React, { FC, ReactNode, useCallback } from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  AccessibilityRole,
  AccessibilityValue,
  Insets,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { spring } from 'src/theme';
import { haptics } from 'src/utils/haptics';

export type PressableRole =
  | 'button'
  | 'tab'
  | 'radio'
  | 'link'
  | 'switch'
  | 'checkbox'
  | 'image'
  | 'none';

export interface PressableScaleProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  scaleTo?: number;
  disabled?: boolean;
  /**
   * Haptic on press. OFF by default: 'select' belongs to selection
   * changes (Pill / TabSelector fire it themselves) and success/error to
   * outcomes — never to every tap.
   */
  haptic?: boolean | keyof typeof haptics;
  style?: StyleProp<ViewStyle>;
  /** Hit-slop in points — uniform, or per side (e.g. vertical-only). */
  hitSlop?: number | Insets;
  /** Screen-reader role (default 'button'). */
  role?: PressableRole;
  /** Set false when an accessible ancestor already speaks for this. */
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityValue?: AccessibilityValue;
  accessibilityActions?: ReadonlyArray<AccessibilityActionInfo>;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  /** Selected state for segmented / toggle options (screen readers). */
  selected?: boolean;
  /** Disclosure state (expand/collapse toggles). */
  expanded?: boolean;
  /** In-flight state (e.g. a refresh button while refetching). */
  busy?: boolean;
  /** Checked state for checkbox / switch roles. */
  checked?: boolean | 'mixed';
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
 *
 * Every tappable in the app is one of these (or a primitive built on it)
 * with a role, a label containing its visible text, and its state.
 */
const PressableScale: FC<PressableScaleProps> = ({
  children,
  onPress,
  onLongPress,
  scaleTo = 0.96,
  disabled = false,
  haptic = false,
  style,
  hitSlop,
  role = 'button',
  accessible = true,
  accessibilityLabel,
  accessibilityHint,
  accessibilityValue,
  accessibilityActions,
  onAccessibilityAction,
  selected,
  expanded,
  busy,
  checked,
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

  // Deliberately NOT gated on `disabled`: if a parent flips `disabled` true
  // while the finger is down (e.g. a refetch flag landing mid-press), the
  // release's pressOut must still spring the scale back to 1 — otherwise the
  // control renders permanently shrunken. Springing to 1 is always safe.
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, spring.responsive);
  }, [scale]);

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
      hitSlop={hitSlop}
      accessible={accessible}
      accessibilityRole={role as AccessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityValue={accessibilityValue}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      accessibilityState={{ disabled, selected, expanded, busy, checked }}
      testID={testID}>
      {/* User style merged straight onto the animated view (animatedStyle
          last so the scale transform wins) — one fewer native view per
          tappable. */}
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
};

export default PressableScale;
