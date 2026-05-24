import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Dot,
  OverlineLabel,
  PressableScale,
  TintedPill,
} from 'src/components/common';
import { duration, radius as radiusTokens, space, useScheme } from 'src/theme';
import { FONT_SIZE_LG, FONT_SIZE_XXS } from 'src/utils';
import { AggregatedSource } from './helpers';

interface SourceRowProps {
  item: AggregatedSource;
  delay: number;
  isActive: boolean;
  onPress: () => void;
}

const SourceRow: FC<SourceRowProps> = ({ item, delay, isActive, onPress }) => {
  const scheme = useScheme();
  const cardStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.sourceCard,
        {
          backgroundColor: isActive ? item.color + '14' : scheme.surface,
          borderColor: isActive ? item.color : scheme.border,
        },
      ]),
    [isActive, item.color, scheme.surface, scheme.border],
  );
  return (
    <Animated.View
      entering={FadeInDown.duration(duration.base).delay(delay).springify().damping(22)}>
      <PressableScale onPress={onPress} haptic="select" scaleTo={0.97} style={cardStyle}>
        <Dot color={item.color} size={10} />
        <View style={styles.sourceContent}>
          <OverlineLabel color={scheme.textTertiary}>{item.label}</OverlineLabel>
          <View style={styles.sourceValueRow}>
            <AppText
              fontSize={FONT_SIZE_LG}
              bold
              color={scheme.textPrimary}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {item.displayValue}
            </AppText>
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              kWh
            </AppText>
          </View>
        </View>
        <TintedPill color={item.color} alpha="" paddingX={space.sm} paddingY={4}>
          <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.textOnBrand} numberOfLines={1}>
            {item.percentage}
          </AppText>
        </TintedPill>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radiusTokens.xl,
    borderWidth: 1,
  },
  sourceContent: {
    flex: 1,
    gap: 2,
  },
  sourceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
});

export default SourceRow;
