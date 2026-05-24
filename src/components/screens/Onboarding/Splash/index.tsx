import React, { FC, useEffect } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from 'src/components/common';
import { Logo } from 'src/assets';
import { useAuth } from 'src/hooks';
import { energyPalette, glass, radius, space } from 'src/theme';
import { normalizeHeight, normalizeWidth } from 'src/utils';

const MIN_SPLASH_MS = 2200;

/** Fixed premium "midnight emerald" gradient — brand-locked across themes. */
const SPLASH_GRADIENT = ['#0C3B2E', '#06231B', '#03100C'];
const GRADIENT_TL = { x: 0, y: 0 } as const;
const GRADIENT_BR = { x: 1, y: 1 } as const;

const GLOW_SIZE = normalizeWidth(340);
const RING_SIZE = normalizeWidth(150);

/** Energy-source palette drives the loader dots — on-brand for the domain. */
const LOADER_DOTS = [
  energyPalette.solar,
  energyPalette.wind,
  energyPalette.grid,
  energyPalette.genset,
  energyPalette.battery,
];

/* ─────────── Expanding pulse ring behind the logo lockup ─────────── */

const PulseRing: FC<{ delay: number }> = ({ delay }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2600, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 2.3]) }],
    opacity: interpolate(progress.value, [0, 0.12, 1], [0, 0.45, 0]),
  }));

  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
};

/* ─────────── Wave-pulsing energy dot (loader) ─────────── */

const WaveDot: FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(t);
  }, [delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.3, 1]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [0, -6]) },
      { scale: interpolate(t.value, [0, 1], [0.85, 1.25]) },
    ],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
};

/* ─────────── Slow-drifting ambient orb (depth) ─────────── */

interface OrbProps {
  color: string;
  size: number;
  start: { top?: number; bottom?: number; left?: number; right?: number };
  shiftX: number;
  shiftY: number;
  duration: number;
}

const FloatingOrb: FC<OrbProps> = ({ color, size, start, shiftX, shiftY, duration }) => {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [duration, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, shiftX]) },
      { translateY: interpolate(t.value, [0, 1], [0, shiftY]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        start,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        style,
      ]}
    />
  );
};

const Splash: FC = () => {
  const navigation = useNavigation<any>();
  const { status } = useAuth();

  // Entrance + ambient drivers
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textShift = useSharedValue(16);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    logoScale.value = withDelay(
      60,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.4)) }),
    );
    textOpacity.value = withDelay(320, withTiming(1, { duration: 460 }));
    textShift.value = withDelay(320, withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(560, withTiming(1, { duration: 460 }));
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(glowPulse);
      cancelAnimation(textOpacity);
      cancelAnimation(textShift);
      cancelAnimation(taglineOpacity);
    };
  }, [logoScale, logoOpacity, glowPulse, textOpacity, textShift, taglineOpacity]);

  useEffect(() => {
    if (status === 'loading') return;

    const timer = setTimeout(() => {
      if (status === 'authenticated') {
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Drawer' }] }),
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Onboarding', state: { routes: [{ name: 'Login' }] } }],
          }),
        );
      }
    }, MIN_SPLASH_MS);

    return () => clearTimeout(timer);
  }, [navigation, status]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.55, 1]),
    transform: [{ scale: interpolate(glowPulse.value, [0, 1], [0.92, 1.12]) }],
  }));
  const logoTileStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textShift.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#03100C" translucent />

      <LinearGradient
        colors={SPLASH_GRADIENT}
        start={GRADIENT_TL}
        end={GRADIENT_BR}
        style={StyleSheet.absoluteFillObject}
      />

      <FloatingOrb
        color={energyPalette.wind}
        size={normalizeWidth(260)}
        start={{ top: -normalizeHeight(60), right: -normalizeWidth(70) }}
        shiftX={-24}
        shiftY={28}
        duration={6000}
      />
      <FloatingOrb
        color="#10B981"
        size={normalizeWidth(300)}
        start={{ bottom: -normalizeHeight(80), left: -normalizeWidth(90) }}
        shiftX={30}
        shiftY={-24}
        duration={7200}
      />

      <View style={styles.content}>
        <View style={styles.lockup}>
          <Animated.View style={[styles.glowWrap, glowStyle]} pointerEvents="none">
            <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
              <Defs>
                <RadialGradient id="pulseGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#34D399" stopOpacity={0.5} />
                  <Stop offset="0.55" stopColor="#10B981" stopOpacity={0.14} />
                  <Stop offset="1" stopColor="#10B981" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#pulseGlow)" />
            </Svg>
          </Animated.View>

          <PulseRing delay={0} />
          <PulseRing delay={1300} />

          <Animated.View style={[styles.logoTile, logoTileStyle]}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          </Animated.View>
        </View>

        <Animated.View style={wordmarkStyle}>
          <AppText bold fontSize={24} center color={glass.textBold} lineHeight={32} style={styles.wordmark}>
            Pragmatic Energy Solution
          </AppText>
        </Animated.View>

        <Animated.View style={taglineStyle}>
          <AppText semi_bold fontSize={11} center color={glass.textMuted} style={styles.tagline}>
            SOLAR · WIND · GRID · STORAGE
          </AppText>
        </Animated.View>
      </View>

      <View style={styles.loader}>
        {LOADER_DOTS.map((color, i) => (
          <WaveDot key={color} color={color} delay={i * 110} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#03100C' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    gap: space.xl,
  },
  lockup: { alignItems: 'center', justifyContent: 'center' },
  glowWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: glass.border,
  },
  logoTile: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingHorizontal: space['2xl'],
    paddingVertical: space.xl,
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  logo: { width: normalizeWidth(132), height: normalizeHeight(90) },
  wordmark: { maxWidth: normalizeWidth(280), letterSpacing: 0.2 },
  tagline: { letterSpacing: 2.5 },
  orb: { position: 'absolute', opacity: 0.08 },
  loader: {
    position: 'absolute',
    bottom: normalizeHeight(64),
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  dot: {
    width: normalizeWidth(9),
    height: normalizeWidth(9),
    borderRadius: normalizeWidth(9) / 2,
  },
});

export default Splash;
