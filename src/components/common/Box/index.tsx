import React, { FC, ReactNode } from 'react';
import { StyleProp, View, ViewProps, ViewStyle } from 'react-native';

interface BoxProps extends Omit<ViewProps, 'style' | 'children'> {
  children?: ReactNode;
}

/**
 * Creates a named styled View bound to a fixed StyleSheet entry. Use this
 * to factory-produce named container components without writing the
 * `style={styles.X}` prop at call sites:
 *
 *     const Container = createBox(styles.container, 'Container');
 *     // …
 *     <Container>{children}</Container>
 *
 * The wrapper's display name is set so React DevTools shows the intended
 * label, not "Box".
 */
export const createBox = (
  style: StyleProp<ViewStyle>,
  displayName = 'Box',
): FC<BoxProps> => {
  const Box: FC<BoxProps> = ({ children, ...rest }) => (
    <View style={style} {...rest}>
      {children}
    </View>
  );
  Box.displayName = displayName;
  return Box;
};

export default createBox;
