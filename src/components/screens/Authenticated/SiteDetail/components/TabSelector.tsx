/**
 * TabSelector — v4 (liquid-morph chips).
 *
 * The original v2 "liquid-morph" used Reanimated `LinearTransition` on
 * every TabPill which tripped a ShadowTree::commit SIGABRT under the
 * new architecture (see v3 comment history). This version reproduces
 * the visual effect with a single absolutely-positioned Animated.View
 * — a brand-coloured "blob" sitting behind the static chips that
 * morphs its `translateX` + `width` to track the active chip.
 *
 * The "liquid" feel comes from a two-step sequence on every change:
 *   1. The blob stretches to span both the source and target chips
 *      (timing — fast, communicates intent).
 *   2. The blob contracts to fit just the target chip
 *      (spring — settles with a soft bounce).
 *
 * The chips themselves never re-layout — Reanimated only ever animates
 * one isolated view's transform + width, so there is no tree-cloning
 * and no commit-hook racing across siblings.
 */

import React, { FC, ReactNode, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText, PressableScale } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  spring as springTokens,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { FONT_SIZE_XS, ICON_SIZE_SM, WIDTH } from 'src/utils';
import { IconProps } from 'src/types';
import {
  AlarmsTabIcon,
  BoltIcon,
  CardsTabIcon,
  ChartIcon,
  GridIcon,
  SummaryTabIcon,
  TrendTabIcon,
} from 'src/assets/icons';

export type TabOption =
  | 'Summary'
  | 'Cards'
  | 'Live'
  | 'Alarms'
  | 'Trend'
  | 'Reports'
  | 'Tables';

interface TabSelectorProps {
  selected: TabOption;
  onSelect: (tab: TabOption) => void;
}

interface TabConfig {
  name: TabOption;
  Icon: FC<IconProps>;
}

const tabs: TabConfig[] = [
  { name: 'Summary', Icon: SummaryTabIcon },
  { name: 'Cards', Icon: CardsTabIcon },
  { name: 'Live', Icon: BoltIcon },
  { name: 'Alarms', Icon: AlarmsTabIcon },
  { name: 'Trend', Icon: TrendTabIcon },
  { name: 'Reports', Icon: ChartIcon },
  { name: 'Tables', Icon: GridIcon },
];

const PILL_HEIGHT = 40;
const STRETCH_DURATION = 180;

/* ─────────────── styled wrappers ─────────────── */

const TabRow: FC<{
  scrollRef: React.RefObject<ScrollView>;
  children: ReactNode;
}> = ({ scrollRef, children }) => {
  const themed = useThemedStyles(createStyles);
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={themed.container}>
      {children}
    </ScrollView>
  );
};
TabRow.displayName = 'TabRow';

const MorphBlob: FC<{
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
}> = ({ animatedStyle }) => {
  const themed = useThemedStyles(createStyles);
  return (
    <Animated.View
      pointerEvents="none"
      style={[themed.blob, animatedStyle]}
    />
  );
};
MorphBlob.displayName = 'MorphBlob';

const PillShell: FC<{
  name: TabOption;
  onLayout: (name: TabOption, x: number, width: number) => void;
  children: ReactNode;
}> = ({ name, onLayout, children }) => {
  const themed = useThemedStyles(createStyles);
  return (
    <View
      onLayout={e =>
        onLayout(name, e.nativeEvent.layout.x, e.nativeEvent.layout.width)
      }
      style={themed.tab}>
      {children}
    </View>
  );
};
PillShell.displayName = 'PillShell';

const PillBody: FC<{
  onPress: () => void;
  label: string;
  children: ReactNode;
}> = ({ onPress, label, children }) => {
  const themed = useThemedStyles(createStyles);
  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      scaleTo={0.94}
      accessibilityLabel={label}
      style={themed.tabInner}>
      {children}
    </PressableScale>
  );
};
PillBody.displayName = 'PillBody';

