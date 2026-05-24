/**
 * GradientRangeBar — v4 (focal AVG + anchored endpoints).
 *
 * v2 was visually cluttered (3 bordered stat tiles). v3 over-
 * corrected into emptiness — the track hugged the left edge with no
 * focal point above it. v4 strikes the balance:
 *
 *   1. AVG is the hero stat — large brand-coloured number under an
 *      "AVERAGE" overline. The card now has a clear focal point.
 *   2. A floating AVG pill rides above the marker, anchored at its
 *      track position. Even when AVG sits near min or max, the pill
 *      makes the position deliberate instead of empty.
 *   3. Min and Max are pulled down under the track as anchor
 *      labels, giving the bar visible bookends instead of letting it
 *      drift between empty gutters.
 *
 * Animation: a single shared value springs the marker, the brand-
 * fill width, and the floating AVG pill together on mount — still
 * one isolated Reanimated worklet per card.
 */

import React, { FC, ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import {
  AppText,
  createBox,
  OverlineLabel,
  PulseDot,
} from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  spring as springTokens,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXL,
  FONT_SIZE_XXS,
  formatCompact,
  ICON_SIZE_XS,
} from 'src/utils';

interface GradientRangeBarProps {
  title: string;
  min: number;
  avg: number;
  max: number;
  /** Stagger entrance delay when rendered in a list. */
  delay?: number;
}

const TRACK_HEIGHT = 8;
const HANDLE_SIZE = 16;

/* ─────────────── styled wrappers ─────────────── */

const Card: FC<{ children: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.card}>{children}</View>;
};
Card.displayName = 'Card';

const Header = createBox(staticStyles().header, 'Header');
const TitleRow = createBox(staticStyles().titleRow, 'TitleRow');
const HeroRow = createBox(staticStyles().heroRow, 'HeroRow');
const EndpointRow = createBox(staticStyles().endpointRow, 'EndpointRow');

const Endpoint: FC<{ label: string; value: number; align: 'flex-start' | 'flex-end' }> = ({
  label,
  value,
  align,
}) => {
  const scheme = useScheme();
  return (
    <View style={{ alignItems: align, gap: 2 }}>
      <AppText fontSize={FONT_SIZE_XXS} bold color={scheme.textTertiary}>
        {label}
      </AppText>
      <AppText
        fontSize={FONT_SIZE_SM}
        semi_bold
        color={scheme.textSecondary}>
        {formatCompact(value)}
      </AppText>
    </View>
  );
};
Endpoint.displayName = 'Endpoint';

/* ─────────────── track + floating pill ─────────────── */

