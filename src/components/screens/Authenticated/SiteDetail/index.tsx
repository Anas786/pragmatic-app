import React, {
  FC,
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  EmptyStateCard,
  FreshnessStatus,
  IconButton,
  PressableScale,
  ScreenHeader,
  SiteLogo,
} from 'src/components/common';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { ICON_SIZE_MD } from 'src/utils';
import { friendlyError } from 'src/utils/errors';
import { siteStatus } from 'src/utils/freshness';
import {
  useNow,
  useReportMapping,
  useSiteConfig,
  useSiteData,
} from 'src/hooks';
import { DashboardStackParamList } from 'src/types';
import { RefreshIcon } from 'src/assets/icons';
import ViewsContent from './components/ViewsContent';
import SiteDetailSkeleton, {
  TabStripSkeleton,
} from './components/SiteDetailSkeleton';
import TabSelector, { TabOption } from './components/TabSelector';
import {
  capacityQuantity,
  capacityText,
  headerLastUpdate,
  isBodyScrolled,
  isSiteTabQuery,
  RefreshStripState,
  refreshStripState,
  siteDetailPhase,
  siteHeaderA11yLabel,
} from './siteDetailModel';

type SiteDetailRouteProp = RouteProp<DashboardStackParamList, 'SiteDetail'>;

/** Which control started a refresh — only that control shows a spinner. */
type RefreshSource = 'pull' | 'button' | 'retry';

// Same online source as the Dashboard (react-query's onlineManager, fed
// from NetInfo in App.tsx). Module-level so the subscription is stable.
const subscribeOnline = (onChange: () => void) =>
  onlineManager.subscribe(() => onChange());
const getOnline = () => onlineManager.isOnline();

