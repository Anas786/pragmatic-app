import React, { FC, memo, ReactNode, useCallback, useMemo, useState } from 'react';
import { AccessibilityActionEvent, Image, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {
  AppText,
  CardHeader,
  CardHeaderText,
  Dot,
  HeroValueRow,
  MetricChip,
  OverlineLabel,
  PressableScale,
  Surface,
  TintedPill,
} from 'src/components/common';
import { DownArrow, UpArrow } from 'src/assets/icons';
import { useNow } from 'src/hooks/useNow';
import {
  duration,
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { freshnessDot, siteStatus } from 'src/utils/freshness';
import { getInitials } from 'src/utils/format';
import { buildSiteLogoUrl } from 'src/utils/site';
import { PERIOD_LABEL } from 'src/utils/sources';
import {
  FONT_SIZE_HUGE,
  FONT_SIZE_SM,
  FONT_SIZE_XS,
  FONT_SIZE_XXS,
  ICON_SIZE_MD,
} from 'src/utils/theme';
import { ISite } from 'src/types';
import {
  buildSiteCardModel,
  heroTint,
  siteCardA11yLabel,
  SiteCardMetric,
  SiteCardModel,
  toggleMetricsLabel,
  toggleMetricsText,
  visibleSatellites,
} from '../siteCardModel';

const STAGGER_MS = 60;
const STAGGER_CAP = 6;
// Only the first ANIM_LIMIT rows get the entrance animation — rows that
// mount later during scroll (window recycling) render as plain Views.
// Matches STAGGER_CAP so every animated row also gets a staggered delay.
const ANIM_LIMIT = 6;

/** Outer edge of the avatar's status ring (2pt ring + 2pt inset + 44 logo). */
export const SITE_CARD_AVATAR = 52;
const AVATAR_INNER = 44;
const STATUS_DOT = 6;

/** The hero's top row keeps the height it had beside the (removed)
 *  sparkline, so the tile keeps its proportions. */
const HERO_TOP_ROW_MIN_H = 26;

/** Visual height of the 'Show all' pill; vertical hitSlop grows its touch
 *  target to touch.min (the Surface doesn't clip, so the slop is real). */
const TOGGLE_H = 34;
const TOGGLE_SLOP = Math.ceil((touch.min - TOGGLE_H) / 2);
const TOGGLE_HIT_SLOP = { top: TOGGLE_SLOP, bottom: TOGGLE_SLOP };

const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };
const GRADIENT_STOPS = [0, 0.6, 1];

/* ─────────────────── Avatar (status ring + logo) ─────────────────── */

/** Brand ring while the site is live (freshness model), neutral otherwise. */
const AvatarRing: FC<{ live: boolean; children: ReactNode }> = ({ live, children }) => {
  const scheme = useScheme();
  const ringStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.avatarRing,
        { borderColor: live ? scheme.brand : scheme.hairline },
      ]),
    [live, scheme.brand, scheme.hairline],
  );
  return <View style={ringStyle}>{children}</View>;
};

const SiteAvatar: FC<{ site: ISite }> = memo(({ site }) => {
  const scheme = useScheme();
  // Tracks the exact URL that failed (not a boolean) so a changed
  // logo_ext retries immediately, and is reset whenever a refreshed
  // `site` object arrives (render-phase adjustment below) so one
  // transient CDN/network failure doesn't downgrade the avatar to
  // initials for the rest of the Dashboard session.
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  // React's "derived state" pattern: react-query structural sharing
  // keeps `site` identity stable unless the payload actually changed,
  // so this only fires (and re-renders) on genuinely fresh data.
  const [lastSite, setLastSite] = useState(site);
  if (site !== lastSite) {
    setLastSite(site);
    setFailedLogoUrl(null);
  }
  const resolvedLogoUrl = buildSiteLogoUrl(site);
  const logoUrl =
    resolvedLogoUrl && resolvedLogoUrl !== failedLogoUrl ? resolvedLogoUrl : null;
  const source = useMemo(() => (logoUrl ? { uri: logoUrl } : undefined), [logoUrl]);
  const handleError = useCallback(() => setFailedLogoUrl(logoUrl), [logoUrl]);

  // Logos are light-background artwork: a light plate behind a
  // transparent one keeps it visible in dark mode.
  const avatarStyle = useMemo<ViewStyle>(
    () =>
      StyleSheet.flatten([
        styles.avatar,
        { backgroundColor: source ? scheme.logoPlate : scheme.surfaceMuted },
      ]),
    [source, scheme.logoPlate, scheme.surfaceMuted],
  );

  return (
    <View style={avatarStyle}>
      {source ? (
        <Image source={source} style={styles.avatarImage} onError={handleError} />
      ) : (
        <AppText fontSize={FONT_SIZE_SM} bold color={scheme.textSecondary}>
          {getInitials(site.name) || '?'}
        </AppText>
      )}
    </View>
  );
});
SiteAvatar.displayName = 'SiteAvatar';

