import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Modal,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "src/components/common";
import {
  ACCENT_GREEN,
  ACCENT_RED,
  FONT_SIZE_MICRO,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from "src/utils";
import { useThemeStore } from "src/hooks";
import { sldCenter, sldSources, SLDSourceNode } from "src/data/mock";
import ControlButtons from "./ControlButtons";
import { FactoryGif } from "src/assets/gif";

const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path);
const { width: SW } = Dimensions.get("window");

interface NodeIconProps {
  IconComponent: FC<{ size?: number }>;
  size: number;
}
const NodeIcons: FC<NodeIconProps> = ({ IconComponent, size }) => {
  return <IconComponent size={size} />;
};

// Layout constants
const PAD = normalizeWidth(8);
const CW = normalizeWidth(152);
const CH = normalizeHeight(118);
const CD = normalizeWidth(90);

// Viewport dimensions (normal mode)
const VW = SW - normalizeWidth(24);
const VH = normalizeHeight(480);

// Helpers: compute positions from viewport size
const getPositions = (vw: number, vh: number) => ({
  dg: { x: PAD, y: PAD },
  grid: { x: vw - CW - PAD, y: PAD },
  solar: { x: PAD, y: vh - CH - PAD },
  bess: { x: vw - CW - PAD, y: vh - CH - PAD },
});

