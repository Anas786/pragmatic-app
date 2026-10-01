import React, { FC, ReactNode } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import { Scheme, space, useThemedStyles } from 'src/theme';

interface TopBarProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
}

/**
 * Bare top-bar row (Dashboard's brand header). The root is a Pressable
 * only so `onPress` (e.g. Keyboard.dismiss) keeps working — it is NOT an
 * accessibility element: `accessible={false}` + importantForAccessibility
 * 'no' leave its children (hamburger, theme toggle…) individually
 * focusable instead of being swallowed into one unlabeled button.
 * Stack screens should use `ScreenHeader` instead.
 */
const TopBar: FC<TopBarProps> = ({ children, ...rest }) => {
  const themed = useThemedStyles(createTopBarStyles);
  return (
    <Pressable
      {...rest}
      accessible={false}
      importantForAccessibility="no"
      style={themed.topBar}>
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
      minHeight: 52,
      // IconButtons are ≥44pt boxes with the glyph centred, so a smaller
      // edge inset keeps the icons where the old 4pt-padded buttons sat.
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      backgroundColor: scheme.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: scheme.hairline,
    },
  });

export default TopBar;
