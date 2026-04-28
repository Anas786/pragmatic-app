import React, { FC, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  View,
} from 'react-native';
import { normalizeHeight } from 'src/utils';
import { useThemeStore } from 'src/hooks';
import MetricCard from './MetricCard';
import { mockEnvironmentalMetrics, mockYieldMetrics } from 'src/data/mock';
import SLDDiagram from './SLDDiagram';

/**
 * SLDDiagram is heavy: 543 lines of Reanimated worklets, gesture handlers,
 * many SVG nodes and a full-screen Modal. Mounting it synchronously on
 * SiteDetail navigation freezes the JS thread for ~500–1500 ms on mid-range
 * Android devices, which presents as the app "hanging" when a site card is
 * tapped.
 *
 * Defer mounting until after the navigation transition has fully settled
 * (`InteractionManager.runAfterInteractions`) so cards open instantly and
 * the diagram appears a frame later with a small spinner placeholder.
 */
const SummaryView: FC = () => {
  const [showDiagram, setShowDiagram] = useState(false);
  const { colors } = useThemeStore();

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setShowDiagram(true);
    });
    return () => handle.cancel();
  }, []);

  return (
    <View style={styles.container}>
      <MetricCard title="Yield" items={mockYieldMetrics} />
      <MetricCard
        title="Environmental Benefits"
        items={mockEnvironmentalMetrics}
      />
      {showDiagram ? (
        <SLDDiagram />
      ) : (
        <View style={styles.diagramPlaceholder}>
          <ActivityIndicator color={colors.primaryText} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(12),
  },
  diagramPlaceholder: {
    minHeight: normalizeHeight(220),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SummaryView;
