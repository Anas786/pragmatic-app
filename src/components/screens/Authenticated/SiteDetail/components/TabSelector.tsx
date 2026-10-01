/**
 * TabSelector — v5 (pinned, segmented track, liquid-morph blob).
 *
 * Rendered by SiteDetail in a FIXED slot between the header and the body
 * ScrollView, so the strip stays on screen however far a tab scrolls.
 *
 * The original v2 "liquid-morph" used Reanimated `LinearTransition` on
 * every TabPill which tripped a ShadowTree::commit SIGABRT under the
 * new architecture (see v3 comment history). This version reproduces
 * the visual effect with a single absolutely-positioned Animated.View
 * — a flat brand-coloured "blob" sitting behind the static chips that
 * morphs its `translateX` + `width` to track the active chip.
 *
 * The "liquid" feel comes from a two-step sequence on every change:
 *   1. The blob stretches to span both the source and target chips
 *      (timing — fast, communicates intent).
 *   2. The blob contracts to fit just the target chip
 *      (spring — settles with a soft bounce).
 *
 * The chips themselves never re-layout — Reanimated only ever animates
 * one isolated view's transform + width (style keys only), so there is
 * no tree-cloning and no commit-hook racing across siblings.
 *
 * v5: the blob is a flat fill (its old shadow was clipped by the strip
 * into a hard rectangular halo); the chips sit in a surfaceMuted pill
 * track so the strip reads as one control; bg-coloured edge fades mark
 * the side(s) with hidden tabs (booleans from scroll/size events — no
 * animated styles); every chip is a ≥ touch.min tab with a selected
 * state inside a tab bar / tab list.
 */

import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityRole,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText, PressableScale } from 'src/components/common';
import type { PressableRole } from 'src/components/common';
import {
  radius as radiusTokens,
  Scheme,
  space,
  spring as springTokens,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { ICON_SIZE_SM, WIDTH } from 'src/utils';
import { haptics } from 'src/utils/haptics';
import { IconProps } from 'src/types';
import {
  BoltIcon,
  CardsTabIcon,
  ChartIcon,
  GridIcon,
  SummaryTabIcon,
  TrendTabIcon,
} from 'src/assets/icons';
import { tabCenterScrollX, tabStripFades } from '../siteDetailModel';

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

/**
 * What the user sees / hears for each tab. `TabOption` is an internal key
 * (state, ViewsContent dispatch, refresh-strip rules); the label is the
 * product name. The 'Trend' tab is called "Analysis", like the web portal.
 */
export const TAB_LABELS: Readonly<Record<TabOption, string>> = {
  Summary: 'Summary',
  Cards: 'Cards',
  Live: 'Live',
  Alarms: 'Alarms',
  Trend: 'Analysis',
  Reports: 'Reports',
  Tables: 'Tables',
};

const tabs: TabConfig[] = [
  { name: 'Summary', Icon: SummaryTabIcon },
  { name: 'Cards', Icon: CardsTabIcon },
  { name: 'Live', Icon: BoltIcon },
  // Alarms tab hidden for now — re-add `{ name: 'Alarms', Icon: AlarmsTabIcon }`
  // (and its import) to restore it. The 'Alarms' TabOption + ViewsContent
  // case are intentionally left in place.
  { name: 'Trend', Icon: TrendTabIcon },
  { name: 'Reports', Icon: ChartIcon },
  { name: 'Tables', Icon: GridIcon },
];

/** Number of visible tabs (the skeleton draws the same count). */
export const TAB_COUNT = tabs.length;
/** Chip height — a real ≥ touch.min target (44pt iOS / 48dp Android);
 *  the track clips, so hitSlop would not help here. */
export const TAB_PILL_HEIGHT = touch.min;
/** Track padding around the chips. */
export const TAB_TRACK_INSET = space.xs;
/** Page gutter before / after the track inside the horizontal scroll. */
export const TAB_STRIP_GUTTER = space.lg;
/** Total strip height (track + its inset) — the fixed slot's content. */
export const TAB_STRIP_HEIGHT = TAB_PILL_HEIGHT + TAB_TRACK_INSET * 2;

const STRETCH_DURATION = 180;
const FADE_WIDTH = 20;

/**
 * VoiceOver only announces 'Tab, 1 of 6' for elements inside a container
 * with the TabBar trait, which RN maps from 'tabbar' (Fabric maps
 * 'tablist' to no trait on iOS). Inside a tab bar a button reads as a
 * tab, so iOS chips keep the button role; Android uses tablist / tab.
 */
const STRIP_ROLE: AccessibilityRole = Platform.OS === 'ios' ? 'tabbar' : 'tablist';
const CHIP_ROLE: PressableRole = Platform.OS === 'ios' ? 'button' : 'tab';

/* ─────────────── tab pill ─────────────── */

interface TabPillProps {
  config: TabConfig;
  isActive: boolean;
  onPress: (name: TabOption) => void;
  onLayout: (name: TabOption, x: number, width: number) => void;
  scheme: Scheme;
  themed: ReturnType<typeof createStyles>;
}

const TabPillBase: FC<TabPillProps> = ({
  config,
  isActive,
  onPress,
  onLayout,
  scheme,
  themed,
}) => {
  const { Icon, name } = config;
  const label = TAB_LABELS[name];
  const tint = isActive ? scheme.textOnBrand : scheme.textSecondary;

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) =>
      onLayout(name, e.nativeEvent.layout.x, e.nativeEvent.layout.width),
    [name, onLayout],
  );
  // 'select' haptic only on a selection CHANGE — never on re-tapping the
  // active tab (which just scrolls the body back to the top).
  const handlePress = useCallback(() => {
    if (!isActive) haptics.select();
    onPress(name);
  }, [isActive, name, onPress]);

  return (
    <View onLayout={handleLayout}>
      <PressableScale
        onPress={handlePress}
        scaleTo={0.94}
        role={CHIP_ROLE}
        selected={isActive}
        accessibilityLabel={label}
        style={themed.tabInner}>
        <Icon size={ICON_SIZE_SM} color={tint} />
        <AppText variant="bodySm" semi_bold color={tint} numberOfLines={1}>
          {label}
        </AppText>
      </PressableScale>
    </View>
  );
};
const TabPill = memo(TabPillBase);
TabPill.displayName = 'TabPill';

