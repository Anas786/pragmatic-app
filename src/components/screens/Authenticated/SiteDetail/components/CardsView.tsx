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
 *  │ POWER NOW                          (kW)   │
 *  │ ┌──────┐ ┌──────┐                         │
 *  │ │ Solar│ │ Wind │ …                       │
 *  │ └──────┘ └──────┘                         │
 *  │                                           │
 *  │ TODAY'S ENERGY                     (kWh)  │
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
  TintedPill,
  OverlineLabel,
  PulseDot,
  Surface,
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
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
} from 'src/utils';
import { resolveLottieIcon } from 'src/assets/gif';
import { useInteractionReady, useSiteConfig, useSiteData } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { BoltIcon } from 'src/assets/icons';
import SourceTile, { ResolvedCard, SourceToken } from './CardsView/SourceTile';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/* ─────────────── helpers ─────────────── */

const sourceFor = (name: string): SourceToken => {
  const n = name.toLowerCase();
  if (n.includes('solar') || n.includes('pv')) return 'solar';
  if (n.includes('wind')) return 'wind';
  if (n.includes('grid')) return 'grid';
  if (n.includes('genset') || n.includes('dg')) return 'genset';
  if (n.includes('battery') || n.includes('bess')) return 'battery';
  if (n.includes('load') || n.includes('total')) return 'load';
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

  const { data: siteConfig } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);
  // Defer the SourceTile grid (each tile mounts a Lottie animation,
  // which is expensive when many sources are configured) so the
  // header + LIVE chip can commit first on a cold tab visit.
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
      const unit = (card.unit ?? '').toLowerCase();
      const bucket: ResolvedCard['bucket'] = unit.includes('kwh')
        ? 'today'
        : unit === 'kw' || unit === 'mw'
          ? 'now'
          : 'other';
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

  if (liveCount === 0) {
    return (
      <Surface
        elevation="md"
        radius="xl"
        background={scheme.surface}
        padding={space['2xl']}
        style={styles.emptyCard}>
        <AppText fontSize={FONT_SIZE_SM} color={scheme.textSecondary} center>
          No cards configured for this site.
        </AppText>
      </Surface>
    );
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

      {/* ── Power now ─────────────────────────────────────────── */}
      {ready && nowTiles.length > 0 ? (
        <Animated.View entering={stagger(1)}>
          <SectionHeader>
            <OverlineLabel color={scheme.textTertiary}>POWER NOW</OverlineLabel>
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              kW
            </AppText>
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
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              kWh
            </AppText>
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
  emptyCard: {
    alignItems: 'center',
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
