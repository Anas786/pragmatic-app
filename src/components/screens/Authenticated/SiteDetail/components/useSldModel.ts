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
 * `useSldLayout` is the live-data-free half — enough to size the inline
 * panel (the Summary placeholder uses it before the diagram mounts).
 */

import { useMemo } from 'react';
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
import { SldViewMode, useSiteConfig, useSiteData, useSldViewMode } from 'src/hooks';
import { SLDGraph, SLDValueResolver } from 'src/types';

const EMPTY_GRAPH: SLDGraph = { nodes: [], edges: [] };

export interface SldLayoutModel {
  /** Displayed graph, laid out for a phone (positions + card sizes). */
  graph: SLDGraph;
  bounds: SLDBounds;
  /** Hub centre in frame coordinates — centred when the diagram overflows. */
  focus: SLDPoint;
  /** Effective mode (always `units` when grouping would change nothing). */
  mode: SldViewMode;
  setMode: (mode: SldViewMode) => void;
  /** False when no energy type has ≥2 units — the toggle is hidden then. */
  canGroup: boolean;
  /** The grouping's groups — the resolver aggregates them in Grouped mode. */
  groups: SldGroup[];
}

export interface SldModel extends Omit<SldLayoutModel, 'groups'> {
  resolve: SLDValueResolver;
}

export const useSldLayout = (siteId: string): SldLayoutModel => {
  // Graph from `siteConfig.siteComponents.sldV2`.
  const { data: config } = useSiteConfig(siteId);
  const storedMode = useSldViewMode(s => s.mode);
  const setMode = useSldViewMode(s => s.setMode);

  const baseGraph = useMemo(() => selectSldGraph(config) ?? EMPTY_GRAPH, [config]);
  const grouping = useMemo(() => buildSldGrouping(baseGraph), [baseGraph]);

  const canGroup = grouping.groups.length > 0;
  const mode: SldViewMode = canGroup ? storedMode : 'units';
  const shown = mode === 'grouped' ? grouping.graph : baseGraph;
  const layout = useMemo(() => buildSldPhoneLayout(shown), [shown]);

  return {
    graph: layout.graph,
    bounds: layout.bounds,
    focus: layout.focus,
    mode,
    setMode,
    canGroup,
    groups: grouping.groups,
  };
};

export const useSldModel = (siteId: string): SldModel => {
  const { groups, ...layout } = useSldLayout(siteId);
  // Values resolved live from `liveData.live.data.<param>` (same path a
  // `dataStore:"live"` card uses); group params aggregate their members.
  const { data: liveData } = useSiteData(siteId);
  const baseResolve = useMemo(() => makeLiveResolver(liveData), [liveData]);
  const groupedResolve = useMemo(
    () => makeGroupedResolver(baseResolve, groups),
    [baseResolve, groups],
  );
  const resolve = layout.mode === 'grouped' ? groupedResolve : baseResolve;
  return { ...layout, resolve };
};
