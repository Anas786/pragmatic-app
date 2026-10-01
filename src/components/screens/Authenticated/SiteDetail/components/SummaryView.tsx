/**
 * SummaryView — v3.
 *
 * Layout direction: command-center / glance-first.
 *
 *  ┌─────────────────────────────────────────┐
 *  │ ● LIVE · YIELD             [To date] ⚡  │  (hero card)
 *  │ TOTAL PLANT YIELD                       │
 *  │ 142,781.74 MWh                          │
 *  │ ─────────────────────────────────────── │
 *  │ [icon] Revenue · to date                │
 *  │        27,128,529.84 USD                │
 *  └─────────────────────────────────────────┘
 *
 *  Environmental impact · Since commissioning
 *  ┌────────┐ ┌────────┐ ┌────────┐
 *  │ CO₂    │ │ Coal   │ │ Trees  │  (impact row, compact values)
 *  │ 30.3K t│ │ 68.4M t│ │ 162M   │
 *  └────────┘ └────────┘ └────────┘
 *
 *  Energy flow                       ● Live
 *  ┌─────────────────────────────────────────┐
 *  │  [SLD diagram]                          │
 *  └─────────────────────────────────────────┘
 *
 * Data (unchanged — every figure matches the web portal, rules O1–O3):
 *   - p24 (`live.p24.value`) is the plant's CUMULATIVE yield counter, not
 *     today's. The hero shows p24 / 1000 in MWh — the web prints the same
 *     number with a lowercase 'mWh' typo — precise, never rescaled.
 *   - Revenue = p24 × site_info.revenue.tariff, in site_info.revenue.currency
 *     (from the backend; nothing is shown when it is missing).
 *   - CO₂ / coal / trees are the same p24-based figures the web shows,
 *     "since commissioning"; product owns their factors (O2).
 *   - The LIVE / DELAYED badge and the Energy-flow Live tag read the site's
 *     `live.metadata.last_update` via siteDetailModel's `headerLastUpdate` —
 *     the SAME function the SiteDetail header uses, so the two can never
 *     disagree, and the stamp the web portal shows (O6).
 */

import React, { FC, ReactNode, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  createBox,
  GlassChip,
  HeroGradientCard,
  HeroStatusBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
} from 'src/components/common';
import {
  duration,
  glass,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { BoltIcon } from 'src/assets/icons';
import { resolveCardValue } from 'src/utils/cards';
import { numericCardValue } from 'src/utils/sources';
import { formatQuantity } from 'src/utils/units';
import { metricA11yLabel } from 'src/utils/a11y';
import { dataFreshness } from 'src/utils/freshness';
import { headerLastUpdate } from 'src/components/screens/Authenticated/SiteDetail/siteDetailModel';
import { selectSldGraph } from 'src/utils/sld';
import { useInteractionReady, useSiteConfig, useSiteData } from 'src/hooks';
import { useNow } from 'src/hooks/useNow';
import TabSkeleton from './TabSkeleton';
import {
  DashboardStackParamList,
  ICardConfig,
  ISiteAllData,
  ISiteConfig,
} from 'src/types';
import { revenueLottie } from 'src/assets/lottie';
import SLDDiagram, { SLDDiagramPlaceholder, SLDEmptyState } from './SLDDiagram';
import SummaryEnvImpact, {
  OneShotLottie,
} from './SummaryView/SummaryEnvImpact';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/* ─────────────── data resolution (unchanged from v1) ─────────────── */

const P24_PROBE: ICardConfig = {
  name: '',
  dataStore: 'live',
  objKey: 'live.p24.value',
};

const KWH_TO_MWH = 1 / 1000;

const getP24 = (
  liveData: ISiteAllData | null | undefined,
): number | undefined => {
  // Backend sometimes serializes numbers as strings (CLAUDE.md §14) —
  // coerce via the shared helper instead of discarding non-number leaves.
  return numericCardValue(resolveCardValue(P24_PROBE, liveData)) ?? undefined;
};

interface SummaryContext {
  tariff: number | undefined;
  /** Backend currency code; undefined when the site config has none. */
  currency: string | undefined;
}

const extractRevenueContext = (
  siteConfig: ISiteConfig | undefined | null,
): SummaryContext => {
  if (!siteConfig || typeof siteConfig !== 'object') {
    return { tariff: undefined, currency: undefined };
  }
  const cfg = siteConfig as Record<string, unknown>;
  const siteInfo = cfg.site_info;
  const revenueCfg =
    siteInfo && typeof siteInfo === 'object'
      ? (siteInfo as Record<string, unknown>).revenue
      : undefined;
  if (!revenueCfg || typeof revenueCfg !== 'object') {
    return { tariff: undefined, currency: undefined };
  }
  const r = revenueCfg as Record<string, unknown>;
  return {
    tariff:
      typeof r.tariff === 'number' && Number.isFinite(r.tariff)
        ? r.tariff
        : undefined,
    currency:
      typeof r.currency === 'string' && r.currency.trim().length > 0
        ? r.currency.trim()
        : undefined,
  };
};

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  heroBoltWell: {
    width: 32,
    height: 32,
    borderRadius: radiusTokens.md,
    backgroundColor: glass.medium,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroYield: {
    marginTop: space.lg,
  },
  // The ONE hero number: shrinks to fit (allowed for a single hero value)
  // rather than truncating a digit.
  heroValueText: {
    flexShrink: 1,
  },
  heroDivider: {
    height: 1,
    marginVertical: space.lg,
    backgroundColor: glass.borderSubtle,
  },
  heroRevenue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  heroRevenueBody: {
    flex: 1,
    gap: 2,
  },
  heroRevenueValueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 6,
  },
  heroRevenueValue: {
    flexShrink: 1,
  },
  smallLottie: {
    width: 28,
    height: 28,
  },
  sldSection: {
    gap: space.sm,
  },
  sldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
    paddingBottom: 4,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

const createSummaryStyles = (scheme: Scheme) =>
  StyleSheet.create({
    smallIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radiusTokens.md,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: scheme.accentGold + '33',
      borderWidth: 1,
      borderColor: scheme.accentGold + '66',
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: scheme.brand,
    },
  });

