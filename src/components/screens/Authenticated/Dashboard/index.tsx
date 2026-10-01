import React, {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  AppState,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onlineManager } from '@tanstack/react-query';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AppText,
  EmptyStateCard,
  Fab,
  FooterLoader,
  HamburgerIcon,
  IconButton,
  OverlineLabel,
  PESLogo,
  PressableScale,
  ScreenContainer,
  SearchBar,
  SearchBarHandle,
  Skeleton,
  TopBar,
} from 'src/components/common';
import { FAB_SIZE } from 'src/components/common/Fab';
import { duration, radius, Scheme, space, touch, useScheme, useThemedStyles } from 'src/theme';
import { HEIGHT } from 'src/utils/constants/app';
import { friendlyError } from 'src/utils/errors';
import { formatClock } from 'src/utils/format';
import { buildSiteLogoUrl } from 'src/utils/site';
import { numericCardValue } from 'src/utils/sources';
import { ICON_SIZE_LG, ICON_SIZE_MD } from 'src/utils/theme';
import { formatQuantity } from 'src/utils/units';
import { useSiteList, useSwitchActiveSite, useThemeStore } from 'src/hooks';
import { runUserRefresh } from 'src/networking/freshFetch';
import { DashboardStackParamList, ISite } from 'src/types';
import { MoonIcon, SunIcon, UpArrow } from 'src/assets/icons';
import { SiteCard } from './components/SiteCard';
import SiteCardSkeleton, {
  SITE_CARD_SKELETON_HEIGHT,
} from './components/SiteCardSkeleton';

/** Server search starts at 2 characters; the Search key runs 1. */
const SEARCH_MIN_LEN = 2;
const SCROLL_TO_TOP_THRESHOLD = 320;
/** Separator between cards. */
const CARD_GAP = space.md;
/** Enough skeletons to fill a tall screen — no gap under the last one. */
const SKELETON_COUNT = Math.ceil(HEIGHT / (SITE_CARD_SKELETON_HEIGHT + CARD_GAP));
/** Foreground resume refreshes page 1 when the list is older than this… */
const RESUME_REFRESH_AFTER_MS = 5 * 60_000;
/** …and only while the user is near the top (no pages pulled from under them). */
const RESUME_REFRESH_MAX_SCROLL = 200;

/** The list scrolls under the home indicator (bottom inset padded in). */
const SCREEN_EDGES: ('top' | 'left' | 'right')[] = ['top', 'left', 'right'];

const subscribeOnline = (onChange: () => void) => onlineManager.subscribe(() => onChange());
const getOnline = () => onlineManager.isOnline();

/** SiteDetail header subtitle: '30 MW · Controller'. */
const siteSubtitle = (site: ISite): string => {
  const kw = numericCardValue(site.size);
  const cap = formatQuantity(site.size, 'kW', { mode: 'compact' });
  return [
    kw !== null && kw > 0 ? `${cap.text} ${cap.unit}` : null,
    site.controller ? 'Controller' : null,
  ]
    .filter(Boolean)
    .join(' · ');
};

/* ─────────────────── Dashboard-local layout ─────────────────── */

const SearchPinned: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.searchPinned}>{children}</View>
);

const Separator: FC = () => <View style={styles.separator} />;

/** Outline secondary button (≥ touch.min tall): footer Retry, 'Contact us'. */
const SecondaryAction: FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const themed = useThemedStyles(createStyles);
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={themed.secondaryAction}>
      <AppText variant="bodySm" semi_bold>
        {label}
      </AppText>
    </PressableScale>
  );
};

/* ─────────────────── List status strip ─────────────────── */

const STRIP_ROW_H = 20;
const STRIP_SLOP = Math.ceil((touch.min - STRIP_ROW_H) / 2);
const STRIP_ACTION_SLOP = { top: STRIP_SLOP, bottom: STRIP_SLOP, left: space.sm, right: space.sm };

interface ListStatusStripProps {
  kind: 'offline' | 'refreshError';
  updatedAt: number;
  onRetry: () => void;
}

/**
 * One-line, non-blocking notice under the search bar while cached rows
 * stay on screen: offline ('Offline · showing data from 14:36') or a
 * failed refresh ('Couldn't refresh · Retry'). Never replaces the list.
 */
