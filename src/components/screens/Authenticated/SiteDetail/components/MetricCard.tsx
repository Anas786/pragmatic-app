import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_SM,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import DataCard from './DataCard';

export interface MetricCardItem {
  label: string;
  /** Already-formatted display value, e.g. "26,463.61" or "—". */
  value: string;
  unit?: string;
  accentColor: string;
  /**
   * Pre-rendered icon node (typically an `<Image>` element for a GIF, but
   * any ReactNode works). Caller controls sizing/styling so each icon
   * type — GIF, SVG, custom — composes the same way.
   */
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
        <View style={styles.list}>
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
    list: {
      gap: normalizeHeight(10),
    },
  });

export default MetricCard;
