/**
 * TrendView — config-driven trend charts.
 *
 * Reads `siteConfig.siteComponents.trends[]` and renders one
 * `TrendSection` per entry. The data endpoint's `idx` is each entry's
 * index in the ORIGINAL config array — `selectTrends` preserves it as
 * `sourceIdx` even when malformed siblings are dropped. Each section
 * owns its own period filter and fetch; line/area aggregations render
 * in one chart, bar/column in another.
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

  const { data: config, isLoading, isError, refetch } = useSiteConfig(siteId);
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

  // Config fetch failed and there's no cached config to fall back on —
  // offer a retry instead of wrongly claiming the site has no trends.
  // (A stale cached config with a failed background refetch still
  // renders its charts below.)
  if (isError && trends.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyStateCard
          title="Couldn't load trends"
          message="Tap retry to try again."
          onRetry={() => refetch()}
        />
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
      {trends.map((trend, position) => (
        <TrendSection
          key={`${trend.sourceIdx}-${trend.heading}`}
          siteId={siteId}
          idx={trend.sourceIdx}
          position={position}
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
