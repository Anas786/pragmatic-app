import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PressableScale } from 'src/components/common';
import { glass, radius as radiusTokens, Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_XXS } from 'src/utils';

const createPillStyles = (scheme: Scheme) =>
  StyleSheet.create({
    filterPillInactive: {
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
    },
    filterCountInactive: {
      backgroundColor: scheme.surfaceMuted,
    },
  });

const staticStyles = StyleSheet.create({
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radiusTokens.pill,
    gap: 8,
  },
  filterCount: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radiusTokens.pill,
    minWidth: 22,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: glass.medium,
  },
});

export interface AlarmFilterPillProps {
  active: boolean;
  color: string;
  label: string;
  count: number;
  onPress: () => void;
}

const AlarmFilterPill: FC<AlarmFilterPillProps> = ({
  active,
  color,
  label,
  count,
  onPress,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createPillStyles);
  const pillStyle = useMemo(
    () =>
      StyleSheet.flatten([
        staticStyles.filterPill,
        active ? { backgroundColor: color } : themed.filterPillInactive,
      ]),
    [active, color, themed.filterPillInactive],
  );
  const countStyle = useMemo(
    () =>
      StyleSheet.flatten([
        staticStyles.filterCount,
        active ? staticStyles.filterCountActive : themed.filterCountInactive,
      ]),
    [active, themed.filterCountInactive],
  );
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.94}
      style={pillStyle}>
      <AppText
        fontSize={FONT_SIZE_XXS}
        bold
        color={active ? scheme.textOnBrand : scheme.textPrimary}>
        {label}
      </AppText>
      <View style={countStyle}>
        <AppText
          fontSize={FONT_SIZE_XXS}
          bold
          color={active ? scheme.textOnBrand : scheme.textPrimary}>
          {count}
        </AppText>
      </View>
    </PressableScale>
  );
};

export default AlarmFilterPill;
