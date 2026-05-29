import React, { FC, useMemo } from 'react';
import { Linking, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  HeroGradientCard,
  HeroLiveBadge,
  HeroTopRow,
  IconButton,
  IconWell,
  OverlineLabel,
  PressableScale,
  PulseDot,
  ScreenContainer,
  Surface,
  TopBar,
} from 'src/components/common';
import { energyPalette, duration, space, useScheme } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XL,
  ICON_SIZE_LG,
  ICON_SIZE_SM,
} from 'src/utils';
import {
  Back,
  EmailPlainIcon,
  MapMarkerIcon,
  PhoneIcon,
  RightIcon,
  WebIcon,
} from 'src/assets/icons';
import { IconProps } from 'src/types';

interface ContactItem {
  Icon: FC<IconProps>;
  color: string;
  title: string;
  value: string;
  url: string;
}

interface Office {
  region: string;
  items: ContactItem[];
}

const WEBSITE_URL = 'https://pragmaticeng.com/';

const enter = (i: number) =>
  FadeInDown.delay(120 + i * 70)
    .duration(duration.base)
    .springify()
    .damping(18);

const ContactRow: FC<{ item: ContactItem }> = ({ item }) => {
  const scheme = useScheme();
  const { Icon, color, title, value, url } = item;

  const handlePress = () => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <PressableScale onPress={handlePress} accessibilityLabel={`${title}: ${value}`}>
      <Surface elevation="md" radius="xl" padding={space.lg} bordered>
        <View style={styles.row}>
          <IconWell color={color} size={48} radius={14}>
            <Icon size={ICON_SIZE_LG} color={color} />
          </IconWell>
          <View style={styles.rowText}>
            <OverlineLabel color={scheme.textTertiary}>{title}</OverlineLabel>
            <AppText
              fontSize={FONT_SIZE_SM}
              semi_bold
              color={scheme.textPrimary}
              lineHeight={20}>
              {value}
            </AppText>
          </View>
          <IconWell color={color} size={28} radius={14} alpha="14">
            <RightIcon size={ICON_SIZE_SM} color={color} />
          </IconWell>
        </View>
      </Surface>
    </PressableScale>
  );
};

const ContactUs: FC = () => {
  const navigation = useNavigation();
  const scheme = useScheme();

  const offices = useMemo<Office[]>(
    () => [
      {
        region: 'Pakistan Office',
        items: [
          {
            Icon: MapMarkerIcon,
            color: energyPalette.grid,
            title: 'Location',
            value:
              'Office# B-201 Blossom Trade Center, Gulistan-e-Jauhar, Block 1, Karachi',
            url: 'https://maps.google.com/?q=Blossom+Trade+Center+Gulistan-e-Jauhar+Karachi',
          },
          {
            Icon: PhoneIcon,
            color: energyPalette.genset,
            title: 'Call Us',
            value: '+92 308 4222864',
            url: 'tel:+923084222864',
          },
          {
            Icon: EmailPlainIcon,
            color: scheme.brand,
            title: 'Email Us',
            value: 'info@pragmaticeng.com',
            url: 'mailto:info@pragmaticeng.com',
          },
        ],
      },
      {
        region: 'UAE Office',
        items: [
          {
            Icon: MapMarkerIcon,
            color: energyPalette.grid,
            title: 'Location',
            value: 'Villa-724, Arabian Ranches-3, Joy, Dubai, United Arab Emirates',
            url: 'https://maps.google.com/?q=Arabian+Ranches+3+Joy+Dubai',
          },
          {
            Icon: PhoneIcon,
            color: energyPalette.genset,
            title: 'Call Us',
            value: '+971 56 1186427',
            url: 'tel:+971561186427',
          },
          {
            Icon: EmailPlainIcon,
            color: scheme.brand,
            title: 'Email Us',
            value: 'sk@pragmaticeng.com',
            url: 'mailto:sk@pragmaticeng.com',
          },
        ],
      },
    ],
    [scheme.brand],
  );

  const websiteItem: ContactItem = {
    Icon: WebIcon,
    color: energyPalette.wind,
    title: 'Website',
    value: 'pragmaticeng.com',
    url: WEBSITE_URL,
  };

  let rowIndex = 0;

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
          Contact Us
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
                <PulseDot color={scheme.heroOnGradient} size={8} />
                <OverlineLabel color={scheme.heroOnGradient}>
                  GET IN TOUCH
                </OverlineLabel>
              </HeroLiveBadge>
            </HeroTopRow>
            <View style={styles.heroBody}>
              <AppText fontSize={FONT_SIZE_XL} bold color={scheme.heroOnGradient}>
                Let's talk
              </AppText>
              <AppText
                fontSize={FONT_SIZE_XS}
                color={scheme.heroOnGradientMuted}
                lineHeight={18}>
                Questions or need support? Reach us at any of our offices — tap
                to connect instantly.
              </AppText>
            </View>
          </HeroGradientCard>
        </Animated.View>

        {offices.map(office => (
          <View key={office.region} style={styles.group}>
            <Animated.View entering={enter(rowIndex++)}>
              <OverlineLabel
                color={scheme.textTertiary}
                style={styles.groupHeader}>
                {office.region}
              </OverlineLabel>
            </Animated.View>
            {office.items.map(item => (
              <Animated.View key={item.title} entering={enter(rowIndex++)}>
                <ContactRow item={item} />
              </Animated.View>
            ))}
          </View>
        ))}

        <View style={styles.group}>
          <Animated.View entering={enter(rowIndex++)}>
            <OverlineLabel color={scheme.textTertiary} style={styles.groupHeader}>
              Online
            </OverlineLabel>
          </Animated.View>
          <Animated.View entering={enter(rowIndex++)}>
            <ContactRow item={websiteItem} />
          </Animated.View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space.md },
  heroBody: { marginTop: space.lg, gap: 6 },
  group: { gap: space.sm },
  groupHeader: { marginTop: space.xs, marginLeft: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowText: { flex: 1, gap: 2 },
});

export default ContactUs;
