import React, { FC, memo, useCallback, useMemo, useState } from 'react';
import { AccessibilityActionEvent, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AppText,
  Dot,
  FreshnessStatus,
  PowerMixBar,
  PressableScale,
  SiteLogo,
  Surface,
} from 'src/components/common';
import type { PowerMixSegment } from 'src/components/common';
import { useNow } from 'src/hooks/useNow';
import {
  duration,
  energyPalette,
  radius as radiusTokens,
  Scheme,
  space,
  touch,
  useScheme,
  useThemedStyles,
} from 'src/theme';
import { siteStatus } from 'src/utils/freshness';
import { buildSiteLogoUrl } from 'src/utils/site';
import { PERIOD_LABEL } from 'src/utils/sources';
import { ISite } from 'src/types';
import {
  buildSiteCardModel,
  capacityText,
  siteCardA11yLabel,
  SiteCardMetric,
  SiteCardModel,
  toggleMetricsLabel,
  visibleMetrics,
} from '../siteCardModel';

const STAGGER_MS = 60;
const STAGGER_CAP = 6;
// Only the first ANIM_LIMIT rows get the entrance animation — rows that
// mount later during scroll (window recycling) render as plain Views.
// Matches STAGGER_CAP so every animated row also gets a staggered delay.
const ANIM_LIMIT = 6;

/** Visual height of one legend row (and of the '+N more' toggle). */
const LEGEND_ROW_H = 20;
/** Vertical slop that grows the toggle to a full touch.min target. */
const TOGGLE_SLOP = Math.ceil((touch.min - LEGEND_ROW_H) / 2);
const TOGGLE_HIT_SLOP = { top: TOGGLE_SLOP, bottom: TOGGLE_SLOP };

/** Logo plate edge — the header row is exactly this tall (name + status). */
export const SITE_CARD_LOGO = 40;

/* ─────────────────── Legend ─────────────────── */

interface LegendItemProps {
  metric: SiteCardMetric;
  /** 0 = left column, 1 = right column (2-column wrapping grid). */
  column: number;
}

/** 'dot · label ········ value unit' — one cell of the 2-column legend.
 *  Only the DOT is coloured (energy fill); text stays on ink roles. */
const LegendItem: FC<LegendItemProps> = memo(({ metric, column }) => {
  const scheme = useScheme();
  const q = metric.quantity;
  const dotColor = metric.source ? energyPalette[metric.source] : scheme.textTertiary;
  const label = metric.periodSuffix
    ? `${metric.label} · ${PERIOD_LABEL[metric.periodSuffix]}`
    : metric.label;
  return (
    <View style={[styles.cell, column === 0 ? styles.cellLeft : styles.cellRight]}>
      <Dot color={dotColor} size={8} />
      <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.cellLabel}>
        {label}
      </AppText>
      <AppText
        variant="caption"
        semi_bold
        tone={q.isMissing ? 'tertiary' : 'primary'}
        numberOfLines={1}
        style={styles.cellValue}>
        {q.text}
        {q.unit ? (
          <AppText variant="micro" tone="secondary">
            {` ${q.unit}`}
          </AppText>
        ) : null}
      </AppText>
    </View>
  );
});
LegendItem.displayName = 'LegendItem';

interface LegendToggleProps {
  column: number;
  expanded: boolean;
  hiddenCount: number;
  label: string;
  onToggle: () => void;
}

/** '+N more' / 'Show less' — the last legend cell. Visually one legend row
 *  tall; vertical hitSlop brings the target to touch.min (no ancestor
 *  clips, so the slop is real on both platforms). */
const LegendToggle: FC<LegendToggleProps> = memo(
  ({ column, expanded, hiddenCount, label, onToggle }) => (
    <View style={[styles.cellBox, column === 0 ? styles.cellLeft : styles.cellRight]}>
      <PressableScale
        onPress={onToggle}
        hitSlop={TOGGLE_HIT_SLOP}
        expanded={expanded}
        accessibilityLabel={label}
        style={styles.toggle}>
        <AppText variant="caption" semi_bold tone="brand" numberOfLines={1}>
          {expanded ? 'Show less' : `+${hiddenCount} more`}
        </AppText>
      </PressableScale>
    </View>
  ),
);
LegendToggle.displayName = 'LegendToggle';

/* ─────────────────── Card body ─────────────────── */

const ControllerTag: FC = () => {
  const themed = useThemedStyles(createCardStyles);
  return (
    <View style={themed.controllerTag}>
      <AppText variant="micro" tone="secondary" numberOfLines={1}>
        Controller
      </AppText>
    </View>
  );
};

