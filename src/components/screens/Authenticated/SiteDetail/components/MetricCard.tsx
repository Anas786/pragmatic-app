import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

export interface MetricItem {
  label: string;
  value: string;
  unit?: string;
  icon: string;
  accentColor: string;
}

interface MetricCardProps {
  title: string;
  items: MetricItem[];
}

const MetricCard: FC<MetricCardProps> = ({ title, items }) => {
  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
        {title}
      </AppText>

      <View style={styles.metricsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.metricRow}>
            <View
              style={[styles.accentBar, { backgroundColor: item.accentColor }]}
            />
            <View style={styles.metricContent}>
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                {item.label}
              </AppText>
              <View style={styles.valueRow}>
                <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
                  {item.value}
                </AppText>
                {item.unit && (
                  <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                    {item.unit}
                  </AppText>
                )}
              </View>
            </View>
            <AppText fontSize={FONT_SIZE_XS}>{item.icon}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    padding: normalizeWidth(16),
    gap: normalizeHeight(12),
  },
  metricsContainer: {
    gap: normalizeHeight(12),
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(12),
  },
  accentBar: {
    width: normalizeWidth(3),
    height: normalizeHeight(40),
    borderRadius: 2,
  },
  metricContent: {
    flex: 1,
    gap: normalizeHeight(4),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: normalizeWidth(4),
  },
});

export default MetricCard;
