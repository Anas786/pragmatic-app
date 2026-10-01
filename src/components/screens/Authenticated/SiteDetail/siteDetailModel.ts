/**
 * Pure helpers behind the SiteDetail shell: the header's freshness
 * timestamp + capacity + spoken label (the freshness resolver is also the
 * Summary hero's — one copy app-wide), which queries a refresh covers,
 * the refresh-status strip, and the pinned tab strip's scroll maths. No React / RN imports, so it
 * is unit-tested directly (`__tests__/siteDetailModel.test.ts`).
 *
 * Imported by path (not through a barrel), like other screen-package
 * modules.
 */
import { toEpochMs } from 'src/utils/dates';
import { formatQuantity, FormattedQuantity } from 'src/utils/units';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/* ─────────── header freshness ─────────── */

/**
 * `/data/all` → `live.metadata.last_update`, as epoch ms.
 *
 * WEB-PORTAL PARITY: this is the timestamp the web site header's
 * 'ONLINE · 17 MINUTES' / 'last sync 17 minutes ago' is computed from
 * (its `fetchLiveData` returns `metaData: data.live.metadata`). It can
 * lag the newest per-parameter `update_at` by tens of minutes, so the
 * header reads it first to say the same age the web does.
 */
export const siteMetadataLastUpdate = (liveData: unknown): number | null => {
  if (!isObject(liveData)) return null;
  const live = liveData.live;
  if (!isObject(live)) return null;
  const meta = live.metadata;
  if (!isObject(meta)) return null;
  return toEpochMs(meta.last_update ?? meta.lastUpdate);
};

/**
 * Newest `update_at` across `/data/all` → `live.data.live.<code>`, as
 * epoch ms (seconds / ms / ISO accepted). `null` when none parses.
 */
export const newestLiveParamAt = (liveData: unknown): number | null => {
  if (!isObject(liveData)) return null;
  const live = liveData.live;
  if (!isObject(live)) return null;
  const envelope = live.data;
  if (!isObject(envelope)) return null;
  const inner = envelope.live;
  if (!isObject(inner)) return null;
  let newest: number | null = null;
  for (const entry of Object.values(inner)) {
    if (!isObject(entry)) continue;
    const ms = toEpochMs(entry.update_at ?? entry.updateAt);
    if (ms !== null && (newest === null || ms > newest)) newest = ms;
  }
  return newest;
};

/**
 * The SiteDetail header's "last data" timestamp:
 *   1. the payload's site-level sync time (what the web portal shows),
 *   2. else the newest live parameter,
 *   3. else the site-list value the Dashboard card was showing (route
 *      params) — so the header is right on first paint, before
 *      `/data/all` lands.
 * Never the app's own fetch time: that would read 'Updated just now'
 * for data that may be hours old. No timestamp at all → `null`, which
 * the freshness model renders as 'Last update unknown'.
 */
export const headerLastUpdate = (
  liveData: unknown,
  routeLastUpdate: unknown,
): number | null =>
  siteMetadataLastUpdate(liveData) ??
  newestLiveParamAt(liveData) ??
  toEpochMs(routeLastUpdate);

/* ─────────── load phase ─────────── */

/** The slice of a react-query result the phase decision reads. */
export interface QueryGate {
  hasData: boolean;
  isError: boolean;
  fetchStatus: 'fetching' | 'paused' | 'idle';
}

export type SiteDetailPhase = 'loading' | 'error' | 'offline' | 'content';

/**
 * What the SiteDetail body shows, from the `/data/all` + site-config
 * queries. Content needs BOTH payloads; a failed BACKGROUND refetch over
 * cached data stays 'content' (the refresh strip reports it).
 *
 * react-query v5's `isLoading` (= isPending && isFetching) is false both
 * after a failed initial load and while paused offline, and `isPending`
 * is false after an error even while a retry is in flight — so this
 * branches on data + fetchStatus explicitly:
 *   any missing payload being fetched → 'loading' (skeleton; also while
 *     a Retry is in flight, so the tap visibly does something)
 *   else paused offline                → 'offline' (auto-resumes)
 *   else errored                       → 'error'   (Retry card)
 *   else (not started yet)             → 'loading'
 */
export const siteDetailPhase = (
  live: QueryGate,
  config: QueryGate,
): SiteDetailPhase => {
  if (live.hasData && config.hasData) return 'content';
  const missing = [live, config].filter(q => !q.hasData);
  if (missing.some(q => q.fetchStatus === 'fetching')) return 'loading';
  if (missing.some(q => q.fetchStatus === 'paused')) return 'offline';
  if (missing.some(q => q.isError)) return 'error';
  return 'loading';
};

/* ─────────── refresh status strip ─────────── */

/**
 * Tabs that announce a failed `/data/all` refresh themselves: the Live
 * tab has its own refresh button and "Showing the last data received"
 * strip. While the query is errored the shell strip stays off those
 * tabs, so one failure never shows two notices with two Retry buttons.
 * (Cards / Summary have no notice of their own — the shell strip is
 * theirs.)
 */
