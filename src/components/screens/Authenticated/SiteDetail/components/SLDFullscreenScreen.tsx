/**
 * SLDFullscreenScreen — the energy-flow diagram, full screen, PORTRAIT.
 *
 * The diagram is the phone layout (src/utils/sldPhoneLayout.ts): a tall,
 * 2-column diagram, so full screen simply gives it the whole screen —
 * width-filling, centred on the plant, pannable / zoomable. No rotation of
 * any kind: every past fullscreen crash traced back to either a core
 * `<Modal>` surface or a device rotation re-layout colliding with
 * Reanimated's Fabric commit/mount hooks, and this screen uses neither:
 *   - it's a navigation screen (main React surface, not a Modal surface), and
 *   - it never triggers an OS orientation change (nor rotates by transform —
 *     the old landscape-by-transform mode and its pan remap are gone).
 *
 * Safe area: the device insets (notch / Dynamic Island, home indicator,
 * Android status bar / display cutout / nav bar) go straight to the
 * viewport, which keeps the initial fit, the control column and the
 * Grouped ⇄ Units pill inside them.
 */

import React, { FC, useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { ErrorBoundary, IconButton } from 'src/components/common';
import { Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { ICON_SIZE_MD } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import { Close } from 'src/assets/icons';
import SLDViewport from './SLDViewport';
import { SLDEmptyState } from './SLDDiagram';
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

  // Same model (and shared Grouped/Units mode) as the inline diagram.
  const { graph, bounds, focus, resolve, mode, setMode, canGroup } =
    useSldModel(siteId);
  // Owned here so they survive the keyed Grouped ⇄ Units remount below.
  // Opens UNLOCKED: unlike the inline panel there is no page scroll to
  // protect here, and a diagram taller than the screen needs panning.
  const [locked, setLocked] = useState(false);
  const [orthogonal, setOrthogonal] = useState(true);

  const close = useCallback(() => navigation.goBack(), [navigation]);
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

  return (
    <View style={themed.root}>
      <StatusBar hidden />
      {graph.nodes.length === 0 ? (
        <View style={themed.center}>
          <SLDEmptyState onClose={close} />
        </View>
      ) : (
        <View style={styles.fill}>
          <ErrorBoundary label="Energy-flow diagram" resetKey={siteId}>
            <ViewportMountProbe onMountedChange={setViewportMounted} />
            <SLDViewport
              key={mode}
              graph={graph}
              bounds={bounds}
              resolve={resolve}
              width={W}
              height={H}
              fullscreen
              focus={focus}
              onClose={close}
              safeInsets={safeInsets}
              groupMode={canGroup ? mode : undefined}
              onGroupModeChange={setMode}
              locked={locked}
              onLockedChange={setLocked}
              orthogonal={orthogonal}
              onOrthogonalChange={setOrthogonal}
            />
          </ErrorBoundary>
        </View>
      )}
      {graph.nodes.length > 0 && !viewportMounted ? (
        <IconButton
          variant="soft"
          onPress={close}
          accessibilityLabel="Close"
          style={closeButtonStyle}>
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
  });

export default SLDFullscreenScreen;
