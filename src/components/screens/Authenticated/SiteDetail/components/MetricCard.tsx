import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_XL,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { SummaryMetricItem } from 'src/data/mock/summary';

interface MetricCardProps {
  title: string;
  items: SummaryMetricItem[];
}

interface SummaryCardIconProps {
  IconComponent: FC<{ size?: number; color?: string }>;
  size: number;
  color: string;
}

const SummaryCardICon: FC<SummaryCardIconProps> = ({ IconComponent, size, color }) => {
  return <IconComponent size={size} color={color} />;
};

const MetricCard: FC<MetricCardProps> = ({ title, items }) => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
          {title}
        </AppText>
      </View>

      <View style={styles.body}>
        {items.map((item, index) => (
          <View key={index} style={styles.metricRow}>
            <View
              style={[styles.accentBar, { backgroundColor: item.accentColor }]}
            />
            <View style={styles.metricContent}>
              <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                {item.label}
              </AppText>
              <View style={styles.valueRow}>
                <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
                  {item.value}
                </AppText>
                {item.unit && (
                  <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
                    {' '}
                    {item.unit}
                  </AppText>
                )}
              </View>
            </View>
            <SummaryCardICon IconComponent={item.iconName} size={ICON_SIZE_XL} color={item.iconColor} />
          </View>
        ))}
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
      gap: normalizeHeight(12),
    },
    metricRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      paddingVertical: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(14),
      gap: normalizeWidth(12),
    },
    accentBar: {
      width: normalizeWidth(3),
      height: normalizeHeight(36),
      borderRadius: 2,
    },
    metricContent: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
  });

export default MetricCard;
