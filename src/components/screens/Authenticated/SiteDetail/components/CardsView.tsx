import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  ACCENT_BLUE,
  ACCENT_GREEN,
  ACCENT_RED,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';

interface PowerCardProps {
  label: string;
  value: string;
  unit: string;
  icon: string;
  accentColor: string;
}

const PowerCard: FC<PowerCardProps> = ({
  label,
  value,
  unit,
  icon,
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
            {unit}
          </AppText>
        </View>
      </View>
      <AppText fontSize={20} style={styles.icon}>
        {icon}
      </AppText>
    </View>
  );
};

const CardsView: FC = () => {
  const cardsData = [
    {
      label: 'Wind Generation - RealTime',
      value: '4,484.25',
      unit: 'kW',
      icon: '💨',
      accentColor: ACCENT_BLUE,
    },
    {
      label: 'Wind Energy Today',
      value: '7,514.00',
      unit: 'kWh',
      icon: '💨',
      accentColor: ACCENT_BLUE,
    },
    {
      label: 'PV-SG-CI-01',
      value: '16,124.80',
      unit: 'kWh',
      icon: '☀️',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'PV-SG-CI-05',
      value: '15,217.80',
      unit: 'kWh',
      icon: '☀️',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'PV-SG-CI-01',
      value: '16,124.80',
      unit: 'kWh',
      icon: '☀️',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'PV-SG-CI-05',
      value: '15,217.80',
      unit: 'kWh',
      icon: '☀️',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'PV-SG-CI-01',
      value: '16,124.80',
      unit: 'kWh',
      icon: '⚡',
      accentColor: ACCENT_RED,
    },
    {
      label: 'PV-SG-CI-05',
      value: '15,217.80',
      unit: 'kWh',
      icon: '⚡',
      accentColor: ACCENT_RED,
    },
    {
      label: 'Wind Generation - RealTime',
      value: '4,484.25',
      unit: 'kW',
      icon: '💨',
      accentColor: ACCENT_BLUE,
    },
    {
      label: 'Wind Energy Today',
      value: '7,514.00',
      unit: 'kWh',
      icon: '💨',
      accentColor: ACCENT_BLUE,
    },
  ];

  return (
    <View style={styles.container}>
      <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
        Cards
      </AppText>
      <View style={styles.grid}>
        {cardsData.map((card, index) => (
          <View key={index} style={styles.cardWrapper}>
            <PowerCard {...card} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(12),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: normalizeWidth(8),
  },
  cardWrapper: {
    width: '48.5%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 12,
    padding: normalizeWidth(12),
    gap: normalizeWidth(8),
  },
  accentBar: {
    width: normalizeWidth(3),
    height: normalizeHeight(40),
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    gap: normalizeHeight(4),
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: normalizeWidth(4),
  },
  icon: {
    lineHeight: 20,
  },
});

export default CardsView;
