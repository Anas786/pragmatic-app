import React, { FC, useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from 'src/components/common';
import { Scheme, useScheme, useThemedStyles } from 'src/theme';
import {
  FONT_SIZE_XS,
  getGraphBounds,
  makeLiveResolver,
  normalizeHeight,
  normalizeWidth,
  selectSldGraph,
} from 'src/utils';
import { useSiteConfig, useSiteData } from 'src/hooks';
import { DashboardStackParamList, SLDGraph } from 'src/types';
import SLDViewport from './SLDViewport';

/* ─────────── viewport dimensions (inline) ─────────── */

const { width: SW } = Dimensions.get('window');
const VW = SW - normalizeWidth(24);
const VH = normalizeHeight(480);

const EMPTY_GRAPH: SLDGraph = { nodes: [], edges: [] };

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;
type Nav = NativeStackNavigationProp<DashboardStackParamList>;

const SLDDiagram: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const navigation = useNavigation<Nav>();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId } = route.params;
  // False while the full-screen SLD route is pushed on top. We unmount the
  // inline viewport then so two SLD SVG trees are never alive at once — that
  // doubled tree is what tipped Reanimated's Fabric commit-hook clone over.
  const isFocused = useIsFocused();

  // Graph from `siteConfig.siteComponents.sldV2`; values resolved live from
  // `liveData.live.data.<param>` (same path a `dataStore:"live"` card uses).
  const { data: config } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);

  const graph = useMemo(() => selectSldGraph(config) ?? EMPTY_GRAPH, [config]);
  const resolve = useMemo(() => makeLiveResolver(liveData), [liveData]);
  const bounds = useMemo(() => getGraphBounds(graph), [graph]);

  // Full-screen is a dedicated navigation screen (landscape). It lives in the
  // main React surface — unlike a core <Modal>, which is a separate Fabric
  // surface that crashes Reanimated's commit/mount hooks on this RN version.
  const openFullscreen = useCallback(() => {
    navigation.navigate('SLDFullscreen', { siteId });
  }, [navigation, siteId]);

  if (graph.nodes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={themed.emptyViewport}>
          <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary} center>
            No energy-flow diagram configured for this site.
          </AppText>
        </View>
      </View>
    );
  }

  // Full-screen route is on top → drop the inline SVG/viewport to a static box.
  if (!isFocused) {
    return (
      <View style={styles.container}>
        <View style={themed.emptyViewport} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SLDViewport
        graph={graph}
        bounds={bounds}
        resolve={resolve}
        width={VW}
        height={VH}
        onFullscreen={openFullscreen}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    emptyViewport: {
      width: VW,
      height: VH,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: scheme.surfaceRaised,
      borderWidth: 1,
      borderColor: scheme.border,
      borderRadius: normalizeWidth(16),
    },
  });

export default SLDDiagram;
