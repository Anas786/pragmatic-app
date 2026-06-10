import React, { FC, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle as SkiaCircle,
  DashPathEffect,
  Group,
  Path as SkiaPath,
  Skia,
  useClock,
  type SkPath,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { AppText } from 'src/components/common';
import { GifImage, resolveLottieIcon } from 'src/assets/gif';
import { useScheme, useThemedStyles, Scheme } from 'src/theme';
import {
  buildEdgeGeometry,
  buildOrthogonalEdgeGeometry,
  edgeColor,
  edgeColorForScheme,
  formatSldValue,
  handlePoint,
  isEdgeAnimated,
  isLogoNode,
  nodeRectInBounds,
  SLDBounds,
} from 'src/utils';
import { SLDNode, SLDValueResolver, SLDGraph } from 'src/types';

/* ─────────── canvas constants (graph-space units) ─────────── */

const DOT_SPACING = 64;
const DOT_RADIUS = 2;
const DOT_OPACITY = 0.18;
const ICON_SIZE = 34;
const LOGO_ICON_SIZE = 38;

/* Flow-animation tuning — mirrors the web SLD:
 *   - dashes: `stroke-dasharray: 7,6`, offset drifts ~ -40px / 1.1s ≈ 36 px/s
 *   - particle: a small dot riding the path over ~4.8–5.6s, looping
 * All of it runs on Skia's render thread (a `useClock`-driven shared value),
 * so there are ZERO per-frame Fabric commits — which is exactly why the old
 * react-native-svg + Reanimated dash crashed and this doesn't. */
const DASH_INTERVALS = [7, 6];
const DASH_SPEED = 36; // px/s
const PARTICLE_RADIUS = 3;
const PARTICLE_SAMPLES = 48;
const PARTICLE_BASE_PERIOD = 4.8; // s

/* ─────────── static styles ─────────── */

const styles = StyleSheet.create({
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 9,
    marginBottom: 7,
  },
  metricsCol: {
    gap: 5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metricLabel: {
    flexShrink: 0,
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
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 12,
      overflow: 'hidden',
    },
    logoNode: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 3,
      borderColor: scheme.brand,
    },
  });

/* ─────────── skia edge model ─────────── */

interface SkEdge {
  id: string;
  color: string;
  animated: boolean;
  skPath: SkPath;
  skArrow: SkPath | null;
  /** Flattened [x0,y0,x1,y1,…] samples along the path (animated edges only). */
  points: number[];
  period: number;
  offset: number;
}

/** Sample evenly-spaced points along a path's first contour (JS-thread). */
const sampleEdgePoints = (skPath: SkPath): number[] => {
  const iter = Skia.ContourMeasureIter(skPath, false, 1);
  const contour = iter.next();
  if (!contour) return [];
  const len = contour.length();
  if (len <= 0) return [];
  const pts: number[] = [];
  for (let k = 0; k <= PARTICLE_SAMPLES; k++) {
    const [pos] = contour.getPosTan((len * k) / PARTICLE_SAMPLES);
    pts.push(pos.x, pos.y);
  }
  return pts;
};

/* ─────────── edges (Skia) ─────────── */

const IdleEdge: FC<{ edge: SkEdge }> = ({ edge }) => (
  <Group opacity={0.55}>
    <SkiaPath
      path={edge.skPath}
      style="stroke"
      strokeWidth={2}
      color={edge.color}
    />
    {edge.skArrow ? <SkiaPath path={edge.skArrow} color={edge.color} /> : null}
  </Group>
);

