/**
 * PickerSheet — shared bottom-sheet shell used by the date / month /
 * year pickers. Slides up from the bottom (modern mobile pattern,
 * less disruptive than a centre modal), with a drag-handle, title,
 * close button, body slot and Cancel / Apply footer.
 *
 * Visual language:
 *   - Soft top corners (radius.2xl) so it reads as a sheet, not a card
 *   - Drag handle pill for affordance
 *   - Cancel = text button. Apply = brand-filled pill.
 *
 * Built on React Native's **core** `Modal` + a Reanimated slide/fade,
 * NOT `react-native-modal`. Under the New Architecture (Fabric) the
 * latter double-presents the sheet (it animates in twice on a single
 * open); the core Modal is stable. The slide-in/out + backdrop fade is
 * driven by a single shared `progress` value, and the component stays
 * mounted through the exit animation so the close still animates.
 *
 * The sheet doesn't own picker state — callers manage their own
 * temp state and pass it to `onApply`.
 */

import React, { FC, ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  AppText,
  PressableScale,
} from 'src/components/common';
import {
  duration as durationTokens,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { FONT_SIZE_MD, FONT_SIZE_XS, ICON_SIZE_XS } from 'src/utils';
import { Close } from 'src/assets/icons';

interface PickerSheetProps {
  visible: boolean;
  title: string;
  /** Optional subtitle under the title (e.g. range hint). */
  subtitle?: string;
  onCancel: () => void;
  onApply: () => void;
  /** Disable the Apply button (e.g. range not yet complete). */
  applyDisabled?: boolean;
  /** Override the Apply button label. */
  applyLabel?: string;
  children: ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;

const PickerSheet: FC<PickerSheetProps> = ({
  visible,
  title,
  subtitle,
  onCancel,
  onApply,
  applyDisabled = false,
  applyLabel = 'Apply',
  children,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Keep the Modal mounted through the slide-out so the exit animates.
  const [mounted, setMounted] = useState(visible);
  // Measured sheet height → how far to translate it off-screen at rest.
  const [sheetH, setSheetH] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: durationTokens.base });
    } else {
      progress.value = withTiming(
        0,
        { duration: durationTokens.base },
        finished => {
          if (finished) runOnJS(setMounted)(false);
        },
      );
    }
    // progress is a stable shared value; only react to `visible`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (sheetH || SCREEN_H) }],
  }));

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Close picker">
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[themed.sheet, sheetStyle]}
          onLayout={e => setSheetH(e.nativeEvent.layout.height)}>
          <View style={themed.handle} />

          <View style={themed.header}>
            <View style={themed.headerText}>
              <AppText fontSize={FONT_SIZE_MD} bold color={scheme.textPrimary}>
                {title}
              </AppText>
              {subtitle ? (
                <AppText
                  fontSize={FONT_SIZE_XS}
                  color={scheme.textSecondary}
                  numberOfLines={1}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <PressableScale
              onPress={onCancel}
              haptic="tap"
              scaleTo={0.9}
              style={themed.closeButton}
              accessibilityLabel="Close picker">
              <Close size={ICON_SIZE_XS} color={scheme.textSecondary} />
            </PressableScale>
          </View>

          <View style={themed.body}>{children}</View>

          <View style={themed.footer}>
            <PressableScale
              onPress={onCancel}
              haptic="tap"
              scaleTo={0.97}
              style={themed.cancelButton}
              accessibilityLabel="Cancel">
              <AppText
                fontSize={FONT_SIZE_XS}
                semi_bold
                color={scheme.textSecondary}>
                Cancel
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={onApply}
              haptic="select"
              scaleTo={0.97}
              disabled={applyDisabled}
              style={[
                themed.applyButton,
                applyDisabled ? themed.applyDisabled : null,
              ]}
              accessibilityLabel={applyLabel}>
              <AppText fontSize={FONT_SIZE_XS} bold color={scheme.textOnBrand}>
                {applyLabel}
              </AppText>
            </PressableScale>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
PickerSheet.displayName = 'PickerSheet';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: scheme.surface,
      borderTopLeftRadius: radiusTokens['2xl'],
      borderTopRightRadius: radiusTokens['2xl'],
      paddingBottom: space.xl,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: scheme.hairline,
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.xl,
      paddingTop: space.sm,
      paddingBottom: space.md,
      gap: space.md,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    closeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
    body: {
      paddingHorizontal: space.xl,
      paddingVertical: space.md,
      gap: space.lg,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: space.sm,
      paddingHorizontal: space.xl,
      paddingTop: space.md,
    },
    cancelButton: {
      paddingHorizontal: space.xl,
      paddingVertical: 12,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyButton: {
      paddingHorizontal: space['2xl'],
      paddingVertical: 12,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: scheme.brand,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    applyDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
      elevation: 0,
    },
  });

export default PickerSheet;
