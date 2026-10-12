import React, { FC, memo, useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyStateCard, Skeleton } from 'src/components/common';
import { radius, Scheme, space, useThemedStyles, webTwin } from 'src/theme';
import { normalizeHeight, normalizeWidth, SLDBounds } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import type { SldView, SldViewMode } from 'src/hooks';

import { useBodyScrollHold, usePullToRefreshBlock } from '../pullToRefreshGate';
import { useBodyViewportHeight, useBodyViewportVisibility } from '../bodyViewport';
import SLDViewport from './SLDViewport';
import {
  SldViewHeader,
  SldViewHeaderSkeleton,
  useSldViewHeaderGeometry,
} from './ControlButtons';
import {
  sldPanelHeight,
  sldTwinInlineHeight,
  SLD_VIEWPORT_BORDER,
} from './sldViewportFit';
import SldTwinView from './SldTwin/SldTwinView';
import { useSldLayout, useSldModel } from './useSldModel';

/* ─────────── viewport dimensions (inline) ─────────── */

const { width: SW, height: SH } = Dimensions.get('window');
/**
 * Inline viewport width: the screen minus the SiteDetail body gutter
 * (`space.lg` each side, SiteDetail `scrollContent`), so the panel's edges
 * line up with every other card on the tab.
 */
export const SLD_INLINE_WIDTH = SW - space.lg * 2;
/**
 * The Diagram's inline panel follows its diagram ({@link sldInlineHeight}):
 * the whole phone layout at the width-filling scale, within these bounds —
 * past the max the panel opens centred on the plant and the rest is panned
 * (unlock, or full screen).
 */
export const SLD_INLINE_MIN_HEIGHT = 320;
export const SLD_INLINE_MAX_HEIGHT = Math.round(SH * 0.85);
/**
 * The 3D twin's inline panel before SiteDetail's body is laid out: the
 * web's own phone rule, `clamp(600, 78 % of the window height, 920)` pt — a
 * TALL card like the mobile web (`sldTwinInlineHeight`). Once the body's
 * height is known the card is capped so page stays in view to scroll by
 * ({@link useSldTwinInlineHeight}).
 */
export const SLD_TWIN_INLINE_HEIGHT = sldTwinInlineHeight(SH);

/**
 * The inline twin's height: the web's clamp, capped so
 * `SLD_TWIN_SCROLL_RESERVE` of SiteDetail's body viewport stays free —
 * every drag that starts on the 3D moves the model, never the page, so the
 * card must never fill the screen. Re-renders only on a viewport resize.
 */
export const useSldTwinInlineHeight = (): number =>
  sldTwinInlineHeight(SH, useBodyViewportHeight());
/**
 * Placeholder height while the site config — and so the diagram's real
 * height — is still unknown (the SiteDetail skeleton too). Once the config
 * is cached the Summary placeholder uses the real height instead.
 */
export const SLD_INLINE_DEFAULT_HEIGHT = normalizeHeight(480);
/** Same corner radius as SLDViewport's frame (`VIEWPORT_RADIUS`). */
const SLD_INLINE_RADIUS = normalizeWidth(16);
/**
 * The twin's panel clips to the web canvas's own rounded frame (12 px:
 * the page draws its 1 px border at that radius), so the two edges match.
 */
const SLD_TWIN_RADIUS = radius.md;
/**
 * iOS: the travel (points) after which the inline 3D's native scroll guard
 * begins — a gesture-handler pan with no callbacks around the WebView. An
 * ACTIVE pan fails the body UIScrollView's own pan, natively, before that
 * one starts (~10 pt): the JS hold below needs a JS round trip and a
 * commit, which a brisk swipe outruns (the page jumped by the travel, then
 * stopped). Above a tap's jitter, so WebKit's synthetic tap (tags, tools)
 * is never pre-empted; `cancelsTouchesInView(false)` keeps every touch
 * flowing to the page. Android needs none (the WebView's
 * `nestedScrollEnabled`, SldTwinView) — and must not get one: an active
 * gesture-handler pan there intercepts the WebView's touches.
 */
