import React, { FC, memo, useCallback } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  PressableScale,
  ScreenContainer,
  ScreenHeader,
  Surface,
} from 'src/components/common';
import {
  duration,
  radius,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { IconProps } from 'src/types';
import { SUPPORT_EMAIL, WEBSITE_URL } from 'src/utils/constants/company';
import { openExternalUrl } from 'src/utils/externalLinks';
import { ICON_SIZE_MD, ICON_SIZE_SM } from 'src/utils/theme';
import {
  EmailPlainIcon,
  MapMarkerIcon,
  PhoneIcon,
  RightIcon,
  WebIcon,
} from 'src/assets/icons';

type ContactKind = 'map' | 'phone' | 'email' | 'web';

interface ContactItem {
  kind: ContactKind;
  title: string;
  value: string;
  url: string;
}

interface ContactGroup {
  title: string;
  items: ContactItem[];
}

const KIND_ICON: Record<ContactKind, FC<IconProps>> = {
  map: MapMarkerIcon,
  phone: PhoneIcon,
  email: EmailPlainIcon,
  web: WebIcon,
};

/** What tapping the row does — spoken after the label. */
const KIND_HINT: Record<ContactKind, string> = {
  map: 'Opens Maps',
  phone: 'Starts a call',
  email: 'Opens Mail',
  web: 'Opens website',
};

/** 'https://pragmaticeng.com/' → 'pragmaticeng.com' for display. */
const displayHost = (url: string): string =>
  url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');

// Office details (addresses, phone numbers, the UAE desk's mailbox) are
// specific to this screen; app-wide identity strings come from company.ts.
const GROUPS: ContactGroup[] = [
  {
    title: 'Pakistan office',
    items: [
      {
        kind: 'map',
        title: 'Location',
        value:
          'Office# B-201 Blossom Trade Center, Gulistan-e-Jauhar, Block 1, Karachi',
        url: 'https://maps.google.com/?q=Blossom+Trade+Center+Gulistan-e-Jauhar+Karachi',
      },
      {
        kind: 'phone',
        title: 'Call us',
        value: '+92 308 4222864',
        url: 'tel:+923084222864',
      },
      {
        kind: 'email',
        title: 'Email us',
        value: SUPPORT_EMAIL,
        url: `mailto:${SUPPORT_EMAIL}`,
      },
    ],
  },
  {
    title: 'UAE office',
    items: [
      {
        kind: 'map',
        title: 'Location',
        value: 'Villa-724, Arabian Ranches-3, Joy, Dubai, United Arab Emirates',
        url: 'https://maps.google.com/?q=Arabian+Ranches+3+Joy+Dubai',
      },
      {
        kind: 'phone',
        title: 'Call us',
        value: '+971 56 1186427',
        url: 'tel:+971561186427',
      },
      {
        kind: 'email',
        title: 'Email us',
        value: 'sk@pragmaticeng.com',
        url: 'mailto:sk@pragmaticeng.com',
      },
    ],
  },
  {
    title: 'Online',
    items: [
      {
        kind: 'web',
        title: 'Website',
        value: displayHost(WEBSITE_URL),
        url: WEBSITE_URL,
      },
    ],
  },
];

/** Entrance stagger cap (§19) — later rows mount without animation. */
const ANIM_LIMIT = 8;

const enter = (i: number) =>
  i < ANIM_LIMIT
    ? FadeInDown.delay(80 + i * 60)
        .duration(duration.base)
        .springify()
        .damping(18)
    : undefined;

const ContactRow: FC<{ item: ContactItem }> = memo(({ item }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const { kind, title, value, url } = item;
  const Icon = KIND_ICON[kind];
  const onPress = useCallback(() => openExternalUrl(url), [url]);

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      role="link"
      accessibilityLabel={`${title}, ${value}`}
      accessibilityHint={KIND_HINT[kind]}>
      <Surface elevation="sm" radius="xl" padding={space.lg} bordered>
        <View style={styles.row}>
          <View style={themed.iconWell}>
            <Icon size={ICON_SIZE_MD} color={scheme.textPrimary} />
          </View>
          <View style={styles.rowText}>
            <AppText variant="caption" tone="secondary">
              {title}
            </AppText>
            <AppText variant="body" medium={kind !== 'map'}>
              {value}
            </AppText>
          </View>
          <RightIcon size={ICON_SIZE_SM} color={scheme.textTertiary} />
        </View>
      </Surface>
    </PressableScale>
  );
});
ContactRow.displayName = 'ContactRow';

const ContactUs: FC = () => {
  const navigation = useNavigation();
  const scheme = useScheme();
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  let animIndex = 0;

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <ScreenHeader title="Contact us" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <AppText variant="body" tone="secondary" style={styles.intro}>
          Questions or need support? Tap any option below to reach us.
        </AppText>

        {GROUPS.map(group => (
          <View key={group.title} style={styles.group}>
            <AppText
              variant="overline"
              semi_bold
              tone="secondary"
              accessibilityRole="header"
              style={styles.groupHeader}>
              {group.title}
            </AppText>
            {group.items.map(item => (
              <Animated.View key={item.url} entering={enter(animIndex++)}>
                <ContactRow item={item} />
              </Animated.View>
            ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space['3xl'],
    gap: space.xl,
  },
  intro: { paddingHorizontal: space.xs },
  group: { gap: space.sm },
  groupHeader: {
    marginLeft: space.xs,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowText: { flex: 1, minWidth: 0, gap: space['2xs'] },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    iconWell: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: scheme.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default ContactUs;
