/**
 * TrendView — config-driven trend charts.
 *
 * Reads `siteConfig.siteComponents.trends[]` and renders one
 * `TrendSection` per entry. The data endpoint's `idx` is each entry's
 * index in the ORIGINAL config array — `selectTrends` preserves it as
 * `sourceIdx` even when malformed siblings are dropped. Each section
 * owns its own period filter and fetch; line/area/bar series share one
 * combined chart.
 *
 * The tab opens instantly (ViewsContent defers the body one rAF) and
 * each section shows a skeleton while its request is in flight. The
 * config-loading skeleton below mirrors a section's real geometry
 * (header, period pills, chart card) so nothing jumps when it resolves.
 */

import React, { FC, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { EmptyStateCard, Skeleton } from 'src/components/common';
import { space, touch } from 'src/theme';
import { DashboardStackParamList } from 'src/types';
import { friendlyError, selectTrends, TREND_PERIODS } from 'src/utils';
import { useParamsMapping, useSiteConfig } from 'src/hooks';
import { trendChartLayout, trendChartWidth } from './Trends/helpers';
import TrendSection from './Trends/TrendSection';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/** Sections sketched while the config loads. */
const SKELETON_SECTIONS = 2;

/** A typical (multi-series, one legend row) chart card at this width —
 *  the real sections compute theirs from the configured series. */
const SKELETON_SERIES = [
  { param: 'a', type: 'line' as const, color: '', display: 'Series' },
  { param: 'b', type: 'line' as const, color: '', display: 'Series' },
];

const TrendSectionSkeleton: FC<{ cardHeight: number }> = ({ cardHeight }) => (
  <View style={styles.skeletonSection}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonTitle}>
        <Skeleton width={160} height={20} />
        <Skeleton width={190} height={12} />
      </View>
      <Skeleton width={touch.min} height={touch.min} radius="pill" />
      <Skeleton width={touch.min} height={touch.min} radius="pill" />
    </View>
    <View style={styles.skeletonPills}>
      {TREND_PERIODS.map(p => (
        <Skeleton key={p} width={64} height={touch.pillVisual} radius="pill" />
      ))}
    </View>
    <Skeleton width="100%" height={cardHeight} radius="xl" />
  </View>
);
TrendSectionSkeleton.displayName = 'TrendSectionSkeleton';

const TrendView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  const { width: windowWidth } = useWindowDimensions();

  const { data: config, isLoading, isError, error, refetch } =
    useSiteConfig(siteId);
  // Series labels resolve through /public/config/params-mapping (bootstrap
  // cached + persisted) — without it, configs that omit `display` would
  // render raw p-codes in legends/tooltips. Re-renders once when the
  // bootstrap fetch lands, so labels upgrade in place.
  const paramsMapping = useParamsMapping();
  const trends = useMemo(
    () => selectTrends(config, paramsMapping),
    [config, paramsMapping],
  );
  const friendly = useMemo(() => (error ? friendlyError(error) : null), [error]);

  if (isLoading && trends.length === 0) {
    const { cardHeight } = trendChartLayout(
      SKELETON_SERIES,
      trendChartWidth(windowWidth - 2 * space.lg),
    );
    return (
      <View style={styles.container}>
        {Array.from({ length: SKELETON_SECTIONS }, (_, i) => (
          <TrendSectionSkeleton key={i} cardHeight={cardHeight} />
        ))}
      </View>
    );
  }

  // Config fetch failed and there's no cached config to fall back on —
  // offer a retry instead of wrongly claiming the site has no trends.
  // (A stale cached config with a failed background refetch still
  // renders its charts below.)
  if (isError && friendly && trends.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyStateCard
          kind={friendly.kind === 'offline' ? 'offline' : 'error'}
          title={friendly.title}
          message={friendly.message}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (trends.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyStateCard
          kind="notConfigured"
          title="No analysis charts set up"
          message="This site has no analysis charts configured yet."
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
  // Mirrors TrendSection: hairline + paddingTop, gap sm, header row.
  skeletonSection: {
    gap: space.sm,
    paddingTop: space.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.xs,
    paddingBottom: space.sm,
  },
  skeletonTitle: {
    flex: 1,
    gap: space.xs,
  },
  skeletonPills: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

export default React.memo(TrendView);
