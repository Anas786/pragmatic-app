/**
 * Small shared bits for the trend charts (react-native-echarts-pro):
 *
 *  - value coercion + the impossible-reading guard used when packing series
 *  - the card/chart GEOMETRY — one pure function (`trendChartLayout`) gives
 *    the chart height, the legend block and the card height, so the loading
 *    skeleton, the empty/error slot and the real chart card are always the
 *    same height (no layout jump when data arrives or the period changes)
 *  - the legend estimator that predicts how many rows echarts' wrapping
 *    'plain' legend will take, so `grid.top` leaves exactly that much room
 *  - the screen-reader summary of a chart (WebView content is hidden from
 *    accessibility; the chart is announced as ONE image with this label)
 */

import { Platform } from 'react-native';
import { TrendAggregation, TrendDataRow } from 'src/types';
import { formatCompact } from 'src/utils/sources';
import { formatQuantity, splitLabelUnit } from 'src/utils/units';

/**
 * Backend may ship numbers as strings, and a time bucket with no sample
 * (sensor offline, param not applicable) is `null`. Missing data stays
 * `null` — echarts renders a line gap / absent bar and the tooltip shows
 * "–" — instead of a fake dip to 0 that's indistinguishable from real
 * zero production. Non-numeric garbage also maps to `null`.
 */
export const coerceValue = (
  v: number | string | null | undefined,
): number | null => {
  if (v == null) return null;
  // Number('') === 0 — an empty/blank string is missing data, not zero.
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Any |value| at or beyond this magnitude is physically impossible for a
 * trend metric in ANY unit the backend ships: even a 1 GW plant only
 * generates ~2.4e7 kWh/day, many orders of magnitude below this ceiling.
 * The backend/sensor pipeline occasionally emits garbage this large (a
 * ~4e31 "Wind Energy Day" reading was reported) which, on a shared
 * y-axis, silently flattens every other series to an invisible sliver.
 * Chosen far above any real reading so there are no false positives.
 */
export const IMPOSSIBLE_READING_CEILING = 1e15;

/**
 * `coerceValue`, plus the physically-impossible-reading guard above.
 * Only a value that WAS a real finite number but exceeds the ceiling is
 * reported as `invalid` (and mapped to `null`, i.e. a chart gap, same as
 * ordinary missing data) — a value that was already missing/non-numeric
 * is not double-counted. Callers tally `invalid` across a series/section
 * and disclose the count to the user (never drop it silently).
 */
export const coerceChartValue = (
  v: number | string | null | undefined,
): { value: number | null; invalid: boolean } => {
  const n = coerceValue(v);
  if (n !== null && Math.abs(n) >= IMPOSSIBLE_READING_CEILING) {
    return { value: null, invalid: true };
  }
  return { value: n, invalid: false };
};

/** "1 invalid reading hidden" / "N invalid readings hidden" — the
 *  disclosure caption for points `coerceChartValue` dropped. */
export const formatInvalidReadingsCaption = (count: number): string =>
  `${count} invalid reading${count === 1 ? '' : 's'} hidden`;

/* ─────────────── geometry ─────────────── */

/**
 * Legend metrics (px inside the WebView). The legend is echarts' 'plain'
 * type — it WRAPS onto extra rows instead of paginating — with no padding,
 * left-aligned at the top of the chart. Row pitch = `lineHeight` +
 * `itemGap` (echarts' box layout uses the same gap between rows).
 */
export const TREND_LEGEND = {
  fontSize: 11,
  lineHeight: 14,
  itemGap: 10,
  iconWidth: 12,
  iconHeight: 8,
  /** echarts puts the label 5px after the icon (fixed in LegendView). */
  textGap: 5,
} as const;

/** Grid rect height incl. the x tick labels (`containLabel`). */
export const TREND_PLOT_HEIGHT = 190;
/** Room under the x labels for the dataZoom slider (16 tall, 8 from the
 *  bottom) plus its move handle. No axis name any more — the labels are
 *  self-evidently times. */
export const TREND_GRID_BOTTOM = 44;
/** grid.top with no legend: just room for the top y tick label. */
export const TREND_GRID_TOP_BARE = 12;
/** Gap between the legend block and the plot. */
export const TREND_LEGEND_PLOT_GAP = 10;
/** Extra grid.top (and the line the note is drawn on) while the
 *  "N invalid readings hidden" note is shown inside the chart. The chart
 *  height doesn't change — the plot gives up this much instead. */
export const TREND_INVALID_NOTE_HEIGHT = 16;
/** The card's padding on each side. */
export const TREND_CARD_PADDING = 16;
/** Card chrome around the chart, per axis: padding + 1px border, × 2. */
export const TREND_CARD_CHROME = 2 * TREND_CARD_PADDING + 2;
/** Chart width before the section has been measured: a 402pt-wide phone
 *  (iPhone 17 Pro) minus the 16pt screen gutters and the card chrome. */
export const DEFAULT_TREND_CHART_WIDTH = 402 - 2 * 16 - TREND_CARD_CHROME;
/*
 * Text-width calibration. echarts packs the legend with the WebView's own
 * canvas `measureText` in its default `sans-serif`: Helvetica on iOS
 * (WebKit), Roboto on Android (Chrome WebView). The tables below are those
 * fonts' advance widths and the estimate is NOT padded: canvas text is
 * kerned, kerning only narrows, so the plain advance sum is already an
 * upper bound of what echarts measures. Padding it (it used to be ×1.08)
 * wrapped rows echarts doesn't wrap — Lucky Cement's 9-series 'Trend
 * Analysis' legend at 336px was reserved 4 rows for the 3 it takes,
 * leaving a blank 24px band above the plot.
 */

/** Advance widths (1/1000 em) of printable ASCII 32–126 in Helvetica —
 *  exact on iOS, where WebKit's sans-serif is Helvetica. */
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // ' '…'/'
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, // 0–9
  278, 278, 584, 584, 584, 556, 1015, // ':'…'@'
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, // A–M
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // N–Z
  278, 278, 278, 469, 556, 333, // '['…'`'
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, // a–m
  556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, // n–z
  334, 260, 334, 584, // '{'…'~'
];

