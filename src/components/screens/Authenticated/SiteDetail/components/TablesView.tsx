import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from 'src/theme';
import InverterTableCard from './InverterTableCard';

/**
 * "Tables" tab on SiteDetail. Hosts tabular per-device breakdowns —
 * currently the inverter fleet. Lives separately from Reports so the
 * energy-mix analytics there stay focused and the per-inverter list gets
 * its own predictable home (with its own remembered period).
 */
const TablesView: FC = () => (
  <View style={styles.container}>
    <InverterTableCard />
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
});

export default React.memo(TablesView);
