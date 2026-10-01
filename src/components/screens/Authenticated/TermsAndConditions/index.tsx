import React, { FC, Fragment, useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  ScreenContainer,
  ScreenHeader,
  Surface,
} from 'src/components/common';
import { duration, Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import {
  APP_DISPLAY_NAME,
  COMPANY_NAME,
  LEGAL_UPDATED_AT,
  SUPPORT_EMAIL,
} from 'src/utils/constants/company';

interface TermsSection {
  title: string;
  body: string;
}

const SECTIONS: TermsSection[] = [
  {
    title: 'Acceptance of Terms',
    body: `By accessing and using the ${COMPANY_NAME} mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our application.`,
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
    body: `All content, features, and functionality of this application are owned by ${COMPANY_NAME} and are protected by intellectual property laws. Unauthorized reproduction or distribution is prohibited.`,
  },
  {
    title: 'Limitation of Liability',
    body: `${COMPANY_NAME} shall not be liable for any indirect, incidental, or consequential damages arising from the use of this application. The monitoring data provided is for informational purposes and should not be the sole basis for critical operational decisions.`,
  },
  {
    title: 'Modifications',
    body: 'We reserve the right to modify these Terms and Conditions at any time. Continued use of the application after changes constitutes acceptance of the updated terms.',
  },
  {
    title: 'Contact',
    body: `If you have questions about these Terms and Conditions, please contact us at ${SUPPORT_EMAIL}.`,
  },
];

/** Long-form reading text may grow further than UI text (1.3×). */
const LONG_FORM_MAX_SCALE = 1.6;

/**
 * Terms & Conditions — one reading document: a "Last updated" meta line,
 * then numbered sections (semi-bold 16 headings with the header role,
 * 14/22 body) separated by hairlines. Reachable from the drawer
 * (DashboardStack) and from the Login footer (Onboarding stack); Back
 * returns to whichever pushed it.
 */
const TermsAndConditions: FC = () => {
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

      <ScreenHeader title="Terms & Conditions" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.meta}>
          <AppText
            variant="caption"
            tone="secondary"
            maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}>
            Last updated {LEGAL_UPDATED_AT}
          </AppText>
          <AppText
            variant="body"
            tone="secondary"
            lineHeight={22}
            maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}>
            Please review these terms carefully before using the{' '}
            {APP_DISPLAY_NAME} application.
          </AppText>
        </View>

        <Animated.View
          entering={FadeInDown.duration(duration.base).springify().damping(18)}>
          <Surface elevation="sm" radius="xl" padding={space.lg} bordered>
            {SECTIONS.map((section, i) => (
              <Fragment key={section.title}>
                {i > 0 ? <View style={themed.divider} /> : null}
                <View style={styles.section}>
                  <AppText
                    variant="bodyLg"
                    semi_bold
                    accessibilityRole="header"
                    maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}>
                    {`${i + 1}. ${section.title}`}
                  </AppText>
                  <AppText
                    variant="body"
                    tone="secondary"
                    lineHeight={22}
                    maxFontSizeMultiplier={LONG_FORM_MAX_SCALE}>
                    {section.body}
                  </AppText>
                </View>
              </Fragment>
            ))}
          </Surface>
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
  meta: {
    gap: space.xs,
    paddingHorizontal: space.xs,
  },
  section: {
    gap: space.sm,
    paddingVertical: space.md,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    // `border` (not the 6% `hairline`) so section breaks stay visible on
    // the white light-mode surface.
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: scheme.border,
    },
  });

export default TermsAndConditions;
