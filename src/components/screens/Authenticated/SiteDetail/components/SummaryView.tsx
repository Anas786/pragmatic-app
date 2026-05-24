/**
 * SummaryView — v2 redesign.
 *
 * Layout direction: command-center / glance-first.
 *
 *  ┌─────────────────────────────────────────┐
 *  │  PLANT YIELD · TODAY                    │  (hero card)
 *  │  4,628.32 mWh                  [icon]   │
 *  │  Revenue · USD 14,210.50                │
 *  └─────────────────────────────────────────┘
 *
 *  ┌────────┐ ┌────────┐ ┌────────┐
 *  │ CO₂    │ │ COAL   │ │ TREES  │  (impact row)
 *  │ XX.XX  │ │ XX.XX  │ │ XX.XX  │
 *  │ Tons   │ │ Tons   │ │ Nos.   │
 *  └────────┘ └────────┘ └────────┘
 *
 *  ┌─────────────────────────────────────────┐
 *  │ Energy Flow                             │
 *  │  ────────────────────────────           │
 *  │  [SLD diagram]                          │
 *  └─────────────────────────────────────────┘
 *
 * Data sources unchanged from the legacy implementation:
 *   - p24 (today's plant yield) drives every formula on this screen
 *   - site_info.revenue.tariff/currency drive the Revenue line
 */

import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  createBox,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  OverlineLabel,
  PulseDot,
} from 'src/components/common';
import { IconWell } from 'src/components/common';
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
import {
  formatCardValue as formatCardValueLegacy,
  formatNumber,
  resolveCardValue,
  FONT_SIZE_XXS,
  FONT_SIZE_XS,
  FONT_SIZE_SM,
  FONT_SIZE_LG,
  FONT_SIZE_XXL,
} from 'src/utils';
import { useSiteConfig, useSiteData } from 'src/hooks';
import {
  DashboardStackParamList,
  ICardConfig,
  ISiteAllData,
  ISiteConfig,
} from 'src/types';
import { revenueLottie } from 'src/assets/lottie';
import SLDDiagram from './SLDDiagram';
import SummaryEnvImpact from './SummaryView/SummaryEnvImpact';

void formatCardValueLegacy; // kept exported by utils; not consumed here

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
  const raw = resolveCardValue(P24_PROBE, liveData);
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return raw;
};

interface SummaryContext {
  tariff: number | undefined;
  currency: string;
}

