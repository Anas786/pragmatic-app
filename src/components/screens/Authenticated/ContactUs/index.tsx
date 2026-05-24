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
import { Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
} from 'src/utils';
import {
  Back,
  EmailPlainIcon,
  MapMarkerIcon,
  PhoneIcon,
  WebIcon,
} from 'src/assets/icons';
import { IconProps } from 'src/types';

interface ContactCardProps {
  IconComponent: FC<IconProps>;
  iconColor?: string;
  title: string;
  value: string;
  subtitle?: string;
}

const ContactCard: FC<ContactCardProps> = ({
  IconComponent,
  iconColor,
  title,
  value,
  subtitle,
}) => {
  const scheme = useScheme();
  const resolvedIconColor = iconColor ?? scheme.brand;
  const themed = useThemedStyles(createContactCardStyles);
  return (
    <Surface elevation="md" radius="xl" padding={space.lg} bordered>
      <View style={styles.contactRow}>
        <View style={[themed.contactIconWrap, { borderColor: resolvedIconColor }]}>
          <IconComponent size={ICON_SIZE_LG} color={resolvedIconColor} />
        </View>
        <View style={styles.contactText}>
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
            {title}
          </AppText>
          <AppText fontSize={FONT_SIZE_SM} medium color={scheme.textPrimary}>
            {value}
          </AppText>
          {subtitle ? (
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
    </Surface>
  );
};

const ContactUs: FC = () => {
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
          Contact Us
        </AppText>
        <View style={styles.headerSpacer} />
      </TopBar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <AppText
          fontSize={FONT_SIZE_XS}
          color={scheme.textSecondary}
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
          <ContactCard
            IconComponent={WebIcon}
            title="Website"
            value="www.pragmatic.com"
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const createContactCardStyles = (scheme: Scheme) =>
  StyleSheet.create({
    contactIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: scheme.surfaceMuted,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    gap: space.xl,
    paddingTop: space['2xl'],
  },
  cardGroup: { gap: space.md },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  contactText: { flex: 1, gap: 2 },
});

export default ContactUs;