export const SLD_TWIN_IOS_SCROLL_GUARD_PT = 6;

const VW = SLD_INLINE_WIDTH;

/**
 * Height of the inline panel for the Diagram (the phone layout's bounds):
 * its content at the width-filling fit, clamped to
 * [{@link SLD_INLINE_MIN_HEIGHT}, {@link SLD_INLINE_MAX_HEIGHT}]; the
 * frame's border is added outside. No strip for a pill: inline, Grouped |
 * Units sits in the header row above the panel ({@link SldViewHeader}), not
 * over the diagram (the 2D full screen keeps its in-panel pills).
 */
export const sldInlineHeight = (bounds: SLDBounds): number => {
  const b2 = 2 * SLD_VIEWPORT_BORDER;
  return (
    sldPanelHeight({
      viewWidth: VW - b2,
      contentWidth: bounds.width,
      contentHeight: bounds.height,
      minHeight: SLD_INLINE_MIN_HEIGHT - b2,
      maxHeight: SLD_INLINE_MAX_HEIGHT - b2,
    }) + b2
  );
};

/** The inline panel's height for what the inline host mounts (3D twin or Diagram). */
const panelHeightFor = (
  m: { bounds: SLDBounds; view: SldView },
  twinHeight: number,
): number => (m.view === '3d' ? twinHeight : sldInlineHeight(m.bounds));

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;
type Nav = NativeStackNavigationProp<DashboardStackParamList>;

/**
 * The "no diagram" state — a compact inline card (≤ ~120pt), not an empty
 * panel. Shared by the inline panel, the Summary section (which knows up
 * front and skips the placeholder) and the full-screen route.
 */
export const SLDEmptyState: FC<{ onClose?: () => void }> = ({ onClose }) => (
  <EmptyStateCard
    kind="notConfigured"
    size="inline"
    title="No energy-flow diagram for this site"
    message="An administrator can add one in the web portal."
    onRetry={onClose}
    retryLabel="Close"
  />
);
SLDEmptyState.displayName = 'SLDEmptyState';

/**
 * Loading stand-in with the inline block's geometry: the header row (a
 * skeleton per switch — Diagram | 3D, Grouped | Units — and, in 3D, the
 * full-screen button, wrapped onto two lines exactly when the real row
 * wraps: the same `useSldViewHeaderGeometry`), and the panel at its real
 * height once the config is known (live-data free — the 3D twin's card or
 * the Diagram's own height), so the deferred diagram mount (Summary,
 * 300 ms) lands without a layout jump.
 *
 * It looks the layout up ITSELF (rather than the Summary passing it) so
 * only this placeholder subscribes to the layout / view store — the
 * Summary tab doesn't re-render on every toggle.
 */
export const SLDDiagramPlaceholder: FC<{ siteId: string }> = ({ siteId }) => {
  const { graph, bounds, canGroup, view, can3D } = useSldLayout(siteId);
  const hasDiagram = graph.nodes.length > 0;
  const twinHeight = useSldTwinInlineHeight();
  // The SAME rule the mounted panel uses (`panelHeightFor`); the default
  // until the config is known.
  const height = useMemo(
    () =>
      hasDiagram
        ? panelHeightFor({ bounds, view }, twinHeight)
        : SLD_INLINE_DEFAULT_HEIGHT,
    [hasDiagram, bounds, view, twinHeight],
  );
  // The same header the mounted block draws (`SLDDiagram`).
  const header = useSldViewHeaderGeometry(VW, can3D, canGroup);
  const withHeader = hasDiagram && header.height > 0;
  return (
    <View style={styles.container}>
      {withHeader ? (
        <SldViewHeaderSkeleton geometry={header} withButton={view === '3d'} />
      ) : null}
      {/* The mounted card's own corner: the twin clips to radius.md, the
          Diagram's frame to SLD_INLINE_RADIUS — no corner change at the
          300 ms swap. */}
      <Skeleton
        width={VW}
        height={height}
        radius={hasDiagram && view === '3d' ? SLD_TWIN_RADIUS : SLD_INLINE_RADIUS}
      />
    </View>
  );
};
SLDDiagramPlaceholder.displayName = 'SLDDiagramPlaceholder';

