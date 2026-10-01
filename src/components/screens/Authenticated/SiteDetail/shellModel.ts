/**
 * Pure view-model helpers for the SiteDetail shell: the header's
 * freshness timestamp, capacity and spoken label, and the pinned tab
 * strip's edge fades and resting scroll offset.
 *
 * React-free so it can be unit-tested directly
 * (`__tests__/siteDetailShell.test.ts`). It is imported by direct path and
 * deliberately left out of every barrel.
 */
import type { ISiteAllData } from 'src/types';
import { toEpochMs } from 'src/utils/dates';
import { FormattedQuantity, formatQuantity } from 'src/utils/units';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/* ─────────────── header: "last data" timestamp ─────────────── */

/**
 * `live.metadata.last_update` from /data/all. The web portal's site
 * header ("ONLINE · 17 MINUTES", "last sync 17 minutes ago") reads this
 * field, so the app's header must read it too. On 2026-10-01 it lagged
 * the newest per-parameter `update_at` by more than 20 minutes for
 * Lucky Cement. A `metadata` object nested under `live.data` is
 * accepted as well, for robustness.
 */
export const liveMetadataLastUpdate = (
  liveData: ISiteAllData | null | undefined,
): number | null => {
  if (!liveData) return null;
  const branch = (liveData as unknown as Record<string, unknown>).live;
  if (!isObject(branch)) return null;
  const envelope = branch.data;
  const meta = isObject(branch.metadata)
    ? branch.metadata
    : isObject(envelope) && isObject(envelope.metadata)
      ? envelope.metadata
      : null;
  if (!meta) return null;
  return toEpochMs(meta.last_update ?? meta.lastUpdate);
};

/** Newest `live.data.live.<code>.update_at`, as epoch ms (null if none). */
export const newestLiveParamUpdate = (
  liveData: ISiteAllData | null | undefined,
): number | null => {
  if (!liveData) return null;
  const branch = (liveData as unknown as Record<string, unknown>).live;
  if (!isObject(branch)) return null;
  const envelope = branch.data;
  if (!isObject(envelope)) return null;
  const inner = envelope.live;
  if (!isObject(inner)) return null;
  let latest: number | null = null;
  for (const entry of Object.values(inner)) {
    if (!isObject(entry)) continue;
    const ms = toEpochMs(entry.update_at ?? entry.updateAt);
    if (ms !== null && (latest === null || ms > latest)) latest = ms;
  }
  return latest;
};

/**
 * The header's "last data" time. Sources in order:
 *   1. `live.metadata.last_update` (what the web portal shows),
 *   2. the newest live-parameter `update_at`,
 *   3. the site-list `dataLastUpdate` passed in the route params, which
 *      is also what makes the header correct on first paint, before
 *      /data/all has loaded.
 * The query's own fetch time (`dataUpdatedAt`) is deliberately NOT a
 * fallback: it says when the app downloaded the data, not how old the
 * data is, and would show a stale site as 'Updated just now'. With no
 * timestamp at all the header reads 'Last update unknown'.
 */
export const resolveSiteLastUpdate = (
  liveData: ISiteAllData | null | undefined,
  routeLastUpdate: unknown,
): number | null =>
  liveMetadataLastUpdate(liveData) ??
  newestLiveParamUpdate(liveData) ??
  toEpochMs(routeLastUpdate);

/* ─────────────── header: capacity ─────────────── */

/**
 * Capacity in kW parsed from the legacy route subtitle ('1,250 kW' /
 * '1,250 kW · Controller'). This is only used when a navigation predates
 * the numeric `capacityKw` param.
 */
