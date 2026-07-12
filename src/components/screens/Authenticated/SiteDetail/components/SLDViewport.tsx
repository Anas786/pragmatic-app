/**
 * SLDViewport — the pan / pinch / zoom surface that hosts the energy-flow
 * diagram layers (`DiagramSkiaLayer` + `DiagramNodeLayer`). Shared by the
 * inline diagram (`SLDDiagram`) and the full-screen route
 * (`SLDFullscreenScreen`).
 *
 * The Skia layer absolute-fills the viewport and replays the pan/zoom shared
 * values as a canvas matrix; the RN node cards live in a graph-bounds-sized
 * `Animated.View` driven by the same shared values, so both layers move in
 * lockstep on the UI thread.
 *
 * Deliberately framework-agnostic about *where* it lives: it takes the
 * viewport `width`/`height` and a `fullscreen` flag and owns everything else
 * (shared values, gestures, the flowing-dash loop, fit math, controls).
 *
 * IMPORTANT: this must never be rendered inside a core React Native `<Modal>`.
 * A Modal is a separate Fabric surface, and Reanimated's commit/mount hooks
 * crash (ShadowTree commit assertion) when they try to apply the animated
 * pan/zoom transform across that surface boundary. Full-screen is a
 * navigation screen instead, which stays in the main surface.
 */

import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import {
  isLogoNode,
  nodeRectInBounds,
  normalizeWidth,
  SLDBounds,
} from 'src/utils';
import { SLDGraph, SLDValueResolver } from 'src/types';
import ControlButtons from './ControlButtons';
import { DiagramNodeLayer, DiagramSkiaLayer } from './SummaryView/SLDCanvas';

const ZOOM_STEP = 1.25;
/** On-screen scale at which a source card is comfortably readable. */
const READABLE_SCALE = 0.58;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

interface SLDViewportProps {
  graph: SLDGraph;
  bounds: SLDBounds;
  resolve: SLDValueResolver;
  /** Viewport width in points. */
  width: number;
  /** Viewport height in points. */
  height: number;
  /** Full-screen styling (fills, no border) + opens fit-to-screen. */
  fullscreen?: boolean;
  /**
   * The viewport is hosted inside a parent rotated 90° (landscape via
   * transform, not OS rotation). Pan deltas are reported in screen space, so
   * they're remapped into the rotated frame to track the finger.
   */
  rotated?: boolean;
  /** Inline → expand handler (navigates to the full-screen route). */
  onFullscreen?: () => void;
  /** Full-screen → collapse/close handler. */
  onClose?: () => void;
  insetLeft?: number;
  insetBottom?: number;
}

const noop = () => {};

