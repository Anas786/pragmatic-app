import React, { FC, useMemo } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  GlassChip,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  IconButton,
  IconWell,
  OverlineLabel,
  ScreenContainer,
  Surface,
  TopBar,
} from 'src/components/common';
import { Logo } from 'src/assets';
import { duration, energyPalette, glass, space, useScheme } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  FONT_SIZE_XXL,
  ICON_SIZE_LG,
  ICON_SIZE_MD,
} from 'src/utils';
import { Back, EyeIcon, SproutIcon, Users } from 'src/assets/icons';
import { IconProps } from 'src/types';

interface AboutSection {
  Icon: FC<IconProps>;
  color: string;
  title: string;
  body: string;
}

const SOURCE_CHIPS = ['Solar', 'Wind', 'Grid', 'Battery'];

const enter = (i: number) =>
  FadeInDown.delay(80 + i * 80)
    .duration(duration.base)
    .springify()
    .damping(18);

const AboutUs: FC = () => {
  const navigation = useNavigation();
  const scheme = useScheme();

  const sections = useMemo<AboutSection[]>(
    () => [
      {
        Icon: Users,
        color: scheme.brand,
        title: 'Who We Are',
        body: 'Pragmatic Engineering Solutions is a leading provider of energy management and monitoring systems. We design intelligent solutions for solar, wind, battery storage, and grid integration that empower businesses to optimize energy usage and reduce costs.',
      },
      {
        Icon: SproutIcon,
        color: energyPalette.solar,
        title: 'Our Mission',
        body: 'To deliver innovative, reliable, and sustainable energy solutions that drive operational efficiency and environmental stewardship for industries worldwide.',
      },
      {
        Icon: EyeIcon,
        color: energyPalette.wind,
        title: 'Our Vision',
        body: 'A future where every industry operates on clean, efficient, and intelligently managed energy systems — contributing to a greener planet.',
      },
    ],
    [scheme.brand],
  );

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <TopBar>
        <IconButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back">
          <Back size={ICON_SIZE_LG} color={scheme.textPrimary} />
        </IconButton>
        <AppText fontSize={FONT_SIZE_MD} bold color={scheme.textPrimary}>
          About Us
        </AppText>
        <View style={styles.headerSpacer} />
      </TopBar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.duration(duration.base).springify().damping(18)}>
          <HeroGradientCard>
            <HeroTopRow>
              <HeroLiveBadge>
                <OverlineLabel color={scheme.heroOnGradient}>
                  ABOUT
                </OverlineLabel>
              </HeroLiveBadge>
              <GlassChip>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  bold
                  color={scheme.heroOnGradient}>
                  v1.0.0
                </AppText>
              </GlassChip>
            </HeroTopRow>

            <View style={styles.heroBody}>
              <View style={styles.logoWell}>
                <Image
                  source={Logo}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <AppText
                fontSize={FONT_SIZE_XXL}
                bold
                color={scheme.heroOnGradient}
                style={styles.heroTitle}>
                Pragmatic Engineering Solutions
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={scheme.heroOnGradientMuted}
                lineHeight={18}>
                Intelligent energy management for solar, wind, storage & grid.
              </AppText>
            </View>

            <View style={styles.chipRow}>
              {SOURCE_CHIPS.map(chip => (
                <GlassChip key={chip}>
                  <AppText
                    fontSize={FONT_SIZE_XXS}
                    medium
                    color={scheme.heroOnGradient}>
                    {chip}
                  </AppText>
                </GlassChip>
              ))}
            </View>
          </HeroGradientCard>
        </Animated.View>

        {sections.map(({ Icon, color, title, body }, i) => (
          <Animated.View key={title} entering={enter(i)}>
            <Surface elevation="md" radius="xl" padding={space.lg} bordered>
              <View style={styles.cardRow}>
                <IconWell color={color} size={44} radius={14}>
                  <Icon size={ICON_SIZE_MD} color={color} />
                </IconWell>
                <AppText
                  fontSize={FONT_SIZE_SM}
                  bold
                  color={scheme.textPrimary}
                  style={styles.cardTitle}>
                  {title}
                </AppText>
              </View>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={scheme.textSecondary}
                lineHeight={20}
                style={styles.cardBody}>
                {body}
              </AppText>
            </Surface>
          </Animated.View>
        ))}

        <Animated.View entering={enter(sections.length)}>
          <AppText
            center
            fontSize={FONT_SIZE_XXS}
            color={scheme.textTertiary}>
            Pragmatic Energy Solution · All rights reserved
          </AppText>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space.lg },
  heroBody: {
    marginTop: space.lg,
    gap: 8,
  },
  logoWell: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: glass.strong,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logo: { width: 42, height: 30 },
  heroTitle: { marginTop: 2 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: space.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: { flex: 1 },
  cardBody: { marginTop: 12 },
});

export default AboutUs;
