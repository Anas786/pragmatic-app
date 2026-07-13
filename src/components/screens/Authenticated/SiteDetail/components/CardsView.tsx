/**
 * CardsView — v4 (no hero).
 *
 * The previous "TOTAL LOAD + POWER MIX" hero was removed because the
 * site's cards are heterogeneous (power, energy, temperature, voltage,
 * …) — summing them produces a meaningless "total", and a per-source
 * "mix" is fiction when the cards aren't all generation on the same
 * bus. The grid speaks for itself.
 *
 *  ┌── LIVE METRICS · 16 ──────────────────────┐
 *  │  ●                                        │
 *  ├───────────────────────────────────────────┤
 *  │ POWER NOW                                 │
 *  │ ┌──────┐ ┌──────┐                         │
 *  │ │ Solar│ │ Wind │ …                       │
 *  │ └──────┘ └──────┘                         │
 *  │                                           │
 *  │ TODAY'S ENERGY                            │
 *  │ ┌──────┐ ┌──────┐                         │
 *  │ └──────┘ └──────┘                         │
 *  │                                           │
 *  │ OTHER                                     │
 *  │ ┌──────┐                                  │
 *  └───────────────────────────────────────────┘
 */

import React, { FC, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  TintedPill,
  OverlineLabel,
  PulseDot,
  createBox,
} from 'src/components/common';
import {
  duration,
  energyPalette,
  space,
  useScheme,
} from 'src/theme';
import {
  extractCardConfigs,
  formatCardValue,
  resolveCardValue,
  sourceTokenFromName,
  FONT_SIZE_XXS,
} from 'src/utils';
import { resolveLottieIcon } from 'src/assets/gif';
import { useInteractionReady, useSiteConfig, useSiteData } from 'src/hooks';
import TabSkeleton from './TabSkeleton';
import { DashboardStackParamList } from 'src/types';
import { BoltIcon } from 'src/assets/icons';
import SourceTile, { ResolvedCard, SourceToken } from './CardsView/SourceTile';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/* ─────────────── helpers ─────────────── */

/**
 * Classify a card by its source via the shared `sourceTokenFromName`
 * dictionary (CLAUDE.md §4.4/§9). Only names actually containing "load"
 * get the LOAD badge — generation totals ("Total Plant Yield", "Total
 * Generation") are NOT load, so unmatched names fall to the neutral
 * 'other' token instead.
 */
const sourceFor = (name: string): SourceToken => {
  const token = sourceTokenFromName(name);
  if (token) return token;
  if (name.toLowerCase().includes('load')) return 'load';
  return 'other';
};

/**
 * Section bucket for a card.
 *
 *  - Power units (kW / MW)          → POWER NOW
 *  - Energy units (kWh / MWh / GWh) → TODAY'S ENERGY, unless the name
 *    marks it as a lifetime/cumulative counter (Total Plant Yield, …),
 *    which belongs under OTHER — a lifetime total is not today's
 *    production. "…Today"/"Daily…" wins when both match ("Plant Yield
 *    Today" stays in TODAY'S ENERGY).
 *  - Everything else                → OTHER
 */
const bucketFor = (
  name: string,
  rawUnit: string | undefined,
): ResolvedCard['bucket'] => {
  const unit = (rawUnit ?? '').toLowerCase();
  if (unit === 'kw' || unit === 'mw') return 'now';
  if (/\b[kmg]?wh\b/.test(unit)) {
    if (/today|daily/i.test(name)) return 'today';
    if (/total|lifetime|cumulative|yield/i.test(name)) return 'other';
    return 'today';
  }
  return 'other';
};

const accentFor = (token: SourceToken, brand: string): string => {
  if (token === 'load' || token === 'other') return brand;
  return energyPalette[token];
};

// Snappy sub-tab entrance: full 4-step stagger lands in ~270ms.
const stagger = (i: number) =>
  FadeInDown.delay(30 * i).duration(duration.fast).springify().damping(20);

/* ─────────────── component ─────────────── */

