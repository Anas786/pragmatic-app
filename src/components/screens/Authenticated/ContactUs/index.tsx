import React, { FC, useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppText } from "src/components/common";
import { useThemeStore } from "src/hooks/useThemeStore";
import {
  ACCENT_GREEN,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from "src/utils";
import { Back, EmailPlainIcon, MapMarkerIcon, PhoneIcon, WebIcon } from "src/assets/icons";
import { IconProps } from "src/types";

const ContactUs: FC = () => {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const ContactCard: FC<{
    IconComponent: FC<IconProps>;
    iconColor?: string;
    title: string;
    value: string;
    subtitle?: string;
  }> = ({ IconComponent, iconColor = ACCENT_GREEN, title, value, subtitle }) => (
    <View style={styles.contactCard}>
      <View style={[styles.contactIconWrap, { borderColor: iconColor }]}>
        <IconComponent size={ICON_SIZE_LG} color={iconColor} />
      </View>
      <View style={styles.contactText}>
        <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
          {title}
        </AppText>
        <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
          {value}
        </AppText>
        {subtitle ? (
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.splashBg}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Back size={ICON_SIZE_LG} color={colors.primaryText} />
        </TouchableOpacity>
        <AppText fontSize={FONT_SIZE_MD} bold color={colors.primaryText}>
          Contact Us
        </AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <AppText
          fontSize={FONT_SIZE_XS}
          color={colors.textSecondary}
          center
          lineHeight={18}>
          Have questions or need support? Reach out to us through any of the
          channels below.
        </AppText>

        <View style={styles.cardGroup}>
          <ContactCard
            IconComponent={EmailPlainIcon}
            title="Email"
            value="info@pragmatic.com"
            subtitle="We typically respond within 24 hours"
          />
          <ContactCard
            IconComponent={PhoneIcon}
            title="Phone"
            value="+92 300 1234567"
            subtitle="Mon - Fri, 9:00 AM - 6:00 PM"
          />
          <ContactCard
            IconComponent={MapMarkerIcon}
            title="Office Address"
            value="Pragmatic Engineering Solutions"
            subtitle="Lahore, Punjab, Pakistan"
          />
          <ContactCard IconComponent={WebIcon} title="Website" value="www.pragmatic.com" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.splashBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputDarkBorder,
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(14),
    },
    backBtn: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      alignItems: "center",
      justifyContent: "center",
    },
    scroll: { flex: 1 },
    scrollContent: {
      padding: normalizeWidth(16),
      gap: normalizeHeight(20),
      paddingTop: normalizeHeight(24),
    },
    cardGroup: { gap: normalizeHeight(12) },
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16),
      padding: normalizeWidth(16),
      gap: normalizeWidth(14),
    },
    contactIconWrap: {
      width: normalizeWidth(48),
      height: normalizeWidth(48),
      borderRadius: normalizeWidth(12),
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    contactText: { flex: 1, gap: normalizeHeight(2) },
  });

export default ContactUs;