const getLinePath = (idx: number, vw: number, vh: number) => {
  const pos = getPositions(vw, vh);
  const keys = ["dg", "grid", "solar", "bess"] as const;
  const p = pos[keys[idx]];
  const isTop = idx < 2;
  const isLeft = idx % 2 === 0;
  const sx = p.x + CW / 2;
  const sy = isTop ? p.y + CH : p.y;
  const ex = vw / 2 + (isLeft ? -CD / 3 : CD / 3);
  const ey = vh / 2 + (isTop ? -CD / 3 : CD / 3);
  const cx = sx;
  const cy = (sy + ey) / 2;
  return { path: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`, cx, cy, ex, ey };
};

const getArrowPath = (
  ctrlX: number,
  ctrlY: number,
  endX: number,
  endY: number,
) => {
  const angle = Math.atan2(endY - ctrlY, endX - ctrlX);
  const len = 10;
  const spread = Math.PI / 6;
  const lx = endX - len * Math.cos(angle - spread);
  const ly = endY - len * Math.sin(angle - spread);
  const rx = endX - len * Math.cos(angle + spread);
  const ry = endY - len * Math.sin(angle + spread);
  return `M ${endX} ${endY} L ${lx} ${ly} L ${rx} ${ry} Z`;
};

// Grid dots
const DOT_SPACING = 50;
const makeGridDots = (vw: number, vh: number) => {
  const dots: Array<{ cx: number; cy: number }> = [];
  for (let y = 25; y < vh; y += DOT_SPACING) {
    for (let x = 25; x < vw; x += DOT_SPACING) {
      dots.push({ cx: x, cy: y });
    }
  }
  return dots;
};

// --- Sub-components ---

const FlowLine: FC<{
  d: string;
  color: string;
  dashAnim: RNAnimated.Value;
}> = ({ d, color, dashAnim }) => (
  <RNAnimatedPath
    d={d}
    stroke={color}
    strokeWidth={2}
    strokeDasharray="8,6"
    strokeDashoffset={dashAnim}
    fill="none"
  />
);

const SolidLine: FC<{
  d: string;
  arrowD: string;
  color: string;
}> = ({ d, arrowD, color }) => (
  <>
    <Path d={d} stroke={color} strokeWidth={2} fill="none" />
    <Path d={arrowD} fill={color} />
  </>
);

const SourceCard: FC<{
  source: SLDSourceNode;
  x: number;
  y: number;
  colors: ThemeColors;
}> = ({ source, x, y, colors }) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[styles.sourceCard, { left: x, top: y, width: CW, height: CH }]}>
      <AppText
        fontSize={FONT_SIZE_SM}
        bold
        color={colors.primaryText}
        numberOfLines={1}>
        {source.title}
      </AppText>
      <View style={styles.cardContent}>
        <NodeIcons IconComponent={source.iconName} size={normalizeWidth(34)} />
        <View style={styles.metricsCol}>
          {source.metrics.map((m, i) => (
            <View key={i} style={styles.metricRow}>
              <AppText
                fontSize={FONT_SIZE_XS}
                bold
                color={colors.primaryText}
                style={styles.metricLabel}>
                {m.label}
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XS}
                bold
                color={colors.primaryText}
                style={styles.metricValue}>
                {m.value}
              </AppText>
              {m.unit ? (
                <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                  {m.unit}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const CenterNode: FC<{ vw: number; vh: number; colors: ThemeColors }> = ({
  vw,
  vh,
  colors,
}) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.centerNode,
        {
          left: (vw - CD) / 2,
          top: (vh - CD) / 2,
          width: CD,
          height: CD,
          borderRadius: CD / 2,
        },
      ]}>
      <FactoryGif size={normalizeWidth(24)} />
      <AppText fontSize={FONT_SIZE_XS} bold color={colors.primaryText}>
        {sldCenter.title}
      </AppText>
      <AppText fontSize={FONT_SIZE_MICRO} color={colors.textSecondary}>
        Load = {sldCenter.loadValue}
      </AppText>
    </View>
  );
};

// --- Main Canvas Content ---

const DiagramCanvas: FC<{
  vw: number;
  vh: number;
  dashAnim: RNAnimated.Value;
  colors: ThemeColors;
}> = ({ vw, vh, dashAnim, colors }) => {
  const positions = getPositions(vw, vh);
  const keys = ["dg", "grid", "solar", "bess"] as const;
  const dots = makeGridDots(vw, vh);

  return (
    <>
      <Svg style={StyleSheet.absoluteFill} width={vw} height={vh}>
        {dots.map((dot, i) => (
          <Circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={1.5}
            fill={ACCENT_GREEN}
            opacity={0.2}
          />
        ))}
        {sldSources.map((source, idx) => {
          const line = getLinePath(idx, vw, vh);
          if (source.lineStyle === "animated") {
            return (
              <FlowLine
                key={source.id}
                d={line.path}
                color={source.lineColor}
                dashAnim={dashAnim}
              />
            );
          }
          return (
            <SolidLine
              key={source.id}
              d={line.path}
              arrowD={getArrowPath(line.cx, line.cy, line.ex, line.ey)}
              color={source.lineColor}
            />
          );
        })}
      </Svg>

      {sldSources.map((source, idx) => {
        const pos = positions[keys[idx]];
        return (
          <SourceCard
            key={source.id}
            source={source}
            x={pos.x}
            y={pos.y}
            colors={colors}
          />
        );
      })}

      <CenterNode vw={vw} vh={vh} colors={colors} />
    </>
  );
};

// --- Main Component ---

const SLDDiagram: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<any>(1);

  // Reanimated shared values for gestures
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

  // RN Animated for SVG dash animation
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

  // Gesture factory — each GestureDetector needs its own gesture instance
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

  // Button handlers
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

  // Normal view
  const renderDiagram = (vw: number, vh: number) => (
    <GestureDetector gesture={normalGesture}>
      <View style={[styles.viewport, { width: vw, height: vh }]}>
        <Animated.View style={[{ width: vw, height: vh }, canvasStyle]}>
          <DiagramCanvas vw={vw} vh={vh} dashAnim={dashAnim} colors={colors} />
        </Animated.View>
        <ControlButtons
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onToggleLock={handleToggleLock}
          onFullscreen={handleFullscreen}
          isLocked={isLocked}
          currentZoom={currentZoom}
        />
      </View>
    </GestureDetector>
  );

  return (
    <View style={styles.container}>
      {renderDiagram(VW, VH)}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleCloseFullscreen}>
        <StatusBar hidden />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.fullscreenWrap}>
            <View style={[styles.viewport, styles.fullscreenViewport]}>
              <GestureDetector gesture={fullscreenGesture}>
                <Animated.View style={[styles.fullscreenCanvas, canvasStyle]}>
                  <DiagramCanvas
                    vw={VW}
                    vh={VH}
                    dashAnim={dashAnim}
                    colors={colors}
                  />
                </Animated.View>
              </GestureDetector>
              <ControlButtons
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onToggleLock={handleToggleLock}
                onFullscreen={handleCloseFullscreen}
                isLocked={isLocked}
                currentZoom={currentZoom}
              />
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: "relative",
    },
    viewport: {
      overflow: "hidden",
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16),
    },
    sourceCard: {
      position: "absolute",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(12),
      padding: normalizeWidth(10),
      gap: normalizeHeight(6),
    },
    cardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(8),
    },
    metricsCol: {
      flex: 1,
      gap: normalizeHeight(2),
    },
    metricRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: normalizeWidth(4),
    },
    metricLabel: {
      width: normalizeWidth(26),
    },
    metricValue: {
      flex: 1,
      textAlign: "right",
    },
    centerNode: {
      position: "absolute",
      backgroundColor: colors.cardBg,
      borderWidth: 2,
      borderColor: ACCENT_RED,
      alignItems: "center",
      justifyContent: "center",
      gap: normalizeHeight(2),
    },
    fullscreenViewport: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 0,
      borderWidth: 0,
    },
    fullscreenCanvas: {
      width: VW,
      height: VH,
    },
    fullscreenWrap: {
      flex: 1,
      backgroundColor: colors.fullscreenBg,
    },
    closeBtn: {
      position: "absolute",
      top: normalizeHeight(16),
      right: normalizeWidth(16),
      width: normalizeWidth(40),
      height: normalizeWidth(40),
      borderRadius: normalizeWidth(20),
      backgroundColor: colors.controlButtonBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default SLDDiagram;
