import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_XL,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { MetricItem } from 'src/data/mock/summary';

interface MetricCardProps {
  title: string;
  items: MetricItem[];
}

const MetricCard: FC<MetricCardProps> = ({ title, items }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={WHITE}>
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
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                {item.label}
              </AppText>
              <View style={styles.valueRow}>
                <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
                  {item.value}
                </AppText>
                {item.unit && (
                  <AppText fontSize={FONT_SIZE_XS} color={TEXT_SECONDARY}>
                    {' '}
                    {item.unit}
                  </AppText>
                )}
              </View>
            </View>
            <Icon name={item.iconName} size={ICON_SIZE_XL} color={item.iconColor} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(16),
  },
  body: {
    backgroundColor: INPUT_DARK_BG,
    padding: normalizeWidth(12),
    gap: normalizeHeight(12),
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
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
