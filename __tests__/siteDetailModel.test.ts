/**
 * SiteDetail shell view-model (SiteDetail/siteDetailModel.ts): the header's
 * freshness timestamp (web-portal "last sync" parity), capacity + spoken
 * label, the load-phase gate, the refresh scope, the refresh-status
 * strip, and the pinned tab strip's scroll maths.
 */
import { describe, expect, it } from '@jest/globals';
import { energyReportQueryKey } from '../src/hooks/useEnergyReport';
import { inverterReportQueryKey } from '../src/hooks/useInverterReport';
import { siteConfigQueryKey } from '../src/hooks/useSiteConfig';
import { siteDataQueryKey } from '../src/hooks/useSiteData';
import { trendDataQueryKey } from '../src/hooks/useTrendData';
import {
  BODY_SCROLLED_THRESHOLD,
  capacityQuantity,
  capacityText,
  headerLastUpdate,
  isBodyScrolled,
  isSiteTabQuery,
  newestLiveParamAt,
  QueryGate,
  refreshStripState,
  RefreshStripInput,
  siteDetailPhase,
  siteHeaderA11yLabel,
  siteMetadataLastUpdate,
  tabCenterScrollX,
  tabStripFades,
} from '../src/components/screens/Authenticated/SiteDetail/siteDetailModel';
import { freshnessSpoken, siteStatus } from '../src/utils/freshness';
import { formatQuantity } from '../src/utils/units';

const MIN = 60_000;
// 1 Oct 2026 — the web cross-check day (Lucky Cement Nooriabad).
const T_1559 = Date.UTC(2026, 9, 1, 10, 59, 0); // 15:59:00 PKT
const T_1619 = Date.UTC(2026, 9, 1, 11, 19, 1); // 16:19:01 PKT

/** /data/all-shaped payload. */
const payload = ({
  meta,
  params,
}: {
  meta?: unknown;
  params?: Record<string, unknown>;
}) => ({
  live: {
    ...(meta === undefined ? {} : { metadata: meta }),
    data: { live: params ?? {} },
  },
  processed: null,
  alarms: null,
});

describe('siteMetadataLastUpdate — the web header\'s "last sync"', () => {
  it('reads live.metadata.last_update as ms, seconds, numeric string or ISO', () => {
    expect(siteMetadataLastUpdate(payload({ meta: { last_update: T_1559 } }))).toBe(T_1559);
    expect(siteMetadataLastUpdate(payload({ meta: { last_update: T_1559 / 1000 } }))).toBe(T_1559);
    expect(siteMetadataLastUpdate(payload({ meta: { last_update: String(T_1559) } }))).toBe(T_1559);
    expect(
      siteMetadataLastUpdate(payload({ meta: { last_update: new Date(T_1559).toISOString() } })),
    ).toBe(T_1559);
    expect(siteMetadataLastUpdate(payload({ meta: { lastUpdate: T_1559 } }))).toBe(T_1559);
  });

  it('is null for a missing / malformed envelope', () => {
    expect(siteMetadataLastUpdate(undefined)).toBeNull();
    expect(siteMetadataLastUpdate(null)).toBeNull();
    expect(siteMetadataLastUpdate({ live: null })).toBeNull();
    expect(siteMetadataLastUpdate(payload({}))).toBeNull();
    expect(siteMetadataLastUpdate(payload({ meta: null }))).toBeNull();
    expect(siteMetadataLastUpdate(payload({ meta: { last_update: 'NA' } }))).toBeNull();
    expect(siteMetadataLastUpdate(payload({ meta: { last_update: '' } }))).toBeNull();
  });
});

describe('newestLiveParamAt', () => {
  it('returns the newest update_at, ignoring bad entries', () => {
    const data = payload({
      params: {
        p1: { value: 1, update_at: T_1559 },
        p2: { value: 2, update_at: T_1619 },
        p3: { value: 3, update_at: 'garbage' },
        p4: { value: 4 },
        p5: 42,
        p6: null,
        p7: { value: 7, updateAt: T_1559 - MIN },
      },
    });
    expect(newestLiveParamAt(data)).toBe(T_1619);
  });

  it('accepts epoch seconds', () => {
    expect(newestLiveParamAt(payload({ params: { a: { update_at: T_1619 / 1000 } } }))).toBe(T_1619);
  });

  it('is null when nothing parses', () => {
    expect(newestLiveParamAt(payload({ params: {} }))).toBeNull();
    expect(newestLiveParamAt(payload({ params: { a: { value: 1 } } }))).toBeNull();
    expect(newestLiveParamAt({ live: { data: null } })).toBeNull();
    expect(newestLiveParamAt('x')).toBeNull();
  });
});

