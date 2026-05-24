/**
 * AlarmsView — v3 (modern + aesthetic + animated).
 *
 *  ┌─────────────────────────────────────────┐
 *  │ ●LIVE  ALARMS                  ⚠ 4      │  ← gradient hero
 *  │ 2 unsolved                              │
 *  │ ─────────────────────────────────────── │
 *  │ POWER MIX-style severity bar            │
 *  │ ●CRIT 1 · ●MAJOR 1 · ●MINOR 1 · ●WARN 1 │
 *  └─────────────────────────────────────────┘
 *
 *  [All 4]  [Critical 1]  [Major 1]  [Minor 1]  [Warning 1]
 *
 *  ┌─────────────────────────────────────────┐
 *  │ ▌🔴  [PRIORITY]            10:15 AM     │
 *  │ Wind Turbine 01                         │
 *  │                       ●Unsolved · ETA   │ ← pulsing dot
 *  └─────────────────────────────────────────┘
 */

import React, { FC, ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  createBox,
  Dot,
  EmptyStateCard,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PowerMixBar,
  PulseDot,
} from 'src/components/common';
import {
  duration,
  glass,
  semantic,
  space,
  useScheme,
} from 'src/theme';
import {
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
} from 'src/utils';
import { AlarmCardData, mockAlarmsData } from 'src/data/mock';
import AlarmFilterPill from './AlarmsView/AlarmFilterPill';
import AlarmRow, { SeverityDef, ANIM_LIMIT } from './AlarmsView/AlarmRow';

type SeverityKey = 'priority' | 'major' | 'minor' | 'warning';
type FilterKey = 'all' | SeverityKey;

/* ─────────────── helpers ─────────────── */

const severityFromPriority = (
  priority: AlarmCardData['priority'],
): SeverityKey => {
  switch (priority) {
    case 'Priority': return 'priority';
    case 'Major': return 'major';
    case 'Minor': return 'minor';
    case 'Warning':
    default: return 'warning';
  }
};

/* ─────────────── hero legend item ─────────────── */

interface HeroLegendItemProps {
  color: string;
  label: string;
  count: number;
  labelColor: string;
  countColor: string;
}

const HeroLegendItemComp: FC<HeroLegendItemProps> = ({
  color,
  label,
  count,
  labelColor,
  countColor,
}) => (
  <HeroLegendItemBox>
    <Dot color={color} size={8} />
    <AppText fontSize={FONT_SIZE_XXS} bold color={labelColor} numberOfLines={1}>
      {label}
    </AppText>
    <AppText fontSize={FONT_SIZE_XXS} color={countColor}>
      {count}
    </AppText>
  </HeroLegendItemBox>
);

/* ─────────────── component ─────────────── */

