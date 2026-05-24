import React, { FC, ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Surface, createBox } from 'src/components/common';
import { FONT_SIZE_SM } from 'src/utils';
import { space, useScheme } from 'src/theme';
import DataCard from './DataCard';

export interface MetricCardItem {
  label: string;
  value: string;
  unit?: string;
  accentColor: string;
  icon?: ReactNode;
}

interface MetricCardProps {
  title: string;
  items: MetricCardItem[];
}

/**
 * Sectioned panel of {@link DataCard} rows, used by SummaryView for
 * "Yield" and "Environmental Benefits" groupings. The component itself
 * is just layout — value formatting + live-data resolution happens in
 * the caller.
 */
const MetricCard: FC<MetricCardProps> = ({ title, items }) => {
  const scheme = useScheme();

  return (
    <Surface
      elevation="sm"
      radius="xl"
      background={scheme.surface}
      bordered
      style={styles.container}>
      <AppText
        fontSize={FONT_SIZE_SM}
        bold
        color={scheme.textPrimary}
        style={[styles.title, { backgroundColor: scheme.surfaceMuted }]}>
        {title}
      </AppText>
      <ItemList>
        {items.map((item, index) => (
          <DataCard
            key={`${item.label}:${index}`}
            label={item.label}
            value={item.value}
            unit={item.unit}
            accentColor={item.accentColor}
            icon={item.icon}
          />
        ))}
      </ItemList>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  title: {
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
  },
  itemList: {
    padding: space.md,
    gap: space.sm,
  },
});

const ItemList = createBox(styles.itemList, 'ItemList');

export default MetricCard;
