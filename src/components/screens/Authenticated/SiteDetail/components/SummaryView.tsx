import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  StyleSheet,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  ACCENT_RED,
  formatCardValue,
  GRADIENT_GREEN,
  normalizeHeight,
  normalizeWidth,
  resolveCardValue,
  YELLOW,
} from 'src/utils';
import { useSiteConfig, useSiteData, useThemeStore } from 'src/hooks';
import {
  DashboardStackParamList,
  ICardConfig,
  ISiteAllData,
  ISiteConfig,
} from 'src/types';
import {
  co2Lottie,
  coalLottie,
  electricLottie,
  revenueLottie,
  treePlantLottie,
} from 'src/assets/lottie';
import MetricCard, { MetricCardItem } from './MetricCard';
import SLDDiagram from './SLDDiagram';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/**
 * Summary tab — Yield + Environmental Benefits.
 *
 * Source 1: a single live-data point — `live.p24.value` (today's plant
 * yield in kWh).
 *
 * Source 2: site-config — `site_info.revenue.tariff` (USD/kWh, used by
 * the Revenue formula) and `site_info.revenue.currency` (display unit).
 *
 * Five cards computed from those sources:
 *
 *   Yield value      = p24 ÷ 1000                       (display: MWh)
 *   Revenue value    = p24 × tariff                     (display: <currency>)
 *   CO₂ Reduction    = p24 × 0.00021233                 (display: Tons)
 *   Coal Saved       = p24 ÷ 2.086                      (display: Tons)
 *   Trees Planted    = p24 ÷ 0.88                       (display: Nos.)
 *
 * Icons are real Lottie JSONs (transparent background, vector quality)
 * rendered via `lottie-react-native`.
 */

// Sentinel "card config" used only to tunnel through `resolveCardValue`'s
// existing `dataStore` + `objKey` walker. Avoids duplicating that logic.
const P24_PROBE: ICardConfig = {
  name: '',
  dataStore: 'live',
  objKey: 'live.p24.value',
};

/**
 * Backend ships `p24` in kWh. CO₂ / Coal / Trees multipliers are
 * calibrated against kWh input, so `getP24` returns the raw kWh value.
 * Only the Total Plant Yeild card converts to MWh in its own `compute`
 * fn (because its display unit is `mWh`).
 */
const getP24 = (
  liveData: ISiteAllData | null | undefined,
): number | undefined => {
  const raw = resolveCardValue(P24_PROBE, liveData);
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return raw;
};

const KWH_TO_MWH = 1 / 1000;

/* ─────────────── site-config extractors ─────────────── */

interface SummaryContext {
  /** USD/kWh price multiplier from site_info.revenue.tariff. */
  tariff: number | undefined;
  /** Display unit string from site_info.revenue.currency, defaults to 'USD'. */
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
    tariff: typeof r.tariff === 'number' && Number.isFinite(r.tariff)
      ? r.tariff
      : undefined,
    currency: typeof r.currency === 'string' && r.currency.length > 0
      ? r.currency
      : 'USD',
  };
};

/* ─────────────── formulas (data-only) ─────────────── */
//
// Plain data — DO NOT pre-build JSX elements at module-init time. JSX
// construction happens inside the component where `styles` is defined.

interface SummaryFormula {
  label: string;
  /** Static unit string OR function of context (Revenue uses currency). */
  unit?: string | ((ctx: SummaryContext) => string);
  decimalPlaces: number;
  accentColor: string;
  // `lottie-react-native`'s typings don't narrow `source` cleanly off a
  // `require()` JSON, so we type it as `any` here and let the renderer
  // coerce. Functionally it's just the parsed Lottie JSON.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lottieSource: any;
  compute: (
    p24: number | undefined,
    ctx: SummaryContext,
  ) => number | undefined;
}

const YIELD_CARDS: SummaryFormula[] = [
  {
    label: 'Total Plant Yeild',
    unit: 'mWh',
    decimalPlaces: 2,
    accentColor: GRADIENT_GREEN,
    lottieSource: electricLottie,
    compute: p24 => (p24 !== undefined ? p24 * KWH_TO_MWH : undefined),
  },
  {
    label: 'Revenue',
    unit: ctx => ctx.currency,
    decimalPlaces: 2,
    accentColor: GRADIENT_GREEN,
    lottieSource: revenueLottie,
    compute: (p24, ctx) =>
      p24 !== undefined && ctx.tariff !== undefined
        ? p24 * ctx.tariff
        : undefined,
  },
];

const ENV_CARDS: SummaryFormula[] = [
  {
    label: 'CO₂ Reduction',
    unit: 'Tons',
    decimalPlaces: 2,
    accentColor: YELLOW,
    lottieSource: co2Lottie,
    compute: p24 => (p24 !== undefined ? p24 * 0.00021233 : undefined),
  },
  {
    label: 'Coal Saved',
    unit: 'Tons',
    decimalPlaces: 2,
    accentColor: ACCENT_RED,
    lottieSource: coalLottie,
    compute: p24 => (p24 !== undefined ? p24 / 2.086 : undefined),
  },
  {
    label: 'Trees Planted',
    unit: 'Nos.',
    decimalPlaces: 2,
    accentColor: GRADIENT_GREEN,
    lottieSource: treePlantLottie,
    compute: p24 => (p24 !== undefined ? p24 / 0.88 : undefined),
  },
];

/* ─────────────── component ─────────────── */

const SummaryView: FC = () => {
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  const { colors } = useThemeStore();
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

  // Resolve formulas → MetricCard items. Lottie JSX is constructed here
  // (inside the component) so it can safely reference `styles.lottie`.
  const buildItems = (
    formulas: SummaryFormula[],
    p24: number | undefined,
    context: SummaryContext,
  ): MetricCardItem[] =>
    formulas.map(f => ({
      label: f.label,
      value: formatCardValue(f.compute(p24, context), f.decimalPlaces),
      unit:
        typeof f.unit === 'function' ? f.unit(context) : f.unit,
      accentColor: f.accentColor,
      icon: (
        <LottieView
          source={f.lottieSource}
          autoPlay
          loop
          style={styles.lottie}
        />
      ),
    }));

  const p24 = getP24(liveData);
  const yieldItems = useMemo(
    () => buildItems(YIELD_CARDS, p24, ctx),
    [p24, ctx],
  );
  const envItems = useMemo(
    () => buildItems(ENV_CARDS, p24, ctx),
    [p24, ctx],
  );

  return (
    <View style={styles.container}>
      <MetricCard title="Yield" items={yieldItems} />
      <MetricCard title="Environmental Benefits" items={envItems} />
      {showDiagram ? (
        <SLDDiagram />
      ) : (
        <View style={styles.diagramPlaceholder}>
          <ActivityIndicator color={colors.primaryText} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: normalizeHeight(12),
  },
  diagramPlaceholder: {
    minHeight: normalizeHeight(220),
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottie: {
    width: normalizeWidth(36),
    height: normalizeWidth(36),
  },
});

export default SummaryView;
