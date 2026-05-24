import React, { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  IconWell,
  OverlineLabel,
  Surface,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { FONT_SIZE_LG, FONT_SIZE_SM, FONT_SIZE_XS, FONT_SIZE_XXS } from 'src/utils';
import {
  accentForInverter,
  ANIM_LIMIT,
  GRADIENT_BR,
  GRADIENT_TL,
  InverterEntry,
  STAGGER_CAP,
  STAGGER_MS,
  statusFor,
} from './helpers';
import AnimatedBar from './AnimatedBar';

interface InverterCardProps {
  entry: InverterEntry;
  index: number;
}

const InverterCard: FC<InverterCardProps> = ({ entry, index }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createInverterCardStyles);
  const accent = accentForInverter(entry.num);
  const status = statusFor(entry.performanceRatio);

  const body = (
    <Surface
      elevation="md"
      radius="xl"
      background={scheme.surface}
      padding={space.lg}
      style={themed.card}>
      <LinearGradient
        colors={[accent + '10', accent + '00']}
        start={GRADIENT_TL}
        end={GRADIENT_BR}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <IconWell color={accent} alpha="" size={32} radius={radiusTokens.md}>
            <AppText fontSize={FONT_SIZE_XS} bold color={scheme.textOnBrand}>
              {entry.num || '—'}
            </AppText>
          </IconWell>
          <AppText
            fontSize={FONT_SIZE_SM}
            semi_bold
            color={scheme.textPrimary}
            numberOfLines={1}>
            {entry.title}
          </AppText>
        </View>
        <TintedPill color={status.color} alpha="1F" row paddingY={4}>
          <AppText fontSize={FONT_SIZE_XXS} bold color={status.color}>
            {status.label.toUpperCase()}
          </AppText>
        </TintedPill>
      </View>

      <View style={styles.metricsRow}>
        <MetricTile>
          <OverlineLabel color={scheme.textTertiary}>PRODUCTION</OverlineLabel>
          <View style={styles.metricValueRow}>
            <AppText
              fontSize={FONT_SIZE_LG}
              bold
              color={scheme.textPrimary}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              {entry.production}
            </AppText>
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              kWh
            </AppText>
          </View>
        </MetricTile>
        <MetricTile>
          <OverlineLabel color={scheme.textTertiary}>YIELD</OverlineLabel>
          <View style={styles.metricValueRow}>
            <AppText
              fontSize={FONT_SIZE_LG}
              bold
              color={scheme.textPrimary}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              {entry.yield}
            </AppText>
          </View>
        </MetricTile>
      </View>

      <View style={styles.barSection}>
        <View style={styles.barRow}>
          <OverlineLabel color={scheme.textTertiary}>PERFORMANCE RATIO</OverlineLabel>
          <AppText fontSize={FONT_SIZE_XS} bold color={status.color}>
            {entry.performanceRatio.toFixed(2)}%
          </AppText>
        </View>
        <AnimatedBar
          percent={entry.performanceRatio}
          color={status.color}
          trackColor={scheme.surfaceMuted}
          delay={index * 40}
        />
      </View>

      <View style={styles.barSection}>
        <View style={styles.barRow}>
          <OverlineLabel color={scheme.textTertiary}>UPTIME</OverlineLabel>
          <AppText fontSize={FONT_SIZE_XS} bold color={scheme.brand}>
            {entry.uptimePercent.toFixed(2)}%
          </AppText>
        </View>
        <AnimatedBar
          percent={entry.uptimePercent}
          color={scheme.brand}
          trackColor={scheme.surfaceMuted}
          delay={index * 40 + 80}
        />
      </View>
    </Surface>
  );

  if (index < ANIM_LIMIT) {
    return (
      <Animated.View
        entering={FadeInDown.duration(duration.base)
          .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
          .springify()
          .damping(22)}>
        {body}
      </Animated.View>
    );
  }
  return <View>{body}</View>;
};

const MetricTile: FC<{ children?: React.ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createInverterCardStyles);
  return <View style={themed.metricTile}>{children}</View>;
};
MetricTile.displayName = 'MetricTile';

const styles = StyleSheet.create({
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
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  barSection: {
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const createInverterCardStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      overflow: 'hidden',
      gap: space.md,
      borderWidth: 1,
      borderColor: scheme.border,
    },
    metricTile: {
      flex: 1,
      padding: space.md,
      borderRadius: radiusTokens.md,
      borderWidth: 1,
      gap: 4,
      backgroundColor: scheme.surfaceMuted,
      borderColor: scheme.border,
    },
  });

export default InverterCard;
