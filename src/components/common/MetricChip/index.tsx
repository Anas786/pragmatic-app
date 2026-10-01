import React, { FC, memo, ReactNode, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radius as radiusTokens, space } from 'src/theme';
import { FONT_SIZE_SM, FONT_SIZE_XXS } from 'src/utils/theme';
import { resolveCardColor, shortSourceLabel } from 'src/utils/sources';
import { formatQuantity } from 'src/utils/units';
import { ISiteCard } from 'src/types';
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
  children: ReactNode;
}

/** Backend-derived label: original case, no tracking (never uppercased —
 *  see the heading-pattern rule), 1 line. */
export const ChipLabel: FC<ChipLabelProps> = ({ color, children }) => (
  <AppText fontSize={FONT_SIZE_XXS} color={color} medium numberOfLines={1}>
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
  card: ISiteCard;
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
 * Compact metric tile: source dot + label, the value via `formatQuantity`
 * (compact: '15.6 MWh', never 'K' next to a unit; '—' with no unit when
 * the backend sends 'NA'), and an optional share bar. Colour lives on the
 * dot and bar only — every text uses an ink role.
 */
const MetricChip: FC<MetricChipProps> = memo(
  ({
    card,
    percent,
    surfaceColor,
    trackColor,
    textPrimary,
    textSecondary,
    textTertiary,
  }) => {
    const sourceColor = resolveCardColor(card);
    const label = shortSourceLabel(card.name);
    const q = formatQuantity(card.value, card.unit, { mode: 'compact' });
    const hasPercent = (percent ?? 0) > 0 && trackColor !== undefined;
    return (
      <Chip surfaceColor={surfaceColor}>
        <ChipHeader>
          <Dot color={sourceColor} size={8} />
          <ChipLabel color={textSecondary}>{label}</ChipLabel>
        </ChipHeader>
        <ChipValueRow>
          <AppText
            fontSize={FONT_SIZE_SM}
            bold
            color={q.isMissing ? textTertiary : textPrimary}
            numberOfLines={1}>
            {q.text}
          </AppText>
          {q.unit ? (
            <AppText fontSize={FONT_SIZE_XXS} color={textSecondary}>
              {q.unit}
            </AppText>
          ) : null}
        </ChipValueRow>
        {hasPercent && percent !== undefined && trackColor ? (
          <>
            <ProgressBar
              color={sourceColor}
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
