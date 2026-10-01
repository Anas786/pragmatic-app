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
 * viewport `width`/`height`, a `fullscreen` flag and the safe-area insets in
 * its own frame, and owns everything else (shared values, gestures, the
 * flowing-dash loop, fit math, controls).
 *
 * Overlays: the zoom / routing / fullscreen / lock column (bottom-left)
 * auto-fades after a short idle and ignores taps while hidden; the
 * Grouped ⇄ Units pill (top-right) is ALWAYS visible and tappable, and the
 * initial fit keeps the diagram clear of it (see `computeSldFit`).
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
import { normalizeWidth, SLDBounds } from 'src/utils';
import { SLDGraph, SLDValueResolver } from 'src/types';
import type { SldViewMode } from 'src/hooks';
import ControlButtons, { SLD_MODE_TOGGLE_BOX, SldModeToggle } from './ControlButtons';
import { DiagramNodeLayer, DiagramSkiaLayer } from './SummaryView/SLDCanvas';
import { computeSldFit, SldInsets } from './sldViewportFit';

const ZOOM_STEP = 1.25;
/** Idle time before the floating controls fade out. */
const HIDE_CONTROLS_DELAY_MS = 2600;
/** Corner radius of the inline viewport — shared by the border, the node
 *  clipping wrapper, and the Skia clip so all three stay in register. */
const VIEWPORT_RADIUS = normalizeWidth(16);

