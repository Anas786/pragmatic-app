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
 *
 * Safe area: the device insets (notch / Dynamic Island, home indicator,
 * Android status bar / display cutout / nav bar) are reported in PORTRAIT
 * device terms, but the diagram lives in the rotated frame — so they're
 * mapped through the same rotation (`rotateInsets`; for +90° the device top
 * becomes the content's LEFT edge, see its derivation) before the viewport
 * uses them for the initial fit / Grouped⇄Units re-fit, the control column
 * and the mode pill.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import { FONT_SIZE_XS } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import SLDViewport from './SLDViewport';
import { useSldModel } from './useSldModel';
import { rotateInsets, SLD_FULLSCREEN_ROTATION_DEG } from './sldViewportFit';

type SLDFullscreenRouteProp = RouteProp<DashboardStackParamList, 'SLDFullscreen'>;

const SLDFullscreenScreen: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const route = useRoute<SLDFullscreenRouteProp>();
  const { siteId } = route.params;
  // The frame the safe-area insets are measured against (the provider's
  // root view). Sizing the rotated container from it — rather than the
  // window — keeps the mapped insets exact on Android edge-to-edge, where
  // the window metrics can exclude the system bars the root view draws under.
  const { width: W, height: H } = useSafeAreaFrame();
  const { top, right, bottom, left } = useSafeAreaInsets();
  const contentInsets = useMemo(
    () => rotateInsets({ top, right, bottom, left }, SLD_FULLSCREEN_ROTATION_DEG),
    [top, right, bottom, left],
  );

  // Same model (and shared Grouped/Units mode) as the inline diagram.
  const { graph, bounds, resolve, mode, setMode, canGroup } = useSldModel(siteId);
  // Owned here so they survive the keyed Grouped ⇄ Units remount below.
  const [locked, setLocked] = useState(true);
  const [orthogonal, setOrthogonal] = useState(true);

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
      transform: [{ rotate: `${SLD_FULLSCREEN_ROTATION_DEG}deg` }],
    }),
    [W, H, landscapeW, landscapeH],
  );
  const close = useCallback(() => navigation.goBack(), [navigation]);

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
            key={mode}
            graph={graph}
            bounds={bounds}
            resolve={resolve}
            width={landscapeW}
            height={landscapeH}
            fullscreen
            rotated
            onClose={close}
            safeInsets={contentInsets}
            groupMode={canGroup ? mode : undefined}
            onGroupModeChange={setMode}
            locked={locked}
            onLockedChange={setLocked}
            orthogonal={orthogonal}
            onOrthogonalChange={setOrthogonal}
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
