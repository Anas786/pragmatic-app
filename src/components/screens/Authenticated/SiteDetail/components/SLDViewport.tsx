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
 * viewport `width`/`height`, a `fullscreen` flag, the safe-area insets and
 * the hub to centre, and owns everything else (shared values, gestures, the
 * flowing-dash layer — its clock gated by the host's `animate` — fit math,
 * controls). Both hosts are portrait and
 * unrotated: the phone layout is a tall diagram, so the old 90°-rotated
 * landscape fullscreen (and its pan remap) is gone.
 *
 * Overlays: the zoom / routing / fullscreen / lock column (bottom-left)
 * auto-fades after a short idle and ignores taps while hidden; the
 * Grouped ⇄ Units pill (top-right) is ALWAYS visible and tappable, and the
 * initial fit keeps the diagram clear of it (see `computeSldFit`): when the
 * fit reserves a top strip for it, that strip is a band painted over the
 * diagram (`fit.mask`), so no card is ever drawn under the pill.
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
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import { normalizeWidth, resolveNodeRects, SLDBounds, SLDPoint } from 'src/utils';
import { SLDGraph, SLDValueResolver } from 'src/types';
import type { SldViewMode } from 'src/hooks';
import ControlButtons, { SLD_MODE_TOGGLE_BOX, SldModeToggle } from './ControlButtons';
import { DiagramNodeLayer, DiagramSkiaLayer } from './SummaryView/SLDCanvas';
import {
  computeSldFit,
  sldClampTranslate,
  SldInsets,
  sldZoomLimits,
  sldZoomTo,
  SLD_MAX_FIT_SCALE,
  SLD_VIEWPORT_BORDER,
  SLD_ZOOM_STEP,
} from './sldViewportFit';

/** Idle time before the floating controls fade out. */
const HIDE_CONTROLS_DELAY_MS = 2600;
/** Duration of the zoom-button steps and of the settle back into view. */
const ZOOM_ANIM_MS = 200;
const SETTLE_MS = 220;
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
  /** Full-screen styling (fills, no border) + re-fits when its size settles. */
  fullscreen?: boolean;
  /**
   * Point to centre (FRAME coordinates — the layout's hub) when the diagram
   * is taller than the viewport. Defaults to the frame's centre.
   */
  focus?: SLDPoint;
  /** Inline → expand handler (navigates to the full-screen route). */
  onFullscreen?: () => void;
  /** Full-screen → collapse/close handler. */
  onClose?: () => void;
  /**
   * Safe-area insets in THIS viewport's frame (the full-screen route passes
   * the device insets). The initial fit, the controls and the mode pill all
   * stay inside them. Omitted inline (the viewport sits inside the page).
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
  /**
   * Flow-animation gate (UI thread) handed to `DiagramSkiaLayer`: the
   * inline host clears it while the panel is scrolled out of view, so the
   * flowing dashes cost nothing there. Omitted = always on (full screen).
   * Owned by the host, so it survives the keyed Grouped ⇄ Units remount.
   */
  animate?: SharedValue<boolean>;
}

const noop = () => {};