/* ─────────────────── Status line ─────────────────── */

interface StatusLineProps {
  state?: string;
  lastUpdate?: string;
}

/**
 * 'Live · just now' / 'Delayed · 39 min ago' / 'Offline · last data 28 Sep'
 * — the shared freshness model's wording and dot, in the card's small
 * style. Subscribes to the shared `useNow` ticker itself, so the age moves
 * on without re-rendering the card body. Static: list cards never pulse.
 */
const StatusLine: FC<StatusLineProps> = memo(({ state, lastUpdate }) => {
  const scheme = useScheme();
  const now = useNow();
  const status = siteStatus(state, lastUpdate, now);
  const dot = freshnessDot(status.level, scheme);
  const hollowStyle = useMemo<ViewStyle>(
    () => StyleSheet.flatten([styles.hollowDot, { borderColor: dot.color }]),
    [dot.color],
  );
  return (
    <View style={styles.statusRow}>
      {dot.hollow ? <View style={hollowStyle} /> : <Dot color={dot.color} size={STATUS_DOT} />}
      <AppText
        fontSize={FONT_SIZE_XXS}
        color={scheme.textSecondary}
        numberOfLines={1}
        style={styles.statusText}>
        {status.label}
      </AppText>
    </View>
  );
});
StatusLine.displayName = 'StatusLine';

const ControllerPill: FC = () => {
  const scheme = useScheme();
  // Gold ink only where it stays AA on its own tint (dark); dark ink on
  // the pale gold in light mode.
  return (
    <TintedPill color={scheme.accentGold} alpha="22" paddingX={space.sm} paddingY={4}>
      <AppText
        fontSize={FONT_SIZE_XXS}
        semi_bold
        color={scheme.isDark ? scheme.accentGold : scheme.textPrimary}
        numberOfLines={1}>
        Controller
      </AppText>
    </TintedPill>
  );
};

/* ─────────────────── Hero tile ─────────────────── */

/**
 * The card's largest metric on a tile tinted with its source colour:
 * static dot + 'SOLAR · TODAY' overline (period only when the backend
 * name states one; never 'LIVE') and the value with its unit. The right
 * side is deliberately empty — no chart is drawn without real data.
 */
