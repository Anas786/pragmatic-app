import React, { FC, useMemo } from 'react';
import {
  ScrollView, StatusBar, StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText } from 'src/components/common';
import { useThemeStore } from 'src/hooks/useThemeStore';
import {
  FONT_SIZE_MD, FONT_SIZE_SM, FONT_SIZE_XS,
  ICON_SIZE_LG, normalizeHeight, normalizeWidth, ThemeColors,
} from 'src/utils';

const TermsAndConditions: FC = () => {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const Section: FC<{ title: string; body: string }> = ({ title, body }) => (
    <View style={styles.section}>
      <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>{title}</AppText>
      <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary} lineHeight={20}>{body}</AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.splashBg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={ICON_SIZE_LG} color={colors.primaryText} />
        </TouchableOpacity>
        <AppText fontSize={FONT_SIZE_MD} bold color={colors.primaryText}>Terms & Conditions</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>Last updated: February 2026</AppText>
          <Section title="1. Acceptance of Terms" body="By accessing and using the Pragmatic Engineering Solutions mobile application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our application." />
          <Section title="2. Use of Service" body="This application is provided for authorized users to monitor and manage energy systems. You agree to use the service only for its intended purpose and in compliance with all applicable laws and regulations." />
          <Section title="3. User Accounts" body="You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account." />
          <Section title="4. Data & Privacy" body="We collect and process energy monitoring data, system performance metrics, and user information as necessary to provide our services. Your data is handled in accordance with our Privacy Policy and applicable data protection regulations." />
          <Section title="5. Intellectual Property" body="All content, features, and functionality of this application are owned by Pragmatic Engineering Solutions and are protected by intellectual property laws. Unauthorized reproduction or distribution is prohibited." />
          <Section title="6. Limitation of Liability" body="Pragmatic Engineering Solutions shall not be liable for any indirect, incidental, or consequential damages arising from the use of this application. The monitoring data provided is for informational purposes and should not be the sole basis for critical operational decisions." />
          <Section title="7. Modifications" body="We reserve the right to modify these Terms and Conditions at any time. Continued use of the application after changes constitutes acceptance of the updated terms." />
          <Section title="8. Contact" body="If you have questions about these Terms and Conditions, please contact us at info@pragmatic.com." />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.splashBg },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.inputDarkBorder,
      paddingHorizontal: normalizeWidth(12), paddingVertical: normalizeHeight(14),
    },
    backBtn: { width: normalizeWidth(36), height: normalizeWidth(36), alignItems: 'center', justifyContent: 'center' },
    scroll: { flex: 1 },
    scrollContent: { padding: normalizeWidth(16) },
    card: {
      backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16), padding: normalizeWidth(16), gap: normalizeHeight(16),
    },
    section: { gap: normalizeHeight(6) },
  });

export default TermsAndConditions;
