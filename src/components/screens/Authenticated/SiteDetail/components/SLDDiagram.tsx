import React, { FC, useCallback, useState } from 'react';
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
import { normalizeHeight, normalizeWidth } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import { usePullToRefreshBlock } from '../pullToRefreshGate';
import SLDViewport from './SLDViewport';
import { useSldModel } from './useSldModel';

/* ─────────── viewport dimensions (inline) ─────────── */

const { width: SW } = Dimensions.get('window');
/**
 * Inline viewport size. The width is the screen minus the SiteDetail body
 * gutter (`space.lg` each side, SiteDetail `scrollContent`), so the panel's
 * edges line up with every other card on the tab.
 */
export const SLD_INLINE_WIDTH = SW - space.lg * 2;
export const SLD_INLINE_HEIGHT = normalizeHeight(480);
/** Same corner radius as SLDViewport's frame (`VIEWPORT_RADIUS`). */
const SLD_INLINE_RADIUS = normalizeWidth(16);

const VW = SLD_INLINE_WIDTH;
const VH = SLD_INLINE_HEIGHT;

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;
type Nav = NativeStackNavigationProp<DashboardStackParamList>;

/**
 * The "no diagram" state — a compact inline card (≤ ~120pt), not an empty
 * VW×VH box. Shared by the inline panel, the Summary section (which knows
 * up front and skips the 480pt placeholder) and the full-screen route.
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
 * Loading stand-in with the EXACT geometry of the inline viewport, so the
 * deferred diagram mount (Summary, 300 ms) lands without a layout jump.
 */
export const SLDDiagramPlaceholder: FC = () => (
  <Skeleton width={VW} height={VH} radius={SLD_INLINE_RADIUS} />
);
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

  // Graph (grouped by energy type or per-unit) + live resolver + bounds —
  // shared with the full-screen route so both show the same mode.
  const { graph, bounds, resolve, mode, setMode, canGroup } =
    useSldModel(siteId);
  // Pan lock + routing live HERE, not in the viewport: the viewport is
  // remounted (keyed by mode) on every Grouped ⇄ Units switch, and the
  // user's choices must survive it. Opens locked + orthogonal.
  const [locked, setLocked] = useState(true);
  // While unlocked, vertical drags pan the diagram — they must not start
  // SiteDetail's pull-to-refresh (no-op outside SiteDetail, e.g. tests).
  usePullToRefreshBlock(!locked);
  const [orthogonal, setOrthogonal] = useState(true);

  // Full-screen is a dedicated navigation screen (landscape). It lives in the
  // main React surface — unlike a core <Modal>, which is a separate Fabric
  // surface that crashes Reanimated's commit/mount hooks on this RN version.
  const openFullscreen = useCallback(() => {
    navigation.navigate('SLDFullscreen', { siteId });
  }, [navigation, siteId]);

  if (graph.nodes.length === 0) {
    return <SLDEmptyState />;
  }

  // Full-screen route is on top → drop the inline SVG/viewport to a static box.
  if (!isFocused) {
    return (
      <View style={styles.container}>
        <View style={themed.emptyViewport} />
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
        height={VH}
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
      height: VH,
      overflow: 'hidden',
      backgroundColor: scheme.surfaceRaised,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: SLD_INLINE_RADIUS,
    },
  });

export default SLDDiagram;
