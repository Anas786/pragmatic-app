import React, { FC, memo, ReactNode, useMemo, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import {
  AppText,
  CardHeader,
  CardHeaderText,
  Dot,
  HeroLiveBadge,
  HeroTopRow,
  HeroValueRow,
  MetricChip,
  OverlineLabel,
  PressableScale,
  PulseDot,
  Surface,
  TintedPill,
} from 'src/components/common';
import {
  duration,
  energyPalette,
  radius as radiusTokens,
  Scheme,
  space,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import {
  buildSiteLogoUrl,
  formatCompact,
  formatRelativeTime,
  FONT_SIZE_HUGE,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
  numericCardValue,
  shortSourceLabel,
  sourceTokenFromName,
} from 'src/utils';
import { ISite, ISiteCard } from 'src/types';
import { DownArrow, UpArrow } from 'src/assets/icons';

const STAGGER_MS = 60;
const STAGGER_CAP = 6;

const resolveSourceColor = (card: ISiteCard): string =>
  energyPalette[sourceTokenFromName(card.name) ?? 'solar'] ?? card.color;

/** Pick the highest-numeric card as the hero. Falls back to the first card
 *  when no value is numeric (so a site with only "NA" entries still shows
 *  a hero shell instead of collapsing to a tiny chip row). */
const findHeroCard = (cards: ISiteCard[]): ISiteCard | null => {
  if (cards.length === 0) return null;
  let best = cards[0];
  let bestNum = numericCardValue(best.value) ?? -Infinity;
  for (let i = 1; i < cards.length; i++) {
    const n = numericCardValue(cards[i].value);
    if (n !== null && n > bestNum) {
      best = cards[i];
      bestNum = n;
    }
  }
  return best;
};

/* ─────────────────── Layout primitives (card-local) ─────────────────── */

const StatusRow: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.statusRow}>{children}</View>
);

const SatellitesGrid: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={styles.satellitesGrid}>{children}</View>
);

const SatellitesGridExpanded: FC<{ children?: ReactNode }> = ({ children }) => (
  <View style={[styles.satellitesGrid, styles.satellitesGridExpanded]}>
    {children}
  </View>
);

const NoTelemetry: FC<{ children?: ReactNode }> = ({ children }) => {
  const themed = useThemedStyles(createCardStyles);
  return <View style={themed.noTelemetry}>{children}</View>;
};

/* ─────────────────── Site avatar (online ring + muted fill) ─────────────────── */

interface SiteAvatarRingProps {
  online: boolean;
  children: ReactNode;
}

const SiteAvatarRing: FC<SiteAvatarRingProps> = ({ online, children }) => {
  const scheme = useScheme();
  const ringStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.avatarRing,
        { borderColor: online ? scheme.brand : scheme.hairline },
      ]),
    [online, scheme.brand, scheme.hairline],
  );
  return <View style={ringStyle}>{children}</View>;
};

const SiteAvatar: FC<{ children: ReactNode }> = ({ children }) => {
  const scheme = useScheme();
  const avatarStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.avatar,
        { backgroundColor: scheme.surfaceMuted },
      ]),
    [scheme.surfaceMuted],
  );
  return <View style={avatarStyle}>{children}</View>;
};

/* ─────────────────── Hero block (source-tinted gradient + sparkline) ─────────────────── */

interface HeroBlockProps {
  heroColor: string;
  children: ReactNode;
}

const HeroBlock: FC<HeroBlockProps> = ({ heroColor, children }) => {
  const blockStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.heroBlock,
        { borderColor: `${heroColor}2E` },
      ]),
    [heroColor],
  );
  return (
    <View style={blockStyle}>
      <HeroGradientLayer heroColor={heroColor} />
      <HeroContent>{children}</HeroContent>
    </View>
  );
};

