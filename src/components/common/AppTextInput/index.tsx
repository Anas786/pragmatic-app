import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, TextInput, TextInputProps, TextStyle } from 'react-native';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_SM } from 'src/utils';

interface AppTextInputProps extends Omit<TextInputProps, 'style'> {
  /** Optional style override merged on top of the themed defaults. */
  style?: TextStyle | TextStyle[];
}

/**
 * Theme-aware `TextInput`. Bakes textPrimary color + placeholderTextColor +
 * Poppins font into a memoised StyleSheet so callers don't need to hand-roll
 * the merge.
 *
 * Uses `forwardRef` so consumers can still call `.focus()` / `.blur()`.
 */
const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  ({ style, placeholderTextColor, ...rest }, ref) => {
    const scheme = useScheme();
    const themed = useThemedStyles(createStyles);
    const merged = useMemo<TextStyle>(
      () => StyleSheet.flatten([themed.base, style]) as TextStyle,
      [themed.base, style],
    );
    return (
      <TextInput
        ref={ref}
        style={merged}
        placeholderTextColor={placeholderTextColor ?? scheme.textTertiary}
        {...rest}
      />
    );
  },
);

const createStyles = (scheme: Scheme) => ({
  base: {
    color: scheme.textPrimary,
    fontSize: FONT_SIZE_SM,
    fontFamily: 'Poppins-Regular',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});

AppTextInput.displayName = 'AppTextInput';

export default AppTextInput;
