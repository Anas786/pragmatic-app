import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { normalizeHeight } from 'src/utils';
import InverterTableCard from './InverterTableCard';

/**
 * "Tables" tab on SiteDetail. Hosts tabular per-device breakdowns —
 * currently the Inverter Table. Lives separately from Reports so the
 * deeper analytics (pie chart + stacked bar) on Reports stay focused
 * and the table-style content gets its own predictable home.
 */
const TablesView: FC = () => {
  return (
    <View style={styles.container}>
      <InverterTableCard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(16),
  },
});

export default React.memo(TablesView);