const FlowEdge: FC<{
  edge: SkEdge;
  dashPhase: SharedValue<number>;
  clock: SharedValue<number>;
}> = ({ edge, dashPhase, clock }) => {
  const { points, period, offset, color, skPath, skArrow } = edge;
  const n = points.length / 2;

  const cx = useDerivedValue(() => {
    if (n < 2) return 0;
    const t = (clock.value / 1000 / period + offset) % 1;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(t * (n - 1))));
    return points[idx * 2];
  });
  const cy = useDerivedValue(() => {
    if (n < 2) return 0;
    const t = (clock.value / 1000 / period + offset) % 1;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(t * (n - 1))));
    return points[idx * 2 + 1];
  });

  return (
    <Group>
      <SkiaPath
        path={skPath}
        style="stroke"
        strokeWidth={2.5}
        strokeCap="round"
        color={color}>
        <DashPathEffect intervals={DASH_INTERVALS} phase={dashPhase} />
      </SkiaPath>
      {skArrow ? <SkiaPath path={skArrow} color={color} /> : null}
      {n > 1 ? (
        <SkiaCircle cx={cx} cy={cy} r={PARTICLE_RADIUS} color={color} />
      ) : null}
    </Group>
  );
};

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
  const accent = edgeColorForScheme(
    node.data.icon.color || scheme.brand,
    scheme.isDark,
  );

  // On a light surface an accent wash + accent border read as a washed-out
  // tint (esp. for bright yellows on white), so light theme keeps a clean
  // white card with a neutral border and lets the colour live in the top bar
  // + icon well. Dark theme keeps the richer accent wash + border.
  const cardStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.sourceCard,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderColor: scheme.isDark ? accent + '40' : scheme.border,
        },
      ]),
    [themed.sourceCard, rect.x, rect.y, rect.w, rect.h, accent, scheme.isDark, scheme.border],
  );

  return (
    <View style={cardStyle}>
      {/* Accent wash only on dark — on light it washes the card out. */}
      {scheme.isDark ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: accent + '0D' },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[styles.accentBar, { backgroundColor: accent }]}
      />

      <View style={styles.cardHeaderRow}>
        <View
          style={[
            styles.iconWell,
            { backgroundColor: accent + (scheme.isDark ? '24' : '2E') },
          ]}>
          {icon ? <GifImage source={icon.path} size={ICON_SIZE} /> : null}
        </View>
        <AppText
          fontSize={15}
          bold
          color={scheme.textPrimary}
          numberOfLines={1}
          style={styles.headerTitle}>
          {node.data.heading}
        </AppText>
      </View>

      <View style={[styles.divider, { backgroundColor: scheme.hairline }]} />

      <View style={styles.metricsCol}>
        {node.data.keys.map((k, i) => (
          <View key={i} style={styles.metricRow}>
            <AppText
              fontSize={11}
              semi_bold
              color={scheme.textTertiary}
              numberOfLines={1}
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
                <AppText fontSize={10} medium color={scheme.textSecondary}>
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
  const accent = edgeColorForScheme(
    node.data.icon.color || scheme.brand,
    scheme.isDark,
  );

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
          borderColor: accent,
        },
      ]),
    [themed.logoNode, rect.x, rect.y, rect.w, rect.h, accent],
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
  dotColor: string;
  /** Route edges as right-angle Manhattan steps instead of bezier curves. */
  orthogonal: boolean;
  /** Dark theme → use raw source colours; light → darken bright ones. */
  isDark: boolean;
}

const DiagramCanvasBase: FC<DiagramCanvasProps> = ({
  graph,
  bounds,
  resolve,
  dotColor,
  orthogonal,
  isDark,
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
          const geo = orthogonal
            ? buildOrthogonalEdgeGeometry(from, edge.sourceHandle, to, edge.targetHandle)
            : buildEdgeGeometry(from, edge.sourceHandle, to, edge.targetHandle);
          return {
            id: edge.id,
            color: edgeColorForScheme(edgeColor(edge), isDark),
            animated: isEdgeAnimated(edge, s, resolve),
            ...geo,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null),
    [graph.edges, nodeById, bounds, resolve, orthogonal, isDark],
  );

  // Parse edge geometry into Skia paths once; sample points for animated edges.
  const skEdges = useMemo<SkEdge[]>(() => {
    const out: SkEdge[] = [];
    edges.forEach((e, i) => {
      const skPath = Skia.Path.MakeFromSVGString(e.path);
      if (!skPath) return;
      const skArrow = Skia.Path.MakeFromSVGString(e.arrowPath);
      out.push({
        id: e.id,
        color: e.color,
        animated: e.animated,
        skPath,
        skArrow,
        points: e.animated ? sampleEdgePoints(skPath) : [],
        period: PARTICLE_BASE_PERIOD + (i % 4) * 0.27,
        offset: (i * 0.37) % 1,
      });
    });
    return out;
  }, [edges]);

  const nodes = useMemo(
    () =>
      graph.nodes.map(node => ({
        node,
        rect: nodeRectInBounds(node, bounds),
        logo: isLogoNode(node),
      })),
    [graph.nodes, bounds],
  );

  const dots = useMemo(() => {
    const out: Array<{ cx: number; cy: number }> = [];
    for (let y = DOT_SPACING; y < height; y += DOT_SPACING) {
      for (let x = DOT_SPACING; x < width; x += DOT_SPACING) {
        out.push({ cx: x, cy: y });
      }
    }
    return out;
  }, [width, height]);

  // Skia clock → animated dash offset, shared by every flow edge.
  const clock = useClock();
  const dashPhase = useDerivedValue(() => -(clock.value / 1000) * DASH_SPEED);

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill}>
        <Group color={dotColor} opacity={DOT_OPACITY}>
          {dots.map((d, i) => (
            <SkiaCircle key={`dot-${i}`} cx={d.cx} cy={d.cy} r={DOT_RADIUS} />
          ))}
        </Group>
        {skEdges.map(e =>
          e.animated ? (
            <FlowEdge key={e.id} edge={e} dashPhase={dashPhase} clock={clock} />
          ) : (
            <IdleEdge key={e.id} edge={e} />
          ),
        )}
      </Canvas>

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
