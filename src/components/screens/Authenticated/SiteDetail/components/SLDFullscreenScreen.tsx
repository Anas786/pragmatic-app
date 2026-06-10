/**
 * SLDFullscreenScreen — the energy-flow diagram, full-screen in landscape.
 *
 * Landscape WITHOUT OS rotation: the screen stays portrait and a container
 * sized to the screen's long edge is rotated 90° about its centre (same trick
 * as `ChartFullscreenModal`). This is deliberate — every previous fullscreen
 * crash traced back to either a core `<Modal>` surface or a device rotation
 * re-layout colliding with Reanimated's Fabric commit/mount hooks. This screen
 * uses neither:
 *   - it's a navigation screen (main React surface, not a Modal surface), and
 *   - it never triggers an OS orientation change.
 *
 * So the same Reanimated `SLDViewport` that's stable inline is stable here.
 * `rotated` tells the viewport to remap pan deltas into the rotated frame.
 */

import React, { FC, useMemo } from 'react';
import { StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import {
  FONT_SIZE_XS,
  getGraphBounds,
  makeLiveResolver,
  selectSldGraph,
} from 'src/utils';
import { useSiteConfig, useSiteData } from 'src/hooks';
import { DashboardStackParamList, SLDGraph } from 'src/types';
import SLDViewport from './SLDViewport';

const EMPTY_GRAPH: SLDGraph = { nodes: [], edges: [] };

type SLDFullscreenRouteProp = RouteProp<DashboardStackParamList, 'SLDFullscreen'>;

const SLDFullscreenScreen: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<SLDFullscreenRouteProp>();
  const { siteId } = route.params;
  const { width: W, height: H } = useWindowDimensions();
  // App is portrait-locked, so the portrait `top` inset IS the camera/notch —
  // and the rotated container's left edge maps to that physical edge. Push the
  // controls in by that much so they clear the camera in landscape.
  const insets = useSafeAreaInsets();

  const { data: config } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);

  const graph = useMemo(() => selectSldGraph(config) ?? EMPTY_GRAPH, [config]);
  const resolve = useMemo(() => makeLiveResolver(liveData), [liveData]);
  const bounds = useMemo(() => getGraphBounds(graph), [graph]);

  // Landscape canvas = long edge × short edge, rotated 90° about centre.
  const landscapeW = Math.max(W, H);
  const landscapeH = Math.min(W, H);
  const rotatedStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: landscapeW,
      height: landscapeH,
      top: (H - landscapeH) / 2,
      left: (W - landscapeW) / 2,
      transform: [{ rotate: '90deg' }],
    }),
    [W, H, landscapeW, landscapeH],
  );

  return (
    <View style={themed.root}>
      <StatusBar hidden />
      <View style={rotatedStyle}>
        {graph.nodes.length === 0 ? (
          <View style={themed.center}>
            <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
              No energy-flow diagram configured for this site.
            </AppText>
          </View>
        ) : (
          <SLDViewport
            graph={graph}
            bounds={bounds}
            resolve={resolve}
            width={landscapeW}
            height={landscapeH}
            fullscreen
            rotated
            onClose={() => navigation.goBack()}
            insetLeft={insets.top}
            insetBottom={insets.left}
          />
        )}
      </View>
    </View>
  );
};

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: scheme.bg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default SLDFullscreenScreen;
