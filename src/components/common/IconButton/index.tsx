import React, { FC } from 'react';
import { StyleSheet } from 'react-native';
import { space } from 'src/theme';
import PressableScale from '../PressableScale';

type PressableScaleProps = React.ComponentProps<typeof PressableScale>;

const IconButton: FC<Omit<PressableScaleProps, 'style'>> = props => (
  <PressableScale {...props} style={styles.iconButton} />
);
IconButton.displayName = 'IconButton';

const styles = StyleSheet.create({
  iconButton: {
    padding: space.xs,
  },
});

export default IconButton;
