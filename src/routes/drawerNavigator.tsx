import React, { FC, ReactElement, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppText, Avatar } from 'src/components/common';
import { useLogout } from 'src/hooks/useLogout';
import { useUserStore } from 'src/hooks/useUserStore';
import { useThemeStore } from 'src/hooks/useThemeStore';
import { DrawerParamList } from 'src/types';
import {
  AboutUs,
  ContactUs,
  Profile,
  TermsAndConditions,
} from 'src/components/screens';
import { DashboardStack } from './dashboardStack';
import {
  ACCENT_GREEN,
  ACCENT_RED,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';

const Drawer = createDrawerNavigator<DrawerParamList>();

// --- Custom Drawer Content ---

interface NavItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
}

const NavItem: FC<NavItemProps> = ({ icon, label, onPress, colors }) => {
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.6}>
      <Icon name={icon} size={ICON_SIZE_LG} color={colors.textSecondary} />
      <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText} style={styles.navLabel}>
        {label}
      </AppText>
      <Icon name="chevron-right" size={ICON_SIZE_LG} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const CustomDrawerContent: FC<DrawerContentComponentProps> = props => {
  const { user } = useUserStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { logout } = useLogout();

  const navigateTo = (screen: keyof DrawerParamList) => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screen);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerScrollContent}
      style={styles.drawerScroll}>
      {/* User Section */}
      <TouchableOpacity
        style={styles.userSection}
        activeOpacity={0.7}
        onPress={() => navigateTo('Profile')}>
        <Avatar
          name={user?.name || 'User'}
          size={80}
          imageUrl={user?.image}
        />
        <AppText
          fontSize={FONT_SIZE_MD}
          bold
          color={colors.primaryText}
          style={styles.userName}>
          {user?.name || 'User'}
        </AppText>
        <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
          {user?.email || 'user@email.com'}
        </AppText>
        <AppText fontSize={FONT_SIZE_XXS} color={ACCENT_GREEN}>
          View Profile
        </AppText>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Navigation Items */}
      <View style={styles.navSection}>
        <NavItem
          icon="information-outline"
          label="About Us"
          onPress={() => navigateTo('AboutUs')}
          colors={colors}
        />
        <NavItem
          icon="email-outline"
          label="Contact Us"
          onPress={() => navigateTo('ContactUs')}
          colors={colors}
        />
        <NavItem
          icon="file-document-outline"
          label="Terms & Conditions"
          onPress={() => navigateTo('TermsAndConditions')}
          colors={colors}
        />
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Logout */}
      <View style={styles.divider} />
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={logout}
        activeOpacity={0.6}>
        <Icon name="logout" size={ICON_SIZE_LG} color={ACCENT_RED} />
        <AppText fontSize={FONT_SIZE_SM} bold color={ACCENT_RED}>
          Logout
        </AppText>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

// --- Drawer Navigator ---

export const DrawerNavigator = (): ReactElement => {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerStyle: styles.drawer,
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.6)',
      }}
      drawerContent={props => <CustomDrawerContent {...props} />}>
      <Drawer.Screen name="DashboardStack" component={DashboardStack} />
      <Drawer.Screen name="Profile" component={Profile} />
      <Drawer.Screen name="AboutUs" component={AboutUs} />
      <Drawer.Screen name="ContactUs" component={ContactUs} />
      <Drawer.Screen name="TermsAndConditions" component={TermsAndConditions} />
    </Drawer.Navigator>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    drawer: {
      backgroundColor: colors.splashBg,
      width: normalizeWidth(300),
    },
    drawerScroll: {
      backgroundColor: colors.splashBg,
    },
    drawerScrollContent: {
      flexGrow: 1,
      paddingTop: normalizeHeight(20),
    },
    userSection: {
      alignItems: 'center',
      paddingVertical: normalizeHeight(20),
      paddingHorizontal: normalizeWidth(16),
      gap: normalizeHeight(6),
    },
    userName: {
      marginTop: normalizeHeight(8),
    },
    divider: {
      height: 1,
      backgroundColor: colors.inputDarkBorder,
      marginHorizontal: normalizeWidth(16),
    },
    navSection: {
      paddingVertical: normalizeHeight(8),
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalizeHeight(14),
      paddingHorizontal: normalizeWidth(20),
      gap: normalizeWidth(14),
    },
    navLabel: {
      flex: 1,
    },
    spacer: {
      flex: 1,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: normalizeHeight(18),
      paddingHorizontal: normalizeWidth(20),
      gap: normalizeWidth(14),
    },
  });
