/**
 * What the web twin page is fed, read from the app's existing caches:
 *
 *  - `sld`      — the RAW `siteConfig.siteComponents.sldV2` object
 *                 (`useSiteConfig`, `/protected/config/site/{id}`). Passed
 *                 through untouched: the twin parses it itself
 *                 (`fromSldV2`), and the app's `selectSldGraph` output
 *                 drops fields the twin reads;
 *  - `live`     — `/protected/data/all` → `live.data` (`useSiteData`): the
 *                 `{ live: { pN: { value, update_at } }, update_at }`
 *                 envelope the web keeps as `unprocessedLiveParameters`
 *                 (the same object `makeLiveResolver` walks). Once the
 *                 query has settled WITHOUT one (`live: null` — the API
 *                 allows it —, or a failed first fetch) it is
 *                 {@link EMPTY_LIVE}: the web's store starts as `{}` too,
 *                 so the twin draws the plant with every reading "—"
 *                 instead of the page waiting forever;
 *  - `siteName` — the SiteDetail route's `siteName` param, the source the
 *                 SiteDetail header uses (the full-screen route only
 *                 carries the id, so the stack is searched by id);
 *  - `theme`    — `useScheme().isDark`;
 *  - `mode`     — Grouped | Units, shared with the Diagram
 *                 (`useSldViewMode`): `units` passes `sld` / `live` through
 *                 as above; `grouped` feeds the twin the Diagram's own
 *                 grouping (`twinGrouped.ts`: one node per group + its
 *                 synthetic readings). A site with nothing to group is
 *                 always `units`.
 *
 * Every field keeps its reference until its source changes (React Query's
 * structural sharing keeps an unchanged `sldV2` / `live.data` subtree
 * across refetches, and the grouped objects are cached per source), so the
 * host can compare references and send the page only what changed.
 */

import { useContext, useMemo } from 'react';
import { NavigationContext } from '@react-navigation/native';
import { useSiteConfig } from 'src/hooks/useSiteConfig';
import { useSiteData } from 'src/hooks/useSiteData';
import type { SldViewMode } from 'src/hooks/useSldViewMode';
import { useScheme } from 'src/theme';
import { selectSldGraph } from 'src/utils/sld';
import { buildSldGrouping } from 'src/utils/sldGroup';
import { TwinJson, TwinTheme, twinTheme } from './protocol';
import { twinDataFor } from './twinGrouped';

export interface SldTwinInputs {
  /**
   * RAW `siteComponents.sldV2` (Grouped: its grouped form); null until the
   * config loads or when the site has none.
   */
  sld: TwinJson | null;
  /**
   * `/protected/data/all` → `live.data` (Grouped: plus the groups'
   * readings); {@link EMPTY_LIVE} when the query settled without one; null
   * only while it has not answered yet.
   */
  live: TwinJson | null;
  /** The EFFECTIVE mode: `units` whenever the site has nothing to group. */
  mode: SldViewMode;
  /** The site's display name ('' when no route carries it). */
  siteName: string;
  theme: TwinTheme;
}

const asJsonObject = (v: unknown): TwinJson | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as TwinJson) : null;

/** `config.siteComponents.sldV2`, untouched — or null when it isn't an object. */
export const rawSldV2 = (config: unknown): TwinJson | null =>
  asJsonObject(asJsonObject(asJsonObject(config)?.siteComponents)?.sldV2);

/** `/protected/data/all` → `live.data`, untouched — or null when it isn't an object. */
export const liveEnvelope = (siteData: unknown): TwinJson | null =>
  asJsonObject(asJsonObject(asJsonObject(siteData)?.live)?.data);

/**
 * The live input once `/data/all` has settled without a live envelope —
 * one frozen object, so it keeps its reference (the host compares them).
 */
export const EMPTY_LIVE: TwinJson = Object.freeze({});

/**
 * The `siteName` param of the route showing `siteId` in a navigation state
 * (nested states searched too; the newest route first), or null. The
 * SiteDetail route carries it; the SLD full-screen route above it doesn't.
 */
export const siteNameFromNavigationState = (state: unknown, siteId: string): string | null => {
  const routes = asJsonObject(state)?.routes;
  if (!Array.isArray(routes)) return null;
  for (let i = routes.length - 1; i >= 0; i -= 1) {
    const route = asJsonObject(routes[i]);
    const params = asJsonObject(route?.params);
    const name = params?.siteName;
    if (params?.siteId === siteId && typeof name === 'string' && name.trim() !== '') {
      return name;
    }
    const nested = siteNameFromNavigationState(route?.state, siteId);
    if (nested !== null) return nested;
  }
  return null;
};

/**
 * @param mode the user's Grouped | Units choice (`useSldViewMode`);
 *   `grouped` on a site with nothing to group behaves as `units`.
 */
export const useSldTwinInputs = (siteId: string, mode: SldViewMode): SldTwinInputs => {
  const { data: config } = useSiteConfig(siteId);
  const { data: siteData, status: siteDataStatus } = useSiteData(siteId);
  const { isDark } = useScheme();
  // Read, not subscribed: route params are fixed once a site is open, and
  // the SiteDetail route stays in the stack under the full-screen route.
  // The context (unlike useNavigation) is simply absent outside a navigator.
  const navigation = useContext(NavigationContext);

  const rawSld = useMemo(() => rawSldV2(config), [config]);
  // The Diagram's own parse + grouping of the same config (both cached per
  // object, so these are the very objects `useSldModel` holds). The parse
  // is cached per `sldV2` object too: a config refetch that keeps the
  // diagram (only cards / trends changed) gives back the SAME graph →
  // grouping → grouped `sld` / `live`, so the page is sent nothing (a new
  // grouped `sld` would remount the twin: camera, selection, intro).
  const grouping = useMemo(() => {
    const graph = selectSldGraph(config);
    return graph ? buildSldGrouping(graph) : null;
  }, [config]);
  // 'pending' = no answer yet (nothing cached, no error): the page waits.
  const rawLive = useMemo(
    () => liveEnvelope(siteData) ?? (siteDataStatus === 'pending' ? null : EMPTY_LIVE),
    [siteData, siteDataStatus],
  );
  const data = useMemo(
    () => twinDataFor(mode, rawSld, grouping, rawLive),
    [mode, rawSld, grouping, rawLive],
  );
  const { sld, live } = data;
  const effectiveMode = data.mode;
  const siteName = useMemo(
    () => siteNameFromNavigationState(navigation?.getState(), siteId) ?? '',
    [navigation, siteId],
  );
  const theme = twinTheme(isDark);

  return useMemo(
    () => ({ sld, live, mode: effectiveMode, siteName, theme }),
    [sld, live, effectiveMode, siteName, theme],
  );
};