const ListStatusStrip: FC<ListStatusStripProps> = ({ kind, updatedAt, onRetry }) => {
  const scheme = useScheme();
  const offline = kind === 'offline';
  const text = offline
    ? updatedAt > 0
      ? `Offline · showing data from ${formatClock(updatedAt)}`
      : 'Offline'
    : "Couldn't refresh";
  return (
    <View style={styles.strip}>
      <Icon
        name={offline ? 'wifi-off' : 'error-outline'}
        size={ICON_SIZE_MD}
        color={offline ? scheme.statusInk.warning : scheme.statusInk.danger}
      />
      <AppText
        variant="caption"
        tone="secondary"
        numberOfLines={1}
        accessibilityLiveRegion="polite"
        style={styles.stripText}>
        {text}
      </AppText>
      {offline ? null : (
        <PressableScale
          onPress={onRetry}
          hitSlop={STRIP_ACTION_SLOP}
          accessibilityLabel="Retry refreshing sites"
          style={styles.stripAction}>
          <AppText variant="caption" semi_bold tone="brand">
            Retry
          </AppText>
        </PressableScale>
      )}
    </View>
  );
};

/* ─────────────────── Scroll-to-top FAB ─────────────────── */

interface ScrollToTopFabProps {
  onPress: () => void;
  scrollY: SharedValue<number>;
  /** Distance from the screen's bottom edge (safe-area inset + gap). */
  bottom: number;
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
const ScrollToTopFab: FC<ScrollToTopFabProps> = ({ onPress, scrollY, bottom }) => {
  const scheme = useScheme();
  // Clears the FAB, its bottom offset (incl. the home-indicator inset) and
  // its 12pt shadow, whatever the device.
  const hiddenOffset = FAB_SIZE + bottom + space['2xl'];
  const animatedStyle = useAnimatedStyle(() => {
    const visible = scrollY.value > SCROLL_TO_TOP_THRESHOLD;
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: duration.fast }),
      transform: [
        { translateY: withTiming(visible ? 0 : hiddenOffset, { duration: duration.fast }) },
      ],
    };
  });
  const guardedPress = useCallback(() => {
    if (scrollY.value <= SCROLL_TO_TOP_THRESHOLD) return;
    onPress();
  }, [onPress, scrollY]);
  const wrapStyle = useMemo(() => [styles.fabWrap, { bottom }, animatedStyle], [bottom, animatedStyle]);
  return (
    <Animated.View style={wrapStyle}>
      <Fab onPress={guardedPress} accessibilityLabel="Scroll to top">
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
  const insets = useSafeAreaInsets();
  const isOnline = useSyncExternalStore(subscribeOnline, getOnline);

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
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
    error,
    isPaused,
    listUpdatedAt,
    isRefetchError,
    isFetchNextPageError,
  } = useSiteList({ q: debouncedQuery });

  // RefreshControl is driven by LOCAL state so the spinner engages ONLY on
  // a user pull — deriving it from `isFetching` made every background
  // refetch (focus regain, stale search-cache revalidation) yank the list
  // down with a phantom spinner. `.finally` because react-query's refetch
  // promise resolves (never rejects) even when the fetch errors.
  const [refreshing, setRefreshing] = useState(false);
  // Offline pull: refresh() would PAUSE (not fail) and first prune every
  // page beyond the first — so it is skipped. The spinner still has to go
  // true → false through a commit, or iOS's native control keeps spinning.
  const skipSpinnerRef = useRef(false);
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (!onlineManager.isOnline()) {
      skipSpinnerRef.current = true;
      return;
    }
    // A user gesture: the request skips the CDN's shared copy
    // (freshFetch.ts), so a pull really returns the server's current list.
    runUserRefresh(refresh).finally(() => setRefreshing(false));
  }, [refresh]);
  // The full-screen error card's Retry is a user refresh too.
  const handleErrorRetry = useCallback(() => {
    runUserRefresh(refresh).catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!refreshing || !skipSpinnerRef.current) return;
    const id = requestAnimationFrame(() => {
      skipSpinnerRef.current = false;
      setRefreshing(false);
    });
    return () => cancelAnimationFrame(id);
  }, [refreshing]);

  // Connection lost mid-refresh: the fetch pauses and its promise won't
  // settle until reconnect — don't leave the spinner up meanwhile.
  useEffect(() => {
    if (!isOnline) setRefreshing(false);
  }, [isOnline]);

  // Foreground resume: refresh page 1 when the list is > 5 min old and the
  // user is near the top. Latest values via a ref so the listener is
  // registered once.
  const resumeState = useRef({ listUpdatedAt, isFetching, refresh });
  useEffect(() => {
    resumeState.current = { listUpdatedAt, isFetching, refresh };
  }, [listUpdatedAt, isFetching, refresh]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      const { listUpdatedAt: at, isFetching: busy, refresh: run } = resumeState.current;
      if (busy || at <= 0 || Date.now() - at <= RESUME_REFRESH_AFTER_MS) return;
      if (!onlineManager.isOnline()) return;
      if (scrollY.value >= RESUME_REFRESH_MAX_SCROLL) return;
      run();
    });
    return () => sub.remove();
  }, [scrollY]);

  const rows: SiteRow[] = useMemo(
    () => sites.map(site => ({ site })),
    [sites],
  );
  const hasRows = rows.length > 0;

  const clearSearch = useCallback(() => {
    searchBarRef.current?.clear();
    setDebouncedQuery('');
  }, []);

  const openDrawer = useCallback(
    () => navigation.dispatch(DrawerActions.openDrawer()),
    [navigation],
  );
  const openContactUs = useCallback(() => navigation.navigate('ContactUs'), [navigation]);

  const switchActiveSite = useSwitchActiveSite();

  const handleCardPress = useCallback(
    (row: SiteRow) => {
      const { site } = row;
      switchActiveSite(site.id);
      navigation.navigate('SiteDetail', {
        siteId: site.id,
        siteName: site.name,
        siteSubtitle: siteSubtitle(site),
        efficiency: 0,
        siteimage: buildSiteLogoUrl(site),
        // Seeds the SiteDetail header's freshness status before /data/all
        // lands — the same values this card was showing.
        state: site.state ?? null,
        dataLastUpdate: site.dataLastUpdate ?? null,
        capacityKw: numericCardValue(site.size),
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

  // A failed page load waits for the footer's Retry instead of re-firing on
  // every scroll past the threshold.
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

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
    if (isFetchNextPageError && hasRows) {
      return (
        <FooterLoader>
          <View style={styles.footerStack}>
            <AppText variant="bodySm" tone="secondary" center>
              Couldn't load more sites
            </AppText>
            <SecondaryAction label="Retry" onPress={fetchNextPage} />
          </View>
        </FooterLoader>
      );
    }
    if (!hasNextPage && hasRows && !isLoading) {
      return (
        <FooterLoader>
          <AppText variant="caption" tone="tertiary" center>
            {debouncedQuery ? 'End of results' : `All ${total} sites loaded`}
          </AppText>
        </FooterLoader>
      );
    }
    return null;
  }, [
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    hasRows,
    isLoading,
    debouncedQuery,
    total,
    fetchNextPage,
  ]);

  const ListHeader = useMemo(() => {
    const searching = debouncedQuery.length > 0;
    const one = total === 1;
    let title: ReactNode = null;
    if (isLoading) {
      title = (
        <View style={styles.headerSkeleton}>
          <Skeleton width={120} height={18} />
        </View>
      );
    } else if (searching) {
      title = (
        <AppText variant="h3" accessibilityRole="header" numberOfLines={2}>
          {`${total} ${one ? 'site matches' : 'sites match'} "${debouncedQuery}"`}
        </AppText>
      );
    } else if (hasRows) {
      title = (
        <AppText variant="h3" accessibilityRole="header" numberOfLines={2}>
          {`${total} ${one ? 'site' : 'sites'}`}
          {listUpdatedAt > 0 ? (
            <AppText variant="bodySm" tone="secondary">
              {` · Updated ${formatClock(listUpdatedAt)}`}
            </AppText>
          ) : null}
        </AppText>
      );
    }
    return (
      <View style={styles.listHeader}>
        <OverlineLabel>{searching ? 'SEARCH RESULTS' : 'YOUR FLEET'}</OverlineLabel>
        {title}
      </View>
    );
  }, [debouncedQuery, total, isLoading, hasRows, listUpdatedAt]);

  const ListEmpty = useMemo(() => {
    if (isLoading) {
      return (
        // Same 12pt gap as the real separators, so cards land in place.
        <View style={styles.skeletonStack}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <SiteCardSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (error) {
      // friendlyError keeps the raw axios message / status out of the UI
      // (it is logged via display() in dev builds only).
      const copy = friendlyError(error);
      return (
        <EmptyStateCard
          kind={copy.kind === 'offline' ? 'offline' : 'error'}
          title={copy.title}
          message={copy.message}
          onRetry={handleErrorRetry}
          retryLabel="Retry"
        />
      );
    }
    // Offline: the fetch is paused, not failed (see useSiteList#isPaused),
    // so without this the list fell through to the empty state — e.g. an
    // airplane-mode launch, which the splash routes here when a session is
    // stored. The paused fetch resumes by itself when back online.
    if (isPaused) {
      return (
        <EmptyStateCard
          kind="offline"
          title="You're offline"
          message="Your sites will load as soon as you're back online."
        />
      );
    }
    if (debouncedQuery.length > 0) {
      return (
        <EmptyStateCard
          kind="noMatch"
          title={`No sites match "${debouncedQuery}"`}
          message="Check the spelling or try another name."
          onRetry={clearSearch}
          retryLabel="Clear search"
        />
      );
    }
    return (
      <EmptyStateCard
        kind="empty"
        title="No sites assigned yet"
        message={
          <View style={styles.emptyMessage}>
            <AppText variant="bodySm" tone="secondary" center>
              Ask your administrator to give you access.
            </AppText>
            <SecondaryAction label="Contact us" onPress={openContactUs} />
          </View>
        }
      />
    );
  }, [isLoading, error, isPaused, debouncedQuery, clearSearch, handleErrorRetry, openContactUs]);

  // Content scrolls under the home indicator; the last card rests above it.
  const listContentStyle = useMemo<ViewStyle[]>(
    () => [styles.listContent, { paddingBottom: insets.bottom + space['2xl'] }],
    [insets.bottom],
  );

  let strip: ReactNode = null;
  if (hasRows && !isOnline) {
    strip = <ListStatusStrip kind="offline" updatedAt={listUpdatedAt} onRetry={handleRefresh} />;
  } else if (hasRows && isRefetchError && !isFetching) {
    strip = <ListStatusStrip kind="refreshError" updatedAt={listUpdatedAt} onRetry={handleRefresh} />;
  }

  return (
    <ScreenContainer edges={SCREEN_EDGES}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <TopBar>
        <IconButton onPress={openDrawer} accessibilityLabel="Open menu">
          <HamburgerIcon />
        </IconButton>

        <PESLogo width={64} height={30} />

        <IconButton
          onPress={toggleTheme}
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
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
        {strip}
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
        contentContainerStyle={listContentStyle}
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

      <ScrollToTopFab
        onPress={scrollToTop}
        scrollY={scrollY}
        bottom={insets.bottom + space.lg}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: space.lg,
  },
  separator: { height: CARD_GAP },
  skeletonStack: { gap: CARD_GAP },
  listHeader: {
    paddingTop: space.lg,
    paddingBottom: space.md,
    gap: 2,
  },
  headerSkeleton: {
    height: 24,
    justifyContent: 'center',
  },
  searchPinned: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: STRIP_ROW_H,
    paddingHorizontal: space.xs,
  },
  stripText: {
    flex: 1,
    minWidth: 0,
  },
  stripAction: {
    minHeight: STRIP_ROW_H,
    justifyContent: 'center',
  },
  footerStack: {
    alignItems: 'center',
    gap: space.sm,
  },
  emptyMessage: {
    alignItems: 'center',
    gap: space.md,
  },
  // Mirrors the positioning the shared FabWrap used to provide — kept local
  // because the FAB is now driven by a Reanimated shared value, not an
  // RN Animated.Value. `bottom` is applied per render (safe-area inset).
  fabWrap: {
    position: 'absolute',
    right: space.lg,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    secondaryAction: {
      minHeight: touch.min,
      paddingHorizontal: space.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: scheme.borderStrong,
      backgroundColor: scheme.surface,
    },
  });

export default Dashboard;
