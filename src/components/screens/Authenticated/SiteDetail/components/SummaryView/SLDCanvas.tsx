import React, { FC, memo, useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Circle as SkiaCircle,
  DashPathEffect,
  Group,
  Path as SkiaPath,
  rect as skRect,
  rrect as skRRect,
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
  resolveNodeRects,
  SLDBounds,
} from 'src/utils';
import { SLDNode, SLDValueResolver, SLDGraph } from 'src/types';

/* ─────────── canvas constants (graph-space units) ─────────── */

const DOT_SPACING = 72;
const DOT_RADIUS = 2;
const DOT_OPACITY = 0.12;
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
  // Rounded to hug the card's 16px corners — the card no longer clips its
  // children (overflow:'hidden' would kill the iOS shadow).
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  accentWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
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
    // NO overflow:'hidden' here — iOS clips its own shadow with it. The
    // rounded inner overlays (accent bar/wash) carry their own radii instead.
    sourceCard: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingTop: 11,
      paddingBottom: 12,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: scheme.isDark ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    logoNode: {
      position: 'absolute',
      backgroundColor: scheme.surface,
      borderWidth: 3,
      borderColor: scheme.brand,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: scheme.isDark ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 4,
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

// Thinner + fainter than flow edges so live power routes read at a glance.
const IdleEdge: FC<{ edge: SkEdge }> = ({ edge }) => (
  <Group opacity={0.45}>
    <SkiaPath
      path={edge.skPath}
      style="stroke"
      strokeWidth={1.5}
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
  // minHeight (not height): the graph geometry was tuned for the system
  // font, and Poppins' taller line boxes clipped the last metric row mid
  // glyph. Letting the card grow a few px downward beats truncated values;
  // edge handle points still anchor to the designed rect.
  const cardStyle = useMemo(
    () =>
      StyleSheet.flatten([
        themed.sourceCard,
        {
          left: rect.x,
          top: rect.y,
          width: rect.w,
          minHeight: rect.h,
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
          style={[styles.accentWash, { backgroundColor: accent + '0D' }]}
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
          lineHeight={20}
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
              lineHeight={14}
              semi_bold
              color={scheme.textTertiary}
              numberOfLines={1}
              style={styles.metricLabel}>
              {k.label}
            </AppText>
            <View style={styles.metricValueWrap}>
              <AppText
                fontSize={14}
                lineHeight={18}
                bold
                color={scheme.textPrimary}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.metricValue}>
                {formatSldValue(resolve(k.param))}
              </AppText>
              {k.unit ? (
                <AppText fontSize={10} lineHeight={13} medium color={scheme.textSecondary}>
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
        <AppText
          fontSize={13}
          lineHeight={17}
          bold
          color={scheme.textPrimary}
          numberOfLines={1}>
          {node.data.heading}
        </AppText>
        {primary ? (
          <AppText
            fontSize={11}
            lineHeight={14}
            color={scheme.textSecondary}
            numberOfLines={1}>
            {formatSldValue(resolve(primary.param))}
            {primary.unit ? ` ${primary.unit}` : ''}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});
LogoNodeCard.displayName = 'LogoNodeCard';

/* ─────────── diagram layers ─────────── */

interface DiagramLayerBaseProps {
  graph: SLDGraph;
  bounds: SLDBounds;
  resolve: SLDValueResolver;
}

interface DiagramSkiaLayerProps extends DiagramLayerBaseProps {
  dotColor: string;
  /** Route edges as right-angle Manhattan steps instead of bezier curves. */
  orthogonal: boolean;
  /** Dark theme → use raw source colours; light → darken bright ones. */
  isDark: boolean;
  /** Viewport pan/zoom shared values — owned by `SLDViewport`, replayed here
   *  as a Skia group matrix so the Canvas can stay viewport-sized. */
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  scale: SharedValue<number>;
  /** Corner radius of the viewport the canvas fills — content is clipped to
   *  it inside the canvas, since native `overflow: hidden` doesn't reliably
   *  clip the transformed layers on every platform. 0 = square (fullscreen). */
  clipRadius?: number;
}

/**
 * Skia layer: dot grid + edges + flow animation, absolute-filled to the
 * VIEWPORT rather than the graph frame. The old Canvas covered the full graph
 * bounds (~1960×1020dp ≈ 18MP at 3x) and the clock-driven dash loop
 * invalidated all of it every frame; sizing the surface to the viewport and
 * applying pan/zoom as a canvas matrix shrinks the per-frame raster cost to
 * the visible pixels. Geometry, stroke widths and dot radii all scale through
 * the matrix exactly as they previously scaled through the RN transform.
 */
const DiagramSkiaLayerBase: FC<DiagramSkiaLayerProps> = ({
  graph,
  bounds,
  resolve,
  dotColor,
  orthogonal,
  isDark,
  translateX,
  translateY,
  scale,
  clipRadius = 0,
}) => {
  const { width, height } = bounds;

  const nodeById = useMemo(
    () => new Map(graph.nodes.map(n => [n.id, n])),
    [graph.nodes],
  );

  // De-overlapped rects — MUST be the same map the card layer uses (it
  // computes the identical deterministic result), or arrows detach.
  const nodeRects = useMemo(() => resolveNodeRects(graph, bounds), [graph, bounds]);

  const edges = useMemo(
    () =>
      graph.edges
        .map(edge => {
          const s = nodeById.get(edge.source);
          const t = nodeById.get(edge.target);
          const sr = nodeRects.get(edge.source);
          const tr = nodeRects.get(edge.target);
          if (!s || !t || !sr || !tr) return null;
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
    [graph.edges, nodeById, nodeRects, resolve, orthogonal, isDark],
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

  // Dot grid as ONE SkPath → a single render-tree node instead of ~450
  // <SkiaCircle>s the renderer re-walked every animation frame. Dots never
  // overlap, so one fill is pixel-identical to the per-circle version.
  const dotGrid = useMemo<SkPath>(() => {
    const path = Skia.Path.Make();
    for (let y = DOT_SPACING; y < height; y += DOT_SPACING) {
      for (let x = DOT_SPACING; x < width; x += DOT_SPACING) {
        path.addCircle(x, y, DOT_RADIUS);
      }
    }
    return path;
  }, [width, height]);

  // Measured canvas (= viewport content box) size. Until the first layout the
  // Canvas has no surface to draw into anyway, so gating the scene on the
  // measurement costs nothing visible.
  const [frame, setFrame] = useState<{ w: number; h: number } | null>(null);
  const onCanvasLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setFrame(prev => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  // Replicates the RN node-card layer's transform chain exactly, folded into
  // ONE SkMatrix per frame:
  //   p' = frameOffset + C + T + s·(p − C)
  // i.e. the centre-layout offset of the bounds frame inside the viewport,
  // then RN's centre-origin [translate, scale] semantics.
  //
  // ⚠️ Must stay a single `matrix` prop. The previous implementation animated
  // a `transform` ARRAY (rebuilt per frame by a derived value) on a Group
  // with an `origin` — RN Skia 1.x's composite-prop interop races between
  // the UI and render threads at pinch frequency and crashes on device. A
  // matrix host object is the library's blessed animated-transform path
  // (its own gesture examples use it).
  const offX = frame ? (frame.w - width) / 2 : 0;
  const offY = frame ? (frame.h - height) / 2 : 0;
  const cx = width / 2;
  const cy = height / 2;
  const viewMatrix = useDerivedValue(() => {
    const m = Skia.Matrix();
    // Ops pre-concatenate: the first call applies LAST to a point, so this
    // reads bottom-up — un-centre, scale, then offset + centre + pan.
    m.translate(offX + cx + translateX.value, offY + cy + translateY.value);
    m.scale(scale.value, scale.value);
    m.translate(-cx, -cy);
    return m;
  }, [offX, offY, cx, cy]);

  // Skia clock → animated dash offset, shared by every flow edge.
  const clock = useClock();
  const dashPhase = useDerivedValue(() => -(clock.value / 1000) * DASH_SPEED);

  // Clip in canvas space (OUTSIDE the pan/zoom matrix) so edges/dots can
  // never draw past the viewport's rounded frame.
  const clipShape = useMemo(
    () =>
      frame ? skRRect(skRect(0, 0, frame.w, frame.h), clipRadius, clipRadius) : null,
    [frame, clipRadius],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} onLayout={onCanvasLayout}>
      {frame && clipShape ? (
        <Group clip={clipShape}>
          <Group matrix={viewMatrix}>
            <SkiaPath path={dotGrid} color={dotColor} opacity={DOT_OPACITY} />
            {skEdges.map(e =>
              e.animated ? (
                <FlowEdge
                  key={e.id}
                  edge={e}
                  dashPhase={dashPhase}
                  clock={clock}
                />
              ) : (
                <IdleEdge key={e.id} edge={e} />
              ),
            )}
          </Group>
        </Group>
      ) : null}
    </Canvas>
  );
};

export const DiagramSkiaLayer = memo(DiagramSkiaLayerBase);
DiagramSkiaLayer.displayName = 'DiagramSkiaLayer';

/**
 * RN layer: the source/logo node cards, positioned in graph space. Hosted by
 * `SLDViewport` inside the pan/zoom `Animated.View` (bounds-sized frame), so
 * card layout, text and touch behaviour are untouched by the Skia-layer split.
 */
const DiagramNodeLayerBase: FC<DiagramLayerBaseProps> = ({
  graph,
  bounds,
  resolve,
}) => {
  // Same deterministic de-overlap pass as the Skia edge layer — the two maps
  // are identical by construction, keeping arrows anchored to their cards.
  const nodeRects = useMemo(() => resolveNodeRects(graph, bounds), [graph, bounds]);

  const nodes = useMemo(
    () =>
      graph.nodes.map(node => ({
        node,
        rect: nodeRects.get(node.id)!,
        logo: isLogoNode(node),
      })),
    [graph.nodes, nodeRects],
  );

  return (
    <>
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

export const DiagramNodeLayer = memo(DiagramNodeLayerBase);
DiagramNodeLayer.displayName = 'DiagramNodeLayer';