/* ─────────────── styled wrappers ─────────────── */

const Container = createBox(styles.container, 'Container');
const HeroTopRight = createBox(styles.heroTopRight, 'HeroTopRight');
const HeroBoltWell = createBox(styles.heroBoltWell, 'HeroBoltWell');
const HeroDivider = createBox(styles.heroDivider, 'HeroDivider');
const SldHeader = createBox(styles.sldHeader, 'SldHeader');
const LiveTag = createBox(styles.liveTag, 'LiveTag');

const SmallIconWrap: FC<{ children?: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createSummaryStyles);
  return <View style={themed.smallIconWrap}>{children}</View>;
};
SmallIconWrap.displayName = 'SmallIconWrap';

const LiveDot: FC = () => {
  const themed = useThemedStyles(createSummaryStyles);
  return <View style={themed.liveDot} />;
};
LiveDot.displayName = 'LiveDot';

/**
 * 'Live' tag beside the Energy-flow title — shown only while the data is
 * live by the shared freshness model. A static dot: the hero badge is the
 * screen's one pulsing element. Subscribes to the 30 s `useNow` tick on
 * its own, so the Summary tree doesn't re-render on the tick.
 */
const SldLiveTag: FC<{ lastUpdate: number | null }> = memo(({ lastUpdate }) => {
  const now = useNow();
  if (dataFreshness(lastUpdate, now).level !== 'live') return null;
  return (
    <LiveTag accessible accessibilityLabel="Live data">
      <LiveDot />
      <AppText variant="caption" medium tone="brand">
        Live
      </AppText>
    </LiveTag>
  );
});
SldLiveTag.displayName = 'SldLiveTag';

/* ─────────────── component ─────────────── */

