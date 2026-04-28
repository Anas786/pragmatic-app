import { ISiteAllData, ISiteConfig } from 'src/types';
import { display, inspectError } from 'src/utils';
import { appAxios } from '../config';

/**
 * GET /protected/data/all/{siteId}
 *
 * Returns the full live-data envelope for a single site:
 *   { live, processed, alarms }
 *
 * Drives every tab on SiteDetail (Summary, Cards, Alarms, Trend).
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor via `getValidIdToken()`. 401s trigger a single
 * refresh-and-retry before the user is signed out.
 *
 * Spec: openapi.yaml#/paths/protected/data/all/{id}/get
 */
export const getSiteAllData = async (
  siteId: string,
): Promise<ISiteAllData> => {
  if (!siteId) throw new Error('getSiteAllData: siteId is required');
  try {
    const { data } = await appAxios.get<ISiteAllData>(
      `/protected/data/all/${encodeURIComponent(siteId)}`,
    );
    return {
      live: data?.live ?? null,
      processed: data?.processed ?? null,
      alarms: data?.alarms ?? null,
    };
  } catch (err) {
    display('site.getSiteAllData FAILED', inspectError(err));
    throw err;
  }
};

/**
 * GET /protected/config/site/{siteId}
 *
 * Site configuration — devices, inverters, parameter codes, dashboard
 * layout, etc. Used as input by every per-site API that follows.
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor. 401s trigger a single refresh-and-retry.
 *
 * Spec: openapi.yaml#/paths/protected/config/site/{id}/get
 */
export const getSiteConfig = async (
  siteId: string,
): Promise<ISiteConfig> => {
  if (!siteId) throw new Error('getSiteConfig: siteId is required');
  try {
    const { data } = await appAxios.get<ISiteConfig>(
      `/protected/config/site/${encodeURIComponent(siteId)}`,
    );
    return data ?? {};
  } catch (err) {
    display('site.getSiteConfig FAILED', inspectError(err));
    throw err;
  }
};