/**
 * Android: per glyph, the WIDER of Roboto and Helvetica. Roboto (the stock
 * sans-serif) is narrower for most text but wider for digits and t/i/l/f
 * ('Total Utility Import' is 2% wider in Roboto), and OEM system fonts can
 * stand in for sans-serif, so the Helvetica width is kept wherever it's
 * the larger one.
 */
const ANDROID_WIDTHS = [
  278, 278, 355, 616, 562, 889, 667, 191, 342, 348, 431, 584, 278, 333, 278, 412, // ' '…'/'
  562, 562, 562, 562, 562, 562, 562, 562, 562, 562, // 0–9
  278, 278, 584, 584, 584, 556, 1015, // ':'…'@'
  667, 667, 722, 722, 667, 611, 778, 722, 278, 552, 667, 556, 873, // A–M
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // N–Z
  278, 410, 278, 469, 556, 333, // '['…'`'
  556, 561, 523, 564, 556, 347, 561, 556, 243, 239, 507, 243, 876, // a–m
  556, 570, 561, 568, 338, 516, 327, 556, 500, 751, 500, 500, 500, // n–z
  338, 260, 338, 680, // '{'…'~'
];

/** Which width table to estimate with — the platform's WebView font. */
export type TrendFontPlatform = 'ios' | 'android';

const DEFAULT_FONT_PLATFORM: TrendFontPlatform =
  Platform.OS === 'android' ? 'android' : 'ios';

/** Estimated rendered width (px) of `text` at `fontSize` in the WebView —
 *  never narrower than the real text on the stock fonts. */