const SummaryView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  const scheme = useScheme();
  const { data: liveData, isLoading } = useSiteData(siteId);
  const { data: siteConfig } = useSiteConfig(siteId);
  const ready = useInteractionReady();

  // SLDDiagram (Skia canvas + gesture handlers + node cards) must land in a
  // LATER commit than the hero/env tree. InteractionManager.runAfterInteractions
  // fired on the next tick here — native-stack transitions and the tab-chip
  // morph register no JS interaction handles — so the "deferred" mount
  // collapsed into the same commit as the rest of the tab and the
  // placeholder never showed. A second, longer mount-anchored timer is
  // deterministic: `ready` flips at 120 ms, the diagram at 300 ms, so the
  // heavy subtree never shares a commit with the main tree.
  const showDiagram = useInteractionReady(300);

  const ctx = useMemo<SummaryContext>(
    () => extractRevenueContext(siteConfig),
    [siteConfig],
  );

  // Whether the site HAS a diagram is known from the config alone, so the
  // section can show the compact empty state straight away instead of a
  // 480pt placeholder that would collapse at the deferred mount.
  const diagramState = useMemo<'unknown' | 'empty' | 'ready'>(() => {
    if (siteConfig === undefined) return 'unknown';
    return selectSldGraph(siteConfig) ? 'ready' : 'empty';
  }, [siteConfig]);

  // The SiteDetail header's own resolver (payload site stamp → newest
  // parameter → the site-list value the Dashboard card showed), so the
  // hero badge, the Energy-flow tag and the header show ONE age.
  const routeLastUpdate = route.params.dataLastUpdate;
  const lastUpdate = useMemo(
    () => headerLastUpdate(liveData, routeLastUpdate),
    [liveData, routeLastUpdate],
  );

  const p24 = getP24(liveData);

  const yieldMwh = p24 !== undefined ? p24 * KWH_TO_MWH : undefined;
  const revenue =
    p24 !== undefined && ctx.tariff !== undefined
      ? p24 * ctx.tariff
      : undefined;

  const co2Tons = p24 !== undefined ? p24 * 0.00021233 : undefined;
  const coalTons = p24 !== undefined ? p24 / 2.086 : undefined;
  const treesPlanted = p24 !== undefined ? p24 / 0.88 : undefined;

  // Presentation only. Precise + the backend unit kept so the hero reads
  // exactly like the web portal ('142,781.74 MWh', '27,128,529.84 USD').
  const yieldQ = formatQuantity(yieldMwh, 'MWh', {
    mode: 'precise',
    rescale: false,
  });
  const revenueQ = formatQuantity(revenue, null, { mode: 'precise' });
  const yieldA11y = metricA11yLabel('Total plant yield', yieldQ, ['to date']);
  const revenueA11y = metricA11yLabel(
    'Revenue to date',
    revenueQ.isMissing || !ctx.currency
      ? revenueQ
      : { ...revenueQ, spoken: `${revenueQ.text} ${ctx.currency}` },
  );

  // Open instantly → skeleton while the deferred mount settles or the
  // live payload is still loading from cache/API.
  if (!ready || (isLoading && !liveData)) {
    return <TabSkeleton />;
  }

  return (
    <Container>
      {/* ── Hero — Plant Yield + Revenue (cumulative, "to date") ── */}
      <Animated.View
        entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
        <HeroGradientCard>
          <HeroTopRow>
            <HeroStatusBadge
              mode="live"
              label="Yield"
              lastUpdate={lastUpdate}
            />
            <HeroTopRight>
              <GlassChip>
                <AppText variant="micro" semi_bold tone="onHero">
                  To date
                </AppText>
              </GlassChip>
              <HeroBoltWell
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants">
                <BoltIcon size={18} color={scheme.heroOnGradient} />
              </HeroBoltWell>
            </HeroTopRight>
          </HeroTopRow>

          <View
            style={styles.heroYield}
            accessible
            accessibilityLabel={yieldA11y}>
            <OverlineLabel color={scheme.heroOnGradientMuted}>
              Total plant yield
            </OverlineLabel>
            <HeroValueRow>
              <AppText
                variant="numberLg"
                bold
                tone={yieldQ.isMissing ? 'onHeroMuted' : 'onHero'}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.heroValueText}>
                {yieldQ.text}
              </AppText>
              {yieldQ.unit ? (
                <AppText variant="body" medium tone="onHeroMuted">
                  {yieldQ.unit}
                </AppText>
              ) : null}
            </HeroValueRow>
          </View>

          <HeroDivider />

          <View
            style={styles.heroRevenue}
            accessible
            accessibilityLabel={revenueA11y}>
            <SmallIconWrap>
              <OneShotLottie
                source={revenueLottie}
                style={styles.smallLottie}
              />
            </SmallIconWrap>
            <View style={styles.heroRevenueBody}>
              <AppText variant="caption" tone="onHeroMuted">
                Revenue · to date
              </AppText>
              <View style={styles.heroRevenueValueRow}>
                <AppText
                  variant="numberMd"
                  bold
                  tone={revenueQ.isMissing ? 'onHeroMuted' : 'onHero'}
                  style={styles.heroRevenueValue}>
                  {revenueQ.text}
                </AppText>
                {ctx.currency && !revenueQ.isMissing ? (
                  <AppText variant="caption" tone="onHeroMuted">
                    {ctx.currency}
                  </AppText>
                ) : null}
              </View>
            </View>
          </View>
        </HeroGradientCard>
      </Animated.View>

      {/* ── Environmental impact — 3 cards ── */}
      <SummaryEnvImpact
        co2Tons={co2Tons}
        coalTons={coalTons}
        treesPlanted={treesPlanted}
      />

      {/* ── Energy Flow Diagram (SLD) ──
          The SLDDiagram already renders its own framed viewport
          (background + hairline + radius), so wrapping it in another
          Surface produced a visible double-card. Section heading sits
          as plain text above the diagram instead. */}
      <Animated.View
        entering={FadeInDown.duration(duration.fast)
          .delay(90)
          .springify()
          .damping(20)}
        style={styles.sldSection}>
        <SldHeader>
          <AppText variant="h3" tone="primary" accessibilityRole="header">
            Energy flow
          </AppText>
          {diagramState === 'ready' ? (
            <SldLiveTag lastUpdate={lastUpdate} />
          ) : null}
        </SldHeader>
        {diagramState === 'empty' ? (
          <SLDEmptyState />
        ) : showDiagram && diagramState === 'ready' ? (
          <SLDDiagram />
        ) : (
          <SLDDiagramPlaceholder />
        )}
      </Animated.View>
    </Container>
  );
};

export default React.memo(SummaryView);
