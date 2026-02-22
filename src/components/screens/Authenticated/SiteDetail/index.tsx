import React, { FC, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppText } from 'src/components/common';
import {
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  INPUT_DARK_BG,
  INPUT_DARK_BORDER,
  normalizeHeight,
  normalizeWidth,
  SPLASH_BG,
  TEXT_SECONDARY,
  WHITE,
} from 'src/utils';
import { RootStackParamList } from 'src/types';
import CustomIcon from 'src/components/common/CustomIcon';
import DropdownSelector from './components/DropdownSelector';
import ViewsContent from './components/ViewsContent';
import EmptyState from './components/EmptyState';

type SiteDetailRouteProp = RouteProp<RootStackParamList, 'SiteDetail'>;

type DropdownOption = 'Views' | 'Live Parameter' | 'Alarm';

const SiteDetail: FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SiteDetailRouteProp>();
  const { siteName, siteSubtitle } = route.params;

  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [selectedDropdown, setSelectedDropdown] =
    useState<DropdownOption>('Views');

  const renderContent = () => {
    switch (selectedDropdown) {
      case 'Views':
        return <ViewsContent />;
      case 'Live Parameter':
        return <EmptyState title="Live Parameter" />;
      case 'Alarm':
        return <EmptyState title="Alarm" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={SPLASH_BG} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <CustomIcon name="back" size={24} color={WHITE} />
        </TouchableOpacity>

        <View style={styles.siteInfo}>
          <View style={styles.siteAvatar}>
            <AppText fontSize={FONT_SIZE_MD} bold color={TEXT_SECONDARY}>
              {siteName.substring(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.siteTextContainer}>
            <AppText fontSize={FONT_SIZE_XS} medium color={WHITE}>
              {siteName}
            </AppText>
            <AppText fontSize={FONT_SIZE_XXS} color={TEXT_SECONDARY}>
              {siteSubtitle}
            </AppText>
          </View>
        </View>

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

        <DropdownSelector
          selected={selectedDropdown}
          onSelect={setSelectedDropdown}
        />

        {renderContent()}
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
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_DARK_BG,
    borderWidth: 1,
    borderColor: INPUT_DARK_BORDER,
    borderRadius: 100,
    paddingHorizontal: normalizeWidth(16),
    paddingVertical: normalizeHeight(12),
    gap: normalizeWidth(8),
  },
});

export default SiteDetail;
