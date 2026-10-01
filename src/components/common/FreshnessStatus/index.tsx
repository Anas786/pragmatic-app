import React, { FC, memo, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useNow } from 'src/hooks/useNow';
import { useScheme } from 'src/theme';
import {
  freshnessDot,
  freshnessText,
  siteStatus,
} from 'src/utils/freshness';
import AppText from '../AppText';

export interface FreshnessStatusProps {
  /** Backend "last data" timestamp (epoch ms, numeric string, ISO…). */
  lastUpdate: unknown;
  /** Backend site state — /offline/i wins over the data age. */
  state?: string | null;
  /** 'status' → 'Live · 3 min ago'; 'updated' → 'Updated 3 min ago'. */
  variant?: 'status' | 'updated';
  /** Appended after a middot, e.g. '1.25 MW' → 'Live · 3 min ago · 1.25 MW'. */
  trailing?: string;
  /** 'sm' 12pt (default) · 'md' 13pt. */
  size?: 'sm' | 'md';
  /** On a hero gradient: muted-on-gradient text and gradient-safe dots. */
  onGradient?: boolean;
  testID?: string;
}

/**
 * Static status dot + label from the shared freshness model
 * (`utils/freshness.ts`). Never pulses — pulses are reserved for the one
 * live hero badge per screen. Subscribes to the shared `useNow` ticker
 * itself, so its age text moves on without re-rendering the parent.
 * One accessible element whose label is the spoken status.
 */
const FreshnessStatus: FC<FreshnessStatusProps> = ({
  lastUpdate,
  state,
  variant = 'status',
  trailing,
  size = 'sm',
  onGradient = false,
  testID,
}) => {
  const scheme = useScheme();
  const now = useNow();
  const status = siteStatus(state, lastUpdate, now);
  const text =
    variant === 'updated'
      ? freshnessText(status.level, status.ageMs, 'updated', now)
      : status.label;

  const dot = freshnessDot(status.level, scheme);
  let dotColor = dot.color;
  if (onGradient && (status.level === 'live' || dot.hollow)) {
    dotColor = status.level === 'live' ? scheme.heroOnGradient : scheme.heroOnGradientMuted;
  }
  const dotSize = size === 'md' ? 8 : 7;

  const dotStyle = useMemo<ViewStyle>(
    () =>
      dot.hollow
        ? {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            borderWidth: 1.5,
            borderColor: dotColor,
          }
        : {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
          },
    [dot.hollow, dotColor, dotSize],
  );

  const label = trailing ? `${text} · ${trailing}` : text;
  const spoken = trailing ? `${status.spoken}, ${trailing}` : status.spoken;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={spoken}
      testID={testID}>
      <View style={dotStyle} />
      <AppText
        variant={size === 'md' ? 'bodySm' : 'caption'}
        color={onGradient ? scheme.heroOnGradientMuted : scheme.textSecondary}
        numberOfLines={1}
        style={styles.text}>
        {label}
      </AppText>
    </View>
  );
};
FreshnessStatus.displayName = 'FreshnessStatus';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  text: {
    flexShrink: 1,
  },
});

export default memo(FreshnessStatus);