interface CardBodyProps {
  site: ISite;
  model: SiteCardModel;
  expanded: boolean;
  onToggle: () => void;
  toggleLabel: string | null;
}

/**
 * Everything visible on the card. Memoised on props that only change with
 * new data / expansion, so the parent's per-minute a11y-label refresh
 * (useNow) never re-renders it; FreshnessStatus ticks on its own.
 */
const CardBody: FC<CardBodyProps> = memo(
  ({ site, model, expanded, onToggle, toggleLabel }) => {
    const scheme = useScheme();
    const logoUrl = buildSiteLogoUrl(site);
    const hasMetrics = model.metrics.length > 0;

    // Weights pulled into locals before they reach a style (§4.7).
    const segments = useMemo<PowerMixSegment[]>(
      () =>
        (model.mix ?? []).map(seg => {
          const weight = seg.weight;
          return { key: seg.key, color: energyPalette[seg.source], weight };
        }),
      [model.mix],
    );

    const { visible, hiddenCount } = visibleMetrics(model, expanded);
    const periodCaption = model.sharedPeriod ? PERIOD_LABEL[model.sharedPeriod] : null;
    const showMixRow = segments.length > 0 || periodCaption !== null;

    return (
      <Surface
        elevation="md"
        radius="xl"
        background={scheme.surface}
        padding={space.lg}
        style={styles.card}>
        <View style={styles.header}>
          <SiteLogo uri={logoUrl} name={site.name} size={SITE_CARD_LOGO} />
          <View style={styles.headerText}>
            <View style={styles.nameRow}>
              <AppText variant="bodyLg" semi_bold numberOfLines={1} style={styles.name}>
                {site.name}
              </AppText>
              {model.controller ? <ControllerTag /> : null}
            </View>
            <FreshnessStatus
              state={site.state}
              lastUpdate={site.dataLastUpdate}
              variant="status"
              trailing={capacityText(model)}
            />
            {hasMetrics ? null : (
              <AppText variant="micro" tone="tertiary" numberOfLines={1}>
                No summary metrics
              </AppText>
            )}
          </View>
        </View>

        {hasMetrics && showMixRow ? (
          <View style={styles.mixRow}>
            {segments.length > 0 ? (
              <View style={styles.mixBar}>
                <PowerMixBar segments={segments} height={6} trackColor={scheme.surfaceMuted} />
              </View>
            ) : null}
            {periodCaption ? (
              <AppText variant="micro" tone="secondary" numberOfLines={1}>
                {periodCaption}
              </AppText>
            ) : null}
          </View>
        ) : null}

        {hasMetrics ? (
          <View style={styles.legend}>
            {visible.map((metric, i) => (
              <LegendItem key={metric.key} metric={metric} column={i % 2} />
            ))}
            {toggleLabel ? (
              <LegendToggle
                column={visible.length % 2}
                expanded={expanded}
                hiddenCount={hiddenCount}
                label={toggleLabel}
                onToggle={onToggle}
              />
            ) : null}
          </View>
        ) : null}
      </Surface>
    );
  },
);
CardBody.displayName = 'CardBody';

/* ─────────────────── Pressable shell (a11y) ─────────────────── */

interface CardPressableProps extends CardBodyProps {
  onPress: () => void;
}

/**
 * The card's single tappable + screen-reader element. Its label carries
 * the live status age, so it subscribes to the shared `useNow` ticker —
 * only this thin shell re-renders on the tick, not the memoised body.
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
  const statusSpoken = siteStatus(site.state, site.dataLastUpdate, now).spoken;
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  name: {
    flex: 1,
    minWidth: 0,
    // 22 (not the ramp's 24) keeps name + status inside the 40pt logo
    // height, and the no-metrics card (3 lines) under 84pt.
    lineHeight: 22,
  },
  mixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 14,
  },
  mixBar: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: space.xs,
    marginTop: -space.xs,
  },
  cell: {
    width: '50%',
    minHeight: LEGEND_ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cellBox: {
    width: '50%',
    minHeight: LEGEND_ROW_H,
    justifyContent: 'center',
  },
  cellLeft: { paddingRight: space.sm },
  cellRight: { paddingLeft: space.sm },
  cellLabel: {
    flex: 1,
    minWidth: 0,
  },
  cellValue: {
    flexShrink: 0,
  },
  toggle: {
    minHeight: LEGEND_ROW_H,
    minWidth: touch.min,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});

const createCardStyles = (scheme: Scheme) =>
  StyleSheet.create({
    controllerTag: {
      flexShrink: 0,
      paddingHorizontal: space.sm,
      paddingVertical: 2,
      borderRadius: radiusTokens.pill,
      backgroundColor: scheme.surfaceMuted,
    },
  });
