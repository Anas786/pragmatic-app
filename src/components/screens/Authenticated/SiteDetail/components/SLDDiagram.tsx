import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Modal,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Orientation from 'react-native-orientation-locker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useScheme, useThemedStyles, Scheme } from 'src/theme';
import {
  getGraphBounds,
  isLogoNode,
  makeMapResolver,
  nodeRectInBounds,
  normalizeHeight,
  normalizeWidth,
} from 'src/utils';
import { sldGraphMock, sldMockValues } from 'src/data/mock';
import ControlButtons from './ControlButtons';
import { DiagramCanvas } from './SummaryView/SLDCanvas';

/* ─────────── viewport dimensions (normal mode) ─────────── */

const { width: SW } = Dimensions.get('window');
const VW = SW - normalizeWidth(24);
const VH = normalizeHeight(480);

/* ─────────── zoom limits ─────────── */

const ZOOM_STEP = 1.25;
/** On-screen scale at which a source card is comfortably readable. */
const READABLE_SCALE = 0.58;

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

/* ─────────── static styles ─────────── */

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  fullscreenRoot: {
    flex: 1,
  },
  fullscreenViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    borderWidth: 0,
  },
  fullscreenWrap: {
    flex: 1,
  },
  viewportCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const createSLDStyles = (scheme: Scheme) =>
  StyleSheet.create({
    viewport: {
      overflow: 'hidden',
      backgroundColor: scheme.surfaceRaised,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: normalizeWidth(16),
    },
    fullscreenWrapBg: {
      flex: 1,
      backgroundColor: scheme.isDark ? '#000000' : '#FFFFFF',
    },
  });

/* ─────────── styled primitives ─────────── */

const Container: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.container}>{children}</View>
);
Container.displayName = 'Container';

const FullscreenRoot: FC<{ children?: ReactNode }> = ({ children }) => (
  <GestureHandlerRootView style={styles.fullscreenRoot}>
    {children}
  </GestureHandlerRootView>
);
FullscreenRoot.displayName = 'FullscreenRoot';

interface ViewportProps {
  viewportStyle: object;
  children?: ReactNode;
}

const Viewport: FC<ViewportProps> = ({ viewportStyle, children }) => (
  <View style={viewportStyle}>{children}</View>
);
Viewport.displayName = 'Viewport';

const CanvasFrame: FC<{ style?: object; children?: ReactNode }> = ({
  children,
  style,
}) => <Animated.View style={style}>{children}</Animated.View>;
CanvasFrame.displayName = 'CanvasFrame';

/* ─────────── SLDDiagram ─────────── */

