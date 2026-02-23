import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import MetricCard from './MetricCard';
import { mockEnvironmentalMetrics, mockYieldMetrics } from 'src/data/mock';
import SLDDiagram from './SLDDiagram';

const SummaryView: FC = () => {
  return (
    <View style={styles.container}>
      <MetricCard title="Yield" items={mockYieldMetrics} />
      <MetricCard title="Environmental Benefits" items={mockEnvironmentalMetrics} />
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
