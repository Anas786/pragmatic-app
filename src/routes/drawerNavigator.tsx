import React, { FC, memo, ReactElement, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerNavigationOptions,
} from '@react-navigation/drawer';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppText,
  Avatar,
  OverlineLabel,
  Pill,
  PillGroup,
  PressableScale,
  Skeleton,
} from 'src/components/common';
import { useLogout } from 'src/hooks/useLogout';
import { useUserStore } from 'src/hooks/useUserStore';
import { ThemePreference, useThemeStore } from 'src/hooks/useThemeStore';
import { radius, Scheme, space, useScheme, useThemedStyles } from 'src/theme';
import { DashboardStackParamList, DrawerParamList, IconProps, IUser } from 'src/types';
import { APP_VERSION_LABEL } from 'src/utils/constants/app';
import { PRIVACY_POLICY_URL } from 'src/utils/constants/company';
import { openExternalUrl } from 'src/utils/externalLinks';
import { ICON_SIZE_MD } from 'src/utils/theme';
import { presentText } from 'src/utils/user';
import {
  InfoIcon,
  LogoutIcon,
  PhoneIcon,
  PrivacyIcon,
  RightIcon,
  TermsIcon,
  UserProfileIcon,
} from 'src/assets/icons';
import { DashboardStack } from './dashboardStack';

const Drawer = createDrawerNavigator<DrawerParamList>();

/** Stack screens the drawer links to (pushed onto DashboardStack). */
type DrawerLinkRoute = Extract<
  keyof DashboardStackParamList,
  'Profile' | 'AboutUs' | 'ContactUs' | 'TermsAndConditions'
>;

const DRAWER_MAX_WIDTH = 320;
/** Strip of the content left visible beside the open drawer. */
const DRAWER_EDGE_GAP = 56;
const ROW_MIN_HEIGHT = 48;
const ICON_WELL = 32;
const AVATAR_SIZE = 48;

const APPEARANCE_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * The screen currently on top of the nested DashboardStack — what the
 * drawer highlights. Before the stack has rendered its own state the drawer
 * route carries none, which means its initial route ('Dashboard').
 */
export const focusedStackRoute = (
  state: DrawerContentComponentProps['state'],
): string => {
  const route = state.routes[state.index];
  return (route && getFocusedRouteNameFromRoute(route)) ?? 'Dashboard';
};

/* ─────────── Profile row ─────────── */

interface ProfileRowProps {
  user: IUser | null;
  onPress: () => void;
}

const ProfileRow: FC<ProfileRowProps> = memo(({ user, onPress }) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);

  if (!user) {
    // Session restore in flight: shape-matched placeholders, never a fake
    // name or address.
    return (
      <View
        style={themed.profileRow}
        accessible
        accessibilityLabel="Loading profile">
        <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius="pill" />
        <View style={styles.profileText}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="90%" height={12} />
        </View>
      </View>
    );
  }

  const email = presentText(user.email);
  const name = presentText(user.name) ?? email ?? 'Your account';
  const secondary = email && email !== name ? email : undefined;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={`View profile, ${name}`}
      accessibilityHint="Opens your profile"
      style={themed.profileRow}>
      <Avatar name={name} size={AVATAR_SIZE} imageUrl={user.image} />
      <View style={styles.profileText}>
        <AppText variant="bodyLg" semi_bold numberOfLines={1}>
          {name}
        </AppText>
        {secondary ? (
          <AppText variant="bodySm" tone="secondary" numberOfLines={1}>
            {secondary}
          </AppText>
        ) : null}
      </View>
      <RightIcon size={ICON_SIZE_MD} color={scheme.textTertiary} />
    </PressableScale>
  );
});
ProfileRow.displayName = 'DrawerProfileRow';

/* ─────────── Navigation row ─────────── */