/* ─────────────── tab pill ─────────────── */

interface TabPillProps {
  config: TabConfig;
  isActive: boolean;
  onPress: (name: TabOption) => void;
  onLayout: (name: TabOption, x: number, width: number) => void;
  scheme: Scheme;
}

const TabPill: FC<TabPillProps> = ({
  config,
  isActive,
  onPress,
  onLayout,
  scheme,
}) => {
  const { Icon, name } = config;
  const tint = isActive ? scheme.textOnBrand : scheme.textSecondary;
  return (
    <PillShell name={name} onLayout={onLayout}>
      <PillBody onPress={() => onPress(name)} label={`${name} tab`}>
        <Icon size={ICON_SIZE_SM} color={tint} />
        <AppText fontSize={FONT_SIZE_XS} semi_bold color={tint}>
          {name}
        </AppText>
      </PillBody>
    </PillShell>
  );
};
TabPill.displayName = 'TabPill';

/* ─────────────── tab selector ─────────────── */

const TabSelector: FC<TabSelectorProps> = ({ selected, onSelect }) => {
  const scheme = useScheme();
  const scrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const initialized = useRef(false);

  const blobX = useSharedValue(0);
  const blobWidth = useSharedValue(0);

  const handleLayout = useCallback(
    (name: TabOption, x: number, width: number) => {
      tabLayoutsRef.current[name] = { x, width };
      if (!initialized.current && name === selected) {
        blobX.value = x;
        blobWidth.value = width;
        initialized.current = true;
      }
    },
    [selected, blobX, blobWidth],
  );

  useEffect(() => {
    const layout = tabLayoutsRef.current[selected];
    if (!layout) return;

    if (!initialized.current) {
      blobX.value = layout.x;
      blobWidth.value = layout.width;
      initialized.current = true;
    } else {
      const fromX = blobX.value;
      const fromWidth = blobWidth.value;
      const toX = layout.x;
      const toWidth = layout.width;

      // The "liquid" trick: in the first half of the transition the
      // blob expands to bridge both chips; in the second half it
      // contracts down to the target. Width animation is bounded
      // (never grows beyond the bridge), so the spring overshoot
      // never punches past either chip's outer edge.
      const stretchX = Math.min(fromX, toX);
      const stretchEnd = Math.max(fromX + fromWidth, toX + toWidth);
      const stretchWidth = stretchEnd - stretchX;

      blobX.value = withSequence(
        withTiming(stretchX, { duration: STRETCH_DURATION }),
        withSpring(toX, springTokens.expressive),
      );
      blobWidth.value = withSequence(
        withTiming(stretchWidth, { duration: STRETCH_DURATION }),
        withSpring(toWidth, springTokens.expressive),
      );
    }

    if (!scrollRef.current) return;
    const targetX = Math.max(0, layout.x - WIDTH / 2 + layout.width / 2);
    const handle = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
    });
    return () => cancelAnimationFrame(handle);
  }, [selected, blobX, blobWidth]);

  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blobX.value }],
    width: blobWidth.value,
  }));

  return (
    <TabRow scrollRef={scrollRef}>
      <MorphBlob animatedStyle={blobStyle} />
      {tabs.map(tab => (
        <TabPill
          key={tab.name}
          config={tab}
          isActive={selected === tab.name}
          onPress={onSelect}
          onLayout={handleLayout}
          scheme={scheme}
        />
      ))}
    </TabRow>
  );
};
TabSelector.displayName = 'TabSelector';

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingVertical: space.xs,
      paddingHorizontal: space.xs,
    },
    tab: {
      borderRadius: radiusTokens.pill,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    tabInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.md,
      height: PILL_HEIGHT,
    },
    blob: {
      position: 'absolute',
      left: 0,
      top: space.xs,
      height: PILL_HEIGHT,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
      shadowColor: scheme.brand,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
  });

export default TabSelector;
