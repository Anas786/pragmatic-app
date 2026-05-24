import React, { FC } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Dot,
  IconWell,
  Surface,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_LG,
  FONT_SIZE_XXS,
} from 'src/utils';
import { LottieIcon } from 'src/assets/gif';
import { ICardConfig } from 'src/types';

/* Gradient direction constants — extracted so each render doesn't
   allocate a fresh `{ x, y }` object for every <LinearGradient>. */
const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

const STAGGER_MS = 50;
const STAGGER_CAP = 6;

export type SourceToken = 'solar' | 'wind' | 'grid' | 'genset' | 'battery' | 'load' | 'other';

export interface ResolvedCard {
  card: ICardConfig;
  formatted: string;
  numeric: number | null;
  lottie: LottieIcon | null;
  source: SourceToken;
  accent: string;
  bucket: 'now' | 'today' | 'other';
}

const shortLabel = (name: string): string => {
  const cleaned = name
    .replace(/\s*-\s*RealTime/i, '')
    .replace(/\s+Today$/i, '')
    .replace(/\s+Generation$/i, '');
  if (cleaned.length <= 18) return cleaned;
  return cleaned.slice(0, 17) + '…';
};

const createTileStyles = (scheme: Scheme) =>
  StyleSheet.create({
    tile: {
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
  index: number;
}

const SourceTile: FC<SourceTileProps> = ({ resolved, index }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createTileStyles);
  const { card, formatted, lottie, accent } = resolved;

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.base)
        .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
        .springify()
        .damping(22)}
      style={styles.tileWrap}>
      <Surface
        elevation="md"
        radius="xl"
        background={scheme.surface}
        padding={space.lg}
        style={themed.tile}>
        {/* gradient sweep top-left → fade */}
        <LinearGradient
          colors={[accent + '24', accent + '00']}
          start={GRADIENT_TL}
          end={GRADIENT_BR}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.tileHeader}>
          <IconWell color={accent} alpha="1F" size={44} radius={radiusTokens.md}>
            {lottie ? (
              <Image
                source={lottie.path}
                style={styles.tileIconImage}
                resizeMode="contain"
                accessibilityLabel={lottie.name}
              />
            ) : (
              <Dot color={accent} size={14} />
            )}
          </IconWell>
          <TintedPill
            color={accent}
            alpha=""
            paddingX={space.sm}
            paddingY={3}>
            <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.textOnBrand}>
              {resolved.source.toUpperCase()}
            </AppText>
          </TintedPill>
        </View>

        <AppText
          fontSize={FONT_SIZE_XXS}
          color={scheme.textTertiary}
          medium
          numberOfLines={1}
          style={styles.tileLabel}>
          {shortLabel(card.name)}
        </AppText>

        <View style={styles.tileValueRow}>
          <AppText
            fontSize={FONT_SIZE_LG}
            bold
            color={scheme.textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {formatted}
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
            {card.unit}
          </AppText>
        </View>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tileWrap: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  tileIconImage: {
    width: 26,
    height: 26,
  },
  tileLabel: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: space.xs,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
});

export default SourceTile;
