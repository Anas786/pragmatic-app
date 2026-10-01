import React, { FC, ReactNode, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CalendarIcon } from 'src/assets/icons';
import { useNow } from 'src/hooks/useNow';
import { space, useScheme } from 'src/theme';
import { dataFreshness, FRESH_LIVE_MS, freshnessSpoken } from 'src/utils/freshness';
import { formatRelativeTime } from 'src/utils/format';
import OverlineLabel from '../OverlineLabel';
import PulseDot from '../PulseDot';

interface HeroRowProps {
  children?: ReactNode;
}

/**
 * Shared layout primitives for the `HeroGradientCard` hero across redesigned
 * tabs (Summary / Cards / Alarms / Reports / Tables). These had identical
 * style definitions duplicated in each view file; consolidated here.
 *
 *  - `HeroTopRow`      — the top badge / right-side chip row.
 *  - `HeroLiveBadge`   — the left badge cluster (dot + overline), layout only.
 *  - `HeroValueRow`    — the big-number row beneath the section label.
 *  - `HeroStatusBadge` — the badge WITH semantics: a pulsing LIVE only when
 *    the data really is live, otherwise its age; or a period for
 *    historical / aggregate heroes (never a pulse).
 */
export const HeroTopRow: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.heroTopRow}>{children}</View>
);
HeroTopRow.displayName = 'HeroTopRow';

export const HeroLiveBadge: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.liveBadge}>{children}</View>
);
HeroLiveBadge.displayName = 'HeroLiveBadge';

export const HeroValueRow: FC<HeroRowProps> = ({ children }) => (
  <View style={styles.heroValueRow}>{children}</View>
);
HeroValueRow.displayName = 'HeroValueRow';

export type HeroStatusBadgeProps =
  | {
      /** Current-value hero (Summary). */
      mode: 'live';
      /** What is live, e.g. 'Plant' → 'LIVE · PLANT'. */
      label: string;
      /** Backend timestamp of the newest data point. */
      lastUpdate: unknown;
    }
  | {
      /** Historical / aggregate hero (Reports, Tables, Trends). */
      mode: 'period';
      /** Optional context, e.g. 'Energy' → 'ENERGY · SEPTEMBER 2026'. */
      label?: string;
      /** From `formatDateRange` / `formatMonthYear` / '2026' / 'Lifetime'. */
      periodLabel: string;
      /** A filter-change refetch is in flight → 'UPDATING…'. */
      updating?: boolean;
    };

const MINUTE = 60_000;
const HOUR = 3_600_000;

/** 'DELAYED · 12 MIN' / 'DELAYED · 1 H' (delayed tops out at 2 h). */
const delayedText = (ageMs: number): string =>
  ageMs < HOUR
    ? `Delayed · ${Math.max(1, Math.floor(ageMs / MINUTE))} min`
    : `Delayed · ${Math.floor(ageMs / HOUR)} h`;

/** Screen readers say "middle dot" for '·' — speak it as a pause. */
const spoken = (text: string) => text.replace(/ · /g, ', ');

const PeriodBadge: FC<{ label?: string; periodLabel: string; updating?: boolean }> = ({
  label,
  periodLabel,
  updating,
}) => {
  const scheme = useScheme();
  const text = updating ? 'Updating…' : label ? `${label} · ${periodLabel}` : periodLabel;
  return (
    <View style={styles.liveBadge} accessible accessibilityLabel={spoken(text)}>
      <CalendarIcon size={12} color={scheme.heroOnGradient} />
      <OverlineLabel color={scheme.heroOnGradient}>{text}</OverlineLabel>
    </View>
  );
};

const LiveStatusBadge: FC<{ label: string; lastUpdate: unknown }> = ({ label, lastUpdate }) => {
  const scheme = useScheme();
  const now = useNow();
  const hollowDot = useMemo(
    () => StyleSheet.flatten([styles.hollowDot, { borderColor: scheme.heroOnGradientMuted }]),
    [scheme.heroOnGradientMuted],
  );

  const { level, ageMs } = dataFreshness(lastUpdate, now);
  if (level === 'live') {
    const text = `Live · ${label}`;
    return (
      <View style={styles.liveBadge} accessible accessibilityLabel={spoken(text)}>
        <PulseDot color={scheme.heroOnGradient} size={8} />
        <OverlineLabel color={scheme.heroOnGradient}>{text}</OverlineLabel>
      </View>
    );
  }

  let text: string;
  if (level === 'delayed' && ageMs !== null) {
    text = delayedText(Math.max(ageMs, FRESH_LIVE_MS));
  } else if (level === 'stale' && ageMs !== null) {
    text = `Last data · ${formatRelativeTime(now - ageMs, now)}`;
  } else {
    text = 'Last update unknown';
  }
  return (
    <View
      style={styles.liveBadge}
      accessible
      accessibilityLabel={freshnessSpoken(level, ageMs, now)}>
      <View style={hollowDot} />
      <OverlineLabel color={scheme.heroOnGradientMuted}>{text}</OverlineLabel>
    </View>
  );
};

/**
 * Hero badge with honest semantics.
 *
 * `live`: a PulseDot + 'LIVE · <LABEL>' only while `dataFreshness` says
 * live (≤ 15 min); otherwise a static hollow dot with 'DELAYED · 12 MIN' /
 * 'LAST DATA · 4 H AGO' / 'LAST UPDATE UNKNOWN'. Re-evaluates on the shared
 * `useNow` tick, so it drops out of LIVE by itself when data stops.
 *
 * `period`: calendar icon + '<LABEL> · <PERIOD>' — never a pulse, and no
 * ticker subscription.
 */
export const HeroStatusBadge: FC<HeroStatusBadgeProps> = props =>
  props.mode === 'period' ? (
    <PeriodBadge
      label={props.label}
      periodLabel={props.periodLabel}
      updating={props.updating}
    />
  ) : (
    <LiveStatusBadge label={props.label} lastUpdate={props.lastUpdate} />
  );
HeroStatusBadge.displayName = 'HeroStatusBadge';

const styles = StyleSheet.create({
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  hollowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.sm,
    marginTop: 6,
    flexWrap: 'wrap',
  },
});

export default HeroTopRow;