describe('headerLastUpdate precedence', () => {
  it('prefers the site sync time over a newer parameter (web parity)', () => {
    // Observed on the web portal: header 'last sync 17 minutes ago'
    // (15:59) while the newest live reading was 16:19.
    const data = payload({
      meta: { last_update: T_1559 },
      params: { p: { value: 1, update_at: T_1619 } },
    });
    expect(headerLastUpdate(data, T_1619 + MIN)).toBe(T_1559);
  });

  it('falls back to the newest parameter, then the route param', () => {
    const paramsOnly = payload({ params: { p: { value: 1, update_at: T_1619 } } });
    expect(headerLastUpdate(paramsOnly, T_1559)).toBe(T_1619);
    // Before /data/all lands: the Dashboard card's site-list value
    // (an epoch-ms string) so the header is right on first paint.
    expect(headerLastUpdate(undefined, String(T_1559))).toBe(T_1559);
    expect(headerLastUpdate(payload({}), T_1559)).toBe(T_1559);
  });

  it('is null (→ "Last update unknown") rather than inventing a fetch time', () => {
    expect(headerLastUpdate(undefined, undefined)).toBeNull();
    expect(headerLastUpdate(payload({}), null)).toBeNull();
    expect(siteStatus(undefined, headerLastUpdate(undefined, null)).label).toBe(
      'Last update unknown',
    );
  });
});

describe('siteDetailPhase', () => {
  const q = (over: Partial<QueryGate> = {}): QueryGate => ({
    hasData: false,
    isError: false,
    fetchStatus: 'idle',
    ...over,
  });
  const ready = q({ hasData: true });

  it('shows content only when BOTH payloads are present', () => {
    expect(siteDetailPhase(ready, ready)).toBe('content');
    expect(siteDetailPhase(ready, q({ fetchStatus: 'fetching' }))).toBe('loading');
    expect(siteDetailPhase(q({ fetchStatus: 'fetching' }), ready)).toBe('loading');
  });

  it('keeps content when a BACKGROUND refetch fails or pauses', () => {
    expect(siteDetailPhase(q({ hasData: true, isError: true }), ready)).toBe('content');
    expect(siteDetailPhase(q({ hasData: true, fetchStatus: 'paused' }), ready)).toBe('content');
  });

  it('error → retry card; a retry in flight → skeleton again', () => {
    expect(siteDetailPhase(q({ isError: true }), ready)).toBe('error');
    expect(siteDetailPhase(ready, q({ isError: true }))).toBe('error');
    expect(siteDetailPhase(q({ isError: true, fetchStatus: 'fetching' }), ready)).toBe('loading');
  });

  it('paused offline with no data → offline card (even if the other one errored)', () => {
    expect(siteDetailPhase(q({ fetchStatus: 'paused' }), ready)).toBe('offline');
    expect(siteDetailPhase(q({ fetchStatus: 'paused' }), q({ isError: true }))).toBe('offline');
  });

  it('a fetch in flight wins over a paused / errored sibling', () => {
    expect(siteDetailPhase(q({ fetchStatus: 'fetching' }), q({ isError: true }))).toBe('loading');
    expect(siteDetailPhase(q({ fetchStatus: 'fetching' }), q({ fetchStatus: 'paused' }))).toBe(
      'loading',
    );
  });

  it('not started yet → loading', () => {
    expect(siteDetailPhase(q(), q())).toBe('loading');
  });
});

describe('header capacity + spoken label', () => {
  it('formats the site size compactly in the power family', () => {
    expect(capacityText(capacityQuantity(30000))).toBe('30 MW');
    expect(capacityText(capacityQuantity(1250))).toBe('1.25 MW');
    expect(capacityText(capacityQuantity(850))).toBe('850 kW');
    // FND rule: measured fractions keep 3 significant digits — the same
    // text the Dashboard card shows for this size.
    expect(capacityText(capacityQuantity('2500'))).toBe('2.50 MW');
  });

  it('drops unknown or non-positive sizes', () => {
    for (const v of [0, -5, null, undefined, 'NA', '', NaN]) {
      expect(capacityQuantity(v)).toBeNull();
    }
    expect(capacityText(null)).toBeUndefined();
  });

  it("composes '<name>, <capacity>, <status>' and drops empty parts", () => {
    const now = T_1559 + 4 * MIN;
    const status = siteStatus(undefined, T_1559, now);
    expect(siteHeaderA11yLabel('CCI FGF', capacityQuantity(1250), status.spoken)).toBe(
      'CCI FGF, 1.25 megawatts, Live, updated 4 minutes ago',
    );
    expect(siteHeaderA11yLabel('CCI FGF', null, 'Last update unknown')).toBe(
      'CCI FGF, Last update unknown',
    );
    expect(siteHeaderA11yLabel('CCI FGF', null, '  ')).toBe('CCI FGF');
  });

  it('speaks the same age and level the web header shows (17 min → live, 45 min → delayed)', () => {
    // Web header thresholds: online < 30 min, warning 30–60 min, offline ≥ 60.
    const now = T_1559 + 17 * MIN;
    expect(siteStatus(undefined, T_1559, now).level).toBe('live');
    expect(freshnessSpoken('live', 17 * MIN, now)).toBe('Live, updated 17 minutes ago');
    const later = T_1559 + 45 * MIN;
    expect(siteStatus(undefined, T_1559, later).level).toBe('delayed');
    expect(freshnessSpoken('delayed', 45 * MIN, later)).toBe(
      'Delayed, last updated 45 minutes ago',
    );
  });

  it('keeps the formatted capacity value untouched', () => {
    expect(capacityQuantity(30000)?.value).toBe(formatQuantity(30000, 'kW').value);
  });
});

