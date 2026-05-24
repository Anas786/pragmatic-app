import React, { FC, ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { elevation, radius as radiusTokens, space } from 'src/theme';

type ElevationKey = keyof typeof elevation;
type RadiusKey = keyof typeof radiusTokens;
type SpaceKey = keyof typeof space;

interface SurfaceProps {
  children?: ReactNode;
  elevation?: ElevationKey;
  radius?: RadiusKey;
  background?: string;
  /** Uniform padding using a space token key or raw number. */
  padding?: SpaceKey | number;
  /** Adds a 1px hairline border in the passed color. Pass `true` to get
   *  the default transparent hairline; pass a hex string for a colored one. */
  bordered?: boolean | string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Soft-elevated card primitive.
 *
 * Replaces hand-rolled `borderWidth + borderRadius + backgroundColor`
 * patterns. Elevation maps to the design-token shadow presets so the
 * tactile depth language is consistent across the app.
 */
const Surface: FC<SurfaceProps> = ({
  children,
  elevation: elevationKey = 'none',
  radius: radiusKey = 'md',
  background,
  padding: paddingProp,
  bordered = false,
  style,
}) => {
  const paddingValue =
    typeof paddingProp === 'number'
      ? paddingProp
      : paddingProp !== undefined
        ? space[paddingProp]
        : undefined;

  const borderStyle: ViewStyle | undefined = bordered
    ? {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor:
          typeof bordered === 'string' ? bordered : 'rgba(0,0,0,0.06)',
      }
    : undefined;

  return (
    <View
      style={[
        elevation[elevationKey],
        {
          borderRadius: radiusTokens[radiusKey],
          backgroundColor: background,
          padding: paddingValue,
        },
        borderStyle,
        style,
      ]}>
      {children}
    </View>
  );
};

export default Surface;