export const estimateTextWidth = (
  text: string,
  fontSize: number,
  platform: TrendFontPlatform = DEFAULT_FONT_PLATFORM,
): number => {
  const table = platform === 'android' ? ANDROID_WIDTHS : HELVETICA_WIDTHS;
  let em = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 32 && code <= 126) em += table[code - 32];
    // Latin-1 / Latin Extended (é, ü, µ, °, ²): the widest common glyphs
    // (Ö, Ø) are 778.
    else if (code < 0x0370) em += 778;
    // Greek, Cyrillic, Arabic, punctuation & symbols (—, …, ‰), CJK and
    // other full-width scripts: a full em.
    else em += 1000;
  }
  return (em / 1000) * fontSize;
};

export interface TrendLegendLayout {
  /** false for a single series — its name is already the section heading's
   *  subject, and a one-item legend toggle would only blank the chart. */
  show: boolean;
  /** Rows the wrapped legend takes (0 when hidden). */
  rows: number;
  /** Height of the legend block in px (0 when hidden). */
  height: number;
  /** `grid.top` that clears the legend (before any invalid-reading note). */
  gridTop: number;
  /**
   * Per series (same order as the names): a text width cap in px for a
   * name too long for one line at this width — it is then wrapped onto
   * several lines (`overflow: 'break'`) instead of running off the chart.
   * `null` = the name fits on one line.
   */
  wrapWidths: (number | null)[];
}

/**
 * Predict echarts' wrapped 'plain' legend at `width` px: the same greedy
 * packing as its box layout (an item moves to a new row when it would end
 * past the width), with the platform's calibrated text widths (see
 * `estimateTextWidth`). No name is truncated — a name wider than the whole
 * legend gets a wrap width and spans several lines on a row of its own.
 * `platform` defaults to the running platform; tests pass it explicitly.
 */
export const estimateTrendLegend = (
  names: readonly string[],
  width: number,
  platform: TrendFontPlatform = DEFAULT_FONT_PLATFORM,
): TrendLegendLayout => {
  if (names.length <= 1) {
    return {
      show: false,
      rows: 0,
      height: 0,
      gridTop: TREND_GRID_TOP_BARE,
      wrapWidths: names.map(() => null),
    };
  }
  const { fontSize, lineHeight, itemGap, iconWidth, textGap } = TREND_LEGEND;
  const maxWidth = Math.max(80, width);
  const maxText = maxWidth - iconWidth - textGap;

  const wrapWidths: (number | null)[] = [];
  let rows = 0;
  let x = 0;
  let rowHeight = 0;
  let height = 0;
  for (const name of names) {
    const textWidth = estimateTextWidth(name, fontSize, platform);
    let itemWidth: number;
    let itemHeight: number;
    if (textWidth > maxText) {
      // Word wrapping wastes up to a word per line — budget 15%.
      const lines = Math.ceil(textWidth / (maxText * 0.85));
      wrapWidths.push(Math.floor(maxText));
      itemWidth = maxWidth;
      itemHeight = lines * lineHeight;
    } else {
      wrapWidths.push(null);
      itemWidth = iconWidth + textGap + textWidth;
      itemHeight = lineHeight;
    }
    if (rows === 0) {
      rows = 1;
      rowHeight = itemHeight;
    } else if (x + itemWidth > maxWidth) {
      height += rowHeight + itemGap;
      rows += 1;
      x = 0;
      rowHeight = itemHeight;
    } else {
      rowHeight = Math.max(rowHeight, itemHeight);
    }
    x += itemWidth + itemGap;
  }
  height += rowHeight;
  return {
    show: true,
    rows,
    height,
    gridTop: height + TREND_LEGEND_PLOT_GAP,
    wrapWidths,
  };
};

export interface TrendChartLayout {
  legend: TrendLegendLayout;
  /** WebView height (px = pt). */
  chartHeight: number;
  /** Chart card height = chart + card chrome. Used by the skeleton and
   *  the empty/error slot too, so every state is the same height. */
  cardHeight: number;
}