describe('isSiteTabQuery — refresh scope', () => {
  const custom = { kind: 'custom', start: 1, end: 2 } as const;

  it('matches the mounted per-tab report queries of THIS site', () => {
    expect(isSiteTabQuery(energyReportQueryKey('s1', custom), 's1')).toBe(true);
    expect(isSiteTabQuery(inverterReportQueryKey('s1', { kind: 'lifeTime' }), 's1')).toBe(true);
    expect(
      isSiteTabQuery(trendDataQueryKey('s1', 0, { start: 'a', end: 'b', tz: 'UTC' }), 's1'),
    ).toBe(true);
  });

  it('never matches another site or /data/all (refetched separately, once)', () => {
    expect(isSiteTabQuery(energyReportQueryKey('s2', custom), 's1')).toBe(false);
    expect(isSiteTabQuery(siteDataQueryKey('s1'), 's1')).toBe(false);
    expect(isSiteTabQuery(siteConfigQueryKey('s1'), 's1')).toBe(false);
    expect(isSiteTabQuery(['user', 'site-list', null, 50], 's1')).toBe(false);
    expect(isSiteTabQuery([], 's1')).toBe(false);
  });
});

describe('refreshStripState — one notice per /data/all refresh state', () => {
  const base: RefreshStripInput = {
    tab: 'Summary',
    online: true,
    fetchStatus: 'idle',
    isError: false,
    isRefetchError: false,
    retrying: false,
  };

  it('says nothing while online and healthy, or while a refetch runs', () => {
    expect(refreshStripState(base)).toBeNull();
    expect(refreshStripState({ ...base, fetchStatus: 'fetching' })).toBeNull();
  });

  it("is 'offline' with no connection or a paused refetch (Dashboard parity)", () => {
    expect(refreshStripState({ ...base, online: false })).toBe('offline');
    expect(refreshStripState({ ...base, fetchStatus: 'paused' })).toBe('offline');
    // Offline wins over a stale error — it resumes by itself, no Retry.
    expect(
      refreshStripState({ ...base, online: false, isError: true, isRefetchError: true }),
    ).toBe('offline');
  });

  it("is 'failed' after a background refetch error, and stays up while its Retry runs", () => {
    const failed = { ...base, isError: true, isRefetchError: true };
    expect(refreshStripState(failed)).toBe('failed');
    // Some other refetch running → hidden; the strip's own Retry → kept.
    expect(refreshStripState({ ...failed, fetchStatus: 'fetching' })).toBeNull();
    expect(refreshStripState({ ...failed, fetchStatus: 'fetching', retrying: true })).toBe(
      'failed',
    );
  });

  it('stays off a tab that reports the failure itself (Live), on every other tab it shows', () => {
    const failed = { ...base, isError: true, isRefetchError: true };
    expect(refreshStripState({ ...failed, tab: 'Live' })).toBeNull();
    expect(refreshStripState({ ...failed, tab: 'Live', online: false })).toBeNull();
    // No error → the Live tab has no notice of its own, so offline still shows.
    expect(refreshStripState({ ...base, tab: 'Live', online: false })).toBe('offline');
    for (const tab of ['Summary', 'Cards', 'Trend', 'Reports', 'Tables']) {
      expect(refreshStripState({ ...failed, tab })).toBe('failed');
    }
  });
});

describe('pinned strip + body scroll maths', () => {
  it('flags the body as scrolled only past the threshold (not on overscroll)', () => {
    expect(isBodyScrolled(0)).toBe(false);
    expect(isBodyScrolled(BODY_SCROLLED_THRESHOLD)).toBe(false);
    expect(isBodyScrolled(BODY_SCROLLED_THRESHOLD + 0.5)).toBe(true);
    expect(isBodyScrolled(-60)).toBe(false);
    expect(isBodyScrolled(NaN)).toBe(false);
  });

  it('shows a fade only on the side that hides tabs', () => {
    // 6 chips ≈ 560pt in a 402pt viewport.
    expect(tabStripFades(0, 402, 560)).toEqual({ left: false, right: true });
    expect(tabStripFades(80, 402, 560)).toEqual({ left: true, right: true });
    expect(tabStripFades(158, 402, 560)).toEqual({ left: true, right: false });
    expect(tabStripFades(0.4, 402, 402.5)).toEqual({ left: false, right: false });
    // Not measured yet → no fades.
    expect(tabStripFades(0, 0, 560)).toEqual({ left: false, right: false });
    expect(tabStripFades(NaN, 402, 560)).toEqual({ left: false, right: true });
  });

  it('centres the selected chip, never scrolling before the start', () => {
    expect(tabCenterScrollX(300, 90, 400, 16)).toBe(16 + 300 + 45 - 200);
    expect(tabCenterScrollX(4, 100, 400, 16)).toBe(0);
  });
});