const SiteDetail: FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SiteDetailRouteProp>();
  const {
    siteId,
    siteName,
    siteimage,
    state,
    dataLastUpdate,
    capacityKw,
  } = route.params;
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const liveData = useSiteData(siteId);
  const siteConfig = useSiteConfig(siteId);
  useReportMapping();

  const phase = siteDetailPhase(
    {
      hasData: liveData.data !== undefined,
      isError: liveData.isError,
      fetchStatus: liveData.fetchStatus,
    },
    {
      hasData: siteConfig.data !== undefined,
      isError: siteConfig.isError,
      fetchStatus: siteConfig.fetchStatus,
    },
  );

  /* ── header freshness: the web's "last sync" first, then the newest
     live parameter, then the Dashboard card's value (first paint). ── */
  const lastUpdate = useMemo(
    () => headerLastUpdate(liveData.data, dataLastUpdate),
    [liveData.data, dataLastUpdate],
  );

  /* ── refresh: header button, pull-to-refresh and Retry share one path.
     `cancelRefetch: false` joins an in-flight (or paused) fetch instead of
     cancelling it, and the in-flight ref drops repeat triggers, so each
     refresh issues exactly one /data/all request. Mounted per-tab report
     queries for this site are refreshed with it. ── */
  const { refetch: refetchLive } = liveData;
  const { refetch: refetchConfig } = siteConfig;
  const configMissingRef = useRef(false);
  configMissingRef.current = siteConfig.data === undefined || siteConfig.isError;

  const isOnline = useSyncExternalStore(subscribeOnline, getOnline);
  const offlineNow = !isOnline || liveData.fetchStatus === 'paused';

  const [refreshSource, setRefreshSource] = useState<RefreshSource | null>(null);
  const refreshInFlight = useRef(false);
  // Bumped whenever the UI stops waiting on a refresh early (offline), so
  // that refresh's promises — which settle only on reconnect — can't
  // clear a newer refresh's spinner / guard when they finally do.
  const refreshGen = useRef(0);

  const startRefresh = useCallback(
    (source: RefreshSource) => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      refreshGen.current += 1;
      const gen = refreshGen.current;
      setRefreshSource(source);
      const tasks: Promise<unknown>[] = [
        refetchLive({ cancelRefetch: false }),
        queryClient.refetchQueries(
          {
            type: 'active',
            predicate: query => isSiteTabQuery(query.queryKey, siteId),
          },
          { cancelRefetch: false },
        ),
      ];
      if (configMissingRef.current) {
        tasks.push(refetchConfig({ cancelRefetch: false }));
      }
      Promise.all(tasks)
        .catch(() => undefined)
        .finally(() => {
          if (gen !== refreshGen.current) return; // released early (offline)
          refreshInFlight.current = false;
          setRefreshSource(null);
        });
    },
    [refetchLive, refetchConfig, queryClient, siteId],
  );

  // Offline: a fetch started (or retried) without a connection PAUSES and
  // its promise settles only on reconnect — so never wait on it. Release
  // the spinner + guard on the next frame (the native pull spinner needs
  // its true → false to land in separate commits, as on the Dashboard);
  // the Offline strip / card says why. The paused fetch still resumes by
  // itself on reconnect, and a later trigger joins it (cancelRefetch:
  // false) — still one /data/all request.
  useEffect(() => {
    if (refreshSource === null || !offlineNow) return;
    const id = requestAnimationFrame(() => {
      refreshGen.current += 1;
      refreshInFlight.current = false;
      setRefreshSource(null);
    });
    return () => cancelAnimationFrame(id);
  }, [refreshSource, offlineNow]);

  const handlePullRefresh = useCallback(() => startRefresh('pull'), [startRefresh]);
  const handleHeaderRefresh = useCallback(() => startRefresh('button'), [startRefresh]);
  const handleRetry = useCallback(() => startRefresh('retry'), [startRefresh]);
  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  /* ── tabs: `pendingTab` drives the pinned chip strip and updates on tap
     so the blob morph renders on the next frame; `renderedTab` drives the
     body one rAF later, so the heavy tab mount never shares a commit with
     the chip update (otherwise the morph appears to lag). The same rAF
     resets the body to the top — a new tab opens at its start. ── */
  const scrollRef = useRef<ScrollView>(null);
  const [pendingTab, setPendingTab] = useState<TabOption>('Summary');
  const [renderedTab, setRenderedTab] = useState<TabOption>('Summary');
  const rafRef = useRef<number | null>(null);

  // Hairline under the pinned strip once content scrolls beneath it —
  // a boolean flipped at a threshold, not an animated style.
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const setScrolledIfChanged = useCallback((next: boolean) => {
    if (next === scrolledRef.current) return;
    scrolledRef.current = next;
    setScrolled(next);
  }, []);

  const handleSelectTab = useCallback(
    (tab: TabOption) => {
      setPendingTab(tab);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        setScrolledIfChanged(false);
        setRenderedTab(tab);
      });
    },
    [setScrolledIfChanged],
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const handleBodyScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      setScrolledIfChanged(isBodyScrolled(e.nativeEvent.contentOffset.y)),
    [setScrolledIfChanged],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshSource === 'pull'}
        onRefresh={handlePullRefresh}
        tintColor={scheme.brand}
        colors={[scheme.brand]}
        progressBackgroundColor={scheme.surfaceRaised}
      />
    ),
    [refreshSource, handlePullRefresh, scheme],
  );

  const contentStyle = useMemo(
    () => [styles.scrollContent, { paddingBottom: insets.bottom + space['2xl'] }],
    [insets.bottom],
  );

  const initialError = useMemo(
    () =>
      phase === 'error'
        ? friendlyError(liveData.error ?? siteConfig.error)
        : null,
    [phase, liveData.error, siteConfig.error],
  );

  let body: ReactNode;
  if (phase === 'loading') {
    body = <SiteDetailSkeleton />;
  } else if (phase === 'error' && initialError) {
    body = (
      <EmptyStateCard
        kind={initialError.kind === 'offline' ? 'offline' : 'error'}
        prominent
        title={initialError.title}
        message={initialError.message}
        onRetry={handleRetry}
        retryLabel="Retry"
      />
    );
  } else if (phase === 'offline') {
    body = (
      <EmptyStateCard
        kind="offline"
        prominent
        title="You're offline"
        message="Site data will load automatically once your connection is restored."
      />
    );
  } else {
    const stripState = refreshStripState({
      tab: renderedTab,
      online: isOnline,
      fetchStatus: liveData.fetchStatus,
      isError: liveData.isError,
      isRefetchError: liveData.isRefetchError,
      retrying: refreshSource === 'retry',
    });
    body = (
      <>
        <RefreshStatusStrip
          state={stripState}
          retrying={refreshSource === 'retry'}
          onRetry={handleRetry}
        />
        <ContentFade>
          <ViewsContent tab={renderedTab} />
        </ContentFade>
      </>
    );
  }

  return (
    <SafeAreaView style={themed.container} edges={SAFE_EDGES}>
      <StatusBar
        barStyle={scheme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <SiteDetailHeader
        siteName={siteName}
        siteimage={siteimage}
        lastUpdate={lastUpdate}
        state={state}
        capacityKw={capacityKw}
        refreshing={refreshSource === 'button'}
        onBack={handleBack}
        onRefresh={handleHeaderRefresh}
      />

      {phase === 'content' || phase === 'loading' ? (
        <View style={[themed.tabSlot, scrolled ? themed.tabSlotScrolled : null]}>
          {phase === 'content' ? (
            <TabSelector selected={pendingTab} onSelect={handleSelectTab} />
          ) : (
            <TabStripSkeleton />
          )}
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        // Avoids the hidden-keyboard relayout that was triggering on each
        // tap (Live tab search).
        keyboardShouldPersistTaps="handled"
        onScroll={handleBodyScroll}
        // Throttled scroll events can skip the final offset — the end
        // events settle the hairline at rest.
        onScrollEndDrag={handleBodyScroll}
        onMomentumScrollEnd={handleBodyScroll}
        scrollEventThrottle={32}
        refreshControl={refreshControl}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
};

const SAFE_EDGES = ['top', 'left', 'right'] as const;

/* ─────────────── header ─────────────── */

interface SiteDetailHeaderProps {
  siteName: string;
  siteimage: string | null;
  lastUpdate: number | null;
  state?: string | null;
  capacityKw?: number | null;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}

/** Hides decorative / duplicated header parts from screen readers — the
 *  title carries the composed label instead. */
const A11yHidden: FC<{ children?: ReactNode }> = ({ children }) => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {children}
  </View>
);

/**
 * SiteLogo · name · '● Updated 4 min ago · 1.25 MW', and a soft refresh
 * button. The title is ONE heading whose label also speaks the capacity
 * and the freshness ('CCI FGF, 1.25 megawatts, Live, updated 4 minutes
 * ago'). Memoised and ticking on the shared `useNow` itself, so the age
 * moves on without re-rendering the screen.
 */
const SiteDetailHeaderBase: FC<SiteDetailHeaderProps> = ({
  siteName,
  siteimage,
  lastUpdate,
  state,
  capacityKw,
  refreshing,
  onBack,
  onRefresh,
}) => {
  const scheme = useScheme();
  const now = useNow();
  const capacity = useMemo(() => capacityQuantity(capacityKw), [capacityKw]);
  const spokenStatus = siteStatus(state, lastUpdate, now).spoken;
  const titleLabel = siteHeaderA11yLabel(siteName, capacity, spokenStatus);

  return (
    <ScreenHeader
      align="left"
      title={siteName}
      titleAccessibilityLabel={titleLabel}
      onBack={onBack}
      leading={
        <A11yHidden>
          <SiteLogo uri={siteimage} name={siteName} size={36} />
        </A11yHidden>
      }
      subtitle={
        <A11yHidden>
          <FreshnessStatus
            variant="updated"
            lastUpdate={lastUpdate}
            state={state}
            trailing={capacityText(capacity)}
          />
        </A11yHidden>
      }
      right={
        <IconButton
          variant="soft"
          onPress={onRefresh}
          busy={refreshing}
          accessibilityLabel="Refresh site data">
          {refreshing ? (
            <ActivityIndicator size="small" color={scheme.brandText} />
          ) : (
            <RefreshIcon size={ICON_SIZE_MD} color={scheme.brandText} />
          )}
        </IconButton>
      }
    />
  );
};
SiteDetailHeaderBase.displayName = 'SiteDetailHeader';
const SiteDetailHeader = memo(SiteDetailHeaderBase);

/* ─────────────── refresh status strip ─────────────── */

interface RefreshStatusStripProps {
  /** From `refreshStripState` — null renders nothing. */
  state: RefreshStripState;
  /** The strip's own Retry is in flight — spinner in its place. */
  retrying: boolean;
  onRetry: () => void;
}

/** Strip copy. No clock: the header's 'Updated N min ago' already says how
 *  old the data is (the backend's last sync), and a fetch time here would
 *  contradict it. */
const STRIP_TEXT: Record<'offline' | 'failed', string> = {
  offline: 'Offline · showing the last data received',
  failed: "Couldn't refresh · showing the last data received",
};

/**
 * Non-blocking one-line note over cached data: 'Offline · …' (resumes by
 * itself) or "Couldn't refresh · …" with Retry. Never replaces the
 * content.
 */
const RefreshStatusStripBase: FC<RefreshStatusStripProps> = ({
  state,
  retrying,
  onRetry,
}) => {
  const scheme = useScheme();
  const themed = useThemedStyles(createStyles);
  if (state === null) return null;
  return (
    <View style={themed.strip} accessibilityLiveRegion="polite">
      <AppText
        variant="caption"
        tone="secondary"
        numberOfLines={2}
        style={styles.stripText}>
        {STRIP_TEXT[state]}
      </AppText>
      {state === 'failed' ? (
        <PressableScale
          onPress={onRetry}
          busy={retrying}
          accessibilityLabel="Retry"
          accessibilityHint="Refreshes this site's data"
          style={styles.stripRetry}>
          {retrying ? (
            <ActivityIndicator size="small" color={scheme.brandText} />
          ) : (
            <AppText variant="caption" semi_bold tone="brand">
              Retry
            </AppText>
          )}
        </PressableScale>
      ) : null}
    </View>
  );
};
RefreshStatusStripBase.displayName = 'RefreshStatusStrip';
const RefreshStatusStrip = memo(RefreshStatusStripBase);

// Built once: the entering prop is only read at mount, and a fresh builder
// per render would re-render this wrapper for nothing.
const CONTENT_ENTERING = FadeInDown.duration(duration.slow).springify().damping(22);

const ContentFade: FC<{ children?: ReactNode }> = ({ children }) => (
  <Animated.View entering={CONTENT_ENTERING}>{children}</Animated.View>
);
ContentFade.displayName = 'ContentFade';

/* ─────────────── styles ─────────────── */

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    gap: space.lg,
  },
  stripText: {
    flex: 1,
  },
  // A real ≥ touch.min target (no hitSlop needed).
  stripRetry: {
    minHeight: touch.min,
    minWidth: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    // Same scheme.bg as ScreenHeader and the Android status bar, so there
    // is no colour seam under the status bar in either theme.
    container: { flex: 1, backgroundColor: scheme.bg },
    // Pinned between the header and the body; the hairline is always
    // drawn (no layout shift) and only its colour flips when scrolled.
    tabSlot: {
      paddingVertical: space.sm,
      backgroundColor: scheme.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'transparent',
    },
    tabSlotScrolled: {
      borderBottomColor: scheme.hairline,
    },
    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      minHeight: touch.min,
      paddingVertical: space.xs,
      paddingLeft: space.md,
      paddingRight: space.xs,
      borderRadius: radiusTokens.md,
      backgroundColor: scheme.surfaceMuted,
    },
  });

export default SiteDetail;
