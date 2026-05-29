import React, { FC, memo, useMemo } from 'react';
import { Animated as RNAnimated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { AppText } from 'src/components/common';
import { GifImage, resolveLottieIcon } from 'src/assets/gif';
import { useScheme, useThemedStyles, Scheme } from 'src/theme';
import {
  buildEdgeGeometry,
  edgeColor,
  evalAnimation,
  formatSldValue,
  handlePoint,
  isLogoNode,
  nodeRectInBounds,
  SLDBounds,
} from 'src/utils';
import { SLDNode, SLDValueResolver, SLDGraph } from 'src/types';

const RNAnimatedPath = RNAnimated.createAnimatedComponent(Path);

/* ─────────── canvas constants (graph-space units) ─────────── */

const DOT_SPACING = 64;
const DOT_RADIUS = 2;
const DOT_OPACITY = 0.18;
const ICON_SIZE = 42;
const LOGO_ICON_SIZE = 38;

/* ─────────── static styles ─────────── */

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
  },
  metricsCol: {
    marginTop: 6,
    gap: 3,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricLabel: {
    width: 32,
  },
  metricValueWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 4,
  },
  metricValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  logoInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});

const createCanvasStyles = (scheme: Scheme) =>
  StyleSheet.create({
    sourceCard: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      overflow: 'hidden',
    },
    logoNode: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 3,
      borderColor: scheme.brand,
    },
  });

/* ─────────── edges ─────────── */

interface EdgeLineProps {
  path: string;
  arrowPath: string;
  color: string;
  animated: boolean;
  dashAnim: RNAnimated.Value;
}

const EdgeLine: FC<EdgeLineProps> = ({
  path,
  arrowPath,
  color,
  animated,
  dashAnim,
}) =>
  animated ? (
    <>
      <RNAnimatedPath
        d={path}
        stroke={color}
        strokeWidth={2.5}
        strokeDasharray="10,8"
        strokeDashoffset={dashAnim}
        fill="none"
      />
      <Path d={arrowPath} fill={color} />
    </>
  ) : (
    <>
      <Path d={path} stroke={color} strokeWidth={2} fill="none" opacity={0.55} />
      <Path d={arrowPath} fill={color} opacity={0.55} />
    </>
  );

/* ─────────── source node card ─────────── */

interface NodeCardProps {
  node: SLDNode;
  rect: { x: number; y: number; w: number; h: number };
  resolve: SLDValueResolver;
}

const SourceNodeCard: FC<NodeCardProps> = memo(({ node, rect, resolve }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createCanvasStyles);
  const icon = resolveLottieIcon(node.data.icon.name);

  const cardStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.sourceCard,
        { left: rect.x, top: rect.y, width: rect.w, height: rect.h },
      ]),
    [themed.sourceCard, rect.x, rect.y, rect.w, rect.h],
  );

  return (
    <View style={cardStyle}>
      <View style={styles.cardHeaderRow}>
        {icon ? <GifImage source={icon.path} size={ICON_SIZE} /> : null}
        <AppText
          fontSize={16}
          bold
          color={scheme.textPrimary}
          numberOfLines={1}
          style={styles.headerTitle}>
          {node.data.heading}
        </AppText>
      </View>
      <View style={styles.metricsCol}>
        {node.data.keys.map((k, i) => (
          <View key={i} style={styles.metricRow}>
            <AppText
              fontSize={13}
              bold
              color={scheme.textSecondary}
              style={styles.metricLabel}>
              {k.label}
            </AppText>
            <View style={styles.metricValueWrap}>
              <AppText
                fontSize={14}
                bold
                color={scheme.textPrimary}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.metricValue}>
                {formatSldValue(resolve(k.param))}
              </AppText>
              {k.unit ? (
                <AppText fontSize={11} color={scheme.textTertiary}>
                  {k.unit}
                </AppText>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});
SourceNodeCard.displayName = 'SourceNodeCard';

/* ─────────── central logo node ─────────── */

const LogoNodeCard: FC<NodeCardProps> = memo(({ node, rect, resolve }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createCanvasStyles);
  const icon = resolveLottieIcon(node.data.icon.name);
  const primary = node.data.keys[0];

  const logoStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.logoNode,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: rect.w / 2,
        },
      ]),
    [themed.logoNode, rect.x, rect.y, rect.w, rect.h],
  );

  return (
    <View style={logoStyle}>
      <View style={styles.logoInner}>
        {icon ? <GifImage source={icon.path} size={LOGO_ICON_SIZE} /> : null}
        <AppText fontSize={13} bold color={scheme.textPrimary} numberOfLines={1}>
          {node.data.heading}
        </AppText>
        {primary ? (
          <AppText fontSize={11} color={scheme.textSecondary} numberOfLines={1}>
            {formatSldValue(resolve(primary.param))}
            {primary.unit ? ` ${primary.unit}` : ''}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});
LogoNodeCard.displayName = 'LogoNodeCard';

/* ─────────── DiagramCanvas ─────────── */

interface DiagramCanvasProps {
  graph: SLDGraph;
  bounds: SLDBounds;
  resolve: SLDValueResolver;
  dashAnim: RNAnimated.Value;
  dotColor: string;
}

const DiagramCanvasBase: FC<DiagramCanvasProps> = ({
  graph,
  bounds,
  resolve,
  dashAnim,
  dotColor,
}) => {
  const { width, height } = bounds;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map(n => [n.id, n])),
    [graph.nodes],
  );

  const edges = useMemo(
    () =>
      graph.edges
        .map(edge => {
          const s = nodeById.get(edge.source);
          const t = nodeById.get(edge.target);
          if (!s || !t) return null;
          const sr = nodeRectInBounds(s, bounds);
          const tr = nodeRectInBounds(t, bounds);
          const from = handlePoint(sr, edge.sourceHandle);
          const to = handlePoint(tr, edge.targetHandle);
          const geo = buildEdgeGeometry(from, edge.sourceHandle, to, edge.targetHandle);
          return {
            id: edge.id,
            color: edgeColor(edge),
            animated: evalAnimation(s.data.animation, resolve),
            ...geo,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null),
    [graph.edges, nodeById, bounds, resolve],
  );

  const nodes = useMemo(
    () =>
      graph.nodes.map(node => ({
        node,
        rect: nodeRectInBounds(node, bounds),
        logo: isLogoNode(node),
      })),
    [graph.nodes, bounds],
  );

  return (
    <>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="sldDots"
            width={DOT_SPACING}
            height={DOT_SPACING}
            patternUnits="userSpaceOnUse">
            <Circle
              cx={DOT_SPACING / 2}
              cy={DOT_SPACING / 2}
              r={DOT_RADIUS}
              fill={dotColor}
              opacity={DOT_OPACITY}
            />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#sldDots)" />
        {edges.map(e => (
          <EdgeLine
            key={e.id}
            path={e.path}
            arrowPath={e.arrowPath}
            color={e.color}
            animated={e.animated}
            dashAnim={dashAnim}
          />
        ))}
      </Svg>

      {nodes.map(({ node, rect, logo }) =>
        logo ? (
          <LogoNodeCard key={node.id} node={node} rect={rect} resolve={resolve} />
        ) : (
          <SourceNodeCard key={node.id} node={node} rect={rect} resolve={resolve} />
        ),
      )}
    </>
  );
};

export const DiagramCanvas = memo(DiagramCanvasBase);
DiagramCanvas.displayName = 'DiagramCanvas';