const TrackBlock: FC<{
  avg: number;
  avgRatio: number;
  delay: number;
}> = ({ avg, avgRatio, delay }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Single shared value drives the fill width, the marker handle,
  // and the floating pill together so the whole thing reads as one
  // gesture on mount.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withSpring(avgRatio, springTokens.gentle),
    );
  }, [avgRatio, delay, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  const handleStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
  }));
  // Pill is anchored by its centre — the wrap offsets translateX by
  // its own width, but using a fixed minWidth (so very small / large
  // AVG numbers stay readable) and centre-aligning is the simplest
  // recipe that doesn't need on-layout measurement.
  const pillStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 100}%`,
  }));

  return (
    <View style={themed.trackBlock}>
      {/* Floating AVG pill — rides above the marker */}
      <Animated.View pointerEvents="none" style={[themed.pillWrap, pillStyle]}>
        <View style={themed.pill}>
          <AppText fontSize={FONT_SIZE_XS} bold color={scheme.textOnBrand}>
            {formatCompact(avg)}
          </AppText>
        </View>
        <View style={themed.pillTail} />
      </Animated.View>

      <View style={themed.track}>
        <Animated.View style={[themed.trackFill, fillStyle]} />
        <Animated.View
          pointerEvents="none"
          style={[themed.handleWrap, handleStyle]}>
          <View style={themed.handle} />
        </Animated.View>
      </View>
    </View>
  );
};
TrackBlock.displayName = 'TrackBlock';

/* ─────────────── main ─────────────── */

const GradientRangeBar: FC<GradientRangeBarProps> = ({
  title,
  min,
  avg,
  max,
  delay = 0,
}) => {
  const scheme = useScheme();

  // Clamp the avg ratio so a degenerate (min == max) range doesn't
  // produce NaN, and out-of-range values don't fly off the bar.
  const span = max - min;
  const avgRatio =
    span > 0 ? Math.min(1, Math.max(0, (avg - min) / span)) : 0.5;

  return (
    <Card>
      <Header>
        <TitleRow>
          <PulseDot color={scheme.brand} size={ICON_SIZE_XS} />
          <AppText
            fontSize={FONT_SIZE_SM}
            semi_bold
            color={scheme.textPrimary}
            numberOfLines={1}>
            {title}
          </AppText>
        </TitleRow>
        <OverlineLabel color={scheme.textTertiary}>RANGE</OverlineLabel>
      </Header>

      <HeroRow>
        <View style={{ gap: 4 }}>
          <OverlineLabel color={scheme.textTertiary}>AVERAGE</OverlineLabel>
          <AppText
            fontSize={FONT_SIZE_XXL}
            bold
            color={scheme.brand}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {formatCompact(avg)}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <OverlineLabel color={scheme.textTertiary}>SPREAD</OverlineLabel>
          <AppText fontSize={FONT_SIZE_MD} semi_bold color={scheme.textPrimary}>
            {formatCompact(min)} – {formatCompact(max)}
          </AppText>
        </View>
      </HeroRow>

      <TrackBlock avg={avg} avgRatio={avgRatio} delay={delay} />

      <EndpointRow>
        <Endpoint label="MIN" value={min} align="flex-start" />
        <Endpoint label="MAX" value={max} align="flex-end" />
      </EndpointRow>
    </Card>
  );
};
GradientRangeBar.displayName = 'GradientRangeBar';

/* ─────────────── styles ─────────────── */

function staticStyles() {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      flex: 1,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: space.md,
    },
    endpointRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
  });
}

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: scheme.surface,
      borderRadius: radiusTokens.xl,
      padding: space.lg,
      gap: space.md,
      borderWidth: 1,
      borderColor: scheme.hairline,
      shadowColor: scheme.brand,
      shadowOpacity: scheme.isDark ? 0.12 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    trackBlock: {
      paddingTop: 30, // room for the floating pill above the track
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: scheme.surfaceMuted,
      overflow: 'visible',
      justifyContent: 'center',
    },
    trackFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: scheme.brand,
    },
    handleWrap: {
      position: 'absolute',
      top: -(HANDLE_SIZE - TRACK_HEIGHT) / 2,
      width: HANDLE_SIZE,
      marginLeft: -HANDLE_SIZE / 2,
      alignItems: 'center',
    },
    handle: {
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
      borderRadius: HANDLE_SIZE / 2,
      backgroundColor: scheme.surface,
      borderWidth: 3,
      borderColor: scheme.brand,
      shadowColor: scheme.brand,
      shadowOpacity: 0.4,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    pillWrap: {
      position: 'absolute',
      top: 0,
      // Use translate to anchor by centre — width is intrinsic to
      // the AVG text, so we let flex shrink and then nudge half its
      // width to the left via marginLeft on the pill itself.
      alignItems: 'center',
    },
    pill: {
      backgroundColor: scheme.brand,
      paddingHorizontal: space.md,
      paddingVertical: 4,
      borderRadius: radiusTokens.pill,
      // Centre the pill on the marker — RN doesn't have CSS
      // transform-translate-by-percent for intrinsic widths, so we
      // shift left by half a "typical" pill width. For 2-4 digit
      // numbers this lands close enough.
      marginLeft: -28,
      shadowColor: scheme.brand,
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    pillTail: {
      width: 0,
      height: 0,
      marginLeft: -4,
      borderLeftWidth: 5,
      borderRightWidth: 5,
      borderTopWidth: 5,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: scheme.brand,
    },
  });

export default GradientRangeBar;
