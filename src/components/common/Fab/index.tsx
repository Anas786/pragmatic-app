import React, { FC, ReactNode, useMemo } from 'react';
import { Animated as RNAnimated, StyleSheet } from 'react-native';
import { Scheme, space, useThemedStyles } from 'src/theme';
import PressableScale from '../PressableScale';

type PressableScaleProps = React.ComponentProps<typeof PressableScale>;

interface FabWrapProps {
  opacity: RNAnimated.Value;
  children?: ReactNode;
}

export const FabWrap: FC<FabWrapProps> = ({ opacity, children }) => {
  const wrapStyle = useMemo(
    () => ({
      ...staticStyles.fabWrap,
      opacity,
      transform: [
        {
          translateY: opacity.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          }),
        },
      ],
    }),
    [opacity],
  );
  return (
    <RNAnimated.View pointerEvents="box-none" style={wrapStyle}>
      {children}
    </RNAnimated.View>
  );
};
FabWrap.displayName = 'FabWrap';

const Fab: FC<Omit<PressableScaleProps, 'style'>> = props => {
  const themed = useThemedStyles(createFabStyles);
  return <PressableScale {...props} style={themed.fab} />;
};
Fab.displayName = 'Fab';

const staticStyles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: space.lg,
    bottom: space.xl,
  },
});

const createFabStyles = (scheme: Scheme) =>
  StyleSheet.create({
    fab: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      backgroundColor: scheme.brand,
      shadowColor: scheme.brand,
    },
  });

export default Fab;
