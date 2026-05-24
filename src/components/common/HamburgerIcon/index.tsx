import React, { FC, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useScheme } from 'src/theme';

interface HamburgerIconProps {
  color?: string;
}

const HamburgerIcon: FC<HamburgerIconProps> = ({ color }) => {
  const scheme = useScheme();
  const lineColor = color ?? scheme.textPrimary;
  return (
    <View style={styles.lines}>
      <Line width={18} color={lineColor} />
      <Line width={12} color={lineColor} />
      <Line width={6} color={lineColor} />
    </View>
  );
};
HamburgerIcon.displayName = 'HamburgerIcon';

interface LineProps {
  width: number;
  color: string;
}

const Line: FC<LineProps> = ({ width, color }) => {
  const style = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([styles.line, { width, backgroundColor: color }]),
    [width, color],
  );
  return <View style={style} />;
};

const styles = StyleSheet.create({
  lines: { gap: 5 },
  line: { height: 1.8, borderRadius: 1 },
});

export default HamburgerIcon;
