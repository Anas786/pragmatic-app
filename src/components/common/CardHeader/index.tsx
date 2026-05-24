import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';

export const CardHeader: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.cardHeader}>{children}</View>
);
CardHeader.displayName = 'CardHeader';

export const CardHeaderText: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.cardHeaderText}>{children}</View>
);
CardHeaderText.displayName = 'CardHeaderText';

export const SkeletonCardHeaderText: FC<{ children?: ReactNode }> = ({
  children,
}) => <View style={styles.skeletonCardHeaderText}>{children}</View>;
SkeletonCardHeaderText.displayName = 'SkeletonCardHeaderText';

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cardHeaderText: { flex: 1, gap: 4 },
  skeletonCardHeaderText: { flex: 1, gap: 6 },
});

export default CardHeader;
