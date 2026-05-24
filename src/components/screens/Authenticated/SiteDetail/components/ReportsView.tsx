import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import PerformanceReportCard from './PerformanceReportCard';

/**
 * "Reports" tab on SiteDetail. Hosts analytics cards (Performance
 * Report pie chart + stacked bar). Tabular per-device breakdowns live
 * on the separate "Tables" tab.
 */
const ReportsView: FC = () => {
  return (
    <View style={styles.container}>
      <PerformanceReportCard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(16),
  },
});

export default React.memo(ReportsView);
