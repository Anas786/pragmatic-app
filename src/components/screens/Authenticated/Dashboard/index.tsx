import React, {
  FC,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AppText } from "src/components/common";
import { Logo } from "src/assets";
import {
  buildSiteLogoUrl,
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  GRADIENT_YELLOW,
  ICON_SIZE_LG,
  ICON_SIZE_MD,
  normalizeHeight,
  normalizeWidth,
  PROGRESS_FILLED,
  ThemeColors,
} from "src/utils";
import {
  useSiteList,
  useSwitchActiveSite,
  useThemeStore,
} from "src/hooks";
import { DashboardStackParamList, ISite } from "src/types";
import { mockSitesData, MetricItem } from "src/data/mock";
import {
  ChartIcon,
  Close,
  DownArrow,
  Magnify,
  MoonIcon,
  SunIcon,
  UpArrow,
} from "src/assets/icons";

interface MetricIconProps {
  IconComponent: FC<{ size?: number; color?: string }>;
  size: number;
  color: string;
}
const MetricIcon: FC<MetricIconProps> = ({ IconComponent, size, color }) => {
  return <IconComponent size={size} color={color} />;
};

interface SiteCardProps {
  site: ISite;
  metrics: MetricItem[];
  efficiency: number;
  timestamp: string;
  onPress: () => void;
}