interface DrawerRowProps {
  Icon: FC<IconProps>;
  label: string;
  /** Stack screen to open; omit for an external link (`onPress`). */
  route?: DrawerLinkRoute;
  active?: boolean;
  onNavigate?: (route: DrawerLinkRoute) => void;
  onPress?: () => void;
  role?: 'button' | 'link';
  accessibilityHint?: string;
}

const DrawerRow: FC<DrawerRowProps> = memo(
  ({ Icon, label, route, active = false, onNavigate, onPress, role = 'button', accessibilityHint }) => {
    const scheme = useScheme();
    const themed = useThemedStyles(createStyles);

    const handlePress = useCallback(() => {
      if (route && onNavigate) onNavigate(route);
      else onPress?.();
    }, [route, onNavigate, onPress]);

    return (
      <PressableScale
        onPress={handlePress}
        scaleTo={0.98}
        role={role}
        selected={active}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={[themed.row, active ? themed.rowActive : null]}>
        <View style={[styles.iconWell, active ? null : themed.iconWellIdle]}>
          <Icon
            size={ICON_SIZE_MD}
            color={active ? scheme.brandText : scheme.textSecondary}
          />
        </View>
        <AppText
          variant="body"
          medium={!active}
          semi_bold={active}
          color={active ? scheme.brandText : scheme.textPrimary}
          numberOfLines={1}
          style={styles.rowLabel}>
          {label}
        </AppText>
      </PressableScale>
    );
  },
);
DrawerRow.displayName = 'DrawerRow';

/* ─────────── Section ─────────── */

const DrawerSection: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <OverlineLabel tone="secondary" style={styles.sectionTitle}>
      {title}
    </OverlineLabel>
    {children}
  </View>
);

/* ─────────── Drawer content ─────────── */

export const CustomDrawerContent: FC<DrawerContentComponentProps> = ({
  navigation,
  state,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const user = useUserStore(s => s.user);
  const preference = useThemeStore(s => s.preference);
  const setPreference = useThemeStore(s => s.setPreference);
  const { logout, loggingOut } = useLogout();

  const active = focusedStackRoute(state);

  const openScreen = useCallback(
    (screen: DrawerLinkRoute) => {
      navigation.closeDrawer();
      if (active !== screen) {
        navigation.navigate('DashboardStack', { screen });
      }
    },
    [navigation, active],
  );
  const openProfile = useCallback(() => openScreen('Profile'), [openScreen]);
  const openPrivacy = useCallback(() => {
    if (PRIVACY_POLICY_URL) openExternalUrl(PRIVACY_POLICY_URL);
  }, []);

  const choosePreference = useMemo(
    () => ({
      system: () => setPreference('system'),
      light: () => setPreference('light'),
      dark: () => setPreference('dark'),
    }),
    [setPreference],
  );

  // The drawer is a full-height sheet: clear the status bar / Dynamic
  // Island at the top and the home indicator at the bottom.
  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        paddingTop: insets.top + space.lg,
        paddingBottom: insets.bottom + space.md,
        paddingStart: insets.left + space.md,
        paddingEnd: space.md,
      },
    ],
    [insets.top, insets.bottom, insets.left],
  );

  return (
    <DrawerContentScrollView
      contentContainerStyle={contentStyle}
      style={themed.scroll}
      showsVerticalScrollIndicator={false}>
      <ProfileRow user={user} onPress={openProfile} />

      <DrawerSection title="Account">
        <DrawerRow
          Icon={UserProfileIcon}
          label="Profile"
          route="Profile"
          active={active === 'Profile'}
          onNavigate={openScreen}
        />
      </DrawerSection>

      <DrawerSection title="Preferences">
        <View style={styles.appearance}>
          <AppText
            variant="bodySm"
            tone="secondary"
            accessibilityElementsHidden
            importantForAccessibility="no">
            Appearance
          </AppText>
          <PillGroup label="Appearance">
            {APPEARANCE_OPTIONS.map(option => (
              <Pill
                key={option.value}
                label={option.label}
                selected={preference === option.value}
                onPress={choosePreference[option.value]}
                size="sm"
                testID={`appearance-${option.value}`}
              />
            ))}
          </PillGroup>
        </View>
      </DrawerSection>

      <DrawerSection title="Support">
        <DrawerRow
          Icon={PhoneIcon}
          label="Contact us"
          route="ContactUs"
          active={active === 'ContactUs'}
          onNavigate={openScreen}
        />
        <DrawerRow
          Icon={InfoIcon}
          label="About"
          route="AboutUs"
          active={active === 'AboutUs'}
          onNavigate={openScreen}
        />
        <DrawerRow
          Icon={TermsIcon}
          label="Terms & Conditions"
          route="TermsAndConditions"
          active={active === 'TermsAndConditions'}
          onNavigate={openScreen}
        />
        {PRIVACY_POLICY_URL ? (
          <DrawerRow
            Icon={PrivacyIcon}
            label="Privacy policy"
            role="link"
            accessibilityHint="Opens in your browser"
            onPress={openPrivacy}
          />
        ) : null}
      </DrawerSection>

      <View style={styles.spacer} />

      <View style={themed.footer}>
        <PressableScale
          onPress={logout}
          disabled={loggingOut}
          busy={loggingOut}
          scaleTo={0.98}
          accessibilityLabel="Sign out"
          style={themed.row}
          testID="drawer-sign-out">
          <View style={[styles.iconWell, themed.dangerWell]}>
            {loggingOut ? (
              <ActivityIndicator size="small" color={scheme.statusInk.danger} />
            ) : (
              <LogoutIcon size={ICON_SIZE_MD} color={scheme.statusInk.danger} />
            )}
          </View>
          <AppText
            variant="body"
            semi_bold
            color={scheme.statusInk.danger}
            style={styles.rowLabel}>
            Sign out
          </AppText>
        </PressableScale>
        <AppText variant="caption" tone="tertiary" style={styles.version}>
          {APP_VERSION_LABEL}
        </AppText>
      </View>
    </DrawerContentScrollView>
  );
};