interface SldTwinPanelProps {
  siteId: string;
  /** The shared Grouped / Units mode: the twin shows the site grouped like the Diagram, or every unit. */
  mode: SldViewMode;
  /** The panel overlaps the body's visible area (UI-thread shared value). */
  inView: SharedValue<boolean>;
  /** The SiteDetail screen is focused (false under the full-screen route). */
  focused: boolean;
  /** The card's height (`useSldTwinInlineHeight`). */
  height: number;
  onExit: () => void;
  onFail: () => void;
}

/**
 * The inline 3D twin. Its `visible` is a plain boolean (the page pauses
 * itself while false — its own IntersectionObserver cannot see RN
 * scrolling): the body-viewport shared value is mirrored into state only
 * when it CHANGES, here, so a scroll in or out of view re-renders this
 * panel alone, never the Summary or the Diagram.
 */
const SldTwinPanel: FC<SldTwinPanelProps> = memo(
  ({ siteId, mode, inView, focused, height, onExit, onFail }) => {
    const [shown, setShown] = useState(true);
    useAnimatedReaction(
      () => inView.value,
      (next, prev) => {
        if (next !== prev) runOnJS(setShown)(next);
      },
      [inView],
    );
    // While a finger is on the 3D the page holds its scroll (and
    // pull-to-refresh) still: every drag there moves the model. The native
    // blocks come first — Android: the WebView's `nestedScrollEnabled`
    // (SldTwinView) keeps the ScrollView from ever intercepting; iOS: the
    // scroll guard pan below fails the scroll view's pan before it starts.
    // The JS holds are the backstop (and the only pull-to-refresh block on
    // Android: SwipeRefreshLayout ignores the disallow request). Two
    // INDEPENDENT holds — the gate is ref-counted, so neither can release
    // the other's:
    //  - `holdPage`: the page's own claim (`onGesture`: a finger on the 3D
    //    canvas … the last one lifted, always paired by SldTwinView);
    //  - `holdTouch`: RN's touch events on this panel — ANY touch in it (a
    //    tool, the mix / legend, the readings card, the loading skeleton
    //    too — the page claims canvas touches only), held
    //    from touch-down until the last of THIS panel's touches ends. Its
    //    own touches are tracked by identifier: RN's `touches` lists every
    //    finger on the screen, and a finger elsewhere that lifts last sends
    //    its touchend to ITS target, never here (a stuck page). A cancel
    //    (the native scroll view or a gesture handler took the touch over)
    //    ends them all; no finger left anywhere also clears the set.
    const holdPage = useBodyScrollHold();
    const holdTouch = useBodyScrollHold();
    const touchIds = useRef(new Set<string>());
    const onTouchStart = useCallback(
      (e: GestureResponderEvent) => {
        (e.nativeEvent.changedTouches ?? []).forEach(t => touchIds.current.add(String(t.identifier)));
        holdTouch(true);
      },
      [holdTouch],
    );
    const onTouchEnd = useCallback(
      (e: GestureResponderEvent) => {
        (e.nativeEvent.changedTouches ?? []).forEach(t => touchIds.current.delete(String(t.identifier)));
        if (touchIds.current.size === 0 || e.nativeEvent.touches?.length === 0) {
          touchIds.current.clear();
          holdTouch(false);
        }
      },
      [holdTouch],
    );
    const onTouchCancel = useCallback(() => {
      touchIds.current.clear();
      holdTouch(false);
    }, [holdTouch]);
    // iOS only (see SLD_TWIN_IOS_SCROLL_GUARD_PT): no callbacks, never
    // cancels the page's touches.
    const scrollGuard = useMemo(
      () =>
        Platform.OS === 'ios'
          ? Gesture.Pan()
              .minDistance(SLD_TWIN_IOS_SCROLL_GUARD_PT)
              .cancelsTouchesInView(false)
              .shouldCancelWhenOutside(false)
          : null,
      [],
    );
    const style = useMemo(() => [styles.twin, { height }], [height]);
    const panel = (
      <View
        testID="sld-twin-panel"
        collapsable={false}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}>
        <SldTwinView
          siteId={siteId}
          host="inline"
          mode={mode}
          visible={shown && focused}
          style={style}
          onExit={onExit}
          onFail={onFail}
          onGesture={holdPage}
        />
      </View>
    );
    return scrollGuard !== null ? (
      <GestureDetector gesture={scrollGuard}>{panel}</GestureDetector>
    ) : (
      panel
    );
  },
);
SldTwinPanel.displayName = 'SldTwinPanel';