const formatSize = (size: ISite["size"]): string => {
  const numeric = typeof size === "string" ? parseFloat(size) : size;
  if (!Number.isFinite(numeric)) return String(size ?? "—");
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/**
 * Memoized so toggling expand on one card doesn't re-render the other 349.
 * Comparator returns true when the card can skip re-render — site identity,
 * metrics reference, efficiency / timestamp, and the onPress callback are
 * the only inputs that matter.
 */
const SiteCard: FC<SiteCardProps> = memo(
  ({ site, metrics, efficiency, timestamp, onPress }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [logoFailed, setLogoFailed] = useState(false);
    const { colors } = useThemeStore();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const displayedMetrics = isExpanded ? metrics : metrics.slice(0, 3);

    const logoUrl = !logoFailed ? buildSiteLogoUrl(site) : null;

    return (
      <TouchableOpacity
        style={styles.siteCard}
        onPress={onPress}
        activeOpacity={0.7}>
        <View style={styles.siteHeader}>
          <View style={styles.siteAvatarContainer}>
            <View style={styles.siteAvatar}>
              {logoUrl ? (
                <Image
                  source={{ uri: logoUrl }}
                  style={styles.brandlogo}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <AppText
                  fontSize={FONT_SIZE_MD}
                  bold
                  color={colors.textSecondary}>
                  {site.name.substring(0, 2).toUpperCase()}
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.siteInfo}>
            <AppText fontSize={FONT_SIZE_XS} medium color={colors.primaryText}>
              {site.name}
            </AppText>
            {timestamp ? (
              <AppText fontSize={FONT_SIZE_XXS} color={colors.textSecondary}>
                {timestamp}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.metricsContainer}>
          {displayedMetrics.map((metric, index) => (
            <View key={`${site.id}-${index}`} style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <MetricIcon
                  IconComponent={metric.IconComponent}
                  size={ICON_SIZE_MD}
                  color={metric.color}
                />
                <AppText fontSize={FONT_SIZE_XXS} color={colors.primaryText}>
                  {metric.label}
                </AppText>
              </View>
              <View style={styles.metricValue}>
                <AppText
                  fontSize={FONT_SIZE_XS}
                  semi_bold
                  color={colors.primaryText}>
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
            <AppText fontSize={FONT_SIZE_XXS} medium color={PROGRESS_FILLED}>
              {efficiency}%
            </AppText>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${efficiency}%` }]}
            />
          </View>
        </View>

        {metrics.length > 3 && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={e => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}>
            <AppText fontSize={FONT_SIZE_XS} color={colors.textSecondary}>
              {isExpanded ? "Collapse View" : "Expand View"}
            </AppText>
            {isExpanded ? (
              <UpArrow size={ICON_SIZE_MD} color={colors.textSecondary} />
            ) : (
              <DownArrow size={ICON_SIZE_MD} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.site === next.site &&
    prev.metrics === next.metrics &&
    prev.efficiency === next.efficiency &&
    prev.timestamp === next.timestamp &&
    prev.onPress === next.onPress,
);

/**
 * For fields the API doesn't expose yet (efficiency, timestamp, live metrics)
 * we cycle through the mock dataset so each real site gets a deterministic
 * placeholder until the live-telemetry endpoints are wired.
 */
const PV_SIZE_METRIC = (size: ISite["size"]): MetricItem => ({
  label: "PV Size",
  value: formatSize(size),
  unit: "kW",
  IconComponent: ChartIcon,
  color: GRADIENT_YELLOW,
});

interface SiteRow {
  site: ISite;
  metrics: MetricItem[];
  efficiency: number;
  timestamp: string;
}

/**
 * Backend ships `dataLastUpdate` as an epoch-ms string (e.g.
 * `"1777920604000"`). Format it into the same shape as the existing
 * mock timestamp ("DD/MM/YYYY, hh:mm A") so the row layout stays
 * consistent. Returns `null` for missing / unparseable values so the
 * caller can fall back to the mock placeholder until real data arrives.
 */
const formatLastUpdate = (raw: string | undefined | null): string | null => {
  if (!raw) return null;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${pad(hours)}:${minutes} ${ampm}`;
};

/**
 * Pixel offset after which the "scroll to top" floating button becomes
 * visible. Roughly the height of two-and-a-half site cards on a normal
 * phone, so the button only appears once there's actually somewhere to
 * scroll back to.
 */
const SCROLL_TO_TOP_THRESHOLD = 300;

const Dashboard: FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParamList>>();
  const { isDark, colors, toggleTheme } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const listRef = useRef<FlatList<SiteRow>>(null);
  const fabOpacity = useRef(new Animated.Value(0)).current;
  const [fabVisible, setFabVisible] = useState(false);

  // Two states for the search box:
  //   - `query`         : controlled input, updated on every keystroke
  //                       (instant UI feedback)
  //   - `debouncedQuery`: trailing-debounced version that drives the
  //                       API call. 350 ms is enough to avoid firing a
  //                       request per keystroke without feeling laggy.
  //
  // Search only triggers once the user has typed at least 4 characters.
  // Below that we keep `debouncedQuery` empty so the hook reverts to the
  // unfiltered list — no wasted requests on 1–3 char inputs.
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const SEARCH_MIN_LEN = 4;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < SEARCH_MIN_LEN) {
      // Drop any pending debounced search and revert to the full list
      // immediately. Avoids a stale "pak" request landing after the
      // user has backspaced down to "pa".
      setDebouncedQuery(prev => (prev === "" ? prev : ""));
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 350);
    return () => clearTimeout(handle);
  }, [query]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const shouldShow = y > SCROLL_TO_TOP_THRESHOLD;

      setFabVisible(prev => {
        if (prev === shouldShow) return prev;
        Animated.timing(fabOpacity, {
          toValue: shouldShow ? 1 : 0,
          duration: 180,
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

  // Search is server-side now — `q` is part of the React Query cache
  // key so each search caches its own paginated stream. Empty string ⇒
  // no `q` param sent, full list returned.
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

  /**
   * Pre-build the full row dataset (real site + mock placeholder fields)
   * once per `sites` reference. This:
   *  - keeps `metrics` array references stable across re-renders so the
   *    memoized SiteCard skips re-rendering when the list re-renders,
   *  - moves the work off the render path of every visible card.
   *
   * Real fields used: id, name, size, controller, logo_ext, state,
   * dataLastUpdate. Live-telemetry metrics still cycle through the mock
   * dataset until that endpoint lands.
   */
  const rows: SiteRow[] = useMemo(
    () =>
      sites.map((site, index) => {
        const mock = mockSitesData[index % mockSitesData.length];
        return {
          site,
          metrics: [PV_SIZE_METRIC(site.size), ...mock.metrics],
          efficiency: mock.efficiency,
          timestamp: formatLastUpdate(site.dataLastUpdate) ?? mock.timestamp,
        };
      }),
    [sites],
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  const switchActiveSite = useSwitchActiveSite();

  const handleCardPress = useCallback(
    (row: SiteRow) => {
      // Switch the active site:
      //   - Same site as last tap   → cache hit, no refetch
      //   - Different site than last → previous site's two cache entries
      //                                are evicted and both endpoints
      //                                ( /protected/data/all/{id} and
      //                                  /protected/config/site/{id} )
      //                                refetch for the new siteId in
      //                                parallel.
      switchActiveSite(row.site.id);
      navigation.navigate("SiteDetail", {
        siteId: row.site.id,
        siteName: row.site.name,
        siteSubtitle: row.site.controller
          ? `${formatSize(row.site.size)} kW · Controller`
          : `${formatSize(row.site.size)} kW`,
        efficiency: row.efficiency,
        siteimage: buildSiteLogoUrl(row.site),
      });
    },
    [navigation, switchActiveSite],
  );

  const renderItem: ListRenderItem<SiteRow> = useCallback(
    ({ item }) => (
      <SiteCard
        site={item.site}
        metrics={item.metrics}
        efficiency={item.efficiency}
        timestamp={item.timestamp}
        onPress={() => handleCardPress(item)}
      />
    ),
    [handleCardPress],
  );

  const keyExtractor = useCallback((row: SiteRow) => row.site.id, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [styles.separator],
  );

  /**
   * Infinite-scroll trigger. FlatList fires `onEndReached` once per
   * approach to the end-of-list threshold; the hook itself dedupes
   * concurrent calls via React Query's `isFetchingNextPage`. Pagination
   * is enabled during search too — the server returns a paginated
   * stream of `q`-matching sites.
   */
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const ListFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.primaryText} />
          <AppText
            fontSize={FONT_SIZE_XXS}
            color={colors.textSecondary}
            style={styles.footerLoaderText}>
            Loading more sites...
          </AppText>
        </View>
      );
    }
    // Once we've loaded everything for the current (filtered or
    // unfiltered) result set, surface a soft confirmation.
    if (!hasNextPage && sites.length > 0 && !isLoading) {
      return (
        <View style={styles.footerLoader}>
          <AppText
            fontSize={FONT_SIZE_XXS}
            color={colors.textSecondary}
            center>
            {debouncedQuery
              ? `${total} site${total === 1 ? '' : 's'} match "${debouncedQuery}"`
              : `All ${total} sites loaded`}
          </AppText>
        </View>
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
    colors,
    styles,
  ]);

  /**
   * Search bar — sticky header. FlatList pins index 0 of children
   * including the ListHeaderComponent.
   *
   * Not wrapped in `useMemo` because it depends on the controlled `query`
   * value: memoization would cache a stale TextInput. Re-rendering only
   * the header on every keystroke is cheap; FlatList rows stay memoized
   * via the SiteCard comparator.
   */
  const ListHeader = (
    <View style={styles.stickyGroup}>
      <View style={styles.searchContainer}>
        <Magnify size={ICON_SIZE_MD} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search sites by name"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          // Hide the native iOS clear button — we render our own so both
          // platforms behave the same.
          clearButtonMode="never"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={clearSearch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Clear search">
            <Close size={ICON_SIZE_MD} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const ListEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="large" color={colors.primaryText} />
          <AppText
            fontSize={FONT_SIZE_SM}
            color={colors.textSecondary}
            style={styles.statusText}>
            Loading sites...
          </AppText>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.statusContainer}>
          <AppText
            fontSize={FONT_SIZE_SM}
            medium
            color={colors.primaryText}
            center>
            Couldn't load your sites.
          </AppText>
          <AppText
            fontSize={FONT_SIZE_XS}
            color={colors.textSecondary}
            center
            style={styles.statusText}>
            {error.message ?? "Please try again."}
          </AppText>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <AppText fontSize={FONT_SIZE_XS} medium color={PROGRESS_FILLED}>
              Retry
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    // Server returned zero rows for the active search query.
    if (debouncedQuery.length > 0) {
      return (
        <View style={styles.statusContainer}>
          <AppText
            fontSize={FONT_SIZE_SM}
            medium
            color={colors.primaryText}
            center>
            No sites match "{debouncedQuery}"
          </AppText>
          <TouchableOpacity onPress={clearSearch} style={styles.retryBtn}>
            <AppText fontSize={FONT_SIZE_XS} medium color={PROGRESS_FILLED}>
              Clear search
            </AppText>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.statusContainer}>
        <AppText fontSize={FONT_SIZE_SM} color={colors.textSecondary} center>
          No sites available.
        </AppText>
      </View>
    );
  }, [
    isLoading,
    error,
    debouncedQuery,
    clearSearch,
    colors,
    styles,
    refetch,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.splashBg}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <View
            style={[
              styles.hamburgerLine,
              { backgroundColor: colors.primaryText },
            ]}
          />
          <View
            style={[
              styles.hamburgerLine,
              {
                width: normalizeWidth(12),
                backgroundColor: colors.primaryText,
              },
            ]}
          />
          <View
            style={[
              styles.hamburgerLine,
              { width: normalizeWidth(6), backgroundColor: colors.primaryText },
            ]}
          />
        </TouchableOpacity>

        <Image source={Logo} style={styles.logo} resizeMode="contain" />

        <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
          {isDark ? (
            <SunIcon size={ICON_SIZE_LG} color={colors.primaryText} />
          ) : (
            <MoonIcon size={ICON_SIZE_LG} color={colors.primaryText} />
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // Allow tapping a card without first dismissing the keyboard. Without
        // this the first tap only dismisses; the second tap opens the card.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={!isLoading && isFetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={colors.primaryText}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        // Pagination: fetch the next page when the list is half a viewport
        // away from the end. 0.5 is conservative enough that on slow
        // networks the spinner appears before the user hits a dead-end.
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        // ---- virtualization tuning ----
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        // Cards have variable heights (expand toggle), so we don't supply
        // getItemLayout. The defaults above keep render volume low.
      />

      {fabVisible && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.scrollToTopFab,
            {
              opacity: fabOpacity,
              transform: [
                {
                  translateY: fabOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Scroll to top"
            activeOpacity={0.8}
            onPress={scrollToTop}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.scrollToTopBtn}>
            <UpArrow size={ICON_SIZE_LG} color={colors.primaryText} />
          </TouchableOpacity>
        </Animated.View>
      )}
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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
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
    themeButton: {
      padding: normalizeWidth(4),
    },
    listContent: {
      paddingBottom: normalizeHeight(20),
    },
    stickyGroup: {
      backgroundColor: colors.splashBg,
      paddingHorizontal: normalizeWidth(12),
      paddingTop: normalizeHeight(12),
      paddingBottom: normalizeHeight(8),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingHorizontal: normalizeWidth(12),
      height: normalizeHeight(40),
      gap: normalizeWidth(8),
    },
    searchInput: {
      flex: 1,
      color: colors.primaryText,
      fontSize: FONT_SIZE_SM,
      fontFamily: "Poppins-Regular",
      // Trim TextInput's vertical padding so the input stays vertically
      // centered inside the pill-shaped search container.
      paddingVertical: 0,
      paddingHorizontal: 0,
    },
    separator: {
      height: normalizeHeight(8),
    },
    siteCard: {
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 20,
      padding: normalizeWidth(12),
      marginHorizontal: normalizeWidth(12),
      gap: normalizeHeight(12),
    },
    siteHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(10),
    },
    siteAvatarContainer: {
      position: "relative",
    },
    siteAvatar: {
      width: normalizeWidth(36),
      height: normalizeWidth(36),
      borderRadius: 100,
      backgroundColor: colors.darkBgSecondary,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    brandlogo: {
      width: normalizeWidth(36),
      height: normalizeHeight(36),
      borderRadius: 100,
    },
    siteInfo: {
      flex: 1,
      gap: normalizeHeight(6),
    },
    metricsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: normalizeWidth(8),
    },
    metricCard: {
      flex: 1,
      minWidth: "30%",
      backgroundColor: colors.inputDarkBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 12,
      padding: normalizeWidth(8),
      gap: normalizeHeight(8),
    },
    metricHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(4),
    },
    metricValue: {
      flexDirection: "row",
      alignItems: "center",
      gap: normalizeWidth(4),
    },
    efficiencyContainer: {
      gap: normalizeHeight(8),
    },
    efficiencyHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressBar: {
      height: normalizeHeight(4),
      backgroundColor: colors.progressBg,
      borderRadius: 1000,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: PROGRESS_FILLED,
      borderRadius: 1000,
    },
    expandButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      borderRadius: 100,
      paddingVertical: normalizeHeight(8),
      gap: normalizeWidth(8),
    },
    statusContainer: {
      paddingHorizontal: normalizeWidth(12),
      paddingVertical: normalizeHeight(40),
      alignItems: "center",
      gap: normalizeHeight(8),
    },
    footerLoader: {
      paddingVertical: normalizeHeight(20),
      alignItems: "center",
      gap: normalizeHeight(6),
    },
    footerLoaderText: {
      marginTop: normalizeHeight(4),
    },
    statusText: {
      marginTop: normalizeHeight(4),
    },
    retryBtn: {
      paddingHorizontal: normalizeWidth(20),
      paddingVertical: normalizeHeight(10),
      borderWidth: 1,
      borderColor: PROGRESS_FILLED,
      borderRadius: 100,
      marginTop: normalizeHeight(12),
    },
    scrollToTopFab: {
      position: "absolute",
      right: normalizeWidth(16),
      bottom: normalizeHeight(24),
    },
    scrollToTopBtn: {
      width: normalizeWidth(44),
      height: normalizeWidth(44),
      borderRadius: normalizeWidth(22),
      backgroundColor: colors.metricCardBg,
      borderWidth: 1,
      borderColor: colors.inputDarkBorder,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },
  });

export default Dashboard;
