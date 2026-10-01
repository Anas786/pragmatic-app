import React, { FC, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { Scheme, useThemedStyles } from 'src/theme';

interface ScreenContainerProps {
  children?: ReactNode;
  /**
   * Safe-area edges to pad. Default: all four (unchanged behaviour).
   * Screens whose content scrolls under the home indicator pass
   * `['top', 'left', 'right']` and pad the scroll content themselves.
   */
  edges?: Edge[];
}

const ALL_EDGES: Edge[] = ['top', 'right', 'bottom', 'left'];

const ScreenContainer: FC<ScreenContainerProps> = ({ children, edges = ALL_EDGES }) => {
  const themed = useThemedStyles(createScreenStyles);
  return (
    <SafeAreaView style={themed.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
};
ScreenContainer.displayName = 'ScreenContainer';

const createScreenStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: scheme.bg },
  });

export default ScreenContainer;
