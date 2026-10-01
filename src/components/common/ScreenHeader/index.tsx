import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Back } from 'src/assets/icons';
import { Scheme, space, touch, useScheme, useThemedStyles } from 'src/theme';
import { ICON_SIZE_LG } from 'src/utils/theme';
import AppText from '../AppText';
import IconButton from '../IconButton';

export interface ScreenHeaderProps {
  title: string;
  /** Second line under the title — a string renders as a caption; any
   *  node (e.g. `<FreshnessStatus/>`) renders as-is. */
  subtitle?: ReactNode;
  /** Renders the standard Back button (label 'Back') in the left slot. */
  onBack?: () => void;
  /** Replaces the left slot entirely (wins over `onBack`). */
  left?: ReactNode;
  /** Right slot — e.g. a refresh `IconButton`. */
  right?: ReactNode;
  /** Before the title (e.g. a `SiteLogo`), mainly for align='left'. */
  leading?: ReactNode;
  /** 'center' (info screens, default) or 'left' (SiteDetail). */
  align?: 'center' | 'left';
  /** Spoken title when the visible one is abbreviated. */
  titleAccessibilityLabel?: string;
  testID?: string;
}

/**
 * The stack-screen header: scheme.bg background (no colour seam under the
 * status bar), hairline bottom border, ≥44pt leading/trailing slots, a
 * Back button labelled 'Back', and a title with the 'header' role.
 *
 * With align='center' the two side slots are given equal flex so the
 * title stays optically centred whatever sits on either side.
 */
const ScreenHeader: FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  left,
  right,
  leading,
  align = 'center',
  titleAccessibilityLabel,
  testID,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const centered = align === 'center';

  const leftNode =
    left ??
    (onBack ? (
      <IconButton
        onPress={onBack}
        accessibilityLabel="Back"
        testID={testID ? `${testID}-back` : undefined}>
        <Back size={ICON_SIZE_LG} color={scheme.textPrimary} />
      </IconButton>
    ) : null);

  return (
    <View style={themed.bar} testID={testID}>
      {centered || leftNode ? (
        <View
          style={[styles.slot, styles.slotLeft, centered ? styles.slotFlex : null]}
          testID={testID ? `${testID}-left` : undefined}>
          {leftNode}
        </View>
      ) : null}

      <View style={[styles.titleRow, centered ? styles.titleCentered : styles.titleLeft]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={centered ? styles.titleColCentered : styles.titleColLeft}>
          <AppText
            variant="h3"
            numberOfLines={1}
            center={centered}
            accessibilityRole="header"
            accessibilityLabel={titleAccessibilityLabel}>
            {title}
          </AppText>
          {typeof subtitle === 'string' ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1} center={centered}>
              {subtitle}
            </AppText>
          ) : (
            subtitle ?? null
          )}
        </View>
      </View>

      {centered || right ? (
        <View
          style={[styles.slot, styles.slotRight, centered ? styles.slotFlex : null]}
          testID={testID ? `${testID}-right` : undefined}>
          {right ?? null}
        </View>
      ) : null}
    </View>
  );
};
ScreenHeader.displayName = 'ScreenHeader';

const styles = StyleSheet.create({
  slot: {
    minWidth: touch.min,
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotFlex: {
    // Equal basis + grow on both sides keeps the title centred; each side
    // still shrinks no smaller than one touch target.
    flexGrow: 1,
    flexBasis: 0,
  },
  slotLeft: { justifyContent: 'flex-start' },
  slotRight: { justifyContent: 'flex-end' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  titleCentered: {
    justifyContent: 'center',
    maxWidth: '70%',
  },
  titleLeft: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: space.xs,
  },
  leading: {
    flexShrink: 0,
  },
  titleColCentered: {
    flexShrink: 1,
    alignItems: 'center',
  },
  titleColLeft: {
    flex: 1,
    minWidth: 0,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 52,
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      backgroundColor: scheme.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: scheme.hairline,
    },
  });

export default ScreenHeader;