/* ─────────────── tab selector ─────────────── */

const TabSelector: FC<TabSelectorProps> = ({ selected, onSelect }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const initialized = useRef(false);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const blobX = useSharedValue(0);
  const blobWidth = useSharedValue(0);

  // Strip geometry for the edge fades + auto-centring. Refs hold the raw
  // numbers; state only flips when a fade's visibility actually changes.
  const viewportWRef = useRef(WIDTH);
  const contentWRef = useRef(0);
  const scrollXRef = useRef(0);
  const [fades, setFades] = useState({ left: false, right: false });

  const syncFades = useCallback(() => {
    const next = tabStripFades(
      scrollXRef.current,
      viewportWRef.current,
      contentWRef.current,
    );
    setFades(prev =>
      prev.left === next.left && prev.right === next.right ? prev : next,
    );
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollXRef.current = e.nativeEvent.contentOffset.x;
      syncFades();
    },
    [syncFades],
  );
  const handleViewportLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportWRef.current = e.nativeEvent.layout.width;
      syncFades();
    },
    [syncFades],
  );
  const handleContentSize = useCallback(
    (w: number) => {
      contentWRef.current = w;
      syncFades();
    },
    [syncFades],
  );

  // Stable: reads the selection through a ref so chips' onLayout props
  // never change. The selected chip snaps the blob on (re)layout — first
  // mount, or an OS text-size change that resizes the chips.
  const handleLayout = useCallback(
    (name: TabOption, x: number, width: number) => {
      tabLayoutsRef.current[name] = { x, width };
      if (name === selectedRef.current) {
        blobX.value = x;
        blobWidth.value = width;
        initialized.current = true;
      }
    },
    [blobX, blobWidth],
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
    const targetX = tabCenterScrollX(
      layout.x,
      layout.width,
      viewportWRef.current,
      TAB_STRIP_GUTTER,
    );
    const handle = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: targetX, animated: true });
    });
    return () => cancelAnimationFrame(handle);
  }, [selected, blobX, blobWidth]);

  // Style keys only (transform + width) — never non-style props.
  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blobX.value }],
    width: blobWidth.value,
  }));

  const leftFade = useMemo(() => [scheme.bg, `${scheme.bg}00`], [scheme.bg]);
  const rightFade = useMemo(() => [`${scheme.bg}00`, scheme.bg], [scheme.bg]);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole={STRIP_ROLE}
        accessibilityLabel="Site sections"
        onLayout={handleViewportLayout}
        onContentSizeChange={handleContentSize}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={styles.content}>
        <View style={themed.track}>
          <Animated.View
            pointerEvents="none"
            style={[themed.blob, blobStyle]}
          />
          {tabs.map(tab => (
            <TabPill
              key={tab.name}
              config={tab}
              isActive={selected === tab.name}
              onPress={onSelect}
              onLayout={handleLayout}
              scheme={scheme}
              themed={themed}
            />
          ))}
        </View>
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={leftFade}
        start={FADE_START}
        end={FADE_END}
        style={[styles.fade, styles.fadeLeft, fades.left ? null : styles.hidden]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={rightFade}
        start={FADE_START}
        end={FADE_END}
        style={[styles.fade, styles.fadeRight, fades.right ? null : styles.hidden]}
      />
    </View>
  );
};
TabSelector.displayName = 'TabSelector';

const FADE_START = { x: 0, y: 0.5 };
const FADE_END = { x: 1, y: 0.5 };

const styles = StyleSheet.create({
  root: {
    height: TAB_STRIP_HEIGHT,
  },
  content: {
    paddingHorizontal: TAB_STRIP_GUTTER,
    alignItems: 'center',
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
  hidden: { opacity: 0 },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.xs,
      padding: TAB_TRACK_INSET,
      borderRadius: radiusTokens.pill,
      // Clips the blob's spring overshoot to the track's rounded ends.
      overflow: 'hidden',
      backgroundColor: scheme.surfaceMuted,
    },
    tabInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.md + 2,
      minHeight: TAB_PILL_HEIGHT,
      borderRadius: radiusTokens.pill,
    },
    // Flat brand fill: no shadow / elevation (a shadow here was clipped
    // into a rectangular halo by the scroll view).
    blob: {
      position: 'absolute',
      left: 0,
      top: TAB_TRACK_INSET,
      height: TAB_PILL_HEIGHT,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.brand,
    },
  });

// Memoized — props are a string + a useCallback'd handler (see
// SiteDetail), so parent re-renders skip the whole chip strip.
export default memo(TabSelector);
