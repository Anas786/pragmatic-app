import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CardHeader,
  Skeleton,
  SkeletonCardHeaderText,
  Surface,
} from 'src/components/common';
import { space, useScheme } from 'src/theme';
import { SITE_CARD_AVATAR } from './SiteCard';

/** Approximate rendered height of the SiteCard hero tile. */
const HERO_H = 106;
/** Satellite chip placeholder height. */
const CHIP_H = 56;

/**
 * Loading placeholder in the SiteCard's shape — round avatar, name and
 * status lines, the hero tile and a row of chips — so the list doesn't
 * jump when the first page lands.
 */
const SiteCardSkeleton: FC = () => {
  const scheme = useScheme();
  return (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      style={styles.card}>
      <CardHeader>
        <Skeleton width={SITE_CARD_AVATAR} height={SITE_CARD_AVATAR} radius="pill" />
        <SkeletonCardHeaderText>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} />
        </SkeletonCardHeaderText>
      </CardHeader>
      <Skeleton width="100%" height={HERO_H} radius="lg" />
      {/* Each block flexes into a third of the row (minus the gaps) — a
          fixed 32% each plus two gaps overflowed narrower than 400pt. */}
      <View style={styles.chipsRow}>
        <View style={styles.chipSlot}>
          <Skeleton width="100%" height={CHIP_H} radius="lg" />
        </View>
        <View style={styles.chipSlot}>
          <Skeleton width="100%" height={CHIP_H} radius="lg" />
        </View>
        <View style={styles.chipSlot}>
          <Skeleton width="100%" height={CHIP_H} radius="lg" />
        </View>
      </View>
    </Surface>
  );
};
SiteCardSkeleton.displayName = 'SiteCardSkeleton';

/** Rendered height of SiteCardSkeleton (≈ a SiteCard with one chip row):
 *  padding 16 + avatar 52 + gap 12 + hero 106 + gap 12 + chips 56 + 16. */
export const SITE_CARD_SKELETON_HEIGHT =
  space.lg + SITE_CARD_AVATAR + space.md + HERO_H + space.md + CHIP_H + space.lg;

const styles = StyleSheet.create({
  card: { gap: space.md },
  chipsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  chipSlot: {
    flex: 1,
  },
});

export default SiteCardSkeleton;
