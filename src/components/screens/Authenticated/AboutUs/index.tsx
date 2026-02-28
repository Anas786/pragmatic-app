import React, { FC, useMemo } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AppText } from "src/components/common";
import { Logo } from "src/assets";
import { useThemeStore } from "src/hooks/useThemeStore";
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from "src/utils";
import { Back } from "src/assets/icons";

const AboutUs: FC = () => {
  const navigation = useNavigation();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
          About Us
        </AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          <AppText fontSize={FONT_SIZE_MD} bold color={colors.primaryText}>
            Pragmatic Engineering Solutions
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            Version 1.0.0
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
            Who We Are
          </AppText>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            lineHeight={20}>
            Pragmatic Engineering Solutions is a leading provider of energy
            management and monitoring systems. We specialize in designing
            intelligent solutions for solar, wind, battery storage, and grid
            integration that empower businesses to optimize energy usage and
            reduce costs.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
            Our Mission
          </AppText>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            lineHeight={20}>
            To deliver innovative, reliable, and sustainable energy solutions
            that drive operational efficiency and environmental stewardship for
            industries worldwide.
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText fontSize={FONT_SIZE_SM} bold color={colors.primaryText}>
            Our Vision
          </AppText>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            lineHeight={20}>
            A future where every industry operates on clean, efficient, and
            intelligently managed energy systems, contributing to a greener
            planet.
          </AppText>
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
    scrollContent: { padding: normalizeWidth(16), gap: normalizeHeight(20) },
    logoSection: {
      alignItems: "center",
      paddingVertical: normalizeHeight(24),
      gap: normalizeHeight(10),
    },
    logo: { width: normalizeWidth(60), height: normalizeHeight(40) },
    card: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: normalizeWidth(16),
      padding: normalizeWidth(16),
      gap: normalizeHeight(10),
    },
  });

export default AboutUs;