const HeroTile: FC<{ metric: SiteCardMetric }> = memo(({ metric }) => {
  const scheme = useScheme();
  const tint = metric.accent;
  // Text uses the source's ink role (AA in both themes); the raw palette
  // fill is only for the dot, tint and border.
  const ink = metric.source ? scheme.energyInk[metric.source] : undefined;
  const q = metric.quantity;

  const tintColors = useMemo(() => heroTint(tint, scheme.isDark), [tint, scheme.isDark]);
  const blockStyle = useMemo<ViewStyle>(
    () => StyleSheet.flatten([styles.heroBlock, { borderColor: tintColors.border }]),
    [tintColors],
  );

  const caption = metric.periodCaption ? PERIOD_LABEL[metric.periodCaption] : null;
  const overline = caption ? `${metric.label} · ${caption}` : metric.label;
  const overlineColor = ink ?? scheme.textSecondary;

  return (
    <View style={blockStyle}>
      <LinearGradient
        colors={tintColors.colors}
        locations={GRADIENT_STOPS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.heroGradientLayer}
      />
      <View style={styles.heroContent}>
        <View style={styles.heroTopRow}>
          <Dot color={tint} size={8} />
          {metric.sourceWord ? (
            <OverlineLabel color={overlineColor} style={styles.heroOverline}>
              {overline}
            </OverlineLabel>
          ) : (
            // A backend name keeps its own case — never forced upper-case.
            <AppText
              variant="caption"
              semi_bold
              color={overlineColor}
              numberOfLines={1}
              style={styles.heroOverline}>
              {overline}
            </AppText>
          )}
        </View>
        <HeroValueRow>
          <AppText
            fontSize={FONT_SIZE_HUGE}
            bold
            color={q.isMissing ? scheme.textTertiary : ink ?? scheme.textPrimary}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {q.text}
          </AppText>
          {q.unit ? (
            <AppText fontSize={FONT_SIZE_XS} color={scheme.textSecondary}>
              {q.unit}
            </AppText>
          ) : null}
        </HeroValueRow>
      </View>
    </View>
  );
});
HeroTile.displayName = 'HeroTile';

/* ─────────────────── Card body ─────────────────── */

interface CardBodyProps {
  site: ISite;
  model: SiteCardModel;
  /** Live per the freshness model — drives the avatar ring. */
  live: boolean;
  expanded: boolean;
  onToggle: () => void;
  toggleLabel: string | null;
}

/**
 * Everything visible on the card. Memoised on props that only change with
 * new data, expansion or a live ⇄ not-live flip, so the shell's per-tick
 * a11y-label refresh (useNow) never re-renders it; StatusLine ticks on its
 * own.
 */
const CardBody: FC<CardBodyProps> = memo(
  ({ site, model, live, expanded, onToggle, toggleLabel }) => {
    const scheme = useScheme();
    const themed = useThemedStyles(createCardStyles);
    const { visible } = visibleSatellites(model, expanded);
    const toggleText = toggleMetricsText(model, expanded);

    return (
      <Surface
        elevation="md"
        radius="xl"
        background={scheme.surface}
        padding={space.lg}
        style={styles.card}>
        <CardHeader>
          <AvatarRing live={live}>
            <SiteAvatar site={site} />
          </AvatarRing>
          <CardHeaderText>
            <AppText
              fontSize={FONT_SIZE_SM}
              semi_bold
              color={scheme.textPrimary}
              numberOfLines={1}>
              {site.name}
            </AppText>
            <StatusLine state={site.state} lastUpdate={site.dataLastUpdate} />
          </CardHeaderText>
          {model.controller ? <ControllerPill /> : null}
        </CardHeader>

        {model.hero ? (
          <HeroTile metric={model.hero} />
        ) : (
          <View style={themed.noMetrics}>
            <AppText fontSize={FONT_SIZE_XXS} color={scheme.textTertiary}>
              No summary metrics
            </AppText>
          </View>
        )}

        {visible.length > 0 ? (
          // One element type either way — toggling `expanded` diffs a style
          // instead of remounting every (memoised) chip.
          <View style={[styles.satellitesGrid, expanded && styles.satellitesGridExpanded]}>
            {visible.map(m => (
              <MetricChip
                key={m.key}
                label={m.label}
                uppercaseLabel={m.sourceWord}
                // The period gets its own line: appended to the 1-line
                // label it was always cut off ('SOLAR · T…').
                caption={m.periodSuffix ? PERIOD_LABEL[m.periodSuffix] : undefined}
                color={m.accent}
                quantity={m.quantity}
                surfaceColor={scheme.surfaceMuted}
                textPrimary={scheme.textPrimary}
                textSecondary={scheme.textSecondary}
                textTertiary={scheme.textTertiary}
              />
            ))}
          </View>
        ) : null}

        {toggleText && toggleLabel ? (
          <PressableScale
            onPress={onToggle}
            hitSlop={TOGGLE_HIT_SLOP}
            expanded={expanded}
            accessibilityLabel={toggleLabel}
            style={themed.expandToggle}>
            <AppText fontSize={FONT_SIZE_XXS} medium color={scheme.textSecondary}>
              {toggleText}
            </AppText>
            {expanded ? (
              <UpArrow size={ICON_SIZE_MD} color={scheme.textSecondary} />
            ) : (
              <DownArrow size={ICON_SIZE_MD} color={scheme.textSecondary} />
            )}
          </PressableScale>
        ) : null}
      </Surface>
    );
  },
);
CardBody.displayName = 'CardBody';

