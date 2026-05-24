import React, { FC, ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import { Scheme, space, useThemedStyles } from 'src/theme';

interface TopBarProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
}

const TopBar: FC<TopBarProps> = ({ children, ...rest }) => {
  const themed = useThemedStyles(createTopBarStyles);
  return (
    <Pressable style={themed.topBar} {...rest}>
      {children}
    </Pressable>
  );
};
TopBar.displayName = 'TopBar';

const createTopBarStyles = (scheme: Scheme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: scheme.hairline,
    },
  });

export default TopBar;