const extractRevenueContext = (
  siteConfig: ISiteConfig | undefined | null,
): SummaryContext => {
  if (!siteConfig || typeof siteConfig !== 'object') {
    return { tariff: undefined, currency: 'USD' };
  }
  const cfg = siteConfig as Record<string, unknown>;
  const siteInfo = cfg.site_info;
  const revenueCfg =
    siteInfo && typeof siteInfo === 'object'
      ? (siteInfo as Record<string, unknown>).revenue
      : undefined;
  if (!revenueCfg || typeof revenueCfg !== 'object') {
    return { tariff: undefined, currency: 'USD' };
  }
  const r = revenueCfg as Record<string, unknown>;
  return {
    tariff:
      typeof r.tariff === 'number' && Number.isFinite(r.tariff)
        ? r.tariff
        : undefined,
    currency:
      typeof r.currency === 'string' && r.currency.length > 0
        ? r.currency
        : 'USD',
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
  heroSectionLabel: {
    marginTop: space.lg,
  },
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
    justifyContent: 'space-between',
    gap: space.md,
  },
  heroRevenueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  heroRevenueRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
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
  diagramPlaceholder: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
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
const HeroRevenue = createBox(styles.heroRevenue, 'HeroRevenue');
const HeroRevenueLeft = createBox(styles.heroRevenueLeft, 'HeroRevenueLeft');
const HeroRevenueRight = createBox(styles.heroRevenueRight, 'HeroRevenueRight');
const SldHeader = createBox(styles.sldHeader, 'SldHeader');
const LiveTag = createBox(styles.liveTag, 'LiveTag');
const DiagramPlaceholder = createBox(
  styles.diagramPlaceholder,
  'DiagramPlaceholder',
);

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

/* ─────────────── component ─────────────── */

const SummaryView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  const scheme = useScheme();
  const { data: liveData } = useSiteData(siteId);
  const { data: siteConfig } = useSiteConfig(siteId);

  const [showDiagram, setShowDiagram] = useState(false);

  // SLDDiagram is heavy — defer mounting until after the navigation
  // transition has settled.
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setShowDiagram(true);
    });
    return () => handle.cancel();
  }, []);

  const ctx = useMemo<SummaryContext>(
    () => extractRevenueContext(siteConfig),
    [siteConfig],
  );

  const p24 = getP24(liveData);

  const yieldMwh = p24 !== undefined ? p24 * KWH_TO_MWH : undefined;
  const revenue =
    p24 !== undefined && ctx.tariff !== undefined ? p24 * ctx.tariff : undefined;

  const co2Tons = p24 !== undefined ? p24 * 0.00021233 : undefined;
  const coalTons = p24 !== undefined ? p24 / 2.086 : undefined;
  const treesPlanted = p24 !== undefined ? p24 / 0.88 : undefined;

  return (
    <Container>
      {/* ── Hero — Plant Yield + Revenue ── */}
      <Animated.View
        entering={FadeInDown.duration(duration.fast).springify().damping(20)}>
        <HeroGradientCard>
          <HeroTopRow>
            <HeroLiveBadge>
              <PulseDot color={scheme.heroOnGradient} size={8} />
              <OverlineLabel color={scheme.heroOnGradient}>
                LIVE · YIELD
              </OverlineLabel>
            </HeroLiveBadge>
            <HeroTopRight>
              <GlassChip>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  bold
                  color={scheme.heroOnGradient}>
                  TODAY
                </AppText>
              </GlassChip>
              <HeroBoltWell>
                <BoltIcon size={18} color={scheme.heroOnGradient} />
              </HeroBoltWell>
            </HeroTopRight>
          </HeroTopRow>

          <OverlineLabel
            color={scheme.heroOnGradientMuted}
            style={styles.heroSectionLabel}>
            PLANT YIELD
          </OverlineLabel>
          <HeroValueRow>
            <AppText
              fontSize={FONT_SIZE_XXL}
              bold
              color={scheme.heroOnGradient}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              style={styles.heroValueText}>
              {formatNumber(yieldMwh)}
            </AppText>
            <AppText
              fontSize={FONT_SIZE_SM}
              color={scheme.heroOnGradientMuted}
              medium>
              mWh
            </AppText>
          </HeroValueRow>

          <HeroDivider />

          <HeroRevenue>
            <HeroRevenueLeft>
              <SmallIconWrap>
                <LottieView
                  source={revenueLottie}
                  autoPlay
                  loop
                  style={styles.smallLottie}
                />
              </SmallIconWrap>
              <View>
                <OverlineLabel color={scheme.heroOnGradientMuted}>
                  REVENUE
                </OverlineLabel>
                <AppText
                  fontSize={FONT_SIZE_XS}
                  color={scheme.heroOnGradient}>
                  Today's earnings
                </AppText>
              </View>
            </HeroRevenueLeft>
            <HeroRevenueRight>
              <AppText
                fontSize={FONT_SIZE_LG}
                bold
                color={scheme.heroOnGradient}
                numberOfLines={1}>
                {formatNumber(revenue)}
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XXS}
                color={scheme.heroOnGradientMuted}>
                {ctx.currency}
              </AppText>
            </HeroRevenueRight>
          </HeroRevenue>
        </HeroGradientCard>
      </Animated.View>

      {/* ── Environmental Impact — 3 cards ── */}
      <SummaryEnvImpact
        co2Tons={co2Tons}
        coalTons={coalTons}
        treesPlanted={treesPlanted}
        formatNumber={formatNumber}
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
          <OverlineLabel color={scheme.textTertiary}>
            ENERGY FLOW
          </OverlineLabel>
          <LiveTag>
            <LiveDot />
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.brand} medium>
              Live
            </AppText>
          </LiveTag>
        </SldHeader>
        {showDiagram ? (
          <SLDDiagram />
        ) : (
          <DiagramPlaceholder>
            <ActivityIndicator color={scheme.brand} />
          </DiagramPlaceholder>
        )}
      </Animated.View>
    </Container>
  );
};

export default React.memo(SummaryView);
