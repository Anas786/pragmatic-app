/**
 * SourceTile — one Cards-tab metric.
 *
 *  ┌──────────────────────────┐
 *  │ [icon well]              │  tinted by energy source; neutral for
 *  │ Wind Energy              │  load / other. Label = backend name in its
 *  │ 147,786.00 kWh           │  own case, wraps to 2 lines (never '…').
 *  └──────────────────────────┘
 *
 * Every display string is precomputed once per fetch in CardsView
 * (`ResolvedCard`), so a memoised tile renders with zero formatting work.
 * The whole tile is ONE accessible element ('Wind Energy Today, 147,786.00
 * kilowatt hours, wind').
 */
import React, { FC, memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText, Dot, IconWell, Surface } from 'src/components/common';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { LottieIcon } from 'src/assets/gif';
import { ICardConfig } from 'src/types';
import type { CardBucket } from 'src/utils/cards';
import type { FormattedQuantity } from 'src/utils/units';

/* Gradient direction constants — extracted so each render doesn't
   allocate a fresh `{ x, y }` object for every <LinearGradient>. */
const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

const STAGGER_MS = 50;
const STAGGER_CAP = 6;
// Only the first ANIM_LIMIT tiles (counted across ALL sections) get the
// entrance worklet — the card list is backend-config-driven and unbounded,
// and N concurrent mount worklets in one commit is the regime that
// SIGABRT'd LiveParameterView (see its file header). Same convention as
// SiteCard / InverterCard / AlarmRow (§19).
export const ANIM_LIMIT = 10;

export type SourceToken =
  | 'solar'
  | 'wind'
  | 'grid'
  | 'genset'
  | 'battery'
  | 'load'
  | 'other';

export interface ResolvedCard {
  /** Stable React key: `${objKey}:${name}` (de-duplicated). */
  key: string;
  card: ICardConfig;
  bucket: CardBucket;
  /** Display label (context-redundant words stripped, original case). */
  label: string;
  /** Formatted value — `text` + `unit`, or `isMissing`. */
  quantity: FormattedQuantity;
  /** Composed screen-reader label for the whole tile. */
  a11yLabel: string;
  lottie: LottieIcon | null;
  source: SourceToken;
  /** Energy-source fill (6-digit hex) — undefined for neutral tiles. */
  accent: string | undefined;
}

const createTileStyles = (scheme: Scheme) =>
  StyleSheet.create({
    tile: {
      flexGrow: 1,
      overflow: 'hidden',
      minHeight: 130,
      gap: space.sm,
      /**
       * Border. Using a true 1px (not `StyleSheet.hairlineWidth`)
       * because the absolutely-positioned LinearGradient inside paints
       * to the inside edge of the tile and visually overdraws a
       * sub-pixel hairline — in light mode the border was effectively
       * invisible.
       */
      borderWidth: 1,
      borderColor: scheme.border,
    },
  });

interface SourceTileProps {
  resolved: ResolvedCard;
  /** Position across the whole tab (drives the ANIM_LIMIT cap). */
  index: number;
}

const SourceTile: FC<SourceTileProps> = ({ resolved, index }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createTileStyles);
  const { label, quantity, lottie, accent, a11yLabel } = resolved;
  // Frozen at first mount: if `index` later crosses the ANIM_LIMIT
  // boundary (bucket re-shuffles on a data refresh), the wrapper element
  // type must not flip — that would remount the tile.
  const [animateEntrance] = useState(() => index < ANIM_LIMIT);
  const missing = quantity.isMissing;

  const body = (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      accessible
      accessibilityLabel={a11yLabel}
      style={themed.tile}>
      {/* Source tint sweep — energy sources with a value only. Neutral
          (load / other) and 'No data' tiles stay flat. */}
      {accent && !missing ? (
        <LinearGradient
          colors={[accent + '24', accent + '00']}
          start={GRADIENT_TL}
          end={GRADIENT_BR}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}
      <IconWell
        color={accent ?? scheme.surfaceMuted}
        alpha={accent ? '1F' : ''}
        size={44}
        radius={radiusTokens.md}>
        {lottie ? (
          <Image
            source={lottie.path}
            style={styles.tileIconImage}
            resizeMode="contain"
          />
        ) : (
          <Dot color={accent ?? scheme.textSecondary} size={14} />
        )}
      </IconWell>

      <AppText
        variant="caption"
        medium
        tone="secondary"
        numberOfLines={2}
        style={styles.tileLabel}>
        {label}
      </AppText>

      {missing ? (
        <AppText variant="caption" tone="tertiary">
          No data
        </AppText>
      ) : (
        <View style={styles.tileValueRow}>
          <AppText variant="h3" bold tone="primary" style={styles.tileValue}>
            {quantity.text}
          </AppText>
          {quantity.unit ? (
            <AppText variant="caption" tone="secondary">
              {quantity.unit}
            </AppText>
          ) : null}
        </View>
      )}
    </Surface>
  );

  if (animateEntrance) {
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.base)
          .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
          .springify()
          .damping(22)}
        style={styles.tileWrap}>
        {body}
      </Animated.View>
    );
  }
  return <View style={styles.tileWrap}>{body}</View>;
};

/**
 * Invisible half-width cell for an odd tile count — keeps the last tile
 * at half width instead of letting it stretch across the row.
 */
export const SourceTileSpacer: FC = () => (
  <View
    style={styles.tileWrap}
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
  />
);
SourceTileSpacer.displayName = 'SourceTileSpacer';

const styles = StyleSheet.create({
  tileWrap: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  tileIconImage: {
    width: 26,
    height: 26,
  },
  tileLabel: {
    marginTop: space.xs,
  },
  tileValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
  },
  // Shrinks (and, only at the largest text sizes, wraps) instead of
  // overflowing the tile — a single fixed size, no adjustsFontSizeToFit.
  tileValue: {
    flexShrink: 1,
  },
});

export default memo(SourceTile);
