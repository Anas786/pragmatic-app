import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';
import PerformanceReportCard from './PerformanceReportCard';

/**
 * "Reports" tab on SiteDetail — the period energy report (hero, Sources
 * list, energy-over-time chart). Tabular per-device breakdowns live on
 * the separate "Tables" tab.
 */
const ReportsView: FC = () => (
  <View style={styles.container}>
    <PerformanceReportCard />
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
});

export default React.memo(ReportsView);