const HeroGradientLayer: FC<{ heroColor: string }> = ({ heroColor }) => {
  const colors = useMemo(
    () => [`${heroColor}2E`, `${heroColor}0A`, `${heroColor}05`],
    [heroColor],
  );
  return (
    <LinearGradient
      colors={colors}
      locations={[0, 0.6, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroGradientLayer}
    />
  );
};

const HeroContent: FC<{ children: ReactNode }> = ({ children }) => (
  <View style={styles.heroContent}>{children}</View>
);

interface HeroSparklineProps {
  color: string;
  /** Unique per card — required so the SVG gradient `id` doesn't collide on
   *  Android, where SVG defs are not scoped per `<Svg>` root. */
  id: string;
}

const HeroSparkline: FC<HeroSparklineProps> = ({ color, id }) => {
  const gradId = `spark-${id}`;
  return (
    <Svg width={72} height={26} viewBox="0 0 80 28">
      <Defs>
        <SvgGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path
        d="M0 20 L10 16 L20 18 L30 12 L40 14 L50 8 L60 11 L70 6 L80 9 L80 28 L0 28 Z"
        fill={`url(#${gradId})`}
      />
      <Path
        d="M0 20 L10 16 L20 18 L30 12 L40 14 L50 8 L60 11 L70 6 L80 9"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/* ─────────────────── SiteCard ─────────────────── */

interface SiteCardProps {
  site: ISite;
  index: number;
  onPress: () => void;
}

export const SiteCard: FC<SiteCardProps> = memo(
  ({ site, index, onPress }) => {
    const scheme = useScheme();
    const themed = useThemedStyles(createCardStyles);
    const [logoFailed, setLogoFailed] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const logoUrl = !logoFailed ? buildSiteLogoUrl(site) : null;
    // Stable identity (the `?? []` would otherwise be a new array each
    // render) so the heroCard/satellites memos below don't recompute.
    const cards = useMemo(() => site.cards ?? [], [site.cards]);
    const isOnline = (site.state ?? '').toLowerCase() === 'online';

    const heroCard = useMemo(() => findHeroCard(cards), [cards]);
    const satellites = useMemo(
      () => (heroCard ? cards.filter(c => c !== heroCard) : []),
      [cards, heroCard],
    );
    const hasOverflow = satellites.length > 3;
    const visibleSatellites = expanded ? satellites : satellites.slice(0, 3);

    const SatellitesContainer = expanded
      ? SatellitesGridExpanded
      : SatellitesGrid;

    const heroColor = heroCard ? resolveSourceColor(heroCard) : scheme.brand;
    const heroLabel = heroCard
      ? shortSourceLabel(heroCard.name).toUpperCase()
      : '';

    return (
      <Animated.View
        entering={FadeInDown.duration(duration.slow)
          .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
          .springify()
          .damping(22)
          .mass(1)}>
        <PressableScale
          onPress={onPress}
          accessibilityLabel={`Open ${site.name}`}
          haptic="select">
          <Surface
            elevation="md"
            radius="xl"
            background={scheme.surface}
            padding={space.lg}
            style={styles.card}>
            <CardHeader>
              <SiteAvatarRing online={isOnline}>
                <SiteAvatar>
                  {logoUrl ? (
                    <Image
                      source={{ uri: logoUrl }}
                      style={styles.avatarImage}
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <AppText
                      fontSize={FONT_SIZE_SM}
                      bold
                      color={scheme.textSecondary}>
                      {site.name.substring(0, 2).toUpperCase()}
                    </AppText>
                  )}
                </SiteAvatar>
              </SiteAvatarRing>

              <CardHeaderText>
                <AppText
                  fontSize={FONT_SIZE_SM}
                  semi_bold
                  color={scheme.textPrimary}
                  numberOfLines={1}>
                  {site.name}
                </AppText>
                <StatusRow>
                  <Dot
                    color={isOnline ? scheme.brand : scheme.textTertiary}
                    size={6}
                  />
                  <AppText
                    fontSize={FONT_SIZE_XXS}
                    color={scheme.textSecondary}
                    numberOfLines={1}>
                    {isOnline ? 'Online' : site.state ?? 'Unknown'}
                    {' · '}
                    {formatRelativeTime(site.dataLastUpdate)}
                  </AppText>
                </StatusRow>
              </CardHeaderText>

              {site.controller ? (
                <TintedPill
                  color={scheme.accentGold}
                  alpha="22"
                  paddingX={space.sm}
                  paddingY={4}>
                  <AppText
                    fontSize={FONT_SIZE_XXS}
                    semi_bold
                    color={scheme.accentGold}>
                    PRO
                  </AppText>
                </TintedPill>
              ) : null}
            </CardHeader>

            {heroCard ? (
              <HeroBlock heroColor={heroColor}>
                <HeroTopRow>
                  <HeroLiveBadge>
                    <PulseDot color={heroColor} size={8} />
                    <OverlineLabel color={heroColor}>
                      LIVE · {heroLabel}
                    </OverlineLabel>
                  </HeroLiveBadge>
                  <HeroSparkline color={heroColor} id={site.id} />
                </HeroTopRow>
                <HeroValueRow>
                  <AppText
                    fontSize={FONT_SIZE_HUGE}
                    bold
                    color={heroColor}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}>
                    {formatCompact(heroCard.value)}
                  </AppText>
                  <AppText
                    fontSize={FONT_SIZE_XS}
                    color={scheme.textSecondary}>
                    {heroCard.unit}
                  </AppText>
                </HeroValueRow>
              </HeroBlock>
            ) : (
              <NoTelemetry>
                <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
                  No live telemetry
                </AppText>
              </NoTelemetry>
            )}

            {visibleSatellites.length > 0 ? (
              <SatellitesContainer>
                {visibleSatellites.map((card, i) => (
                  <MetricChip
                    key={`${site.id}-sat-${i}`}
                    card={card}
                    surfaceColor={scheme.surfaceMuted}
                    textPrimary={scheme.textPrimary}
                    textSecondary={scheme.textSecondary}
                    textTertiary={scheme.textTertiary}
                  />
                ))}
              </SatellitesContainer>
            ) : null}

            {hasOverflow ? (
              <PressableScale
                onPress={() => setExpanded(prev => !prev)}
                haptic="select"
                accessibilityLabel={
                  expanded ? 'Collapse metric list' : 'Expand metric list'
                }
                style={themed.expandToggle}>
                <AppText
                  fontSize={FONT_SIZE_XXS}
                  medium
                  color={scheme.textSecondary}>
                  {expanded ? 'Show less' : `Show all ${satellites.length}`}
                </AppText>
                {expanded ? (
                  <UpArrow size={ICON_SIZE_MD} color={scheme.textSecondary} />
                ) : (
                  <DownArrow size={ICON_SIZE_MD} color={scheme.textSecondary} />
                )}
              </PressableScale>
            ) : null}
          </Surface>
        </PressableScale>
      </Animated.View>
    );
  },
  // NOTE: `onPress` is intentionally NOT compared. The list passes a
  // fresh inline closure per render (`() => handleCardPress(item)`), so
  // comparing it would defeat the memo and re-render every visible card
  // on any Dashboard re-render (search, pagination, theme…). When
  // `site` + `index` are unchanged the retained closure still points at
  // the same row, so it navigates correctly.
  (a, b) => a.site === b.site && a.index === b.index,
);
SiteCard.displayName = 'SiteCard';

const styles = StyleSheet.create({
  card: { gap: space.md },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: radiusTokens.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: radiusTokens.pill,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBlock: {
    overflow: 'hidden',
    borderRadius: radiusTokens.lg,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  heroGradientLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    gap: 6,
  },
  satellitesGrid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  satellitesGridExpanded: {
    flexWrap: 'wrap',
  },
});

const createCardStyles = (scheme: Scheme) =>
  StyleSheet.create({
    noTelemetry: {
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      borderRadius: radiusTokens.lg,
      alignItems: 'center',
      backgroundColor: scheme.surfaceMuted,
    },
    expandToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.sm,
      paddingVertical: space.sm,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
  });
