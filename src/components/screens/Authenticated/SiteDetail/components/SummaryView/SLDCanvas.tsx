import React, { FC, useMemo } from 'react';
import {
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AppText } from 'src/components/common';
import {
  radius as radiusTokens,
  useScheme,
  useThemedStyles,
  Scheme,
} from 'src/theme';
import {
  FONT_SIZE_MICRO,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  normalizeHeight,
  normalizeWidth,
} from 'src/utils';
import { sldCenter, sldSources, SLDSourceNode } from 'src/data/mock';
import { FactoryGif } from 'src/assets/gif';

const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path);

/* ─────────── layout constants ─────────── */

export const PAD = normalizeWidth(8);
export const CW = normalizeWidth(152);
export const CH = normalizeHeight(118);
export const CD = normalizeWidth(90);
export const DOT_SPACING = 50;
const ACCENT_GREEN_OPACITY = 0.2;

/* ─────────── geometry helpers ─────────── */

export const getPositions = (vw: number, vh: number) => ({
  dg: { x: PAD, y: PAD },
  grid: { x: vw - CW - PAD, y: PAD },
  solar: { x: PAD, y: vh - CH - PAD },
  bess: { x: vw - CW - PAD, y: vh - CH - PAD },
});

export const getLinePath = (idx: number, vw: number, vh: number) => {
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

export const getArrowPath = (
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

export const makeGridDots = (vw: number, vh: number) => {
  const dots: Array<{ cx: number; cy: number }> = [];
  for (let y = 25; y < vh; y += DOT_SPACING) {
    for (let x = 25; x < vw; x += DOT_SPACING) {
      dots.push({ cx: x, cy: y });
    }
  }
  return dots;
};

/* ─────────── styles ─────────── */

const styles = StyleSheet.create({
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
});

const createCanvasStyles = (scheme: Scheme) =>
  StyleSheet.create({
    sourceCard: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: normalizeWidth(12),
      padding: normalizeWidth(10),
      gap: normalizeHeight(6),
    },
    centerNode: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 2,
      borderColor: scheme.brand,
      alignItems: 'center',
      justifyContent: 'center',
      gap: normalizeHeight(2),
    },
  });

/* ─────────── FlowLine ─────────── */

interface FlowLineProps {
  d: string;
  color: string;
  dashAnim: RNAnimated.Value;
}

export const FlowLine: FC<FlowLineProps> = ({ d, color, dashAnim }) => (
  <RNAnimatedPath
    d={d}
    stroke={color}
    strokeWidth={2}
    strokeDasharray="8,6"
    strokeDashoffset={dashAnim}
    fill="none"
  />
);

/* ─────────── SolidLine ─────────── */

interface SolidLineProps {
  d: string;
  arrowD: string;
  color: string;
}

export const SolidLine: FC<SolidLineProps> = ({ d, arrowD, color }) => (
  <>
    <Path d={d} stroke={color} strokeWidth={2} fill="none" />
    <Path d={arrowD} fill={color} />
  </>
);

/* ─────────── SourceCard ─────────── */

interface SourceCardProps {
  source: SLDSourceNode;
  x: number;
  y: number;
}

export const SourceCard: FC<SourceCardProps> = ({ source, x, y }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createCanvasStyles);
  const posStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.sourceCard,
        { left: x, top: y, width: CW, height: CH },
      ]),
    [themed.sourceCard, x, y],
  );

  return (
    <View style={posStyle}>
      <AppText
        fontSize={FONT_SIZE_SM}
        bold
        color={scheme.textPrimary}
        numberOfLines={1}>
        {source.title}
      </AppText>
      <View style={styles.cardContent}>
        <source.iconName size={normalizeWidth(34)} />
        <View style={styles.metricsCol}>
          {source.metrics.map((m, i) => (
            <View key={i} style={styles.metricRow}>
              <AppText
                fontSize={FONT_SIZE_XS}
                bold
                color={scheme.textPrimary}
                style={styles.metricLabel}>
                {m.label}
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XS}
                bold
                color={scheme.textPrimary}
                style={styles.metricValue}>
                {m.value}
              </AppText>
              {m.unit ? (
                <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
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

/* ─────────── CenterNode ─────────── */

interface CenterNodeProps {
  vw: number;
  vh: number;
}

export const CenterNode: FC<CenterNodeProps> = ({ vw, vh }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createCanvasStyles);
  const centerStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.centerNode,
        {
          left: (vw - CD) / 2,
          top: (vh - CD) / 2,
          width: CD,
          height: CD,
          borderRadius: CD / 2,
        },
      ]),
    [themed.centerNode, vw, vh],
  );

  return (
    <View style={centerStyle}>
      <FactoryGif size={normalizeWidth(24)} />
      <AppText fontSize={FONT_SIZE_XS} bold color={scheme.textPrimary}>
        {sldCenter.title}
      </AppText>
      <AppText fontSize={FONT_SIZE_MICRO} color={scheme.textSecondary}>
        Load = {sldCenter.loadValue}
      </AppText>
    </View>
  );
};

/* ─────────── DiagramCanvas ─────────── */

interface DiagramCanvasProps {
  vw: number;
  vh: number;
  dashAnim: RNAnimated.Value;
  dotColor: string;
}

export const DiagramCanvas: FC<DiagramCanvasProps> = ({
  vw,
  vh,
  dashAnim,
  dotColor,
}) => {
  const positions = getPositions(vw, vh);
  const keys = ['dg', 'grid', 'solar', 'bess'] as const;
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
            fill={dotColor}
            opacity={ACCENT_GREEN_OPACITY}
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
