import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';

const SkeletonStack: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.skeletonStack}>{children}</View>
);
SkeletonStack.displayName = 'SkeletonStack';

const styles = StyleSheet.create({
  skeletonStack: {
    paddingTop: space.xs,
    gap: space.lg,
  },
});

export default SkeletonStack;
