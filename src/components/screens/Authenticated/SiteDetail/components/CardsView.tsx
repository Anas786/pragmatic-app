/**
 * CardsView — v5 (no hero, honest sections).
 *
 * The site's backend cards are heterogeneous (power, energy, irradiance,
 * temperature, …), so the tab shows them as-is — no summed "total", no
 * invented mix — grouped by the time window each card's NAME states
 * (`cardBucket`, src/utils/cards.ts):
 *
 *  Key metrics                           17 metrics
 *
 *  POWER NOW            ← kW / MW readings
 *  ┌──────┐ ┌──────┐
 *  │ Wind │ │ Solar│ …
 *  └──────┘ └──────┘
 *  ENERGY TODAY         ← kWh + 'Today' in the name
 *  ENERGY THIS YEAR     ← YTD / month / week counters ('… this period' if mixed)
 *  ENERGY LIFETIME
 *  ENERGY               ← kWh with no period in the name (we don't guess)
 *  OTHER METRICS        ← W/m², °C, %, unitless, peaks
 *
 * No PulseDot here: this is a current-values grid, but the LIVE heartbeat
 * belongs to the Summary hero and the Live tab (one pulse per screen).
 * Values are the backend's own numbers and units ('147,786.00 kWh') so the
 * tab reads exactly like the web portal.
 */

import React, { FC, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  OverlineLabel,
  createBox,
} from 'src/components/common';
import { duration, energyPalette, space } from 'src/theme';
import {
  cardBucket,
  cardTileLabel,
  extractCardConfigs,
  formatCardDisplay,
  groupCardSections,
  resolveCardValue,
} from 'src/utils/cards';
import { sourceTokenFromName } from 'src/utils/sources';
import { metricA11yLabel } from 'src/utils/a11y';
import { friendlyError } from 'src/utils/errors';
import { resolveLottieIcon } from 'src/assets/gif';
import { useInteractionReady, useSiteConfig, useSiteData } from 'src/hooks';
import TabSkeleton from './TabSkeleton';
import { DashboardStackParamList } from 'src/types';
import SourceTile, {
  ResolvedCard,
  SourceTileSpacer,
  SourceToken,
} from './CardsView/SourceTile';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/* ─────────────── helpers ─────────────── */

/**
 * Classify a card by its source via the shared `sourceTokenFromName`
 * dictionary (CLAUDE.md §4.4/§9). Only names actually containing "load"
 * are LOAD — generation totals ("Total Plant Yield", "Total Generation")
 * are NOT load, so unmatched names fall to the neutral 'other' token.
 * Display only (tint + spoken source), never a value path.
 */
const sourceFor = (name: string): SourceToken => {
  const token = sourceTokenFromName(name);
  if (token) return token;
  if (name.toLowerCase().includes('load')) return 'load';
  return 'other';
};

const accentFor = (token: SourceToken): string | undefined =>
  token === 'load' || token === 'other' ? undefined : energyPalette[token];

const metricsCaption = (n: number) => `${n} metric${n === 1 ? '' : 's'}`;

// Snappy section entrance: a handful of sections at most.
const stagger = (i: number) =>
  FadeInDown.delay(30 * i)
    .duration(duration.fast)
    .springify()
    .damping(20);

/* ─────────────── component ─────────────── */