export const TABS_WITH_OWN_REFRESH_STATUS: ReadonlySet<string> = new Set(['Live']);

export type RefreshStripState = 'offline' | 'failed' | null;

export interface RefreshStripInput {
  /** The tab whose body is mounted. */
  tab: string;
  /** react-query's onlineManager (NetInfo-fed in App.tsx). */
  online: boolean;
  fetchStatus: QueryGate['fetchStatus'];
  isError: boolean;
  isRefetchError: boolean;
  /** The strip's own Retry is in flight. */
  retrying: boolean;
}

/**
 * The one-line note over cached `/data/all` data:
 *   'offline' — no connection (or the refetch is paused waiting for one);
 *              resumes by itself, so no Retry.
 *   'failed'  — the last background refetch errored (kept up while the
 *              strip's own Retry runs, so its spinner has somewhere to be).
 *   null      — nothing to say, or the tab reports it itself.
 */
export const refreshStripState = (s: RefreshStripInput): RefreshStripState => {
  if (s.isError && TABS_WITH_OWN_REFRESH_STATUS.has(s.tab)) return null;
  if (!s.online || s.fetchStatus === 'paused') return 'offline';
  if (s.isRefetchError && (s.fetchStatus === 'idle' || s.retrying)) return 'failed';
  return null;
};

/* ─────────── header capacity + spoken label ─────────── */

/**
 * Site capacity for the header ('1.25 MW', '30 MW') — compact, rescaled
 * within the power family. `null` when unknown or not positive (a size
 * of 0 means "not configured", not a 0 kW plant).
 */
export const capacityQuantity = (capacityKw: unknown): FormattedQuantity | null => {
  const q = formatQuantity(capacityKw, 'kW', { mode: 'compact' });
  if (q.isMissing || q.value === null || q.value <= 0) return null;
  return q;
};

/** '1.25 MW' — the visible trailing text after the freshness label. */
export const capacityText = (q: FormattedQuantity | null): string | undefined =>
  q ? `${q.text} ${q.unit}`.trim() : undefined;

/**
 * The header identity's composed heading label, e.g.
 * 'CCI FGF, 1.25 megawatts, Live, updated 4 minutes ago'. Starts with
 * the visible title (WCAG 2.5.3); empty parts are dropped.
 */
export const siteHeaderA11yLabel = (
  name: string,
  capacity: FormattedQuantity | null,
  statusSpoken: string,
): string =>
  [name, capacity?.spoken ?? '', statusSpoken]
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .join(', ');

/* ─────────── refresh scope ─────────── */

/**
 * Per-tab report queries keyed `[root, siteId, …]` that a SiteDetail
 * refresh also re-runs when they're mounted (active) — so pulling to
 * refresh on Reports / Tables / Trend refreshes what is on screen.
 * `/data/all` itself is refetched separately (exactly one request).
 */
export const SITE_TAB_QUERY_ROOTS: ReadonlySet<string> = new Set([
  'energy-report',
  'inverter-report',
  'trend-data',
]);

export const isSiteTabQuery = (
  queryKey: readonly unknown[],
  siteId: string,
): boolean =>
  queryKey.length >= 2 &&
  typeof queryKey[0] === 'string' &&
  SITE_TAB_QUERY_ROOTS.has(queryKey[0]) &&
  queryKey[1] === siteId;

/* ─────────── pinned tab strip + body scroll ─────────── */

/** Body offset (pt) past which the tab strip draws its bottom hairline. */
export const BODY_SCROLLED_THRESHOLD = 1;

/** True once content has scrolled under the pinned tab strip. A
 *  pull-to-refresh overscroll (negative y) is not "scrolled". */
export const isBodyScrolled = (y: number): boolean =>
  Number.isFinite(y) && y > BODY_SCROLLED_THRESHOLD;

/** Slack (pt) so sub-pixel offsets don't flicker an edge fade on/off. */
const FADE_EPSILON = 1;

/**
 * Which edges of the horizontal tab strip hide content — each shows a
 * fade so an overflowing strip reads as scrollable rather than cut.
 */
export const tabStripFades = (
  scrollX: number,
  viewportWidth: number,
  contentWidth: number,
): { left: boolean; right: boolean } => {
  if (!(viewportWidth > 0) || !(contentWidth > 0)) {
    return { left: false, right: false };
  }
  const x = Number.isFinite(scrollX) ? scrollX : 0;
  return {
    left: x > FADE_EPSILON,
    right: x + viewportWidth < contentWidth - FADE_EPSILON,
  };
};

/**
 * Scroll offset that centres a chip in the strip's viewport. `leading`
 * is the content inset before the chip track (the page gutter). The
 * ScrollView clamps the far end itself.
 */
export const tabCenterScrollX = (
  chipX: number,
  chipWidth: number,
  viewportWidth: number,
  leading: number,
): number => Math.max(0, leading + chipX + chipWidth / 2 - viewportWidth / 2);
