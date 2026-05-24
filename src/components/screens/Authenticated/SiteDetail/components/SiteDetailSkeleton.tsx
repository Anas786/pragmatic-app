import React, { FC, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Skeleton, Surface, createBox } from 'src/components/common';
import {
  duration,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';

const HERO_HEIGHT = 188;
const ENV_TILE_HEIGHT = 130;
const SLD_HEIGHT = 220;
const TAB_PILL_WIDTHS = [88, 78, 70, 86, 78, 92, 84];

const stagger = (i: number) =>
  FadeInDown.delay(60 * i).duration(duration.slow).springify().damping(22);

const SiteDetailSkeleton: FC = () => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  return (
    <Container accessibilityLabel="Loading site data">
      {/* Tab strip */}
      <Animated.View entering={stagger(0)}>
        <TabStrip>
          {TAB_PILL_WIDTHS.map((w, i) => (
            <Skeleton key={i} width={w} height={36} radius="pill" />
          ))}
        </TabStrip>
      </Animated.View>

      {/* Hero card — large rounded surface mirroring HeroGradientCard */}
      <Animated.View entering={stagger(1)}>
        <Surface
          elevation="md"
          radius="2xl"
          background={scheme.surface}
          padding={space.xl}
          style={themed.heroCard}>
          <HeroTopRow>
            <HeroTopLeft>
              <Skeleton width={84} height={10} radius="pill" />
              <Skeleton width={48} height={10} radius="pill" />
            </HeroTopLeft>
            <Skeleton width={64} height={28} radius="pill" />
          </HeroTopRow>

          <HeroValueBlock>
            <Skeleton width={64} height={10} radius="pill" />
            <Skeleton width="62%" height={36} radius="md" />
          </HeroValueBlock>

          <View style={themed.heroDivider} />

          <HeroBottomRow>
            <HeroBottomLeft>
              <Skeleton width={36} height={36} radius="md" />
              <HeroBottomLeftText>
                <Skeleton width={70} height={9} radius="pill" />
                <Skeleton width={48} height={9} radius="pill" />
              </HeroBottomLeftText>
            </HeroBottomLeft>
            <Skeleton width={96} height={20} radius="md" />
          </HeroBottomRow>
        </Surface>
      </Animated.View>

      {/* Env impact tiles */}
      <Animated.View entering={stagger(2)}>
        <EnvRow>
          <EnvTile scheme={scheme}>
            <EnvTileBody />
          </EnvTile>
          <EnvTile scheme={scheme}>
            <EnvTileBody />
          </EnvTile>
          <EnvTile scheme={scheme}>
            <EnvTileBody />
          </EnvTile>
        </EnvRow>
      </Animated.View>

      {/* SLD / Energy Flow card */}
      <Animated.View entering={stagger(3)}>
        <Surface
          elevation="md"
          radius="2xl"
          background={scheme.surface}
          padding={space.lg}
          style={styles.sldCard}>
          <SldHeader>
            <SldHeaderLeft>
              <Skeleton width={120} height={14} radius="pill" />
              <Skeleton width={72} height={9} radius="pill" />
            </SldHeaderLeft>
            <Skeleton width={56} height={20} radius="pill" />
          </SldHeader>
          <Skeleton width="100%" height={SLD_HEIGHT} radius="lg" />
        </Surface>
      </Animated.View>
    </Container>
  );
};

interface EnvTileProps {
  children?: ReactNode;
  scheme: Scheme;
}

const EnvTile: FC<EnvTileProps> = ({ children, scheme }) => (
  <Surface
    elevation="sm"
    radius="xl"
    background={scheme.surface}
    padding={space.md}
    style={styles.envTile}>
    {children}
  </Surface>
);

const EnvTileBody: FC = () => (
  <>
    <Skeleton width={28} height={28} radius="md" />
    <View style={styles.envTileSpacer} />
    <Skeleton width="68%" height={20} radius="md" />
    <View style={styles.envTileGap} />
    <Skeleton width="48%" height={10} radius="pill" />
  </>
);

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  tabStrip: {
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  heroValueBlock: {
    marginTop: space.lg,
    gap: space.sm,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flex: 1,
  },
  heroBottomLeftText: {
    gap: 6,
  },
  envRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  envTile: {
    flex: 1,
    minHeight: ENV_TILE_HEIGHT,
  },
  envTileSpacer: {
    flex: 1,
  },
  envTileGap: {
    height: space.xs,
  },
  sldCard: {
    gap: space.md,
  },
  sldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sldHeaderLeft: {
    gap: 6,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    heroCard: {
      minHeight: HERO_HEIGHT,
      borderWidth: 1,
      borderColor: scheme.hairline,
    },
    heroDivider: {
      height: 1,
      marginVertical: space.lg,
      backgroundColor: scheme.hairline,
    },
  });

const Container = createBox(styles.container, 'Container');
const TabStrip = createBox(styles.tabStrip, 'TabStrip');
const HeroTopRow = createBox(styles.heroTopRow, 'HeroTopRow');
const HeroTopLeft = createBox(styles.heroTopLeft, 'HeroTopLeft');
const HeroValueBlock = createBox(styles.heroValueBlock, 'HeroValueBlock');
const HeroBottomRow = createBox(styles.heroBottomRow, 'HeroBottomRow');
const HeroBottomLeft = createBox(styles.heroBottomLeft, 'HeroBottomLeft');
const HeroBottomLeftText = createBox(
  styles.heroBottomLeftText,
  'HeroBottomLeftText',
);
const EnvRow = createBox(styles.envRow, 'EnvRow');
const SldHeader = createBox(styles.sldHeader, 'SldHeader');
const SldHeaderLeft = createBox(styles.sldHeaderLeft, 'SldHeaderLeft');

export default SiteDetailSkeleton;
