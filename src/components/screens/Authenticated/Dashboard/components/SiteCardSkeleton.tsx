import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, Surface } from 'src/components/common';
import { space, useScheme } from 'src/theme';
import { SITE_CARD_LOGO } from './SiteCard';

/**
 * Loading placeholder with the SAME geometry as a SiteCard that has
 * metrics (header 40 · mix row 14 · two 20pt legend rows), so nothing
 * jumps when the first page lands. Keep in step with SiteCard's styles.
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
      <View style={styles.header}>
        <Skeleton width={SITE_CARD_LOGO} height={SITE_CARD_LOGO} radius="md" />
        <View style={styles.headerText}>
          <View style={styles.nameLine}>
            <Skeleton width="62%" height={14} />
          </View>
          <View style={styles.statusLine}>
            <Skeleton width="48%" height={10} />
          </View>
        </View>
      </View>
      <View style={styles.mixRow}>
        <Skeleton width="100%" height={6} radius="pill" />
      </View>
      <View style={styles.legend}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.cell}>
            <Skeleton width="78%" height={10} />
          </View>
        ))}
      </View>
    </Surface>
  );
};
SiteCardSkeleton.displayName = 'SiteCardSkeleton';

/** Rendered height of SiteCardSkeleton (and of a 2-row SiteCard):
 *  padding 16 + header 40 + gap 12 + mix 14 + gap 8 + legend 44 + 16. */
export const SITE_CARD_SKELETON_HEIGHT = 150;

const styles = StyleSheet.create({
  card: { gap: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerText: { flex: 1 },
  // Same line boxes as the real name (22) and status (16) lines.
  nameLine: { height: 22, justifyContent: 'center' },
  statusLine: { height: 16, justifyContent: 'center' },
  mixRow: { height: 14, justifyContent: 'center' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.xs,
    marginTop: -space.xs,
  },
  cell: {
    width: '50%',
    height: 20,
    justifyContent: 'center',
    paddingRight: space.sm,
  },
});

export default SiteCardSkeleton;
