import React, { FC, useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { AppText, createBox, PressableScale } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  ICON_SIZE_XS,
} from 'src/utils';
import { CalendarIcon, RefreshIcon } from 'src/assets/icons';

interface DateFilterHeaderProps {
  /** Section title — rendered as a small overline label above the row. */
  title: string;
  /** Pre-formatted label inside the date pill. */
  dateLabel: string;
  /** Tap handler for the date pill. */
  onDatePress: () => void;
  /** When true (Lifetime filter), the pill is non-interactive. */
  pillDisabled?: boolean;
  /** Tap handler for the refresh button. Hidden when omitted. */
  onRefresh?: () => void;
  /** Show a spinner inside the refresh button while a refetch is in flight. */
  refreshing?: boolean;
  /** Optional secondary line — small caption under the title (e.g. "Live"). */
  caption?: string;
}

const DateFilterHeader: FC<DateFilterHeaderProps> = ({
  title,
  dateLabel,
  onDatePress,
  pillDisabled = false,
  onRefresh,
  refreshing = false,
  caption,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const datePillStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.datePill,
        pillDisabled ? styles.dateRangeContainerDisabled : null,
      ]),
    [themed.datePill, pillDisabled],
  );

  return (
    <Header>
      <TitleColumn>
        <AppText
          fontSize={FONT_SIZE_XXS}
          color={scheme.textTertiary}
          medium
          style={styles.overline}
          numberOfLines={1}>
          {title}
        </AppText>
        {caption ? (
          <AppText
            fontSize={FONT_SIZE_XS}
            color={scheme.textSecondary}
            numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </TitleColumn>

      <Actions>
        <PressableScale
          onPress={onDatePress}
          haptic="select"
          scaleTo={0.96}
          disabled={pillDisabled}
          style={datePillStyle}
          accessibilityLabel="Pick date filter"
          accessibilityHint="Opens the date filter picker">
          <CalendarIcon size={ICON_SIZE_XS} color={scheme.brand} />
          <AppText
            fontSize={FONT_SIZE_XS}
            medium
            color={scheme.textPrimary}
            numberOfLines={1}>
            {dateLabel}
          </AppText>
        </PressableScale>

        {onRefresh ? (
          <PressableScale
            onPress={onRefresh}
            haptic="tap"
            disabled={refreshing}
            style={themed.refreshButton}
            accessibilityLabel="Refresh">
            {refreshing ? (
              <ActivityIndicator size="small" color={scheme.brand} />
            ) : (
              <RefreshIcon size={ICON_SIZE_MD} color={scheme.brand} />
            )}
          </PressableScale>
        ) : null}
      </Actions>
    </Header>
  );
};

const Header = createBox(
  StyleSheet.create({
    s: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.xs,
      paddingBottom: space.sm,
      gap: space.md,
    },
  }).s,
  'Header',
);

const TitleColumn = createBox(
  StyleSheet.create({
    s: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
  }).s,
  'TitleColumn',
);

const Actions = createBox(
  StyleSheet.create({
    s: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      flexShrink: 0,
    },
  }).s,
  'Actions',
);

const styles = StyleSheet.create({
  overline: {
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  dateRangeContainerDisabled: {
    opacity: 0.55,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    datePill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: radiusTokens.pill,
      paddingHorizontal: space.md,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: scheme.surfaceMuted,
      borderColor: scheme.border,
    },
    refreshButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brandSoft,
    },
  });

// Suppress unused-import warning for FONT_SIZE_SM (kept available for
// future caller variants).
void FONT_SIZE_SM;

export default DateFilterHeader;