// `'worklet'` so the pinch gesture's onUpdate (which runs on the UI thread)
// can call this. Without the directive it lives only on the JS thread, and
// the pinch worklet crashes with "Tried to synchronously call a non-worklet
// function `clamp` on the UI thread." The directive is harmless for the
// JS-thread callers (fit math, +/- zoom buttons) — they call it normally.
const clamp = (v: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(v, min), max);
};

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
  /**
   * Safe-area insets in THIS viewport's frame (the full-screen route passes
   * the device insets mapped through its rotation — `rotateInsets`). The
   * initial fit, the controls and the mode pill all stay inside them.
   * Omitted inline (the inline viewport sits inside the scrolled page).
   */
  safeInsets?: SldInsets;
  /**
   * Grouped / Units toggle state. Omit to hide the toggle (e.g. when no
   * energy type has ≥2 units, so grouping would change nothing). The parent
   * owns the mode and remounts this viewport (keyed by mode) to re-fit.
   */
  groupMode?: SldViewMode;
  onGroupModeChange?: (mode: SldViewMode) => void;
  /**
   * Pan lock + orthogonal routing are OWNED BY THE HOST: the host remounts
   * this viewport on every Grouped ⇄ Units switch (to re-fit), and the
   * user's lock / routing choices must survive that remount.
   */
  locked: boolean;
  onLockedChange: (locked: boolean) => void;
  orthogonal: boolean;
  onOrthogonalChange: (orthogonal: boolean) => void;
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
  safeInsets,
  groupMode,
  onGroupModeChange,
  locked: isLocked,
  onLockedChange,
  orthogonal,
  onOrthogonalChange,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  const insetTop = safeInsets?.top ?? 0;
  const insetRight = safeInsets?.right ?? 0;
  const insetBottom = safeInsets?.bottom ?? 0;
  const insetLeft = safeInsets?.left ?? 0;
  const showModeToggle = groupMode !== undefined && onGroupModeChange !== undefined;

  // Fit math. Both inline and full-screen open fitted to the WHOLE diagram,
  // centred — a complete, tidy first view (no half-cut cards at the edges);
  // users pinch in for card-level detail. Zooming into the plant node by
  // default read as broken to customers. The fit area is the safe area (so
  // nothing opens under a notch / Dynamic Island / nav bar), and the diagram
  // is kept clear of the persistent mode pill — re-fitted with a strip
  // reserved for it only when the plain fit would reach under it.
  const { minScale, maxScale, initialScale, focusTx, focusTy } =
    useMemo(() => {
      const fit = computeSldFit({
        viewWidth: width,
        viewHeight: height,
        contentWidth: bounds.width,
        contentHeight: bounds.height,
        insets: { top: insetTop, right: insetRight, bottom: insetBottom, left: insetLeft },
        overlay: showModeToggle ? SLD_MODE_TOGGLE_BOX : undefined,
      });
      const min = fit.scale * 0.9;
      const max = Math.max(fit.scale * 8, 1.3);
      return {
        minScale: min,
        maxScale: max,
        initialScale: clamp(fit.scale, min, max),
        focusTx: fit.translateX,
        focusTy: fit.translateY,
      };
    }, [
      bounds.width,
      bounds.height,
      width,
      height,
      insetTop,
      insetRight,
      insetBottom,
      insetLeft,
      showModeToggle,
    ]);

  // Lock (`isLocked`) + routing (`orthogonal`) come from the host (see
  // props) — hosts default both to true: the diagram opens as a tidy, fixed
  // schematic; unlock to pan/pinch, toggle routing for curved edges. The +/-
  // zoom buttons still work while locked (only gestures are gated), and the
  // tap-to-show-controls gesture stays live.
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
  // JS-side count of in-flight pan/pinch gestures (mutated only via runOnJS
  // callbacks, never from a worklet). A COUNTER, not a boolean: pinch + pan
  // are Gesture.Simultaneous, so a boolean cleared by either onFinalize
  // would re-arm the hide timer while the other gesture is still updating.
  const activeGestureCount = useRef(0);
  // Set when a reveal happened mid-gesture — the setControlsShown(true)
  // commit is deferred to the last gesture's onFinalize.
  const pendingControlsShow = useRef(false);

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

  // Re-fit when the full-screen fit changes after mount — the viewport size
  // or the safe-area insets settling (e.g. Android dropping the status-bar
  // inset once the route hides it). On mount it animates to the values the
  // shared values already hold, i.e. a no-op. Inline never re-fits (VW/VH
  // are constant, no insets). Safe here: main surface, not a Modal.
  useEffect(() => {
    if (!fullscreen) return;
    translateX.value = withTiming(focusTx, { duration: 250 });
    translateY.value = withTiming(focusTy, { duration: 250 });
    scale.value = withTiming(initialScale, { duration: 250 });
    savedTX.value = focusTx;
    savedTY.value = focusTy;
    savedScale.value = initialScale;
  }, [
    fullscreen,
    focusTx,
    focusTy,
    initialScale,
    translateX,
    translateY,
    scale,
    savedTX,
    savedTY,
    savedScale,
  ]);

  const cancelHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Fade + commit the controls away — but NEVER while a gesture is actively
  // driving the shared values: setControlsShown flips the overlay's
  // pointerEvents prop, and a React/Fabric commit landing mid-gesture races
  // the UI thread's Skia/transform updates (same race the pinch mirror guard
  // above exists for). If a gesture is in flight, push the deadline back.
  const hideControls = useCallback(
    function hide() {
      if (activeGestureCount.current > 0) {
        hideTimer.current = setTimeout(hide, HIDE_CONTROLS_DELAY_MS);
        return;
      }
      controlsOpacity.value = withTiming(0, { duration: 350 });
      setControlsShown(false);
    },
    [controlsOpacity],
  );

  const armHideTimer = useCallback(() => {
    cancelHideTimer();
    hideTimer.current = setTimeout(hideControls, HIDE_CONTROLS_DELAY_MS);
  }, [cancelHideTimer, hideControls]);

  // Reveal the controls. The opacity ramp is a pure UI-thread animation and
  // is always safe mid-gesture; the setControlsShown(true) COMMIT is
  // deferred to gesture end while a pan/pinch is active (the user can't tap
  // the controls mid-gesture anyway).
  const revealControls = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 180 });
    if (activeGestureCount.current > 0) {
      pendingControlsShow.current = true;
      return;
    }
    setControlsShown(true);
  }, [controlsOpacity]);

  const showControls = useCallback(() => {
    revealControls();
    // While a gesture is in flight the timer is armed by its onFinalize —
    // arming here would let it fire mid-gesture.
    if (activeGestureCount.current === 0) armHideTimer();
  }, [revealControls, armHideTimer]);

  // Gesture bookkeeping, called via runOnJS (timers + refs live on JS).
  // Clear the hide timer the moment a gesture starts; re-arm it only when
  // the LAST simultaneous gesture finalizes, so the auto-hide commit can
  // never land while onUpdate is writing shared values every frame.
  const onGestureBegin = useCallback(() => {
    activeGestureCount.current += 1;
    cancelHideTimer();
  }, [cancelHideTimer]);

  const onGestureFinalize = useCallback(() => {
    activeGestureCount.current = Math.max(0, activeGestureCount.current - 1);
    if (activeGestureCount.current === 0) {
      if (pendingControlsShow.current) {
        pendingControlsShow.current = false;
        setControlsShown(true);
      }
      armHideTimer();
    }
  }, [armHideTimer]);

  // Show briefly on mount (so the controls are discoverable), then fade.
  useEffect(() => {
    showControls();
    return cancelHideTimer;
  }, [showControls, cancelHideTimer]);

  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => runOnJS(showControls)());

    const pan = Gesture.Pan()
      .enabled(!isLocked)
      .onBegin(() => {
        runOnJS(onGestureBegin)();
        runOnJS(revealControls)();
      })
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
      })
      .onFinalize(() => runOnJS(onGestureFinalize)());

    const pinch = Gesture.Pinch()
      .enabled(!isLocked)
      .onBegin(() => {
        pinchActive.value = true;
        runOnJS(onGestureBegin)();
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
        runOnJS(onGestureFinalize)();
      });

    return Gesture.Simultaneous(pinch, pan, tap);
  }, [
    isLocked,
    rotated,
    showControls,
    revealControls,
    onGestureBegin,
    onGestureFinalize,
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

  const handleToggleRouting = useCallback(
    () => onOrthogonalChange(!orthogonal),
    [onOrthogonalChange, orthogonal],
  );

  const handleToggleLock = useCallback(
    () => onLockedChange(!isLocked),
    [onLockedChange, isLocked],
  );

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

  // Top-right of the safe area — exactly where SLD_MODE_TOGGLE_BOX tells the
  // fit math the pill sits.
  const modeToggleAnchorStyle = useMemo(
    () => [
      styles.modeToggleAnchor,
      {
        top: insetTop + SLD_MODE_TOGGLE_BOX.edge,
        right: insetRight + SLD_MODE_TOGGLE_BOX.edge,
      },
    ],
    [insetTop, insetRight],
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
          clipRadius={fullscreen ? 0 : VIEWPORT_RADIUS - 1}
        />
        {/* Explicit clipping wrapper: the viewport's own overflow:'hidden'
            doesn't reliably clip the Reanimated-transformed frame on every
            platform — cards were bleeding over the rounded border. */}
        <View
          pointerEvents="box-none"
          style={[themed.nodeClip, fullscreen && styles.clipSquare]}>
          <Animated.View style={nodeFrameStyle}>
            <DiagramNodeLayer graph={graph} bounds={bounds} resolve={resolve} />
          </Animated.View>
        </View>
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
        {/* Grouped ⇄ Units: OUTSIDE the fading overlay — always visible and
            tappable, so Units mode stays discoverable. Plain View, no
            animated props. */}
        {showModeToggle ? (
          <View pointerEvents="box-none" style={modeToggleAnchorStyle}>
            <SldModeToggle mode={groupMode} onChange={onGroupModeChange} />
          </View>
        ) : null}
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
  clipSquare: {
    borderRadius: 0,
  },
  modeToggleAnchor: {
    position: 'absolute',
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
      borderRadius: VIEWPORT_RADIUS,
    },
    nodeClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
      borderRadius: VIEWPORT_RADIUS - 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default SLDViewport;