const SLDDiagram: FC = () => {
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  // False while the full-screen SLD route is pushed on top. The Diagram's
  // inline viewport is unmounted then so two SLD SVG trees are never alive
  // at once — that doubled tree is what tipped Reanimated's Fabric
  // commit-hook clone over. A 3D twin that was already up stays mounted,
  // paused (`visible`), but none is CREATED under the full screen (see
  // `twinLatched`).
  const isFocused = useIsFocused();

  // Graph (grouped by energy type or per-unit, laid out for a phone) + live
  // resolver + the Diagram | 3D view + the Grouped / Units mode — shared
  // with the full-screen route so both show the same mode and view (the
  // mode drives the 3D twin too).
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
  } = useSldModel(siteId, route.params.dataLastUpdate);
  const is3D = view === '3d';
  // The inline twin may only be CREATED while this screen is focused. Once
  // up it survives the full screen (paused, its page kept); the view
  // turning to the Diagram drops it. Without the latch, "Diagram" then
  // "3D" inside the full screen would start a second, hidden page — two
  // 2 MB parses, two three.js scenes and two WebGL contexts at once (on
  // Android one renderer process: one OOM kill takes both down). Adjusted
  // during render (React's "state from props" pattern): no frame with the
  // wrong body.
  const [twinLatched, setTwinLatched] = useState(is3D && isFocused);
  const twinLatch = is3D && (isFocused || twinLatched);
  if (twinLatch !== twinLatched) setTwinLatched(twinLatch);
  const twinHeight = useSldTwinInlineHeight();
  const height = useMemo(
    () => panelHeightFor({ bounds, view }, twinHeight),
    [bounds, view, twinHeight],
  );
  // The header row above the panel: Diagram | 3D (unless the twin failed
  // for this site), Grouped | Units (when something groups) and, in 3D,
  // the sideways full screen — wrapping on narrow phones / large text.
  const header = useSldViewHeaderGeometry(VW, can3D, canGroup);
  // Pan lock + routing live HERE, not in the viewport: the viewport is
  // remounted (keyed by mode) on every Grouped ⇄ Units switch, and the
  // user's choices must survive it. Opens locked (the page scrolls over the
  // panel) + orthogonal.
  const [locked, setLocked] = useState(true);
  // While unlocked, vertical drags pan the diagram — they must not start
  // SiteDetail's pull-to-refresh (no-op outside SiteDetail, e.g. tests).
  // The 3D twin holds the page scroll AND the pull itself, only while a
  // finger is on it (`SldTwinPanel`, `useBodyScrollHold`).
  usePullToRefreshBlock(!is3D && !locked);
  const [orthogonal, setOrthogonal] = useState(true);
  // The panel's on-screen state: the Diagram's flowing dashes only animate
  // while the panel overlaps the body's visible area (once it is scrolled
  // fully out of view — Summary content above it taller than the screen —
  // the flow clock's UI-thread loop is paused); the 3D twin pauses itself.
  // A shared value flipped from the scroll events — no React commit — and
  // held here so it survives the keyed remounts.
  const {
    ref: panelRef,
    onLayout: onPanelLayout,
    visible: inView,
  } = useBodyViewportVisibility();

  // Full-screen is a dedicated navigation screen. It lives in the main React
  // surface — unlike a core <Modal>, which is a separate Fabric surface that
  // crashes Reanimated's commit/mount hooks on this RN version. In 3D it
  // shows the twin SIDEWAYS (turned by a transform, never an OS rotation).
  const openFullscreen = useCallback(() => {
    navigation.navigate('SLDFullscreen', { siteId });
  }, [navigation, siteId]);
  // The twin's own "Show the diagram" (WebGL unavailable): the persisted
  // view becomes the Diagram. A page that can't be shown at all falls back
  // to the Diagram for this site, this session (`fallBackTo2D`; the switch
  // hides).
  const onTwinExit = useCallback(() => setView('2d'), [setView]);

  const emptyViewportStyle = useMemo(
    () => [themed.emptyViewport, { height }],
    [themed.emptyViewport, height],
  );
  const twinBoxStyle = useMemo(
    () => [themed.twinBox, { height: twinHeight }],
    [themed.twinBox, twinHeight],
  );

  if (graph.nodes.length === 0) {
    return <SLDEmptyState />;
  }

  let body: React.ReactElement;
  if (is3D && !twinLatch) {
    // 3D chosen under the full screen with no twin up: a static box in
    // the twin's colour until this screen is back in focus.
    body = <View style={twinBoxStyle} />;
  } else if (is3D) {
    body = (
      <SldTwinPanel
        siteId={siteId}
        mode={mode}
        inView={inView}
        focused={isFocused}
        height={twinHeight}
        onExit={onTwinExit}
        onFail={fallBackTo2D}
      />
    );
  } else if (!isFocused) {
    // Full-screen route is on top → drop the Diagram to a static box.
    body = <View style={emptyViewportStyle} />;
  } else {
    // Keyed by mode: switching Grouped ⇄ Units remounts the viewport so it
    // re-fits to the new bounds (fresh pan/zoom shared values). Lock /
    // routing are held above, so they persist across the switch. No
    // in-panel Grouped | Units pill (no `groupMode`): it heads the panel,
    // so the fit reserves no strip / mask band for it.
    body = (
      <SLDViewport
        key={mode}
        graph={graph}
        bounds={bounds}
        resolve={resolve}
        lastUpdate={lastUpdate}
        width={VW}
        height={height}
        focus={focus}
        onFullscreen={openFullscreen}
        locked={locked}
        onLockedChange={setLocked}
        orthogonal={orthogonal}
        onOrthogonalChange={setOrthogonal}
        animate={inView}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Diagram | 3D (hidden once the twin failed for this site),
          Grouped | Units (when something groups — both views) and, in 3D,
          the way into the sideways full screen. */}
      {header.height > 0 ? (
        <SldViewHeader
          geometry={header}
          view={view}
          onViewChange={setView}
          mode={mode}
          onModeChange={setMode}
          onFullscreen={is3D ? openFullscreen : undefined}
        />
      ) : null}
      <View ref={panelRef} onLayout={onPanelLayout} collapsable={false}>
        {body}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    gap: space.sm,
  },
  /** Height from `useSldTwinInlineHeight` (style array). */
  twin: {
    width: VW,
    borderRadius: SLD_TWIN_RADIUS,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    emptyViewport: {
      width: VW,
      overflow: 'hidden',
      backgroundColor: scheme.surfaceRaised,
      borderWidth: SLD_VIEWPORT_BORDER,
      borderColor: scheme.border,
      borderRadius: SLD_INLINE_RADIUS,
    },
    /** Height from `useSldTwinInlineHeight` (style array). */
    twinBox: {
      width: VW,
      borderRadius: SLD_TWIN_RADIUS,
      backgroundColor: scheme.isDark ? webTwin.bgDark : webTwin.bgLight,
    },
  });

export default SLDDiagram;
