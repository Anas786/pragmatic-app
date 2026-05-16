import React, { FC, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_MD,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
  normalizeHeight,
  normalizeWidth,
  ThemeColors,
} from 'src/utils';
import {
  useReportMapping,
  useSiteConfig,
  useSiteData,
  useThemeStore,
} from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import ViewsContent from './components/ViewsContent';
import SiteDetailSkeleton from './components/SiteDetailSkeleton';
import { Back, MoonIcon, SunIcon } from 'src/assets/icons';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

const SiteDetail: FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteId, siteName, siteSubtitle, siteimage } = route.params;
  const { isDark, colors, toggleTheme } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Subscribe to all three caches that drive this screen. Dashboard's
  // `useSwitchActiveSite` already prefetched them in parallel on tap so
  // these are typically synchronous reads from React Query's in-memory
  // store. On a deep-link / hard-reload they fire here.
  const liveData = useSiteData(siteId);
  const siteConfig = useSiteConfig(siteId);
  // Report-mapping is global (not per-site) but the product spec wants
  // it re-evaluated whenever the active site changes. The eviction +
  // prefetch happens inside `useSwitchActiveSite`; this subscription
  // ensures the cache is also primed when SiteDetail is opened directly
  // (e.g. via a deep link that bypasses Dashboard).
  useReportMapping();

  // Show the skeleton only on the *initial* load (no cached data yet).
  // Background refetches (e.g. silently re-running after staleTime
  // expires) leave the existing UI in place.
  const isInitialLoading = liveData.isLoading || siteConfig.isLoading;

  const [logoFailed, setLogoFailed] = useState(false);

  // Logo can arrive as either a remote URL string (from buildSiteLogoUrl)
  // or — for legacy callers / mock data — a bundled `require()` asset.
  // Normalize to an Image source object for both shapes.
  const logoSource =
    !logoFailed && siteimage
      ? typeof siteimage === 'string'
        ? { uri: siteimage }
        : siteimage
      : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.splashBg} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Back size={ICON_SIZE_LG} color={colors.primaryText} />
        </TouchableOpacity>

        <View style={styles.siteInfo}>
          <View style={styles.siteAvatar}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.brandlogo}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <AppText
              fontSize={FONT_SIZE_MD}
              bold
              color={colors.textSecondary}>
              {siteName.substring(0, 2).toUpperCase()}
            </AppText>
          )}
          </View>
          <View style={styles.siteTextContainer}>
            <AppText fontSize={FONT_SIZE_XS} medium color={colors.primaryText}>
              {siteName}
            </AppText>
            <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
              {siteSubtitle}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.themeButton}
          onPress={toggleTheme}>
          {isDark ? (
            <SunIcon size={ICON_SIZE_LG} color={colors.primaryText} />
          ) : (
            <MoonIcon size={ICON_SIZE_LG} color={colors.primaryText} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isInitialLoading ? <SiteDetailSkeleton /> : <ViewsContent />}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.splashBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.inputDarkBorder,
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(16),
    },
    backButton: {
      padding: normalizeWidth(4),
    },
    siteInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: normalizeWidth(12),
      gap: normalizeWidth(10),
    },
    siteAvatar: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      borderRadius: 100,
      backgroundColor: colors.darkBgSecondary,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandlogo:{
      width: normalizeWidth(36),
      height: normalizeHeight(36),
      borderRadius: 100,
    },
    siteTextContainer: {
      flex: 1,
      gap: normalizeHeight(4),
    },
    themeButton: {
      padding: normalizeWidth(4),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: normalizeWidth(12),
      gap: normalizeHeight(16),
    },
  });

export default SiteDetail;
