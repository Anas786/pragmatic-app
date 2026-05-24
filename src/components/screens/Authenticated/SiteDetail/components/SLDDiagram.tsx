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
  View,
} from 'react-native';
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
import { normalizeHeight, normalizeWidth } from 'src/utils';
import ControlButtons from './ControlButtons';
import { DiagramCanvas } from './SummaryView/SLDCanvas';

/* ─────────── viewport dimensions (normal mode) ─────────── */

const { width: SW } = Dimensions.get('window');
const VW = SW - normalizeWidth(24);
const VH = normalizeHeight(480);

/* ─────────── static styles (not theme-dependent) ─────────── */

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
  fullscreenCanvas: {
    width: VW,
    height: VH,
  },
  fullscreenWrap: {
    flex: 1,
  },
});

/* ─────────── theme-dependent styles ─────────── */

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
    controlBg: {
      backgroundColor: scheme.isDark
        ? 'rgba(17, 24, 39, 0.92)'
        : 'rgba(244, 245, 247, 0.92)',
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

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(1);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(1);

  useAnimatedReaction(
    () => scale.value,
    value => {
      runOnJS(setCurrentZoom)(value);
    },
  );

  const dashAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const anim = RNAnimated.loop(
      RNAnimated.timing(dashAnim, {
        toValue: -20,
        duration: 1500,
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
        scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 3);
      })
      .onEnd(() => {
        savedScale.value = scale.value;
      });

    return Gesture.Simultaneous(pinch, pan);
  }, [isLocked, translateX, translateY, savedTX, savedTY, scale, savedScale]);

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
    const ns = Math.min(savedScale.value + 0.2, 3);
    savedScale.value = ns;
    scale.value = withTiming(ns, { duration: 200 });
  }, [scale, savedScale]);

  const handleZoomOut = useCallback(() => {
    const ns = Math.max(savedScale.value - 0.2, 0.5);
    savedScale.value = ns;
    scale.value = withTiming(ns, { duration: 200 });
  }, [scale, savedScale]);

  const handleFit = useCallback(() => {
    translateX.value = withTiming(0, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250 });
    scale.value = withTiming(1, { duration: 250 });
    savedTX.value = 0;
    savedTY.value = 0;
    savedScale.value = 1;
  }, [translateX, translateY, scale, savedTX, savedTY, savedScale]);

  const handleToggleLock = useCallback(() => {
    setIsLocked(l => !l);
  }, []);

  const handleFullscreen = useCallback(() => {
    handleFit();
    setIsFullscreen(true);
  }, [handleFit]);

  const handleCloseFullscreen = useCallback(() => {
    handleFit();
    setIsFullscreen(false);
  }, [handleFit]);

  const viewportStyle = useMemo(
    () => StyleSheet.flatten([themed.viewport, { width: VW, height: VH }]),
    [themed.viewport],
  );

  const canvasFrameStyle = useMemo(
    () => [{ width: VW, height: VH }, canvasStyle],
    [canvasStyle],
  );

  const fullscreenViewportStyle = useMemo(
    () => StyleSheet.flatten([themed.viewport, styles.fullscreenViewport]),
    [themed.viewport],
  );

  const fullscreenCanvasFrameStyle = useMemo(
    () => [styles.fullscreenCanvas, canvasStyle],
    [canvasStyle],
  );

  return (
    <Container>
      <GestureDetector gesture={normalGesture}>
        <Viewport viewportStyle={viewportStyle}>
          <CanvasFrame style={canvasFrameStyle}>
            <DiagramCanvas
              vw={VW}
              vh={VH}
              dashAnim={dashAnim}
              dotColor={scheme.brand}
            />
          </CanvasFrame>
          <ControlButtons
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleLock={handleToggleLock}
            onFullscreen={handleFullscreen}
            isLocked={isLocked}
            currentZoom={currentZoom}
          />
        </Viewport>
      </GestureDetector>

      <Modal
        visible={isFullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCloseFullscreen}>
        <StatusBar hidden />
        <FullscreenRoot>
          <View style={[styles.fullscreenWrap, themed.fullscreenWrapBg]}>
            <Viewport viewportStyle={fullscreenViewportStyle}>
              <GestureDetector gesture={fullscreenGesture}>
                <CanvasFrame style={fullscreenCanvasFrameStyle}>
                  <DiagramCanvas
                    vw={VW}
                    vh={VH}
                    dashAnim={dashAnim}
                    dotColor={scheme.brand}
                  />
                </CanvasFrame>
              </GestureDetector>
              <ControlButtons
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onToggleLock={handleToggleLock}
                onFullscreen={handleCloseFullscreen}
                isLocked={isLocked}
                currentZoom={currentZoom}
              />
            </Viewport>
          </View>
        </FullscreenRoot>
      </Modal>
    </Container>
  );
};

export default SLDDiagram;
