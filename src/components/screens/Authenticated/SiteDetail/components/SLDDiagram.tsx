import React, { FC, useCallback, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyStateCard, Skeleton } from 'src/components/common';
import { Scheme, space, useThemedStyles } from 'src/theme';
import { normalizeHeight, normalizeWidth, SLDBounds } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import { usePullToRefreshBlock } from '../pullToRefreshGate';
import SLDViewport from './SLDViewport';
import { SLD_MODE_TOGGLE_BOX } from './ControlButtons';
import { sldPanelHeight, SLD_VIEWPORT_BORDER } from './sldViewportFit';
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
 * The inline panel's height follows its diagram (see {@link sldInlineHeight}):
 * the whole phone layout at the width-filling scale, within these bounds.
 * Past the max the panel opens centred on the plant and the rest is panned
 * (unlock, or full screen).
 */
export const SLD_INLINE_MIN_HEIGHT = 320;
export const SLD_INLINE_MAX_HEIGHT = Math.round(SH * 0.85);
/**
 * Placeholder height while the site config — and so the diagram's real
 * height — is still unknown (the SiteDetail skeleton too). Once the config
 * is cached the Summary placeholder uses the real height instead.
 */
export const SLD_INLINE_DEFAULT_HEIGHT = normalizeHeight(480);
/** Same corner radius as SLDViewport's frame (`VIEWPORT_RADIUS`). */
const SLD_INLINE_RADIUS = normalizeWidth(16);

const VW = SLD_INLINE_WIDTH;

/**
 * Height of the inline panel for a laid-out diagram: its content at the
 * width-filling fit + the Grouped/Units pill's top strip (when the pill
 * shows), clamped to [{@link SLD_INLINE_MIN_HEIGHT},
 * {@link SLD_INLINE_MAX_HEIGHT}]; the frame's border is added outside.
 */
export const sldInlineHeight = (bounds: SLDBounds, showModeToggle: boolean): number => {
  const b2 = 2 * SLD_VIEWPORT_BORDER;
  return (
    sldPanelHeight({
      viewWidth: VW - b2,
      contentWidth: bounds.width,
      contentHeight: bounds.height,
      overlay: showModeToggle ? SLD_MODE_TOGGLE_BOX : undefined,
      minHeight: SLD_INLINE_MIN_HEIGHT - b2,
      maxHeight: SLD_INLINE_MAX_HEIGHT - b2,
    }) + b2
  );
};

/**
 * The inline panel's height for a site — the diagram's own height once the
 * config is known, else {@link SLD_INLINE_DEFAULT_HEIGHT}. Live-data free,
 * so the Summary placeholder can size itself before the diagram mounts.
 */
export const useSldInlineHeight = (siteId: string): number => {
  const { graph, bounds, canGroup } = useSldLayout(siteId);
  return useMemo(
    () =>
      graph.nodes.length > 0
        ? sldInlineHeight(bounds, canGroup)
        : SLD_INLINE_DEFAULT_HEIGHT,
    [graph.nodes.length, bounds, canGroup],
  );
};

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
 * Loading stand-in with the inline viewport's geometry: the diagram's real
 * height ({@link useSldInlineHeight}) once the config is known, so the
 * deferred diagram mount (Summary, 300 ms) lands without a layout jump.
 *
 * It looks the height up ITSELF (rather than the Summary passing it) so
 * only this placeholder subscribes to the layout / Grouped-Units store —
 * the Summary tab doesn't re-render on every mode toggle.
 */
export const SLDDiagramPlaceholder: FC<{ siteId: string }> = ({ siteId }) => {
  const height = useSldInlineHeight(siteId);
  return <Skeleton width={VW} height={height} radius={SLD_INLINE_RADIUS} />;
};
SLDDiagramPlaceholder.displayName = 'SLDDiagramPlaceholder';

const SLDDiagram: FC = () => {
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  // False while the full-screen SLD route is pushed on top. We unmount the
  // inline viewport then so two SLD SVG trees are never alive at once — that
  // doubled tree is what tipped Reanimated's Fabric commit-hook clone over.
  const isFocused = useIsFocused();

  // Graph (grouped by energy type or per-unit, laid out for a phone) + live
  // resolver — shared with the full-screen route so both show the same mode.
  const { graph, bounds, focus, resolve, mode, setMode, canGroup } =
    useSldModel(siteId);
  const height = useMemo(() => sldInlineHeight(bounds, canGroup), [bounds, canGroup]);
  // Pan lock + routing live HERE, not in the viewport: the viewport is
  // remounted (keyed by mode) on every Grouped ⇄ Units switch, and the
  // user's choices must survive it. Opens locked (the page scrolls over the
  // panel) + orthogonal.
  const [locked, setLocked] = useState(true);
  // While unlocked, vertical drags pan the diagram — they must not start
  // SiteDetail's pull-to-refresh (no-op outside SiteDetail, e.g. tests).
  usePullToRefreshBlock(!locked);
  const [orthogonal, setOrthogonal] = useState(true);

  // Full-screen is a dedicated navigation screen. It lives in the main React
  // surface — unlike a core <Modal>, which is a separate Fabric surface that
  // crashes Reanimated's commit/mount hooks on this RN version.
  const openFullscreen = useCallback(() => {
    navigation.navigate('SLDFullscreen', { siteId });
  }, [navigation, siteId]);

  const emptyViewportStyle = useMemo(
    () => [themed.emptyViewport, { height }],
    [themed.emptyViewport, height],
  );

  if (graph.nodes.length === 0) {
    return <SLDEmptyState />;
  }

  // Full-screen route is on top → drop the inline viewport to a static box.
  if (!isFocused) {
    return (
      <View style={styles.container}>
        <View style={emptyViewportStyle} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Keyed by mode: switching Grouped ⇄ Units remounts the viewport so it
          re-fits to the new graph's bounds (fresh pan/zoom shared values).
          Lock / routing are held above, so they persist across the switch. */}
      <SLDViewport
        key={mode}
        graph={graph}
        bounds={bounds}
        resolve={resolve}
        width={VW}
        height={height}
        focus={focus}
        onFullscreen={openFullscreen}
        groupMode={canGroup ? mode : undefined}
        onGroupModeChange={setMode}
        locked={locked}
        onLockedChange={setLocked}
        orthogonal={orthogonal}
        onOrthogonalChange={setOrthogonal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
  });

export default SLDDiagram;
