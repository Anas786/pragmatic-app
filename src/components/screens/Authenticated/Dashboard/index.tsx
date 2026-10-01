import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  ListRenderItem,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActionBtn,
  AppText,
  Fab,
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
import { duration, radius, space, useScheme } from 'src/theme';
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

// The PES logo is dark-green on transparent — it reads on light surfaces but
// its "P"/"S" vanish on the dark-mode header bg. In dark mode we back it with a
// white tile (same treatment the Splash screen uses) so the mark stays legible.
// Padding is applied in both modes so toggling theme causes no layout shift.
const BrandLogo: FC = () => {
  const scheme = useScheme();
  return (
    <View style={[styles.brandLogoWrap, scheme.isDark && styles.brandLogoTileDark]}>
      <Image source={Logo} style={styles.brandLogo} resizeMode="contain" />
    </View>
  );
};

const Separator: FC = () => <View style={styles.separator} />;

/* ─────────────────── Scroll-to-top FAB ─────────────────── */

interface ScrollToTopFabProps {
  onPress: () => void;
  scrollY: SharedValue<number>;
}

/** Permanently mounted — visibility is derived from the list's scroll offset
 *  entirely on the UI thread (no per-frame setState / React commit while the
 *  user is mid-gesture).
 *
 *  ⚠️ The worklet must return ONLY style properties. Animating
 *  `pointerEvents` here hoists it into a Fabric view prop and trips a
 *  duplicate-raw-prop assert in folly's F14 set (debug SIGABRT). Instead the
 *  hidden FAB slides fully below the screen edge — off-screen views can't be
 *  tapped — and `onPress` re-checks the offset to cover mid-animation taps. */
const ScrollToTopFab: FC<ScrollToTopFabProps> = ({ onPress, scrollY }) => {
  const scheme = useScheme();
  const animatedStyle = useAnimatedStyle(() => {
    const visible = scrollY.value > SCROLL_TO_TOP_THRESHOLD;
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: duration.fast }),
      transform: [
        // 96 clears the 52pt FAB + 20pt bottom inset + shadow.
        { translateY: withTiming(visible ? 0 : 96, { duration: duration.fast }) },
      ],
    };
  });
  const guardedPress = useCallback(() => {
    if (scrollY.value <= SCROLL_TO_TOP_THRESHOLD) return;
    onPress();
  }, [onPress, scrollY]);
  return (
    <Animated.View style={[styles.fabWrap, animatedStyle]}>
      <Fab onPress={guardedPress} accessibilityLabel="Scroll to top" haptic="tap">
        <UpArrow size={ICON_SIZE_LG} color={scheme.textOnBrand} />
      </Fab>
    </Animated.View>
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
  const scrollY = useSharedValue(0);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchBarRef = useRef<SearchBarHandle>(null);

  // UI-thread scroll tracking — the FAB reads this shared value directly,
  // so scrolling never triggers a React commit.
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const {
    sites,
    total,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    refresh,
    error,
    isPaused,
  } = useSiteList({ q: debouncedQuery });

  // RefreshControl is driven by LOCAL state so the spinner engages ONLY on
  // a user pull — deriving it from `isFetching` made every background
  // refetch (focus regain, stale search-cache revalidation) yank the list
  // down with a phantom spinner. `.finally` because react-query's refetch
  // promise resolves (never rejects) even when the fetch errors.
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refresh().finally(() => setRefreshing(false));
  }, [refresh]);

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

  // Memoised ELEMENTS (not component functions) — a fresh component identity
  // passed to ListFooterComponent/ListEmptyComponent remounts the whole
  // subtree on every Dashboard render, restarting skeleton shimmer loops.
  const ListFooter = useMemo(() => {
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

  const ListEmpty = useMemo(() => {
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
    // Offline: the fetch is paused, not failed (see useSiteList#isPaused),
    // so without this the list fell through to "No sites available." — e.g.
    // an airplane-mode launch, which the splash now routes here when a
    // session is stored. The paused fetch resumes by itself when back online.
    if (isPaused) {
      return (
        <StatusContainer>
          <AppText
            fontSize={FONT_SIZE_MD}
            semi_bold
            color={scheme.textPrimary}
            center>
            You're offline
          </AppText>
          <StatusSubtext>
            Your sites will load as soon as you're back online.
          </StatusSubtext>
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
  }, [
    isLoading,
    error,
    isPaused,
    debouncedQuery,
    clearSearch,
    refetch,
    scheme.textPrimary,
    scheme.textSecondary,
    scheme.textOnBrand,
  ]);

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

      <Animated.FlatList
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={scheme.brand}
            colors={[scheme.brand]}
          />
        }
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        initialNumToRender={6}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
      />

      <ScrollToTopFab onPress={scrollToTop} scrollY={scrollY} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  brandLogo: { width: 54, height: 26 },
  brandLogoWrap: { paddingHorizontal: space.sm, paddingVertical: 5 },
  brandLogoTileDark: { backgroundColor: '#FFFFFF', borderRadius: radius.md },
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
  // Mirrors the positioning the shared FabWrap used to provide — kept local
  // because the FAB is now driven by a Reanimated shared value, not an
  // RN Animated.Value.
  fabWrap: {
    position: 'absolute',
    right: space.lg,
    bottom: space.xl,
  },
});

export default Dashboard;
