import React, { FC, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scheme, useThemedStyles } from 'src/theme';

const ScreenContainer: FC<{ children?: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createScreenStyles);
  return <SafeAreaView style={themed.container}>{children}</SafeAreaView>;
};
ScreenContainer.displayName = 'ScreenContainer';

const createScreenStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: scheme.bg },
  });

export default ScreenContainer;
