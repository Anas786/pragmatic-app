import React, { FC, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from 'src/components/common';
import { Logo } from 'src/assets';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  normalizeHeight,
  normalizeWidth,
  PRIMARY,
  ThemeColors,
} from 'src/utils';
import { useThemeStore } from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { mockSitesData, SiteCardData } from 'src/data/mock';

interface SiteCardProps extends SiteCardData {
  onPress: () => void;
}

const SiteCard: FC<SiteCardProps> = ({
  name,
  timestamp,
  efficiency,
  metrics,
  onPress,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const displayedMetrics = isExpanded ? metrics : metrics.slice(0, 3);

  return (
    <TouchableOpacity style={styles.siteCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.siteHeader}>
        <View style={styles.siteAvatarContainer}>
          <View style={styles.siteAvatar}>
            <AppText fontSize={FONT_SIZE_MD} bold color={colors.textSecondary}>
              {name.substring(0, 2).toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.siteInfo}>
          <AppText fontSize={FONT_SIZE_XS} medium color={colors.primaryText}>
            {name}
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
            {timestamp}
          </AppText>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        {displayedMetrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Icon name={metric.icon} size={ICON_SIZE_MD} color={colors.textSecondary} />
              <AppText fontSize={FONT_SIZE_XXS} color={colors.primaryText}>
                {metric.label}
              </AppText>
            </View>
            <View style={styles.metricValue}>
              <AppText fontSize={FONT_SIZE_XS} semi_bold color={colors.primaryText}>
                {metric.value}
              </AppText>
              <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                {metric.unit}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.efficiencyContainer}>
        <View style={styles.efficiencyHeader}>
          <AppText fontSize={FONT_SIZE_XS} medium color={colors.primaryText}>
            Power Output Efficiency
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} medium color={PRIMARY}>
            {efficiency}%
          </AppText>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${efficiency}%` },
            ]}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.expandButton}
        onPress={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}>
        <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
          {isExpanded ? 'Collapse View' : 'Expand View'}
        </AppText>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={ICON_SIZE_MD} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const Dashboard: FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { isDark, colors, toggleTheme } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sitesData: SiteCardProps[] = mockSitesData.map((site, index) => ({
    ...site,
    onPress: () => navigation.navigate('SiteDetail', {
      siteId: String(index + 1),
      siteName: site.name,
      siteSubtitle: index === 0 ? '30MW PV+ 28.8MW Wind MGCS' :
                    index === 1 ? '25MW PV+ 15MW Wind MGCS' :
                    '10MW PV MGCS',
      efficiency: site.efficiency,
    }),
  }));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.splashBg} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <View style={[styles.hamburgerLine, { backgroundColor: colors.primaryText }]} />
          <View style={[styles.hamburgerLine, { width: normalizeWidth(12), backgroundColor: colors.primaryText }]} />
          <View style={[styles.hamburgerLine, { width: normalizeWidth(6), backgroundColor: colors.primaryText }]} />
        </TouchableOpacity>

        <Image source={Logo} style={styles.logo} resizeMode="contain" />

        <TouchableOpacity
          style={styles.themeButton}
          onPress={toggleTheme}>
          <Icon name={isDark ? 'weather-night' : 'white-balance-sunny'} size={ICON_SIZE_MD} color={colors.primaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={ICON_SIZE_MD} color={colors.textSecondary} />
          <AppText fontSize={FONT_SIZE_SM} color={colors.textSecondary}>
            Search
          </AppText>
        </View>

        <View style={styles.sectionHeader}>
          <AppText fontSize={FONT_SIZE_SM} medium color={colors.primaryText}>
            Site Summary
          </AppText>
        </View>

        <View style={styles.sitesContainer}>
          {sitesData.map((site, index) => (
            <SiteCard key={index} {...site} />
          ))}
        </View>
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
    hamburgerButton: {
      padding: normalizeWidth(4),
      gap: normalizeHeight(6),
    },
    hamburgerLine: {
      height: 1.5,
      width: normalizeWidth(18),
    },
    logo: {
      width: normalizeWidth(40),
      height: normalizeHeight(27),
    },
    notificationButton: {
      padding: normalizeWidth(4),
    },
    themeButton: {
      padding: normalizeWidth(4),
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: normalizeWidth(12),
      gap: normalizeHeight(20),
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(10),
      gap: normalizeWidth(4),
    },
    sectionHeader: {
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 16,
      padding: normalizeWidth(12),
      alignItems: 'center',
    },
    sitesContainer: {
      gap: normalizeHeight(8),
    },
    siteCard: {
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 20,
      padding: normalizeWidth(12),
      gap: normalizeHeight(12),
    },
    siteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(10),
    },
    siteAvatarContainer: {
      position: 'relative',
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
    statusDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: normalizeWidth(6),
      height: normalizeWidth(6),
      borderRadius: 100,
      borderWidth: 2,
      borderColor: colors.inputDarkBg,
    },
    siteInfo: {
      flex: 1,
      gap: normalizeHeight(6),
    },
    menuButton: {
      padding: normalizeWidth(4),
    },
    metricsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: normalizeWidth(8),
    },
    metricCard: {
      flex: 1,
      minWidth: '30%',
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      padding: normalizeWidth(8),
      gap: normalizeHeight(8),
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(4),
    },
    metricValue: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: normalizeWidth(4),
    },
    efficiencyContainer: {
      gap: normalizeHeight(8),
    },
    efficiencyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressBar: {
      height: normalizeHeight(4),
      backgroundColor: colors.progressBg,
      borderRadius: 1000,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: PRIMARY,
      borderRadius: 1000,
    },
    expandButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingVertical: normalizeHeight(8),
      gap: normalizeWidth(8),
    },
  });

export default Dashboard;
