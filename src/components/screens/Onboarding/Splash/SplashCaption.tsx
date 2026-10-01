/**
 * Splash caption — "Signing you in, <name> ···" (web `.sit-caption`).
 *
 * - Renders nothing until the caption text is latched (auth resolved, or
 *   the neutral fallback fired).
 * - The entrance (opacity + 6 dp rise) reads `captionP`, which the splash
 *   clock writes ONLY during the ~305 ms entrance window — so this style
 *   commits to Fabric only then, never per frame afterwards.
 * - The three pulsing dots are a tiny Skia canvas (opacity from derived
 *   values on the UI thread) — no RN-view loop, no Fabric commits. Only
 *   mounted once the scene exists (i.e. never in Jest).
 */
import React, { memo, useEffect } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Canvas, Circle } from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { AppText } from 'src/components/common';
import { splashPalette } from 'src/theme';
import { dotOpacity } from './ease';

export type CaptionText =
  | { kind: 'named'; name: string }
  | { kind: 'plain' }
  | { kind: 'neutral' };

export const SIGNING_IN = 'Signing you in';
export const NEUTRAL_CAPTION = 'Powering up';

export const captionString = (text: CaptionText): string =>
  text.kind === 'named'
    ? `${SIGNING_IN}, ${text.name}`
    : text.kind === 'plain'
    ? SIGNING_IN
    : NEUTRAL_CAPTION;

/** Web: bottom = max(30px, safe-area-inset-bottom + 22px). */
const CAPTION_BOTTOM = Math.max(
  30,
  (initialWindowMetrics?.insets.bottom ?? 0) + 22,
);

const DOT_R = 1.5;
const DOT_PITCH = 6; // 3 px dot + 3 px gap

interface DotsProps {
  realMs: SharedValue<number>;
  reduced: boolean;
}

const CaptionDots = memo(function CaptionDots({ realMs, reduced }: DotsProps) {
  const op0 = useDerivedValue(() =>
    reduced ? 0.6 : dotOpacity(realMs.value, 0),
  );
  const op1 = useDerivedValue(() =>
    reduced ? 0.6 : dotOpacity(realMs.value, 1),
  );
  const op2 = useDerivedValue(() =>
    reduced ? 0.6 : dotOpacity(realMs.value, 2),
  );
  return (
    <Canvas
      style={styles.dots}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Circle
        cx={DOT_R}
        cy={DOT_R}
        r={DOT_R}
        color={splashPalette.ink2}
        opacity={op0}
      />
      <Circle
        cx={DOT_R + DOT_PITCH}
        cy={DOT_R}
        r={DOT_R}
        color={splashPalette.ink2}
        opacity={op1}
      />
      <Circle
        cx={DOT_R + 2 * DOT_PITCH}
        cy={DOT_R}
        r={DOT_R}
        color={splashPalette.ink2}
        opacity={op2}
      />
    </Canvas>
  );
});

interface SplashCaptionProps {
  text: CaptionText | null;
  captionP: SharedValue<number>;
  realMs: SharedValue<number>;
  reduced: boolean;
  showDots: boolean;
}

function SplashCaption({
  text,
  captionP,
  realMs,
  reduced,
  showDots,
}: SplashCaptionProps): React.JSX.Element | null {
  const entrance = useAnimatedStyle(() => ({
    opacity: captionP.value,
    transform: [{ translateY: reduced ? 0 : 6 * (1 - captionP.value) }],
  }));

  const label = text ? captionString(text) : '';
  useEffect(() => {
    if (label && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(label);
    }
  }, [label]);

  if (!text) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.wrap, entrance]}
      pointerEvents="none"
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}>
      <View style={styles.row}>
        {/* Poppins (the app's family): Regular for the line, SemiBold for
            the name — the web caption's 400 / 600 weights. */}
        {/* fixedSize: the caption + Skia dots are a fixed-geometry layout
            (baseline-aligned row), so it opts out of OS text scaling. */}
        <AppText
          fixedSize
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.caption}>
          {text.kind === 'named' ? (
            <>
              {`${SIGNING_IN}, `}
              <AppText fixedSize semi_bold style={styles.name}>
                {text.name}
              </AppText>
            </>
          ) : (
            captionString(text)
          )}
        </AppText>
        {showDots ? <CaptionDots realMs={realMs} reduced={reduced} /> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: CAPTION_BOTTOM,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    // Dots sit on the caption's REAL text baseline, as measured by the
    // platform text layout (Fabric reports a Paragraph baseline to Yoga on
    // both iOS and Android in RN 0.77; the leaf dots canvas's baseline is its
    // bottom edge). The previous flex-end + fixed marginBottom guessed the
    // baseline from the system font's metrics — Poppins' tall ascent/descent
    // (1.05 / 0.35 em, +0.1 em line gap) put the baseline 4.9–5.3 dp above
    // the line-box bottom depending on platform, and anything that changes the
    // font (adjustsFontSizeToFit shrinking a long name) moved it again.
    alignItems: 'baseline',
  },
  // fontFamily comes from AppText (Poppins-Regular / SemiBold via
  // `semi_bold`). lineHeight stays explicit: on Android it makes
  // CustomLineHeightSpan pin the line box to ascent/descent + half-leading,
  // which neutralises includeFontPadding (Poppins' yMax/yMin would otherwise
  // add ~3 dp of padding); on iOS the 20.3 line box is taller than Poppins'
  // 19.6 glyph box (TextKit runs with usesFontLeading = NO), so nothing clips.
  caption: {
    fontSize: 14,
    lineHeight: 20.3,
    letterSpacing: -0.042,
    color: splashPalette.ink2,
    flexShrink: 1,
  },
  name: {
    color: splashPalette.ink,
    fontSize: 14,
    lineHeight: 20.3,
  },
  dots: {
    width: 3 * DOT_PITCH - 3,
    height: 2 * DOT_R,
    marginLeft: 5,
    // Web `.sit-dots { vertical-align: 1px }`: dot bottoms 1 px above the
    // text baseline (baseline alignment above puts them exactly on it).
    transform: [{ translateY: -1 }],
  },
});

export default memo(SplashCaption);
