import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CardHeader,
  Skeleton,
  SkeletonCardHeaderText,
  Surface,
} from 'src/components/common';
import { space, useScheme } from 'src/theme';

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
        <Skeleton width={48} height={48} radius="pill" />
        <SkeletonCardHeaderText>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} />
        </SkeletonCardHeaderText>
      </CardHeader>
      <View style={styles.chipsRow}>
        <Skeleton width="32%" height={56} radius="lg" />
        <Skeleton width="32%" height={56} radius="lg" />
        <Skeleton width="32%" height={56} radius="lg" />
      </View>
    </Surface>
  );
};
SiteCardSkeleton.displayName = 'SiteCardSkeleton';

const styles = StyleSheet.create({
  card: { gap: space.md },
  chipsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

export default SiteCardSkeleton;