const CardsView: FC = () => {
  const scheme = useScheme();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const {
    data: siteConfig,
    isLoading: configLoading,
    isError: configError,
    refetch: refetchConfig,
  } = useSiteConfig(siteId);
  const {
    data: liveData,
    isLoading: dataLoading,
    isError: dataError,
    refetch: refetchData,
  } = useSiteData(siteId);
  // Defer the SourceTile grid (each tile mounts a Lottie animation,
  // which is expensive when many sources are configured) so the tab
  // opens instantly with a skeleton on a cold visit.
  const ready = useInteractionReady();

  const resolved: ResolvedCard[] = useMemo(() => {
    const configs = extractCardConfigs(siteConfig);
    return configs.map(card => {
      const rawValue = resolveCardValue(card, liveData);
      const lottie = resolveLottieIcon(card.icon);
      const source = sourceFor(card.name);
      const accent = accentFor(source, scheme.brand);
      const num =
        typeof rawValue === 'number' && Number.isFinite(rawValue)
          ? rawValue
          : null;
      const bucket = bucketFor(card.name, card.unit);
      return {
        card,
        formatted: formatCardValue(rawValue, 2),
        numeric: num,
        lottie,
        source,
        accent,
        bucket,
      };
    });
  }, [siteConfig, liveData, scheme.brand]);

  const { nowTiles, todayTiles, otherTiles } = useMemo(
    () => ({
      nowTiles: resolved.filter(r => r.bucket === 'now'),
      todayTiles: resolved.filter(r => r.bucket === 'today'),
      otherTiles: resolved.filter(r => r.bucket === 'other'),
    }),
    [resolved],
  );

  const liveCount = resolved.length;

  // Open instantly → skeleton while the deferred mount settles or data
  // is still loading from cache/API.
  if (!ready || ((configLoading || dataLoading) && liveCount === 0)) {
    return <TabSkeleton />;
  }

  if (liveCount === 0) {
    // A failed config fetch means we simply don't KNOW the card list —
    // don't assert "no cards configured" (factually wrong) with no way
    // to recover. Same error-card + retry pattern as InverterTableCard.
    if (configError) {
      return (
        <EmptyStateCard
          title="Couldn't load site cards"
          message="Tap retry to try again."
          onRetry={() => {
            refetchConfig();
            if (dataError) refetchData();
          }}
        />
      );
    }
    return <EmptyStateCard message="No cards configured for this site." />;
  }

  return (
    <Container>
      {/* ── Honest live header — no aggregate value, just a heartbeat ── */}
      <Animated.View entering={stagger(0)}>
        <LiveHeaderRow>
          <LiveHeaderLeft>
            <PulseDot color={scheme.brand} size={8} />
            <OverlineLabel color={scheme.textTertiary}>
              LIVE METRICS
            </OverlineLabel>
          </LiveHeaderLeft>
          {/* TintedPill — GlassChip's translucent-white bg disappears
              on the light page background. A brand-tinted pill reads
              cleanly in both modes and matches the LIVE pulse-dot
              tone. */}
          <TintedPill color={scheme.brand} alpha="1F" row paddingX={space.sm}>
            <BoltIcon size={11} color={scheme.brand} />
            <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.brand}>
              {liveCount}
            </AppText>
          </TintedPill>
        </LiveHeaderRow>
      </Animated.View>

      {/* Config resolved but the live-data fetch failed — the tiles
          below show cached (possibly stale) or NA values. Surface the
          failure + an in-place retry instead of failing silently. */}
      {dataError ? (
        <EmptyStateCard
          padding="lg"
          message="Live values couldn't be refreshed."
          onRetry={() => refetchData()}
        />
      ) : null}

      {/* ── Power now ─────────────────────────────────────────── */}
      {ready && nowTiles.length > 0 ? (
        <Animated.View entering={stagger(1)}>
          {/* No hardcoded unit annotation — buckets mix kW/MW (and
              kWh/MWh/GWh below); every tile shows its own card.unit. */}
          <SectionHeader>
            <OverlineLabel color={scheme.textTertiary}>POWER NOW</OverlineLabel>
          </SectionHeader>
          <Grid>
            {nowTiles.map((r, i) => (
              <SourceTile key={`now-${i}`} resolved={r} index={i} />
            ))}
          </Grid>
        </Animated.View>
      ) : null}

      {/* ── Today's energy ────────────────────────────────────── */}
      {ready && todayTiles.length > 0 ? (
        <Animated.View entering={stagger(2)}>
          <SectionHeader>
            <OverlineLabel color={scheme.textTertiary}>
              TODAY'S ENERGY
            </OverlineLabel>
          </SectionHeader>
          <Grid>
            {todayTiles.map((r, i) => (
              <SourceTile
                key={`today-${i}`}
                resolved={r}
                index={nowTiles.length + i}
              />
            ))}
          </Grid>
        </Animated.View>
      ) : null}

      {/* ── Other ─────────────────────────────────────────────── */}
      {ready && otherTiles.length > 0 ? (
        <Animated.View entering={stagger(3)}>
          <SectionHeader>
            <OverlineLabel color={scheme.textTertiary}>OTHER</OverlineLabel>
          </SectionHeader>
          <Grid>
            {otherTiles.map((r, i) => (
              <SourceTile
                key={`other-${i}`}
                resolved={r}
                index={nowTiles.length + todayTiles.length + i}
              />
            ))}
          </Grid>
        </Animated.View>
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    paddingBottom: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
});

const Container = createBox(styles.container, 'Container');
const LiveHeaderRow = createBox(styles.liveHeaderRow, 'LiveHeaderRow');
const LiveHeaderLeft = createBox(styles.liveHeaderLeft, 'LiveHeaderLeft');
const SectionHeader = createBox(styles.sectionHeader, 'SectionHeader');
const Grid = createBox(styles.grid, 'Grid');

export default React.memo(CardsView);
