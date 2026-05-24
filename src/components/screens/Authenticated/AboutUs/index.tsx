import React, { FC } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  IconButton,
  ScreenContainer,
  Surface,
  TopBar,
} from 'src/components/common';
import { Logo } from 'src/assets';
import { space, useScheme } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
} from 'src/utils';
import { Back } from 'src/assets/icons';

interface ContentCardProps {
  title: string;
  body: string;
}

const ContentCard: FC<ContentCardProps> = ({ title, body }) => {
  const scheme = useScheme();
  return (
    <Surface elevation="md" radius="xl" padding={space.lg} bordered>
      <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textPrimary}>
        {title}
      </AppText>
      <AppText
        fontSize={FONT_SIZE_XS}
        color={scheme.textSecondary}
        lineHeight={20}>
        {body}
      </AppText>
    </Surface>
  );
};

const AboutUs: FC = () => {
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
          About Us
        </AppText>
        <View style={styles.headerSpacer} />
      </TopBar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
          <AppText fontSize={FONT_SIZE_MD} bold color={scheme.textPrimary}>
            Pragmatic Engineering Solutions
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
            Version 1.0.0
          </AppText>
        </View>

        <ContentCard
          title="Who We Are"
          body="Pragmatic Engineering Solutions is a leading provider of energy management and monitoring systems. We specialize in designing intelligent solutions for solar, wind, battery storage, and grid integration that empower businesses to optimize energy usage and reduce costs."
        />
        <ContentCard
          title="Our Mission"
          body="To deliver innovative, reliable, and sustainable energy solutions that drive operational efficiency and environmental stewardship for industries worldwide."
        />
        <ContentCard
          title="Our Vision"
          body="A future where every industry operates on clean, efficient, and intelligently managed energy systems, contributing to a greener planet."
        />
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space.xl },
  logoSection: {
    alignItems: 'center',
    paddingVertical: space['2xl'],
    gap: 10,
  },
  logo: { width: 60, height: 40 },
});

export default AboutUs;
