import React, { FC, memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from 'src/components/common';
import {
  ColorScheme,
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { prStatusFill, prStatusInk } from 'src/utils/colors';
import AnimatedBar from './AnimatedBar';
import {
  ANIM_LIMIT,
  InverterRowModel,
  MINI_BAR_W,
  STAGGER_CAP,
  STAGGER_MS,
  UptimeTone,
} from './helpers';

interface InverterRowProps {
  row: InverterRowModel;
  /** Position at FIRST mount — decides the entrance (frozen afterwards). */
  index: number;
  /** First row in the list: no hairline above it. */
  first: boolean;
}

const uptimeInk = (tone: UptimeTone, scheme: ColorScheme): string => {
  switch (tone) {
    case 'warning':
      return scheme.statusInk.warning;
    case 'danger':
      return scheme.statusInk.danger;
    case 'missing':
      return scheme.textTertiary;
    case 'normal':
    default:
      return scheme.textSecondary;
  }
};

/**
 * One inverter in the Tables list — a read-only fact, not a control
 * (~64–72pt, inside ONE Surface with hairline separators):
 *
 *   [ 1 ]  Inverter 1                        77.2%
 *          15.5 MWh · 4.96 kWh/kWp           ▬▬▬▬▬▬▭   (56pt PR bar)
 *                                            Up 100%
 *
 * Neutral number badge (energyPalette is energy-source only), PR in its
 * status ink over a semantic-fill mini bar, uptime caption toned by band.
 * A row without a PR shows a neutral 'No data' pill — never 'Poor'.
 * The whole row is ONE screen-reader element with a composed label.
 */
const InverterRowBase: FC<InverterRowProps> = ({ row, index, first }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);

  // Frozen at first mount (CLAUDE.md §19 entrance cap): re-sorting moves
  // rows but must never swap their wrapper type or bar hook set.
  const [animated] = useState(() => index < ANIM_LIMIT);
  const [delay] = useState(() => Math.min(index, STAGGER_CAP) * STAGGER_MS);

  const rowStyle = useMemo(
    () => [styles.row, first ? null : themed.separator],
    [first, themed.separator],
  );
  const hasPr = row.status.role !== null;

  const body = (
    <View style={rowStyle} accessible accessibilityLabel={row.a11yLabel}>
      <View style={themed.badge}>
        <AppText variant="caption" semi_bold numberOfLines={1}>
          {row.badge}
        </AppText>
      </View>

      <View style={styles.main}>
        <AppText variant="body" semi_bold numberOfLines={1}>
          {row.title}
        </AppText>
        <AppText variant="bodySm" tone="secondary" numberOfLines={2}>
          {row.secondary}
        </AppText>
      </View>

      <View style={styles.side}>
        {hasPr ? (
          <>
            <AppText
              variant="body"
              semi_bold
              color={prStatusInk(row.status, scheme)}
              numberOfLines={1}>
              {row.prText}
            </AppText>
            <AnimatedBar
              fraction={row.barFraction}
              color={prStatusFill(row.status, scheme)}
              trackColor={scheme.surfaceMuted}
              width={MINI_BAR_W}
              animate={animated}
              delay={delay}
            />
          </>
        ) : (
          <View style={themed.noDataPill}>
            <AppText variant="caption" medium tone="secondary" numberOfLines={1}>
              No data
            </AppText>
          </View>
        )}
        <AppText variant="caption" color={uptimeInk(row.uptimeTone, scheme)} numberOfLines={1}>
          {row.uptimeText}
        </AppText>
      </View>
    </View>
  );

  if (animated) {
    return (
      <Animated.View entering={FadeInDown.duration(duration.base).delay(delay).springify().damping(22)}>
        {body}
      </Animated.View>
    );
  }
  return body;
};
InverterRowBase.displayName = 'InverterRow';

/** Memoised: rows only re-render when their (per-fetch) model changes. */
export const InverterRow = memo(InverterRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  side: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: MINI_BAR_W,
    flexShrink: 0,
    gap: space.xs,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    separator: {
      borderTopWidth: 1,
      borderTopColor: scheme.hairline,
    },
    badge: {
      minWidth: 28,
      minHeight: 28,
      paddingHorizontal: space.xs,
      borderRadius: radiusTokens.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: scheme.surfaceMuted,
    },
    noDataPill: {
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
  });

export default InverterRow;
