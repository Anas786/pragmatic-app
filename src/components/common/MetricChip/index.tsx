import React, { FC, memo, ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius as radiusTokens, space } from 'src/theme';
import { FONT_SIZE_SM, FONT_SIZE_XXS } from 'src/utils/theme';
import type { FormattedQuantity } from 'src/utils/units';
import AppText from '../AppText';
import Dot from '../Dot';

interface ChipProps {
  surfaceColor: string;
  children?: ReactNode;
}

export const Chip: FC<ChipProps> = ({ surfaceColor, children }) => {
  const chipStyle = useMemo<ViewStyle>(
    () => StyleSheet.flatten([styles.chip, { backgroundColor: surfaceColor }]),
    [surfaceColor],
  );
  return <View style={chipStyle}>{children}</View>;
};
Chip.displayName = 'Chip';

export const ChipHeader: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.chipHeader}>{children}</View>
);
ChipHeader.displayName = 'ChipHeader';

export const ChipValueRow: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.chipValueRow}>{children}</View>
);
ChipValueRow.displayName = 'ChipValueRow';

interface ChipLabelProps {
  color: string;
  /** Upper-case the label — only for app vocabulary ('GRID'); backend
   *  names keep their own case. Default false. */
  uppercase?: boolean;
  children: ReactNode;
}

/** Small tracked chip label: 1 line for app vocabulary ('GRID'); a
 *  backend name ('Grid Export Today') may wrap to 2 so it stays readable. */
export const ChipLabel: FC<ChipLabelProps> = ({ color, uppercase = false, children }) => (
  <AppText
    fontSize={FONT_SIZE_XXS}
    color={color}
    medium
    numberOfLines={uppercase ? 1 : 2}
    style={uppercase ? styles.chipLabelUpper : styles.chipLabel}>
    {children}
  </AppText>
);
ChipLabel.displayName = 'ChipLabel';

interface ChipBarTrackProps {
  trackColor: string;
  children?: ReactNode;
}

const ChipBarTrack: FC<ChipBarTrackProps> = ({ trackColor, children }) => {
  const trackStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.chipBarTrack,
        { backgroundColor: trackColor },
      ]),
    [trackColor],
  );
  return <View style={trackStyle}>{children}</View>;
};

interface ChipBarFillProps {
  color: string;
  percent: number;
}

const ChipBarFill: FC<ChipBarFillProps> = ({ color, percent }) => {
  const fillStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.chipBarFill,
        {
          width: `${Math.max(2, Math.min(100, percent))}%`,
          backgroundColor: color,
        },
      ]),
    [percent, color],
  );
  return <View style={fillStyle} />;
};

interface ProgressBarProps {
  color: string;
  trackColor: string;
  percent: number;
}

export const ProgressBar: FC<ProgressBarProps> = memo(
  ({ color, trackColor, percent }) => (
    <ChipBarTrack trackColor={trackColor}>
      <ChipBarFill color={color} percent={percent} />
    </ChipBarTrack>
  ),
);
ProgressBar.displayName = 'ProgressBar';

interface MetricChipProps {
  /** Visible label, as the caller decided it (never re-derived here). */
  label: string;
  /** Upper-case `label` ('GRID') — pass true only for app vocabulary. */
  uppercaseLabel?: boolean;
  /** Dot / share-bar fill (an energy-palette or card accent colour). */
  color: string;
  /** The value, already formatted (`formatQuantity` compact) — rendered
   *  verbatim; a missing value is a muted '—' with no unit. */
  quantity: FormattedQuantity;
  /** Optional muted line under the value ('Today'), on its own line so a
   *  narrow chip never cuts it off with the label's ellipsis. */
  caption?: string;
  /** Source's share of total (0-100). Omit or pass 0 to hide the bar+label. */
  percent?: number;
  /** Required only when `percent > 0`. */
  trackColor?: string;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
}

/**
 * Compact metric tile: dot + small tracked label, a bold value with its
 * unit, and an optional share bar. Colour lives on the dot and bar only —
 * every text uses an ink role.
 */
const MetricChip: FC<MetricChipProps> = memo(
  ({
    label,
    uppercaseLabel = false,
    color,
    quantity,
    caption,
    percent,
    surfaceColor,
    trackColor,
    textPrimary,
    textSecondary,
    textTertiary,
  }) => {
    const hasPercent = (percent ?? 0) > 0 && trackColor !== undefined;
    return (
      <Chip surfaceColor={surfaceColor}>
        <ChipHeader>
          <Dot color={color} size={8} />
          <ChipLabel color={textTertiary} uppercase={uppercaseLabel}>
            {label}
          </ChipLabel>
        </ChipHeader>
        <ChipValueRow>
          <AppText
            fontSize={FONT_SIZE_SM}
            bold
            color={quantity.isMissing ? textTertiary : textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {quantity.text}
          </AppText>
          {quantity.unit ? (
            <AppText fontSize={FONT_SIZE_XXS} color={textSecondary}>
              {quantity.unit}
            </AppText>
          ) : null}
        </ChipValueRow>
        {caption ? (
          <AppText
            fontSize={FONT_SIZE_XXS}
            color={textTertiary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {caption}
          </AppText>
        ) : null}
        {hasPercent && percent !== undefined && trackColor ? (
          <>
            <ProgressBar
              color={color}
              trackColor={trackColor}
              percent={percent}
            />
            <AppText
              fontSize={FONT_SIZE_XXS}
              semi_bold
              color={textSecondary}
              numberOfLines={1}>
              {percent.toFixed(0)}%
            </AppText>
          </>
        ) : null}
      </Chip>
    );
  },
);
MetricChip.displayName = 'MetricChip';

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    minWidth: 0,
    flexBasis: '30%',
    borderRadius: radiusTokens.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: 6,
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipLabel: {
    flexShrink: 1,
    letterSpacing: 0.6,
  },
  chipLabelUpper: {
    flexShrink: 1,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chipValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  chipBarTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  chipBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default MetricChip;