const SLDDiagram: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createSLDStyles);
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Mock for now — swap `makeMapResolver(sldMockValues)` for
  // `makeLiveResolver(liveData)` and `sldGraphMock` for the API payload.
  const graph = sldGraphMock;
  const resolve = useMemo(() => makeMapResolver(sldMockValues), []);
  const bounds = useMemo(() => getGraphBounds(graph), [graph]);

  // Scale that fits the whole graph into the viewport, and the offset that
  // re-centres the logo node when we open at a readable zoom.
  const { fitScale, minScale, maxScale, initialScale, focusTx, focusTy } =
    useMemo(() => {
      const fit = Math.min(VW / bounds.width, VH / bounds.height);
      const min = fit * 0.9;
      const max = Math.max(fit * 8, 1.3);
      const init = clamp(READABLE_SCALE, min, max);

      const logo = graph.nodes.find(isLogoNode);
      let tx = 0;
      let ty = 0;
      if (logo) {
        const r = nodeRectInBounds(logo, bounds);
        const offX = r.x + r.w / 2 - bounds.width / 2;
        const offY = r.y + r.h / 2 - bounds.height / 2;
        tx = -offX * init;
        ty = -offY * init;
      }
      return {
        fitScale: fit,
        minScale: min,
        maxScale: max,
        initialScale: init,
        focusTx: tx,
        focusTy: ty,
      };
    }, [graph, bounds]);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(initialScale);

  const translateX = useSharedValue(focusTx);
  const translateY = useSharedValue(focusTy);
  const scale = useSharedValue(initialScale);
  const savedTX = useSharedValue(focusTx);
  const savedTY = useSharedValue(focusTy);
  const savedScale = useSharedValue(initialScale);

  useAnimatedReaction(
    () => scale.value,
    (value, prev) => {
      // Only bump React state on meaningful changes — a live pinch fires this
      // ~60×/s, and the value only drives the zoom buttons' enabled state.
      if (prev === null || Math.abs(value - prev) > 0.02) {
        runOnJS(setCurrentZoom)(value);
      }
    },
  );

  const dashAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.timing(dashAnim, {
        toValue: -18,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [dashAnim]);

  const makeGesture = useCallback(() => {
    const pan = Gesture.Pan()
      .enabled(!isLocked)
      .onUpdate(e => {
        translateX.value = savedTX.value + e.translationX;
        translateY.value = savedTY.value + e.translationY;
      })
      .onEnd(() => {
        savedTX.value = translateX.value;
        savedTY.value = translateY.value;
      });

    const pinch = Gesture.Pinch()
      .enabled(!isLocked)
      .onUpdate(e => {
        scale.value = clamp(savedScale.value * e.scale, minScale, maxScale);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [
    isLocked,
    translateX,
    translateY,
    savedTX,
    savedTY,
    scale,
    savedScale,
    minScale,
    maxScale,
  ]);

  const normalGesture = useMemo(() => makeGesture(), [makeGesture]);
  const fullscreenGesture = useMemo(() => makeGesture(), [makeGesture]);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
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

  // "Fit" shows the entire graph, centred.
  const handleFit = useCallback(() => {
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(fitScale, { duration: 250 });
    savedTX.value = 0;
    savedTY.value = 0;
    savedScale.value = fitScale;
  }, [translateX, translateY, scale, savedTX, savedTY, savedScale, fitScale]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(l => !l);
  }, []);

  const handleFullscreen = useCallback(() => {
    Orientation.lockToLandscape();
    setIsFullscreen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    Orientation.lockToPortrait();
    setIsFullscreen(false);
    translateX.value = withTiming(focusTx, { duration: 250 });
    translateY.value = withTiming(focusTy, { duration: 250 });
    scale.value = withTiming(initialScale, { duration: 250 });
    savedTX.value = focusTx;
    savedTY.value = focusTy;
    savedScale.value = initialScale;
  }, [
    translateX,
    translateY,
    scale,
    savedTX,
    savedTY,
    savedScale,
    focusTx,
    focusTy,
    initialScale,
  ]);

  // Restore portrait if this screen unmounts while still in fullscreen.
  useEffect(() => () => Orientation.lockToPortrait(), []);

  // Once the modal is open and the window has rotated to landscape, refit the
  // graph to the (much larger) landscape viewport.
  useEffect(() => {
    if (!isFullscreen) return;
    const fit = clamp(
      Math.min(winW / bounds.width, winH / bounds.height),
      minScale,
      maxScale,
    );
    translateX.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(0, { duration: 300 });
    scale.value = withTiming(fit, { duration: 300 });
    savedTX.value = 0;
    savedTY.value = 0;
    savedScale.value = fit;
  }, [
    isFullscreen,
    winW,
    winH,
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

  const viewportStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.viewport,
        styles.viewportCenter,
        { width: VW, height: VH },
      ]),
    [themed.viewport],
  );

  const canvasFrameStyle = useMemo(
    () => [{ width: bounds.width, height: bounds.height }, canvasStyle],
    [canvasStyle, bounds.width, bounds.height],
  );

  const fullscreenViewportStyle = useMemo(
    () => StyleSheet.flatten([themed.viewport, styles.fullscreenViewport]),
    [themed.viewport],
  );

  const renderCanvas = () => (
    <DiagramCanvas
      graph={graph}
      bounds={bounds}
      resolve={resolve}
      dashAnim={dashAnim}
      dotColor={scheme.brand}
    />
  );

  return (
    <Container>
      <GestureDetector gesture={normalGesture}>
        <Viewport viewportStyle={viewportStyle}>
          <CanvasFrame style={canvasFrameStyle}>{renderCanvas()}</CanvasFrame>
          <ControlButtons
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFit={handleFit}
            onToggleLock={handleToggleLock}
            onFullscreen={handleFullscreen}
            isLocked={isLocked}
            currentZoom={currentZoom}
            minZoom={minScale}
            maxZoom={maxScale}
          />
        </Viewport>
      </GestureDetector>

      <Modal
        visible={isFullscreen}
        animationType="slide"
        statusBarTranslucent
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={handleCloseFullscreen}>
        <StatusBar hidden />
        {isFullscreen ? (
          <FullscreenRoot>
            <View style={[styles.fullscreenWrap, themed.fullscreenWrapBg]}>
              <Viewport viewportStyle={fullscreenViewportStyle}>
                <GestureDetector gesture={fullscreenGesture}>
                  <CanvasFrame style={canvasFrameStyle}>
                    {renderCanvas()}
                  </CanvasFrame>
                </GestureDetector>
                <ControlButtons
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onFit={handleFit}
                  onToggleLock={handleToggleLock}
                  onFullscreen={handleCloseFullscreen}
                  isLocked={isLocked}
                  currentZoom={currentZoom}
                  minZoom={minScale}
                  maxZoom={maxScale}
                  insetLeft={insets.left}
                  insetBottom={insets.bottom}
                />
              </Viewport>
            </View>
          </FullscreenRoot>
        ) : null}
      </Modal>
    </Container>
  );
};

export default SLDDiagram;
