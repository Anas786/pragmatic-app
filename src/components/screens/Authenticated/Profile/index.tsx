import React, { FC } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  IconButton,
  ScreenContainer,
  Surface,
  TopBar,
} from 'src/components/common';
import { useUserStore } from 'src/hooks/useUserStore';
import { Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
} from 'src/utils';
import dayjs from 'dayjs';
import {
  Back,
  EmailPlainIcon,
  InfoIcon,
  PhoneIcon,
  ProfileCompanyIcon,
  UserProfileIcon,
} from 'src/assets/icons';
import { IconProps } from 'src/types';

interface InfoRowProps {
  IconComponent: FC<IconProps>;
  label: string;
  value: string;
}

const createInfoRowStyles = (scheme: Scheme) =>
  StyleSheet.create({
    infoIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: scheme.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const createDividerStyles = (scheme: Scheme) =>
  StyleSheet.create({
    divider: { height: 1, backgroundColor: scheme.hairline },
  });

const ProfileDivider: FC = () => {
  const themed = useThemedStyles(createDividerStyles);
  return <View style={themed.divider} />;
};

const InfoRow: FC<InfoRowProps> = ({ IconComponent, label, value }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createInfoRowStyles);
  return (
    <View style={styles.infoRow}>
      <View style={themed.infoIconWrap}>
        <IconComponent size={ICON_SIZE_LG} color={scheme.textSecondary} />
      </View>
      <View style={styles.infoText}>
        <AppText fontSize={FONT_SIZE_XXS} color={scheme.textSecondary}>
          {label}
        </AppText>
        <AppText fontSize={FONT_SIZE_SM} medium color={scheme.textPrimary}>
          {value}
        </AppText>
      </View>
    </View>
  );
};

const Profile: FC = () => {
  const navigation = useNavigation();
  const { user } = useUserStore();
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
          Profile
        </AppText>
        <View style={styles.headerSpacer} />
      </TopBar>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <Avatar name={user?.name || 'User'} size={100} imageUrl={user?.image} />
          <AppText
            fontSize={FONT_SIZE_MD}
            bold
            color={scheme.textPrimary}
            style={styles.userName}>
            {user?.name || 'User'}
          </AppText>
          <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary}>
            {user?.company || 'Company'}
          </AppText>
        </View>

        <Surface elevation="md" radius="xl" padding={space.lg} bordered>
          <InfoRow
            IconComponent={UserProfileIcon}
            label="Full Name"
            value={user?.name || '-'}
          />
          <ProfileDivider />
          <InfoRow
            IconComponent={EmailPlainIcon}
            label="Email"
            value={user?.email || '-'}
          />
          <ProfileDivider />
          <InfoRow
            IconComponent={PhoneIcon}
            label="Phone"
            value={user?.phone || '-'}
          />
          <ProfileDivider />
          <InfoRow
            IconComponent={ProfileCompanyIcon}
            label="Company"
            value={user?.company || '-'}
          />
          <ProfileDivider />
          <InfoRow
            IconComponent={InfoIcon}
            label="Last Login"
            value={
              user?.login_date
                ? dayjs(user.login_date).format('DD MMM YYYY, hh:mm A')
                : '-'
            }
          />
        </Surface>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerSpacer: { width: 36, height: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: space.lg, gap: space['2xl'] },
  avatarSection: {
    alignItems: 'center',
    paddingTop: space.lg,
    gap: space.sm,
  },
  userName: { marginTop: space.xs },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    gap: 14,
  },
  infoText: { flex: 1, gap: 2 },
});

export default Profile;
