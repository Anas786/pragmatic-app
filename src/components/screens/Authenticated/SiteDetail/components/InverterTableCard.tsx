import React, { FC, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PulseDot,
  Skeleton,
  Surface,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  glass,
  Scheme,
  semantic,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  formatCompact,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
} from 'src/utils';
import { useDateFilter, useInteractionReady, useInverterReport } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { inverterFilters } from 'src/data/mock';
import DateRangePickerModal from './DateRangePickerModal';
import DateFilterHeader from './DateFilterHeader';
import MonthYearPickerModal from './MonthYearPickerModal';
import {
  mapRowsToEntries,
  InverterEntry,
  MOUNT_CHUNK,
  statusFor,
} from './InverterTable/helpers';
import InverterCard from './InverterTable/InverterCard';
import ReportFilterPill from './PerformanceReport/ReportFilterPill';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const InverterTableCard: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createThemedStyles);
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const {
    activeFilter,
    setActiveFilter,
    reportFilter,
    dateLabel,
    pillDisabled,
    handlePillPress,
    dateRangePickerProps,
    monthPickerProps,
    yearPickerProps,
  } = useDateFilter();

  const { data: reportData, refetch, isLoading, isFetching, error } = useInverterReport(
    siteId,
    reportFilter,
  );
  // Defer the inverter-row mount (10 FadeInDown + Reanimated bars per
  // row) so the chip-morph + hero card render first on a cold visit.
  const ready = useInteractionReady();

  const inverterEntries = useMemo<InverterEntry[]>(
    () => mapRowsToEntries(reportData?.data ?? []),
    [reportData],
  );

  const fleet = useMemo(() => {
    if (inverterEntries.length === 0) return null;
    const valid = inverterEntries.filter(e => e.performanceRatio > 0);
    if (valid.length === 0) return null;
    const avgPr = valid.reduce((s, e) => s + e.performanceRatio, 0) / valid.length;
    const best = valid.reduce((a, b) => (a.performanceRatio >= b.performanceRatio ? a : b));
    const worst = valid.reduce((a, b) => (a.performanceRatio <= b.performanceRatio ? a : b));
    const totalProduction = inverterEntries.reduce(
      (s, e) => s + (e.productionRaw ?? 0),
      0,
    );
    return { avgPr, best, worst, totalProduction, count: inverterEntries.length };
  }, [inverterEntries]);

  /* ── chunked progressive mount ─────────────────────────────────
   * This list can't virtualise inside SiteDetail's ScrollView (same
   * orientation) and each InverterCard is ~20+ native views, so an
   * unbounded fleet must not land in one Fabric commit. Reveal
   * MOUNT_CHUNK rows per frame via a rAF counter (LiveParameterView
   * convention), keyed on `reportFilter` so a period change resets the
   * window synchronously (state-from-render pattern) while refetches
   * of the same period keep already-mounted rows in place. */
  const [reveal, setReveal] = useState(() => ({ key: reportFilter, count: MOUNT_CHUNK }));
  if (reveal.key !== reportFilter) {
    setReveal({ key: reportFilter, count: MOUNT_CHUNK });
  }

  useEffect(() => {
    if (!ready || reveal.count >= inverterEntries.length) return;
    const frame = requestAnimationFrame(() => {
      setReveal(s =>
        s.count >= inverterEntries.length
          ? s
          : { ...s, count: Math.min(s.count + MOUNT_CHUNK, inverterEntries.length) },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, reveal, inverterEntries.length]);

  const visibleEntries = useMemo(
    () =>
      inverterEntries.length > reveal.count
        ? inverterEntries.slice(0, reveal.count)
        : inverterEntries,
    [inverterEntries, reveal.count],
  );

  const renderHero = () => {
    if (!fleet) return null;
    const avgStatus = statusFor(fleet.avgPr);
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
        <HeroGradientCard>
          <HeroTopRow>
            <HeroLiveBadge>
              <PulseDot color={scheme.heroOnGradient} size={8} />
              <OverlineLabel color={scheme.heroOnGradient}>LIVE · FLEET</OverlineLabel>
            </HeroLiveBadge>
            <GlassChip>
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradient}>
                {fleet.count}
              </AppText>
            </GlassChip>
          </HeroTopRow>

          <OverlineLabel color={scheme.heroOnGradientMuted} style={styles.heroSectionLabel}>
            FLEET AVERAGE PR
          </OverlineLabel>
          <HeroValueRow>
            <AppText
              fontSize={FONT_SIZE_XXL}
              bold
              color={scheme.heroOnGradient}
              numberOfLines={1}>
              {fleet.avgPr.toFixed(2)}
            </AppText>
            <AppText fontSize={FONT_SIZE_SM} color={scheme.heroOnGradientMuted} medium>
              %
            </AppText>
            <TintedPill
              color={avgStatus.color}
              alpha="38"
              paddingX={space.sm}
              paddingY={3}
              style={styles.heroStatusPill}>
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradient}>
                {avgStatus.label.toUpperCase()}
              </AppText>
            </TintedPill>
          </HeroValueRow>

          <View style={styles.heroDivider} />

          <AggRow>
            <AggLeft>
              <View style={styles.aggDotBest} />
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradientMuted}>
                BEST
              </AppText>
              <AppText fontSize={FONT_SIZE_XS} color={scheme.heroOnGradient}>
                Inverter {fleet.best.num || '—'}
              </AppText>
            </AggLeft>
            <AppText fontSize={FONT_SIZE_XS} bold color={scheme.heroOnGradient}>
              {fleet.best.performanceRatio.toFixed(2)}%
            </AppText>
          </AggRow>

          <AggRow>
            <AggLeft>
              <View style={styles.aggDotWorst} />
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradientMuted}>
                WORST
              </AppText>
              <AppText fontSize={FONT_SIZE_XS} color={scheme.heroOnGradient}>
                Inverter {fleet.worst.num || '—'}
              </AppText>
            </AggLeft>
            <AppText fontSize={FONT_SIZE_XS} bold color={scheme.heroOnGradient}>
              {fleet.worst.performanceRatio.toFixed(2)}%
            </AppText>
          </AggRow>

          <AggRow>
            <AggLeft>
              <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.heroOnGradientMuted}>
                Σ TOTAL PRODUCTION
              </AppText>
            </AggLeft>
            <AppText fontSize={FONT_SIZE_XS} bold color={scheme.heroOnGradient}>
              {formatCompact(fleet.totalProduction)} kWh
            </AppText>
          </AggRow>
        </HeroGradientCard>
      </Animated.View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filterRow}>
      {inverterFilters.map(filter => (
        <ReportFilterPill
          key={filter}
          active={activeFilter === filter}
          label={filter}
          onPress={() => setActiveFilter(filter)}
        />
      ))}
    </View>
  );

  const renderSkeletons = () => (
    <View style={styles.list}>
      {Array.from({ length: 3 }).map((_, i) => (
        <Surface
          key={i}
          elevation="md"
          radius="xl"
          background={scheme.surface}
          padding={space.lg}
          style={themed.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badgeRow}>
              <Skeleton width={32} height={32} radius="md" />
              <Skeleton width={120} height={14} />
            </View>
            <Skeleton width={80} height={20} radius="pill" />
          </View>
          <View style={styles.metricsRow}>
            <Skeleton width="48%" height={72} radius="md" />
            <Skeleton width="48%" height={72} radius="md" />
          </View>
          <Skeleton width="100%" height={8} radius="md" />
          <Skeleton width="100%" height={8} radius="md" />
        </Surface>
      ))}
    </View>
  );

  const renderList = () => {
    if (!ready) return renderSkeletons();
    if (isLoading && inverterEntries.length === 0) return renderSkeletons();
    // A failed BACKGROUND refetch sets `error` while react-query still
    // holds the previous data — keep showing the cached list in that
    // case (the header spinner covers refresh feedback) and reserve
    // the error card for a genuinely empty cache.
    if (error && inverterEntries.length === 0) {
      return (
        <EmptyStateCard
          title="Couldn't load inverter report"
          message="Tap retry to try again."
          onRetry={() => refetch()}
        />
      );
    }
    if (inverterEntries.length === 0) {
      return <EmptyStateCard message="No inverter data for this period." />;
    }
    return (
      <View style={styles.list}>
        {visibleEntries.map((entry, i) => (
          <InverterCard key={`${entry.title}-${i}`} entry={entry} index={i} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <DateFilterHeader
        title="Inverter Fleet"
        dateLabel={dateLabel}
        pillDisabled={pillDisabled}
        onDatePress={handlePillPress}
        onRefresh={refetch}
        refreshing={isLoading || isFetching}
      />

      {/* Filter pills sit directly under the date selector — they
          drive the API the hero summarises, so it reads top-down:
          control → snapshot → detail list. */}
      {renderFilters()}
      {renderHero()}
      {renderList()}

      <DateRangePickerModal {...dateRangePickerProps} />
      <MonthYearPickerModal {...monthPickerProps} />
      <MonthYearPickerModal {...yearPickerProps} />
    </View>
  );
};

/* ─────────────── local layout boxes ─────────────── */

const AggRow: FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.aggRow}>{children}</View>
);
AggRow.displayName = 'AggRow';

const AggLeft: FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={styles.aggLeft}>{children}</View>
);
AggLeft.displayName = 'AggLeft';

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  heroSectionLabel: {
    marginTop: space.lg,
  },
  heroStatusPill: {
    alignSelf: 'center',
  },
  heroDivider: {
    height: 1,
    marginVertical: space.lg,
    backgroundColor: glass.borderSubtle,
  },
  aggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 4,
  },
  aggLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  aggDotBest: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.success,
  },
  aggDotWorst: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: semantic.warning,
  },
  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
    paddingHorizontal: space.xs,
  },
  list: {
    gap: space.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

const createThemedStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      gap: space.md,
      borderWidth: 1,
      borderColor: scheme.border,
    },
  });

export default InverterTableCard;
