/**
 * SLDFullscreenScreen — the energy flow, full screen.
 *
 *   - Diagram (2D): PORTRAIT. The diagram is the phone layout
 *     (src/utils/sldPhoneLayout.ts): a tall, 2-column diagram, so full
 *     screen simply gives it the whole screen — width-filling, centred on
 *     the plant, pannable / zoomable. The device safe-area insets go
 *     straight to the viewport (fit, controls, top pills inside them). Its
 *     top-left "Diagram | 3D" pill (unless the twin failed for this site)
 *     turns the screen sideways into the 3D twin.
 *   - 3D: the web portal's own twin (`SldTwin/`, host `fullscreen`: every
 *     gesture goes to the twin) shown SIDEWAYS (user decision 2026-10-09).
 *     The phone stays portrait; a container the size of the window's long
 *     edge × short edge, centred on the window, is turned +90° about its
 *     centre by a TRANSFORM (`sldLandscapeContainer` — the
 *     ChartFullscreenModal pattern). Inside it, the portrait insets are
 *     mapped into the turned frame (`sldLandscapeGeometry`: the island /
 *     notch on the content's LEFT, the home indicator on its RIGHT); the
 *     twin fills the safe area left of an always-visible RAIL
 *     (`SldTwinRail`: Close; a round "Diagram" button that turns the
 *     screen back upright into the Diagram; and, when something groups,
 *     Group | Units — the ONE mode shared with the Diagram and the inline
 *     panel: the twin shows the site grouped like the Diagram, or every
 *     unit). A window that is already
 *     landscape (Android tablets / foldables) is not turned. The first
 *     time per session a short portrait-readable hint says "Turn your phone
 *     to the left" (and is announced to screen readers). The twin's own
 *     "Show the diagram" (no WebGL) switches the persisted view to the
 *     Diagram; a twin that can't be shown at all falls back to the Diagram
 *     for this site for the session (the pill hides).
 *
 * Why a transform is safe when an OS rotation is not: every past
 * fullscreen crash traced back to either a core `<Modal>` surface or a
 * device orientation change re-laying the root out under Reanimated's
 * Fabric commit/mount hooks. This screen uses neither — it is a navigation
 * screen (main React surface) and never asks for an orientation change; the
 * turn is one static matrix on one view (no re-layout, no new surface). The
 * WebView maps touches into its own (turned) coordinates natively.
 */

import React, { FC, memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StatusBar, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppText, ErrorBoundary, IconButton } from 'src/components/common';
import { radius, Scheme, space, useScheme, useThemedStyles, webTwin } from 'src/theme';
import { ICON_SIZE_MD } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import { Close } from 'src/assets/icons';
import SLDViewport from './SLDViewport';
import { SLDEmptyState } from './SLDDiagram';
import { SLD_TWIN_RAIL, SldTwinRail } from './ControlButtons';
import { sldLandscapeContainer, sldLandscapeGeometry } from './sldViewportFit';
import SldTwinView from './SldTwin/SldTwinView';
import { useSldModel } from './useSldModel';

/**
 * Renders nothing; reports whether the ErrorBoundary's children are
 * COMMITTED. The parent's flag starts false and only this probe sets it
 * true, so:
 *   - healthy mount → true in a layout effect (before paint, so the Close
 *     fallback button never flashes over the viewport);
 *   - crash on the FIRST render → React discards the whole child tree, the
 *     probe never commits and the flag stays false (Close shows);
 *   - crash on a later update → the children unmount (→ false);
 *   - 'Reload section' → the children remount (→ true).
 */
const ViewportMountProbe: FC<{
  onMountedChange: (mounted: boolean) => void;
}> = ({ onMountedChange }) => {
  useLayoutEffect(() => {
    onMountedChange(true);
    return () => onMountedChange(false);
  }, [onMountedChange]);
  return null;
};

/** The sideways full screen's one-time "turn your phone" hint. */
export const SLD_TURN_HINT_TEXT = 'Turn your phone to the left';
/** How long the hint stays before it fades (ms). */
export const SLD_TURN_HINT_MS = 2600;
/** Once per app session (module scope): only the FIRST sideways entry shows the hint. */
let turnHintSeen = false;
/** Tests only: forget that the hint was shown. */
export const resetSldTurnHintForTests = (): void => {
  turnHintSeen = false;
};

