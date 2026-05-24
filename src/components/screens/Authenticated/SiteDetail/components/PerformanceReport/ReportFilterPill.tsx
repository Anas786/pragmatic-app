import React, { FC, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, PressableScale } from 'src/components/common';
import { radius as radiusTokens, Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_XS } from 'src/utils';

interface ReportFilterPillProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

const ReportFilterPill: FC<ReportFilterPillProps> = ({ active, label, onPress }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const pillStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.filterPill,
        active ? themed.filterPillActive : themed.filterPillInactive,
      ]),
    [active, themed.filterPillActive, themed.filterPillInactive],
  );
  return (
    <PressableScale onPress={onPress} haptic="select" scaleTo={0.94} style={pillStyle}>
      <AppText
        fontSize={FONT_SIZE_XS}
        medium
        color={active ? scheme.textOnBrand : scheme.textPrimary}>
        {label}
      </AppText>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  filterPill: {
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: radiusTokens.pill,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    filterPillActive: {
      backgroundColor: scheme.brand,
    },
    filterPillInactive: {
      backgroundColor: scheme.surface,
      borderColor: scheme.border,
      borderWidth: 1,
    },
  });

export default ReportFilterPill;
