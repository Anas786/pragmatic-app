import React, { FC, useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  GlassChip,
  HeroGradientCard,
  HeroTopRow,
  OverlineLabel,
  PESLogo,
  ScreenContainer,
  ScreenHeader,
  Surface,
} from 'src/components/common';
import {
  duration,
  glass,
  radius,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { IconProps } from 'src/types';
import { APP_VERSION_LABEL } from 'src/utils/constants/app';
import { COMPANY_NAME } from 'src/utils/constants/company';
import { ICON_SIZE_MD } from 'src/utils/theme';
import { EyeIcon, SproutIcon, Users } from 'src/assets/icons';

interface AboutSection {
  Icon: FC<IconProps>;
  title: string;
  body: string;
}

const SECTIONS: AboutSection[] = [
  {
    Icon: Users,
    title: 'Who we are',
    body: `${COMPANY_NAME} is a leading provider of energy management and monitoring systems. We design intelligent solutions for solar, wind, battery storage, and grid integration that empower businesses to optimize energy usage and reduce costs.`,
  },
  {
    Icon: SproutIcon,
    title: 'Our mission',
    body: 'To deliver innovative, reliable, and sustainable energy solutions that drive operational efficiency and environmental stewardship for industries worldwide.',
  },
  {
    Icon: EyeIcon,
    title: 'Our vision',
    body: 'A future where every industry operates on clean, efficient, and intelligently managed energy systems — contributing to a greener planet.',
  },
];

/** Long-form reading text may grow further than UI text (1.3×). */
const LONG_FORM_MAX_SCALE = 1.6;
/** Entrance stagger cap (§19) — later blocks mount without animation. */
const ANIM_LIMIT = 6;
const LOGO_W = 44;
const LOGO_H = 21;
const COPYRIGHT = `© ${new Date().getFullYear()} ${COMPANY_NAME}`;

const enter = (i: number) =>
  i < ANIM_LIMIT
    ? FadeInDown.delay(80 + i * 80)
        .duration(duration.base)
        .springify()
        .damping(18)
    : undefined;

const AboutUs: FC = () => {
  const navigation = useNavigation();
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <ScreenHeader title="About" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={FadeInDown.duration(duration.base).springify().damping(18)}>
          <HeroGradientCard>
            <HeroTopRow>
              <OverlineLabel color={scheme.heroOnGradient}>About</OverlineLabel>
              <GlassChip>
                <AppText variant="caption" semi_bold tone="onHero">
                  {APP_VERSION_LABEL}
                </AppText>
              </GlassChip>
            </HeroTopRow>

            <View style={styles.heroBody}>
              {/* White-ink vector mark straight on the glass well: the
                  bundled logo.png is light-background artwork and
                  disappears on the dark gradient. */}
              <View style={styles.logoWell}>
                <PESLogo width={LOGO_W} height={LOGO_H} tone="dark" />
              </View>
              <AppText variant="h2" tone="onHero" accessibilityRole="header">
                {COMPANY_NAME}
              </AppText>
              <AppText variant="bodySm" tone="onHeroMuted">
                Intelligent energy management for solar, wind, storage & grid.
              </AppText>
            </View>
          </HeroGradientCard>
        </Animated.View>

        {SECTIONS.map(({ Icon, title, body }, i) => (
          <Animated.View key={title} entering={enter(i)}>
            <Surface elevation="sm" radius="xl" padding={space.lg} bordered>
              <View style={styles.cardRow}>
                <View style={themed.iconWell}>
                  <Icon size={ICON_SIZE_MD} color={scheme.brandText} />
                </View>
                <AppText
                  variant="bodyLg"
                  semi_bold
                  accessibilityRole="header"
                  maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}
                  style={styles.cardTitle}>
                  {title}
                </AppText>
              </View>
              <AppText
                variant="body"
                tone="secondary"
                lineHeight={22}
                maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}
                style={styles.cardBody}>
                {body}
              </AppText>
            </Surface>
          </Animated.View>
        ))}

        <Animated.View entering={enter(SECTIONS.length)}>
          <AppText center variant="caption" tone="tertiary">
            {COPYRIGHT}
          </AppText>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space['3xl'],
    gap: space.lg,
  },
  heroBody: {
    marginTop: space.lg,
    gap: space.sm,
  },
  logoWell: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: glass.medium,
    borderWidth: 1,
    borderColor: glass.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cardTitle: { flex: 1 },
  cardBody: { marginTop: space.md },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    iconWell: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: scheme.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default AboutUs;
