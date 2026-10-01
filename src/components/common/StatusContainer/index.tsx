import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';
import AppText from '../AppText';

/**
 * Legacy centred status block. New empty / error / offline states use
 * `EmptyStateCard` with a `kind` (copy from `friendlyError()`); these two
 * stay exported for any remaining caller.
 */
export const StatusContainer: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.statusContainer}>{children}</View>
);
StatusContainer.displayName = 'StatusContainer';

export const StatusSubtext: FC<{ children: ReactNode }> = ({ children }) => (
  <AppText variant="bodySm" tone="secondary" center style={styles.statusSubtext}>
    {children}
  </AppText>
);
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
