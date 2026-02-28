import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { mockCardsData, PowerCardData } from 'src/data/mock';

interface CardsIconProps {
  IconComponent: FC<{ size?: number; color?: string }>;
  size: number;
  color: string;
}

const CardsIcon: FC<CardsIconProps> = ({ IconComponent, size, color }) => {
  return <IconComponent size={size} color={color} />;
};

const CardsView: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const PowerCard: FC<PowerCardData> = ({
    label,
    value,
    unit,
    iconName,
    iconColor,
    accentColor,
  }) => {
    return (
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <View style={styles.cardContent}>
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            {label}
          </AppText>
          <View style={styles.valueRow}>
            <AppText fontSize={FONT_SIZE_XS} semi_bold color={colors.primaryText}>
              {value}
            </AppText>
            <AppText fontSize={FONT_SIZE_XXS} color={colors.primaryText}>
              {' '}
              {unit}
            </AppText>
          </View>
        </View>
        <CardsIcon IconComponent={iconName} size={ICON_SIZE_LG} color={iconColor} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          Cards
        </AppText>
      </View>
      <View style={styles.body}>
        <View style={styles.grid}>
          {mockCardsData.map((card, index) => (
            <View key={index} style={styles.cardWrapper}>
              <PowerCard {...card} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      overflow: 'hidden',
    },
    header: {
      backgroundColor: colors.inputDarkBg,
      paddingHorizontal: normalizeWidth(16),
      paddingVertical: normalizeHeight(16),
    },
    body: {
      backgroundColor: colors.cardBg,
      padding: normalizeWidth(12),
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalizeWidth(10),
    },
    cardWrapper: {
      width: '48%',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      paddingVertical: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(12),
      gap: normalizeWidth(8),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(36),
      borderRadius: 2,
    },
    cardContent: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
  });

export default CardsView;