/* ─────────────────── Pressable shell (a11y) ─────────────────── */

interface CardPressableProps extends Omit<CardBodyProps, 'live'> {
  onPress: () => void;
}

/**
 * The card's single tappable + screen-reader element. Its label carries
 * the live status age, so it subscribes to the shared `useNow` ticker —
 * only this thin shell re-renders on the tick, not the memoised body
 * (which only sees the `live` boolean).
 */
const CardPressable: FC<CardPressableProps> = ({
  site,
  model,
  expanded,
  onToggle,
  toggleLabel,
  onPress,
}) => {
  const now = useNow();
  const status = siteStatus(site.state, site.dataLastUpdate, now);
  const statusSpoken = status.spoken;
  const live = status.level === 'live';
  const label = useMemo(
    () => siteCardA11yLabel(site.name, statusSpoken, model, expanded),
    [site.name, statusSpoken, model, expanded],
  );
  const actions = useMemo(
    () => (toggleLabel ? [{ name: 'toggleMetrics', label: toggleLabel }] : undefined),
    [toggleLabel],
  );
  const handleAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'toggleMetrics') onToggle();
    },
    [onToggle],
  );

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={label}
      accessibilityHint="Opens site details"
      accessibilityActions={actions}
      onAccessibilityAction={handleAction}>
      {/* Android: the card is ONE TalkBack stop (iOS already folds an
          accessible element's children). The toggle stays reachable
          through the 'toggleMetrics' custom action. */}
      <View importantForAccessibility="no-hide-descendants">
        <CardBody
          site={site}
          model={model}
          live={live}
          expanded={expanded}
          onToggle={onToggle}
          toggleLabel={toggleLabel}
        />
      </View>
    </PressableScale>
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
    const [expanded, setExpanded] = useState(false);
    // Frozen at first mount: if `index` later crosses the ANIM_LIMIT
    // boundary (search narrowing, refresh pruning), the wrapper element
    // type must not flip — that would remount the card and drop
    // `expanded` state.
    const [animateEntrance] = useState(() => index < ANIM_LIMIT);
    const model = useMemo(() => buildSiteCardModel(site), [site]);
    const toggle = useCallback(() => setExpanded(prev => !prev), []);
    const toggleLabel = toggleMetricsLabel(model, expanded);

    const body = (
      <CardPressable
        site={site}
        model={model}
        expanded={expanded}
        onToggle={toggle}
        toggleLabel={toggleLabel}
        onPress={onPress}
      />
    );

    // Cap the entrance animation to ANIM_LIMIT — same convention as
    // InverterCard / AlarmRow. Beyond the cap, FadeInDown would replay a
    // ~320ms springified entrance on every row mounted mid-scroll.
    if (animateEntrance) {
      return (
        <Animated.View
          entering={FadeInDown.duration(duration.slow)
            .delay(Math.min(index, STAGGER_CAP) * STAGGER_MS)
            .springify()
            .damping(22)
            .mass(1)}>
          {body}
        </Animated.View>
      );
    }
    return <View>{body}</View>;
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
    width: SITE_CARD_AVATAR,
    height: SITE_CARD_AVATAR,
    borderRadius: radiusTokens.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  avatar: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: radiusTokens.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: AVATAR_INNER,
    height: AVATAR_INNER,
    borderRadius: radiusTokens.pill,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    flexShrink: 1,
  },
  hollowDot: {
    width: STATUS_DOT,
    height: STATUS_DOT,
    borderRadius: STATUS_DOT / 2,
    borderWidth: 1.5,
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: HERO_TOP_ROW_MIN_H,
  },
  heroOverline: {
    flexShrink: 1,
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
    noMetrics: {
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
      minHeight: TOGGLE_H,
      paddingVertical: space.sm,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
  });