/**
 * "↻ Turn your phone to the left" — readable in PORTRAIT (it sits outside
 * the turned container, at the portrait top: the content's left edge, away
 * from the rail), shown the first time the sideways full screen opens in a
 * session, announced to screen readers, then faded on the UI thread. It
 * stays mounted (invisible, touch-through, hidden from a11y) so the fade
 * needs no React commit.
 */
const SldTurnHint: FC<{ top: number }> = memo(({ top }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  // Decided once, at mount: shown only if no earlier sideways entry showed it.
  const [show] = useState(() => !turnHintSeen);
  const opacity = useSharedValue(show ? 1 : 0);
  useEffect(() => {
    if (!show) return;
    turnHintSeen = true;
    AccessibilityInfo.announceForAccessibility(
      `Shown sideways. ${SLD_TURN_HINT_TEXT} to read it.`,
    );
    opacity.value = withDelay(SLD_TURN_HINT_MS, withTiming(0, { duration: 400 }));
  }, [show, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const boxStyle = useMemo(() => [themed.turnHint, { top }, fade], [themed.turnHint, top, fade]);
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.turnHintRow}>
      <Animated.View
        style={boxStyle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Icon name="screen-rotation" size={18} color={scheme.brandText} allowFontScaling={false} />
        <AppText fontSize={13} lineHeight={18} semi_bold color={scheme.textPrimary}>
          {SLD_TURN_HINT_TEXT}
        </AppText>
      </Animated.View>
    </View>
  );
});
SldTurnHint.displayName = 'SldTurnHint';

type SLDFullscreenRouteProp = RouteProp<
  DashboardStackParamList,
  'SLDFullscreen'
>;

const SLDFullscreenScreen: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<SLDFullscreenRouteProp>();
  const { siteId } = route.params;
  // Only the visible twin animates: the page pauses itself when this
  // route loses focus (`visible`).
  const isFocused = useIsFocused();
  // The frame the safe-area insets are measured against (the provider's
  // root view). Sizing the viewport from it — rather than the window — keeps
  // the insets exact on Android edge-to-edge, where the window metrics can
  // exclude the system bars the root view draws under.
  const { width: W, height: H } = useSafeAreaFrame();
  const { top, right, bottom, left } = useSafeAreaInsets();
  const safeInsets = useMemo(
    () => ({ top, right, bottom, left }),
    [top, right, bottom, left],
  );

  // Same model (and shared Grouped/Units mode + Diagram | 3D view) as the
  // inline panel.
  const {
    graph,
    bounds,
    focus,
    resolve,
    lastUpdate,
    mode,
    setMode,
    canGroup,
    view,
    can3D,
    setView,
    fallBackTo2D,
  } = useSldModel(siteId);
  // 3D (the twin) is shown sideways; the Diagram stays portrait.
  const sideways = view === '3d';
  // The geometry and the container are the SAME long × short box (turned
  // for a portrait window, as is for one already landscape).
  const geo = useMemo(
    () => sldLandscapeGeometry({ width: W, height: H }, { top, right, bottom, left }, SLD_TWIN_RAIL.width),
    [W, H, top, right, bottom, left],
  );
  const turnedStyle = useMemo(() => {
    const c = sldLandscapeContainer(W, H);
    return [
      styles.turned,
      {
        width: c.width,
        height: c.height,
        left: c.left,
        top: c.top,
        transform: [{ rotate: `${c.rotation}deg` }],
      },
    ];
  }, [W, H]);
  const twinStyle = useMemo(
    () => [styles.twin, { left: geo.area.x, top: geo.area.y, width: geo.area.w, height: geo.area.h }],
    [geo.area.x, geo.area.y, geo.area.w, geo.area.h],
  );
  // Sideways the whole screen is the twin's page colour, so the bands under
  // the island and beside the rail read as the twin's own background.
  const rootStyle = useMemo(
    () => [
      themed.root,
      sideways && { backgroundColor: scheme.isDark ? webTwin.bgDark : webTwin.bgLight },
    ],
    [themed.root, sideways, scheme.isDark],
  );
  // Owned here so they survive the keyed Grouped ⇄ Units remount below.
  // Opens UNLOCKED: unlike the inline panel there is no page scroll to
  // protect here, and a diagram taller than the screen needs panning.
  const [locked, setLocked] = useState(false);
  const [orthogonal, setOrthogonal] = useState(true);

  const close = useCallback(() => navigation.goBack(), [navigation]);
  // Back upright into the Diagram (the persisted view) — the rail's button
  // and the twin's own "Show the diagram".
  const showDiagram = useCallback(() => setView('2d'), [setView]);
  // True only once the viewport subtree has committed (see
  // ViewportMountProbe) — false while the ErrorBoundary below shows its
  // fallback, including after a crash on the very first render.
  const [viewportMounted, setViewportMounted] = useState(false);
  const closeButtonStyle = useMemo(
    () => [
      styles.closeButton,
      {
        top: top + space.sm,
        left: left + space.sm,
      },
    ],
    [top, left],
  );

  if (graph.nodes.length === 0) {
    return (
      <View style={themed.root}>
        <StatusBar hidden />
        <View style={themed.center}>
          <SLDEmptyState onClose={close} />
        </View>
      </View>
    );
  }

  if (sideways) {
    return (
      <View style={rootStyle}>
        <StatusBar hidden />
        <View style={turnedStyle}>
          <View style={twinStyle}>
            {/* The rail's Close stays outside the boundary: a twin that
                throws while rendering still leaves the way out. */}
            <ErrorBoundary label="3D energy flow" resetKey={siteId}>
              <SldTwinView
                siteId={siteId}
                host="fullscreen"
                mode={mode}
                visible={isFocused}
                style={styles.fill}
                onExit={showDiagram}
                onFail={fallBackTo2D}
              />
            </ErrorBoundary>
          </View>
          <SldTwinRail
            rail={geo.rail}
            onClose={close}
            onDiagram={showDiagram}
            groupMode={canGroup ? mode : undefined}
            onGroupModeChange={setMode}
          />
        </View>
        <SldTurnHint top={top + space.md} />
      </View>
    );
  }

  return (
    <View style={themed.root}>
      <StatusBar hidden />
      <View style={styles.fill}>
        <ErrorBoundary label="Energy-flow diagram" resetKey={siteId}>
          <ViewportMountProbe onMountedChange={setViewportMounted} />
          <SLDViewport
            key={mode}
            graph={graph}
            bounds={bounds}
            resolve={resolve}
            lastUpdate={lastUpdate}
            width={W}
            height={H}
            fullscreen
            focus={focus}
            onClose={close}
            safeInsets={safeInsets}
            groupMode={canGroup ? mode : undefined}
            onGroupModeChange={setMode}
            // Diagram | 3D (the user's call, 2026-10-09): 3D turns this
            // screen sideways into the twin (hidden once it failed).
            view={can3D ? view : undefined}
            onViewChange={setView}
            locked={locked}
            onLockedChange={setLocked}
            orthogonal={orthogonal}
            onOrthogonalChange={setOrthogonal}
          />
        </ErrorBoundary>
      </View>
      {!viewportMounted ? (
        <IconButton variant="soft" onPress={close} accessibilityLabel="Close" style={closeButtonStyle}>
          <Close size={ICON_SIZE_MD} color={scheme.textPrimary} />
        </IconButton>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // Centres the boundary's fallback card; the viewport itself is exactly
  // the frame's size, so it is unaffected.
  fill: {
    flex: 1,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
  },
  // Full-width row at the portrait top, centring the hint.
  turnHintRow: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  // Turned +90° about its own centre (RN's default transform origin); its
  // size / offsets / rotation come from `sldLandscapeContainer`.
  turned: {
    position: 'absolute',
  },
  // The twin's safe area in the turned frame (`sldLandscapeGeometry().area`).
  twin: {
    position: 'absolute',
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: scheme.bg,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: space['3xl'],
    },
    turnHint: {
      position: 'absolute',
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingHorizontal: space.lg,
      paddingVertical: space.sm,
      borderRadius: radius.pill,
      backgroundColor: scheme.surfaceRaised,
      borderWidth: 1,
      borderColor: scheme.border,
    },
  });

export default SLDFullscreenScreen;
