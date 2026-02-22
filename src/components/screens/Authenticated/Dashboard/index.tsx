import React, { FC, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppText } from 'src/components/common';
import { Logo } from 'src/assets';
import {
  CARD_BG,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  PRIMARY,
  PROGRESS_BG,
  SPLASH_BG,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { RootStackParamList } from 'src/types';

interface SiteCardProps {
  name: string;
  timestamp: string;
  efficiency: number;
  metrics: Array<{ label: string; value: string; unit: string; icon: string }>;
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
  const displayedMetrics = isExpanded ? metrics : metrics.slice(0, 3);

  return (
    <TouchableOpacity style={styles.siteCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.siteHeader}>
        <View style={styles.siteAvatarContainer}>
          <View style={styles.siteAvatar}>
            <AppText fontSize={FONT_SIZE_MD} bold color={TEXT_SECONDARY}>
              {name.substring(0, 2).toUpperCase()}
            </AppText>
          </View>
        </View>

        <View style={styles.siteInfo}>
          <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
            {name}
          </AppText>
          <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
            {timestamp}
          </AppText>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        {displayedMetrics.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <AppText fontSize={FONT_SIZE_MD}>{metric.icon}</AppText>
              <AppText fontSize={FONT_SIZE_XXS} color={WHITE}>
                {metric.label}
              </AppText>
            </View>
            <View style={styles.metricValue}>
              <AppText fontSize={FONT_SIZE_XS} semi_bold color={WHITE}>
                {metric.value}
              </AppText>
              <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
                {metric.unit}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.efficiencyContainer}>
        <View style={styles.efficiencyHeader}>
          <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
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
        <AppText fontSize={FONT_SIZE_XS} color={TEXT_SECONDARY}>
          {isExpanded ? 'Collapse View' : 'Expand View'}
        </AppText>
        <AppText fontSize={FONT_SIZE_SM} color={TEXT_SECONDARY}>
          {isExpanded ? '↑' : '↓'}
        </AppText>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const Dashboard: FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  
  const sitesData: SiteCardProps[] = [
    {
      name: 'Lucky Cement Nooribad',
      timestamp: '17/12/2025, 07:49 PM',
      efficiency: 86.56,
      metrics: [
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'Wind', value: '3.2345', unit: 'kWp', icon: '💨' },
        { label: 'Grid', value: '4,553.2', unit: 'kWp', icon: '⚡' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'PV Size', value: '18,235', unit: 'kW', icon: '📊' },
        { label: 'PV Size', value: '18,235', unit: 'kW', icon: '📊' },
        { label: 'Wind', value: '3.2345', unit: 'kWp', icon: '💨' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
      ],
      onPress: () => navigation.navigate('SiteDetail', {
        siteId: '1',
        siteName: 'Lucky Cement Nooribad',
        siteSubtitle: '30MW PV+ 28.8MW Wind MGCS',
        efficiency: 86.56,
      }),
    },
    {
      name: 'Master Molty Foam',
      timestamp: '17/12/2025, 07:49 PM',
      efficiency: 86.56,
      metrics: [
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'PV Size', value: '18,235', unit: 'kW', icon: '📊' },
        { label: 'PV Size', value: '18,235', unit: 'kW', icon: '📊' },
        { label: 'Wind', value: '3.2345', unit: 'kWp', icon: '💨' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
      ],
      onPress: () => navigation.navigate('SiteDetail', {
        siteId: '2',
        siteName: 'Master Molty Foam',
        siteSubtitle: '25MW PV+ 15MW Wind MGCS',
        efficiency: 86.56,
      }),
    },
    {
      name: 'Young Food Pvt.',
      timestamp: '17/12/2025, 07:49 PM',
      efficiency: 86.56,
      metrics: [
        { label: 'PV Size', value: '18,235', unit: 'kW', icon: '📊' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
        { label: 'Solar', value: '3.2345', unit: 'kWp', icon: '☀️' },
      ],
      onPress: () => navigation.navigate('SiteDetail', {
        siteId: '3',
        siteName: 'Young Food Pvt.',
        siteSubtitle: '10MW PV MGCS',
        efficiency: 86.56,
      }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SPLASH_BG} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.hamburgerButton}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: normalizeWidth(12) }]} />
          <View style={[styles.hamburgerLine, { width: normalizeWidth(6) }]} />
        </TouchableOpacity>

        <Image source={Logo} style={styles.logo} resizeMode="contain" />

        <TouchableOpacity 
          style={styles.themeButton}
          onPress={() => setIsDarkTheme(!isDarkTheme)}>
          <AppText fontSize={FONT_SIZE_LG}>{isDarkTheme ? '🌙' : '☀️'}</AppText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.searchContainer}>
          <AppText fontSize={FONT_SIZE_SM}>🔍</AppText>
          <AppText fontSize={FONT_SIZE_SM} color={TEXT_SECONDARY}>
            Search
          </AppText>
        </View>

        <View style={styles.sectionHeader}>
          <AppText fontSize={FONT_SIZE_SM} medium color={WHITE}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SPLASH_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: INPUT_DARK_BG,
    borderBottomWidth: 1,
    borderBottomColor: INPUT_DARK_BORDER,
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
    backgroundColor: WHITE,
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
    backgroundColor: INPUT_DARK_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 100,
    paddingHorizontal: normalizeWidth(12),
    paddingVertical: normalizeHeight(10),
    gap: normalizeWidth(4),
  },
  sectionHeader: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 16,
    padding: normalizeWidth(12),
    alignItems: 'center',
  },
  sitesContainer: {
    gap: normalizeHeight(8),
  },
  siteCard: {
    backgroundColor: INPUT_DARK_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
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
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
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
    borderColor: INPUT_DARK_BG,
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
    backgroundColor: INPUT_DARK_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
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
    backgroundColor: PROGRESS_BG,
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
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 100,
    paddingVertical: normalizeHeight(8),
    gap: normalizeWidth(8),
  },
});

export default Dashboard;
