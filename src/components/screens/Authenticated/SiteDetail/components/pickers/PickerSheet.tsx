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
 * The sheet doesn't own picker state — callers manage their own
 * temp state and pass it to `onApply`.
 */

import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
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

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onCancel}
      onBackButtonPress={onCancel}
      onSwipeComplete={onCancel}
      swipeDirection={['down']}
      propagateSwipe
      backdropOpacity={0.55}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={durationTokens.base}
      animationOutTiming={durationTokens.base}
      useNativeDriverForBackdrop
      style={themed.modal}>
      <View style={themed.sheet}>
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
      </View>
    </Modal>
  );
};
PickerSheet.displayName = 'PickerSheet';

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: 'flex-end',
    },
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