const SLDViewport: FC<SLDViewportProps> = ({
  graph,
  bounds,
  resolve,
  width,
  height,
  fullscreen = false,
  rotated = false,
  onFullscreen,
  onClose,
  insetLeft,
  insetBottom,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  // Fit + focus math. Inline opens at a readable zoom centred on the logo
  // node; full-screen opens fit-to-viewport, centred.
  const { minScale, maxScale, initialScale, focusTx, focusTy } =
    useMemo(() => {
      const fit = Math.min(width / bounds.width, height / bounds.height);
      const min = fit * 0.9;
      const max = Math.max(fit * 8, 1.3);
      const init = clamp(fullscreen ? fit : READABLE_SCALE, min, max);

      let tx = 0;
      let ty = 0;
      if (!fullscreen) {
        const logo = graph.nodes.find(isLogoNode);
        if (logo) {
          const r = nodeRectInBounds(logo, bounds);
          tx = -(r.x + r.w / 2 - bounds.width / 2) * init;
          ty = -(r.y + r.h / 2 - bounds.height / 2) * init;
        }
      }
      return {
        minScale: min,
        maxScale: max,
        initialScale: init,
        focusTx: tx,
        focusTy: ty,
      };
    }, [graph, bounds, width, height, fullscreen]);

  const [isLocked, setIsLocked] = useState(false);
  const [orthogonal, setOrthogonal] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(initialScale);
  // Auto-hiding controls: visible on tap, fade out after a short idle.
  const [controlsShown, setControlsShown] = useState(true);

  const translateX = useSharedValue(focusTx);
  const translateY = useSharedValue(focusTy);
  const scale = useSharedValue(initialScale);
  const savedTX = useSharedValue(focusTx);
  const savedTY = useSharedValue(focusTy);
  const savedScale = useSharedValue(initialScale);
  const controlsOpacity = useSharedValue(1);
  const pinchActive = useSharedValue(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `currentZoom` only feeds ControlButtons' +/- disabled checks against
  // min/max. Mirroring every pinch frame through runOnJS/setState flooded JS
  // with re-renders, so only cross the bridge when the scale moves between
  // the min-edge / middle / max-edge zones — the only transitions that can
  // change what ControlButtons renders. Thresholds match ControlButtons'
  // (±0.001), so the disabled states still flip at exactly the same scale.
  //
  // NEVER while a pinch is active: pinching to the stops crosses zones
  // repeatedly, and a React commit landing mid-gesture races the UI thread's
  // Skia/transform updates. The pinch's onFinalize syncs the state once
  // when the fingers lift instead.
  useAnimatedReaction(
    () => scale.value,
    (value, prev) => {
      if (pinchActive.value) return;
      const zone =
        value >= maxScale - 0.001 ? 2 : value <= minScale + 0.001 ? 0 : 1;
      const prevZone =
        prev === null
          ? -1
          : prev >= maxScale - 0.001
            ? 2
            : prev <= minScale + 0.001
              ? 0
              : 1;
      if (zone !== prevZone) {
        runOnJS(setCurrentZoom)(value);
      }
    },
    [minScale, maxScale],
  );

  // Re-fit when the full-screen viewport size changes (e.g. the device
  // rotates to landscape after the route mounts). No-op inline (VW/VH are
  // constant). Safe here because we're in the main surface, not a Modal.
  useEffect(() => {
    if (!fullscreen) return;
    const fit = clamp(
      Math.min(width / bounds.width, height / bounds.height),
      minScale,
      maxScale,
    );
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(fit, { duration: 250 });
    savedTX.value = 0;
    savedTY.value = 0;
    savedScale.value = fit;
  }, [
    fullscreen,
    width,
    height,
    bounds.width,
    bounds.height,
    minScale,
    maxScale,
    translateX,
    translateY,
    scale,
    savedTX,
    savedTY,
    savedScale,
  ]);

  const hideControls = useCallback(() => {
    controlsOpacity.value = withTiming(0, { duration: 350 });
    setControlsShown(false);
  }, [controlsOpacity]);

  const showControls = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 180 });
    setControlsShown(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideControls, 2600);
  }, [controlsOpacity, hideControls]);

  // Show briefly on mount (so the controls are discoverable), then fade.
  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => runOnJS(showControls)());

    const pan = Gesture.Pan()
      .enabled(!isLocked)
      .onBegin(() => runOnJS(showControls)())
      .onUpdate(e => {
        if (rotated) {
          // Parent is rotated 90° clockwise → remap screen-space deltas into
          // the rotated frame so content tracks the finger.
          translateX.value = savedTX.value + e.translationY;
          translateY.value = savedTY.value - e.translationX;
        } else {
          translateX.value = savedTX.value + e.translationX;
          translateY.value = savedTY.value + e.translationY;
        }
      })
      .onEnd(() => {
        savedTX.value = translateX.value;
        savedTY.value = translateY.value;
      });

    const pinch = Gesture.Pinch()
      .enabled(!isLocked)
      .onBegin(() => {
        pinchActive.value = true;
      })
      .onUpdate(e => {
        scale.value = clamp(savedScale.value * e.scale, minScale, maxScale);
      })
      // onFinalize (not onEnd) so cancelled/failed gestures also release the
      // mirror guard. Syncs the zoom state to JS exactly once per pinch.
      .onFinalize(() => {
        pinchActive.value = false;
        savedScale.value = scale.value;
        runOnJS(setCurrentZoom)(scale.value);
      });

    return Gesture.Simultaneous(pinch, pan, tap);
  }, [
    isLocked,
    rotated,
    showControls,
    translateX,
    translateY,
    savedTX,
    savedTY,
    scale,
    savedScale,
    pinchActive,
    minScale,
    maxScale,
  ]);

  // Pan/zoom transform for the RN node-card layer. The Skia layer replays
  // the same shared values as a canvas matrix (see DiagramSkiaLayer), so the
  // two layers stay registered without any extra JS work.
  const panZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const handleZoomIn = useCallback(() => {
    const ns = clamp(savedScale.value * ZOOM_STEP, minScale, maxScale);
    savedScale.value = ns;
    scale.value = withTiming(ns, { duration: 200 });
  }, [scale, savedScale, minScale, maxScale]);

  const handleZoomOut = useCallback(() => {
    const ns = clamp(savedScale.value / ZOOM_STEP, minScale, maxScale);
    savedScale.value = ns;
    scale.value = withTiming(ns, { duration: 200 });
  }, [scale, savedScale, minScale, maxScale]);

  const handleToggleRouting = useCallback(() => setOrthogonal(o => !o), []);

  const handleToggleLock = useCallback(() => setIsLocked(l => !l), []);

  const viewportStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.viewport,
        styles.center,
        fullscreen ? styles.fill : { width, height },
      ]),
    [themed.viewport, fullscreen, width, height],
  );

  // Bounds-sized frame hosting the node cards — centre-laid-out in the
  // viewport with a centre-origin transform, the exact chain the Skia layer
  // mirrors in graph space.
  const nodeFrameStyle = useMemo(
    () => [{ width: bounds.width, height: bounds.height }, panZoomStyle],
    [panZoomStyle, bounds.width, bounds.height],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={viewportStyle}>
        <DiagramSkiaLayer
          graph={graph}
          bounds={bounds}
          resolve={resolve}
          dotColor={scheme.brand}
          orthogonal={orthogonal}
          isDark={scheme.isDark}
          translateX={translateX}
          translateY={translateY}
          scale={scale}
        />
        <Animated.View style={nodeFrameStyle}>
          <DiagramNodeLayer graph={graph} bounds={bounds} resolve={resolve} />
        </Animated.View>
        <Animated.View
          pointerEvents={controlsShown ? 'box-none' : 'none'}
          style={[StyleSheet.absoluteFill, controlsStyle]}>
          <ControlButtons
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleRouting={handleToggleRouting}
            routingOrthogonal={orthogonal}
            onToggleLock={handleToggleLock}
            onFullscreen={fullscreen ? onClose ?? noop : onFullscreen ?? noop}
            isLocked={isLocked}
            currentZoom={currentZoom}
            minZoom={minScale}
            maxZoom={maxScale}
            insetLeft={insetLeft}
            insetBottom={insetBottom}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    viewport: {
      overflow: 'hidden',
      // Light mode: a soft grey canvas so the (white) node cards, dots and
      // lines have something to read against — white-on-white was invisible.
      // Dark mode keeps the raised surface, which already has good contrast.
      backgroundColor: scheme.isDark ? scheme.surfaceRaised : scheme.surfaceMuted,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: normalizeWidth(16),
    },
  });

export default SLDViewport;
