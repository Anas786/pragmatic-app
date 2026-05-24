import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space, useScheme } from 'src/theme';
import { FONT_SIZE_XS } from 'src/utils';
import AppText from '../AppText';

export const StatusContainer: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.statusContainer}>{children}</View>
);
StatusContainer.displayName = 'StatusContainer';

export const StatusSubtext: FC<{ children: ReactNode }> = ({ children }) => {
  const scheme = useScheme();
  return (
    <AppText
      fontSize={FONT_SIZE_XS}
      color={scheme.textSecondary}
      center
      style={styles.statusSubtext}>
      {children}
    </AppText>
  );
};
StatusSubtext.displayName = 'StatusSubtext';

const styles = StyleSheet.create({
  statusContainer: {
    paddingVertical: space['3xl'],
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  statusSubtext: {
    marginTop: 6,
  },
});

export default StatusContainer;
