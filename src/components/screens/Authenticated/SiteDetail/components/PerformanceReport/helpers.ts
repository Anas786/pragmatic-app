/**
 * Pure view-model helpers for the Performance Report (Reports tab).
 * No React, no theme reads — unit-tested in __tests__/aggregations.test.ts.
 */
import {
  AggregatedSource,
  EnergyStackData,
} from 'src/utils/aggregations';
import { formatEnergy, splitLabelUnit } from 'src/utils/units';

export { aggregateEnergy, buildStackData } from 'src/utils/aggregations';
export type {
  AggregatedSource,
  EnergyBucket,
  EnergySeries,
  EnergyStackData,
} from 'src/utils/aggregations';

/** Hero count chip in words: '1 source' / '3 sources'. */
export const sourceCountLabel = (n: number): string =>
  `${n} source${n === 1 ? '' : 's'}`;

/**
 * Share of total for a source row / the hero mix line: one decimal at
 * most, no padding ('100%', '72.4%', '5%'); a non-zero sliver below 0.1
 * reads '<0.1%' rather than a false '0%'.
 */
export const formatSharePercent = (pct: number): string => {
  if (!Number.isFinite(pct) || pct === 0) return '0%';
  if (pct > 0 && pct < 0.1) return '<0.1%';
  if (pct < 0 && pct > -0.1) return '>-0.1%';
  return `${Number(pct.toFixed(1))}%`;
};

/** `formatSharePercent` as a screen reader should say it. */
export const spokenSharePercent = (pct: number): string => {
  const text = formatSharePercent(pct);
  if (text === '<0.1%') return 'less than 0.1 percent';
  if (text === '>-0.1%') return 'between minus 0.1 and 0 percent';
  const n = text.slice(0, -1);
  return `${n.startsWith('-') ? `minus ${n.slice(1)}` : n} percent`;
};

/** Sources that reported anything, largest first (stable for ties). */
export const reportingSources = (sources: AggregatedSource[]): AggregatedSource[] =>
  sources
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.hasData)
    .sort((a, b) => b.s.value - a.s.value || a.i - b.i)
    .map(({ s }) => s);

/**
 * Hero mix headline: 'Mostly Solar · 72.4%' when one source supplies at
 * least half of the energy, otherwise 'Largest: Wind · 38%'. `null` when
 * nothing positive was produced (no mix to describe).
 */
const topMixSource = (sources: AggregatedSource[]): AggregatedSource | null =>
  sources
    .filter(s => s.hasData && s.value > 0)
    .reduce<AggregatedSource | null>((best, s) => (!best || s.value > best.value ? s : best), null);

const mixLead = (top: AggregatedSource): string =>
  top.percentNum >= 50 ? `Mostly ${top.shortLabel}` : `Largest: ${top.shortLabel}`;

export const heroMixLabel = (sources: AggregatedSource[]): string | null => {
  const top = topMixSource(sources);
  return top ? `${mixLead(top)} · ${formatSharePercent(top.percentNum)}` : null;
};

/**
 * `heroMixLabel` as a screen reader should say it: the '·' becomes a
 * pause (VoiceOver/TalkBack read it as "middle dot") and the share is
 * spoken ('Mostly Solar, 100 percent').
 */
export const spokenHeroMixLabel = (sources: AggregatedSource[]): string | null => {
  const top = topMixSource(sources);
  return top ? `${mixLead(top)}, ${spokenSharePercent(top.percentNum)}` : null;
};

/**
 * Secondary line under a source row's short label: the backend mapping
 * label in its own case, with a trailing '(kWh)' stripped (the unit is
 * rendered next to the value). `null` when it would only repeat the short
 * label ('Solar' under 'Solar').
 */
export const sourceSecondaryLabel = (source: AggregatedSource): string | null => {
  const { label } = splitLabelUnit(source.label);
  if (label === '' || label.toLowerCase() === source.shortLabel.toLowerCase()) return null;
  return label;
};

/** '1 Sep – 1 Oct 2026' → '1 Sep to 1 Oct 2026' for screen readers. */
export const spokenPeriod = (periodLabel: string): string =>
  periodLabel.replace(/\s*–\s*/g, ' to ');

const bucketNoun = (pill: string, n: number): string => {
  const noun = pill === 'Year' ? 'month' : pill === 'Life Time' ? 'year' : 'day';
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
};

/**
 * Screen-reader summary of the energy-over-time chart (the WebView itself
 * is hidden from accessibility):
 *   'Energy over time, 1 Sep to 1 Oct 2026, 31 days. Total 451 megawatt
 *    hours. Highest 16.9 megawatt hours on 19 Sep 2026. Lowest 5.5
 *    megawatt hours on 5 Sep 2026. 2 days with no production.'
 */
export const buildEnergyChartSummary = (args: {
  stack: EnergyStackData;
  periodLabel: string;
  pill: string;
  /** Hero total (kWh) — the same figure the hero shows. */
  total: number;
  noProductionCaption?: string | null;
}): string => {
  const { stack, periodLabel, pill, total, noProductionCaption } = args;
  const parts: string[] = [
    `Energy over time, ${spokenPeriod(periodLabel)}, ${bucketNoun(pill, stack.buckets.length)}`,
    `Total ${formatEnergy(total).spoken}`,
  ];
  let hi: { total: number; header: string } | null = null;
  let lo: { total: number; header: string } | null = null;
  for (const b of stack.buckets) {
    if (b.total === null) continue;
    if (!hi || b.total > hi.total) hi = { total: b.total, header: b.header };
    if (!lo || b.total < lo.total) lo = { total: b.total, header: b.header };
  }
  if (hi && lo && stack.buckets.length > 1) {
    parts.push(`Highest ${formatEnergy(hi.total).spoken} on ${hi.header}`);
    parts.push(`Lowest ${formatEnergy(lo.total).spoken} on ${lo.header}`);
  }
  if (noProductionCaption) parts.push(noProductionCaption);
  return `${parts.join('. ')}.`;
};