const AlarmsView: FC = () => {
  const scheme = useScheme();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Severity definitions — colour from the semantic palette so it stays
  // theme-aware. `rank` drives the sort order in the list.
  const severities: SeverityDef[] = useMemo(
    () => [
      { key: 'priority', label: 'Priority', color: semantic.danger, rank: 4 },
      { key: 'major', label: 'Major', color: semantic.warning, rank: 3 },
      { key: 'minor', label: 'Minor', color: semantic.info, rank: 2 },
      { key: 'warning', label: 'Warning', color: scheme.accentGold, rank: 1 },
    ],
    [scheme.accentGold],
  );

  const severityByKey = useMemo(() => {
    const map = new Map<SeverityKey, SeverityDef>();
    severities.forEach(s => map.set(s.key, s));
    return map;
  }, [severities]);

  const enriched = useMemo(
    () =>
      mockAlarmsData
        .map(a => ({
          alarm: a,
          severity: severityByKey.get(severityFromPriority(a.priority))!,
        }))
        .sort((a, b) => b.severity.rank - a.severity.rank),
    [severityByKey],
  );

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: enriched.length,
      priority: 0,
      major: 0,
      minor: 0,
      warning: 0,
    };
    for (const e of enriched) c[e.severity.key] += 1;
    return c;
  }, [enriched]);

  const visibleFilters = useMemo(
    () => [
      { key: 'all' as FilterKey, label: 'All', color: scheme.brand },
      ...severities
        .filter(s => counts[s.key] > 0)
        .map(s => ({ key: s.key as FilterKey, label: s.label, color: s.color })),
    ],
    [severities, counts, scheme.brand],
  );

  const filtered = useMemo(
    () =>
      activeFilter === 'all'
        ? enriched
        : enriched.filter(e => e.severity.key === activeFilter),
    [enriched, activeFilter],
  );

  const unsolvedCount = useMemo(
    () => enriched.filter(e => e.alarm.status === 'Unsolved').length,
    [enriched],
  );

  // Severity breakdown for the hero bar (rank-sorted, only non-zero).
  // `count` (not `value`) — Reanimated's "shared value `.value` inside
  // inline style" warning has a heuristic that flags ANY `.value` access
  // inside a style object, including plain JS object properties. We
  // hand a count of alarms to a `flex:` style below, so renaming the
  // field avoids the false positive.
  const breakdown = useMemo(
    () =>
      severities
        .filter(s => counts[s.key] > 0)
        .map(s => ({
          key: s.key,
          label: s.label,
          color: s.color,
          count: counts[s.key],
        })),
    [severities, counts],
  );

  /* ── render branches ──────────────────────────────────────── */

  // Empty state — celebratory feel when nothing to triage.
  if (enriched.length === 0) {
    return (
      <EmptyStateCard
        padding="3xl"
        prominent
        icon={
          <EmptyIconWell>
            <PulseDot color={scheme.brand} size={14} />
          </EmptyIconWell>
        }
        title="All clear"
        message="No alarms reported."
      />
    );
  }

  // Hero variant flips by alarm state — emerald gradient when calm,
  // saturated rose when alarms need attention.
  const heroIsCalm = unsolvedCount === 0;
  const heroVariant = heroIsCalm ? 'brand' : 'danger';
  const heroTextColor = scheme.heroOnGradient;
  const heroSubText = heroIsCalm
    ? scheme.heroOnGradientMuted
    : scheme.heroDangerOnGradientMuted;

  const mixSegments = breakdown.map(b => ({
    key: b.key,
    color: b.color,
    weight: b.count,
  }));

  return (
    <Container>
      {/* ── Hero — alarm summary ─────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
        <HeroGradientCard variant={heroVariant}>
          <HeroTopRow>
            <HeroLiveBadge>
              <PulseDot color={heroTextColor} />
              <OverlineLabel color={heroTextColor}>LIVE · ALARMS</OverlineLabel>
            </HeroLiveBadge>
            <GlassChip>
              <AppText fontSize={FONT_SIZE_XXS} bold color={heroTextColor}>
                {enriched.length}
              </AppText>
            </GlassChip>
          </HeroTopRow>

          <OverlineLabel color={heroSubText} style={styles.heroSectionLabel}>
            {heroIsCalm ? 'ALL RESOLVED' : 'UNSOLVED'}
          </OverlineLabel>
          <HeroValueRow>
            <AppText
              fontSize={FONT_SIZE_XXL}
              bold
              color={heroTextColor}
              numberOfLines={1}>
              {heroIsCalm ? enriched.length : unsolvedCount}
            </AppText>
            <AppText fontSize={FONT_SIZE_SM} color={heroSubText} medium>
              {heroIsCalm ? 'closed' : `of ${enriched.length}`}
            </AppText>
          </HeroValueRow>

          {breakdown.length > 0 ? (
            <HeroMixSection>
              <HeroMixHeader>
                <OverlineLabel color={heroSubText}>SEVERITY</OverlineLabel>
              </HeroMixHeader>

              <PowerMixBar segments={mixSegments} />

              <HeroMixLegend>
                {breakdown.map(b => (
                  <HeroLegendItemComp
                    key={b.key}
                    color={b.color}
                    label={b.label}
                    count={b.count}
                    labelColor={heroTextColor}
                    countColor={heroSubText}
                  />
                ))}
              </HeroMixLegend>
            </HeroMixSection>
          ) : null}
        </HeroGradientCard>
      </Animated.View>

      {/* ── Filter pills ─────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {visibleFilters.map(f => (
          <AlarmFilterPill
            key={f.key}
            active={activeFilter === f.key}
            color={f.color}
            label={f.label}
            count={counts[f.key]}
            onPress={() => setActiveFilter(f.key)}
          />
        ))}
      </ScrollView>

      {/* ── Alarm list ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyStateCard message="Nothing in this severity bucket." />
      ) : (
        <List>
          {filtered.map(({ alarm, severity }, i) => (
            <AlarmRow
              key={`${alarm.title}-${i}`}
              data={alarm}
              severity={severity}
              index={i}
            />
          ))}
        </List>
      )}
    </Container>
  );
};

/* ─────────────── EmptyIconWell ─────────────── */

const EmptyIconWell: FC<{ children?: ReactNode }> = ({ children }) => {
  const scheme = useScheme();
  return (
    <View
      style={[
        styles.emptyIconWell,
        { backgroundColor: scheme.brandSoft },
      ]}>
      {children}
    </View>
  );
};
EmptyIconWell.displayName = 'EmptyIconWell';

/* ─────────────── styled wrappers ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.md,
  },
  heroSectionLabel: {
    marginTop: space.lg,
  },
  heroMixSection: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: glass.borderSubtle,
    gap: space.md,
  },
  heroMixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroMixLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    rowGap: space.sm,
  },
  heroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '28%',
  },
  filterRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 4,
  },
  list: {
    gap: space.md,
  },
  emptyIconWell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const Container = createBox(styles.container, 'Container');
const HeroMixSection = createBox(styles.heroMixSection, 'HeroMixSection');
const HeroMixHeader = createBox(styles.heroMixHeader, 'HeroMixHeader');
const HeroMixLegend = createBox(styles.heroMixLegend, 'HeroMixLegend');
const HeroLegendItemBox = createBox(styles.heroLegendItem, 'HeroLegendItemBox');
const List = createBox(styles.list, 'List');

export default React.memo(AlarmsView);
