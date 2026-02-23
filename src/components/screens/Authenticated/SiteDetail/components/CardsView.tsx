import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  CARD_BG,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { mockCardsData, PowerCardData } from 'src/data/mock';

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
        <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
          {label}
        </AppText>
        <View style={styles.valueRow}>
          <AppText fontSize={FONT_SIZE_XS} semi_bold color={WHITE}>
            {value}
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={WHITE}>
            {' '}
            {unit}
          </AppText>
        </View>
      </View>
      <Icon name={iconName} size={ICON_SIZE_LG} color={iconColor} />
    </View>
  );
};

const CardsView: FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText fontSize={FONT_SIZE_SM} bold color={WHITE}>
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
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: TEXT_SECONDARY,
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
