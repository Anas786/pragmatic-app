import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated as RNAnimated,
  FlatList,
  Image,
  Keyboard,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActionBtn,
  AppText,
  Fab,
  FabWrap,
  FooterLoader,
  HamburgerIcon,
  IconButton,
  OverlineLabel,
  ScreenContainer,
  SearchBar,
  SearchBarHandle,
  Skeleton,
  SkeletonStack,
  StatusContainer,
  StatusSubtext,
  TopBar,
} from 'src/components/common';
import { Logo } from 'src/assets';
import {
  buildSiteLogoUrl,
  FONT_SIZE_LG,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
} from 'src/utils';
import { duration, space, useScheme } from 'src/theme';
import { useSiteList, useSwitchActiveSite, useThemeStore } from 'src/hooks';
import { DashboardStackParamList, ISite } from 'src/types';
import { MoonIcon, SunIcon, UpArrow } from 'src/assets/icons';
import { SiteCard } from './components/SiteCard';
import SiteCardSkeleton from './components/SiteCardSkeleton';

const SEARCH_MIN_LEN = 4;
const SCROLL_TO_TOP_THRESHOLD = 320;

const formatSize = (size: ISite['size']): string => {
  const numeric = typeof size === 'string' ? parseFloat(size) : size;
  if (!Number.isFinite(numeric)) return String(size ?? '—');
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/* ─────────────────── Dashboard-local layout ─────────────────── */

const SearchPinned: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.searchPinned}>{children}</View>
);

const GreetingBlock: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.greetingBlock}>{children}</View>
);

const GreetingTitle: FC<{ children: ReactNode }> = ({ children }) => {
  const scheme = useScheme();
  return (
    <AppText
      fontSize={FONT_SIZE_LG}
      bold
      color={scheme.textPrimary}
      style={styles.greetingTitle}>
      {children}
    </AppText>
  );
};

const BrandLogo: FC = () => (
  <Image source={Logo} style={styles.brandLogo} resizeMode="contain" />
);

const Separator: FC = () => <View style={styles.separator} />;

/* ─────────────────── Scroll-to-top FAB ─────────────────── */

interface ScrollToTopFabProps {
  onPress: () => void;
  opacity: RNAnimated.Value;
}

const ScrollToTopFab: FC<ScrollToTopFabProps> = ({ onPress, opacity }) => {
  const scheme = useScheme();
  return (
    <FabWrap opacity={opacity}>
      <Fab onPress={onPress} accessibilityLabel="Scroll to top" haptic="tap">
        <UpArrow size={ICON_SIZE_LG} color={scheme.textOnBrand} />
      </Fab>
    </FabWrap>
  );
};

/* ─────────────────── Dashboard ─────────────────── */

interface SiteRow {
  site: ISite;
}

