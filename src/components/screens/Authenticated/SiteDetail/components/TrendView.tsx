/**
 * TrendView — config-driven trend charts.
 *
 * Reads `siteConfig.siteComponents.trends[]` and renders one
 * `TrendSection` per entry (idx = array index → the data endpoint's
 * `idx`). Each section owns its own period filter and fetch; line/area
 * aggregations render in one chart, bar/column in another.
 *
 * The tab opens instantly (ViewsContent defers the body one rAF) and
 * each section shows a skeleton while its request is in flight.
 */

import React, { FC, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { EmptyStateCard, Skeleton } from 'src/components/common';
import { space } from 'src/theme';
import { DashboardStackParamList } from 'src/types';
import { selectTrends } from 'src/utils';
import { useSiteConfig } from 'src/hooks';
import { TREND_CHART_HEIGHT } from './Trends/helpers';
import TrendSection from './Trends/TrendSection';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const TrendView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const { data: config, isLoading } = useSiteConfig(siteId);
  const trends = useMemo(() => selectTrends(config), [config]);

  if (isLoading && trends.length === 0) {
    return (
      <View style={styles.container}>
        <Skeleton width={160} height={14} />
        <Skeleton width="100%" height={TREND_CHART_HEIGHT} radius="lg" />
        <Skeleton width="100%" height={TREND_CHART_HEIGHT} radius="lg" />
      </View>
    );
  }

  if (trends.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyStateCard
          title="No trends configured"
          message="This site has no trend charts set up."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {trends.map((trend, idx) => (
        <TrendSection
          key={`${idx}-${trend.heading}`}
          siteId={siteId}
          idx={idx}
          trend={trend}
        />
      ))}
    </View>
  );
};
TrendView.displayName = 'TrendView';

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
});

export default React.memo(TrendView);
