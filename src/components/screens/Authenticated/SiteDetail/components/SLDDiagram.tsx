import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import {
  ACCENT_GREEN,
  ACCENT_RED,
  BLACK,
  CARD_BG,
  FONT_SIZE_MICRO,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BORDER,
  METRIC_CARD_BG,
  normalizeHeight,
  normalizeWidth,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { sldCenter, sldSources, SLDSourceNode } from 'src/data/mock';
import ControlButtons from './ControlButtons';

const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path);
const { width: SW, height: SH } = Dimensions.get('window');

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
  const keys = ['dg', 'grid', 'solar', 'bess'] as const;
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

const SourceCard: FC<{ source: SLDSourceNode; x: number; y: number }> = ({
  source,
  x,
  y,
}) => (
  <View style={[styles.sourceCard, { left: x, top: y, width: CW, height: CH }]}>
    <AppText fontSize={FONT_SIZE_SM} bold color={WHITE} numberOfLines={1}>
      {source.title}
    </AppText>
    <View style={styles.cardContent}>
      <Icon
        name={source.iconName}
        size={normalizeWidth(34)}
        color={source.iconColor}
      />
      <View style={styles.metricsCol}>
        {source.metrics.map((m, i) => (
          <View key={i} style={styles.metricRow}>
            <AppText
              fontSize={FONT_SIZE_XS}
              bold
              color={WHITE}
              style={styles.metricLabel}>
              {m.label}
            </AppText>
            <AppText
              fontSize={FONT_SIZE_XS}
              bold
              color={WHITE}
              style={styles.metricValue}>
              {m.value}
            </AppText>
            {m.unit ? (
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                {m.unit}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  </View>
);

const CenterNode: FC<{ vw: number; vh: number }> = ({ vw, vh }) => (
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
    <Icon name={sldCenter.iconName} size={normalizeWidth(24)} color={ACCENT_RED} />
    <AppText fontSize={FONT_SIZE_XS} bold color={WHITE}>
      {sldCenter.title}
    </AppText>
    <AppText fontSize={FONT_SIZE_MICRO} color={TEXT_SECONDARY}>
      Load ={sldCenter.loadValue}
    </AppText>
  </View>
);

// --- Main Canvas Content ---

const DiagramCanvas: FC<{
  vw: number;
  vh: number;
  dashAnim: RNAnimated.Value;
}> = ({ vw, vh, dashAnim }) => {
  const positions = getPositions(vw, vh);
  const keys = ['dg', 'grid', 'solar', 'bess'] as const;
  const dots = makeGridDots(vw, vh);

  return (
    <>
      <Svg
        style={StyleSheet.absoluteFill}
        width={vw}
        height={vh}>
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
          if (source.lineStyle === 'animated') {
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
          <SourceCard key={source.id} source={source} x={pos.x} y={pos.y} />
        );
      })}

      <CenterNode vw={vw} vh={vh} />
    </>
  );
};

// --- Main Component ---

const SLDDiagram: FC = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reanimated shared values for gestures
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedTX = useSharedValue(0);
  const savedTY = useSharedValue(0);
  const savedScale = useSharedValue(1);

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

  // Gestures
  const panGesture = Gesture.Pan()
    .enabled(!isLocked)
    .onUpdate(e => {
      translateX.value = savedTX.value + e.translationX;
      translateY.value = savedTY.value + e.translationY;
    })
    .onEnd(() => {
      savedTX.value = translateX.value;
      savedTY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(!isLocked)
    .onUpdate(e => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.5), 3);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

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
    <View style={[styles.viewport, { width: vw, height: vh }]}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: vw, height: vh }, canvasStyle]}>
          <DiagramCanvas vw={vw} vh={vh} dashAnim={dashAnim} />
        </Animated.View>
      </GestureDetector>
      <ControlButtons
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onToggleLock={handleToggleLock}
        onFullscreen={handleFullscreen}
        isLocked={isLocked}
      />
    </View>
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
        <View style={styles.fullscreenWrap}>
          <View style={[styles.viewport, { width: SW, height: SH, borderRadius: 0 }]}>
            <GestureDetector gesture={gesture}>
              <Animated.View style={[{ width: SW, height: SH }, canvasStyle]}>
                <DiagramCanvas vw={SW} vh={SH} dashAnim={dashAnim} />
              </Animated.View>
            </GestureDetector>
            <ControlButtons
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onToggleLock={handleToggleLock}
              onFullscreen={handleCloseFullscreen}
              isLocked={isLocked}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleCloseFullscreen}>
              <Icon name="close" size={normalizeWidth(22)} color={WHITE} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  viewport: {
    overflow: 'hidden',
    backgroundColor: METRIC_CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: normalizeWidth(16),
  },
  sourceCard: {
    position: 'absolute',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: normalizeWidth(12),
    padding: normalizeWidth(10),
    gap: normalizeHeight(6),
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalizeWidth(8),
  },
  metricsCol: {
    flex: 1,
    gap: normalizeHeight(2),
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: normalizeWidth(4),
  },
  metricLabel: {
    width: normalizeWidth(26),
  },
  metricValue: {
    flex: 1,
    textAlign: 'right',
  },
  centerNode: {
    position: 'absolute',
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: ACCENT_RED,
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalizeHeight(2),
  },
  fullscreenWrap: {
    flex: 1,
    backgroundColor: BLACK,
  },
  closeBtn: {
    position: 'absolute',
    top: normalizeHeight(16),
    right: normalizeWidth(16),
    width: normalizeWidth(40),
    height: normalizeWidth(40),
    borderRadius: normalizeWidth(20),
    backgroundColor: 'rgba(27, 26, 27, 0.9)',
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SLDDiagram;
