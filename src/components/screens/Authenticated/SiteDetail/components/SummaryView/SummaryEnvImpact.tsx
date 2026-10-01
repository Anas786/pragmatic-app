/**
 * SummaryEnvImpact — the three environmental-impact cards on Summary.
 *
 * VALUES are computed by SummaryView exactly as before (and as the web
 * portal shows them — orchestrator rules O1/O2); this file only presents
 * them: compact 3-significant-digit numbers at ONE size, the unit on the
 * baseline, the exact value in each card's accessibility label, three
 * equal-height cards, and Lotties that play once.
 */
import React, { FC, memo, ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LottieView, { AnimationObject } from 'lottie-react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { AppText, IconWell, Surface } from 'src/components/common';
import { duration, radius as radiusTokens, space, useScheme } from 'src/theme';
import { formatCompact } from 'src/utils/sources';
import { formatQuantity } from 'src/utils/units';
import { metricA11yLabel } from 'src/utils/a11y';
import { co2Lottie, coalLottie, treePlantLottie } from 'src/assets/lottie';

/* ─────────── OneShotLottie ─────────── */

type LottieSource = string | AnimationObject | { uri: string };

interface OneShotLottieProps {
  source: LottieSource;
  style?: StyleProp<ViewStyle>;
}

/**
 * Decorative Lottie that plays ONCE (no infinite loops on Summary). With
 * the OS reduce-motion setting on it doesn't animate at all and rests on
 * its final frame — the same picture the one-shot run ends on. Callers
 * place it inside an accessible (grouped) element, so screen readers never
 * land on it.
 */
export const OneShotLottie: FC<OneShotLottieProps> = memo(
  ({ source, style }) => {
    const reduceMotion = useReducedMotion();
    return (
      <LottieView
        source={source}
        autoPlay={!reduceMotion}
        loop={false}
        progress={reduceMotion ? 1 : undefined}
        style={style}
      />
    );
  },
);
OneShotLottie.displayName = 'OneShotLottie';

/* ─────────── styles ─────────── */

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: space.xs,
    paddingBottom: space.sm,
    gap: 2,
  },
  impactRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  // flex:1 on the item AND the Surface: the row stretches all three cards
  // to the tallest one, so they are always the same height.
  impactItem: {
    flex: 1,
  },
  impactCard: {
    flex: 1,
    gap: 6,
    minHeight: 130,
  },
  impactIconWrap: {
    overflow: 'hidden',
    marginBottom: 4,
  },
  impactLottie: {
    width: 30,
    height: 30,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 4,
  },
});

/* ─────────── ImpactCard ─────────── */

interface ImpactCardProps {
  label: string;
  value: number | undefined;
  /** Short unit on the baseline ('t', 'trees'). */
  unit: string;
  /** Unit as a screen reader says it ('tons', 'trees'). */
  spokenUnit: string;
  /**
   * Fraction digits of the spoken (exact) figure — 2 by default, the web's
   * precision; 0 for a count, so a reader never says "…972.73 trees".
   */
  spokenDecimals?: number;
  icon: ReactNode;
  delayIndex: number;
}

const ImpactCard: FC<ImpactCardProps> = ({
  label,
  value,
  unit,
  spokenUnit,
  spokenDecimals = 2,
  icon,
  delayIndex,
}) => {
  const scheme = useScheme();
  // Exact figure for screen readers — the same number the web portal
  // prints ('30,316.85 tons').
  const exact = formatQuantity(value, null, {
    mode: 'precise',
    decimals: spokenDecimals,
  });
  // 'CO₂' → 'CO2': screen readers stumble over the subscript glyph.
  const a11yLabel = metricA11yLabel(
    label.replace('₂', '2'),
    exact.isMissing
      ? exact
      : { ...exact, spoken: `${exact.text} ${spokenUnit}` },
    ['since commissioning'],
  );
  const missing = exact.isMissing;

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.fast)
        .delay(delayIndex * 30)
        .springify()
        .damping(20)}
      style={styles.impactItem}>
      <Surface
        elevation="md"
        radius="xl"
        background={scheme.surface}
        padding={space.md}
        accessible
        accessibilityLabel={a11yLabel}
        style={styles.impactCard}>
        {/* Neutral well: energyPalette is reserved for energy SOURCES and
            brand emerald for selection / primary action — the Lottie
            carries its own colour. */}
        <IconWell
          color={scheme.surfaceMuted}
          alpha=""
          size={44}
          radius={radiusTokens.md}
          style={styles.impactIconWrap}>
          {icon}
        </IconWell>
        <AppText variant="caption" medium tone="secondary" numberOfLines={2}>
          {label}
        </AppText>
        {missing ? (
          <AppText variant="caption" tone="tertiary">
            No data
          </AppText>
        ) : (
          <View style={styles.valueRow}>
            <AppText variant="numberMd" tone="primary" numberOfLines={1}>
              {formatCompact(value)}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {unit}
            </AppText>
          </View>
        )}
      </Surface>
    </Animated.View>
  );
};

/* ─────────── SummaryEnvImpact ─────────── */

interface SummaryEnvImpactProps {
  co2Tons: number | undefined;
  coalTons: number | undefined;
  treesPlanted: number | undefined;
}

const SummaryEnvImpact: FC<SummaryEnvImpactProps> = ({
  co2Tons,
  coalTons,
  treesPlanted,
}) => (
  <View>
    <View style={styles.sectionHeader}>
      <AppText variant="h3" tone="primary" accessibilityRole="header">
        Environmental impact
      </AppText>
      <AppText variant="caption" tone="secondary">
        Since commissioning
      </AppText>
    </View>
    <View style={styles.impactRow}>
      <ImpactCard
        label="CO₂ avoided"
        value={co2Tons}
        unit="t"
        spokenUnit="tons"
        icon={<OneShotLottie source={co2Lottie} style={styles.impactLottie} />}
        delayIndex={1}
      />
      <ImpactCard
        label="Coal offset"
        value={coalTons}
        unit="t"
        spokenUnit="tons"
        icon={<OneShotLottie source={coalLottie} style={styles.impactLottie} />}
        delayIndex={2}
      />
      {/* An equivalence computed from the yield, not trees physically
          planted — the label must not claim planting. */}
      <ImpactCard
        label="Tree equivalent"
        value={treesPlanted}
        unit="trees"
        spokenUnit="trees"
        spokenDecimals={0}
        icon={
          <OneShotLottie source={treePlantLottie} style={styles.impactLottie} />
        }
        delayIndex={3}
      />
    </View>
  </View>
);

export default memo(SummaryEnvImpact);
