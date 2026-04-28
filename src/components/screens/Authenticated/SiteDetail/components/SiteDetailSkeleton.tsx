import React, { FC, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useThemeStore } from 'src/hooks';
import { normalizeHeight, normalizeWidth, ThemeColors } from 'src/utils';

/**
 * Skeleton placeholder shown on SiteDetail while the live-data and
 * site-config queries are loading for the first time. Mimics the rough
 * shape of <SummaryView> (two stacked metric cards + a wider diagram
 * block) with a pulsing-opacity shimmer so users perceive activity.
 *
 * Animation runs on the native driver — no JS-thread cost while the
 * network calls are in flight.
 */
const SiteDetailSkeleton: FC = () => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const Block: FC<{ height: number; width?: number | string }> = ({
    height,
    width = '100%',
  }) => (
    <Animated.View
      style={[
        styles.block,
        { height, width: width as any, opacity: pulse },
      ]}
    />
  );

  return (
    <View style={styles.container} accessibilityLabel="Loading site data">
      {/* Card placeholder — Yield */}
      <View style={styles.card}>
        <Block height={normalizeHeight(14)} width={normalizeWidth(120)} />
        <View style={styles.row}>
          <Block height={normalizeHeight(60)} width="32%" />
          <Block height={normalizeHeight(60)} width="32%" />
          <Block height={normalizeHeight(60)} width="32%" />
        </View>
      </View>

      {/* Card placeholder — Environmental Benefits */}
      <View style={styles.card}>
        <Block height={normalizeHeight(14)} width={normalizeWidth(180)} />
        <View style={styles.row}>
          <Block height={normalizeHeight(60)} width="48%" />
          <Block height={normalizeHeight(60)} width="48%" />
        </View>
      </View>

      {/* Diagram placeholder */}
      <View style={styles.card}>
        <Block height={normalizeHeight(14)} width={normalizeWidth(140)} />
        <Block height={normalizeHeight(220)} />
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: normalizeHeight(12),
    },
    card: {
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      padding: normalizeWidth(12),
      gap: normalizeHeight(12),
    },
    row: {
      flexDirection: 'row',
      gap: normalizeWidth(8),
    },
    block: {
      backgroundColor: colors.inputDarkBorder,
      borderRadius: 8,
    },
  });

export default SiteDetailSkeleton;
