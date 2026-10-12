/**
 * Shared SLD data model for the inline diagram and the full-screen route.
 *
 * Memo contract (keeps live ticks cheap and the layout stable):
 *   - `baseGraph`  ← siteConfig only;
 *   - `grouping`   ← baseGraph only (`buildSldGrouping` is structure-only);
 *   - `layout`     ← the displayed (grouped or per-unit) graph only
 *                    (`buildSldPhoneLayout` is structure-only and cached per
 *                    graph), so a live-data refresh never moves a node or
 *                    changes the bounds / panel height;
 *   - `baseResolve`/`groupedResolve` ← liveData (+ the stable groups).
 *
 * View: `3d` is the web portal's own twin in a WebView (`SldTwin/`, fed the
 * `sldV2` + `live.data` — it does not use this phone layout); `2d` is the
 * Diagram drawn from this graph. Mode: ONE Grouped / Units for both views
 * (in memory, default grouped): Units = the twin gets the RAW `sldV2`;
 * Grouped = the same grouping as the Diagram (`buildSldGrouping`, one
 * model per group, its readings the group card's totals). The hosts pass
 * the effective `mode` to `SldTwinView`. The user's view choice is persisted
 * (`useSldViewMode`). When the twin can't be shown for a site (page error,
 * load failure, repeated web-process crashes — `fallBackTo2D`), the
 * EFFECTIVE view is `2d` for that site for the rest of the session and the
 * Diagram | 3D switch hides, while the stored choice stays `3d` (another
 * site still opens in 3D).
 *
 * `useSldLayout` is the live-data-free half — enough to size the inline
 * panel (the Summary placeholder uses it before the diagram mounts).
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  buildSldGrouping,
  buildSldPhoneLayout,
  makeGroupedResolver,
  makeLiveResolver,
  selectSldGraph,
  SldGroup,
  SLDBounds,
  SLDPoint,
} from 'src/utils';
import {
  SldView,
  SldViewMode,
  useSiteConfig,
  useSiteData,
  useSldViewMode,
} from 'src/hooks';
import { SLDGraph, SLDValueResolver } from 'src/types';
import { headerLastUpdate } from '../siteDetailModel';

const EMPTY_GRAPH: SLDGraph = { nodes: [], edges: [] };

/* ─────────── 3D → Diagram fallback (session-wide, per site) ─────────── */

/** Sites whose 3D twin failed this session: shown as the Diagram. */
const failed3D = new Set<string>();
const failedListeners = new Set<() => void>();
const subscribeFailed = (listener: () => void) => {
  failedListeners.add(listener);
  return () => {
    failedListeners.delete(listener);
  };
};
const markFailed = (siteId: string) => {
  if (failed3D.has(siteId)) return;
  failed3D.add(siteId);
  failedListeners.forEach(l => l());
};

/** Tests only: forget every session fallback. */
export const resetSldTwinFallbackForTests = (): void => {
  failed3D.clear();
  failedListeners.forEach(l => l());
};

export interface SldLayoutModel {
  /** Displayed graph, laid out for a phone (positions + card sizes). */
  graph: SLDGraph;
  /** Frame bounds of the Diagram's phone layout. */
  bounds: SLDBounds;
  /** Hub centre in frame coordinates — centred when the diagram overflows. */
  focus: SLDPoint;
  /**
   * Effective mode (always `units` when grouping would change nothing) —
   * shared by the Diagram and the 3D twin.
   */
  mode: SldViewMode;
  setMode: (mode: SldViewMode) => void;
  /**
   * False when no energy type has ≥2 units — every Grouped/Units control
   * (inline header, 2D full-screen pill, sideways rail) is hidden then.
   */
  canGroup: boolean;
  /** The grouping's groups — the resolver aggregates them in Grouped mode. */
  groups: SldGroup[];
  /** Effective view: `2d` whenever the 3D twin failed for this site. */
  view: SldView;
  /**
   * False once this site's 3D twin has failed: the Diagram | 3D switch is
   * hidden then — its 3D segment could only re-select the stored choice and
   * nothing would happen.
   */
  can3D: boolean;
  /** The user's choice (persisted). */
  setView: (view: SldView) => void;
  /** The 3D twin can't be shown: show this site as the Diagram from now on. */
  fallBackTo2D: () => void;
}

export interface SldModel extends SldLayoutModel {
  /** Displayed resolver (group params aggregate their members in Grouped mode). */
  resolve: SLDValueResolver;
  /**
   * The site's "last data" stamp — the SiteDetail header's own resolver
   * (`headerLastUpdate`), so the Diagram's motion gate agrees with the
   * header and the Energy-flow Live tag.
   */
  lastUpdate: number | null;
}

export const useSldLayout = (siteId: string): SldLayoutModel => {
  // Graph from `siteConfig.siteComponents.sldV2`.
  const { data: config } = useSiteConfig(siteId);
  const storedMode = useSldViewMode(s => s.mode);
  const setMode = useSldViewMode(s => s.setMode);
  const storedView = useSldViewMode(s => s.view);
  const setView = useSldViewMode(s => s.setView);

  const baseGraph = useMemo(() => selectSldGraph(config) ?? EMPTY_GRAPH, [config]);
  const grouping = useMemo(() => buildSldGrouping(baseGraph), [baseGraph]);

  const canGroup = grouping.groups.length > 0;
  const mode: SldViewMode = canGroup ? storedMode : 'units';
  const shown = mode === 'grouped' ? grouping.graph : baseGraph;
  const layout = useMemo(() => buildSldPhoneLayout(shown), [shown]);
  // Re-renders when THIS site falls back to the Diagram (rare; session-wide).
  const isFailed = useSyncExternalStore(subscribeFailed, () => failed3D.has(siteId));
  const fallBackTo2D = useCallback(() => markFailed(siteId), [siteId]);

  return {
    graph: layout.graph,
    bounds: layout.bounds,
    focus: layout.focus,
    mode,
    setMode,
    canGroup,
    groups: grouping.groups,
    view: storedView === '3d' && !isFailed ? '3d' : '2d',
    can3D: !isFailed,
    setView,
    fallBackTo2D,
  };
};

/**
 * @param routeLastUpdate the site-list "last data" value the Dashboard card
 *   showed (SiteDetail route param) — the header's fallback before
 *   `/data/all` lands. Omitted on the full-screen route.
 */
export const useSldModel = (siteId: string, routeLastUpdate?: unknown): SldModel => {
  const layout = useSldLayout(siteId);
  const { groups } = layout;
  // Values resolved live from `liveData.live.data.<param>` (same path a
  // `dataStore:"live"` card uses); group params aggregate their members.
  const { data: liveData } = useSiteData(siteId);
  const baseResolve = useMemo(() => makeLiveResolver(liveData), [liveData]);
  const groupedResolve = useMemo(
    () => makeGroupedResolver(baseResolve, groups),
    [baseResolve, groups],
  );
  const lastUpdate = useMemo(
    () => headerLastUpdate(liveData, routeLastUpdate),
    [liveData, routeLastUpdate],
  );
  const resolve = layout.mode === 'grouped' ? groupedResolve : baseResolve;
  return { ...layout, resolve, lastUpdate };
};
