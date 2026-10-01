/**
 * PickerSheet — shared bottom-sheet shell used by the date / month /
 * year pickers. Slides up from the bottom (modern mobile pattern,
 * less disruptive than a centre modal), with a title, close button,
 * body slot and an Apply / Cancel footer.
 *
 * Visual language:
 *   - Soft top corners (radius.2xl) so it reads as a sheet, not a card
 *   - No drag handle — the sheet can't be dragged, so it isn't drawn
 *   - Apply = full-width 48pt brand button; Cancel = text button below it
 *   - The footer clears the home indicator / gesture bar
 *     (`insets.bottom + space.md`), so Apply is never in the swipe zone.
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

import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, PressableScale } from 'src/components/common';
import {
  duration as durationTokens,
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { ICON_SIZE_XS } from 'src/utils';
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

/** Visual diameter of the header close button. */
const CLOSE_SIZE = 32;
/** Tops the close button up to the platform minimum target. */
const CLOSE_SLOP = Math.max(0, Math.ceil((touch.min - CLOSE_SIZE) / 2));
const CLOSE_HIT_SLOP = { top: CLOSE_SLOP, bottom: CLOSE_SLOP, left: CLOSE_SLOP, right: CLOSE_SLOP };
/** Apply button height (≥ touch.min on both platforms). */
const APPLY_H = Math.max(48, touch.min);

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
  const insets = useSafeAreaInsets();
  const sheetStyleBase = useMemo(
    () => [themed.sheet, { paddingBottom: insets.bottom + space.md }],
    [themed.sheet, insets.bottom],
  );

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
        {/* Backdrop tap = Cancel. Hidden from screen readers — the sheet
            is modal for them and has its own Close / Cancel buttons. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
          accessible={false}
          importantForAccessibility="no">
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]} />
        </Pressable>

        <Animated.View
          style={[sheetStyleBase, sheetStyle]}
          accessibilityViewIsModal
          onLayout={e => setSheetH(e.nativeEvent.layout.height)}>
          <View style={themed.header}>
            <View style={themed.headerText}>
              <AppText variant="h3" accessibilityRole="header">
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" tone="secondary" numberOfLines={1}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            <PressableScale
              onPress={onCancel}
              scaleTo={0.9}
              hitSlop={CLOSE_HIT_SLOP}
              style={themed.closeButton}
              accessibilityLabel="Close picker">
              <Close size={ICON_SIZE_XS} color={scheme.textSecondary} />
            </PressableScale>
          </View>

          <View style={themed.body}>{children}</View>

          <View style={themed.footer}>
            <PressableScale
              onPress={onApply}
              scaleTo={0.98}
              disabled={applyDisabled}
              style={[
                themed.applyButton,
                applyDisabled ? themed.applyDisabled : null,
              ]}
              accessibilityLabel={applyLabel}>
              <AppText variant="body" semi_bold tone="onBrand">
                {applyLabel}
              </AppText>
            </PressableScale>
            <PressableScale
              onPress={onCancel}
              scaleTo={0.97}
              style={themed.cancelButton}
              accessibilityLabel="Cancel">
              <AppText variant="body" medium tone="secondary">
                Cancel
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
      paddingTop: space.md,
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
      width: CLOSE_SIZE,
      height: CLOSE_SIZE,
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
      gap: space.xs,
      paddingHorizontal: space.xl,
      paddingTop: space.md,
    },
    applyButton: {
      minHeight: APPLY_H,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space['2xl'],
    },
    applyDisabled: {
      opacity: 0.4,
    },
    cancelButton: {
      minHeight: touch.min,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      paddingHorizontal: space.xl,
    },
  });

export default PickerSheet;
