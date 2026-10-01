/**
 * Shared SLD data model for the inline diagram and the full-screen route.
 *
 * Memo contract (keeps live ticks cheap and the layout stable):
 *   - `baseGraph`  ← siteConfig only;
 *   - `grouping`   ← baseGraph only (`buildSldGrouping` is structure-only), so
 *                    a live-data refresh never moves a node or changes bounds;
 *   - `baseResolve`/`groupedResolve` ← liveData (+ the stable groups);
 *   - `bounds`     ← the displayed graph only.
 */

import { useMemo } from 'react';
import {
  buildSldGrouping,
  getGraphBounds,
  makeGroupedResolver,
  makeLiveResolver,
  selectSldGraph,
  SLDBounds,
} from 'src/utils';
import { SldViewMode, useSiteConfig, useSiteData, useSldViewMode } from 'src/hooks';
import { SLDGraph, SLDValueResolver } from 'src/types';

const EMPTY_GRAPH: SLDGraph = { nodes: [], edges: [] };

export interface SldModel {
  graph: SLDGraph;
  bounds: SLDBounds;
  resolve: SLDValueResolver;
  /** Effective mode (always `units` when grouping would change nothing). */
  mode: SldViewMode;
  setMode: (mode: SldViewMode) => void;
  /** False when no energy type has ≥2 units — the toggle is hidden then. */
  canGroup: boolean;
}

export const useSldModel = (siteId: string): SldModel => {
  // Graph from `siteConfig.siteComponents.sldV2`; values resolved live from
  // `liveData.live.data.<param>` (same path a `dataStore:"live"` card uses).
  const { data: config } = useSiteConfig(siteId);
  const { data: liveData } = useSiteData(siteId);
  const storedMode = useSldViewMode(s => s.mode);
  const setMode = useSldViewMode(s => s.setMode);

  const baseGraph = useMemo(() => selectSldGraph(config) ?? EMPTY_GRAPH, [config]);
  const grouping = useMemo(() => buildSldGrouping(baseGraph), [baseGraph]);
  const baseResolve = useMemo(() => makeLiveResolver(liveData), [liveData]);
  const groupedResolve = useMemo(
    () => makeGroupedResolver(baseResolve, grouping.groups),
    [baseResolve, grouping.groups],
  );

  const canGroup = grouping.groups.length > 0;
  const mode: SldViewMode = canGroup ? storedMode : 'units';
  const grouped = mode === 'grouped';
  const graph = grouped ? grouping.graph : baseGraph;
  const resolve = grouped ? groupedResolve : baseResolve;
  const bounds = useMemo(() => getGraphBounds(graph), [graph]);

  return { graph, bounds, resolve, mode, setMode, canGroup };
};
