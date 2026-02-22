import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import MetricCard, { MetricItem } from './MetricCard';
import { ACCENT_GREEN, ACCENT_RED } from 'src/utils/theme';
import SLDDiagram from './SLDDiagram';

const SummaryView: FC = () => {
  const yieldMetrics: MetricItem[] = [
    {
      label: 'Total Plant Yeild',
      value: '106,104.46',
      unit: 'mWh',
      icon: '⚡',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'Revenue',
      value: '20,159,846.83',
      unit: 'USD',
      icon: '📈',
      accentColor: ACCENT_GREEN,
    },
  ];

  const environmentalMetrics: MetricItem[] = [
    {
      label: 'CO₂ Reduction',
      value: '22,529.16',
      unit: 'Tons',
      icon: '🌱',
      accentColor: ACCENT_GREEN,
    },
    {
      label: 'Coal Saved',
      value: '50,865,032.12',
      unit: 'Tons',
      icon: '🏭',
      accentColor: ACCENT_RED,
    },
    {
      label: 'Trees Planted',
      value: '120,573,246.59',
      unit: 'Nos.',
      icon: '🌱',
      accentColor: ACCENT_GREEN,
    },
  ];

  return (
    <View style={styles.container}>
      <MetricCard title="Yield" items={yieldMetrics} />
      <MetricCard title="Environmental Benefits" items={environmentalMetrics} />
      <SLDDiagram />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(12),
  },
});

export default SummaryView;
