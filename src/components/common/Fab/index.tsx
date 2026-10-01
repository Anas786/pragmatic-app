import React, { FC, ReactNode, useMemo } from 'react';
import { Animated as RNAnimated, StyleSheet } from 'react-native';
import { Scheme, space, useThemedStyles } from 'src/theme';
import PressableScale from '../PressableScale';

type PressableScaleProps = React.ComponentProps<typeof PressableScale>;

/** Visual (and touch) diameter of the FAB — ≥ touch.min on both platforms.
 *  Exported so callers can slide a hidden FAB fully off-screen. */
export const FAB_SIZE = 52;

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

/** Floating action button: a brand-filled circle; icons inside use
 *  `scheme.textOnBrand`. Always pass an `accessibilityLabel`. */
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
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
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