const renderDrawerContent = (props: DrawerContentComponentProps) => (
  <CustomDrawerContent {...props} />
);

/* ─────────── Drawer navigator ─────────── */

/**
 * The drawer hosts ONE screen — DashboardStack. Profile / About / Contact /
 * Terms are native-stack screens inside it (real push transitions, iOS
 * edge-swipe and Android back), opened from the drawer rows.
 */
export const DrawerNavigator = (): ReactElement => {
  const scheme = useScheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(DRAWER_MAX_WIDTH, width - DRAWER_EDGE_GAP);

  const screenOptions = useMemo<DrawerNavigationOptions>(
    () => ({
      headerShown: false,
      drawerType: 'slide',
      swipeEnabled: false,
      overlayColor: scheme.scrim,
      drawerStyle: { width: drawerWidth, backgroundColor: scheme.surface },
    }),
    [scheme, drawerWidth],
  );

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={renderDrawerContent}>
      <Drawer.Screen name="DashboardStack" component={DashboardStack} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: space['2xs'],
  },
  section: {
    marginTop: space.xl,
    gap: space['2xs'],
  },
  sectionTitle: {
    paddingHorizontal: space.md,
    marginBottom: space.xs,
  },
  appearance: {
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: space['2xl'],
  },
  version: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    scroll: {
      backgroundColor: scheme.surface,
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 64,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      borderRadius: radius.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: ROW_MIN_HEIGHT,
      paddingHorizontal: space.md,
      borderRadius: radius.md,
    },
    rowActive: {
      backgroundColor: scheme.brandSoft,
    },
    iconWellIdle: {
      backgroundColor: scheme.surfaceMuted,
    },
    dangerWell: {
      backgroundColor: scheme.statusSoft.danger,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: scheme.hairline,
      paddingTop: space.sm,
    },
  });