export const capacityFromLegacySubtitle = (
  subtitle: string | null | undefined,
): number | null => {
  if (typeof subtitle !== 'string') return null;
  const m = /^\s*([\d,]+(?:\.\d+)?)\s*kW\b/i.exec(subtitle);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * Header capacity, formatted compact ('30 MW', '1.25 MW', '850 kW').
 * Returns null when it is unknown. A capacity of 0 or less counts as
 * unknown: a site always has a positive rated size, so 0 means the field
 * is unset.
 */
export const headerCapacity = (
  capacityKw: unknown,
  legacySubtitle?: string | null,
): FormattedQuantity | null => {
  const fromParam = formatQuantity(capacityKw, 'kW', { mode: 'compact' });
  const q =
    !fromParam.isMissing && (fromParam.value ?? 0) > 0
      ? fromParam
      : formatQuantity(capacityFromLegacySubtitle(legacySubtitle), 'kW', {
          mode: 'compact',
        });
  if (q.isMissing || (q.value ?? 0) <= 0) return null;
  return q;
};

/** Visible capacity text for the subtitle, e.g. '30 MW'. */
export const capacityText = (q: FormattedQuantity | null): string | undefined =>
  q ? (q.unit ? `${q.text} ${q.unit}` : q.text) : undefined;

/**
 * Spoken label for the header's identity heading:
 * 'Lucky Cement Nooriabad, 30 megawatts, Live, updated 4 minutes ago'.
 * Empty parts are dropped.
 */
export const headerA11yLabel = (
  name: string,
  capacity: FormattedQuantity | null,
  statusSpoken: string,
): string =>
  [name, capacity?.spoken ?? '', statusSpoken]
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(', ');

/* ─────────────── tab strip: edge fades + resting offset ─────────────── */

const EPS = 1;

/** Which edge fades to show for a horizontal strip at `scrollX`. */
export const tabEdgeFades = (
  scrollX: number,
  viewport: number,
  content: number,
): { left: boolean; right: boolean } => ({
  left: scrollX > EPS,
  right: scrollX + viewport < content - EPS,
});

/** A chip's horizontal extent in scroll-CONTENT coordinates. */
export interface ChipRect {
  x: number;
  width: number;
}

export interface RestingScrollInput {
  chips: ChipRect[];
  selectedIndex: number;
  /** Visible width of the horizontal ScrollView. */
  viewport: number;
  /** Total scroll content width. */
  content: number;
  /** Edge-fade width. A fade is drawn only on a side with hidden content. */
  fade: number;
  /** Space kept between an aligned chip and the viewport edge (≥ fade). */
  pad: number;
  /** Current scroll offset. It is kept when it is already a clean rest. */
  current?: number;
}

/**
 * Number of chips whose label is cut at an edge in a READABLE way: the
 * chip straddles the edge and part of it shows outside the edge fade. A
 * sliver that sits entirely under the fade reads as "more this way", so
 * it is not counted.
 */
const readableCuts = (
  chips: ChipRect[],
  o: number,
  viewport: number,
  leftFade: number,
  rightFade: number,
): number => {
  const right = o + viewport;
  let cuts = 0;
  for (const c of chips) {
    const end = c.x + c.width;
    if (c.x < o - EPS && end > o + EPS && end - o > leftFade + EPS) cuts += 1;
    if (c.x < right - EPS && end > right + EPS && right - c.x > rightFade + EPS) {
      cuts += 1;
    }
  }
  return cuts;
};

/**
 * Where the tab strip should come to rest after a selection, as a scroll
 * offset. Rules, in priority order:
 *   1. The selected chip is fully visible and not under an edge fade.
 *   2. The fewest chips are cut mid-label outside a fade, ideally none.
 *      Candidate offsets align a chip start or end to an edge, or sit at
 *      either end of the content.
 *   3. If the current offset already meets 1 and has no cuts, it is kept,
 *      so tapping a visible tab doesn't shift the strip.
 *   4. Otherwise the selected chip is placed as close to the centre as
 *      possible.
 * The result is always clamped to the scrollable range.
 */
export const restingTabScrollX = ({
  chips,
  selectedIndex,
  viewport,
  content,
  fade,
  pad,
  current = 0,
}: RestingScrollInput): number => {
  const maxX = Math.max(0, content - viewport);
  if (maxX <= EPS || viewport <= 0) return 0;
  const clamp = (v: number) => Math.min(maxX, Math.max(0, v));
  const sel = chips[selectedIndex];
  if (!sel) return clamp(current);

  const evaluate = (o: number) => {
    const leftFade = o > EPS ? fade : 0;
    const rightFade = o < maxX - EPS ? fade : 0;
    const visible =
      sel.x >= o + leftFade - EPS &&
      sel.x + sel.width <= o + viewport - rightFade + EPS;
    return {
      visible,
      cuts: readableCuts(chips, o, viewport, leftFade, rightFade),
      dist: Math.abs(sel.x + sel.width / 2 - (o + viewport / 2)),
    };
  };

  const here = clamp(current);
  const hereScore = evaluate(here);
  if (hereScore.visible && hereScore.cuts === 0) return here;

  const candidates = new Set<number>([0, maxX]);
  for (const c of chips) {
    candidates.add(clamp(c.x - pad));
    candidates.add(clamp(c.x + c.width + pad - viewport));
  }

  let best: { o: number; cuts: number; dist: number } | null = null;
  for (const o of candidates) {
    const s = evaluate(o);
    if (!s.visible) continue;
    if (
      !best ||
      s.cuts < best.cuts ||
      (s.cuts === best.cuts && s.dist < best.dist - EPS)
    ) {
      best = { o, cuts: s.cuts, dist: s.dist };
    }
  }
  if (best) return best.o;
  // The selected chip is wider than the visible area: centre it.
  return clamp(sel.x + sel.width / 2 - viewport / 2);
};
