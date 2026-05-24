import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  createBox,
  IconWell,
  OverlineLabel,
  Surface,
} from 'src/components/common';
import {
  duration,
  energyPalette,
  radius as radiusTokens,
  space,
  useScheme,
} from 'src/theme';
import { FONT_SIZE_XXS, FONT_SIZE_LG } from 'src/utils';
import {
  co2Lottie,
  coalLottie,
  treePlantLottie,
} from 'src/assets/lottie';

/* ─────────── styles ─────────── */

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: space.xs,
    paddingBottom: space.sm,
  },
  impactRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  impactItem: {
    flex: 1,
  },
  impactCard: {
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
});

const SectionHeader = createBox(styles.sectionHeader, 'SectionHeader');
const ImpactRow = createBox(styles.impactRow, 'ImpactRow');

/* ─────────── ImpactCard ─────────── */

interface ImpactCardProps {
  label: string;
  value: string;
  unit: string;
  accent: string;
  icon: ReactNode;
  delayIndex: number;
}

const ImpactCard: FC<ImpactCardProps> = ({
  label,
  value,
  unit,
  accent,
  icon,
  delayIndex,
}) => {
  const scheme = useScheme();
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
        padding={space.lg}
        style={styles.impactCard}>
        <IconWell
          color={accent}
          alpha="14"
          size={44}
          radius={radiusTokens.md}
          style={styles.impactIconWrap}>
          {icon}
        </IconWell>
        <AppText
          fontSize={FONT_SIZE_XXS}
          color={scheme.textTertiary}
          medium
          numberOfLines={1}>
          {label}
        </AppText>
        <AppText
          fontSize={FONT_SIZE_LG}
          semi_bold
          color={scheme.textPrimary}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {value}
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
          {unit}
        </AppText>
      </Surface>
    </Animated.View>
  );
};

/* ─────────── SummaryEnvImpact ─────────── */

interface SummaryEnvImpactProps {
  co2Tons: number | undefined;
  coalTons: number | undefined;
  treesPlanted: number | undefined;
  formatNumber: (value: number | undefined, dp?: number) => string;
}

const SummaryEnvImpact: FC<SummaryEnvImpactProps> = ({
  co2Tons,
  coalTons,
  treesPlanted,
  formatNumber,
}) => {
  const scheme = useScheme();
  return (
    <View>
      <SectionHeader>
        <OverlineLabel color={scheme.textTertiary}>
          ENVIRONMENTAL IMPACT
        </OverlineLabel>
      </SectionHeader>
      <ImpactRow>
        <ImpactCard
          label="CO₂ Reduction"
          value={formatNumber(co2Tons)}
          unit="Tons"
          accent={energyPalette.solar}
          icon={
            <LottieView
              source={co2Lottie}
              autoPlay
              loop
              style={styles.impactLottie}
            />
          }
          delayIndex={1}
        />
        <ImpactCard
          label="Coal Saved"
          value={formatNumber(coalTons)}
          unit="Tons"
          accent={energyPalette.genset}
          icon={
            <LottieView
              source={coalLottie}
              autoPlay
              loop
              style={styles.impactLottie}
            />
          }
          delayIndex={2}
        />
        <ImpactCard
          label="Trees Planted"
          value={formatNumber(treesPlanted)}
          unit="Nos."
          accent={scheme.brand}
          icon={
            <LottieView
              source={treePlantLottie}
              autoPlay
              loop
              style={styles.impactLottie}
            />
          }
          delayIndex={3}
        />
      </ImpactRow>
    </View>
  );
};

export default SummaryEnvImpact;
