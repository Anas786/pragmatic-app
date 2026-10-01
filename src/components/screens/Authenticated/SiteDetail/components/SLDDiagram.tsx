import React, { FC, useCallback, useState } from 'react';
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
import { FONT_SIZE_XS, normalizeHeight, normalizeWidth } from 'src/utils';
import { DashboardStackParamList } from 'src/types';
import SLDViewport from './SLDViewport';
import { useSldModel } from './useSldModel';

/* ─────────── viewport dimensions (inline) ─────────── */

const { width: SW } = Dimensions.get('window');
const VW = SW - normalizeWidth(24);
const VH = normalizeHeight(480);

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

  // Graph (grouped by energy type or per-unit) + live resolver + bounds —
  // shared with the full-screen route so both show the same mode.
  const { graph, bounds, resolve, mode, setMode, canGroup } = useSldModel(siteId);
  // Pan lock + routing live HERE, not in the viewport: the viewport is
  // remounted (keyed by mode) on every Grouped ⇄ Units switch, and the
  // user's choices must survive it. Opens locked + orthogonal.
  const [locked, setLocked] = useState(true);
  const [orthogonal, setOrthogonal] = useState(true);

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
      {/* Keyed by mode: switching Grouped ⇄ Units remounts the viewport so it
          re-fits to the new graph's bounds (fresh pan/zoom shared values).
          Lock / routing are held above, so they persist across the switch. */}
      <SLDViewport
        key={mode}
        graph={graph}
        bounds={bounds}
        resolve={resolve}
        width={VW}
        height={VH}
        onFullscreen={openFullscreen}
        groupMode={canGroup ? mode : undefined}
        onGroupModeChange={setMode}
        locked={locked}
        onLockedChange={setLocked}
        orthogonal={orthogonal}
        onOrthogonalChange={setOrthogonal}
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
