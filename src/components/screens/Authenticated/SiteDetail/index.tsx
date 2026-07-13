import React, { FC, ReactNode, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  createBox,
  EmptyStateCard,
  PressableScale,
} from 'src/components/common';
import {
  duration,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  FONT_SIZE_MD,
  FONT_SIZE_SM,
  FONT_SIZE_XXS,
  ICON_SIZE_LG,
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
  const { isDark, toggleTheme } = useThemeStore();
  const scheme = useScheme();

  const liveData = useSiteData(siteId);
  const siteConfig = useSiteConfig(siteId);
  useReportMapping();

  // react-query v5: `isLoading` = isPending && isFetching, which is FALSE
  // both when a query errored after retries and when it's paused offline
  // (onlineManager/NetInfo). The old `isLoading`-only gate let ViewsContent
  // mount a placeholder "—" dashboard with a pulsing LIVE badge in those
  // states. Branch explicitly instead: initial-load error → retry card,
  // paused with no data → offline card (auto-resumes on reconnect),
  // pending → skeleton, otherwise content. A failed BACKGROUND refetch
  // (isError with cached data) intentionally falls through to content.
  const isInitialError =
    (liveData.isError && liveData.data === undefined) ||
    (siteConfig.isError && siteConfig.data === undefined);
  const isOffline =
    !isInitialError &&
    ((liveData.isPending && liveData.fetchStatus === 'paused') ||
      (siteConfig.isPending && siteConfig.fetchStatus === 'paused'));
  const isInitialLoading =
    !isInitialError &&
    !isOffline &&
    (liveData.isPending || siteConfig.isPending);

  const handleRetry = () => {
    if (liveData.isError || liveData.data === undefined) liveData.refetch();
    if (siteConfig.isError || siteConfig.data === undefined) {
      siteConfig.refetch();
    }
  };

  const [logoFailed, setLogoFailed] = useState(false);
  const logoSource =
    !logoFailed && siteimage
      ? typeof siteimage === 'string'
        ? { uri: siteimage }
        : siteimage
      : null;

  return (
    <Container>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={scheme.bg}
      />

      <Header>
        <PressableScale
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityLabel="Go back"
          hitSlop={8}>
          <Back size={ICON_SIZE_LG} color={scheme.textPrimary} />
        </PressableScale>

        <Identity>
          <AvatarRing>
            <AvatarFrame>
              {logoSource ? (
                <Image
                  source={logoSource}
                  style={styles.avatarImage}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <AppText
                  fontSize={FONT_SIZE_MD}
                  bold
                  color={scheme.textSecondary}>
                  {siteName.substring(0, 2).toUpperCase()}
                </AppText>
              )}
            </AvatarFrame>
          </AvatarRing>

          <IdentityText>
            <AppText
              fontSize={FONT_SIZE_SM}
              semi_bold
              color={scheme.textPrimary}
              numberOfLines={1}>
              {siteName}
            </AppText>
            {siteSubtitle ? (
              <AppText
                fontSize={FONT_SIZE_XXS}
                color={scheme.textSecondary}
                numberOfLines={1}>
                {siteSubtitle}
              </AppText>
            ) : null}
          </IdentityText>
        </Identity>

        <PressableScale
          onPress={toggleTheme}
          style={styles.iconButton}
          accessibilityLabel="Toggle theme">
          {isDark ? (
            <SunIcon size={ICON_SIZE_LG} color={scheme.textPrimary} />
          ) : (
            <MoonIcon size={ICON_SIZE_LG} color={scheme.textPrimary} />
          )}
        </PressableScale>
      </Header>

      <BodyScroll>
        {isInitialLoading ? (
          <SiteDetailSkeleton />
        ) : isInitialError ? (
          <EmptyStateCard
            prominent
            title="Couldn't load site data"
            message="Something went wrong while fetching this site. Check your connection and try again."
            onRetry={handleRetry}
          />
        ) : isOffline ? (
          <EmptyStateCard
            prominent
            title="You're offline"
            message="Site data will load automatically once your connection is restored."
          />
        ) : (
          <ContentFade>
            <ViewsContent />
          </ContentFade>
        )}
      </BodyScroll>
    </Container>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: space.xs,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: space.lg,
    gap: space.lg,
  },
});

const createStyles = (scheme: Scheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: scheme.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: space.md,
      backgroundColor: scheme.surface,
      borderBottomColor: scheme.hairline,
    },
    avatarRing: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      borderColor: scheme.brand,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: scheme.surfaceMuted,
    },
  });

/* ─────────────── styled wrappers ─────────────── */

const Identity = createBox(styles.identity, 'Identity');
const IdentityText = createBox(styles.identityText, 'IdentityText');

const Container: FC<{children?: ReactNode}> = ({children}) => {
  const themed = useThemedStyles(createStyles);
  return <SafeAreaView style={themed.container}>{children}</SafeAreaView>;
};
Container.displayName = 'Container';

const Header: FC<{children?: ReactNode}> = ({children}) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.header}>{children}</View>;
};
Header.displayName = 'Header';

const AvatarRing: FC<{children?: ReactNode}> = ({children}) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.avatarRing}>{children}</View>;
};
AvatarRing.displayName = 'AvatarRing';

const AvatarFrame: FC<{children?: ReactNode}> = ({children}) => {
  const themed = useThemedStyles(createStyles);
  return <View style={themed.avatar}>{children}</View>;
};
AvatarFrame.displayName = 'AvatarFrame';

const BodyScroll: FC<{children?: ReactNode}> = ({children}) => (
  <ScrollView
    style={styles.scrollView}
    contentContainerStyle={styles.scrollContent}
    showsVerticalScrollIndicator={false}
    // `keyboardShouldPersistTaps` avoids the hidden-keyboard relayout that
    // was triggering on each tap. (Note: `removeClippedSubviews` would be a
    // no-op here — the content container has a single full-height child, so
    // nothing is ever clipped — and `scrollEventThrottle` is meaningless
    // without an onScroll handler; neither is set on purpose.)
    keyboardShouldPersistTaps="handled">
    {children}
  </ScrollView>
);
BodyScroll.displayName = 'BodyScroll';

const ContentFade: FC<{children?: ReactNode}> = ({children}) => (
  <Animated.View
    entering={FadeInDown.duration(duration.slow).springify().damping(22)}>
    {children}
  </Animated.View>
);
ContentFade.displayName = 'ContentFade';

export default SiteDetail;