const SLDViewport: FC<SLDViewportProps> = ({
  graph,
  bounds,
  resolve,
  width,
  height,
  fullscreen = false,
  focus,
  onFullscreen,
  onClose,
  safeInsets,
  groupMode,
  onGroupModeChange,
  locked: isLocked,
  onLockedChange,
  orthogonal,
  onOrthogonalChange,
  animate,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  const insetTop = safeInsets?.top ?? 0;
  const insetRight = safeInsets?.right ?? 0;
  const insetBottom = safeInsets?.bottom ?? 0;
  const insetLeft = safeInsets?.left ?? 0;
  const showModeToggle = groupMode !== undefined && onGroupModeChange !== undefined;

  // Fit math. Both hosts open with the diagram's WIDTH filling the safe area
  // (capped at 1 graph unit per point — the phone layout is designed for
  // that size, so cards read without zooming). A diagram that fits is
  // centred; a taller one opens centred on the hub and is panned for the
  // rest. The fit area is the content box (inside the inline border) minus
  // the safe-area insets, and the diagram is kept clear of the persistent
  // mode pill — a top strip is reserved for it when the plain fit would
  // reach under it. The zoom-out floor is the whole-diagram overview.
  //
  // Zoom (buttons AND pinch) pivots on the VIEWPORT centre — the translation
  // scales with the zoom — and whenever the view comes to rest (a button
  // step, the last pan / pinch letting go) the translation is clamped to the
  // fit area (`sldClampTranslate`): a diagram smaller than the area stays
  // inside it, a larger one covers it. The hub-focused fit starts off the
  // frame centre, so a frame-centre pivot would push the diagram out of the
  // panel — and the inline panel opens locked, where +/- are the only zoom.
  const border = fullscreen ? 0 : SLD_VIEWPORT_BORDER;
  const viewW = width - 2 * border;
  const viewH = height - 2 * border;
  const contentW = bounds.width;
  const contentH = bounds.height;
  const focusY = focus?.y;
  // The card rects the node layer draws (structure-only: graph + bounds),
  // so the fit can open with the mask band's edge between card rows.
  const cardRects = useMemo(
    () => Array.from(resolveNodeRects(graph, bounds).values()),
    [graph, bounds],
  );
  const {
    minScale,
    maxScale,
    initialScale,
    focusTx,
    focusTy,
    areaTop,
    areaRight,
    areaBottom,
    areaLeft,
    maskHeight,
  } = useMemo(() => {
    const fit = computeSldFit({
      viewWidth: viewW,
      viewHeight: viewH,
      contentWidth: contentW,
      contentHeight: contentH,
      insets: { top: insetTop, right: insetRight, bottom: insetBottom, left: insetLeft },
      overlay: showModeToggle ? SLD_MODE_TOGGLE_BOX : undefined,
      maxScale: SLD_MAX_FIT_SCALE,
      focusY,
      cards: cardRects,
    });
    const { min, max } = sldZoomLimits(fit);
    return {
      minScale: min,
      maxScale: max,
      initialScale: clamp(fit.scale, min, max),
      focusTx: fit.translateX,
      focusTy: fit.translateY,
      // Plain numbers (not an object) so the gesture worklets capture them.
      areaTop: fit.insets.top,
      areaRight: fit.insets.right,
      areaBottom: fit.insets.bottom,
      areaLeft: fit.insets.left,
      maskHeight: fit.mask,
    };
  }, [
    contentW,
    contentH,
    viewW,
    viewH,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    showModeToggle,
    focusY,
    cardRects,
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
  // The live pan drag (0 when no pan is active) — the pinch adds it to the
  // zoom-scaled translation, the pan adds the live zoom ratio to it.
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  // True while a pan / pinch is ACTIVE (onStart → onEnd): the last one to
  // end settles the view into the fit area.
  const panning = useSharedValue(false);
  const pinching = useSharedValue(false);
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
  // shared values already hold, i.e. a no-op. Inline never re-fits: its size
  // only changes with the Grouped/Units mode, which remounts this viewport,
  // and it has no insets. Safe here: main surface, not a Modal.
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
    // Pan + pinch run simultaneously and BOTH write the translation with
    // one formula, so they never fight:
    //   translate = saved · (scale / savedScale) + live pan drag
    // i.e. the pinch zooms about the viewport centre and the pan adds its
    // drag on top. Each folds its part into `saved*` in onEnd (onEnd only
    // follows an ACTIVE gesture, so a plain tap never touches them).
    //
    // Once the last of them ends, rest the view inside the fit area — at
    // the saved (resting) scale. Worklet: only shared values, captured
    // numbers and worklet helpers (`sldClampTranslate`, `withTiming`).
    const settle = () => {
      'worklet';
      const s = savedScale.value;
      const tx = sldClampTranslate(savedTX.value, s, viewW, contentW, areaLeft, areaRight);
      const ty = sldClampTranslate(savedTY.value, s, viewH, contentH, areaTop, areaBottom);
      savedTX.value = tx;
      savedTY.value = ty;
      translateX.value = withTiming(tx, { duration: SETTLE_MS });
      translateY.value = withTiming(ty, { duration: SETTLE_MS });
    };

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => runOnJS(showControls)());

    const pan = Gesture.Pan()
      .enabled(!isLocked)
      .onBegin(() => {
        runOnJS(onGestureBegin)();
        runOnJS(revealControls)();
      })
      .onStart(() => {
        panning.value = true;
      })
      .onUpdate(e => {
        const ratio = scale.value / savedScale.value;
        panX.value = e.translationX;
        panY.value = e.translationY;
        translateX.value = savedTX.value * ratio + e.translationX;
        translateY.value = savedTY.value * ratio + e.translationY;
      })
      .onEnd(() => {
        const ratio = scale.value / savedScale.value;
        savedTX.value = translateX.value / ratio;
        savedTY.value = translateY.value / ratio;
        panX.value = 0;
        panY.value = 0;
        panning.value = false;
        if (!pinching.value) settle();
      })
      .onFinalize(() => runOnJS(onGestureFinalize)());

    const pinch = Gesture.Pinch()
      .enabled(!isLocked)
      .onBegin(() => {
        pinchActive.value = true;
        runOnJS(onGestureBegin)();
      })
      .onStart(() => {
        pinching.value = true;
      })
      .onUpdate(e => {
        const s = clamp(savedScale.value * e.scale, minScale, maxScale);
        const ratio = s / savedScale.value;
        scale.value = s;
        translateX.value = savedTX.value * ratio + panX.value;
        translateY.value = savedTY.value * ratio + panY.value;
      })
      .onEnd(() => {
        const ratio = scale.value / savedScale.value;
        savedTX.value = savedTX.value * ratio;
        savedTY.value = savedTY.value * ratio;
        savedScale.value = scale.value;
        pinching.value = false;
        if (!panning.value) settle();
      })
      // onFinalize (not onEnd) so cancelled/failed gestures also release the
      // mirror guard. Syncs the zoom state to JS exactly once per pinch.
      .onFinalize(() => {
        pinchActive.value = false;
        runOnJS(setCurrentZoom)(scale.value);
        runOnJS(onGestureFinalize)();
      });

    return Gesture.Simultaneous(pinch, pan, tap);
  }, [
    isLocked,
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
    panX,
    panY,
    panning,
    pinching,
    pinchActive,
    minScale,
    maxScale,
    viewW,
    viewH,
    contentW,
    contentH,
    areaTop,
    areaRight,
    areaBottom,
    areaLeft,
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

  // +/- buttons (JS thread): zoom about the viewport centre, clamped to the
  // fit area (`sldZoomTo`). Scale and translation share one duration and
  // timing curve, so (unclamped) every frame of the step stays
  // centre-pivoted: both move by the same fraction of their change.
  const zoomBy = useCallback(
    (factor: number) => {
      const from = {
        scale: savedScale.value,
        translateX: savedTX.value,
        translateY: savedTY.value,
      };
      const next = sldZoomTo(
        {
          viewWidth: viewW,
          viewHeight: viewH,
          contentWidth: contentW,
          contentHeight: contentH,
          insets: { top: areaTop, right: areaRight, bottom: areaBottom, left: areaLeft },
        },
        from,
        clamp(from.scale * factor, minScale, maxScale),
      );
      savedScale.value = next.scale;
      savedTX.value = next.translateX;
      savedTY.value = next.translateY;
      scale.value = withTiming(next.scale, { duration: ZOOM_ANIM_MS });
      translateX.value = withTiming(next.translateX, { duration: ZOOM_ANIM_MS });
      translateY.value = withTiming(next.translateY, { duration: ZOOM_ANIM_MS });
    },
    [
      scale,
      savedScale,
      translateX,
      translateY,
      savedTX,
      savedTY,
      minScale,
      maxScale,
      viewW,
      viewH,
      contentW,
      contentH,
      areaTop,
      areaRight,
      areaBottom,
      areaLeft,
    ],
  );

  const handleZoomIn = useCallback(() => zoomBy(SLD_ZOOM_STEP), [zoomBy]);
  const handleZoomOut = useCallback(() => zoomBy(1 / SLD_ZOOM_STEP), [zoomBy]);

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

  // The band reserved under the pill (`fit.mask`): it hides whatever the
  // diagram puts there — the upper rows of a diagram taller than the view
  // at open, anything panned / zoomed up later. 0 when no strip is reserved.
  const maskStyle = useMemo(
    () => [themed.mask, fullscreen && styles.maskSquare, { height: maskHeight }],
    [themed.mask, fullscreen, maskHeight],
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
          animate={animate}
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
        {/* Static, non-interactive (touches fall through to the gestures). */}
        {maskHeight > 0 ? <View pointerEvents="none" style={maskStyle} /> : null}
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
  maskSquare: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
      borderWidth: SLD_VIEWPORT_BORDER,
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
    // Same fill as the canvas (`viewport`), so the band reads as the panel's
    // header strip; a hairline marks where the diagram slides under it.
    mask: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: scheme.isDark ? scheme.surfaceRaised : scheme.surfaceMuted,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: scheme.border,
      borderTopLeftRadius: VIEWPORT_RADIUS - 1,
      borderTopRightRadius: VIEWPORT_RADIUS - 1,
    },
  });

export default SLDViewport;
