import { ISite } from 'src/types';
import { display, inspectError } from 'src/utils';
import { appAxios } from '../config';

/**
 * GET /private/user/site-list
 *
 * Returns the list of sites the authenticated user can access. The backend
 * returns a bare array (NOT the standard `{ status, data, ... }` envelope),
 * so we don't pipe this through `callAPI`.
 *
 * Auth: Bearer idToken — attached automatically by the axios request
 * interceptor via `getValidIdToken()`. If the token is within 60s of expiry
 * the interceptor refreshes silently before the request goes out, and a 401
 * triggers one auto-retry with a forced refresh.
 *
 * Spec: openapi.yaml#/paths/private/user/site-list/get
 */
export const getSiteList = async (): Promise<ISite[]> => {
  try {
    const { data } = await appAxios.get<ISite[]>('/private/user/site-list');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    display('user.getSiteList FAILED', inspectError(err));
    throw err;
  }
};

/**
 * GET /private/user/site-list/{id}
 *
 * Admin variant — returns the site list scoped to a specific user. Caller
 * must have elevated permissions; otherwise the API returns 403 and the
 * response interceptor will sign the user out.
 */
export const getSiteListByUserId = async (
  userId: string,
): Promise<ISite[]> => {
  try {
    const { data } = await appAxios.get<ISite[]>(
      `/private/user/site-list/${encodeURIComponent(userId)}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    display('user.getSiteListByUserId FAILED', inspectError(err));
    throw err;
  }
};
