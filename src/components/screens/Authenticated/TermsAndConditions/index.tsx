import React, { FC } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
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
import { duration, space, useScheme } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  FONT_SIZE_XL,
  ICON_SIZE_LG,
} from 'src/utils';
import { Back, TermsIcon } from 'src/assets/icons';

interface TermsSection {
  title: string;
  body: string;
}

const SECTIONS: TermsSection[] = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing and using the Pragmatic Engineering Solutions mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our application.',
  },
  {
    title: 'Use of Service',
    body: 'This application is provided for authorized users to monitor and manage energy systems. You agree to use the service only for its intended purpose and in compliance with all applicable laws and regulations.',
  },
  {
    title: 'User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
  },
  {
    title: 'Data & Privacy',
    body: 'We collect and process energy monitoring data, system performance metrics, and user information as necessary to provide our services. Your data is handled in accordance with our Privacy Policy and applicable data protection regulations.',
  },
  {
    title: 'Intellectual Property',
    body: 'All content, features, and functionality of this application are owned by Pragmatic Engineering Solutions and are protected by intellectual property laws. Unauthorized reproduction or distribution is prohibited.',
  },
  {
    title: 'Limitation of Liability',
    body: 'Pragmatic Engineering Solutions shall not be liable for any indirect, incidental, or consequential damages arising from the use of this application. The monitoring data provided is for informational purposes and should not be the sole basis for critical operational decisions.',
  },
  {
    title: 'Modifications',
    body: 'We reserve the right to modify these Terms and Conditions at any time. Continued use of the application after changes constitutes acceptance of the updated terms.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about these Terms and Conditions, please contact us at info@pragmaticeng.com.',
  },
];

const enter = (i: number) =>
  FadeInDown.delay(120 + i * 60)
    .duration(duration.base)
    .springify()
    .damping(18);

const TermsAndConditions: FC = () => {
  const navigation = useNavigation();
  const scheme = useScheme();

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
          Terms & Conditions
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
                  LEGAL
                </OverlineLabel>
              </HeroLiveBadge>
              <GlassChip>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  bold
                  color={scheme.heroOnGradient}>
                  Updated Feb 2026
                </AppText>
              </GlassChip>
            </HeroTopRow>

            <View style={styles.heroBody}>
              <View style={styles.heroIcon}>
                <TermsIcon size={ICON_SIZE_LG} color={scheme.heroOnGradient} />
              </View>
              <AppText
                fontSize={FONT_SIZE_XL}
                bold
                color={scheme.heroOnGradient}>
                Terms & Conditions
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={scheme.heroOnGradientMuted}
                lineHeight={18}>
                Please review these terms carefully before using the Pragmatic
                Energy Solution application.
              </AppText>
            </View>
          </HeroGradientCard>
        </Animated.View>

        {SECTIONS.map((section, i) => (
          <Animated.View key={section.title} entering={enter(i)}>
            <Surface elevation="md" radius="xl" padding={space.lg} bordered>
              <View style={styles.cardRow}>
                <IconWell color={scheme.brand} size={36} radius={12}>
                  <AppText
                    fontSize={FONT_SIZE_SM}
                    bold
                    color={scheme.brand}>
                    {i + 1}
                  </AppText>
                </IconWell>
                <AppText
                  fontSize={FONT_SIZE_SM}
                  bold
                  color={scheme.textPrimary}
                  style={styles.cardTitle}>
                  {section.title}
                </AppText>
              </View>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={scheme.textSecondary}
                lineHeight={20}
                style={styles.cardBody}>
                {section.body}
              </AppText>
            </Surface>
          </Animated.View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space.md },
  heroBody: { marginTop: space.lg, gap: 8 },
  heroIcon: { marginBottom: 2 },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: { flex: 1 },
  cardBody: { marginTop: 12 },
});

export default TermsAndConditions;
