import React, { FC } from 'react';
import { StyleSheet } from 'react-native';
import { radius as radiusTokens, Scheme, space, useThemedStyles } from 'src/theme';
import PressableScale from '../PressableScale';

type PressableScaleProps = React.ComponentProps<typeof PressableScale>;

const ActionBtn: FC<Omit<PressableScaleProps, 'style'>> = props => {
  const themed = useThemedStyles(createActionBtnStyles);
  return <PressableScale {...props} style={themed.actionBtn} />;
};
ActionBtn.displayName = 'ActionBtn';

const createActionBtnStyles = (scheme: Scheme) =>
  StyleSheet.create({
    actionBtn: {
      paddingHorizontal: space.xl,
      paddingVertical: space.md,
      borderRadius: radiusTokens.pill,
      marginTop: space.lg,
      backgroundColor: scheme.brand,
    },
  });

export default ActionBtn;
