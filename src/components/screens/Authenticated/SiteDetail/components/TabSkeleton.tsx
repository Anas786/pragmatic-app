import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from 'src/components/common';
import { space } from 'src/theme';

/**
 * Generic SiteDetail tab placeholder — a hero block + a couple of card
 * blocks. Shown the instant a tab opens (during the deferred-mount
 * window and while data is still loading from cache/API) so every tab
 * follows the same "open instantly → skeleton → content" flow.
 */
const TabSkeleton: FC = () => (
  <View style={styles.stack}>
    <Skeleton width="100%" height={160} radius="xl" />
    <Skeleton width="100%" height={90} radius="lg" />
    <Skeleton width="100%" height={90} radius="lg" />
  </View>
);
TabSkeleton.displayName = 'TabSkeleton';

const styles = StyleSheet.create({
  stack: {
    gap: space.md,
  },
});

export default TabSkeleton;
