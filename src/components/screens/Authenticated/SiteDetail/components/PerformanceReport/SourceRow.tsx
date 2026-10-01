import React, { FC, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Dot } from 'src/components/common';
import { radius as radiusTokens, Scheme, space, useThemedStyles } from 'src/theme';
import { formatEnergy } from 'src/utils/units';
import { metricA11yLabel } from 'src/utils/a11y';
import {
  AggregatedSource,
  formatSharePercent,
  SHARE_UNAVAILABLE,
  sourceSecondaryLabel,
  spokenSharePercent,
} from './helpers';

interface SourceRowProps {
  item: AggregatedSource;
  /**
   * `false` when the report total isn't positive (`sharesAvailable`): the
   * share reads '—' instead of the uncomputed '0%'. Defaults to `true`.
   */
  shareAvailable?: boolean;
}

/**
 * One row of the Reports "Sources" list — a read-only fact, not a control:
 *
 *   ● Solar                              450.7 MWh   100%
 *     Solar Production Today System
 *     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ (share bar)
 *
 * Short canonical label (SemiBold 14), the backend mapping label as a
 * secondary caption in its own case (trailing '(kWh)' stripped — the unit
 * sits next to the value), value via `formatEnergy` precise / 1 decimal,
 * right-aligned share and a 3pt share bar in the source colour. ONE
 * accessible element ('Solar, 450.7 megawatt hours, 100 percent, …').
 */
const SourceRowBase: FC<SourceRowProps> = ({ item, shareAvailable = true }) => {
  const themed = useThemedStyles(createThemedStyles);
  const q = formatEnergy(item.value, { mode: 'precise', decimals: 1 });
  const secondary = sourceSecondaryLabel(item);
  const share = shareAvailable ? formatSharePercent(item.percentNum) : SHARE_UNAVAILABLE;
  const a11yLabel = metricA11yLabel(item.shortLabel, q, [
    shareAvailable
      ? `${spokenSharePercent(item.percentNum)} of total`
      : 'share of total not available',
    secondary ?? '',
  ]);

  // Static width share (never animated → no layout animation). Clamped:
  // a negative source (export) draws an empty bar, never a reversed one.
  const clamped = Math.max(0, Math.min(100, item.percentNum));
  const fillStyle = useMemo(
    () => [themed.fill, { width: `${clamped}%` as const, backgroundColor: item.color }],
    [themed.fill, clamped, item.color],
  );

  return (
    <View style={styles.row} accessible accessibilityLabel={a11yLabel}>
      <View style={styles.top}>
        <Dot color={item.color} size={10} style={styles.dot} />
        <View style={styles.labels}>
          <AppText variant="body" semi_bold numberOfLines={1}>
            {item.shortLabel}
          </AppText>
          {secondary ? (
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {secondary}
            </AppText>
          ) : null}
        </View>
        <View style={styles.valueRow}>
          <AppText variant="body" semi_bold numberOfLines={1}>
            {q.text}
          </AppText>
          {q.unit ? (
            <AppText variant="caption" tone="secondary">
              {q.unit}
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodySm" medium tone="secondary" numberOfLines={1} style={styles.share}>
          {share}
        </AppText>
      </View>
      <View style={themed.track}>
        <View style={fillStyle} />
      </View>
    </View>
  );
};
SourceRowBase.displayName = 'SourceRow';

const SourceRow = memo(SourceRowBase);

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  dot: {
    // Optically centre the dot on the first (14/20) text line.
    marginTop: 5,
  },
  labels: {
    flex: 1,
    minWidth: 0,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    flexShrink: 0,
  },
  share: {
    minWidth: 48,
    textAlign: 'right',
    // Same 20pt line as the value so both share one baseline row.
    lineHeight: 20,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    track: {
      height: 3,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
      overflow: 'hidden',
    },
    fill: {
      height: 3,
      borderRadius: radiusTokens.pill,
    },
  });

export default SourceRow;