const CardsView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;

  const {
    data: siteConfig,
    isLoading: configLoading,
    isError: configError,
    error: configErrorObj,
    refetch: refetchConfig,
  } = useSiteConfig(siteId);
  // A failed BACKGROUND refresh of `/data/all` over cached values is
  // reported once, for every tab, by SiteDetail's one-line
  // RefreshStatusStrip (with its own Retry) — so this tab shows no second
  // error card for it. (CardsView only mounts once both payloads exist.)
  const {
    data: liveData,
    isLoading: dataLoading,
    isError: dataError,
    refetch: refetchData,
  } = useSiteData(siteId);
  // Defer the SourceTile grid (each tile decodes an animated GIF, which
  // is expensive when many cards are configured) so the tab opens
  // instantly with a skeleton on a cold visit.
  const ready = useInteractionReady();

  // Every display string is built here, once per fetch — the memoised
  // tiles do no formatting work in render.
  const resolved: ResolvedCard[] = useMemo(() => {
    const seen = new Map<string, number>();
    return extractCardConfigs(siteConfig).map(card => {
      const bucket = cardBucket(card);
      const source = sourceFor(card.name);
      const quantity = formatCardDisplay(
        resolveCardValue(card, liveData),
        card.unit,
        card.name,
      );
      const baseKey = `${card.objKey}:${card.name}`;
      const dup = seen.get(baseKey) ?? 0;
      seen.set(baseKey, dup + 1);
      const sourceWord = source === 'load' || source === 'other' ? '' : source;
      return {
        key: dup === 0 ? baseKey : `${baseKey}#${dup}`,
        card,
        bucket,
        label: cardTileLabel(card.name, bucket),
        quantity,
        a11yLabel: metricA11yLabel(card.name, quantity, [sourceWord]),
        lottie: resolveLottieIcon(card.icon),
        source,
        accent: accentFor(source),
      };
    });
  }, [siteConfig, liveData]);

  const sections = useMemo(
    () => groupCardSections(resolved, r => r.card),
    [resolved],
  );

  // friendlyError logs in __DEV__ — compute once per error, not per render.
  const configFriendly = useMemo(
    () => (configError ? friendlyError(configErrorObj) : null),
    [configError, configErrorObj],
  );

  const count = resolved.length;

  // Open instantly → skeleton while the deferred mount settles or data
  // is still loading from cache/API.
  if (!ready || ((configLoading || dataLoading) && count === 0)) {
    return <TabSkeleton />;
  }

  if (count === 0) {
    // A failed config fetch means we simply don't KNOW the card list —
    // don't assert "no cards configured" (factually wrong) with no way
    // to recover.
    if (configFriendly) {
      return (
        <EmptyStateCard
          kind={configFriendly.kind === 'offline' ? 'offline' : 'error'}
          title={configFriendly.title}
          message={configFriendly.message}
          onRetry={() => {
            refetchConfig();
            if (dataError) refetchData();
          }}
        />
      );
    }
    return (
      <EmptyStateCard
        kind="notConfigured"
        title="No metrics for this site"
        message="Your administrator can add metric cards in the web portal."
      />
    );
  }

  return (
    <Container>
      {/* ── Static section title — the Live tab owns the LIVE heartbeat ── */}
      <Animated.View entering={stagger(0)}>
        <TitleRow>
          <AppText variant="h3" tone="primary" accessibilityRole="header">
            Key metrics
          </AppText>
          <AppText variant="caption" tone="secondary">
            {metricsCaption(count)}
          </AppText>
        </TitleRow>
      </Animated.View>

      {sections.map((section, s) => (
        <Animated.View key={section.bucket} entering={stagger(s + 1)}>
          <SectionHeader
            accessible
            accessibilityRole="header"
            accessibilityLabel={section.title}>
            <OverlineLabel tone="secondary">{section.title}</OverlineLabel>
          </SectionHeader>
          <Grid>
            {section.items.map((r, i) => (
              <SourceTile
                key={r.key}
                resolved={r}
                index={section.startIndex + i}
              />
            ))}
            {section.items.length % 2 === 1 ? <SourceTileSpacer /> : null}
          </Grid>
        </Animated.View>
      ))}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: space.sm,
    paddingHorizontal: space.xs,
  },
  sectionHeader: {
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
const TitleRow = createBox(styles.titleRow, 'TitleRow');
const SectionHeader = createBox(styles.sectionHeader, 'SectionHeader');
const Grid = createBox(styles.grid, 'Grid');

export default React.memo(CardsView);
