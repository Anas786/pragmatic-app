import React, { FC } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  IconButton,
  ScreenContainer,
  Surface,
  TopBar,
} from 'src/components/common';
import { space, useScheme } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  ICON_SIZE_LG,
} from 'src/utils';
import { Back } from 'src/assets/icons';

interface SectionProps {
  title: string;
  body: string;
}

const Section: FC<SectionProps> = ({ title, body }) => {
  const scheme = useScheme();
  return (
    <View style={styles.section}>
      <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
        {title}
      </AppText>
      <AppText
        fontSize={FONT_SIZE_XS}
        color={scheme.textSecondary}
        lineHeight={20}>
        {body}
      </AppText>
    </View>
  );
};

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
        <Surface elevation="md" radius="xl" padding={space.lg} bordered>
          <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary}>
            Last updated: February 2026
          </AppText>
          <Section
            title="1. Acceptance of Terms"
            body="By accessing and using the Pragmatic Engineering Solutions mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our application."
          />
          <Section
            title="2. Use of Service"
            body="This application is provided for authorized users to monitor and manage energy systems. You agree to use the service only for its intended purpose and in compliance with all applicable laws and regulations."
          />
          <Section
            title="3. User Accounts"
            body="You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account."
          />
          <Section
            title="4. Data & Privacy"
            body="We collect and process energy monitoring data, system performance metrics, and user information as necessary to provide our services. Your data is handled in accordance with our Privacy Policy and applicable data protection regulations."
          />
          <Section
            title="5. Intellectual Property"
            body="All content, features, and functionality of this application are owned by Pragmatic Engineering Solutions and are protected by intellectual property laws. Unauthorized reproduction or distribution is prohibited."
          />
          <Section
            title="6. Limitation of Liability"
            body="Pragmatic Engineering Solutions shall not be liable for any indirect, incidental, or consequential damages arising from the use of this application. The monitoring data provided is for informational purposes and should not be the sole basis for critical operational decisions."
          />
          <Section
            title="7. Modifications"
            body="We reserve the right to modify these Terms and Conditions at any time. Continued use of the application after changes constitutes acceptance of the updated terms."
          />
          <Section
            title="8. Contact"
            body="If you have questions about these Terms and Conditions, please contact us at info@pragmatic.com."
          />
        </Surface>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg },
  section: { gap: space.xs },
});

export default TermsAndConditions;
