import React, { FC } from 'react';
import { StyleSheet } from 'react-native';
import {
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useThemedStyles,
} from 'src/theme';
import PressableScale, { PressableScaleProps } from '../PressableScale';

/** Primary pill CTA (brand fill). Put `textOnBrand` ink inside. At least
 *  `touch.min` tall so it is a full-size target on both platforms. */
const ActionBtn: FC<Omit<PressableScaleProps, 'style'>> = props => {
  const themed = useThemedStyles(createActionBtnStyles);
  return <PressableScale {...props} style={themed.actionBtn} />;
};
ActionBtn.displayName = 'ActionBtn';

const createActionBtnStyles = (scheme: Scheme) =>
  StyleSheet.create({
    actionBtn: {
      minHeight: touch.min,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.xl,
      paddingVertical: space.md,
      borderRadius: radiusTokens.pill,
      marginTop: space.lg,
      backgroundColor: scheme.brand,
    },
  });

export default ActionBtn;