const Dashboard: FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { isDark, toggleTheme } = useThemeStore();
  const scheme = useScheme();

  const listRef = useRef<FlatList<SiteRow>>(null);
  const fabOpacity = useRef(new RNAnimated.Value(0)).current;
  const [fabVisible, setFabVisible] = useState(false);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchBarRef = useRef<SearchBarHandle>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const shouldShow = y > SCROLL_TO_TOP_THRESHOLD;
      setFabVisible(prev => {
        if (prev === shouldShow) return prev;
        RNAnimated.timing(fabOpacity, {
          toValue: shouldShow ? 1 : 0,
          duration: duration.fast,
          useNativeDriver: true,
        }).start();
        return shouldShow;
      });
    },
    [fabOpacity],
  );

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const {
    sites,
    total,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  } = useSiteList({ q: debouncedQuery });

  const rows: SiteRow[] = useMemo(
    () => sites.map(site => ({ site })),
    [sites],
  );

  const clearSearch = useCallback(() => {
    searchBarRef.current?.clear();
    setDebouncedQuery('');
  }, []);

  const switchActiveSite = useSwitchActiveSite();

  const handleCardPress = useCallback(
    (row: SiteRow) => {
      switchActiveSite(row.site.id);
      navigation.navigate('SiteDetail', {
        siteId: row.site.id,
        siteName: row.site.name,
        siteSubtitle: row.site.controller
          ? `${formatSize(row.site.size)} kW · Controller`
          : `${formatSize(row.site.size)} kW`,
        efficiency: 0,
        siteimage: buildSiteLogoUrl(row.site),
      });
    },
    [navigation, switchActiveSite],
  );

  const renderItem: ListRenderItem<SiteRow> = useCallback(
    ({ item, index }) => (
      <SiteCard
        site={item.site}
        index={index}
        onPress={() => handleCardPress(item)}
      />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((row: SiteRow) => row.site.id, []);

  const ItemSeparator = useCallback(() => <Separator />, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const ListFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <FooterLoader>
          <Skeleton width={120} height={12} />
        </FooterLoader>
      );
    }
    if (!hasNextPage && sites.length > 0 && !isLoading) {
      return (
        <FooterLoader>
          <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary} center>
            {debouncedQuery
              ? `${total} site${total === 1 ? '' : 's'} match "${debouncedQuery}"`
              : `All ${total} sites loaded`}
          </AppText>
        </FooterLoader>
      );
    }
    return null;
  }, [
    isFetchingNextPage,
    hasNextPage,
    sites.length,
    isLoading,
    debouncedQuery,
    total,
    scheme.textTertiary,
  ]);

  const ListHeader = useMemo(
    () => (
      <GreetingBlock>
        <OverlineLabel color={scheme.textTertiary}>YOUR FLEET</OverlineLabel>
        <GreetingTitle>
          {total > 0 ? `${total} sites` : 'Energy intelligence'}
        </GreetingTitle>
      </GreetingBlock>
    ),
    [total, scheme.textTertiary],
  );

  const ListEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <SkeletonStack>
          {Array.from({ length: 4 }).map((_, i) => (
            <SiteCardSkeleton key={i} />
          ))}
        </SkeletonStack>
      );
    }
    if (error) {
      return (
        <StatusContainer>
          <AppText
            fontSize={FONT_SIZE_MD}
            semi_bold
            color={scheme.textPrimary}
            center>
            Couldn't load your sites
          </AppText>
          <StatusSubtext>
            {error.message ?? 'Please try again.'}
          </StatusSubtext>
          <ActionBtn onPress={() => refetch()}>
            <AppText
              fontSize={FONT_SIZE_XS}
              semi_bold
              color={scheme.textOnBrand}>
              Try again
            </AppText>
          </ActionBtn>
        </StatusContainer>
      );
    }
    if (debouncedQuery.length > 0) {
      return (
        <StatusContainer>
          <AppText
            fontSize={FONT_SIZE_MD}
            semi_bold
            color={scheme.textPrimary}
            center>
            No sites match "{debouncedQuery}"
          </AppText>
          <ActionBtn onPress={clearSearch}>
            <AppText
              fontSize={FONT_SIZE_XS}
              semi_bold
              color={scheme.textOnBrand}>
              Clear search
            </AppText>
          </ActionBtn>
        </StatusContainer>
      );
    }
    return (
      <StatusContainer>
        <AppText fontSize={FONT_SIZE_SM} color={scheme.textSecondary} center>
          No sites available.
        </AppText>
      </StatusContainer>
    );
  }, [isLoading, error, debouncedQuery, clearSearch, scheme, refetch]);

  return (
    <ScreenContainer>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <TopBar onPress={Keyboard.dismiss}>
        <IconButton
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          accessibilityLabel="Open menu"
          hitSlop={8}>
          <HamburgerIcon />
        </IconButton>

        <BrandLogo />

        <IconButton onPress={toggleTheme} accessibilityLabel="Toggle theme">
          {isDark ? (
            <SunIcon size={ICON_SIZE_LG} color={scheme.textPrimary} />
          ) : (
            <MoonIcon size={ICON_SIZE_LG} color={scheme.textPrimary} />
          )}
        </IconButton>
      </TopBar>

      <SearchPinned>
        <SearchBar
          ref={searchBarRef}
          onDebouncedChange={setDebouncedQuery}
          minChars={SEARCH_MIN_LEN}
          placeholder="Search sites by name"
        />
      </SearchPinned>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={!isLoading && isFetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={scheme.brand}
            colors={[scheme.brand]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
      />

      {fabVisible && (
        <ScrollToTopFab onPress={scrollToTop} opacity={fabOpacity} />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  brandLogo: { width: 44, height: 30 },
  listContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space['2xl'],
  },
  separator: { height: space.lg },
  greetingBlock: {
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  greetingTitle: {
    marginTop: 2,
  },
  searchPinned: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
});

export default Dashboard;
