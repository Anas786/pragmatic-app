import React, { FC, ReactNode, useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  AppText,
  createBox,
  IconButton,
  PressableScale,
} from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { ICON_SIZE_MD, ICON_SIZE_XS } from 'src/utils';
import { CalendarIcon, RefreshIcon } from 'src/assets/icons';

interface DateFilterHeaderProps {
  /** Section title — a sentence-case heading ('Energy mix'). Backend
   *  headings (Trends) are passed through in their own case. */
  title: string;
  /** Optional secondary line under the title. */
  caption?: string;
  /** Pre-formatted period label inside the date pill. */
  dateLabel: string;
  /** Spoken period when the visible label is abbreviated. */
  dateA11yLabel?: string;
  /** Tap handler for the date pill. */
  onDatePress: () => void;
  /** When true (Lifetime filter), the pill is non-interactive. */
  pillDisabled?: boolean;
  /** 'pill' (default) — tappable date pill; 'caption' — the period is
   *  shown as plain text under the title, with no picker affordance. */
  datePillMode?: 'pill' | 'caption';
  /** Tap handler for the refresh button. Hidden when omitted. */
  onRefresh?: () => void;
  /** Spinner + busy state on the refresh button while refetching. */
  refreshing?: boolean;
  /** Extra trailing control(s), placed before the refresh button. */
  right?: ReactNode;
}

/**
 * Section header for time-filtered cards (Reports, Tables, Trends):
 *
 *   Energy mix                     [📅 1 – 30 Sep 2026 ▾] (⟳)
 *   optional caption
 *
 * The title is a real heading (role 'header'). The date pill reads
 * 'Date range, <label>' with the hint 'Opens date picker' and carries a
 * chevron while it can open one; on Lifetime it is disabled (no chevron).
 * Refresh is a soft IconButton with a busy state.
 */
const DateFilterHeader: FC<DateFilterHeaderProps> = ({
  title,
  caption,
  dateLabel,
  dateA11yLabel,
  onDatePress,
  pillDisabled = false,
  datePillMode = 'pill',
  onRefresh,
  refreshing = false,
  right,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const datePillStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.datePill,
        pillDisabled ? styles.datePillDisabled : null,
      ]),
    [themed.datePill, pillDisabled],
  );
  const spokenDate = dateA11yLabel ?? dateLabel;
  const asCaption = datePillMode === 'caption';

  return (
    <Header>
      <TitleColumn>
        <AppText variant="h3" accessibilityRole="header" numberOfLines={2}>
          {title}
        </AppText>
        {caption ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {caption}
          </AppText>
        ) : null}
        {asCaption ? (
          <AppText
            variant="caption"
            tone="secondary"
            numberOfLines={1}
            accessibilityLabel={`Date range, ${spokenDate}`}>
            {dateLabel}
          </AppText>
        ) : null}
      </TitleColumn>

      <Actions>
        {asCaption ? null : (
          <PressableScale
            onPress={onDatePress}
            scaleTo={0.96}
            disabled={pillDisabled}
            hitSlop={PILL_HIT_SLOP}
            style={datePillStyle}
            accessibilityLabel={`Date range, ${spokenDate}`}
            accessibilityHint={pillDisabled ? undefined : 'Opens date picker'}>
            <CalendarIcon size={ICON_SIZE_XS} color={scheme.brandText} />
            <AppText variant="caption" medium numberOfLines={1} style={styles.dateText}>
              {dateLabel}
            </AppText>
            {pillDisabled ? null : (
              <Icon name="expand-more" size={16} color={scheme.textSecondary} />
            )}
          </PressableScale>
        )}

        {right ?? null}

        {onRefresh ? (
          <IconButton
            variant="soft"
            onPress={onRefresh}
            disabled={refreshing}
            busy={refreshing}
            accessibilityLabel="Refresh">
            {refreshing ? (
              <ActivityIndicator size="small" color={scheme.brandText} />
            ) : (
              <RefreshIcon size={ICON_SIZE_MD} color={scheme.brandText} />
            )}
          </IconButton>
        ) : null}
      </Actions>
    </Header>
  );
};

/** Tops the 36pt pill up to the platform minimum target. */
const PILL_HIT_SLOP = {
  top: Math.max(0, Math.ceil((touch.min - touch.pillVisual) / 2)),
  bottom: Math.max(0, Math.ceil((touch.min - touch.pillVisual) / 2)),
  left: 0,
  right: 0,
};

const Header = createBox(
  StyleSheet.create({
    s: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.xs,
      paddingBottom: space.sm,
      gap: space.sm,
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
      gap: space.xs,
      flexShrink: 1,
    },
  }).s,
  'Actions',
);

const styles = StyleSheet.create({
  datePillDisabled: {
    opacity: 0.7,
  },
  dateText: {
    flexShrink: 1,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    datePill: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: touch.pillVisual,
      maxWidth: 220,
      borderWidth: 1,
      borderRadius: radiusTokens.pill,
      paddingHorizontal: space.md,
      gap: 6,
      backgroundColor: scheme.surfaceMuted,
      borderColor: scheme.border,
    },
  });

export default DateFilterHeader;