/** Chart (WebView) width inside a trend section `sectionWidth` pt wide. */
export const trendChartWidth = (sectionWidth: number): number =>
  Math.max(120, Math.round(sectionWidth - TREND_CARD_CHROME));

/**
 * The one geometry source for a trend section's chart card. Depends only
 * on the configured series names and the width — both known before any
 * data arrives — so the skeleton can be exactly as tall as the chart.
 */
export const trendChartLayout = (
  aggregations: readonly TrendAggregation[],
  chartWidth: number,
): TrendChartLayout => {
  const legend = estimateTrendLegend(
    aggregations.map(a => a.display),
    chartWidth,
  );
  const chartHeight = legend.gridTop + TREND_PLOT_HEIGHT + TREND_GRID_BOTTOM;
  return { legend, chartHeight, cardHeight: chartHeight + TREND_CARD_CHROME };
};

/* ─────────────── screen-reader summary ─────────────── */

const SCALE_WORDS: Record<string, string> = {
  K: 'thousand',
  M: 'million',
  B: 'billion',
  T: 'trillion',
};

/** A value as screen readers should say it: the unit from a trailing
 *  '(kW)' in the series name when there is one ('18.9 megawatts'),
 *  otherwise the compact number with its scale in words ('18.9 thousand'). */
const spokenValue = (value: number, unit: string | null): string => {
  if (unit) return formatQuantity(value, unit, { mode: 'compact' }).spoken;
  const text = formatCompact(value);
  const m = /^(.*?)([KMBT])$/.exec(text);
  const body = m ? `${m[1]} ${SCALE_WORDS[m[2]]}` : text;
  if (body === '<0.001') return 'less than 0.001';
  return body.startsWith('-') ? `minus ${body.slice(1)}` : body;
};

/** Series listed in the spoken summary before "and N more". */
const SUMMARY_MAX_SERIES = 8;

export interface TrendChartSummaryInput {
  heading: string;
  /** e.g. 'Last 24 hours, 30 Sep 14:35 to 1 Oct 14:35'. */
  periodSpoken: string;
  rows: readonly TrendDataRow[];
  aggregations: readonly TrendAggregation[];
  invalidCount: number;
}

/**
 * One-sentence-per-fact description of a trend chart for VoiceOver /
 * TalkBack: what it shows, the period, each series' latest and peak value
 * (impossible readings excluded, exactly as the chart excludes them), and
 * the invalid-reading disclosure.
 */
export const buildTrendChartSummary = ({
  heading,
  periodSpoken,
  rows,
  aggregations,
  invalidCount,
}: TrendChartSummaryInput): string => {
  const sorted = [...rows].sort((a, b) => (a?.time ?? 0) - (b?.time ?? 0));
  const parts: string[] = [`${heading} chart`, periodSpoken];
  const count = aggregations.length;
  parts.push(`${count} series`);

  aggregations.slice(0, SUMMARY_MAX_SERIES).forEach(a => {
    let latest: number | null = null;
    let peak: number | null = null;
    for (const r of sorted) {
      const { value } = coerceChartValue(r[a.param]);
      if (value === null) continue;
      latest = value;
      peak = peak === null ? value : Math.max(peak, value);
    }
    const { unit } = splitLabelUnit(a.display);
    parts.push(
      latest === null || peak === null
        ? `${a.display}: no data`
        : `${a.display}: latest ${spokenValue(latest, unit)}, peak ${spokenValue(peak, unit)}`,
    );
  });
  if (count > SUMMARY_MAX_SERIES) {
    parts.push(`and ${count - SUMMARY_MAX_SERIES} more`);
  }
  if (invalidCount > 0) parts.push(formatInvalidReadingsCaption(invalidCount));
  return `${parts.join('. ')}.`;
};
