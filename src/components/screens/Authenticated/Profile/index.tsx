import React, { FC, Fragment, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {
  AppText,
  Avatar,
  PressableScale,
  ScreenContainer,
  ScreenHeader,
  Skeleton,
  Surface,
} from 'src/components/common';
import { useLogout } from 'src/hooks/useLogout';
import { useUserStore } from 'src/hooks/useUserStore';
import { radius, Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { IconProps, IUser } from 'src/types';
import { formatDateTimeShort } from 'src/utils/format';
import { ICON_SIZE_MD } from 'src/utils/theme';
import { presentText, profileSubtitle } from 'src/utils/user';
import {
  EmailPlainIcon,
  LogoutIcon,
  PhoneIcon,
  ProfileCompanyIcon,
  UserProfileIcon,
} from 'src/assets/icons';

const AVATAR_SIZE = 72;
const ICON_WELL = 40;

/** Clock glyph for the "Signed in" row (no SVG clock in the icon set). */
const ClockIcon: FC<IconProps> = ({ size, color }) => (
  <MaterialIcon name="schedule" size={size} color={color} />
);

interface InfoRowModel {
  key: string;
  Icon: FC<IconProps>;
  label: string;
  value: string;
}

/**
 * The detail rows for a user — rows whose value is missing are dropped
 * entirely (never a bold '-' or a placeholder word).
 */
const buildRows = (user: IUser): InfoRowModel[] => {
  const rows: Array<InfoRowModel | null> = [
    presentText(user.name)
      ? { key: 'name', Icon: UserProfileIcon, label: 'Name', value: user.name.trim() }
      : null,
    presentText(user.email)
      ? { key: 'email', Icon: EmailPlainIcon, label: 'Email', value: user.email.trim() }
      : null,
    presentText(user.phone)
      ? { key: 'phone', Icon: PhoneIcon, label: 'Phone', value: (user.phone ?? '').trim() }
      : null,
    presentText(user.company)
      ? {
          key: 'company',
          Icon: ProfileCompanyIcon,
          label: 'Company',
          value: (user.company ?? '').trim(),
        }
      : null,
    user.login_date && Number.isFinite(user.login_date.getTime())
      ? {
          key: 'signedIn',
          Icon: ClockIcon,
          label: 'Signed in',
          value: formatDateTimeShort(user.login_date.getTime()),
        }
      : null,
  ];
  return rows.filter((r): r is InfoRowModel => r !== null);
};

const InfoRow: FC<{ row: InfoRowModel }> = ({ row }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const { Icon, label, value } = row;
  return (
    <View
      style={styles.infoRow}
      accessible
      accessibilityLabel={`${label}, ${value}`}>
      <View style={themed.iconWell}>
        <Icon size={ICON_SIZE_MD} color={scheme.textSecondary} />
      </View>
      <View style={styles.infoText}>
        <AppText variant="caption" tone="secondary">
          {label}
        </AppText>
        <AppText variant="body" medium>
          {value}
        </AppText>
      </View>
    </View>
  );
};

const ProfileSkeleton: FC = () => (
  <View style={styles.avatarSection} accessible accessibilityLabel="Loading profile">
    <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius="pill" />
    <Skeleton width={160} height={20} />
    <Skeleton width={120} height={14} />
  </View>
);

const Profile: FC = () => {
  const navigation = useNavigation();
  const user = useUserStore(s => s.user);
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const { logout, loggingOut } = useLogout();
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const rows = useMemo(() => (user ? buildRows(user) : []), [user]);
  const name = user ? presentText(user.name) ?? presentText(user.email) : undefined;
  const subtitle = user ? profileSubtitle(user) : undefined;

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <ScreenHeader title="Profile" onBack={goBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {user ? (
          <View style={styles.avatarSection}>
            <Avatar name={name ?? ''} size={AVATAR_SIZE} imageUrl={user.image} />
            {name ? (
              <AppText variant="h3" center numberOfLines={2}>
                {name}
              </AppText>
            ) : null}
            {subtitle && subtitle !== name ? (
              <AppText variant="bodySm" tone="secondary" center numberOfLines={2}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        ) : (
          <ProfileSkeleton />
        )}

        {rows.length > 0 ? (
          <Surface elevation="sm" radius="xl" padding={space.lg} bordered>
            {rows.map((row, i) => (
              <Fragment key={row.key}>
                {i > 0 ? <View style={themed.divider} /> : null}
                <InfoRow row={row} />
              </Fragment>
            ))}
          </Surface>
        ) : null}

        <PressableScale
          onPress={logout}
          disabled={loggingOut}
          busy={loggingOut}
          scaleTo={0.98}
          accessibilityLabel="Sign out"
          style={themed.signOut}>
          {loggingOut ? (
            <ActivityIndicator size="small" color={scheme.statusInk.danger} />
          ) : (
            <LogoutIcon size={ICON_SIZE_MD} color={scheme.statusInk.danger} />
          )}
          <AppText variant="body" semi_bold color={scheme.statusInk.danger}>
            Sign out
          </AppText>
        </PressableScale>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space['3xl'],
    gap: space['2xl'],
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: space.lg,
    gap: space.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    gap: space.md,
  },
  infoText: { flex: 1, minWidth: 0, gap: space['2xs'] },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    iconWell: {
      width: ICON_WELL,
      height: ICON_WELL,
      borderRadius: radius.md,
      backgroundColor: scheme.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: scheme.border,
    },
    signOut: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.sm,
      minHeight: 52,
      borderRadius: radius.pill,
      backgroundColor: scheme.statusSoft.danger,
    },
  });

export default Profile;
